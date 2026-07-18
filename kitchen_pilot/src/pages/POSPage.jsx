import React, { useState, useEffect, useMemo, useRef } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  Smartphone,
  CreditCard,
  CheckCircle2,
  Utensils,
  ShoppingBag,
  Sparkles,
  RefreshCw,
  X,
  Keyboard,
  ArrowRight,
  Printer
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hasAnyRole, MODULES } from "@/lib/roles";
import { formatINR, formatIndianDateTime } from "@/lib/currency";

const mod = MODULES.find((m) => m.id === "pos");

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
            Something went wrong rendering the POS Page
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

export function POSPage() {
  return (
    <ErrorBoundary>
      <POSPageContent />
    </ErrorBoundary>
  );
}

function POSPageContent() {
  const { user, roles } = useOutletContext();
  const qc = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  
  // Checkout & Cart State
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState("Dine-in");
  const [paymentMode, setPaymentMode] = useState("UPI");

  // Post-checkout Receipt popup State
  const [completedOrder, setCompletedOrder] = useState(null);

  // Fetch restaurant
  const { data: restaurant } = useRestaurantId(user?.id);
  const restaurantId = restaurant?.id;

  // Query Menu Categories & Items
  const { data: dbCategories, error: dbCategoriesError } = useQuery({
    queryKey: ["menu_categories", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
    retry: false,
  });

  const { data: dbItems, error: dbItemsError } = useQuery({
    queryKey: ["menu_items", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
    retry: false,
  });

  // Fallback states
  const isFallbackMode = useMemo(() => {
    if (dbCategoriesError) {
      const msg = dbCategoriesError.message || "";
      return dbCategoriesError.code === "PGRST205" || msg.includes("does not exist");
    }
    if (dbItemsError) {
      const msg = dbItemsError.message || "";
      return dbItemsError.code === "PGRST205" || msg.includes("does not exist");
    }
    return false;
  }, [dbCategoriesError, dbItemsError]);

  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    document.title = "POS Billing · KitchenPilot";
  }, []);

  useEffect(() => {
    if (isFallbackMode) {
      const storedCats = localStorage.getItem("kitchenpilot_menu_categories_data");
      const storedItems = localStorage.getItem("kitchenpilot_menu_items_data");
      if (storedCats && storedItems) {
        try {
          setCategories(JSON.parse(storedCats));
          setMenuItems(JSON.parse(storedItems));
        } catch (e) {
          console.error("Failed to parse fallback menu data", e);
        }
      }
    } else {
      if (dbCategories) setCategories(dbCategories);
      if (dbItems) setMenuItems(dbItems);
    }
  }, [isFallbackMode, dbCategories, dbItems]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter items matching search input
  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];
    return menuItems.filter(item => 
      item.name.toLowerCase().includes(query) && item.is_available
    );
  }, [menuItems, searchTerm]);

  // Popular Quick-Add items
  const quickAddItems = useMemo(() => {
    return menuItems.filter(i => i.is_available).slice(0, 8);
  }, [menuItems]);

  // Add Item to cart
  const addToCart = (item) => {
    if (!item.is_available) {
      toast.warning(`${item.name} is currently out of stock`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });

    setSearchTerm("");
    setShowResults(false);
    searchInputRef.current?.focus();
    toast.success(`Added ${item.name} to ticket`, { duration: 800 });
  };

  // Handle Enter Key
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && searchResults.length > 0) {
      e.preventDefault();
      addToCart(searchResults[0]);
    }
  };

  // Adjust cart quantity
  const updateQty = (id, change) => {
    setCart((prev) => {
      return prev.map((item) => {
        if (item.id === id) {
          const newQty = item.qty + change;
          return newQty > 0 ? { ...item, qty: newQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter(i => i.id !== id));
  };

  // Cart pricing math
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const gst = Math.round(subtotal * 0.05); // 5% GST
    const total = subtotal + gst;
    return { subtotal, gst, total };
  }, [cart]);

  // Checkout order mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error("Cart is empty");

      const itemsJson = cart.map(i => ({
        name: i.name,
        qty: i.qty,
        price: i.price
      }));

      const { data, error } = await supabase
        .from("delivery_orders")
        .insert({
          restaurant_id: restaurantId,
          provider: null, // Offline channel
          type: "offline",
          channel: orderType,
          customer_name: customerName.trim() || "Walk-in Guest",
          placed_at: new Date().toISOString(),
          total: cartTotals.total,
          commission: 0,
          payment_mode: paymentMode,
          payment_status: "paid",
          status: "accepted", // Enters kitchen queue
          items: itemsJson
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("POS order placed and sent to kitchen KDS!");
      qc.invalidateQueries({ queryKey: ["delivery-orders", restaurantId] });
      
      // Load completed receipt data
      setCompletedOrder({
        id: data.external_order_id ? `ON-${data.external_order_id}` : `KP-POS-${String(data.id).slice(0, 5).toUpperCase()}`,
        customer_name: data.customer_name,
        placed_at: data.placed_at,
        total: data.total,
        payment_mode: data.payment_mode,
        items: data.items,
        orderType: data.channel
      });

      // Clear forms
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
    },
    onError: (err) => {
      toast.error(`Checkout failed: ${err.message}`);
    }
  });

  if (!hasAnyRole(roles, mod.roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <main className="flex-1 p-4 md:p-8 space-y-6">
      {/* Thermal printer scoped CSS override styling block */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #invoice-receipt, #invoice-receipt * {
            visibility: visible !important;
          }
          #invoice-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          /* Hide Dialog overlay close button during printing */
          button[class*="absolute right-4 top-4"] {
            display: none !important;
          }
        }
      `}} />

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-2.5 py-1 text-[11px] font-semibold text-accent-teal">
            <ShoppingCart className="h-3.5 w-3.5" />
            POS Terminal
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Register Sale Ticket</h1>
          <p className="text-sm text-muted-foreground">Type or search menu items to compile the guest bill quickly.</p>
        </div>

        {isFallbackMode && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-[11px] font-bold text-warning border border-warning/20">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Offline Mode
          </div>
        )}
      </div>

      {/* Main Grid Layout stretched to full screen on desktop */}
      <div className="grid gap-6 lg:grid-cols-3 lg:h-[calc(100vh-210px)] items-stretch">
        {/* Left Column (col-span-2): Search and Cart items */}
        <div className="lg:col-span-2 flex flex-col space-y-6 h-full min-h-0">
          {/* Search Input Box */}
          <div className="relative shrink-0">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Type item name to add (Press Enter to quick-add first match)..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                onKeyDown={handleKeyDown}
                className="pl-11 rounded-2xl border-border/60 text-sm h-12 focus:ring-brand font-medium shadow-sm bg-card"
              />
              <Keyboard className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60 hidden sm:block" />
            </div>

            {/* Autocomplete Search Dropdown */}
            {showResults && searchTerm.trim() && (
              <Card
                ref={dropdownRef}
                className="absolute left-0 right-0 mt-2 z-50 rounded-2xl border border-border/60 bg-card shadow-xl max-h-72 overflow-y-auto divide-y divide-border/60"
              >
                {searchResults.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No matching available menu items found
                  </div>
                ) : (
                  searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="p-3 text-xs flex items-center justify-between hover:bg-muted/40 transition cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={cn(
                          "h-2 w-2 rounded-full",
                          item.item_type === "veg" ? "bg-success" : "bg-destructive"
                        )} />
                        <div>
                          <span className="font-bold text-foreground">{item.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">({item.description || "Dish"})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-foreground">{formatINR(item.price)}</span>
                        <Button size="xs" className="h-6 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 text-[10px] font-bold">
                          Add +
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </Card>
            )}
          </div>

          {/* Quick Add Section */}
          {!searchTerm.trim() && quickAddItems.length > 0 && (
            <div className="space-y-3 shrink-0">
              <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-brand" />
                Popular Quick Add Items
              </h2>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                {quickAddItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="p-2.5 rounded-xl border border-border/60 bg-card text-left text-xs font-bold text-foreground hover:border-brand/40 shadow-sm transition active:scale-95 flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate max-w-[80px]" title={item.name}>{item.name}</span>
                    <span className="text-[10px] font-extrabold text-brand shrink-0">+{formatINR(item.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cart Table stretched to fill remaining height */}
          <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden flex-1 flex flex-col min-h-0 shadow-sm">
            <div className="border-b border-border/60 p-4 shrink-0 bg-muted/20 flex items-center justify-between">
              <h2 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4 text-brand" />
                Ticket Billing Items ({cart.length})
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-[10px] font-bold text-destructive hover:underline cursor-pointer border-none bg-transparent"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-[220px]">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-xs text-muted-foreground/60 space-y-2 py-12">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground/45" />
                  <span>Your active ticket is empty. Type in the search box to add items.</span>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-semibold sticky top-0 z-10">
                      <th className="p-3">Item Detail</th>
                      <th className="p-3 text-center">Quantity</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Subtotal</th>
                      <th className="p-3 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {cart.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30 transition">
                        <td className="p-3 font-bold text-foreground">{item.name}</td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => updateQty(item.id, -1)}
                              className="p-1 text-muted-foreground hover:bg-muted rounded-lg cursor-pointer"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="font-extrabold font-mono text-[11px] w-6 text-center">{item.qty}</span>
                            <button
                              onClick={() => updateQty(item.id, 1)}
                              className="p-1 text-muted-foreground hover:bg-muted rounded-lg cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground font-medium">{formatINR(item.price)}</td>
                        <td className="p-3 font-extrabold text-foreground">{formatINR(item.price * item.qty)}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Checkout details summary */}
        <div className="h-full flex flex-col">
          <Card className="rounded-2xl border border-border/60 bg-card p-5 space-y-5 h-full flex flex-col justify-between shadow-sm">
            <div className="space-y-5">
              <div className="border-b border-border/40 pb-4">
                <h2 className="text-sm font-semibold tracking-tight">Checkout Summary</h2>
                <p className="text-xs text-muted-foreground">Select checkout specs and complete order ticket</p>
              </div>

              {/* Order Settings */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Order Channel Type</span>
                  <div className="flex border border-border/60 rounded-xl overflow-hidden h-9 bg-muted/20">
                    {["Dine-in", "Takeaway"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setOrderType(type)}
                        className={cn(
                          "flex-1 text-xs font-bold cursor-pointer transition",
                          orderType === type ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Payment Mode</span>
                  <div className="flex border border-border/60 rounded-xl overflow-hidden h-9 bg-muted/20">
                    {["UPI", "Cash", "Card"].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={cn(
                          "flex-1 text-xs font-bold cursor-pointer transition",
                          paymentMode === mode ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Guest inputs */}
              <div className="space-y-3 pt-3 border-t border-border/40">
                <div className="space-y-1">
                  <Label htmlFor="custName" className="text-xs text-muted-foreground">Guest Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                    <Input
                      id="custName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Rahul Verma"
                      className="pl-9 rounded-xl border-border/60 text-xs h-9 focus:ring-brand"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="custPhone" className="text-xs text-muted-foreground">Guest Phone</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                    <Input
                      id="custPhone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="9876543210"
                      className="pl-9 rounded-xl border-border/60 text-xs h-9 focus:ring-brand"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Totals & Submit button at bottom */}
            <div className="space-y-4 pt-4 border-t border-border/40">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatINR(cartTotals.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>CGST & SGST (5%)</span>
                  <span>{formatINR(cartTotals.gst)}</span>
                </div>
                <div className="flex justify-between items-center font-extrabold text-foreground text-sm border-t border-border/40 pt-3">
                  <span>Grand Total</span>
                  <span className="text-lg text-brand font-black">{formatINR(cartTotals.total)}</span>
                </div>
              </div>

              <Button
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending || cart.length === 0}
                className="w-full rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 font-bold h-11 flex items-center justify-center text-xs cursor-pointer"
              >
                {checkoutMutation.isPending ? (
                  <span className="flex items-center gap-1.5"><RefreshCw className="h-4 w-4 animate-spin" /> Placing Order…</span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    Confirm POS Order <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* INVOICE TAX RECEIPT MODAL DIALOG */}
      <Dialog open={!!completedOrder} onOpenChange={() => setCompletedOrder(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-5 gap-0">
          {completedOrder && (
            <div className="space-y-4">
              <DialogHeader className="pb-3 border-b border-border/60">
                <DialogTitle className="text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  POS Order Successful
                </DialogTitle>
                <DialogDescription className="text-[11px]">Tax Invoice receipt has been generated successfully.</DialogDescription>
              </DialogHeader>

              {/* Printable receipt card */}
              <div
                id="invoice-receipt"
                className="bg-white text-zinc-900 p-4 rounded-xl border border-zinc-200 shadow-sm font-mono text-[11px] leading-relaxed select-all"
              >
                <div className="text-center space-y-1">
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-black">
                    {restaurant?.name || "KITCHENPILOT CAFE"}
                  </h3>
                  <p className="text-[9px] text-zinc-500">GSTIN: 27KIPIL1234F1Z0</p>
                  <p className="text-[9px] text-zinc-500 font-bold">TAX INVOICE / CASH MEMO</p>
                </div>
                
                <div className="border-t border-dashed border-zinc-300 my-3 pt-2 space-y-1 text-zinc-700">
                  <div className="flex justify-between">
                    <span>Ticket ID:</span>
                    <span className="font-bold text-black">{completedOrder.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{formatIndianDateTime(completedOrder.placed_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Guest:</span>
                    <span className="font-semibold text-black">{completedOrder.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Channel:</span>
                    <span className="font-semibold text-black">{completedOrder.orderType}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-zinc-300 my-2 pt-2">
                  <div className="grid grid-cols-12 font-bold mb-1 border-b border-zinc-200 pb-1 text-black">
                    <span className="col-span-6">Dish Name</span>
                    <span className="col-span-2 text-center">Qty</span>
                    <span className="col-span-4 text-right">Total</span>
                  </div>
                  <div className="space-y-1 text-zinc-800">
                    {completedOrder.items?.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-12">
                        <span className="col-span-6 truncate">{it.name}</span>
                        <span className="col-span-2 text-center">{it.qty}</span>
                        <span className="col-span-4 text-right">{formatINR(it.price * it.qty)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-dashed border-zinc-300 my-3 pt-2 space-y-1 text-zinc-700">
                  <div className="flex justify-between text-[10px]">
                    <span>Subtotal:</span>
                    <span>{formatINR(Math.round(completedOrder.total / 1.05))}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>GST Tax (5%):</span>
                    <span>{formatINR(completedOrder.total - Math.round(completedOrder.total / 1.05))}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-xs border-t border-zinc-200 pt-1.5 mt-1 text-black">
                    <span>Grand Total:</span>
                    <span>{formatINR(completedOrder.total)}</span>
                  </div>
                  <div className="flex justify-between text-[9px] pt-1">
                    <span>Paid Mode:</span>
                    <span className="font-bold text-black">{completedOrder.payment_mode}</span>
                  </div>
                </div>

                <div className="text-center text-[9px] text-zinc-500 border-t border-dashed border-zinc-300 pt-3 mt-3">
                  Thank You! Visit Again.
                </div>
              </div>

              {/* Action Buttons */}
              <DialogFooter className="flex gap-2.5 pt-2 border-t border-border/40">
                <Button variant="ghost" className="rounded-xl text-xs flex-1" onClick={() => setCompletedOrder(null)}>
                  Close
                </Button>
                <Button className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 text-xs flex-1 font-bold" onClick={() => {
                  window.print();
                }}>
                  <Printer className="h-3.5 w-3.5 mr-1.5" />
                  Print Receipt
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
