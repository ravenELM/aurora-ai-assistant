import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import AnimatedGradientBackground from "@/components/ui/animated-gradient-background";
import SoftBlurIn from "@/components/smoothui/soft-blur-in";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to Aurora" },
      {
        name: "description",
        content:
          "Sign in or create your Aurora account with Google, Apple or email to start chatting and connecting your apps.",
      },
      { property: "og:title", content: "Sign in to Aurora" },
      {
        property: "og:description",
        content: "Create your Aurora account and start chatting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/chat" });
    });
  }, [navigate]);

  async function handleOAuth(provider: "google" | "apple") {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error(
        provider === "apple"
          ? "Apple sign-in failed. Please try again."
          : "Google sign-in failed. Please try again.",
      );
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/chat" });
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          return;
        }
        navigate({ to: "/chat" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate({ to: "/chat" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background">
      <AnimatedGradientBackground startingGap={140} topOffset={20} />
      <div className="pointer-events-none absolute inset-0 aurora-veil" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            <SoftBlurIn key={`h-${mode}`}>
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </SoftBlurIn>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <SoftBlurIn key={`s-${mode}`} stagger={10} delay={80}>
              {mode === "signup"
                ? "Aurora is ready when you are."
                : "Sign in to pick up where you left off."}
            </SoftBlurIn>
          </p>

          {sent ? (
            <div className="mt-6 rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">
              Check <span className="text-foreground">{email}</span> for a
              confirmation link, then come back and sign in.
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={busy}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              >
                <GoogleMark />
                Continue with Google
              </button>

              <button
                type="button"
                onClick={() => handleOAuth("apple")}
                disabled={busy}
                className="mt-3 flex w-full items-center justify-center gap-3 rounded-full bg-secondary px-5 py-3 text-sm font-medium text-secondary-foreground transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              >
                <AppleMark />
                Continue with Apple
              </button>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  or
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              {!emailOpen && (
                <button
                  type="button"
                  onClick={() => setEmailOpen(true)}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-3 rounded-full bg-secondary px-5 py-3 text-sm font-medium text-secondary-foreground transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                >
                  <Mail className="size-4" />
                  Continue with email
                </button>
              )}

              <div
                className={cn(
                  "grid transition-all duration-300 ease-out",
                  emailOpen
                    ? "mt-3 grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">
                  <form onSubmit={handleEmail}>
                  <motion.div
                    key={`f-${mode}`}
                    initial={{ opacity: 0, filter: "blur(6px)", y: 8 }}
                    animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-3"
                  >
                    <div
                      className={cn(
                        "grid transition-all duration-300 ease-out",
                        mode === "signup"
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <div className="overflow-hidden">
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          autoComplete="name"
                          tabIndex={mode === "signup" ? 0 : -1}
                          className="w-full rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      autoComplete="email"
                      className="w-full rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      autoComplete={
                        mode === "signup" ? "new-password" : "current-password"
                      }
                      className="w-full rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                    >
                      {busy && <Loader2 className="size-4 animate-spin" />}
                      {mode === "signup" ? "Create account" : "Sign in"}
                    </button>
                  </motion.div>
                  </form>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="mt-5 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                {mode === "signup"
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
      />
    </svg>
  );
}
