import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { openCookieSettings } from "./cookie-banner";

export function LegalLayout({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link to="/legal" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Legal center
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{title}</h1>
        {updated && <p className="mt-2 text-xs text-muted-foreground">Last updated: {updated}</p>}
        <div className="mt-8">{children}</div>
        <LegalFooter />
      </div>
    </main>
  );
}

export function LegalFooter() {
  return (
    <footer className="mt-16 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-6 text-xs text-muted-foreground">
      <Link to="/legal/$slug" params={{ slug: "terms" }} className="hover:text-foreground">Terms</Link>
      <Link to="/legal/$slug" params={{ slug: "privacy" }} className="hover:text-foreground">Privacy</Link>
      <Link to="/legal/$slug" params={{ slug: "cookies" }} className="hover:text-foreground">Cookies</Link>
      <Link to="/legal/$slug" params={{ slug: "imprint" }} className="hover:text-foreground">Legal info</Link>
      <button type="button" onClick={openCookieSettings} className="hover:text-foreground">Cookie settings</button>
    </footer>
  );
}
