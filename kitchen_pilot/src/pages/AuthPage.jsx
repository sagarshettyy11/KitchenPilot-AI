import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo } from "@/components/site/Logo";
import { Loader2, Mail, Lock, User } from "lucide-react";
import hero from "@/assets/hero.jpg";

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    document.title = "Sign in · KitchenPilot";
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate("/dashboard", { replace: true });
    });
  }, [navigate]);

  async function handleEmailAuth(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
        });
        if (error) throw error;
        toast.success("Account created — welcome to KitchenPilot!");
        navigate("/dashboard", { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setOauthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setOauthLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-between p-6 md:p-10">
        <div>
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {mode === "signin" ? "Welcome back" : "Create your restaurant"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to your KitchenPilot dashboard."
              : "Set up your restaurant in under 2 minutes."}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full rounded-xl h-11"
            onClick={handleGoogle}
            disabled={oauthLoading || loading}
          >
            {oauthLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </Button>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or continue with email{" "}
            <div className="h-px flex-1 bg-border" />
          </div>
          <form className="space-y-4" onSubmit={handleEmailAuth}>
            {mode === "signup" && (
              <div>
                <Label htmlFor="name" className="text-xs font-medium">
                  Full name
                </Label>
                <div className="relative mt-1">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Alex Chen"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="pl-9 rounded-xl h-11"
                  />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-xs font-medium">
                Email
              </Label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-9 rounded-xl h-11"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password" className="text-xs font-medium">
                Password
              </Label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-9 rounded-xl h-11"
                />
              </div>
            </div>
            <Button type="submit" className="h-11 w-full rounded-xl" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to KitchenPilot?" : "Already have an account?"}{" "}
            <button
              className="font-semibold text-brand hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
        <div className="text-center text-xs text-muted-foreground">
          By continuing you agree to our Terms and Privacy Policy.
        </div>
      </div>
      <div className="relative hidden overflow-hidden lg:block bg-mesh">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-accent-teal/10" />
        <div className="relative flex h-full flex-col justify-center p-12">
          <div className="glass rounded-2xl p-6 shadow-elevated">
            <div className="text-xs font-semibold uppercase tracking-widest text-brand">
              The AI Restaurant OS
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Every service, smarter than the last.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Live analytics, AI copilot, kitchen display, and inventory — all in one login.
            </p>
          </div>
          <div className="mt-8 overflow-hidden rounded-2xl border border-border/60 shadow-elevated">
            <img
              src={hero}
              alt="Dashboard preview"
              width={1600}
              height={1024}
              className="w-full"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.5 14.7 2.5 12 2.5 6.7 2.5 2.5 6.7 2.5 12S6.7 21.5 12 21.5c6.9 0 9.5-4.8 9.5-9.3 0-.7-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
