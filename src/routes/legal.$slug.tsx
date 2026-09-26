import { createFileRoute, notFound } from "@tanstack/react-router";
import { LegalLayout } from "@/components/aurora/legal-layout";
import { findDoc, LEGAL } from "@/lib/legal-content";

export const Route = createFileRoute("/legal/$slug")({
  loader: ({ params }) => {
    const doc = findDoc(params.slug);
    if (!doc) throw notFound();
    return { doc };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Not found — Aurora" }, { name: "robots", content: "noindex" }] };
    const t = `${loaderData.doc.title} — Aurora`;
    return {
      meta: [
        { title: t },
        { name: "description", content: loaderData.doc.summary },
        { property: "og:title", content: t },
        { property: "og:description", content: loaderData.doc.summary },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: LegalDocPage,
});

function LegalDocPage() {
  const { doc } = Route.useLoaderData();
  return (
    <LegalLayout title={doc.title} updated={LEGAL.lastUpdated}>
      <div className="space-y-7">
        {doc.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-semibold">{s.h}</h2>
            {s.p.map((p, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed text-muted-foreground">{p}</p>
            ))}
          </section>
        ))}
      </div>
    </LegalLayout>
  );
}
