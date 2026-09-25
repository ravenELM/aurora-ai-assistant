import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Globe,
  ImageIcon,
  Loader2,
  PenLine,
  Plug,
  Plus,
  SquarePen,
  X,
  Zap,
  Atom,
  BookOpen,
  FileText,
  SlidersHorizontal,
  Telescope,
} from "lucide-react";
import { toast } from "sonner";
import { ShiningText, toolLabel } from "@/components/ui/shining-text";
import AnimatedGradientBackground from "@/components/ui/animated-gradient-background";
import { AppShell } from "@/components/aurora/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { MessageRow, type ChatMessage, type ToolEvent, type Source } from "@/components/aurora/chat-message";
import {
  createConversation,
  listMessages,
  listPlugins,
} from "@/lib/aurora.functions";
import { cn } from "@/lib/utils";

type PendingAtt = {
  id: string;
  file: File;
  kind: "image" | "pdf" | "text" | "other";
  preview?: string | undefined;
};

const MAX_ATTS = 6;
const MAX_ATT_BYTES = 20 * 1024 * 1024;
const TEXT_EXTS = [
  "txt", "md", "csv", "json", "ts", "tsx", "js", "jsx", "py", "rb", "go",
  "rs", "java", "c", "cpp", "cs", "sh", "html", "css", "scss", "xml",
  "yml", "yaml", "sql", "toml", "ini", "log",
];

function kindOf(file: File): PendingAtt["kind"] {
  const mime = file.type || "";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("text/") || TEXT_EXTS.includes(ext)) return "text";
  return "other";
}

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Chat with Aurora" },
      {
        name: "description",
        content:
          "Talk to Aurora, generate images and let it act inside your connected apps like Google Calendar and Gmail.",
      },
      { property: "og:title", content: "Chat with Aurora" },
      {
        property: "og:description",
        content: "Your AI assistant for calendar, email and connected apps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { c?: string | undefined } => ({
    c: typeof s["c"] === "string" ? (s["c"] as string) : undefined,
  }),
  component: ChatPage,
});

function ChatPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchMessages = useServerFn(listMessages);
  const newConversation = useServerFn(createConversation);
  const fetchPlugins = useServerFn(listPlugins);

  const search = Route.useSearch();
  const [activeId, setActiveId] = useState<string | null>(search.c ?? null);
  const [model, setModel] = useState<"smart" | "fast">("smart");
  const [modelOpen, setModelOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const next = search.c ?? null;
    if (next !== activeId) setActiveId(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.c]);
  // In-progress conversations, keyed by id, so several can run at once.
  const [live, setLive] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState("");
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);
  const [atts, setAtts] = useState<PendingAtt[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    const list = Array.from(files);
    setAtts((prev) => {
      const room = MAX_ATTS - prev.length;
      if (room <= 0 || list.length === 0) {
        toast.error("You can attach up to 6 files per message.");
        return prev;
      }
      const ok = list.slice(0, room).filter((f) => f.size <= MAX_ATT_BYTES);
      if (ok.length < list.length) {
        toast.error("Some files were skipped (max 6 files, 20 MB each).");
      }
      return [
        ...prev,
        ...ok.map((f, i) => ({
          id: `${Date.now()}-${i}`,
          file: f,
          kind: kindOf(f),
          preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
        })),
      ];
    });
  }

  function removeAtt(id: string) {
    setAtts((prev) => {
      const found = prev.find((a) => a.id === id);
      if (found?.preview) URL.revokeObjectURL(found.preview);
      return prev.filter((a) => a.id !== id);
    });
  }
  const scrollRef = useRef<HTMLDivElement>(null);

  const plugins = useQuery({
    queryKey: ["plugins"],
    queryFn: () => fetchPlugins({}),
  });

  const connected = useMemo(
    () =>
      (plugins.data?.connections ?? []).filter(
        (c) => c.status === "ACTIVE" && c.enabled,
      ),
    [plugins.data],
  );

  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionMatch = /(^|\s)@([\w-]*)$/.exec(input);
  const mentionQuery = mentionMatch ? (mentionMatch[2] ?? "").toLowerCase() : null;

  const mentionItems = useMemo(() => {
    if (mentionQuery === null) return [];
    const logos = new Map(
      ((plugins.data?.catalog ?? []) as { slug: string; logo?: string }[]).map((t) => [
        t.slug,
        t.logo ?? "",
      ]),
    );
    const defaults = [
      { slug: "create-image", label: "Create image", icon: ImageIcon, tone: "text-primary", logo: "" },
      { slug: "deep-research", label: "Deep research", icon: Telescope, tone: "text-primary", logo: "" },
      { slug: "search", label: "Search", icon: Globe, tone: "text-primary", logo: "" },
      { slug: "study", label: "Study", icon: BookOpen, tone: "text-accent-foreground", logo: "" },
      { slug: "create-file", label: "Create a file", icon: FileText, tone: "text-primary", logo: "" },
    ];
    const extra = connected.map((c) => ({
      slug: c.toolkit_slug,
      label: c.toolkit_name || c.toolkit_slug,
      icon: null,
      tone: "",
      logo: logos.get(c.toolkit_slug) ?? "",
    }));
    return [...defaults, ...extra].filter(
      (i) =>
        !mentionQuery ||
        i.slug.includes(mentionQuery) ||
        i.label.toLowerCase().includes(mentionQuery),
    );
  }, [mentionQuery, connected, plugins.data]);

  function pickMention(slug: string) {
    setInput((prev) => prev.replace(/@([\w-]*)$/, `@${slug} `));
    setMentionIndex(0);
    inputRef.current?.focus();
  }

  const history = useQuery({
    queryKey: ["messages", activeId],
    queryFn: () => fetchMessages({ data: { conversationId: activeId! } }),
    enabled: Boolean(activeId),
  });

  const historyMessages = useMemo<ChatMessage[]>(() => {
    if (!activeId || !history.data) return [];
    return (
      history.data.map((m) => ({
        id: m.id,
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
        imageUrl: m.image_url,
        attachments: Array.isArray(m.attachments)
          ? (m.attachments as { name: string; mime: string; kind?: string; url?: string }[])
          : undefined,
        sources: Array.isArray(m.parts)
          ? ((m.parts as Record<string, unknown>[]).find((p) => p["type"] === "sources")?.["sources"] as Source[] | undefined)
          : undefined,
        tools: Array.isArray(m.parts)
          ? (m.parts as Record<string, unknown>[]).filter((p) => p["type"] !== "sources").map((p, i) => {
              const part = p as Record<string, unknown>;
              return {
                id: `${m.id}-${i}`,
                name: String(part["name"] ?? "Tool"),
                toolkit: String(part["toolkit"] ?? ""),
                input: part["input"],
                output: part["output"],
                error: part["error"] as string | undefined,
                running: false,
              } satisfies ToolEvent;
            })
          : [],
      }))
    );
  }, [history.data, activeId]);
  const messages = (activeId && live[activeId]) || historyMessages;
  const streaming = Boolean(activeId && live[activeId]?.some((m) => m.streaming));

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);


  async function send() {
    const text = input.trim();
    const pending = atts;
    if ((!text && pending.length === 0) || streaming) return;

    let conversationId = activeId;
    if (!conversationId) {
      const created = await newConversation({ data: { title: text.slice(0, 60) || "New chat" } });
      conversationId = created.id;
      setActiveId(created.id);
      void navigate({ to: "/chat", search: { c: created.id }, replace: true });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    }

    const mentions = [
      ...connected.filter((c) => text.includes(`@${c.toolkit_slug}`)).map((c) => c.toolkit_slug),
      ...["search", "deep-research"].filter((m) => new RegExp(`@${m}(\\s|$)`).test(text)),
    ];

    setInput("");
    const cid = conversationId;
    const base = activeId === cid ? messages : [];
    const assistantId = `tmp-${Date.now()}`;
    setLive((all) => ({
      ...all,
      [cid]: [
        ...base,
        { id: `u-${Date.now()}`, role: "user", content: text, attachments: pending.map((a) => ({ name: a.file.name, mime: a.file.type, kind: a.kind, url: a.preview })) },
        { id: assistantId, role: "assistant", content: "", tools: [], streaming: true },
      ],
    }));

    const patch = (fn: (m: ChatMessage) => ChatMessage) =>
      setLive((all) =>
        all[cid]
          ? { ...all, [cid]: all[cid].map((m) => (m.id === assistantId ? fn(m) : m)) }
          : all,
      );

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      // Upload attachments to the user's own folder in the private bucket.
      const savedAtts: { name: string; mime: string; path: string; kind: string }[] = [];
      if (pending.length > 0 && userId) {
        for (const a of pending) {
          const safeName = a.file.name.replace(/[^\w.\- ]+/g, "_");
          const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
          const { error } = await supabase.storage
            .from("attachments")
            .upload(path, a.file, { contentType: a.file.type || "application/octet-stream" });
          if (error) {
            toast.error(`Could not upload ${a.file.name}`);
            continue;
          }
          savedAtts.push({ name: a.file.name, mime: a.file.type || "application/octet-stream", path, kind: a.kind });
        }
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          conversationId,
          message: text,
          mentions,
          model,
          attachments: savedAtts,
        }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as Record<string, unknown>;
          const type = event["type"];
          if (type === "text") {
            patch((m) => ({ ...m, content: m.content + String(event["delta"]) }));
          } else if (type === "tool-start") {
            patch((m) => ({
              ...m,
              tools: [
                ...(m.tools ?? []),
                {
                  id: String(event["id"]),
                  name: String(event["name"]),
                  toolkit: String(event["toolkit"]),
                  input: event["input"],
                  running: true,
                },
              ],
            }));
          } else if (type === "tool-end") {
            patch((m) => ({
              ...m,
              tools: (m.tools ?? []).map((t) =>
                t.id === event["id"]
                  ? {
                      ...t,
                      running: false,
                      output: event["output"],
                      error: event["error"] as string | undefined,
                    }
                  : t,
              ),
            }));
          } else if (type === "image") {
            patch((m) => ({ ...m, imageUrl: String(event["url"]) }));
          } else if (type === "sources") {
            patch((m) => ({ ...m, sources: event["sources"] as Source[] }));
          } else if (type === "credits") {
            void qc.invalidateQueries({ queryKey: ["credits"] });
          } else if (type === "error") {
            if (event["code"] === "out_of_credits") {
              toast.error(String(event["message"]), { action: { label: "Upgrade", onClick: () => { window.location.href = "/upgrade"; } } });
            } else toast.error(String(event["message"]));
          }
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Aurora could not reply",
      );
    } finally {
      patch((m) => ({ ...m, streaming: false }));
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      await qc.refetchQueries({ queryKey: ["messages", cid] }).catch(() => undefined);
      setLive((all) => {
        const { [cid]: _done, ...rest } = all;
        return rest;
      });
      for (const a of atts) if (a.preview) URL.revokeObjectURL(a.preview);
      setAtts([]);
    }
  }

  const empty = messages.length === 0;
  const suggestions = [
    { icon: ImageIcon, label: "Create an image", text: "Create an image of " },
    { icon: PenLine, label: "Write or edit", text: "Help me write " },
    { icon: Globe, label: "Search the web", text: "Search the web for " },
  ];

  const switcher = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setModelOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full px-2 py-1 text-xl font-semibold tracking-tight"
      >
        Aurora
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>
      {modelOpen && (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setModelOpen(false)}
          />
          <div className="absolute left-0 top-12 z-40 w-72 rounded-3xl bg-secondary p-2 shadow-2xl">
            {([
              { id: "smart", name: "Aurora Pro", desc: "Our smartest model", icon: Atom },
              { id: "fast", name: "Aurora Flash", desc: "Quick everyday answers", icon: Zap },
            ] as const).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setModel(m.id);
                  setModelOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-accent"
              >
                <m.icon className="size-5 shrink-0" />
                <span className="flex-1">
                  <span className="block text-[15px]">{m.name}</span>
                  <span className="block text-sm text-muted-foreground">{m.desc}</span>
                </span>
                {model === m.id && <Check className="size-4" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <AppShell
      activeId={activeId}
      title={switcher}
      actions={
        <button
          type="button"
          aria-label="New chat"
          onClick={() => {
            setActiveId(null);
            void navigate({ to: "/chat", search: {} });
          }}
          className="grid size-11 place-items-center rounded-full hover:bg-secondary"
        >
          <SquarePen className="size-5" />
        </button>
      }
    >
      <div className="relative flex-1 overflow-hidden">
        <div
          className={cn(
            "pointer-events-none absolute inset-0 transition-opacity duration-700",
            empty ? "opacity-100" : "opacity-0",
          )}
        >
          <AnimatedGradientBackground Breathing startingGap={135} topOffset={10} />
          <div className="absolute inset-0 aurora-veil" />
        </div>
        <div ref={scrollRef} className="relative h-full overflow-y-auto overflow-x-hidden pt-16">
        <div className="relative mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-5 pb-32 pt-6">
          {empty ? (
            <div className="mt-auto space-y-1 pb-6">
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    setInput(s.text);
                    inputRef.current?.focus();
                  }}
                  className="flex w-full items-center gap-4 rounded-2xl px-3 py-3.5 text-left text-[17px] text-muted-foreground hover:bg-secondary"
                >
                  <s.icon className="size-5" />
                  {s.label}
                </button>
              ))}
            </div>
          ) : (
            messages.map((m) => <MessageRow key={m.id} message={m} />)
          )}
          {streaming && (() => {
            const last = messages[messages.length - 1];
            const running = last?.tools?.find((t) => t.running);
            if (running) return <ShiningText text={toolLabel(running.name, running.toolkit)} />;
            if (last?.content === "") return <ShiningText text="Aurora is thinking…" />;
            return null;
          })()}
        </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div
          className="pointer-events-auto relative mx-auto max-w-3xl"
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
          }}
        >
          {mentionQuery !== null && mentionItems.length > 0 && (
            <div className="mb-2 rounded-[28px] bg-secondary p-2 shadow-lg">
              <div className="flex items-center justify-between px-3 pb-1 pt-2 text-sm text-muted-foreground">
                <span>Plugins</span>
                <button
                  type="button"
                  aria-label="Manage plugins"
                  onClick={() => void navigate({ to: "/settings" })}
                  className="grid size-8 place-items-center rounded-full hover:bg-background/40"
                >
                  <SlidersHorizontal className="size-4" />
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {mentionItems.map((item, i) => (
                  <button
                    key={item.slug}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickMention(item.slug)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[15px]",
                      i === mentionIndex ? "bg-background/40" : "hover:bg-background/30",
                    )}
                  >
                    {item.logo ? (
                      <img src={item.logo} alt="" className="size-5 rounded object-contain" />
                    ) : item.icon ? (
                      <item.icon className={cn("size-5", item.tone)} />
                    ) : (
                      <Plug className="size-5 text-muted-foreground" />
                    )}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div
            className={cn(
              "rounded-[28px] bg-secondary px-2 pb-2 pt-3 transition-shadow",
              dragActive && "ring-2 ring-ring",
            )}
          >
            {atts.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2 px-1 pt-1">
                {atts.map((a) => (
                  <div key={a.id} className="group relative">
                    {a.preview ? (
                      <img
                        src={a.preview}
                        alt={a.file.name}
                        className="size-16 rounded-xl border border-border object-cover"
                      />
                    ) : (
                      <div className="flex size-16 max-w-28 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-background/60 px-1 text-center">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="w-full truncate text-[9px] text-muted-foreground">{a.file.name}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove ${a.file.name}`}
                      onClick={() => removeAtt(a.id)}
                      className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              placeholder="Ask anything"
              onChange={(e) => {
                setInput(e.target.value);
                setMentionIndex(0);
              }}
              onKeyDown={(e) => {
                if (mentionQuery !== null && mentionItems.length > 0) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setMentionIndex((i) => (i + 1) % mentionItems.length);
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setMentionIndex((i) => (i - 1 + mentionItems.length) % mentionItems.length);
                    return;
                  }
                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    const item = mentionItems[mentionIndex];
                    if (item) pickMention(item.slug);
                    return;
                  }
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
              }}
              className="max-h-40 w-full resize-none overflow-y-auto bg-transparent px-3 text-[17px] leading-6 outline-none placeholder:text-muted-foreground"
            />
            <div className="mt-2 flex items-center justify-between">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                aria-label="Attach files"
                onClick={() => fileInputRef.current?.click()}
                className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                <Plus className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Send"
                disabled={streaming || (!input.trim() && atts.length === 0)}
                onClick={() => void send()}
                className="grid size-10 place-items-center rounded-full bg-foreground text-background disabled:opacity-40"
              >
                {streaming ? <Loader2 className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {history.isLoading && (
        <div className="pointer-events-none absolute right-16 top-6">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </AppShell>
  );
}
