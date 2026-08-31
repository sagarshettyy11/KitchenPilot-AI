import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  TrendingUp,
  Plus,
  ArrowUpRight,
  Layers,
  Zap,
  Server,
  Utensils,
  Cpu,
  Bot,
  Activity,
  Sliders,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminDashboardPage() {
  const navigate = useNavigate();

  // Fetch all restaurants
  const { data: restaurants = [], isLoading: hotelsLoading, refetch } = useQuery({
    queryKey: ["admin-all-restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch user roles count
  const { data: usersCount = 0 } = useQuery({
    queryKey: ["admin-users-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true });
      if (error) return 0;
      return count ?? 0;
    },
  });

  // Calculate statistics
  const totalHotels = restaurants.length;
  const activeHotels = restaurants.filter((r) => r.status === "active" || !r.status).length;
  const trialHotels = restaurants.filter((r) => r.status === "trial").length;
  const suspendedHotels = restaurants.filter((r) => r.status === "suspended").length;

  const enterpriseCount = restaurants.filter((r) => r.plan_tier === "enterprise").length;
  const proCount = restaurants.filter((r) => r.plan_tier === "pro" || !r.plan_tier).length;
  const starterCount = restaurants.filter((r) => r.plan_tier === "starter").length;

  // Module adoption stats
  const moduleStats = {
    pos: restaurants.filter((r) => (r.enabled_modules || []).includes("pos")).length,
    kitchen: restaurants.filter((r) => (r.enabled_modules || []).includes("kitchen")).length,
    ai: restaurants.filter((r) => (r.enabled_modules || []).includes("ai")).length,
    inventory: restaurants.filter((r) => (r.enabled_modules || []).includes("inventory")).length,
    integrations: restaurants.filter((r) => (r.enabled_modules || []).includes("integrations")).length,
    finance: restaurants.filter((r) => (r.enabled_modules || []).includes("finance")).length,
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/60 via-slate-900/90 to-indigo-950/60 p-6 md:p-8 border border-indigo-500/20 shadow-2xl backdrop-blur-xl">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold w-fit">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              SuperAdmin Command Center
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Platform & Hotel Overview
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Monitor multi-tenant hotel health, manage active subscriptions, and dynamically provision features and AI modules across restaurants.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={() => navigate("/admin/hotels")}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl h-11 px-5 shadow-lg shadow-indigo-600/25 transition-all gap-2"
            >
              <Plus className="h-4 w-4" /> Onboard Hotel
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Total Hotels */}
        <Card className="bg-slate-900/70 border-slate-800/80 rounded-2xl backdrop-blur-xl text-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Managed Hotels
            </CardTitle>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">{totalHotels}</div>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="h-3 w-3" /> {activeHotels} Active
              </span>
              <span>•</span>
              <span className="text-amber-400">{trialHotels} Trial</span>
            </div>
          </CardContent>
        </Card>

        {/* Plan Tiers */}
        <Card className="bg-slate-900/70 border-slate-800/80 rounded-2xl backdrop-blur-xl text-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Enterprise / Pro Tiers
            </CardTitle>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">
              {enterpriseCount + proCount}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              <span className="text-purple-400 font-medium">{enterpriseCount} Enterprise</span>,{" "}
              <span className="text-indigo-400 font-medium">{proCount} Pro</span>
            </p>
          </CardContent>
        </Card>

        {/* AI Copilot Active */}
        <Card className="bg-slate-900/70 border-slate-800/80 rounded-2xl backdrop-blur-xl text-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              AI Copilot Enabled
            </CardTitle>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Bot className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-cyan-400">{moduleStats.ai}</div>
            <p className="mt-2 text-xs text-slate-400">
              {totalHotels > 0 ? Math.round((moduleStats.ai / totalHotels) * 100) : 0}% hotel adoption
            </p>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="bg-slate-900/70 border-slate-800/80 rounded-2xl backdrop-blur-xl text-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Platform Status
            </CardTitle>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-400 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              100% Operational
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Supabase Postgres & MCP active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Module Provisioning Adoption Overview */}
      <Card className="bg-slate-900/70 border-slate-800/80 rounded-3xl backdrop-blur-xl text-slate-100 overflow-hidden">
        <CardHeader className="border-b border-slate-800/80 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-400" />
                Live Feature Module Allocations
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-1">
                Distribution of provisioned capabilities across all active hotel tenants
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/hotels")}
              className="border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs rounded-xl"
            >
              Configure Modules <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
              <span className="text-xs text-slate-400 font-medium">POS Billing</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">{moduleStats.pos}</span>
                <span className="text-xs text-indigo-400 font-semibold">
                  {totalHotels > 0 ? Math.round((moduleStats.pos / totalHotels) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full"
                  style={{ width: `${totalHotels > 0 ? (moduleStats.pos / totalHotels) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
              <span className="text-xs text-slate-400 font-medium">Kitchen KDS</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">{moduleStats.kitchen}</span>
                <span className="text-xs text-amber-400 font-semibold">
                  {totalHotels > 0 ? Math.round((moduleStats.kitchen / totalHotels) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-1.5 rounded-full"
                  style={{ width: `${totalHotels > 0 ? (moduleStats.kitchen / totalHotels) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
              <span className="text-xs text-slate-400 font-medium">AI Copilot</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">{moduleStats.ai}</span>
                <span className="text-xs text-cyan-400 font-semibold">
                  {totalHotels > 0 ? Math.round((moduleStats.ai / totalHotels) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-cyan-500 h-1.5 rounded-full"
                  style={{ width: `${totalHotels > 0 ? (moduleStats.ai / totalHotels) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
              <span className="text-xs text-slate-400 font-medium">Inventory & Stock</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">{moduleStats.inventory}</span>
                <span className="text-xs text-emerald-400 font-semibold">
                  {totalHotels > 0 ? Math.round((moduleStats.inventory / totalHotels) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{ width: `${totalHotels > 0 ? (moduleStats.inventory / totalHotels) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
              <span className="text-xs text-slate-400 font-medium">Delivery Hub</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">{moduleStats.integrations}</span>
                <span className="text-xs text-rose-400 font-semibold">
                  {totalHotels > 0 ? Math.round((moduleStats.integrations / totalHotels) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-rose-500 h-1.5 rounded-full"
                  style={{ width: `${totalHotels > 0 ? (moduleStats.integrations / totalHotels) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
              <span className="text-xs text-slate-400 font-medium">Finance / P&L</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white">{moduleStats.finance}</span>
                <span className="text-xs text-purple-400 font-semibold">
                  {totalHotels > 0 ? Math.round((moduleStats.finance / totalHotels) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-purple-500 h-1.5 rounded-full"
                  style={{ width: `${totalHotels > 0 ? (moduleStats.finance / totalHotels) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Hotels Table */}
      <Card className="bg-slate-900/70 border-slate-800/80 rounded-3xl backdrop-blur-xl text-slate-100 overflow-hidden">
        <CardHeader className="border-b border-slate-800/80 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-400" />
                Hotel Registry & Provisioning Status
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-1">
                Recently registered hotels, plan tiers, and enabled features
              </CardDescription>
            </div>
            <Button
              onClick={() => navigate("/admin/hotels")}
              className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs rounded-xl"
            >
              View All ({restaurants.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/60">
                <tr>
                  <th className="px-6 py-4">Hotel / Restaurant</th>
                  <th className="px-6 py-4">Tier</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Active Modules</th>
                  <th className="px-6 py-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {hotelsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                      Loading hotel records...
                    </td>
                  </tr>
                ) : restaurants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                      No hotels registered yet. Click &quot;Onboard Hotel&quot; to add one.
                    </td>
                  </tr>
                ) : (
                  restaurants.slice(0, 5).map((hotel) => {
                    const modules = hotel.enabled_modules || [];
                    return (
                      <tr key={hotel.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                              {hotel.name?.substring(0, 2).toUpperCase() || "KP"}
                            </div>
                            <div>
                              <p className="font-semibold text-white">{hotel.name}</p>
                              <p className="text-xs text-slate-400">{hotel.business_type || "Restaurant"} • {hotel.cuisine || "Multi-Cuisine"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant="outline"
                            className={`capitalize text-xs font-semibold ${
                              hotel.plan_tier === "enterprise"
                                ? "bg-purple-950/60 text-purple-300 border-purple-700/50"
                                : hotel.plan_tier === "starter"
                                ? "bg-slate-800 text-slate-300 border-slate-700"
                                : "bg-indigo-950/60 text-indigo-300 border-indigo-700/50"
                            }`}
                          >
                            {hotel.plan_tier || "pro"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-slate-300 text-xs">
                          {hotel.city || "Bengaluru"}, {hotel.country || "India"}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            className={`text-[11px] font-medium border ${
                              hotel.status === "suspended"
                                ? "bg-rose-950/80 text-rose-300 border-rose-800/60"
                                : hotel.status === "trial"
                                ? "bg-amber-950/80 text-amber-300 border-amber-800/60"
                                : "bg-emerald-950/80 text-emerald-300 border-emerald-800/60"
                            }`}
                          >
                            {hotel.status || "active"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-indigo-400">{modules.length}</span>
                            <span className="text-xs text-slate-500">of 11 modules</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            onClick={() => navigate("/admin/hotels")}
                            className="h-8 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs transition-all"
                          >
                            Manage
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
