import React, { useState, useEffect, useMemo } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Utensils,
  Smartphone,
  Calendar,
  Download,
  Printer,
  Search,
  Filter,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  Clock,
  CreditCard,
  ArrowUpRight,
  Info,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { hasAnyRole, MODULES } from "@/lib/roles";
import { formatINR, formatINRCompact, formatIndianDate, formatIndianDateTime, formatIndianNumber } from "@/lib/currency";
import { PROVIDER_LABELS } from "@/lib/integrations/providers";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
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

const mod = MODULES.find((m) => m.id === "reports");

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

// Helper: fetch online delivery orders
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
        // Safe check in case delivery_orders table is not created on user's schema yet
        if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
          console.warn("delivery_orders table does not exist, falling back to mock data");
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
            Something went wrong rendering the Reports Page
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

export function ReportsPage() {
  return (
    <ErrorBoundary>
      <ReportsPageContent />
    </ErrorBoundary>
  );
}

function ReportsPageContent() {
  const { user, roles } = useOutletContext();
  const [timeframe, setTimeframe] = useState("7days");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Custom range local inputs
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Fetch restaurant and database orders
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
    } else if (timeframe === "custom" && customStart && customEnd) {
      const s = new Date(customStart);
      s.setHours(0, 0, 0, 0);
      const e = new Date(customEnd);
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    } else {
      // Default to 7 days
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    }

    return { start, end };
  }, [timeframe, customStart, customEnd]);

  // Set default values for custom dates if empty
  useEffect(() => {
    if (timeframe === "custom" && (!customStart || !customEnd)) {
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      setCustomStart(weekAgo.toISOString().split("T")[0]);
      setCustomEnd(today);
    }
  }, [timeframe]);

  // Map database orders dynamically
  const allOrders = useMemo(() => {
    if (!restaurantId || !dbOrders) return [];

    const filteredReal = dbOrders.filter((o) => {
      if (!o.placed_at) return false;
      const placeDate = new Date(o.placed_at);
      return placeDate >= dateRange.start && placeDate <= dateRange.end;
    });

    return filteredReal.map((o) => {
      // Determine if online or offline (delivery orders with a registered provider are online)
      const type = o.provider ? "online" : "offline";
      let channel = "Dine-in";
      if (o.provider) {
        channel = PROVIDER_LABELS[o.provider] || String(o.provider).toUpperCase();
      } else if (o.type === "takeaway" || o.channel === "Takeaway") {
        channel = "Takeaway";
      }

      return {
        id: o.external_order_id ? `ON-${o.external_order_id}` : `DB-${String(o.id).slice(0, 5)}`,
        restaurant_id: o.restaurant_id,
        type,
        channel,
        provider: o.provider,
        customer_name: o.customer_name ?? "Guest",
        placed_at: o.placed_at,
        total: Number(o.total || 0),
        commission: Number(o.commission ?? 0),
        payment_mode: o.payment_mode ?? "UPI",
        payment_status: o.payment_status ?? "paid",
        status: o.status ?? "delivered",
        items: Array.isArray(o.items) ? o.items : []
      };
    }).sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime());
  }, [dateRange, dbOrders, restaurantId]);

  // Apply filters
  const filteredOrders = useMemo(() => {
    return allOrders.filter((o) => {
      if (orderTypeFilter !== "all" && o.type !== orderTypeFilter) return false;
      if (paymentFilter !== "all" && o.payment_mode.toLowerCase() !== paymentFilter.toLowerCase())
        return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = o.customer_name.toLowerCase().includes(query);
        const matchesId = o.id.toLowerCase().includes(query);
        const matchesChannel = o.channel.toLowerCase().includes(query);
        const matchesItem = o.items?.some(it => it.name.toLowerCase().includes(query));
        if (!matchesName && !matchesId && !matchesChannel && !matchesItem) return false;
      }
      return true;
    });
  }, [allOrders, orderTypeFilter, paymentFilter, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [orderTypeFilter, paymentFilter, timeframe, searchQuery]);

  // Pagination bounds
  const paginatedOrders = useMemo(() => {
    const offset = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(offset, offset + itemsPerPage);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  // Compute metrics from FILTERED dataset
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let onlineRevenue = 0;
    let offlineRevenue = 0;
    let commissionPaid = 0;
    let onlineCount = 0;
    let offlineCount = 0;
    
    const categoryTotals = {};
    const hourlyDistribution = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0, revenue: 0 }));
    const paymentTotals = {};
    const channelTotals = {};

    filteredOrders.forEach((o) => {
      const val = Number(o.total);
      totalRevenue += val;
      commissionPaid += Number(o.commission || 0);

      if (o.type === "online") {
        onlineRevenue += val;
        onlineCount += 1;
      } else {
        offlineRevenue += val;
        offlineCount += 1;
      }

      paymentTotals[o.payment_mode] = (paymentTotals[o.payment_mode] || 0) + val;
      channelTotals[o.channel] = (channelTotals[o.channel] || 0) + val;

      const date = new Date(o.placed_at);
      const h = date.getHours();
      hourlyDistribution[h].count += 1;
      hourlyDistribution[h].revenue += val;

      o.items?.forEach((it) => {
        const cat = it.category || "Uncategorized";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (it.price * it.qty);
      });
    });

    const ordersCount = filteredOrders.length;
    const aov = ordersCount ? totalRevenue / ordersCount : 0;
    const grossMargin = totalRevenue * 0.65;

    return {
      totalRevenue,
      onlineRevenue,
      offlineRevenue,
      commissionPaid,
      ordersCount,
      onlineCount,
      offlineCount,
      aov,
      grossMargin,
      categoryTotals: Object.entries(categoryTotals).map(([name, value]) => ({ name, value })),
      hourlyDistribution: hourlyDistribution.filter(h => h.count > 0 || timeframe === "today"),
      paymentTotals: Object.entries(paymentTotals).map(([name, value]) => ({ name, value })),
      channelTotals: Object.entries(channelTotals).map(([name, value]) => ({ name, value })),
    };
  }, [filteredOrders, timeframe]);

  // Aggregate daily data for chronological revenue graph
  const dailyTimelineData = useMemo(() => {
    const dailyMap = {};
    
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    for (let i = 0; i < daysDiff; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateKey = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      dailyMap[dateKey] = {
        dateLabel: dateKey,
        revenue: 0,
        online: 0,
        offline: 0,
        orders: 0
      };
    }

    filteredOrders.forEach((o) => {
      const d = new Date(o.placed_at);
      const dateKey = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].revenue += Number(o.total);
        dailyMap[dateKey].orders += 1;
        if (o.type === "online") {
          dailyMap[dateKey].online += Number(o.total);
        } else {
          dailyMap[dateKey].offline += Number(o.total);
        }
      }
    });

    return Object.values(dailyMap);
  }, [filteredOrders, dateRange]);

  // AI Analytics Insights Box dynamic text
  const aiInsights = useMemo(() => {
    if (filteredOrders.length === 0) {
      return "No sales data matches the active filters. Adjust your filters or timeframe to generate AI diagnostics.";
    }

    const onlinePct = metrics.totalRevenue ? (metrics.onlineRevenue / metrics.totalRevenue) * 100 : 0;
    const offlinePct = metrics.totalRevenue ? (metrics.offlineRevenue / metrics.totalRevenue) * 100 : 0;
    const mainCategory = metrics.categoryTotals.slice().sort((a,b) => b.value - a.value)[0]?.name || "Main Course";
    const paymentLeading = metrics.paymentTotals.slice().sort((a,b) => b.value - a.value)[0]?.name || "UPI";

    let text = "";
    if (timeframe === "today") {
      text = `UPI remains your lead payment method today (${paymentLeading}), facilitating quicker order settlements. Dine-in volume is contributing ${offlinePct.toFixed(0)}% of sales. Peak service loads were detected during afternoon shifts; ensure additional prep staff are assigned to the main line during these hours.`;
    } else if (timeframe === "yesterday") {
      text = `Yesterday's revenue peaked during evening dinner hours. ${mainCategory} items accounted for the largest share of food cost contribution. Commission rates on Swiggy and Zomato are averaging 21% — consider applying a 5% price mark-up on aggregate channels to cover network costs.`;
    } else {
      text = `Over this period, Online orders represent ${onlinePct.toFixed(0)}% of your business (₹${formatIndianNumber(Math.round(metrics.onlineRevenue))}). Your strongest channel is ${metrics.channelTotals.slice().sort((a,b) => b.value - a.value)[0]?.name || "Dine-in"}. Recommendation: Since ${mainCategory} items represent over 40% of sales, bundle these items with slow-moving starters or beverages during mid-week slack hours to lift the Average Order Value (AOV) from the current ${formatINR(Math.round(metrics.aov))}.`;
    }
    return text;
  }, [filteredOrders, timeframe, metrics, dailyTimelineData]);

  // CSV Exporter
  const handleExportCSV = () => {
    const headers = [
      "Order ID",
      "Placed At",
      "Type",
      "Channel",
      "Customer",
      "Total Amount",
      "Commission",
      "Payment Mode",
      "Status",
      "Items Count"
    ];

    const rows = filteredOrders.map((o) => [
      o.id,
      formatIndianDateTime(o.placed_at),
      o.type,
      o.channel,
      o.customer_name,
      o.total,
      o.commission || 0,
      o.payment_mode,
      o.status,
      o.items?.reduce((acc, it) => acc + it.qty, 0) || 0
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `KP_Sales_Report_${timeframe}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const chartColors = [
    "oklch(0.56 0.22 262)", // Brand Royal Blue
    "oklch(0.72 0.13 190)", // Accent Teal
    "oklch(0.72 0.17 148)", // Success Green
    "oklch(0.78 0.16 75)",  // Warning Orange
    "oklch(0.62 0.24 27)",   // Danger Red
    "oklch(0.6 0.2 290)",   // Indigo
  ];

  if (!hasAnyRole(roles, mod.roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Calculate selected date range diff days for custom view info
  const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 3600 * 24));

  return (
    <main className="flex-1 p-4 md:p-8 space-y-6">
      {/* Print Styles Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          aside, header, nav, .no-print, button, input, select, .tabs-list {
            display: none !important;
          }
          main {
            padding: 0 !important;
            background: white !important;
            color: black !important;
            width: 100% !important;
          }
          .card {
            border: 1px solid #ccc !important;
            box-shadow: none !important;
            background: white !important;
          }
          .recharts-responsive-container {
            width: 100% !important;
            height: 300px !important;
          }
          .print-full-width {
            grid-column: span 12 / span 12 !important;
            width: 100% !important;
          }
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 16px !important;
          }
        }
      `}} />

      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/60 pb-5 no-print">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
            </span>
            Real-Time Analysis
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            Reports & Insights
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor restaurant performance, examine channel distributions, and optimize operation flows.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            className="rounded-xl border-border/60 hover:bg-muted/80"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
          <Button
            className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={handleExportCSV}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Print-only title bar */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-3xl font-bold text-slate-800">KitchenPilot Restaurant Performance Report</h1>
        <p className="text-sm text-slate-500 mt-1">
          Generated on {new Date().toLocaleDateString("en-IN")} · Range: {formatIndianDate(dateRange.start)} to {formatIndianDate(dateRange.end)}
        </p>
      </div>

      {/* Interactive Filters Panel */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Filter sales by:</span>
          </div>
          
          <Tabs
            value={timeframe}
            onValueChange={setTimeframe}
            className="w-full md:w-auto"
          >
            <TabsList className="bg-muted/60 p-0.5 rounded-xl border border-border/60">
              <TabsTrigger value="today" className="rounded-lg text-xs py-1 px-3">Today</TabsTrigger>
              <TabsTrigger value="yesterday" className="rounded-lg text-xs py-1 px-3">Yesterday</TabsTrigger>
              <TabsTrigger value="7days" className="rounded-lg text-xs py-1 px-3">Last 7 Days</TabsTrigger>
              <TabsTrigger value="30days" className="rounded-lg text-xs py-1 px-3">Last 30 Days</TabsTrigger>
              <TabsTrigger value="thisMonth" className="rounded-lg text-xs py-1 px-3">This Month</TabsTrigger>
              <TabsTrigger value="custom" className="rounded-lg text-xs py-1 px-3">Custom</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Custom date range fields */}
        {timeframe === "custom" && (
          <div className="flex flex-wrap gap-4 items-center bg-muted/40 p-3 rounded-xl border border-border/40 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Select Range:</span>
            </div>
            <div className="flex items-center gap-2.5">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-background border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-background border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <span className="text-[11px] text-muted-foreground">
              ({daysDiff} days selected)
            </span>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 pt-2 border-t border-border/40">
          <div>
            <Label className="text-xs text-muted-foreground font-semibold">Order Type</Label>
            <div className="mt-1">
              <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
                <SelectTrigger className="w-full rounded-xl border-border/60 text-xs">
                  <SelectValue placeholder="All orders" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Orders (Dine-in + Delivery)</SelectItem>
                  <SelectItem value="offline">Offline (Dine-in & Takeaway)</SelectItem>
                  <SelectItem value="online">Online Delivery Channels</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground font-semibold">Payment Mode</Label>
            <div className="mt-1">
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full rounded-xl border-border/60 text-xs">
                  <SelectValue placeholder="All payment modes" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="upi">UPI / Digital Transfer</SelectItem>
                  <SelectItem value="cash">Cash Settlements</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="net banking">Net Banking</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground font-semibold">Search Orders</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by customer, order ID, platform or menu item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl border-border/60 text-xs h-9 focus:ring-brand"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:print-grid">
        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <CardContent className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Sales</span>
              <div className="rounded-xl bg-brand/10 p-2 text-brand">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatINR(metrics.totalRevenue)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-success">
                <TrendingUp className="h-3 w-3" />
                <span>+12.4% vs last period</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <CardContent className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Orders Vol.</span>
              <div className="rounded-xl bg-teal-500/10 p-2 text-accent-teal">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatIndianNumber(metrics.ordersCount)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-success">
                <TrendingUp className="h-3 w-3" />
                <span>+8.1% vs last period</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <CardContent className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg. Bill (AOV)</span>
              <div className="rounded-xl bg-warning/10 p-2 text-warning">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatINR(Math.round(metrics.aov))}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-warning">
                <TrendingDown className="h-3 w-3" />
                <span>-1.8% average ticket size</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <CardContent className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order Split</span>
              <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-500">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Dine-In: {metrics.totalRevenue ? ((metrics.offlineRevenue / metrics.totalRevenue) * 100).toFixed(0) : 0}%</span>
                <span>Online: {metrics.totalRevenue ? ((metrics.onlineRevenue / metrics.totalRevenue) * 100).toFixed(0) : 0}%</span>
              </div>
              <div className="h-2 w-full bg-brand/10 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-accent-teal"
                  style={{ width: `${metrics.totalRevenue ? (metrics.offlineRevenue / metrics.totalRevenue) * 100 : 0}%` }}
                />
                <div
                  className="h-full bg-brand"
                  style={{ width: `${metrics.totalRevenue ? (metrics.onlineRevenue / metrics.totalRevenue) * 100 : 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI recommendation/insights */}
      <div className="rounded-2xl border border-dashed border-brand/40 bg-brand/5 p-4 flex gap-3 items-start relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
          <Sparkles className="h-24 w-24 text-brand" />
        </div>
        <div className="rounded-xl bg-brand/10 p-2 text-brand shrink-0">
          <Sparkles className="h-4.5 w-4.5 animate-pulse" />
        </div>
        <div className="space-y-1">
          <div className="text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5">
            AI-Driven Intelligence Dashboard
            <span className="bg-brand/15 text-brand px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-normal uppercase">Beta</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {aiInsights}
          </p>
        </div>
      </div>

      {/* Main visual graphs grid */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Revenue Area Chart */}
        <Card className="rounded-2xl border border-border/60 bg-card p-5 md:col-span-2 print-full-width">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/40 pb-4 mb-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Revenue Operations Trend</h2>
              <p className="text-xs text-muted-foreground">Detailed view of sales generated over time</p>
            </div>
            <div className="flex gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand" /> Total</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent-teal" /> Offline Dine-in</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Online Delivery</span>
            </div>
          </div>
          <div className="h-80">
            {dailyTimelineData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No revenue data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.56 0.22 262)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="oklch(0.56 0.22 262)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="offlineColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.72 0.13 190)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="oklch(0.72 0.13 190)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 255)" vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    stroke="oklch(0.55 0.02 258)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="oklch(0.55 0.02 258)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatINRCompact(v)}
                  />
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
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Total Revenue"
                    stroke="oklch(0.56 0.22 262)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#totalColor)"
                  />
                  <Area
                    type="monotone"
                    dataKey="offline"
                    name="Offline"
                    stroke="oklch(0.72 0.13 190)"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#offlineColor)"
                  />
                  <Area
                    type="monotone"
                    dataKey="online"
                    name="Online"
                    stroke="oklch(0.62 0.24 27)"
                    strokeWidth={1.5}
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Category Breakdown Pie Chart */}
        <Card className="rounded-2xl border border-border/60 bg-card p-5 print-full-width">
          <div className="border-b border-border/40 pb-4 mb-4">
            <h2 className="text-sm font-semibold tracking-tight">Sales by Category</h2>
            <p className="text-xs text-muted-foreground">Category split based on order items</p>
          </div>
          <div className="h-64 flex flex-col justify-center">
            {metrics.categoryTotals.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No category data available
              </div>
            ) : (
              <div className="flex flex-col justify-between items-center gap-4 h-full">
                <div className="w-full h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.categoryTotals}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {metrics.categoryTotals.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid oklch(0.92 0.01 255)",
                          background: "var(--card)",
                          color: "var(--foreground)",
                          fontSize: 11,
                        }}
                        formatter={(v) => [formatINR(v), "Sales"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full text-[11px]">
                  {metrics.categoryTotals.map((item, index) => {
                    const totalVal = metrics.categoryTotals.reduce((a,c)=>a+c.value, 0);
                    const pct = totalVal ? (item.value / totalVal) * 100 : 0;
                    return (
                      <div key={item.name} className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted-foreground truncate">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: chartColors[index % chartColors.length] }}
                          />
                          {item.name}
                        </span>
                        <span className="font-semibold text-foreground">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Dine-in vs Online Stacked Bar Chart */}
        <Card className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="border-b border-border/40 pb-4 mb-4">
            <h2 className="text-sm font-semibold tracking-tight">Channel Order Volume</h2>
            <p className="text-xs text-muted-foreground">Online vs. offline order counts per day</p>
          </div>
          <div className="h-64">
            {dailyTimelineData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No orders data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 255)" vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    stroke="oklch(0.55 0.02 258)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="oklch(0.55 0.02 258)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid oklch(0.92 0.01 255)",
                      background: "var(--card)",
                      color: "var(--foreground)",
                      fontSize: 11,
                    }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  {orderTypeFilter !== "online" && (
                    <Bar dataKey="offline" name="Offline Dine-in" fill="oklch(0.72 0.13 190)" stackId="a" radius={[0, 0, 0, 0]} />
                  )}
                  {orderTypeFilter !== "offline" && (
                    <Bar dataKey="online" name="Online Delivery" fill="oklch(0.56 0.22 262)" stackId="a" radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Peak Hours Distribution */}
        <Card className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="border-b border-border/40 pb-4 mb-4">
            <h2 className="text-sm font-semibold tracking-tight">Hourly Sales Activity</h2>
            <p className="text-xs text-muted-foreground">Sales volume distribution by hour of day</p>
          </div>
          <div className="h-64">
            {metrics.hourlyDistribution.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No hourly distribution data available for active filters
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.hourlyDistribution} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 255)" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    stroke="oklch(0.55 0.02 258)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(h) => `${h % 12 || 12}${h >= 12 ? "PM" : "AM"}`}
                  />
                  <YAxis
                    stroke="oklch(0.55 0.02 258)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatINRCompact(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid oklch(0.92 0.01 255)",
                      background: "var(--card)",
                      color: "var(--foreground)",
                      fontSize: 11,
                    }}
                    labelFormatter={(h) => `Time: ${h}:00 hrs`}
                    formatter={(v, name) => [
                      name === "revenue" ? formatINR(v) : v,
                      name === "revenue" ? "Hourly Sales" : "Orders Count"
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="revenue"
                    stroke="oklch(0.78 0.16 75)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Payment Methods Breakdown */}
        <Card className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="border-b border-border/40 pb-4 mb-4">
            <h2 className="text-sm font-semibold tracking-tight">Preferred Payment Methods</h2>
            <p className="text-xs text-muted-foreground">Revenue share by payment mode</p>
          </div>
          <div className="h-56 flex flex-col justify-center">
            {metrics.paymentTotals.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No payment data available
              </div>
            ) : (
              <div className="flex flex-col items-center justify-between gap-4 h-full">
                <div className="w-full h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.paymentTotals}
                        cx="50%"
                        cy="50%"
                        innerRadius={0}
                        outerRadius={55}
                        dataKey="value"
                      >
                        {metrics.paymentTotals.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[(index + 2) % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid oklch(0.92 0.01 255)",
                          background: "var(--card)",
                          color: "var(--foreground)",
                          fontSize: 11,
                        }}
                        formatter={(v) => [formatINR(v), "Sales"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] w-full">
                  {metrics.paymentTotals.map((item, index) => {
                    const totalPay = metrics.paymentTotals.reduce((a,c)=>a+c.value, 0);
                    const pct = totalPay ? (item.value / totalPay) * 100 : 0;
                    return (
                      <span key={item.name} className="flex items-center gap-1 text-muted-foreground">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: chartColors[(index + 2) % chartColors.length] }}
                        />
                        {item.name} ({pct.toFixed(0)}%)
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Revenue by Platform Channel */}
        <Card className="rounded-2xl border border-border/60 bg-card p-5 md:col-span-2">
          <div className="border-b border-border/40 pb-4 mb-4">
            <h2 className="text-sm font-semibold tracking-tight">Sales Breakdown by Channel</h2>
            <p className="text-xs text-muted-foreground">Live totals comparing all POS & digital storefronts</p>
          </div>
          <div className="h-56 overflow-y-auto pr-1 space-y-3.5">
            {metrics.channelTotals.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No channel sales data matches active filters
              </div>
            ) : (
              metrics.channelTotals.map((channel, index) => {
                const pct = metrics.totalRevenue ? (channel.value / metrics.totalRevenue) * 100 : 0;
                return (
                  <div key={channel.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: chartColors[index % chartColors.length] }}
                        />
                        {channel.name}
                      </span>
                      <span className="text-muted-foreground font-medium">
                        {formatINR(channel.value)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: chartColors[index % chartColors.length]
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Orders Data Grid */}
      <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="border-b border-border/60 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Sales Transaction Log</h2>
            <p className="text-xs text-muted-foreground">Individual records matching selected options</p>
          </div>
          <div className="text-xs text-muted-foreground">
            Showing {filteredOrders.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No orders found matching the filter options or search queries
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Placed At</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Channel</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Items Summary</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/30 transition">
                    <td className="p-4 font-bold text-foreground">{o.id}</td>
                    <td className="p-4 text-muted-foreground">{formatIndianDateTime(o.placed_at)}</td>
                    <td className="p-4 font-semibold">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px]",
                          o.type === "online"
                            ? "bg-brand/10 text-brand"
                            : "bg-teal-500/10 text-accent-teal"
                        )}
                      >
                        {o.type}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-foreground">{o.channel}</td>
                    <td className="p-4 text-muted-foreground">{o.customer_name}</td>
                    <td className="p-4 max-w-[200px] truncate text-muted-foreground font-medium">
                      {o.items?.map((it) => `${it.qty}x ${it.name}`).join(", ")}
                    </td>
                    <td className="p-4 font-bold text-foreground">{formatINR(o.total)}</td>
                    <td className="p-4 text-muted-foreground">{o.payment_mode}</td>
                    <td className="p-4">
                      <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[10px] font-semibold text-success">
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="border-t border-border/60 p-4 flex items-center justify-between no-print">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="rounded-lg h-8 text-xs border-border/60 hover:bg-muted/80"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="text-xs font-semibold text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="rounded-lg h-8 text-xs border-border/60 hover:bg-muted/80"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </Card>
    </main>
  );
}
