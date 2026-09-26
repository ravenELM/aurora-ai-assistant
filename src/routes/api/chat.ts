import { createFileRoute } from "@tanstack/react-router";
import { streamText, tool, stepCountIs, jsonSchema, type ToolSet } from "ai";
import { z } from "zod";
import { authenticateRequest } from "@/lib/auth.server";
import {
  createLovableAiGatewayProvider,
  generateImage,
  jevDecide,
  lovableApiKey,
  type JevQuestion,
} from "@/lib/ai-gateway.server";
import { executeTool, listTools } from "@/lib/composio.server";

const CHAT_MODEL = "openai/gpt-5.6-sol";
const FAST_MODEL = "google/gemini-3-flash-preview";

const bodySchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().max(8000),
  mentions: z.array(z.string().max(80)).max(5).default([]),
  model: z.enum(["smart", "fast"]).default("smart"),
  attachments: z
    .array(
      z.object({
        name: z.string().max(255),
        mime: z.string().max(120),
        path: z.string().max(500),
        kind: z.enum(["image", "pdf", "text", "other"]),
      }),
    )
    .max(6)
    .default([]),
});

type Source = { n: number; title: string; url: string; domain: string; icon: string; snippet: string };

async function webSearch(query: string, userId: string) {
  const res = (await executeTool("COMPOSIO_SEARCH_SEARCH", userId, { query })) as {
    data?: { results?: { organic_results?: Record<string, unknown>[] } };
  };
  return (res.data?.results?.organic_results ?? []).slice(0, 6).map((r) => {
    const url = String(r["link"] ?? "");
    let domain = "";
    try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
    return {
      title: String(r["title"] ?? domain),
      url,
      domain,
      icon: String(r["favicon"] ?? ""),
      snippet: String(r["snippet"] ?? "").slice(0, 400),
    };
  }).filter((r) => r.url);
}

// On the hosted runtime, ask it to keep this request alive until the reply is saved.
function keepAlive(p: Promise<unknown>) {
  const mod = "cloudflare:workers";
  import(/* @vite-ignore */ mod)
    .then((m: { waitUntil?: (p: Promise<unknown>) => void }) => m.waitUntil?.(p))
    .catch(() => { /* not on the hosted runtime */ });
}

type Event =
  | { type: "text"; delta: string }
  | { type: "tool-start"; id: string; name: string; toolkit: string; input: unknown }
  | { type: "credits"; spent: number; balance: number | null }
  | { type: "tool-end"; id: string; output: unknown; error?: string }
  | { type: "image"; url: string }
  | { type: "reasoning"; text: string }
  | { type: "sources"; sources: Source[] }
  | { type: "error"; message: string }
  | { type: "done"; messageId: string | null };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });
        const { supabase, userId } = auth;

        const parsed = bodySchema.safeParse(await request.json());
        if (!parsed.success) {
          return new Response("Invalid request", { status: 400 });
        }
        const { conversationId, message, mentions, model } = parsed.data;

        // Attachments must live in the caller's own folder in the bucket.
        const claimed = parsed.data.attachments.filter(
          (a) => a.path.startsWith(`${userId}/`) && !a.path.includes(".."),
        ).slice(0, 6);

        type AttPart =
          | { type: "text"; text: string }
          | { type: "image"; image: string }
          | { type: "file"; data: string; mediaType: string; filename?: string };

        const imageParts: Extract<AttPart, { type: "image" }>[] = [];
        const fileParts: Extract<AttPart, { type: "file" }>[] = [];
        const fileTexts: string[] = [];
        const unreadable: string[] = [];

        if (claimed.length > 0) {
          for (const a of claimed) {
            const { data: signed } = await supabase.storage
              .from("attachments")
              .createSignedUrl(a.path, 120);
            if (!signed) {
              unreadable.push(a.name);
              continue;
            }
            try {
              const res = await fetch(signed.signedUrl);
              if (!res.ok) {
                unreadable.push(a.name);
                continue;
              }
              const buf = Buffer.from(await res.arrayBuffer());
              if (a.kind === "image" && imageParts.length < 4) {
                imageParts.push({
                  type: "image",
                  image: `data:${a.mime};base64,${buf.toString("base64")}`,
                });
              } else if (a.kind === "pdf" && fileParts.length < 3) {
                fileParts.push({
                  type: "file",
                  data: buf.toString("base64"),
                  mediaType: "application/pdf",
                  filename: a.name,
                });
              } else if (a.kind === "text") {
                fileTexts.push(`--- Attached file: ${a.name} ---\n${buf.toString("utf8").slice(0, 20000)}`);
              } else {
                unreadable.push(a.name);
              }
            } catch {
              unreadable.push(a.name);
            }
          }
        }

        const fallbackText = message || (claimed.length ? "Please look at what I attached." : "");
        const userText = [
          fallbackText,
          unreadable.length > 0 ? `(Also attached, contents not readable here: ${unreadable.join(", ")})` : "",
          ...fileTexts,
        ].filter(Boolean).join("\n\n");
        const userContent: string | AttPart[] =
          imageParts.length > 0 || fileParts.length > 0
            ? [{ type: "text", text: userText }, ...imageParts, ...fileParts]
            : userText;

        const { data: creditRows } = await supabase.rpc("get_credits");
        const credit = Array.isArray(creditRows) ? creditRows[0] : null;
        const baseCost = 0.03;
        if (credit && Number(credit.balance) < baseCost) {
          const lines = [
            { type: "error", code: "out_of_credits", message: "You're out of credits. Upgrade your plan or wait for your daily refill." },
            { type: "done", messageId: null },
          ].map((e) => JSON.stringify(e)).join("\n") + "\n";
          return new Response(lines, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8" } });
        }

        const [settingsRes, memoriesRes, historyRes, pluginsRes] =
          await Promise.all([
            supabase
              .from("user_settings")
              .select("*")
              .eq("user_id", userId)
              .maybeSingle(),
            supabase
              .from("memories")
              .select("content")
              .order("created_at", { ascending: false })
              .limit(30),
            supabase
              .from("messages")
              .select("role, content")
              .eq("conversation_id", conversationId)
              .order("created_at", { ascending: true })
              .limit(24),
            supabase
              .from("plugin_connections")
              .select("toolkit_slug, toolkit_name, status, enabled")
              .eq("user_id", userId),
          ]);

        const settings = settingsRes.data;
        const memories = (memoriesRes.data ?? []).map((m) => m.content);
        const history = historyRes.data ?? [];
        const connected = (pluginsRes.data ?? []).filter(
          (p) => p.enabled && p.status === "ACTIVE",
        );

        await supabase.from("messages").insert({
          conversation_id: conversationId,
          user_id: userId,
          role: "user",
          content: userText,
          attachments: claimed as never,
        });

        // Cheap typed routing so the main model only gets the tools it needs.
        let selectedToolkits = connected
          .filter((p) => mentions.includes(p.toolkit_slug))
          .map((p) => p.toolkit_slug);
        if (connected.length > 0) {
          const questions: Record<string, JevQuestion> = {};
          // One independent yes/no per connected app, so several can apply at once.
          for (const p of connected) {
            if (selectedToolkits.includes(p.toolkit_slug)) continue;
            questions[`app:${p.toolkit_slug}`] = {
              type: "noul",
              instructions: `Would answering \`message\` (read in the context of \`recent_conversation\`) require reading from or acting in the user's ${p.toolkit_name} account? For example asking about their schedule, inbox, files, tasks or messages that live in ${p.toolkit_name}.`,
            };
          }
          const recent = history.slice(-4).map((h) => `${h.role}: ${String(h.content).slice(0, 300)}`);
          const answers = await jevDecide({ message: userText, recent_conversation: recent }, questions);
          for (const p of connected) {
            if ((answers?.[`app:${p.toolkit_slug}`]?.noul ?? 0) > 0.35) {
              selectedToolkits.push(p.toolkit_slug);
            }
          }
          selectedToolkits = [...new Set(selectedToolkits)].slice(0, 3);
        }

        const composioTools = await listTools(selectedToolkits, 12);

        const systemParts = [
          "You are Aurora, a warm, concise all-in-one assistant that helps with calendar, email, research, writing and connected apps.",
          "Prefer short, well-structured answers in markdown. Never invent tool results.",
          settings?.tone ? `Preferred tone: ${settings.tone}.` : "",
          (() => {
            const t = ((settings as { traits?: Record<string, unknown> } | null)?.traits ?? {}) as Record<string, unknown>;
            const label: Record<string, string> = { warmth: "warmth", enthusiasm: "enthusiasm", formatting: "use of headers and lists", emoji: "use of emoji" };
            const out = Object.entries(label)
              .filter(([k]) => t[k] === "less" || t[k] === "more")
              .map(([k, l]) => `${t[k] === "more" ? "More" : "Less"} ${l} than usual.`);
            if (t["fast_answers"] === true) out.push("Prefer quick answers from general knowledge; keep replies brief.");
            return out.join(" ");
          })(),
          settings?.memory_enabled !== false && settings?.about_you ? `About the user: ${settings.about_you}` : "",
          settings?.custom_instructions
            ? `Custom instructions: ${settings.custom_instructions}`
            : "",
          memories.length > 0
            ? `Remembered facts:\n- ${memories.join("\n- ")}`
            : "",
          connected.length > 0
            ? `The user has connected these apps, and you can use them directly without the user naming them: ${connected.map((c) => c.toolkit_name).join(", ")}. When a request relates to one (e.g. "what's on today" -> calendar, "any new mail" -> email), just use the matching tools. If a needed tool isn't available this turn, say so briefly.`
            : "No apps are connected yet. If the user needs one, tell them to open Settings and connect it.",
          mentions.includes("deep-research")
            ? "DEEP RESEARCH MODE: run several web_search calls (3-6) from different angles before answering, then write a thorough, well-organised answer with headings."
            : mentions.includes("search")
              ? "SEARCH MODE: always call web_search before answering."
              : "Use web_search whenever the user asks for current, factual or specific information you are not certain about, or asks you to search.",
          "When you use web_search results, cite them inline right after the sentence with bracketed source numbers like [1] or [1][3]. Never add a separate sources list.",
          "Never reveal API keys, tokens, account IDs, internal tool names or raw tool output. Summarise results in plain language.",
          `Today is ${new Date().toISOString().slice(0, 10)}.`,
        ].filter(Boolean);

        const provider = createLovableAiGatewayProvider(lovableApiKey());

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const work = (async () => {
            // If the user leaves, keep generating and saving; just stop sending.
            let open = true;
            const send = (event: Event) => {
              if (!open) return;
              try {
                controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
              } catch {
                open = false;
              }
            };

            let assistantText = "";
            const toolParts: unknown[] = [];
            const sources: Source[] = [];
            let imageUrl: string | null = null;

            try {
              const tools: ToolSet = {
                web_search: tool({
                  description: "Search the web for up-to-date information. Returns numbered sources to cite as [n].",
                  inputSchema: z.object({ query: z.string().describe("Search query") }),
                  execute: async ({ query }: { query: string }) => {
                    const id = `search-${Date.now()}`;
                    send({ type: "tool-start", id, name: "Searching the web", toolkit: "search", input: { query } });
                    try {
                      const found = await webSearch(query, userId);
                      const numbered = found.map((r) => {
                        const existing = sources.find((x) => x.url === r.url);
                        if (existing) return existing;
                        const src = { n: sources.length + 1, ...r };
                        sources.push(src);
                        return src;
                      });
                      send({ type: "sources", sources: [...sources] });
                      send({ type: "tool-end", id, output: { count: numbered.length } });
                      return numbered.map(({ n, title, url, snippet }) => ({ n, title, url, snippet }));
                    } catch (error) {
                      const msg = error instanceof Error ? error.message : "Search failed";
                      send({ type: "tool-end", id, output: null, error: msg });
                      return { error: "Search is unavailable right now." };
                    }
                  },
                }),
                generate_image: tool({
                  description:
                    "Generate an image from a text prompt. Use when the user asks for a picture, illustration or visual.",
                  inputSchema: z.object({
                    prompt: z.string().describe("Detailed image description"),
                  }),
                  execute: async ({ prompt }: { prompt: string }) => {
                    const url = await generateImage(prompt);
                    if (url) {
                      imageUrl = url;
                      send({ type: "image", url });
                    }
                    return url
                      ? { ok: true, note: "Image generated and shown to the user." }
                      : { ok: false };
                  },
                }),
              };

              for (const t of composioTools) {
                tools[t.slug] = tool({
                  description: `${t.name} (${t.toolkitSlug}): ${t.description}`,
                  inputSchema: jsonSchema(
                    t.inputParameters as Record<string, unknown>,
                  ),
                  execute: async (args: unknown) => {
                    const id = `${t.slug}-${Date.now()}`;
                    send({
                      type: "tool-start",
                      id,
                      name: t.name,
                      toolkit: t.toolkitSlug,
                      input: args,
                    });
                    try {
                      const raw = await executeTool(
                        t.slug,
                        userId,
                        args as Record<string, unknown>,
                      );
                      const result = shrinkToolOutput(raw);
                      send({ type: "tool-end", id, output: result });
                      toolParts.push({ name: t.name, toolkit: t.toolkitSlug, input: args, output: result });
                      return result;
                    } catch (error) {
                      const msg =
                        error instanceof Error ? error.message : "Tool failed";
                      send({ type: "tool-end", id, output: null, error: msg });
                      toolParts.push({ name: t.name, toolkit: t.toolkitSlug, input: args, error: msg });
                      return { error: msg };
                    }
                  },
                });
              }

              const result = streamText({
                model: provider.chatModel(model === "fast" ? FAST_MODEL : CHAT_MODEL),
                system: systemParts.join("\n"),
                messages: [
                  ...history.map((m) => ({
                    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
                    content: m.content,
                  })),
                  { role: "user" as const, content: userContent },
                ],
                tools,
                stopWhen: stepCountIs(mentions.includes("deep-research") ? 10 : 6),
              });

              for await (const part of result.fullStream) {
                if (part.type === "text-delta") {
                  const delta = (part as { text?: string }).text ?? "";
                  assistantText += delta;
                  send({ type: "text", delta });
                } else if (part.type === "error") {
                  console.error("Stream error", part.error);
                  send({
                    type: "error",
                    message: "Aurora hit a problem generating that reply.",
                  });
                }
              }

              const { data: saved } = await supabase
                .from("messages")
                .insert({
                  conversation_id: conversationId,
                  user_id: userId,
                  role: "assistant",
                  content: assistantText,
                  parts: (sources.length ? [...toolParts, { type: "sources", sources }] : toolParts) as never,
                  image_url: imageUrl,
                })
                .select("id")
                .single();

              await supabase
                .from("conversations")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", conversationId);

              if (history.length === 0) {
                let title = (message || claimed[0]?.name || "New chat").slice(0, 60);
                try {
                  const t = streamText({
                    model: provider.chatModel(FAST_MODEL),
                    maxOutputTokens: 40,
                    messages: [
                      { role: "user", content: `Write a very short chat title (2-5 words, no quotes, no trailing punctuation) for a conversation that starts with this message. Reply with the title only.\n\nMessage: ${(message || claimed.map((a) => a.name).join(", ")).slice(0, 500)}` },
                    ],
                  });
                  const text = (await t.text).trim().replace(/^["']|["'.]$/g, "");
                  if (text) title = text.slice(0, 60);
                } catch { /* keep the fallback title */ }
                await supabase
                  .from("conversations")
                  .update({ title })
                  .eq("id", conversationId);
              }

              let inTok = 0, outTok = 0;
              try {
                const u = await result.totalUsage;
                inTok = u?.inputTokens ?? 0;
                outTok = u?.outputTokens ?? 0;
              } catch { /* usage unavailable */ }
              if (!inTok && !outTok) outTok = Math.ceil(assistantText.length / 4);
              const cost = creditCost(model === "fast" ? "fast" : "smart", toolParts.length, Boolean(imageUrl), inTok, outTok);
              const { data: left } = await supabase.rpc("spend_credits", { _amount: cost });
              send({ type: "credits", spent: cost, balance: left ?? null });
              send({ type: "done", messageId: saved?.id ?? null });
            } catch (error) {
              console.error("Chat failed", error);
              send({
                type: "error",
                message:
                  error instanceof Error ? error.message : "Something went wrong",
              });
              send({ type: "done", messageId: null });
            } finally {
              if (open) {
                try { controller.close(); } catch { /* client gone */ }
              }
            }
            })();
            keepAlive(work);
            return work;
          },
          cancel() {
            // Client disconnected: generation continues in start().
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
          },
        });
      },
    },
  },
});

// Tool results (e.g. Gmail with raw HTML bodies) can be huge and blow the model context.
// Strip HTML, cap each string, and cap the whole payload.
function shrinkToolOutput(value: unknown): unknown {
  const MAX_STR = 1500;
  const MAX_ARR = 25;
  const MAX_TOTAL = 60000;
  const DROP_KEYS = new Set(["payload", "raw", "attachmentList", "headers", "parts"]);
  const clean = (v: unknown, depth: number): unknown => {
    if (typeof v === "string") {
      let s = v;
      if (/<[a-z!/][^>]*>/i.test(s)) {
        s = s
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&");
      }
      s = s.replace(/https?:\/\/\S{80,}/g, "[link]").replace(/\s+/g, " ").trim();
      return s.length > MAX_STR ? s.slice(0, MAX_STR) + "…" : s;
    }
    if (depth > 8) return undefined;
    if (Array.isArray(v)) return v.slice(0, MAX_ARR).map((x) => clean(x, depth + 1));
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) {
        if (DROP_KEYS.has(k)) continue;
        out[k] = clean(x, depth + 1);
      }
      return out;
    }
    return v;
  };
  const cleaned = clean(value, 0);
  const text = JSON.stringify(cleaned) ?? "";
  if (text.length <= MAX_TOTAL) return cleaned;
  return { truncated: true, data: text.slice(0, MAX_TOTAL) };
}

// Token-based pricing (credits per 1k tokens), increased 3x. Smart costs 2x quick.
// Each app/tool call +0.3, image +6. Minimum 0.03, max 20 per message.
function creditCost(
  kind: "fast" | "smart",
  toolCalls: number,
  image: boolean,
  inputTokens = 0,
  outputTokens = 0,
): number {
  const mult = kind === "fast" ? 1 : 2;
  const tokens = (inputTokens / 1000) * 0.06 + (outputTokens / 1000) * 0.3;
  const c = tokens * mult + Math.min(toolCalls, 10) * 0.3 + (image ? 6 : 0);
  return Math.min(Math.max(Math.round(c * 100) / 100, 0.03), 20);
}
