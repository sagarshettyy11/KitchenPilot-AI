import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function KpiCard({ label, value, delta, icon: Icon, tone = "brand" }) {
  const toneBg = {
    brand: "bg-brand/10 text-brand",
    teal: "bg-accent-teal/15 text-accent-teal",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/10 text-danger",
  }[tone];
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</div>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", toneBg)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {delta !== undefined && (
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            positive ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
          )}
        >
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {positive ? "+" : ""}
          {delta}% vs last week
        </div>
      )}
    </div>
  );
}
