import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { FileText, Search } from "lucide-react";
import { AppShell } from "@/components/aurora/app-shell";
import { listLibrary } from "@/lib/library.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Library — Aurora" },
      { name: "description", content: "All the files and images from your Aurora chats." },
      { property: "og:title", content: "Library — Aurora" },
      { property: "og:description", content: "Your files and images from Aurora chats." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LibraryPage,
});

const tabs = ["All", "Files", "Images"] as const;

function LibraryPage() {
  const fetchLibrary = useServerFn(listLibrary);
  const q = useQuery({ queryKey: ["library"], queryFn: () => fetchLibrary({}) });
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [search, setSearch] = useState("");

  const items = (q.data ?? []).filter((i) => {
    const isImg = i.type.startsWith("image/");
    if (tab === "Files" && isImg) return false;
    if (tab === "Images" && !isImg) return false;
    return i.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <AppShell title="Library">
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-20">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full px-5 py-2 text-[15px] transition-colors",
              tab === t ? "bg-secondary font-medium" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10">
        {!q.isLoading && items.length === 0 && (
          <p className="mt-20 text-center text-sm text-muted-foreground">
            Nothing here yet. Files and images you attach in chats show up here.
          </p>
        )}
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 lg:grid-cols-4">
          {items.map((i) => (
            <a
              key={i.id}
              href={i.url ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="flex aspect-[4/5] flex-col overflow-hidden rounded-3xl border border-border bg-card"
            >
              {i.type.startsWith("image/") && i.url ? (
                <img src={i.url} alt={i.name} loading="lazy" className="size-full object-cover" />
              ) : (
                <div className="flex flex-1 flex-col justify-between p-4">
                  <p className="line-clamp-3 break-words text-[15px] font-medium">{i.name}</p>
                  <FileText className="size-7 text-primary" />
                </div>
              )}
            </a>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-4">
        <label className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-full border border-border bg-secondary px-4 py-3">
          <Search className="size-5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search library"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>
      <Link to="/chat" search={{}} className="sr-only">Back to chat</Link>
    </AppShell>
  );
}
