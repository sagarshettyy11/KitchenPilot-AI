import { Navigate, useOutletContext } from "react-router-dom";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  Utensils,
  Timer,
  Package,
  PieChart,
  Sparkles,
} from "lucide-react";
import { hasAnyRole, MODULES } from "@/lib/roles";
import { formatINR } from "@/lib/currency";
import { useEffect } from "react";

const mod = MODULES.find((m) => m.id === "dashboard");

export function DashboardPage() {
  const { user, roles } = useOutletContext();

  useEffect(() => {
    document.title = "Dashboard · KitchenPilot";
  }, []);

  if (!hasAnyRole(roles, mod.roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  const topItems = [
    { name: "Paneer Tikka Masala", sold: 182, revenue: 45_500 },
    { name: "Chicken Biryani", sold: 146, revenue: 43_800 },
    { name: "Butter Naan", sold: 324, revenue: 19_440 },
    { name: "Masala Dosa", sold: 128, revenue: 25_600 },
    { name: "Mango Lassi", sold: 96, revenue: 9_600 },
  ];
  const ops = [
    { i: Utensils, l: "Tables occupied", v: "18 / 24" },
    { i: Timer, l: "Avg. prep time", v: "12m 40s" },
    { i: Package, l: "Low stock items", v: "3" },
    { i: PieChart, l: "Dine-in share", v: "61%" },
  ];

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
            </span>
            Live
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            Good evening — here's how service is going.
          </h1>
          <p className="text-sm text-muted-foreground">
            Snapshot for today ·{" "}
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Today's revenue"
            value={formatINR(1_24_580)}
            delta={12.4}
            icon={DollarSign}
            tone="brand"
          />

          <KpiCard label="Orders" value="286" delta={8.1} icon={ShoppingBag} tone="teal" />
          <KpiCard label="Guests" value="412" delta={5.6} icon={Users} tone="success" />
          <KpiCard
            label="Avg. bill"
            value={formatINR(508)}
            delta={-1.8}
            icon={TrendingUp}
            tone="warning"
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Live operations</div>
              <span className="text-xs text-muted-foreground">Just now</span>
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {ops.map((r) => (
                <li
                  key={r.l}
                  className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5"
                >
                  <span className="flex items-center gap-2.5 text-muted-foreground">
                    <r.i className="h-4 w-4" />
                    {r.l}
                  </span>
                  <span className="font-semibold text-foreground">{r.v}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 text-brand" />
                <div>
                  <div className="text-xs font-semibold text-brand">AI insight</div>
                  <p className="text-xs text-muted-foreground">
                    Fridays 7–9 PM you sell 38% more truffle burgers. Consider prepping 60 patties
                    in advance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Top selling items</div>
              <span className="text-xs text-muted-foreground">Today</span>
            </div>
            <div className="divide-y divide-border/60">
              {topItems.map((it, idx) => (
                <div key={it.name} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium">{it.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{formatINR(it.revenue)}</div>
                    <div className="text-xs text-muted-foreground">{it.sold} sold</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="mb-3 text-sm font-semibold">Kitchen queue</div>
            <div className="space-y-2.5">
              {[
                { n: "#1054", t: "Dine-in · Table 12", s: "Preparing", tone: "brand", eta: "2m" },
                { n: "#1053", t: "Takeaway", s: "Ready", tone: "success", eta: "4m" },
                { n: "#1052", t: "Dine-in · Table 7", s: "Preparing", tone: "brand", eta: "6m" },
                { n: "#1051", t: "Delivery", s: "Queued", tone: "warning", eta: "7m" },
              ].map((o) => (
                <div
                  key={o.n}
                  className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5"
                >
                  <div>
                    <div className="text-sm font-semibold">
                      {o.n}{" "}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">{o.t}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">ETA {o.eta}</div>
                  </div>
                  <span
                    className={
                      o.tone === "success"
                        ? "rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"
                        : o.tone === "warning"
                          ? "rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning"
                          : "rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand"
                    }
                  >
                    {o.s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          This is your dashboard shell. POS, Menu, Kitchen, Inventory, CRM, Finance and AI modules
          ship in the next phases.
        </div>
      </div>
    </main>
  );
}
