import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import AnimatedGradientBackground from "@/components/ui/animated-gradient-background";
import SoftBlurIn from "@/components/smoothui/soft-blur-in";
import BlurOutUp from "@/components/smoothui/blur-out-up";
import ShineText from "@/components/smoothui/shine-text";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aurora — your all-in-one AI assistant" },
      {
        name: "description",
        content:
          "Aurora is an all-in-one chatbot that manages your calendar, email and hundreds of other apps through natural conversation.",
      },
      { property: "og:title", content: "Aurora — your all-in-one AI assistant" },
      {
        property: "og:description",
        content:
          "Chat with Aurora to run your calendar, inbox and favourite apps in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/chat" });
    });
  }, [navigate]);

  useEffect(() => {
    if (beat !== 0) return;
    const t = setTimeout(() => setBeat(1), 4000);
    return () => clearTimeout(t);
  }, [beat]);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-background">
      <AnimatedGradientBackground Breathing breathingRange={9} />
      <div className="pointer-events-none absolute inset-0 aurora-veil" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        {beat === 0 ? (
          <>
            <SoftBlurIn className="text-5xl font-semibold tracking-tight text-foreground md:text-7xl">
              Meet Aurora
            </SoftBlurIn>
            <p className="mt-5 max-w-md text-base text-muted-foreground md:text-lg">
              <ShineText duration={3}>Your calm, capable assistant.</ShineText>
            </p>
          </>
        ) : (
          <>
            <BlurOutUp
              className="block max-w-2xl text-2xl font-medium leading-snug tracking-tight text-foreground md:text-4xl"
              stagger={38}
            >
              Aurora is an all-in-one chatbot that helps you manage your
              calendar, email and many more…
            </BlurOutUp>
            <p className="mt-6 max-w-md text-sm text-muted-foreground md:text-base">
              Connect the apps you already use and just ask.
            </p>
          </>
        )}

        <button
          type="button"
          onClick={() => navigate({ to: "/onboarding" })}
          className="group mt-10 inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-3 text-sm font-medium text-background shadow-lg shadow-black/30 transition-transform hover:scale-[1.03] active:scale-95"
        >
          Get started
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
      <nav className="absolute inset-x-0 bottom-[max(env(safe-area-inset-bottom),1rem)] z-10 flex justify-center gap-4 text-[11px] text-muted-foreground">
        <Link to="/legal/$slug" params={{ slug: "terms" }} className="hover:text-foreground">Terms</Link>
        <Link to="/legal/$slug" params={{ slug: "privacy" }} className="hover:text-foreground">Privacy</Link>
        <Link to="/legal" className="hover:text-foreground">Legal</Link>
      </nav>
    </main>
  );
}
