const BASE = "https://backend.composio.dev/api/v3";

function key(): string {
  const k = process.env["COMPOSIO_API_KEY"];
  if (!k) throw new Error("Composio is not configured");
  return k;
}

export async function composio<T = unknown>(
  path: string,
  init?: { method?: string; body?: unknown; query?: Record<string, string> },
): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(init?.query ?? {})) {
    if (v) url.searchParams.set(k, v);
  }
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: {
      "x-api-key": key(),
      "Content-Type": "application/json",
    },
    ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Composio ${path} failed [${res.status}]: ${text}`);
    throw new Error(`Composio request failed [${res.status}]: ${text}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export type ComposioToolkit = {
  slug: string;
  name: string;
  logo: string;
  description: string;
  categories: string[];
  noAuth: boolean;
  toolsCount: number;
};

type RawToolkit = {
  slug: string;
  name: string;
  no_auth?: boolean;
  meta?: {
    logo?: string;
    description?: string;
    tools_count?: number;
    categories?: { name: string }[];
  };
};

export async function listToolkits(
  search?: string,
  category?: string,
): Promise<ComposioToolkit[]> {
  const data = await composio<{ items: RawToolkit[] }>("/toolkits", {
    query: {
      limit: "300",
      ...(search ? { search } : {}),
      ...(category ? { category } : {}),
    },
  });
  return (data.items ?? []).map((t) => ({
    slug: t.slug,
    name: t.name,
    logo: t.meta?.logo ?? "",
    description: t.meta?.description ?? "",
    categories: (t.meta?.categories ?? []).map((c) => c.name),
    noAuth: Boolean(t.no_auth),
    toolsCount: t.meta?.tools_count ?? 0,
  }));
}

type AuthConfig = { id: string; toolkit?: { slug?: string }; status?: string };

/** Reuses a Composio-managed auth config for a toolkit, creating one if needed. */
export async function ensureAuthConfig(toolkitSlug: string): Promise<string> {
  const existing = await composio<{ items: AuthConfig[] }>("/auth_configs", {
    query: { toolkit_slug: toolkitSlug, limit: "10" },
  });
  const usable = (existing.items ?? []).find((c) => c.status !== "DISABLED");
  if (usable) return usable.id;

  const created = await composio<{ auth_config?: AuthConfig; id?: string }>(
    "/auth_configs",
    {
      method: "POST",
      body: {
        toolkit: { slug: toolkitSlug },
        auth_config: { type: "use_composio_managed_auth" },
      },
    },
  );
  const id = created.auth_config?.id ?? created.id;
  if (!id) throw new Error("Could not create a Composio auth config");
  return id;
}

export type InitiatedConnection = {
  connectedAccountId: string;
  redirectUrl: string | null;
  status: string;
};

export async function initiateConnection(
  toolkitSlug: string,
  userId: string,
  callbackUrl: string,
): Promise<InitiatedConnection> {
  const authConfigId = await ensureAuthConfig(toolkitSlug);
  const res = await composio<{
    id?: string;
    connected_account_id?: string;
    status?: string;
    redirect_url?: string | null;
  }>("/connected_accounts/link", {
    method: "POST",
    body: {
      auth_config_id: authConfigId,
      user_id: userId,
      callback_url: callbackUrl,
    },
  });
  return {
    connectedAccountId: res.connected_account_id ?? res.id ?? "",
    redirectUrl: res.redirect_url ?? null,
    status: res.status ?? "INITIATED",
  };
}

export async function connectionStatus(id: string): Promise<string> {
  const res = await composio<{ status?: string }>(`/connected_accounts/${id}`);
  return res.status ?? "UNKNOWN";
}

export async function deleteConnection(id: string): Promise<void> {
  await composio(`/connected_accounts/${id}`, { method: "DELETE" });
}

export type ComposioTool = {
  slug: string;
  name: string;
  description: string;
  inputParameters: Record<string, unknown>;
  toolkitSlug: string;
};

type RawTool = {
  slug: string;
  name: string;
  description?: string;
  input_parameters?: Record<string, unknown>;
  toolkit?: { slug?: string };
};

export async function listTools(
  toolkitSlugs: string[],
  limit = 15,
): Promise<ComposioTool[]> {
  if (toolkitSlugs.length === 0) return [];
  const results = await Promise.all(
    toolkitSlugs.map(async (slug) => {
      try {
        const data = await composio<{ items: RawTool[] }>("/tools", {
          query: { toolkit_slug: slug, limit: String(limit) },
        });
        return (data.items ?? []).map((t) => ({
          slug: t.slug,
          name: t.name,
          description: (t.description ?? "").slice(0, 900),
          inputParameters: t.input_parameters ?? {
            type: "object",
            properties: {},
          },
          toolkitSlug: t.toolkit?.slug ?? slug,
        }));
      } catch (error) {
        console.error(`Failed to list tools for ${slug}`, error);
        return [];
      }
    }),
  );
  return results.flat();
}

export async function executeTool(
  toolSlug: string,
  userId: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  return composio(`/tools/execute/${toolSlug}`, {
    method: "POST",
    body: { user_id: userId, arguments: args },
  });
}
