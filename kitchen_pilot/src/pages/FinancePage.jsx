import React, { useState, useEffect, useMemo } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  Filter,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Receipt,
  FileSpreadsheet,
  Building2,
  Users2,
  UtensilsCrossed,
  HelpCircle,
  Clock,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hasAnyRole, MODULES } from "@/lib/roles";
import { formatINR, formatINRCompact, formatIndianDate, formatIndianDateTime } from "@/lib/currency";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

const mod = MODULES.find((m) => m.id === "finance");

const STORAGE_KEY_EXPENSES = "kitchenpilot_operating_expenses_v2";
const STORAGE_KEY_CLEARANCE = "kitchenpilot_payouts_clearance_v2";

// No pre-seeded/dummy expenses.


// Helper: provision/fetch restaurant
function useRestaurantId(userId) {
  return useQuery({
    queryKey: ["primary-restaurant", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name")
        .eq("owner_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;
      const { data: created, error: createErr } = await supabase
        .from("restaurants")
        .insert({ owner_id: userId, name: "My Restaurant", currency: "INR", country: "India" })
        .select("id, name")
        .single();
      if (createErr) throw createErr;
      return created;
    },
    enabled: !!userId,
  });
}

// Helper: fetch live delivery orders
function useDeliveryOrders(restaurantId) {
  return useQuery({
    enabled: !!restaurantId,
    queryKey: ["delivery-orders", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("placed_at", { ascending: false });
      if (error) {
        if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
          return [];
        }
        throw error;
      }
      return data ?? [];
    },
  });
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl m-4 space-y-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <span className="p-1 rounded-lg bg-destructive/20">⚠️</span>
            Something went wrong rendering the Finance Page
          </div>
          <p className="text-sm">
            A runtime error occurred. Please see the stack trace below:
          </p>
          <pre className="p-4 bg-muted border border-border rounded-xl text-xs overflow-auto font-mono max-h-96 whitespace-pre-wrap">
            {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
          </pre>
          <Button
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function FinancePage() {
  return (
    <ErrorBoundary>
      <FinancePageContent />
    </ErrorBoundary>
  );
}

function FinancePageContent() {
  const { user, roles } = useOutletContext();
  const [timeframe, setTimeframe] = useState("30days");

  // Form State: Log Expenses
  const [expCategory, setExpCategory] = useState("Food Supplies");
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);

  // Local state persistence
  const [expenses, setExpenses] = useState([]);
  const [clearanceMap, setClearanceMap] = useState({});

  useEffect(() => {
    document.title = "Finance & Accounting · KitchenPilot";
    
    // Operating expenses
    const storedExp = localStorage.getItem(STORAGE_KEY_EXPENSES);
    if (storedExp) {
      try {
        setExpenses(JSON.parse(storedExp));
      } catch (e) {
        setExpenses([]);
      }
    } else {
      setExpenses([]);
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify([]));
    }

    // Payout clearance state
    const storedClear = localStorage.getItem(STORAGE_KEY_CLEARANCE);
    if (storedClear) {
      try {
        setClearanceMap(JSON.parse(storedClear));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Fetch restaurant context and database orders
  const { data: restaurant } = useRestaurantId(user?.id);
  const restaurantId = restaurant?.id;
  const { data: dbOrders = [] } = useDeliveryOrders(restaurantId);

  // Compute actual date limits
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();

    if (timeframe === "today") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (timeframe === "yesterday") {
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (timeframe === "7days") {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else if (timeframe === "30days") {
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    } else if (timeframe === "thisMonth") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }
    return { start, end };
  }, [timeframe]);

  // Filter db orders based on timeframe
  const filteredOrders = useMemo(() => {
    return dbOrders.filter((o) => {
      if (!o.placed_at) return false;
      const placeDate = new Date(o.placed_at);
      return placeDate >= dateRange.start && placeDate <= dateRange.end;
    });
  }, [dbOrders, dateRange]);

  // Filter local logged expenses based on timeframe
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const expD = new Date(e.date);
      return expD >= dateRange.start && expD <= dateRange.end;
    });
  }, [expenses, dateRange]);

  // Aggregate gross figures
  const financeMetrics = useMemo(() => {
    const grossSales = filteredOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
    const commissionsPaid = filteredOrders.reduce((acc, o) => acc + Number(o.commission || 0), 0);
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const netProfit = grossSales - commissionsPaid - totalExpenses;
    const margin = grossSales ? (netProfit / grossSales) * 100 : 0;

    return {
      grossSales,
      commissionsPaid,
      totalExpenses,
      netProfit,
      margin
    };
  }, [filteredOrders, filteredExpenses]);

  // Compile Platform Payout Reconciliation Ledger
  const payoutLedger = useMemo(() => {
    const ledger = {};

    filteredOrders.forEach((o) => {
      // Offline orders don't have provider (default channel name Dine-in/POS)
      const channel = o.provider ? String(o.provider).toUpperCase() : "POS CASH/UPI";
      
      if (!ledger[channel]) {
        ledger[channel] = {
          channel,
          grossAmount: 0,
          commissions: 0,
          netPayout: 0,
          ordersCount: 0,
          isCleared: !!clearanceMap[channel]
        };
      }

      const row = ledger[channel];
      row.ordersCount += 1;
      row.grossAmount += Number(o.total || 0);
      row.commissions += Number(o.commission || 0);
      row.netPayout = row.grossAmount - row.commissions;
    });

    return Object.values(ledger).sort((a,b) => b.grossAmount - a.grossAmount);
  }, [filteredOrders, clearanceMap]);

  // Toggle Payout Clearance State
  const toggleClearance = (channel) => {
    const updated = {
      ...clearanceMap,
      [channel]: !clearanceMap[channel]
    };
    setClearanceMap(updated);
    localStorage.setItem(STORAGE_KEY_CLEARANCE, JSON.stringify(updated));
    toast.success(`Payout state for ${channel} updated successfully.`);
  };

  // Log new operating expense
  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!expAmount || Number(expAmount) <= 0) {
      toast.error("Please enter a valid expense amount");
      return;
    }

    const newExp = {
      id: `exp-${Date.now()}`,
      category: expCategory,
      amount: Number(expAmount),
      description: expDesc || `${expCategory} purchase`,
      date: new Date(expDate).toISOString()
    };

    const updated = [newExp, ...expenses];
    setExpenses(updated);
    localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(updated));

    // Reset Form
    setExpAmount("");
    setExpDesc("");
    toast.success("Operating cost logged in ledger!");
  };

  // Delete operating expense
  const handleDeleteExpense = (id) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(updated));
    toast.success("Expense log deleted.");
  };

  // P&L Trend over time (Recharts data)
  // Split the dateRange into 4 logical periods/weeks
  const pnlChartData = useMemo(() => {
    const periodsCount = 4;
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const msDiff = end.getTime() - start.getTime();
    const interval = msDiff / periodsCount;

    const data = [];
    for (let p = 0; p < periodsCount; p++) {
      const pStart = new Date(start.getTime() + p * interval);
      const pEnd = new Date(start.getTime() + (p + 1) * interval);
      
      const label = `Wk ${p + 1} (${pStart.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })})`;

      // Filter orders in this sub-period
      const periodSales = filteredOrders
        .filter(o => {
          const place = new Date(o.placed_at);
          return place >= pStart && place <= pEnd;
        })
        .reduce((sum, o) => sum + Number(o.total || 0), 0);

      // Filter commissions in this sub-period
      const periodComm = filteredOrders
        .filter(o => {
          const place = new Date(o.placed_at);
          return place >= pStart && place <= pEnd;
        })
        .reduce((sum, o) => sum + Number(o.commission || 0), 0);

      // Filter expenses in this sub-period
      const periodExp = filteredExpenses
        .filter(e => {
          const expD = new Date(e.date);
          return expD >= pStart && expD <= pEnd;
        })
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      const netProf = periodSales - periodComm - periodExp;

      data.push({
        name: label,
        Revenue: periodSales,
        "Costs & Commissions": periodComm + periodExp,
        "Net Profit": netProf
      });
    }
    return data;
  }, [filteredOrders, filteredExpenses, dateRange]);

  if (!hasAnyRole(roles, mod.roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Cost category Icons mapper
  const getCategoryIcon = (category) => {
    switch (category) {
      case "Food Supplies": return UtensilsCrossed;
      case "Rent": return Building2;
      case "Salaries": return Users2;
      default: return Receipt;
    }
  };

  return (
    <main className="flex-1 p-4 md:p-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-semibold text-warning">
            <Wallet className="h-3 w-3" />
            Financial Dashboard
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            Finance & Accounting
          </h1>
          <p className="text-sm text-muted-foreground">
            Track gross margins, log operating expenses, and reconcile aggregator channel payouts.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Tabs
            value={timeframe}
            onValueChange={setTimeframe}
            className="w-full md:w-auto"
          >
            <TabsList className="bg-muted/60 p-0.5 rounded-xl border border-border/60">
              <TabsTrigger value="7days" className="rounded-lg text-xs py-1 px-3">7 Days</TabsTrigger>
              <TabsTrigger value="30days" className="rounded-lg text-xs py-1 px-3">30 Days</TabsTrigger>
              <TabsTrigger value="thisMonth" className="rounded-lg text-xs py-1 px-3">This Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Financial Health KPIs Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <CardContent className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gross Sales</span>
              <div className="rounded-xl bg-brand/10 p-2 text-brand">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatINR(financeMetrics.grossSales)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-success">
                <ArrowUpRight className="h-3 w-3" />
                <span>Gross sales in period</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <CardContent className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commissions Paid</span>
              <div className="rounded-xl bg-rose-500/10 p-2 text-rose-500">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatINR(financeMetrics.commissionsPaid)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Aggregator channel fees</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <CardContent className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Operating Expenses</span>
              <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-500">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatINR(financeMetrics.totalExpenses)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Rent, supplies, utility & payroll</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <CardContent className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Profit</span>
              <div className="rounded-xl bg-success/10 p-2 text-success">
                {financeMetrics.netProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </div>
            </div>
            <div>
              <div className={cn("text-2xl font-bold tracking-tight", financeMetrics.netProfit >= 0 ? "text-foreground" : "text-destructive")}>
                {formatINR(financeMetrics.netProfit)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold">
                <span className={financeMetrics.netProfit >= 0 ? "text-success" : "text-destructive"}>
                  {financeMetrics.margin.toFixed(1)}% margin
                </span>
                <span className="text-muted-foreground">after cost cuts</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Chart and Logger */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Profit & Loss visual graph */}
        <Card className="rounded-2xl border border-border/60 bg-card p-5 md:col-span-2">
          <div className="border-b border-border/40 pb-4 mb-4">
            <h2 className="text-sm font-semibold tracking-tight">Period P&L Comparison Chart</h2>
            <p className="text-xs text-muted-foreground">Gross Sales vs. Total Expenses & Net Profit margins</p>
          </div>
          <div className="h-80">
            {pnlChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No financial data found in this timeframe
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlChartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 255)" vertical={false} />
                  <XAxis dataKey="name" stroke="oklch(0.55 0.02 258)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.55 0.02 258)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatINRCompact(v)} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid oklch(0.92 0.01 255)",
                      background: "var(--card)",
                      color: "var(--foreground)",
                      fontSize: 11,
                    }}
                    formatter={(v) => [formatINR(v), ""]}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Revenue" fill="oklch(0.72 0.17 148)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Costs & Commissions" fill="oklch(0.62 0.24 27)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Net Profit" fill="oklch(0.56 0.22 262)" radius={[4, 4, 0, 0]} />
                  <ReferenceLine y={0} stroke="oklch(0.7 0.02 258)" strokeWidth={1} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Operating Cost Logger Card */}
        <Card className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="border-b border-border/40 pb-4 mb-4">
            <h2 className="text-sm font-semibold tracking-tight">Log Operating Expense</h2>
            <p className="text-xs text-muted-foreground">Add manual costs to P&L calculations</p>
          </div>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="category" className="text-xs text-muted-foreground">Category</Label>
              <Select value={expCategory} onValueChange={setExpCategory}>
                <SelectTrigger id="category" className="rounded-xl border-border/60 text-xs">
                  <SelectValue placeholder="Food Supplies" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Food Supplies">Raw Food Supplies</SelectItem>
                  <SelectItem value="Rent">Location Rent / Lease</SelectItem>
                  <SelectItem value="Salaries">Payroll / Wages</SelectItem>
                  <SelectItem value="Utilities">Utilities (Water, Power)</SelectItem>
                  <SelectItem value="Marketing">Marketing / Promotion</SelectItem>
                  <SelectItem value="Other">Other Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="amount" className="text-xs text-muted-foreground">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="rounded-xl border-border/60 text-xs h-9 focus:ring-brand"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="date" className="text-xs text-muted-foreground">Expense Date</Label>
              <input
                id="date"
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description" className="text-xs text-muted-foreground">Description</Label>
              <Input
                id="description"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                placeholder="e.g. Milk & Veggies stock"
                className="rounded-xl border-border/60 text-xs h-9 focus:ring-brand"
              />
            </div>

            <Button type="submit" className="w-full rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 text-xs h-9">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Cost Log
            </Button>
          </form>
        </Card>
      </div>

      {/* Reconcile payouts / expenses log split */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Payout reconciliation list */}
        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="border-b border-border/60 p-5">
            <h2 className="text-sm font-semibold tracking-tight">Channel Payout Reconciliation</h2>
            <p className="text-xs text-muted-foreground">Clear aggregates for connected channels</p>
          </div>
          <div className="overflow-x-auto">
            {payoutLedger.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No payout transactions registered in this timeframe
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-semibold">
                    <th className="p-4">Channel</th>
                    <th className="p-4">Gross Sales</th>
                    <th className="p-4">Aggregator Fee</th>
                    <th className="p-4">Net Payout</th>
                    <th className="p-4 text-right">Clearance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {payoutLedger.map((row) => (
                    <tr key={row.channel} className="hover:bg-muted/30 transition">
                      <td className="p-4 font-bold text-foreground">{row.channel}</td>
                      <td className="p-4 font-medium text-foreground">{formatINR(row.grossAmount)}</td>
                      <td className="p-4 text-rose-500 font-medium">-{formatINR(row.commissions)}</td>
                      <td className="p-4 font-extrabold text-foreground">{formatINR(row.netPayout)}</td>
                      <td className="p-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleClearance(row.channel)}
                          className={cn(
                            "rounded-lg text-[10px] h-7 px-2.5 font-bold cursor-pointer transition",
                            row.isCleared
                              ? "bg-success/10 text-success border-success/30 hover:bg-success/20"
                              : "bg-warning/15 text-warning border-warning/30 hover:bg-warning/20"
                          )}
                        >
                          {row.isCleared ? (
                            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Cleared</span>
                          ) : (
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 animate-pulse" /> Pending</span>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Expenses Ledger Log list */}
        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="border-b border-border/60 p-5">
            <h2 className="text-sm font-semibold tracking-tight">Operating Expenses Ledger</h2>
            <p className="text-xs text-muted-foreground">List of logged costs during timeframe</p>
          </div>
          <div className="overflow-y-auto max-h-72 divide-y divide-border/60">
            {filteredExpenses.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No costs logged in this period
              </div>
            ) : (
              filteredExpenses.map((exp) => {
                const Icon = getCategoryIcon(exp.category);
                return (
                  <div key={exp.id} className="p-4 flex items-center justify-between text-xs hover:bg-muted/30 transition">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-muted p-2 text-muted-foreground shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{exp.description}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {exp.category} · {formatIndianDate(exp.date)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-destructive">-{formatINR(exp.amount)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteExpense(exp.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
