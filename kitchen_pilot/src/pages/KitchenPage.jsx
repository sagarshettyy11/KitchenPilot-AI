import React, { useState, useEffect, useMemo, useRef } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Play,
  Check,
  Truck,
  Bell,
  Volume2,
  AlertCircle,
  Sparkles,
  Timer,
  CheckSquare,
  AlertTriangle,
  Flame,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hasAnyRole, MODULES } from "@/lib/roles";

const mod = MODULES.find((m) => m.id === "kitchen");

const STORAGE_KEY_INVENTORY = "kitchenpilot_inventory_items_v3";
const STORAGE_KEY_MOVEMENTS = "kitchenpilot_stock_movements_v3";

// Menu items ingredient deduction recipes
const RECIPES = {
  "Paneer Tikka Masala": [
    { name: "Paneer", qty: 0.200 },
    { name: "Spices & Oils", qty: 1 }
  ],
  "Chicken Biryani": [
    { name: "Chicken", qty: 0.250 },
    { name: "Basmati Rice", qty: 0.150 },
    { name: "Spices & Oils", qty: 1 }
  ],
  "Butter Naan": [
    { name: "Wheat Flour", qty: 0.100 },
    { name: "Dairy Butter", qty: 0.020 }
  ],
  "Garlic Roti": [
    { name: "Wheat Flour", qty: 0.080 }
  ],
  "Dal Makhani": [
    { name: "Wheat Flour", qty: 0.010 }, // thickener
    { name: "Dairy Butter", qty: 0.030 }
  ],
  "Veg Manchurian": [
    { name: "Mixed Vegetables", qty: 0.150 },
    { name: "Wheat Flour", qty: 0.030 }
  ],
  "Crispy Corn": [
    { name: "Corn Kernels", qty: 0.120 }
  ],
  "Tandoori Soya Chaap": [
    { name: "Soya Chaap", qty: 0.180 },
    { name: "Spices & Oils", qty: 1 }
  ],
  "Mango Lassi": [
    { name: "Dairy Butter", qty: 0.010 }
  ],
  "Masala Chai": [
    { name: "Dairy Butter", qty: 0.005 }
  ],
  "Gulab Jamun": [
    { name: "Wheat Flour", qty: 0.020 }
  ],
  "Brownie with Ice Cream": [
    { name: "Wheat Flour", qty: 0.040 }
  ]
};

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

// Deduct inventory items based on KDS order items
function deductInventory(items, orderId) {
  const storedInv = localStorage.getItem(STORAGE_KEY_INVENTORY);
  const storedMoves = localStorage.getItem(STORAGE_KEY_MOVEMENTS);

  if (!storedInv) return;

  try {
    const inventory = JSON.parse(storedInv);
    const movements = storedMoves ? JSON.parse(storedMoves) : [];
    let deductionsLogged = 0;

    items.forEach((item) => {
      const recipe = RECIPES[item.name];
      if (!recipe) return;

      recipe.forEach((ingredient) => {
        const invItem = inventory.find(i => i.name.toLowerCase() === ingredient.name.toLowerCase());
        if (invItem) {
          const deductQty = ingredient.qty * Number(item.qty || 1);
          invItem.stock = Math.max(0, Number((invItem.stock - deductQty).toFixed(3)));
          
          // Log movement
          movements.unshift({
            id: `move-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            category: invItem.category,
            name: invItem.name,
            amount: deductQty,
            type: "Deduction",
            reason: `Order ${orderId} (${item.qty}x ${item.name})`,
            date: new Date().toISOString()
          });
          deductionsLogged++;
        }
      });
    });

    if (deductionsLogged > 0) {
      localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(inventory));
      localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(movements));
    }
  } catch (e) {
    console.error("Failed to deduct stock:", e);
  }
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
            Something went wrong rendering the Kitchen KDS Page
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

export function KitchenPage() {
  return (
    <ErrorBoundary>
      <KitchenPageContent />
    </ErrorBoundary>
  );
}

function KitchenPageContent() {
  const { user, roles } = useOutletContext();
  const qc = useQueryClient();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousQueueLength = useRef(0);

  // Fetch orders
  const { data: restaurant } = useRestaurantId(user?.id);
  const restaurantId = restaurant?.id;
  const { data: dbOrders = [], isLoading } = useDeliveryOrders(restaurantId);

  // Filter KDS active orders (only accepted, preparing, and ready statuses)
  const activeOrders = useMemo(() => {
    return dbOrders
      .filter((o) => ["accepted", "preparing", "ready"].includes(o.status))
      .map((o) => ({
        ...o,
        items: Array.isArray(o.items) ? o.items : []
      }));
  }, [dbOrders]);

  // Audio speech alert synthesis on new incoming orders
  useEffect(() => {
    const queueOrders = activeOrders.filter(o => o.status === "accepted");
    if (queueOrders.length > previousQueueLength.current) {
      if (soundEnabled && typeof window !== "undefined" && window.speechSynthesis) {
        const utter = new SpeechSynthesisUtterance("New order received in kitchen queue");
        utter.rate = 1.0;
        utter.volume = 0.8;
        window.speechSynthesis.speak(utter);
      }
      toast.info("🔔 New order added to kitchen queue!", { position: "top-right" });
    }
    previousQueueLength.current = queueOrders.length;
  }, [activeOrders, soundEnabled]);

  // Split into active columns
  const queueOrders = useMemo(() => activeOrders.filter(o => o.status === "accepted"), [activeOrders]);
  const preparingOrders = useMemo(() => activeOrders.filter(o => o.status === "preparing"), [activeOrders]);
  const readyOrders = useMemo(() => activeOrders.filter(o => o.status === "ready"), [activeOrders]);

  // KDS Analytics
  const kdsStats = useMemo(() => {
    const totalCount = activeOrders.length;
    const prepCount = preparingOrders.length;
    const readyCount = readyOrders.length;

    // Dynamically calculate average preparation time for active cooking orders (in minutes)
    const prepTimes = preparingOrders.map(o => {
      const diffMs = new Date().getTime() - new Date(o.placed_at).getTime();
      return diffMs / (60 * 1000); // minutes
    });
    const avgPrep = prepTimes.length 
      ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length) 
      : 0;

    return {
      totalCount,
      prepCount,
      readyCount,
      avgPrep
    };
  }, [activeOrders, preparingOrders, readyOrders]);

  // Supabase Mutation to update order status
  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status, items, externalId }) => {
      const { error } = await supabase
        .from("delivery_orders")
        .update({ status })
        .eq("id", orderId);
      if (error) throw error;

      // If order is ready, deduct raw stock
      if (status === "ready") {
        deductInventory(items, externalId || orderId.slice(0, 5));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delivery-orders", restaurantId] });
      toast.success("Order status updated on board");
    },
    onError: (err) => {
      toast.error(`Failed to update status: ${err.message}`);
    }
  });

  if (!hasAnyRole(roles, mod.roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Active duration ticker
  function ActiveTimer({ placedAt }) {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        const diff = Math.floor((new Date().getTime() - new Date(placedAt).getTime()) / 1000);
        setSeconds(diff);
      }, 1000);
      return () => clearInterval(interval);
    }, [placedAt]);

    const minutes = Math.floor(seconds / 60);
    const displaySecs = seconds % 60;

    return (
      <span className={cn(
        "inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-lg text-[10px]",
        minutes >= 15
          ? "bg-destructive/15 text-destructive animate-pulse"
          : minutes >= 8
            ? "bg-warning/15 text-warning"
            : "bg-muted text-muted-foreground"
      )}>
        <Clock className="h-3.5 w-3.5" />
        {minutes}:{displaySecs.toString().padStart(2, "0")} min
      </span>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-6 space-y-6 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* KDS Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4 shrink-0">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
            <ChefHat className="h-3.5 w-3.5" />
            Kitchen Display System (KDS)
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Active Cooking Board</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-xl border-border/60 text-xs h-9 cursor-pointer"
          >
            <Volume2 className={cn("h-4 w-4 mr-2", soundEnabled ? "text-brand" : "text-muted-foreground")} />
            {soundEnabled ? "Voice alert: ON" : "Voice alert: OFF"}
          </Button>
        </div>
      </div>

      {/* Summary KPI Panel */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 shrink-0">
        <Card className="rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Total Active</span>
            <ChefHat className="h-4 w-4 text-brand" />
          </div>
          <div className="text-xl font-bold mt-1 text-foreground">{kdsStats.totalCount} Orders</div>
        </Card>

        <Card className="rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>In Prep Station</span>
            <Flame className="h-4 w-4 text-indigo-500 animate-pulse" />
          </div>
          <div className="text-xl font-bold mt-1 text-foreground">{kdsStats.prepCount} Cooking</div>
        </Card>

        <Card className="rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Ready for Pickup</span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="text-xl font-bold mt-1 text-foreground">{kdsStats.readyCount} Awaiting</div>
        </Card>

        <Card className="rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Avg Prep Time</span>
            <Clock className="h-4 w-4 text-warning" />
          </div>
          <div className="text-xl font-bold mt-1 text-foreground">
            {kdsStats.avgPrep > 0 ? `${kdsStats.avgPrep} min` : "—"}
          </div>
        </Card>
      </div>

      {/* Board Columns */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-x-auto pb-2">
        {/* COLUMN 1: Queue */}
        <div className="flex-1 min-w-[280px] bg-muted/30 border border-border/60 rounded-2xl flex flex-col min-h-0">
          <div className="p-3 border-b border-border/60 flex items-center justify-between shrink-0 bg-muted/40 rounded-t-2xl">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              Incoming Queue ({queueOrders.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {isLoading ? (
              <div className="text-center text-xs text-muted-foreground py-8">Loading board...</div>
            ) : queueOrders.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground/60 py-12">No orders in queue</div>
            ) : (
              queueOrders.map((ord) => (
                <Card key={ord.id} className="rounded-xl border border-border/60 bg-card shadow-sm hover:border-brand/40 transition">
                  <CardContent className="p-4 space-y-3.5">
                    <div className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
                      <span className="font-extrabold text-foreground">
                        #{ord.external_order_id || ord.id.slice(0, 5)}
                      </span>
                      <ActiveTimer placedAt={ord.placed_at} />
                    </div>

                    <div className="space-y-1.5">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="font-bold text-foreground">
                            {it.qty}x {it.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-[10px]">
                      <span className="rounded bg-brand/10 px-1.5 py-0.5 font-bold uppercase text-brand">
                        {ord.provider || "POS"}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => updateStatus.mutate({ orderId: ord.id, status: "preparing", items: ord.items, externalId: ord.external_order_id })}
                        className="rounded-lg bg-brand text-brand-foreground hover:bg-brand/90 text-[10px] h-7 px-2.5"
                      >
                        Start Cook <Play className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: Preparing */}
        <div className="flex-1 min-w-[280px] bg-muted/30 border border-border/60 rounded-2xl flex flex-col min-h-0">
          <div className="p-3 border-b border-border/60 flex items-center justify-between shrink-0 bg-muted/40 rounded-t-2xl">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              Cooking Station ({preparingOrders.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {preparingOrders.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground/60 py-12">No active cooking orders</div>
            ) : (
              preparingOrders.map((ord) => (
                <Card key={ord.id} className="rounded-xl border border-border/60 bg-card shadow-sm hover:border-indigo-400/40 transition">
                  <CardContent className="p-4 space-y-3.5">
                    <div className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
                      <span className="font-extrabold text-foreground">
                        #{ord.external_order_id || ord.id.slice(0, 5)}
                      </span>
                      <ActiveTimer placedAt={ord.placed_at} />
                    </div>

                    <div className="space-y-1.5">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="font-bold text-foreground">
                            {it.qty}x {it.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-[10px]">
                      <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 font-bold uppercase text-indigo-600">
                        {ord.provider || "POS"}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => updateStatus.mutate({ orderId: ord.id, status: "ready", items: ord.items, externalId: ord.external_order_id })}
                        className="rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-[10px] h-7 px-2.5"
                      >
                        Mark Ready <Check className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: Ready for Pickup */}
        <div className="flex-1 min-w-[280px] bg-muted/30 border border-border/60 rounded-2xl flex flex-col min-h-0">
          <div className="p-3 border-b border-border/60 flex items-center justify-between shrink-0 bg-muted/40 rounded-t-2xl">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success" />
              Ready & Packed ({readyOrders.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {readyOrders.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground/60 py-12">No orders awaiting dispatch</div>
            ) : (
              readyOrders.map((ord) => (
                <Card key={ord.id} className="rounded-xl border border-border/60 bg-card shadow-sm hover:border-success/40 transition">
                  <CardContent className="p-4 space-y-3.5">
                    <div className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
                      <span className="font-extrabold text-foreground">
                        #{ord.external_order_id || ord.id.slice(0, 5)}
                      </span>
                      <span className="text-[10px] font-bold text-success flex items-center gap-1 bg-success/10 px-1.5 py-0.5 rounded-lg">
                        <CheckSquare className="h-3 w-3" /> Ready
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>
                            {it.qty}x {it.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-[10px]">
                      <span className="rounded bg-success/10 px-1.5 py-0.5 font-bold uppercase text-success">
                        {ord.provider || "POS"}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => updateStatus.mutate({ orderId: ord.id, status: "delivered", items: ord.items, externalId: ord.external_order_id })}
                        className="rounded-lg bg-success text-white hover:bg-success/95 text-[10px] h-7 px-2.5 font-bold"
                      >
                        Dispatch <Truck className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
