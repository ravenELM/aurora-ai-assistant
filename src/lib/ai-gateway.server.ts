import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

export function lovableApiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return key;
}

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: GATEWAY_URL,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    // gpt-5.6-sol rejects function tools unless reasoning effort is off.
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.body && typeof init.body === "string") {
        try {
          const body = JSON.parse(init.body) as Record<string, unknown>;
          body["reasoning_effort"] = "none";
          init = { ...init, body: JSON.stringify(body) };
        } catch {
          // leave the body untouched when it is not JSON
        }
      }
      return fetch(input, init);
    },
  });
}

/**
 * Jev — cheap typed decisions (routing, classification) so the expensive chat
 * model runs less often.
 */
export type JevQuestion =
  | { type: "noul"; instructions: string }
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string };

export type JevAnswers = Record<
  string,
  { type: string; noul?: number; choice?: string; score?: number }
>;

export async function jevDecide(
  state: Record<string, unknown>,
  questions: Record<string, JevQuestion>,
): Promise<JevAnswers | null> {
  try {
    const res = await fetch(`${GATEWAY_URL}/systemone`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": lovableApiKey(),
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "typesafe/jev-latest",
        state,
        questions,
      }),
    });
    if (!res.ok) {
      console.error(`Jev failed [${res.status}]: ${await res.text()}`);
      return null;
    }
    const data = (await res.json()) as { answers?: JevAnswers };
    return data.answers ?? null;
  } catch (error) {
    console.error("Jev request failed", error);
    return null;
  }
}

export async function generateImage(prompt: string): Promise<string | null> {
  const res = await fetch(`${GATEWAY_URL}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": lovableApiKey(),
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "lovable/image-fast",
      prompt,
      n: 1,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Image generation failed [${res.status}]: ${body}`);
    throw new Error(`Image generation failed [${res.status}]: ${body}`);
  }
  const data = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const first = data.data?.[0];
  if (!first) return null;
  if (first.url) return first.url;
  if (first.b64_json) return `data:image/png;base64,${first.b64_json}`;
  return null;
}
