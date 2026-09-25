import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TablesInsert } from "@/integrations/supabase/types";

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("conversations")
      .select("id, title, pinned, updated_at")
      .eq("archived", false)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ title: z.string().max(120).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("conversations")
      .insert({ user_id: context.userId, title: data.title ?? "New chat" })
      .select("id, title, pinned, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const renameConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), title: z.string().min(1).max(120) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("conversations")
      .update({ title: data.title })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("conversations")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setConversationState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        pinned: z.boolean().optional(),
        archived: z.boolean().optional(),
      })
      .refine((value) => value.pinned !== undefined || value.archived !== undefined)
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const changes: { pinned?: boolean; archived?: boolean } = {};
    if (data.pinned !== undefined) changes.pinned = data.pinned;
    if (data.archived !== undefined) changes.archived = data.archived;
    const { error } = await context.supabase
      .from("conversations")
      .update(changes)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ conversationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("messages")
      .select("id, role, content, parts, image_url, attachments, created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    // Sign fresh download links for any attached files (bucket is private).
    return Promise.all(
      (rows ?? []).map(async (row) => {
        const atts = Array.isArray(row.attachments)
          ? (row.attachments as { name?: string; path?: string; mime?: string }[])
          : [];
        if (atts.length === 0) return row;
        const signed = await Promise.all(
          atts.map(async (a) => {
            if (!a.path) return { ...a, url: "" };
            const { data: s } = await context.supabase.storage
              .from("attachments")
              .createSignedUrl(a.path, 60 * 60 * 24);
            return { ...a, url: s?.signedUrl ?? "" };
          }),
        );
        return { ...row, attachments: signed };
      }),
    );
  });

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [settings, profile, memories] = await Promise.all([
      context.supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("profiles")
        .select("*")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("memories")
        .select("id, content, source, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    let avatar_signed: string | null = null;
    const path = profile.data?.avatar_url;
    if (path) {
      const { data: signed } = await context.supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24);
      avatar_signed = signed?.signedUrl ?? null;
    }
    return {
      settings: settings.data,
      profile: profile.data ? { ...profile.data, avatar_signed } : null,
      memories: memories.data ?? [],
    };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        display_name: z.string().max(80).optional(),
        avatar_url: z.string().max(300).optional(),
        about_you: z.string().max(2000).optional(),
        custom_instructions: z.string().max(4000).optional(),
        tone: z.string().max(40).optional(),
        memory_enabled: z.boolean().optional(),
        traits: z
          .object({
            warmth: z.enum(["less", "default", "more"]).optional(),
            enthusiasm: z.enum(["less", "default", "more"]).optional(),
            formatting: z.enum(["less", "default", "more"]).optional(),
            emoji: z.enum(["less", "default", "more"]).optional(),
            fast_answers: z.boolean().optional(),
          })
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { display_name, avatar_url, ...settings } = data;
    if (avatar_url !== undefined && avatar_url && !avatar_url.startsWith(`${context.userId}/`)) {
      throw new Error("Invalid avatar path");
    }
    if (display_name !== undefined || avatar_url !== undefined) {
      const row: { id: string; display_name?: string; avatar_url?: string | null } = { id: context.userId };
      if (display_name !== undefined) row.display_name = display_name;
      if (avatar_url !== undefined) row.avatar_url = avatar_url || null;
      const { error } = await context.supabase
        .from("profiles")
        .upsert(row, { onConflict: "id" });
      if (error) throw new Error(error.message);
    }
    const clean = Object.fromEntries(
      Object.entries(settings).filter(([, v]) => v !== undefined),
    ) as Partial<TablesInsert<"user_settings">>;
    if (Object.keys(clean).length > 0) {
      const { error } = await context.supabase
        .from("user_settings")
        .upsert({ user_id: context.userId, ...clean }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("memories")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Full Composio catalogue plus this user's connection state. */
export const listPlugins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listToolkits } = await import("./composio.server");
    const [catalog, connections] = await Promise.all([
      listToolkits(),
      context.supabase
        .from("plugin_connections")
        .select("*")
        .eq("user_id", context.userId),
    ]);
    return { catalog, connections: connections.data ?? [] };
  });

export const connectPlugin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        toolkitSlug: z.string().min(1).max(80),
        toolkitName: z.string().min(1).max(120),
        callbackUrl: z.string().url(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { initiateConnection } = await import("./composio.server");
    const result = await initiateConnection(
      data.toolkitSlug,
      context.userId,
      data.callbackUrl,
    );
    const { error } = await context.supabase.from("plugin_connections").upsert(
      {
        user_id: context.userId,
        toolkit_slug: data.toolkitSlug,
        toolkit_name: data.toolkitName,
        connected_account_id: result.connectedAccountId,
        status: result.status,
        enabled: true,
      },
      { onConflict: "user_id,toolkit_slug" },
    );
    if (error) throw new Error(error.message);
    return result;
  });

export const refreshPlugin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ toolkitSlug: z.string().min(1).max(80) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { connectionStatus } = await import("./composio.server");
    const { data: row } = await context.supabase
      .from("plugin_connections")
      .select("connected_account_id")
      .eq("user_id", context.userId)
      .eq("toolkit_slug", data.toolkitSlug)
      .maybeSingle();
    if (!row?.connected_account_id) return { status: "NOT_CONNECTED" };
    const status = await connectionStatus(row.connected_account_id);
    await context.supabase
      .from("plugin_connections")
      .update({ status })
      .eq("user_id", context.userId)
      .eq("toolkit_slug", data.toolkitSlug);
    return { status };
  });

export const disconnectPlugin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ toolkitSlug: z.string().min(1).max(80) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { deleteConnection } = await import("./composio.server");
    const { data: row } = await context.supabase
      .from("plugin_connections")
      .select("connected_account_id")
      .eq("user_id", context.userId)
      .eq("toolkit_slug", data.toolkitSlug)
      .maybeSingle();
    if (row?.connected_account_id) {
      try {
        await deleteConnection(row.connected_account_id);
      } catch (error) {
        console.error("Composio disconnect failed", error);
      }
    }
    const { error } = await context.supabase
      .from("plugin_connections")
      .delete()
      .eq("user_id", context.userId)
      .eq("toolkit_slug", data.toolkitSlug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
