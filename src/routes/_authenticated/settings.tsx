import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  Camera,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Flag,
  Info,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Monitor,
  Paintbrush,
  Palette,
  Sparkle,
  Plug,
  Plus,
  Search,
  Trash2,
  UserRound,
  Volume2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  connectPlugin,
  disconnectPlugin,
  getSettings,
  listPlugins,
  refreshPlugin,
  updateSettings,
} from "@/lib/aurora.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useCredits } from "@/lib/credits";
import { ACCENTS, applyAccent, GeneralView, SecurityView } from "@/components/aurora/settings-extra";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Aurora settings & plugins" },
      {
        name: "description",
        content: "Manage your Aurora account, personalization, memory and connected plugins.",
      },
      { property: "og:title", content: "Aurora settings & plugins" },
      {
        property: "og:description",
        content: "Manage your account, personalization, memory and plugins.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

type View = "home" | "personalization" | "memory" | "plugins" | "library" | "profile" | "general" | "security";

const TONES = [
  ["default", "Default", "Preset style and tone"],
  ["professional", "Professional", "Clear, composed, businesslike"],
  ["friendly", "Friendly", "Warm and easy to talk to"],
  ["candid", "Candid", "Straight talk, no fluff"],
  ["witty", "Witty", "Clever, with a light bite"],
  ["concise", "Concise", "Short answers. Cut the extra"],
  ["empathetic", "Empathetic", "Supportive — listen first"],
] as const;

function splitAbout(about: string) {
  const m = about.match(/^Occupation: (.*)\n?/);
  return m ? { occupation: m[1] ?? "", more: about.slice(m[0].length) } : { occupation: "", more: about };
}

function SettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [view, setViewRaw] = useState<View>("home");
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const setView = (next: View) => {
    setDir(next === "home" || (view === "library" && next === "plugins") ? "back" : "fwd");
    setViewRaw(next);
    window.scrollTo({ top: 0 });
  };
  const [email, setEmail] = useState<string | null>(null);
  const credits = useCredits();
  const [accent, setAccent] = useState("default");
  const [accentOpen, setAccentOpen] = useState(false);
  useEffect(() => { setAccent(localStorage.getItem("aurora-accent") ?? "default"); }, []);
  const fetchSettings = useServerFn(getSettings);
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => fetchSettings({}) });

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const avatarUrl = settings.data?.profile?.avatar_signed ?? null;
  const [avatarReady, setAvatarReady] = useState(false);
  useEffect(() => {
    setAvatarReady(false);
    if (!avatarUrl) return;
    const image = new Image();
    image.onload = () => setAvatarReady(true);
    image.src = avatarUrl;
    return () => {
      image.onload = null;
    };
  }, [avatarUrl]);

  const accountLoading = settings.isPending || credits.isPending || email === null || Boolean(avatarUrl && !avatarReady);
  const name = settings.data?.profile?.display_name || email?.split("@")[0] || "Aurora user";
  const s = settings.data?.settings;
  const refresh = () => qc.invalidateQueries({ queryKey: ["settings"] });
  const back = () => setView(view === "library" ? "plugins" : "home");

  if (accountLoading) {
    return (
      <Page id="loading">
        <div className="relative flex items-center justify-center py-2">
          <h1 className="text-base font-semibold">Settings</h1>
          <Link to="/chat" search={{}} aria-label="Close settings" className="absolute right-0 grid size-10 place-items-center rounded-full bg-secondary">
            <X className="size-5" />
          </Link>
        </div>
        <div className="mt-4 flex min-h-28 flex-col items-center gap-3" aria-label="Loading settings">
          <div className="size-20 animate-pulse rounded-full bg-muted" />
          <div className="h-6 w-28 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="mt-7 space-y-3">
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="h-36 animate-pulse rounded-2xl bg-secondary" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-48 animate-pulse rounded-2xl bg-secondary" />
        </div>
      </Page>
    );
  }

  if (view !== "home" && view !== "profile") {
    const titles: Record<Exclude<View, "home">, string> = {
      personalization: "Personalization",
      memory: "Memory",
      plugins: "Plugins",
      library: "Plugins library",
      profile: "Profile",
      general: "General",
      security: "Security and login",
    };
    return (
      <Page id={view} dir={dir}>
        {view === "personalization" && settings.data && (
          <PersonalizationView title={titles[view]} onBack={back} initial={{ tone: s?.tone ?? "default", custom_instructions: s?.custom_instructions ?? "", traits: ((s as { traits?: Traits } | null | undefined)?.traits ?? {}) }} onSaved={refresh} />
        )}
        {view === "memory" && settings.data && (
          <MemoryView title={titles[view]} onBack={back} initial={{ memory_enabled: s?.memory_enabled ?? true, display_name: settings.data.profile?.display_name ?? "", ...splitAbout(s?.about_you ?? "") }} onSaved={refresh} />
        )}
        {(view === "plugins" || view === "library") && (
          <>
            <SubHeader title={titles[view]} onBack={back} />
            <PluginsView library={view === "library"} openLibrary={() => setView("library")} />
          </>
        )}
        {view === "general" && <GeneralView title={titles[view]} onBack={back} />}
        {view === "security" && <SecurityView title={titles[view]} onBack={back} />}
        {!settings.data && view !== "plugins" && view !== "library" && view !== "general" && view !== "security" && (
          <div className="grid h-40 place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        )}
      </Page>
    );
  }

  return (
    <>
    <Page id="home" dir={dir}>
      <div className="relative flex items-center justify-center py-2">
        <h1 className="text-base font-semibold">Settings</h1>
        <Link to="/chat" search={{}} aria-label="Close settings" className="absolute right-0 grid size-10 place-items-center rounded-full bg-secondary">
          <X className="size-5" />
        </Link>
      </div>
      <ProfileIdentity
        avatarUrl={avatarUrl}
        name={name}
        onClick={() => setView("profile")}
      />

      <Section label="Customize Aurora">
        <Row icon={UserRound} label="Personalization" onClick={() => setView("personalization")} />
        <Row icon={BookOpen} label="Memory" onClick={() => setView("memory")} />
        <Row icon={Plug} label="Plugins" onClick={() => setView("plugins")} />
      </Section>
      <Section label="Account">
        <Row icon={UserRound} label="Profile" sub="Name and photo" onClick={() => setView("profile")} />
        <Row icon={Mail} label="Email" sub={email} />
        <Row icon={Plus} label="Subscription" value={credits.data ? `${credits.data.plan[0]?.toUpperCase()}${credits.data.plan.slice(1)} · ${Math.round(Number(credits.data.balance) * 100) / 100} credits` : "Free"} onClick={() => void navigate({ to: "/upgrade" })} />
        <button type="button" onClick={() => void navigate({ to: "/upgrade" })} className="flex w-full items-center gap-3 px-4 py-3 text-left text-primary transition-colors hover:bg-foreground/5">
          <Sparkle className="size-5 shrink-0" /><span className="text-[15px]">Upgrade to Plus</span>
        </button>
      </Section>
      <Section label="Theme">
        <Row icon={Paintbrush} label="Appearance" value="Dark" />
        <div className="relative">
          <Row icon={Palette} label="Accent color" value={ACCENTS.find((a) => a.id === accent)?.label ?? "Default"} onClick={() => setAccentOpen((o) => !o)} />
          {accentOpen && (
            <div className="border-t border-border/60 px-2 py-1">
              {ACCENTS.map((a) => (
                <button key={a.id} type="button" onClick={() => { setAccent(a.id); applyAccent(a.id); setAccentOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] hover:bg-foreground/5">
                  <Check className={cn("size-4", accent === a.id ? "opacity-100" : "opacity-0")} />
                  <span className="size-3.5 rounded-full" style={{ background: a.value ?? "var(--foreground)" }} />
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </Section>
      <Section label="App settings">
        <Row icon={Monitor} label="General" onClick={() => setView("general")} />
        <Row icon={Bell} label="Notifications" />
        <Row icon={Volume2} label="Voice" />
        <Row icon={Lock} label="Security and login" onClick={() => setView("security")} />
      </Section>
      <Section label="Get help">
        <Row icon={Flag} label="Report app issue" />
        <Row icon={CircleHelp} label="Help Center" />
        <Row icon={Info} label="About" />
      </Section>
      <button
        type="button"
        onClick={async () => { await supabase.auth.signOut(); void navigate({ to: "/" }); }}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary py-3.5 text-sm font-medium text-destructive"
      >
        <LogOut className="size-4" /> Log out
      </button>
    </Page>
    {view === "profile" && settings.data && (
      <ProfileView title="Profile" onBack={() => setView("home")} initial={settings.data.profile?.display_name ?? ""} avatar={avatarUrl} onSaved={refresh} />
    )}
    </>
  );
}

function ProfileIdentity({ avatarUrl, name, onClick }: { avatarUrl: string | null; name: string; onClick: () => void }) {
  return (
    <div className="mt-4 flex min-h-28 flex-col items-center gap-3">
      <button type="button" onClick={onClick} className="grid size-20 place-items-center overflow-hidden rounded-full bg-primary text-3xl font-semibold text-primary-foreground">
        {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : name[0]?.toUpperCase()}
      </button>
      <p className="text-lg font-semibold">{name}</p>
    </div>
  );
}

function Page({ children, id, dir = "fwd" }: { children: ReactNode; id: string; dir?: "fwd" | "back" }) {
  const isOverlay = id === "profile";
  return (
    <div className="min-h-dvh overflow-x-hidden bg-background pb-10">
      <div
        key={id}
        className={cn(
          "mx-auto w-full max-w-xl px-4 pt-[max(env(safe-area-inset-top),1rem)]",
          !isOverlay && "animate-in fade-in duration-300 ease-out",
          !isOverlay && (dir === "fwd" ? "slide-in-from-right-8" : "slide-in-from-left-8"),
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-7 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500">
      <p className="px-1 pb-2 text-sm text-muted-foreground">{label}</p>
      <div className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-secondary">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, sub, value, onClick }: { icon: typeof Plug; label: string; sub?: string; value?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-foreground/5 active:bg-foreground/10">
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px]">{label}</span>
        {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
      </span>
      {value && <span className="text-sm text-muted-foreground">{value}</span>}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function SubHeader({ title, onBack, onSave, saving }: { title: string; onBack: () => void; onSave?: () => void; saving?: boolean }) {
  return (
    <div className="relative mb-4 flex items-center justify-center py-2">
      <button type="button" onClick={onBack} aria-label="Back" className="absolute left-0 grid size-10 place-items-center rounded-full bg-secondary">
        <ChevronLeft className="size-5" />
      </button>
      <h1 className="text-base font-semibold">{title}</h1>
      {onSave && (
        <button type="button" onClick={onSave} disabled={saving} className="absolute right-0 rounded-full bg-secondary px-4 py-2 text-sm font-medium disabled:opacity-60">
          {saving ? "Saving…" : "Save"}
        </button>
      )}
    </div>
  );
}

function useSave(onSaved: () => void, done?: () => void) {
  const save = useServerFn(updateSettings);
  return useMutation({
    mutationFn: (data: { traits?: Traits; display_name?: string; avatar_url?: string; about_you?: string; custom_instructions?: string; tone?: string; memory_enabled?: boolean }) => save({ data }),
    onSuccess: () => { toast.success("Saved"); onSaved(); done?.(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });
}

const field = "w-full rounded-2xl bg-secondary px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

type Level = "less" | "default" | "more";
type Traits = { warmth?: Level; enthusiasm?: Level; formatting?: Level; emoji?: Level; fast_answers?: boolean };
const TRAITS = [
  ["warmth", "Warmth"],
  ["enthusiasm", "Enthusiasm"],
  ["formatting", "Headers and lists"],
  ["emoji", "Emoji"],
] as const;

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 animate-in fade-in bg-background/60 duration-200" />
      <div className="relative max-h-[75dvh] w-full max-w-xl animate-in slide-in-from-bottom overflow-y-auto rounded-t-3xl bg-popover p-2 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-2xl duration-300 ease-out">
        <p className="px-3 py-3 text-sm font-semibold">{title}</p>
        {children}
      </div>
    </div>
  );
}

function Option({ label, desc, selected, onClick }: { label: string; desc?: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-foreground/5 active:scale-[0.99]">
      <span className="flex-1"><span className="block text-[15px]">{label}</span>{desc && <span className="block text-xs text-muted-foreground">{desc}</span>}</span>
      {selected && <Check className="size-4 animate-in zoom-in duration-200" />}
    </button>
  );
}

function PersonalizationView({ title, onBack, initial, onSaved }: { title: string; onBack: () => void; initial: { tone: string; custom_instructions: string; traits: Traits }; onSaved: () => void }) {
  const [form, setForm] = useState(initial);
  const [sheet, setSheet] = useState<null | "tone" | (typeof TRAITS)[number][0]>(null);
  const m = useSave(onSaved, onBack);
  const current = TONES.find((t) => t[0] === form.tone) ?? TONES[0];
  const cap = (v?: string) => (v ?? "default").replace(/^./, (c) => c.toUpperCase());
  const setTrait = (patch: Traits) => setForm({ ...form, traits: { ...form.traits, ...patch } });
  return (
    <>
      <SubHeader title={title} onBack={onBack} onSave={() => m.mutate(form)} saving={m.isPending} />
      <button type="button" onClick={() => setSheet("tone")} className="flex w-full items-center justify-between rounded-2xl bg-secondary px-4 py-3.5 text-[15px] transition-colors hover:bg-secondary/80">
        Base style and tone <span className="text-muted-foreground">{current[1]} ▾</span>
      </button>
      <p className="px-4 pt-2 text-sm text-muted-foreground">{current[2]}</p>

      <div className="mt-5 divide-y divide-border/60 overflow-hidden rounded-2xl bg-secondary">
        {TRAITS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setSheet(key)} className="flex w-full items-center justify-between px-4 py-3.5 text-[15px] transition-colors hover:bg-foreground/5">
            {label} <span className="text-muted-foreground">{cap(form.traits[key])} ▾</span>
          </button>
        ))}
      </div>

      <label className="mt-5 flex items-center gap-4 rounded-2xl bg-secondary px-4 py-3.5">
        <span className="flex-1">
          <span className="block text-[15px]">Fast answers</span>
          <span className="block text-xs text-muted-foreground">Aurora can use general knowledge for fast answers that skip saved memory.</span>
        </span>
        <Toggle checked={form.traits.fast_answers ?? false} onChange={(v) => setTrait({ fast_answers: v })} />
      </label>

      <p className="mt-6 px-1 pb-2 text-sm">Custom instructions</p>
      <textarea rows={5} value={form.custom_instructions} onChange={(e) => setForm({ ...form, custom_instructions: e.target.value })} placeholder="How should Aurora respond?" className={cn(field, "resize-none")} />

      {sheet === "tone" && (
        <Sheet title="Base style and tone" onClose={() => setSheet(null)}>
          {TONES.map(([value, label, desc]) => (
            <Option key={value} label={label} desc={desc} selected={form.tone === value} onClick={() => { setForm({ ...form, tone: value }); setSheet(null); }} />
          ))}
        </Sheet>
      )}
      {sheet && sheet !== "tone" && (
        <Sheet title={TRAITS.find((t) => t[0] === sheet)?.[1] ?? ""} onClose={() => setSheet(null)}>
          {(["less", "default", "more"] as const).map((v) => (
            <Option key={v} label={cap(v)} selected={(form.traits[sheet] ?? "default") === v} onClick={() => { setTrait({ [sheet]: v }); setSheet(null); }} />
          ))}
        </Sheet>
      )}
    </>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => { e.preventDefault(); onChange(!checked); }}
      className={cn("flex h-7 w-12 shrink-0 items-center overflow-hidden rounded-full p-0.5 transition-colors duration-300", checked ? "justify-end bg-primary" : "justify-start bg-foreground/20")}
    >
      <span className="block size-6 shrink-0 rounded-full bg-foreground shadow transition-all duration-300 ease-out" />
    </button>
  );
}

function MemoryView({ title, onBack, initial, onSaved }: { title: string; onBack: () => void; initial: { memory_enabled: boolean; display_name: string; occupation: string; more: string }; onSaved: () => void }) {
  const [form, setForm] = useState(initial);
  const m = useSave(onSaved, onBack);
  const submit = () => m.mutate({
    memory_enabled: form.memory_enabled,
    display_name: form.display_name,
    about_you: (form.occupation.trim() ? `Occupation: ${form.occupation.trim()}\n` : "") + form.more,
  });
  return (
    <>
      <SubHeader title={title} onBack={onBack} onSave={submit} saving={m.isPending} />
      <label className="flex items-center gap-4 rounded-2xl bg-secondary px-4 py-3.5">
        <span className="flex-1">
          <span className="block text-[15px]">Enable memory</span>
          <span className="block text-xs text-muted-foreground">Let Aurora use the details below to personalize its answers. It only knows what you write here.</span>
        </span>
        <Toggle checked={form.memory_enabled} onChange={(v) => setForm({ ...form, memory_enabled: v })} />
      </label>
      <p className="mt-5 px-1 pb-2 text-sm">Your nickname</p>
      <input className={field} placeholder="Name" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
      <p className="mt-5 px-1 pb-2 text-sm">Your occupation</p>
      <input className={field} placeholder="Engineer, student, etc." value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
      <p className="mt-5 px-1 pb-2 text-sm">More about you</p>
      <textarea rows={4} className={cn(field, "resize-none")} placeholder="Interests, values, or preferences to keep in mind" value={form.more} onChange={(e) => setForm({ ...form, more: e.target.value })} />
    </>
  );
}

function ProfileView({ onBack, initial, avatar, onSaved }: { title: string; onBack: () => void; initial: string; avatar: string | null; onSaved: () => void }) {
  const [name, setName] = useState(initial);
  const [preview, setPreview] = useState<string | null>(avatar);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const m = useSave(onSaved, onBack);
  const initials = name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const pick = (f: File | undefined) => {
    setErr("");
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErr("Please choose an image.");
    if (f.size > 5 * 1024 * 1024) return setErr("Image must be under 5 MB.");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  const submit = async () => {
    setErr("");
    let avatar_url: string | undefined;
    if (file) {
      setUploading(true);
      const { data: u } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${u.user?.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      setUploading(false);
      if (error) return setErr("Upload failed. Try again.");
      avatar_url = path;
    }
    m.mutate({ display_name: name.trim(), ...(avatar_url ? { avatar_url } : {}) });
  };
  const busy = m.isPending || uploading;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" aria-label="Close" onClick={onBack} className="absolute inset-0 animate-in fade-in bg-background/50 duration-200" />
      <div className="relative max-h-[92dvh] w-full max-w-xl animate-in slide-in-from-bottom overflow-y-auto rounded-t-[2rem] border-t border-border/60 bg-popover px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-3 shadow-2xl duration-300 ease-out">
        <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-muted-foreground/40" />
        <label className="relative mx-auto block size-28 cursor-pointer">
          <span className="grid size-full place-items-center overflow-hidden rounded-full bg-primary text-5xl font-medium text-primary-foreground">
            {preview ? <img src={preview} alt="Profile" className="size-full object-cover" /> : initials}
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 grid size-9 place-items-center rounded-full border-2 border-popover bg-background text-foreground">
            <Camera className="size-4" />
          </span>
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {err && <p className="mt-3 text-center text-sm text-destructive">{err}</p>}
        <p className="mt-6 px-4 pb-2 text-sm text-muted-foreground">Name</p>
        <input className="w-full rounded-full border border-border bg-transparent px-5 py-3.5 text-[17px] outline-none focus:ring-2 focus:ring-ring" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        <p className="mt-5 text-center text-sm text-muted-foreground">Your profile helps Aurora know what to call you.</p>
        <div className="mt-5 flex flex-col items-center gap-2">
          <button type="button" disabled={busy || !name.trim()} onClick={() => void submit()} className="rounded-full bg-foreground px-10 py-3.5 text-base font-semibold text-background disabled:opacity-60">
            {busy ? "Saving…" : "Save profile"}
          </button>
          <button type="button" onClick={onBack} className="py-2 text-base">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function PluginsView({ library, openLibrary }: { library: boolean; openLibrary: () => void }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const fetchPlugins = useServerFn(listPlugins);
  const connect = useServerFn(connectPlugin);
  const disconnect = useServerFn(disconnectPlugin);
  const refresh = useServerFn(refreshPlugin);
  const plugins = useQuery({ queryKey: ["plugins"], queryFn: () => fetchPlugins({}) });

  const connections = useMemo(() => new Map((plugins.data?.connections ?? []).map((c) => [c.toolkit_slug, c])), [plugins.data]);

  const list = useMemo(() => {
    let items = plugins.data?.catalog ?? [];
    if (!library) items = items.filter((t) => connections.has(t.slug));
    const q = search.trim().toLowerCase();
    if (q) items = items.filter((t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q) || t.categories.some((c) => c.toLowerCase().includes(q)));
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }, [plugins.data, search, connections, library]);

  async function handleConnect(slug: string, name: string) {
    setBusy(slug);
    try {
      const result = await connect({ data: { toolkitSlug: slug, toolkitName: name, callbackUrl: `${window.location.origin}/settings` } });
      if (result.redirectUrl) {
        toast.info(`Taking you to ${name} to finish connecting…`);
        window.location.assign(result.redirectUrl);
        return;
      }
      toast.success(`${name} connected`);
      await qc.invalidateQueries({ queryKey: ["plugins"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not connect ${name}`);
    } finally {
      setBusy(null);
    }
  }

  if (plugins.isLoading) {
    return <div className="grid h-40 place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  }

  if (library) {
    const catalog = plugins.data?.catalog ?? [];
    const installed = catalog.filter((t) => connections.has(t.slug));
    const q = search.trim();
    const POPULAR = ["gmail", "googledrive", "github", "outlook", "slack", "notion", "googlecalendar", "linear"];
    const bySlug = new Map(catalog.map((t) => [t.slug, t]));
    const popular = POPULAR.map((s) => bySlug.get(s)).filter(Boolean) as typeof catalog;
    const groups = new Map<string, typeof catalog>();
    for (const t of [...catalog].sort((a, b) => a.name.localeCompare(b.name))) {
      const c = t.categories[0];
      if (!c) continue;
      if (!groups.has(c)) groups.set(c, []);
      groups.get(c)!.push(t);
    }
    const sections: [string, typeof catalog][] = q
      ? [["Results", list]]
      : [["Popular", popular.length ? popular : catalog.slice(0, 5)], ...[...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([c, items]) => [c.replace(/\b\w/g, (m) => m.toUpperCase()), items.slice(0, 5)] as [string, typeof catalog])];

    const Logo = ({ t, size = "size-14" }: { t: (typeof catalog)[number]; size?: string }) =>
      t.logo ? (
        <img src={t.logo} alt="" className={cn(size, "shrink-0 rounded-2xl border border-border/60 bg-secondary object-contain p-2.5")} />
      ) : (
        <div className={cn(size, "grid shrink-0 place-items-center rounded-2xl border border-border/60 bg-secondary")}><Plug className="size-5 text-muted-foreground" /></div>
      );

    return (
      <div className="pb-28">
        {!q && installed.length > 0 && (
          <section className="mb-8">
            <h3 className="mb-3 flex items-center gap-1 px-1 text-lg font-semibold text-muted-foreground">Installed <ChevronRight className="size-4" /></h3>
            <div className="flex gap-3">
              {installed.slice(0, 5).map((t) => <Logo key={t.slug} t={t} />)}
              {installed.length > 5 && (
                <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-secondary text-lg font-medium">+{installed.length - 5}</div>
              )}
            </div>
          </section>
        )}
        {sections.map(([title, items]) => items.length > 0 && (
          <section key={title} className="mb-8">
            <h3 className="mb-2 flex items-center gap-1 px-1 text-lg font-semibold text-muted-foreground">{title} <ChevronRight className="size-4" /></h3>
            <div>
              {items.slice(0, q ? 100 : 5).map((t) => {
                const conn = connections.get(t.slug);
                return (
                  <div key={t.slug} className="flex items-center gap-4 py-2.5">
                    <Logo t={t} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[17px]">{t.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{conn ? (conn.status === "ACTIVE" ? "Connected" : "Waiting to finish") : t.description || `@${t.slug}`}</p>
                    </div>
                    {conn ? (
                      <Check className="size-5 shrink-0 text-muted-foreground" />
                    ) : (
                      <button type="button" aria-label={`Add ${t.name}`} disabled={busy === t.slug} onClick={() => handleConnect(t.slug, t.name)} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-secondary disabled:opacity-50">
                        {busy === t.slug ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-6 font-light" strokeWidth={1.5} />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        {q && list.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No apps match your search.</p>}
        <div className="fixed inset-x-0 bottom-5 z-20 mx-auto flex w-[calc(100%-2.5rem)] max-w-md items-center gap-3 rounded-full border border-border/60 bg-secondary/80 px-5 py-3.5 shadow-lg backdrop-blur-xl">
          <Search className="size-5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search plugins" className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground" />
          {search && <button type="button" aria-label="Clear" onClick={() => setSearch("")}><X className="size-4 text-muted-foreground" /></button>}
        </div>
      </div>
    );
  }

  return (
    <div>
      {!library && (
        <button type="button" onClick={openLibrary} className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-foreground px-4 py-3.5 text-left text-background">
          <Plug className="size-5" />
          <span className="flex-1 text-[15px] font-medium">Plugins library</span>
          <span className="text-xs opacity-70">{plugins.data?.catalog.length ?? 0} apps</span>
          <ChevronRight className="size-4" />
        </button>
      )}
      {(library || list.length > 0) && (
        <div className="flex items-center gap-3 rounded-full bg-secondary px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={library ? `Search ${plugins.data?.catalog.length ?? 0} apps…` : "Search your plugins…"} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </div>
      )}
      {!library && <p className="mt-5 px-1 pb-2 text-sm text-muted-foreground">Added plugins</p>}
      {list.length === 0 ? (
        <p className="rounded-2xl bg-secondary px-4 py-6 text-center text-sm text-muted-foreground">
          {library ? "No apps match your search." : "You haven't added any plugins yet. Open the Plugins library to add one."}
        </p>
      ) : (
        <div className={cn("divide-y divide-border/60 overflow-hidden rounded-2xl bg-secondary", library && "mt-4")}>
          {list.slice(0, 300).map((t) => {
            const conn = connections.get(t.slug);
            const active = conn?.status === "ACTIVE";
            return (
              <div key={t.slug} className="flex items-center gap-3 px-4 py-3">
                {t.logo ? (
                  <img src={t.logo} alt="" className="size-10 rounded-xl bg-foreground/5 object-contain p-1.5" />
                ) : (
                  <div className="grid size-10 place-items-center rounded-xl bg-foreground/5"><Plug className="size-4 text-muted-foreground" /></div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{t.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{active ? "Connected" : conn ? "Waiting to finish" : t.description || `@${t.slug}`}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {conn && !active && (
                    <button type="button" onClick={async () => { const { status } = await refresh({ data: { toolkitSlug: t.slug } }); await qc.invalidateQueries({ queryKey: ["plugins"] }); toast.info(`Status: ${status}`); }} className="rounded-full bg-foreground/5 px-3 py-1.5 text-xs hover:bg-foreground/10">Check</button>
                  )}
                  {conn ? (
                    <button type="button" aria-label={`Remove ${t.name}`} disabled={busy === t.slug} onClick={async () => { setBusy(t.slug); await disconnect({ data: { toolkitSlug: t.slug } }); await qc.invalidateQueries({ queryKey: ["plugins"] }); setBusy(null); }} className="grid size-8 place-items-center rounded-full bg-foreground/5 text-muted-foreground hover:text-foreground">
                      <Trash2 className="size-3.5" />
                    </button>
                  ) : (
                    <button type="button" disabled={busy === t.slug} onClick={() => handleConnect(t.slug, t.name)} className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background disabled:opacity-60">
                      {busy === t.slug ? "Opening…" : "Add"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
