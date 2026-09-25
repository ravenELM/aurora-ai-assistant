import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ComponentType } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import {
  SiTiktok,
  SiInstagram,
  SiYoutube,
  SiX,
  SiReddit,
  SiGoogle,
  SiFacebook,
  SiProducthunt,
} from "react-icons/si";
import { FaLinkedin } from "react-icons/fa";
import AnimatedGradientBackground from "@/components/ui/animated-gradient-background";
import BlurOutUp from "@/components/smoothui/blur-out-up";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started with Aurora" },
      {
        name: "description",
        content:
          "A quick tour of what Aurora can do: chat, connect your apps, and remember what matters to you.",
      },
      { property: "og:title", content: "Get started with Aurora" },
      {
        property: "og:description",
        content: "A quick tour of Aurora before you create your account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

type Option = { label: string; logo?: ComponentType<{ className?: string }> };
type Step =
  | { kind: "intro"; title: string; body: string }
  | { kind: "question"; id: string; title: string; body: string; multi?: boolean; options: Option[] };

const STEPS: Step[] = [
  { kind: "intro", title: "Ask Aurora anything", body: "Write, plan, research, generate images — one conversation for everything you're working on." },
  { kind: "intro", title: "Connect your apps", body: "Calendar, Gmail, Notion, Slack, Linear and hundreds more. Aurora acts inside them for you." },
  { kind: "intro", title: "It remembers you", body: "Aurora keeps the details that matter — your tone, your projects, your preferences. You stay in control." },
  { kind: "intro", title: "Make it yours", body: "Custom instructions, plugins and slash commands shape Aurora around the way you work." },
  {
    kind: "question", id: "role", title: "What's your role?", body: "So Aurora can speak your language.",
    options: [
      { label: "Founder" }, { label: "Developer" }, { label: "Designer" }, { label: "Marketer" },
      { label: "Student" }, { label: "Creator" }, { label: "Other" },
    ],
  },
  {
    kind: "question", id: "source", title: "Where did you hear about us?", body: "Pick the one that brought you here.",
    options: [
      { label: "TikTok", logo: SiTiktok }, { label: "Instagram", logo: SiInstagram },
      { label: "YouTube", logo: SiYoutube }, { label: "X", logo: SiX },
      { label: "LinkedIn", logo: FaLinkedin }, { label: "Reddit", logo: SiReddit },
      { label: "Facebook", logo: SiFacebook }, { label: "Product Hunt", logo: SiProducthunt },
      { label: "Google", logo: SiGoogle }, { label: "A friend" },
    ],
  },
  {
    kind: "question", id: "use", title: "What will you use Aurora for?", body: "Choose all that apply.", multi: true,
    options: [
      { label: "Writing" }, { label: "Research" }, { label: "Coding" }, { label: "Images" },
      { label: "Email & calendar" }, { label: "Planning" }, { label: "Learning" },
    ],
  },
  {
    kind: "question", id: "team", title: "How big is your team?", body: "Just you, or a crew?",
    options: [{ label: "Just me" }, { label: "2–10" }, { label: "11–50" }, { label: "51–200" }, { label: "200+" }],
  },
  {
    kind: "question", id: "experience", title: "How often do you use AI?", body: "No wrong answers.",
    options: [{ label: "Never tried it" }, { label: "Now and then" }, { label: "Weekly" }, { label: "Every day" }],
  },
  {
    kind: "question", id: "tone", title: "How should Aurora talk?", body: "You can change this later.",
    options: [{ label: "Short and direct" }, { label: "Friendly" }, { label: "Detailed" }, { label: "Playful" }],
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;
  const selected = current.kind === "question" ? answers[current.id] ?? [] : [];
  const canContinue = current.kind === "intro" || selected.length > 0;

  const finish = () => {
    try {
      localStorage.setItem("aurora-onboarding", JSON.stringify(answers));
    } catch {}
    navigate({ to: "/auth" });
  };

  const toggle = (label: string) => {
    if (current.kind !== "question") return;
    setAnswers((a) => {
      const prev = a[current.id] ?? [];
      const next = current.multi
        ? prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
        : [label];
      return { ...a, [current.id]: next };
    });
  };

  return (
    <main className="relative h-screen w-full overflow-hidden bg-background">
      <AnimatedGradientBackground Breathing startingGap={135} topOffset={10} />
      <div className="pointer-events-none absolute inset-0 aurora-veil" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            <BlurOutUp key={`t${step}`}>{current.title}</BlurOutUp>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            <BlurOutUp key={`b${step}`} stagger={16}>
              {current.body}
            </BlurOutUp>
          </p>

          {current.kind === "question" && (
            <div
              key={current.id}
              className="mt-6 grid max-h-[45vh] auto-rows-fr grid-cols-2 gap-2 overflow-y-auto"
            >
              {current.options.map((o, i) => {
                const on = selected.includes(o.label);
                const Logo = o.logo;
                const oddOneOut =
                  current.options.length % 2 === 1 && i === current.options.length - 1;
                return (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => toggle(o.label)}
                    className={cn(
                      "col-span-1 flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm transition-all active:scale-95",
                      oddOneOut && "col-span-2",
                      on
                        ? "border-foreground bg-foreground text-background"
                        : "border-foreground/15 bg-foreground/5 text-foreground hover:bg-foreground/10",
                    )}
                  >
                    {Logo && <Logo className="size-4 shrink-0" />}
                    <span className="truncate">{o.label}</span>
                    {on && current.multi && <Check className="size-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-8 flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-6 bg-foreground" : "w-1.5 bg-foreground/25",
                )}
              />
            ))}
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="inline-flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-30"
              aria-label="Back"
            >
              <ArrowLeft className="size-4" />
            </button>
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
              className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40"
            >
              {isLast ? "Create your account" : "Next"}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={finish}
          className="mt-6 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Skip
        </button>
      </div>
    </main>
  );
}
