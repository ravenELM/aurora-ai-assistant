import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const KEY = "aurora-cookie-consent";
const EVT = "aurora-open-cookie-settings";

export type Consent = { necessary: true; analytics: boolean; date: string };

export function getConsent(): Consent | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; }
}
export function openCookieSettings() {
  window.dispatchEvent(new Event(EVT));
}

export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const c = getConsent();
    if (!c) setOpen(true); else setAnalytics(c.analytics);
    const h = () => { setOpen(true); setCustom(true); };
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, []);

  const save = (a: boolean) => {
    localStorage.setItem(KEY, JSON.stringify({ necessary: true, analytics: a, date: new Date().toISOString() }));
    setOpen(false); setCustom(false);
  };

  if (!open) return null;
  return (
    <div role="dialog" aria-label="Cookie consent" className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-[100] mx-auto max-w-md rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl">
      <p className="text-sm font-medium">Cookies</p>
      <p className="mt-1 text-xs text-muted-foreground">
        We use necessary cookies to keep you signed in. With your consent we'd also use analytics cookies to improve Aurora.{" "}
        <Link to="/legal/$slug" params={{ slug: "cookies" }} className="underline">Cookie Policy</Link>
      </p>
      {custom && (
        <div className="mt-3 space-y-2 text-xs">
          <label className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
            Necessary <input type="checkbox" checked disabled />
          </label>
          <label className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
            Analytics <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
          </label>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => save(false)} className="flex-1 rounded-full bg-secondary py-2 text-xs font-medium">Reject all</button>
        {custom ? (
          <button type="button" onClick={() => save(analytics)} className="flex-1 rounded-full bg-secondary py-2 text-xs font-medium">Save choice</button>
        ) : (
          <button type="button" onClick={() => setCustom(true)} className="flex-1 rounded-full bg-secondary py-2 text-xs font-medium">Customize</button>
        )}
        <button type="button" onClick={() => save(true)} className="flex-1 rounded-full bg-foreground py-2 text-xs font-medium text-background">Accept all</button>
      </div>
    </div>
  );
}
