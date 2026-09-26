import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { LegalLayout } from "@/components/aurora/legal-layout";
import { LEGAL_DOCS } from "@/lib/legal-content";

export const Route = createFileRoute("/legal/")({
  head: () => ({
    meta: [
      { title: "Legal center — Aurora" },
      { name: "description", content: "Aurora's terms, privacy policy, cookies, refunds and your data rights." },
      { property: "og:title", content: "Legal center — Aurora" },
      { property: "og:description", content: "Aurora's terms, privacy policy, cookies, refunds and your data rights." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LegalIndex,
});

function LegalIndex() {
  return (
    <LegalLayout title="Legal center">
      <div className="overflow-hidden rounded-2xl bg-secondary">
        {LEGAL_DOCS.map((d) => (
          <Link key={d.slug} to="/legal/$slug" params={{ slug: d.slug }} className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0 hover:bg-foreground/5">
            <div className="flex-1">
              <p className="text-[15px]">{d.title}</p>
              <p className="text-xs text-muted-foreground">{d.summary}</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
        <Link to="/legal/data-request" className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/5">
          <div className="flex-1">
            <p className="text-[15px]">GDPR data request</p>
            <p className="text-xs text-muted-foreground">Access, correct, export or erase your data.</p>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </div>
    </LegalLayout>
  );
}
