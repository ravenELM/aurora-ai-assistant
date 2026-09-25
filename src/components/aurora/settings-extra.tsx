import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Globe, KeyRound, LogOut, Shuffle, SpellCheck, TrendingUp, Vibrate, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const ACCENTS: { id: string; label: string; value: string | null }[] = [
  { id: "default", label: "Default", value: null },
  { id: "blue", label: "Blue", value: "oklch(0.62 0.19 255)" },
  { id: "green", label: "Green", value: "oklch(0.7 0.18 150)" },
  { id: "yellow", label: "Yellow", value: "oklch(0.85 0.17 90)" },
  { id: "pink", label: "Pink", value: "oklch(0.72 0.19 350)" },
  { id: "orange", label: "Orange", value: "oklch(0.72 0.19 50)" },
];

export function applyAccent(id: string) {
  const a = ACCENTS.find((x) => x.id === id);
  const root = document.documentElement.style;
  if (!a?.value) {
    root.removeProperty("--primary");
    root.removeProperty("--primary-foreground");
  } else {
    root.setProperty("--primary", a.value);
    root.setProperty("--primary-foreground", "oklch(0.15 0 0)");
  }
  localStorage.setItem("aurora-accent", id);
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="relative mb-4 flex items-center justify-center py-2">
      <button type="button" onClick={onBack} aria-label="Back" className="absolute left-0 grid size-10 place-items-center rounded-full bg-secondary">
        <ChevronLeft className="size-5" />
      </button>
      <h1 className="text-base font-semibold">{title}</h1>
    </div>
  );
}

function Group({ label, note, children }: { label?: string; note?: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      {label && <p className="px-1 pb-2 text-sm text-muted-foreground">{label}</p>}
      <div className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-secondary">{children}</div>
      {note && <p className="px-1 pt-2 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-muted")}>
      <span className={cn("absolute top-0.5 size-6 rounded-full bg-background transition-transform", on ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

const PREFS_KEY = "aurora-general";
type Prefs = Record<string, boolean>;
const DEFAULTS: Prefs = { autocorrect: true, haptics: true, autoswitch: true, autocomplete: true, trending: true, websearch: true };

export function GeneralView({ title, onBack }: { title: string; onBack: () => void }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  useEffect(() => {
    try { setPrefs({ ...DEFAULTS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") }); } catch { /* ignore */ }
  }, []);
  const set = (k: string, v: boolean) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  };
  const row = (k: string, Icon: typeof Globe, label: string, sub?: string) => (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px]">{label}</span>
        {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
      </span>
      <Switch on={prefs[k] ?? true} onChange={(v) => set(k, v)} label={label} />
    </div>
  );
  return (
    <>
      <Header title={title} onBack={onBack} />
      <Group>
        <div className="flex items-center gap-3 px-4 py-3">
          <Globe className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[15px]">App language</span>
          <span className="text-sm text-muted-foreground">English</span>
        </div>
        {row("autocorrect", SpellCheck, "Auto-correct spelling")}
        {row("haptics", Vibrate, "Haptic feedback")}
      </Group>
      <Group label="Intelligence">{row("autoswitch", Shuffle, "Auto switch", "Use higher intelligence for complex questions")}</Group>
      <Group label="Suggestions">
        {row("autocomplete", WandSparkles, "Autocomplete")}
        {row("trending", TrendingUp, "Trending searches")}
      </Group>
      <Group label="Automatically use">{row("websearch", Globe, "Web search", "Search the web for real-time info.")}</Group>
    </>
  );
}

export function SecurityView({ title, onBack }: { title: string; onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const item = (label: string, value?: string, onClick?: () => void) => (
    <button type="button" onClick={onClick ?? (() => toast("Coming soon"))} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-foreground/5">
      <span className="flex-1 text-[15px]">{label}</span>
      {value && <span className="text-sm text-muted-foreground">{value}</span>}
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  );
  return (
    <>
      <Header title={title} onBack={onBack} />
      <Group label="Log in" note="Use passkeys or security keys to sign in. They protect you better than passwords.">
        {item("Security keys & passkeys")}
      </Group>
      <Group label="Multi-factor authentication" note="Ask for an extra check when you log in.">
        {item("Authenticator app", "Off")}
        {item("Text messages", "Off")}
      </Group>
      <Group label="Password">
        {item("Send password reset email", undefined, async () => {
          const { data } = await supabase.auth.getUser();
          const email = data.user?.email;
          if (!email) return;
          const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth` });
          if (error) toast.error(error.message);
          else toast.success("Check your inbox for a reset link");
        })}
      </Group>
      <Group label="Sessions" note="Sign out of Aurora on every device, including this one.">
        <button type="button" disabled={busy} onClick={async () => {
          setBusy(true);
          await supabase.auth.signOut({ scope: "global" });
          window.location.href = "/";
        }} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-destructive hover:bg-foreground/5">
          <LogOut className="size-5" /><span className="flex-1 text-[15px]">Log out of all devices</span>
          <KeyRound className="size-4 opacity-0" />
        </button>
      </Group>
    </>
  );
}
