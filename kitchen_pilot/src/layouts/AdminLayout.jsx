import { useEffect, useState } from "react";
import { Outlet, Navigate, useLocation, Link, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  LayoutDashboard,
  Building2,
  Users,
  ScrollText,
  Sliders,
  LogOut,
  ChevronRight,
  ExternalLink,
  Loader2,
  Sparkles,
  Server,
  Bell,
  Search,
  Store,
  Menu as MenuIcon,
  X
} from "lucide-react";
import { toast } from "sonner";

const NAV_ITEMS = [
  {
    label: "Overview",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    label: "Hotels & Provisioning",
    path: "/admin/hotels",
    icon: Building2,
    badge: "Core",
  },
  {
    label: "Platform Users",
    path: "/admin/users",
    icon: Users,
    badge: null,
  },
  {
    label: "Audit Logs",
    path: "/admin/audit",
    icon: ScrollText,
    badge: null,
  },
  {
    label: "Global Settings",
    path: "/admin/settings",
    icon: Sliders,
    badge: null,
  },
];

export function AdminLayout() {
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    async function checkAdminAuth() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          setAuthLoading(false);
          return;
        }

        setUser(currentUser);

        // Fetch user roles
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", currentUser.id);

        const hasAdminRole =
          roles?.some((r) => r.role === "super_admin") ||
          currentUser.email === "admin@kitchenpilot.in";

        setIsSuperAdmin(hasAdminRole);
      } catch (err) {
        console.error("Failed to verify admin status:", err);
      } finally {
        setAuthLoading(false);
      }
    }

    checkAdminAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session?.user) {
        setUser(null);
        setIsSuperAdmin(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Signed out of SuperAdmin Console");
    navigate("/admin/login", { replace: true });
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-950 text-slate-100 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm text-slate-400 font-medium">Verifying SuperAdmin privileges...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col justify-between border-r border-slate-800/80 bg-slate-950/95 backdrop-blur-xl shrink-0 p-4 sticky top-0 h-screen z-30">
        <div className="flex flex-col gap-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-md shadow-indigo-500/20 text-white font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-base tracking-tight">KitchenPilot</span>
                <span className="rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-500/30">
                  ROOT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Multi-Hotel Admin</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Management
            </div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/80"
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded bg-indigo-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-700/50">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Area */}
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-800/80">
          {/* Switch to Restaurant Portal */}
          <Link
            to="/dashboard"
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition-all group"
          >
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-emerald-400" />
              <span>Restaurant App</span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {/* User Profile & Sign Out */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                SA
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">Super Admin</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 min-h-screen bg-slate-950">
        {/* TopBar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 md:px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>

            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
                Supabase Node · Online
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/hotels"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <Building2 className="h-3.5 w-3.5" />
              Manage Hotels
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="h-7 w-7 rounded-full bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                ⚡
              </div>
              <span className="text-xs font-medium text-slate-400 hidden md:inline">
                {user?.email}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm">
            <div className="fixed inset-y-0 left-0 w-64 bg-slate-950 border-r border-slate-800 p-4 flex flex-col justify-between">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-indigo-400" />
                    <span className="font-bold text-white">SuperAdmin</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="flex flex-col gap-1">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                            isActive
                              ? "bg-indigo-600 text-white font-semibold"
                              : "text-slate-400 hover:bg-slate-900 hover:text-white"
                          }`
                        }
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t border-slate-800">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white rounded-lg bg-slate-900"
                >
                  <Store className="h-4 w-4 text-emerald-400" />
                  <span>Restaurant Dashboard</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content Outlet */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ user, isSuperAdmin }} />
        </main>
      </div>
    </div>
  );
}
