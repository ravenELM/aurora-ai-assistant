import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LegalLayout } from "@/components/aurora/legal-layout";
import { supabase } from "@/integrations/supabase/client";
import { LEGAL } from "@/lib/legal-content";

export const Route = createFileRoute("/legal/data-request")({
  head: () => ({
    meta: [
      { title: "GDPR data request — Aurora" },
      { name: "description", content: "Ask Aurora to access, correct, export, restrict or erase your personal data." },
      { property: "og:title", content: "GDPR data request — Aurora" },
      { property: "og:description", content: "Ask Aurora to access, correct, export, restrict or erase your personal data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DataRequestPage,
});

const TYPES = [
  ["access", "Access my data"],
  ["rectification", "Correct my data"],
  ["erasure", "Erase my data"],
  ["restriction", "Restrict processing"],
  ["portability", "Data portability"],
  ["objection", "Object to processing"],
  ["other", "Other"],
] as const;

type Req = { id: string; request_type: string; status: string; created_at: string };

function DataRequestPage() {
  const [user, setUser] = useState<{ id: string; email?: string } | null | undefined>(undefined);
  const [type, setType] = useState<string>("access");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<Req[]>([]);

  const load = async () => {
    const { data } = await supabase.from("data_requests" as never).select("id,request_type,status,created_at").order("created_at", { ascending: false });
    setList((data as Req[] | null) ?? []);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id, email: data.user.email } : null);
      if (data.user) void load();
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("data_requests" as never).insert({ user_id: user.id, email: user.email, request_type: type, details: details.slice(0, 2000) } as never);
    setBusy(false);
    if (error) return toast.error("Couldn't send your request.");
    toast.success("Request received. We'll reply within one month.");
    setDetails("");
    void load();
  };

  return (
    <LegalLayout title="GDPR data request">
      <p className="text-sm text-muted-foreground">
        Under the GDPR you can access, correct, export, restrict or erase your data. You can also download your data or delete your account instantly in Settings → Privacy & legal. We answer requests within one month. Not signed in? Email {LEGAL.privacyEmail}.
      </p>
      {user === null && (
        <Link to="/auth" className="mt-6 inline-flex rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">Sign in to submit a request</Link>
      )}
      {user && (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none">
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} rows={4} placeholder="Details (optional)" className="w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none" />
          <button disabled={busy} className="w-full rounded-full bg-foreground py-3 text-sm font-medium text-background disabled:opacity-60">Submit request</button>
        </form>
      )}
      {list.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold">Your requests</h2>
          <ul className="mt-2 divide-y divide-border rounded-2xl bg-secondary text-sm">
            {list.map((r) => (
              <li key={r.id} className="flex justify-between px-4 py-3">
                <span>{TYPES.find((t) => t[0] === r.request_type)?.[1] ?? r.request_type}</span>
                <span className="text-muted-foreground">{r.status} · {new Date(r.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </LegalLayout>
  );
}
