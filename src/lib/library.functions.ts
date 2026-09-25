import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Attachment = { path: string; name: string; type: string; size: number };

export type LibraryItem = {
  id: string;
  conversationId: string;
  kind: "generated" | "upload";
  name: string;
  type: string;
  url: string | null;
  createdAt: string;
};

export const listLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LibraryItem[]> => {
    const { data, error } = await context.supabase
      .from("messages")
      .select("*")
      .or("image_url.not.is.null,attachments.neq.[]")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const items: LibraryItem[] = [];
    const paths: string[] = [];
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const id = String(row["id"]);
      const conversationId = String(row["conversation_id"]);
      const createdAt = String(row["created_at"]);
      if (row["image_url"]) {
        items.push({ id: `${id}-gen`, conversationId, kind: "generated", name: "Generated image", type: "image/png", url: String(row["image_url"]), createdAt });
      }
      const atts = Array.isArray(row["attachments"]) ? (row["attachments"] as Attachment[]) : [];
      atts.forEach((a, i) => {
        paths.push(a.path);
        items.push({ id: `${id}-${i}`, conversationId, kind: "upload", name: a.name, type: a.type, url: a.path, createdAt });
      });
    }
    if (paths.length > 0) {
      const { data: signed } = await context.supabase.storage
        .from("attachments")
        .createSignedUrls(paths, 60 * 60);
      const map = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
      for (const item of items) {
        if (item.kind === "upload") item.url = map.get(item.url ?? "") ?? null;
      }
    }
    return items;
  });
