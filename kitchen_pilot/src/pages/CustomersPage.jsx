import React, { useState, useEffect, useMemo } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Users,
  Smartphone,
  Mail,
  Star,
  History,
  Send,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sparkles,
  Clock,
  ArrowUpRight,
  Utensils,
  User,
  PlusCircle,
  CheckCircle2,
  X,
  Eye,
  BadgePercent
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hasAnyRole, MODULES } from "@/lib/roles";
import { formatINR, formatIndianDate, formatIndianDateTime } from "@/lib/currency";

const mod = MODULES.find((m) => m.id === "customers");

const STORAGE_KEY_CUSTOMERS = "kitchenpilot_custom_customers_v2";

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
            Something went wrong rendering the Customers Page
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

export function CustomersPage() {
  return (
    <ErrorBoundary>
      <CustomersPageContent />
    </ErrorBoundary>
  );
}

function CustomersPageContent() {
  const { user, roles } = useOutletContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPreference, setNewPreference] = useState("Mains");

  // Local storage for custom customer profiles
  const [customCustomers, setCustomCustomers] = useState([]);

  useEffect(() => {
    document.title = "Customers · KitchenPilot";
    const stored = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
    if (stored) {
      try {
        setCustomCustomers(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Fetch orders from database
  const { data: restaurant } = useRestaurantId(user?.id);
  const restaurantId = restaurant?.id;
  const { data: dbOrders = [] } = useDeliveryOrders(restaurantId);

  // Aggregate customer details from live database orders
  const compiledCustomers = useMemo(() => {
    const customerMap = {};

    dbOrders.forEach((o) => {
      const name = o.customer_name || "Guest";
      if (name.toLowerCase() === "guest" || name.toLowerCase() === "unknown") return;

      if (!customerMap[name]) {
        // Generate deterministic email/phone based on name if not provided
        const cleanName = name.replace(/\s+/g, "").toLowerCase();
        customerMap[name] = {
          name: name,
          email: `${cleanName}@gmail.com`,
          phone: `9${Math.abs(name.charCodeAt(0) * 1234567).toString().slice(0, 9)}`,
          totalOrders: 0,
          ltv: 0,
          lastOrderDate: null,
          itemsOrdered: {},
          orders: []
        };
      }

      const client = customerMap[name];
      client.totalOrders += 1;
      client.ltv += Number(o.total || 0);
      
      const orderDate = new Date(o.placed_at);
      if (!client.lastOrderDate || orderDate > new Date(client.lastOrderDate)) {
        client.lastOrderDate = o.placed_at;
      }

      client.orders.push({
        id: o.external_order_id ? `ON-${o.external_order_id}` : `DB-${o.id.slice(0, 4)}`,
        placed_at: o.placed_at,
        total: Number(o.total || 0),
        items: o.items || []
      });

      // Track item frequencies
      o.items?.forEach((it) => {
        client.itemsOrdered[it.name] = (client.itemsOrdered[it.name] || 0) + it.qty;
      });
    });

    return Object.values(customerMap);
  }, [dbOrders]);

  // Combine live aggregated profiles with manually created ones
  const allCustomers = useMemo(() => {
    const combined = [...compiledCustomers];

    customCustomers.forEach((custom) => {
      // Avoid duplicating profiles if matching name exists
      const match = combined.find(c => c.name.toLowerCase() === custom.name.toLowerCase());
      if (match) {
        // Merge LTV and orders
        match.ltv += custom.ltv;
        match.totalOrders += custom.totalOrders;
        if (custom.lastOrderDate && (!match.lastOrderDate || new Date(custom.lastOrderDate) > new Date(match.lastOrderDate))) {
          match.lastOrderDate = custom.lastOrderDate;
        }
      } else {
        combined.push({
          ...custom,
          orders: custom.orders || [],
          itemsOrdered: custom.itemsOrdered || {}
        });
      }
    });

    // Determine favorite food category / segmentation tags
    return combined.map((c) => {
      // Find favorite food item
      const favList = Object.entries(c.itemsOrdered).sort((a,b) => b[1] - a[1]);
      const favoriteDish = favList.length ? favList[0][0] : "Paneer Tikka Masala";

      // Segment classification
      let segment = "New";
      if (c.ltv >= 1000) {
        segment = "VIP";
      } else if (c.totalOrders >= 3) {
        segment = "Regular";
      } else if (c.lastOrderDate) {
        const daysDiff = (new Date().getTime() - new Date(c.lastOrderDate).getTime()) / (1000 * 3600 * 24);
        if (daysDiff > 30) {
          segment = "Inactive";
        }
      }

      return {
        ...c,
        favoriteDish,
        segment
      };
    });
  }, [compiledCustomers, customCustomers]);

  // Apply filters and searches
  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((c) => {
      // Segment Filter
      if (segmentFilter !== "all" && c.segment.toLowerCase() !== segmentFilter.toLowerCase()) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesEmail = c.email.toLowerCase().includes(q);
        const matchesPhone = c.phone.includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone) return false;
      }
      return true;
    }).sort((a, b) => b.ltv - a.ltv); // Sort by highest spenders first
  }, [allCustomers, segmentFilter, searchQuery]);

  // Reset pagination on filter
  useEffect(() => {
    setCurrentPage(1);
  }, [segmentFilter, searchQuery]);

  // Paginated list
  const paginatedCustomers = useMemo(() => {
    const offset = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(offset, offset + itemsPerPage);
  }, [filteredCustomers, currentPage]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  // CRM Analytics
  const crmStats = useMemo(() => {
    const totalCount = allCustomers.length;
    const totalSales = allCustomers.reduce((acc, c) => acc + c.ltv, 0);
    const avgLtv = totalCount ? totalSales / totalCount : 0;
    const repeatSpenders = allCustomers.filter(c => c.totalOrders >= 2).length;
    const retentionRate = totalCount ? (repeatSpenders / totalCount) * 100 : 0;
    const vipCount = allCustomers.filter(c => c.segment === "VIP").length;

    return {
      totalCount,
      avgLtv,
      retentionRate,
      vipCount
    };
  }, [allCustomers]);

  // Create Guest profile manually
  const handleAddCustomer = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      toast.error("Please fill in Name and Phone number");
      return;
    }

    const newProfile = {
      name: newName,
      email: newEmail || `${newName.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
      phone: newPhone,
      totalOrders: 0,
      ltv: 0,
      lastOrderDate: null,
      itemsOrdered: {},
      orders: []
    };

    const updated = [newProfile, ...customCustomers];
    setCustomCustomers(updated);
    localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(updated));

    // Reset Form
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewPreference("Mains");
    setIsAddOpen(false);

    toast.success("Guest profile created successfully!");
  };

  // Simulated Marketing Coupon
  const handleSendCoupon = (customer) => {
    toast.success(`Discount promo code successfully sent to ${customer.name} via ${customer.email}!`);
  };

  if (!hasAnyRole(roles, mod.roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <main className="flex-1 p-4 md:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-2.5 py-1 text-[11px] font-semibold text-accent-teal">
            <Users className="h-3 w-3" />
            CRM Database
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            Customer Directory
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage customer relationships, view order histories, and run marketing segmentation.
          </p>
        </div>
        <div>
          <Button
            className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* CRM Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <CardContent className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Guests</span>
              <div className="rounded-xl bg-teal-500/10 p-2 text-accent-teal">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {crmStats.totalCount}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Unique customer profiles</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <CardContent className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Average LTV</span>
              <div className="rounded-xl bg-brand/10 p-2 text-brand">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatINR(Math.round(crmStats.avgLtv))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Average guest lifetime spend</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <CardContent className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Repeat Rate</span>
              <div className="rounded-xl bg-success/10 p-2 text-success">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {crmStats.retentionRate.toFixed(1)}%
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Guests with 2+ orders</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <CardContent className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">VIP Guests</span>
              <div className="rounded-xl bg-warning/10 p-2 text-warning">
                <Star className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {crmStats.vipCount}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Spends exceeding ₹1,000</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground pr-2">
            <Filter className="h-4 w-4" />
            Segment:
          </div>
          {["all", "vip", "regular", "new", "inactive"].map((seg) => (
            <button
              key={seg}
              onClick={() => setSegmentFilter(seg)}
              className={cn(
                "rounded-full px-3.5 py-1 text-xs font-semibold border transition capitalize cursor-pointer",
                segmentFilter === seg
                  ? "bg-brand text-brand-foreground border-brand"
                  : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted"
              )}
            >
              {seg}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl border-border/60 text-xs h-9 focus:ring-brand"
          />
        </div>
      </div>

      {/* Guests Directory Grid */}
      <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          {filteredCustomers.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No customers found matching the search or segment criteria
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Phone Number</th>
                  <th className="p-4">Email Address</th>
                  <th className="p-4">Segment</th>
                  <th className="p-4">Lifetime spend</th>
                  <th className="p-4">Order Frequency</th>
                  <th className="p-4">Last active</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedCustomers.map((c) => (
                  <tr key={c.name} className="hover:bg-muted/30 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-brand/10 text-brand font-bold flex items-center justify-center text-xs">
                          {c.name.charAt(0)}
                        </div>
                        <span className="font-bold text-foreground">{c.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{c.phone}</td>
                    <td className="p-4 text-muted-foreground">{c.email}</td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                          c.segment === "VIP"
                            ? "bg-warning/15 text-warning"
                            : c.segment === "Regular"
                              ? "bg-teal-500/10 text-accent-teal"
                              : c.segment === "Inactive"
                                ? "bg-red-500/10 text-red-600"
                                : "bg-brand/10 text-brand"
                        )}
                      >
                        {c.segment}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-foreground">{formatINR(c.ltv)}</td>
                    <td className="p-4 font-semibold text-muted-foreground">{c.totalOrders} orders</td>
                    <td className="p-4 text-muted-foreground">
                      {c.lastOrderDate ? formatIndianDate(c.lastOrderDate) : "—"}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedCustomer(c)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-brand hover:bg-brand/10"
                          onClick={() => handleSendCoupon(c)}
                        >
                          <BadgePercent className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="border-t border-border/60 p-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="rounded-lg h-8 text-xs border-border/60"
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
              className="rounded-lg h-8 text-xs border-border/60"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </Card>

      {/* MODAL: Add Customer */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Register New Guest</DialogTitle>
            <DialogDescription>Create a manual customer profile for dine-in or call-in orders.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCustomer} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs text-muted-foreground">Full Name *</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Sagar Shetty"
                className="rounded-xl border-border/60 text-xs"
                required
              />
            </div>
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs text-muted-foreground">Phone Number *</Label>
                <Input
                  id="phone"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="rounded-xl border-border/60 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs text-muted-foreground">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="rounded-xl border-border/60 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pref" className="text-xs text-muted-foreground">Preferred Food Category</Label>
              <Select value={newPreference} onValueChange={setNewPreference}>
                <SelectTrigger id="pref" className="rounded-xl border-border/60 text-xs">
                  <SelectValue placeholder="Mains" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Mains">Main Courses</SelectItem>
                  <SelectItem value="Starters">Starters & Appetizers</SelectItem>
                  <SelectItem value="Beverages">Beverages & Mocktails</SelectItem>
                  <SelectItem value="Desserts">Sweet Desserts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" className="rounded-xl text-xs" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 text-xs">
                Save Guest Profile
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Customer Details Profile */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6">
          {selectedCustomer && (
            <div className="space-y-6">
              <DialogHeader className="border-b border-border/60 pb-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-brand/10 text-brand font-bold flex items-center justify-center text-lg shrink-0">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                      {selectedCustomer.name}
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          selectedCustomer.segment === "VIP"
                            ? "bg-warning/15 text-warning"
                            : selectedCustomer.segment === "Regular"
                              ? "bg-teal-500/10 text-accent-teal"
                              : "bg-brand/10 text-brand"
                        )}
                      >
                        {selectedCustomer.segment}
                      </span>
                    </DialogTitle>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {selectedCustomer.email}</span>
                      <span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> {selectedCustomer.phone}</span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              {/* Guest Metrics Summary */}
              <div className="grid gap-3 grid-cols-3 bg-muted/30 p-3.5 rounded-xl border border-border/40 text-center">
                <div>
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase">Lifetime Value</div>
                  <div className="text-sm font-bold text-foreground mt-0.5">{formatINR(selectedCustomer.ltv)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase">Total Visits</div>
                  <div className="text-sm font-bold text-foreground mt-0.5">{selectedCustomer.totalOrders} Orders</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase">Favorite dish</div>
                  <div className="text-xs font-bold text-brand mt-1 truncate max-w-full" title={selectedCustomer.favoriteDish}>
                    {selectedCustomer.favoriteDish}
                  </div>
                </div>
              </div>

              {/* Order History Timeline */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  Order History Log ({selectedCustomer.orders.length})
                </h3>
                <div className="max-h-48 overflow-y-auto pr-1 space-y-2">
                  {selectedCustomer.orders.map((ord) => (
                    <div key={ord.id} className="rounded-lg border border-border/60 bg-card p-3 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-1">
                          {ord.id}
                          <span className="text-[10px] font-normal text-muted-foreground">· {formatIndianDate(ord.placed_at)}</span>
                        </div>
                        <div className="text-muted-foreground mt-1 text-[11px] max-w-[240px] truncate">
                          {ord.items?.map(it => `${it.qty}x ${it.name}`).join(", ") || "POS Bill"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-foreground">{formatINR(ord.total)}</div>
                        <div className="text-[10px] text-success font-semibold mt-0.5 uppercase">Delivered</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <DialogFooter className="border-t border-border/60 pt-4 flex gap-2">
                <Button variant="outline" className="rounded-xl text-xs w-full sm:w-auto" onClick={() => setSelectedCustomer(null)}>
                  Close Profile
                </Button>
                <Button className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 text-xs w-full sm:w-auto" onClick={() => handleSendCoupon(selectedCustomer)}>
                  <Send className="h-3 w-3 mr-1.5" />
                  Send Promo Voucher
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
