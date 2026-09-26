import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const USER_TABLES = ["messages", "conversations", "memories", "plugin_connections", "user_settings", "user_credits", "data_requests"] as const;

export const exportMyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const out: Record<string, unknown> = { exported_at: new Date().toISOString(), user_id: context.userId };
    const sb = context.supabase as unknown as { from: (t: string) => any };
    const profile = await sb.from("profiles").select("*").eq("id", context.userId);
    out.profiles = profile.data ?? [];
    for (const t of USER_TABLES) {
      const { data } = await sb.from(t).select("*").eq("user_id", context.userId);
      out[t] = data ?? [];
    }
    return JSON.stringify(out, null, 2);
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as { from: (t: string) => any; auth: typeof supabaseAdmin.auth; storage: typeof supabaseAdmin.storage };
    const uid = context.userId;
    for (const t of USER_TABLES) await admin.from(t).delete().eq("user_id", uid);
    await admin.from("profiles").delete().eq("id", uid);
    // Remove uploaded files stored under the user's folder in any bucket.
    const { data: buckets } = await admin.storage.listBuckets();
    for (const b of buckets ?? []) {
      const { data: files } = await admin.storage.from(b.id).list(uid, { limit: 1000 });
      if (files?.length) await admin.storage.from(b.id).remove(files.map((f) => `${uid}/${f.name}`));
    }
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
