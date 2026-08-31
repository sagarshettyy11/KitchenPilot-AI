import React, { useState, useMemo, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Filter,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Building2,
  Users2,
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  Boxes,
  PieChart as PieChartIcon,
  BarChart3,
  Search,
  Download,
  IndianRupee,
  Receipt,
  Layers,
  ArrowRight,
  Sliders,
  DollarSign,
  Loader2,
  CreditCard
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatINR, formatINRCompact, formatIndianDate, formatIndianDateTime } from "@/lib/currency";
import { exportExpensesToExcel } from "@/lib/excel-export";
import { ExpenseLoggerModal } from "@/components/finance/ExpenseLoggerModal";
import { ExpenseMasterCatalogModal, EXPENSE_CATEGORIES } from "@/components/finance/ExpenseMasterCatalogModal";

const CATEGORY_COLORS = {
  "Raw Materials": "#6366F1", // Indigo
  "Dairy & Poultry": "#3B82F6", // Blue
  "Packaging": "#F59E0B", // Amber
  "Utilities": "#EC4899", // Pink
  "Maintenance": "#8B5CF6", // Purple
  "Staff & Payroll": "#10B981", // Emerald
  "Operations": "#14B8A6", // Teal
  "Marketing": "#F97316", // Orange
  "Miscellaneous / Other": "#64748B", // Slate
};

const DEFAULT_COLORS = ["#6366F1", "#3B82F6", "#F59E0B", "#EC4899", "#8B5CF6", "#10B981", "#14B8A6", "#F97316", "#64748B"];

export function FinancePage() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();

  // Selected Month/Period state
  const currentDate = new Date();
  const currentMonthValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPaymentMode, setFilterPaymentMode] = useState("all");

  // Modals state
  const [loggerOpen, setLoggerOpen] = useState(false);
  const [masterModalOpen, setMasterModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // 1. Fetch Primary Restaurant for user
  const { data: restaurant, isLoading: restLoading } = useQuery({
    queryKey: ["primary-restaurant", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user?.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;

      // Auto provision if missing
      const { data: created, error: createErr } = await supabase
        .from("restaurants")
        .insert({
          owner_id: user?.id,
          name: "My Restaurant",
          currency: "INR",
          country: "India",
        })
        .select()
        .single();
      if (createErr) throw createErr;
      return created;
    },
    enabled: !!user?.id,
  });

  const restaurantId = restaurant?.id;

  // 2. Fetch Master Items Catalog
  const { data: masterItems = [] } = useQuery({
    queryKey: ["expense-master-items", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("expense_master_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name", { ascending: true });
      if (error) return [];
      return data ?? [];
    },
    enabled: !!restaurantId,
  });

  // 3. Fetch Expenses for Restaurant
  const { data: allExpenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["restaurant-expenses", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    },
    enabled: !!restaurantId,
  });

  // 4. Fetch Delivery Orders for Revenue comparison
  const { data: orders = [] } = useQuery({
    queryKey: ["restaurant-delivery-orders", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("delivery_orders")
        .select("total_amount, placed_at, created_at, status")
        .eq("restaurant_id", restaurantId);
      if (error) return [];
      return data ?? [];
    },
    enabled: !!restaurantId,
  });

  // Realtime subscription on expenses
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel("finance-expenses-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["restaurant-expenses", restaurantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, queryClient]);

  // Delete Expense Mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId) => {
      const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expense entry deleted");
      queryClient.invalidateQueries({ queryKey: ["restaurant-expenses", restaurantId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete expense");
    },
  });

  // Calculate Available Month Options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
      options.push({ value: val, label: i === 0 ? `${label} (Current)` : label });
    }
    options.push({ value: "all", label: "All Time (Complete History)" });
    return options;
  }, []);

  // Filter Expenses by selected Month
  const monthlyExpenses = useMemo(() => {
    if (selectedMonth === "all") return allExpenses;
    return allExpenses.filter((e) => {
      const dateStr = e.expense_date || (e.created_at ? e.created_at.split("T")[0] : "");
      return dateStr.startsWith(selectedMonth);
    });
  }, [allExpenses, selectedMonth]);

  // Filter for Transactions Table (search + category + payment mode)
  const filteredTableExpenses = useMemo(() => {
    return monthlyExpenses.filter((e) => {
      const matchesSearch =
        e.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat =
        filterCategory === "all" || e.category === filterCategory;

      const matchesPayment =
        filterPaymentMode === "all" || (e.payment_mode || "cash") === filterPaymentMode;

      return matchesSearch && matchesCat && matchesPayment;
    });
  }, [monthlyExpenses, searchTerm, filterCategory, filterPaymentMode]);

  // Aggregate Monthly Statistics
  const stats = useMemo(() => {
    let totalExpense = 0;
    const catMap = {};
    const dailyMap = {};
    const paymentMap = {};

    monthlyExpenses.forEach((exp) => {
      const amt = Number(exp.amount) || 0;
      totalExpense += amt;

      // Category aggregation
      const cat = exp.category || "Miscellaneous / Other";
      catMap[cat] = (catMap[cat] || 0) + amt;

      // Payment mode aggregation
      const pm = (exp.payment_mode || "cash").toUpperCase();
      paymentMap[pm] = (paymentMap[pm] || 0) + amt;

      // Daily aggregation
      const day = exp.expense_date
        ? exp.expense_date.split("-")[2]
        : exp.created_at
        ? exp.created_at.split("T")[0].split("-")[2]
        : "01";
      const dayKey = `Day ${parseInt(day)}`;
      dailyMap[dayKey] = (dailyMap[dayKey] || 0) + amt;
    });

    // Top Category
    let topCategory = "None";
    let topCategoryAmount = 0;
    Object.entries(catMap).forEach(([cat, amt]) => {
      if (amt > topCategoryAmount) {
        topCategoryAmount = amt;
        topCategory = cat;
      }
    });

    // Daily chart data
    const daysInMonth = selectedMonth !== "all" ? 31 : 12;
    const dailyChartData = [];
    if (selectedMonth !== "all") {
      const [year, month] = selectedMonth.split("-").map(Number);
      const totalDays = new Date(year, month, 0).getDate();
      for (let d = 1; d <= totalDays; d++) {
        const dayKey = `Day ${d}`;
        dailyChartData.push({
          day: `${d}`,
          amount: dailyMap[dayKey] || 0,
        });
      }
    } else {
      // 12 months overview
      const monthBuckets = {};
      allExpenses.forEach((exp) => {
        const dateStr = exp.expense_date || (exp.created_at ? exp.created_at.split("T")[0] : "");
        const mKey = dateStr.substring(0, 7);
        monthBuckets[mKey] = (monthBuckets[mKey] || 0) + (Number(exp.amount) || 0);
      });
      Object.keys(monthBuckets).sort().forEach((mKey) => {
        dailyChartData.push({
          day: mKey,
          amount: monthBuckets[mKey],
        });
      });
    }

    // Pie chart category data
    const categoryPieData = Object.entries(catMap).map(([name, value]) => ({
      name,
      value,
    }));

    // Revenue for the same period
    const totalRevenue = orders
      .filter((o) => {
        if (selectedMonth === "all") return true;
        const dStr = o.placed_at || o.created_at;
        return dStr ? dStr.startsWith(selectedMonth) : false;
      })
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    const netProfit = totalRevenue - totalExpense;
    const dailyAverage = monthlyExpenses.length > 0 ? totalExpense / (dailyChartData.length || 1) : 0;

    return {
      totalExpense,
      totalRevenue,
      netProfit,
      dailyAverage,
      topCategory,
      topCategoryAmount,
      totalEntries: monthlyExpenses.length,
      categoryPieData,
      dailyChartData,
      paymentMap,
    };
  }, [monthlyExpenses, allExpenses, orders, selectedMonth]);

  // Handle Export to Excel
  function handleExcelExport() {
    try {
      const selectedOption = monthOptions.find((o) => o.value === selectedMonth);
      const periodLabel = selectedOption ? selectedOption.label : selectedMonth;
      exportExpensesToExcel(filteredTableExpenses, restaurant?.name || "Restaurant", periodLabel);
      toast.success("Excel expense report downloaded successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export Excel file");
    }
  }

  function handleEditExpense(expense) {
    setEditingExpense(expense);
    setLoggerOpen(true);
  }

  function handleOpenNewExpense() {
    setEditingExpense(null);
    setLoggerOpen(true);
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-16">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-950/40 via-card to-brand/10 p-6 rounded-3xl border border-border/70 shadow-sm relative overflow-hidden">
        <div className="flex flex-col gap-1.5 z-10">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-brand" />
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              Business Expense Tracker
            </h1>
            <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20 text-xs font-semibold">
              Live Tracker
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">
            Select items from your master catalog or log custom expenses. Track monthly burn, visual distributions, and export to Excel.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 z-10">
          <Button
            variant="outline"
            onClick={() => setMasterModalOpen(true)}
            className="rounded-xl border-border bg-card/80 hover:bg-muted text-xs font-semibold gap-1.5 h-10 shadow-sm"
          >
            <Boxes className="h-4 w-4 text-brand" />
            Master Catalog ({masterItems.length})
          </Button>

          <Button
            onClick={handleExcelExport}
            variant="outline"
            className="rounded-xl border-emerald-600/30 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 text-xs font-semibold gap-1.5 h-10 shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            Export to Excel
          </Button>

          <Button
            onClick={handleOpenNewExpense}
            className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 text-xs font-semibold gap-1.5 h-10 shadow-md shadow-brand/20"
          >
            <Plus className="h-4 w-4" />
            + Log Expense
          </Button>
        </div>
      </div>

      {/* Month Selector & Quick Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-brand shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Analysis Period:
          </span>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[220px] rounded-xl h-10 text-xs font-semibold bg-muted/50 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <span>Displaying <strong className="text-foreground">{monthlyExpenses.length}</strong> expense records</span>
        </div>
      </div>

      {/* Monthly Statistics KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Monthly Expenses */}
        <Card className="rounded-2xl border-border/80 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Expenses
            </CardTitle>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              {formatINR(stats.totalExpense)}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Across <span className="font-semibold text-foreground">{stats.totalEntries}</span> logged purchases
            </p>
          </CardContent>
        </Card>

        {/* Daily Average Expense */}
        <Card className="rounded-2xl border-border/80 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Daily Average Spend
            </CardTitle>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              {formatINR(stats.dailyAverage)}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Average daily operating burn
            </p>
          </CardContent>
        </Card>

        {/* Top Spending Category */}
        <Card className="rounded-2xl border-border/80 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Top Expense Category
            </CardTitle>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Tag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-xl font-bold text-foreground truncate">
              {stats.topCategory}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground font-medium">
              <span className="font-semibold text-brand">{formatINR(stats.topCategoryAmount)}</span> (
              {stats.totalExpense > 0
                ? Math.round((stats.topCategoryAmount / stats.totalExpense) * 100)
                : 0}
              % of total)
            </p>
          </CardContent>
        </Card>

        {/* Net Profit/Loss Margin */}
        <Card className="rounded-2xl border-border/80 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Net Financial Balance
            </CardTitle>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl md:text-3xl font-extrabold tracking-tight ${
                stats.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {formatINR(stats.netProfit)}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Orders Revenue: <span className="font-semibold text-foreground">{formatINR(stats.totalRevenue)}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Graphs on the Same Page (Daily Spend & Category Pie) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Expense Trend Graph */}
        <Card className="lg:col-span-2 rounded-3xl border-border/80 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-brand" />
                  Daily Expense Timeline ({selectedMonth})
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Day-by-day expenditure trend throughout the selected analysis cycle
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {stats.dailyChartData.length === 0 || stats.totalExpense === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-xs gap-2">
                <Receipt className="h-8 w-8 text-muted-foreground/50" />
                <span>No expense entries recorded for this period.</span>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="expenseColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                    <XAxis dataKey="day" tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                    <Tooltip
                      formatter={(val) => [formatINR(val), "Expenses"]}
                      labelFormatter={(label) => `Day ${label}`}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "12px",
                        fontSize: "12px",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
                      }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#expenseColor)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown Donut / Pie Chart */}
        <Card className="rounded-3xl border-border/80 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-brand" />
              Category Breakdown
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Rupee & percentage distribution by expense category
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {stats.categoryPieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-xs gap-2">
                <Boxes className="h-8 w-8 text-muted-foreground/50" />
                <span>No expense data to display.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categoryPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {stats.categoryPieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CATEGORY_COLORS[entry.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val) => [formatINR(val), "Amount"]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Category Legend List */}
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                  {stats.categoryPieData.map((item, i) => {
                    const pct = stats.totalExpense > 0 ? Math.round((item.value / stats.totalExpense) * 100) : 0;
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: CATEGORY_COLORS[item.name] || DEFAULT_COLORS[i % DEFAULT_COLORS.length] }}
                          />
                          <span className="text-muted-foreground truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold text-foreground">{formatINR(item.value)}</span>
                          <span className="text-[10px] text-muted-foreground font-medium w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Expense Transactions Table */}
      <Card className="rounded-3xl border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Receipt className="h-4 w-4 text-brand" />
                Expense Ledger & Logs
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Detailed record of all purchases, bills, remarks, and payment vouchers
              </CardDescription>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search item, vendor, remarks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 rounded-xl pl-9 text-xs"
                />
              </div>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[140px] h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterPaymentMode} onValueChange={setFilterPaymentMode}>
                <SelectTrigger className="w-[120px] h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/70 text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Item / Reason</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Payment</th>
                  <th className="px-5 py-3.5">Vendor / Bill</th>
                  <th className="px-5 py-3.5">Remarks / Reason</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {expensesLoading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand mb-1" />
                      Loading expense entries...
                    </td>
                  </tr>
                ) : filteredTableExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Wallet className="h-8 w-8 text-muted-foreground/40" />
                        <span className="font-semibold text-sm">No expenses logged for this filter.</span>
                        <p className="text-[11px] text-muted-foreground">
                          Click &quot;+ Log Expense&quot; above to add your first expense record.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTableExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-3.5 font-medium whitespace-nowrap text-muted-foreground">
                        {exp.expense_date ? formatIndianDate(exp.expense_date) : "-"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          {exp.item_name}
                        </div>
                        {exp.quantity > 1 && (
                          <p className="text-[11px] text-muted-foreground">
                            Qty: {exp.quantity} {exp.unit}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-medium"
                          style={{ borderColor: `${CATEGORY_COLORS[exp.category] || "#6366F1"}50`, color: CATEGORY_COLORS[exp.category] || "#6366F1" }}
                        >
                          {exp.category}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 font-extrabold text-foreground text-sm">
                        {formatINR(exp.amount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge className="bg-muted text-foreground border-border text-[10px] font-semibold uppercase">
                          {exp.payment_mode || "CASH"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {exp.vendor_name ? (
                          <div>
                            <span className="font-semibold text-foreground">{exp.vendor_name}</span>
                            {exp.invoice_number && (
                              <p className="text-[10px] text-muted-foreground">Inv: {exp.invoice_number}</p>
                            )}
                          </div>
                        ) : exp.invoice_number ? (
                          `Inv: ${exp.invoice_number}`
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground max-w-xs truncate">
                        {exp.remarks || "-"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditExpense(exp)}
                            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-brand"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (window.confirm(`Delete expense for "${exp.item_name}" (${formatINR(exp.amount)})?`)) {
                                deleteExpenseMutation.mutate(exp.id);
                              }
                            }}
                            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Expense Logger Modal */}
      <ExpenseLoggerModal
        open={loggerOpen}
        onOpenChange={setLoggerOpen}
        restaurantId={restaurantId}
        masterItems={masterItems}
        editingExpense={editingExpense}
      />

      {/* Master Items Catalog Modal */}
      <ExpenseMasterCatalogModal
        open={masterModalOpen}
        onOpenChange={setMasterModalOpen}
        restaurantId={restaurantId}
      />
    </div>
  );
}
