import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Minus, X } from "lucide-react";
import { toast } from "sonner";
import { useCredits } from "@/lib/credits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/upgrade")({
  head: () => ({
    meta: [
      { title: "Aurora plans — Free, Plus and Pro" },
      { name: "description", content: "Compare Aurora Free, Plus and Pro plans and daily credits." },
      { property: "og:title", content: "Aurora plans — Free, Plus and Pro" },
      { property: "og:description", content: "Get more daily credits, advanced models and longer memory." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UpgradePage,
});

type PlanId = "plus" | "pro";

const PLANS: Record<PlanId, { name: string; price: string; tagline: string; credits: string; features: string[] }> = {
  plus: {
    name: "Plus",
    price: "€10",
    tagline: "Keep chatting with expanded access",
    credits: "50 credits every day",
    features: ["Core model", "More messages", "More uploads", "More image creation", "Longer memory"],
  },
  pro: {
    name: "Pro",
    price: "€30",
    tagline: "Do more with advanced intelligence",
    credits: "200 credits every day",
    features: ["Core model", "Advanced models", "More messages and uploads", "Advanced image creation", "Expanded memory", "Deep research", "Early access to new features"],
  },
};

function UpgradePage() {
  const [tab, setTab] = useState<PlanId>("plus");
  const plan = PLANS[tab];
  const credits = useCredits();

  return (
    <div className="min-h-dvh bg-background pb-10">
      <div className="mx-auto flex w-full max-w-md flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="flex justify-end">
          <Link to="/settings" aria-label="Close" className="grid size-10 place-items-center rounded-full bg-secondary">
            <X className="size-5" />
          </Link>
        </div>
        <h1 className="mt-4 text-center text-4xl font-semibold tracking-tight">Get Aurora {plan.name}</h1>
        <p className="mt-3 text-center text-muted-foreground">{plan.tagline}</p>

        <div className="mt-7 grid grid-cols-2 rounded-full bg-secondary p-1">
          {(Object.keys(PLANS) as PlanId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn("rounded-full py-2.5 text-sm font-medium transition-colors", tab === id ? "bg-background text-foreground" : "text-muted-foreground")}
            >
              {PLANS[id].name}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-3xl border border-border p-5">
          <div className="flex items-center pb-3 text-sm">
            <span className="flex-1 text-muted-foreground">Features</span>
            <span className="w-14 text-center text-muted-foreground">Free</span>
            <span className="w-14 text-center font-medium text-primary">{plan.name}</span>
          </div>
          <FeatureRow label="Daily credits" free="5" paid={tab === "plus" ? "50" : "200"} />
          {plan.features.map((f, i) => (
            <FeatureRow key={f} label={f} free={i === 0} paid />
          ))}
        </div>

        <button
          type="button"
          onClick={() => toast("Payments are being set up — test checkout will be available soon.")}
          className="mt-6 rounded-full bg-foreground py-4 text-base font-semibold text-background"
        >
          Upgrade for {plan.price}/month
        </button>
        <p className="mt-3 text-center text-sm text-muted-foreground">Auto-renews monthly. Cancel anytime.</p>

        <div className="mt-8 rounded-3xl bg-secondary p-5 text-sm">
          <p className="font-medium">
            {credits.data ? `You're on ${credits.data.plan[0]?.toUpperCase()}${credits.data.plan.slice(1)} · ${Math.round(Number(credits.data.balance) * 100) / 100} of ${Number(credits.data.allowance)} credits left today` : "Your credits"}
          </p>
          <p className="mt-3 text-muted-foreground">How credits are used:</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>Quick reply — 1 credit</li>
            <li>Smart reply — 2 credits</li>
            <li>Each app or tool action (Gmail, search…) — +0.5 credit</li>
            <li>Creating an image — +3 credits</li>
          </ul>
          <p className="mt-3 text-muted-foreground">Credits refill every day at midnight (UTC).</p>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ label, free, paid }: { label: string; free: boolean | string; paid: boolean | string }) {
  const cell = (v: boolean | string, accent: boolean) =>
    typeof v === "string" ? (
      <span className={cn("w-14 text-center text-sm", accent && "font-medium text-primary")}>{v}</span>
    ) : (
      <span className="grid w-14 place-items-center">
        {v ? <Check className={cn("size-5", accent ? "text-primary" : "text-muted-foreground")} /> : <Minus className="size-5 text-muted-foreground" />}
      </span>
    );
  return (
    <div className="flex items-center py-3">
      <span className="flex-1 pr-2 text-[15px]">{label}</span>
      {cell(free, false)}
      {cell(paid, true)}
    </div>
  );
}
