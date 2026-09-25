import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus } from "lucide-react";
import { AppShell } from "@/components/aurora/app-shell";
import { listLibrary } from "@/lib/library.functions";

export const Route = createFileRoute("/_authenticated/images")({
  head: () => ({
    meta: [
      { title: "Images — Aurora" },
      { name: "description", content: "Every image you created or shared with Aurora, in one place." },
      { property: "og:title", content: "Images — Aurora" },
      { property: "og:description", content: "Your generated and uploaded images." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImagesPage,
});

function ImagesPage() {
  const fetchLibrary = useServerFn(listLibrary);
  const q = useQuery({ queryKey: ["library"], queryFn: () => fetchLibrary({}) });
  const images = (q.data ?? []).filter((i) => i.type.startsWith("image/") && i.url);

  return (
    <AppShell title="Images">
      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-20">
        {q.isLoading ? (
          <p className="mt-20 text-center text-sm text-muted-foreground">Loading…</p>
        ) : images.length === 0 ? (
          <div className="mx-auto mt-24 max-w-sm text-center">
            <ImagePlus className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-4 font-medium">No images yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask Aurora to create one, or attach a photo in a chat.
            </p>
            <Link to="/chat" search={{}} className="mt-5 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
              Create an image
            </Link>
          </div>
        ) : (
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img) => (
              <Link key={img.id} to="/chat" search={{ c: img.conversationId }} className="group relative aspect-square overflow-hidden rounded-2xl bg-secondary">
                <img src={img.url!} alt={img.name} loading="lazy" className="size-full object-cover transition-transform group-hover:scale-105" />
                {img.kind === "generated" && (
                  <span className="absolute left-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[11px]">Created</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
