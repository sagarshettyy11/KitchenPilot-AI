import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatINR, formatINRCompact } from "@/lib/currency";

const data = [
  { d: "Mon", revenue: 84_200 },
  { d: "Tue", revenue: 1_02_500 },
  { d: "Wed", revenue: 96_400 },
  { d: "Thu", revenue: 1_22_100 },
  { d: "Fri", revenue: 1_66_300 },
  { d: "Sat", revenue: 1_92_800 },
  { d: "Sun", revenue: 1_78_500 },
];
const weekTotal = data.reduce((s, x) => s + x.revenue, 0);

export function RevenueChart() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Revenue this week</div>
          <div className="text-xs text-muted-foreground">Live · updates every minute</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tracking-tight">{formatINR(weekTotal)}</div>
          <div className="text-xs text-success">+12.4% vs last week</div>
        </div>
      </div>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.56 0.22 262)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="oklch(0.56 0.22 262)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 258)" vertical={false} />
            <XAxis
              dataKey="d"
              stroke="oklch(0.55 0.02 258)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              stroke="oklch(0.55 0.02 258)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatINRCompact(v)}
            />

            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid oklch(0.9 0.01 258)",
                background: "white",
                fontSize: 12,
              }}
              formatter={(v) => [formatINR(v), "Revenue"]}
            />

            <Area
              type="monotone"
              dataKey="revenue"
              stroke="oklch(0.56 0.22 262)"
              strokeWidth={2.5}
              fill="url(#rev)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
