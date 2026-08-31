import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ShieldCheck,
  Lock,
  Mail,
  Loader2,
  KeyRound,
  Sparkles,
  ArrowRight,
  Server,
  Building2,
  Zap,
} from "lucide-react";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@kitchenpilot.in");
  const [password, setPassword] = useState("kitchenpilot123");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "SuperAdmin Portal · KitchenPilot AI";
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        // Check if user is super admin
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .then(({ data: roles }) => {
            const hasAdmin = roles?.some((r) => r.role === "super_admin") || data.user.email === "admin@kitchenpilot.in";
            if (hasAdmin) {
              navigate("/admin/dashboard", { replace: true });
            }
          });
      }
    });
  }, [navigate]);

  async function handleAdminLogin(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Verify SuperAdmin role
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      const isSuperAdmin =
        roles?.some((r) => r.role === "super_admin") ||
        data.user.email === "admin@kitchenpilot.in";

      if (!isSuperAdmin) {
        // Sign out if not an admin
        await supabase.auth.signOut();
        toast.error("Access Denied: This portal is restricted to SuperAdmins only.");
        return;
      }

      toast.success("Authenticated as SuperAdmin! Welcome back.");
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  function fillCredentials() {
    setEmail("admin@kitchenpilot.in");
    setPassword("kitchenpilot123");
    toast.info("SuperAdmin credentials filled!");
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-center items-center overflow-hidden bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white p-4">
      {/* Background ambient lighting effects */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent blur-3xl opacity-70" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 w-[500px] h-[400px] bg-gradient-to-tr from-cyan-600/20 to-transparent blur-3xl opacity-50" />

      {/* Grid line background overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Portal Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-indigo-600/10 to-purple-600/20 border border-indigo-500/30 shadow-lg shadow-indigo-500/10 mb-4 backdrop-blur-xl">
            <ShieldCheck className="h-8 w-8 text-indigo-400" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800/60">
              Executive Console
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            KitchenPilot <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">SuperAdmin</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Centralized multi-tenant hotel management & feature provisioning
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-7 md:p-8 backdrop-blur-2xl shadow-2xl shadow-black/60">
          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Admin Identifier / Email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@kitchenpilot.in"
                  required
                  className="h-11 rounded-xl border-slate-800 bg-slate-950/70 pl-10 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-pass" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Master Password
                </Label>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="admin-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="h-11 rounded-xl border-slate-800 bg-slate-950/70 pl-10 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Quick Fill Helper */}
            <div className="flex items-center justify-between rounded-xl bg-indigo-950/40 border border-indigo-800/40 p-3">
              <div className="flex items-center gap-2 text-xs text-indigo-300">
                <KeyRound className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>Default: <code className="font-mono text-indigo-200">admin@kitchenpilot.in</code></span>
              </div>
              <button
                type="button"
                onClick={fillCredentials}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline shrink-0"
              >
                Auto-fill
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/25 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying Credentials...
                </>
              ) : (
                <>
                  Enter Admin Console <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Quick links footer */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <Link
              to="/auth"
              className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors"
            >
              <Building2 className="h-3.5 w-3.5" /> Restaurant Sign-in
            </Link>
            <span className="flex items-center gap-1 text-slate-500">
              <Server className="h-3 w-3 text-emerald-400" /> Platform Online
            </span>
          </div>
        </div>

        {/* Security Notice */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Protected by end-to-end Supabase RLS security policies and token authentication.
        </p>
      </div>
    </div>
  );
}
