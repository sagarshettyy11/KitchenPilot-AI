import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Building2,
  Plus,
  Search,
  Filter,
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Loader2,
  ShoppingCart,
  ChefHat,
  Boxes,
  Users,
  Wallet,
  LineChart,
  Plug,
  Table,
  Utensils,
  Settings,
  Mail,
  Phone,
  MapPin,
  Clock,
  Layers,
  Save,
  Check,
  Power
} from "lucide-react";

const ALL_AVAILABLE_MODULES = [
  { id: "pos", name: "POS & Billing", icon: ShoppingCart, desc: "Cashier billing, split checks, order tickets" },
  { id: "tables", name: "Dine-In Tables", icon: Table, desc: "Interactive floor plan, seating & occupancy" },
  { id: "menu", name: "Menu & Categories", icon: Utensils, desc: "Items, variants, modifiers, and recipes" },
  { id: "kitchen", name: "Kitchen KDS", icon: ChefHat, desc: "Live kitchen display system and chef tickets" },
  { id: "inventory", name: "Stock & Inventory", icon: Boxes, desc: "Stock levels, purchase orders, wastage" },
  { id: "customers", name: "Customer CRM", icon: Users, desc: "Customer profiles, loyalty & order history" },
  { id: "finance", name: "Finance & P&L", icon: Wallet, desc: "Shift register, petty cash, accounting" },
  { id: "reports", name: "Analytics & Reports", icon: LineChart, desc: "Sales trends, top sellers, tax export" },
  { id: "integrations", name: "Delivery Integrations", icon: Plug, desc: "Swiggy, Zomato, ONDC & Magicpin hub" },
  { id: "ai", name: "KitchenPilot AI", icon: Sparkles, desc: "Smart chef assistant, demand prediction", badge: "AI" },
  { id: "settings", name: "Hotel Settings", icon: Settings, desc: "General profile, taxes & store setup" },
];

export function AdminHotelsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modals state
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [provisionDrawerOpen, setProvisionDrawerOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activeHotel, setActiveHotel] = useState(null);

  // New hotel form state
  const [newHotel, setNewHotel] = useState({
    name: "",
    business_type: "Fine Dining",
    cuisine: "Multi-Cuisine",
    address: "",
    city: "Bengaluru",
    country: "India",
    currency: "INR",
    contact_email: "",
    contact_phone: "",
    plan_tier: "pro",
    status: "active",
    max_tables: 40,
    max_staff: 20,
    enabled_modules: ALL_AVAILABLE_MODULES.map((m) => m.id),
  });

  // Fetch all restaurants
  const { data: hotels = [], isLoading } = useQuery({
    queryKey: ["admin-hotels-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Filtered hotels
  const filteredHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      const matchesSearch =
        hotel.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hotel.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hotel.cuisine?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hotel.contact_email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPlan =
        selectedPlan === "all" || hotel.plan_tier === selectedPlan;

      const matchesStatus =
        selectedStatus === "all" || (hotel.status || "active") === selectedStatus;

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [hotels, searchTerm, selectedPlan, selectedStatus]);

  // Create Hotel Mutation
  const createHotelMutation = useMutation({
    mutationFn: async (hotelData) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("restaurants")
        .insert({
          owner_id: user?.id,
          name: hotelData.name,
          business_type: hotelData.business_type,
          cuisine: hotelData.cuisine,
          address: hotelData.address,
          city: hotelData.city,
          country: hotelData.country,
          currency: hotelData.currency,
          contact_email: hotelData.contact_email,
          contact_phone: hotelData.contact_phone,
          plan_tier: hotelData.plan_tier,
          status: hotelData.status,
          max_tables: hotelData.max_tables,
          max_staff: hotelData.max_staff,
          enabled_modules: hotelData.enabled_modules,
        })
        .select()
        .single();

      if (error) throw error;

      // Log action in audit logs
      await supabase.from("admin_audit_logs").insert({
        admin_id: user?.id,
        admin_email: user?.email,
        action: "CREATE_HOTEL",
        target_type: "restaurant",
        target_id: data.id,
        target_name: data.name,
        details: { plan_tier: data.plan_tier, modules: data.enabled_modules },
      });

      return data;
    },
    onSuccess: (data) => {
      toast.success(`Hotel "${data.name}" successfully onboarded!`);
      setOnboardModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-hotels-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-restaurants"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to onboard hotel");
    },
  });

  // Update Hotel & Provisioning Mutation
  const updateHotelMutation = useMutation({
    mutationFn: async (updatedData) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("restaurants")
        .update({
          name: updatedData.name,
          business_type: updatedData.business_type,
          cuisine: updatedData.cuisine,
          address: updatedData.address,
          city: updatedData.city,
          country: updatedData.country,
          currency: updatedData.currency,
          contact_email: updatedData.contact_email,
          contact_phone: updatedData.contact_phone,
          gst_number: updatedData.gst_number,
          plan_tier: updatedData.plan_tier,
          status: updatedData.status,
          max_tables: updatedData.max_tables,
          max_staff: updatedData.max_staff,
          enabled_modules: updatedData.enabled_modules,
        })
        .eq("id", updatedData.id);

      if (error) throw error;

      // Log audit
      await supabase.from("admin_audit_logs").insert({
        admin_id: user?.id,
        admin_email: user?.email,
        action: "UPDATE_PROVISIONING",
        target_type: "restaurant",
        target_id: updatedData.id,
        target_name: updatedData.name,
        details: {
          status: updatedData.status,
          plan_tier: updatedData.plan_tier,
          enabled_modules: updatedData.enabled_modules,
        },
      });
    },
    onSuccess: () => {
      toast.success("Hotel settings & module provisioning updated!");
      setProvisionDrawerOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-hotels-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-restaurants"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update hotel");
    },
  });

  // Delete Hotel Mutation
  const deleteHotelMutation = useMutation({
    mutationFn: async (hotelId) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("restaurants").delete().eq("id", hotelId);
      if (error) throw error;

      await supabase.from("admin_audit_logs").insert({
        admin_id: user?.id,
        admin_email: user?.email,
        action: "DELETE_HOTEL",
        target_type: "restaurant",
        target_id: hotelId,
        target_name: activeHotel?.name,
      });
    },
    onSuccess: () => {
      toast.success("Hotel deleted successfully");
      setDeleteConfirmOpen(false);
      setActiveHotel(null);
      queryClient.invalidateQueries({ queryKey: ["admin-hotels-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-restaurants"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete hotel");
    },
  });

  function openProvisioning(hotel) {
    setActiveHotel({
      ...hotel,
      enabled_modules: hotel.enabled_modules || ALL_AVAILABLE_MODULES.map((m) => m.id),
      status: hotel.status || "active",
      plan_tier: hotel.plan_tier || "pro",
      max_tables: hotel.max_tables || 40,
      max_staff: hotel.max_staff || 20,
    });
    setProvisionDrawerOpen(true);
  }

  function toggleModule(moduleId) {
    if (!activeHotel) return;
    const current = activeHotel.enabled_modules || [];
    const updated = current.includes(moduleId)
      ? current.filter((id) => id !== moduleId)
      : [...current, moduleId];

    setActiveHotel({ ...activeHotel, enabled_modules: updated });
  }

  function toggleNewHotelModule(moduleId) {
    const current = newHotel.enabled_modules || [];
    const updated = current.includes(moduleId)
      ? current.filter((id) => id !== moduleId)
      : [...current, moduleId];

    setNewHotel({ ...newHotel, enabled_modules: updated });
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Building2 className="h-7 w-7 text-indigo-400" />
            Hotels & Feature Provisioning
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Centrally manage hotel accounts, allocate feature tiers, and toggle module permissions.
          </p>
        </div>

        <Button
          onClick={() => setOnboardModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl h-11 px-5 shadow-lg shadow-indigo-600/25 transition-all gap-2 self-start md:self-auto"
        >
          <Plus className="h-4 w-4" /> Onboard New Hotel
        </Button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search hotel by name, city, cuisine, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 rounded-xl border-slate-800 bg-slate-950/70 pl-10 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Plan Filter */}
          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
            <SelectTrigger className="w-[140px] h-10 rounded-xl border-slate-800 bg-slate-950/70 text-xs text-slate-200">
              <SelectValue placeholder="All Tiers" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
              <SelectItem value="pro">Pro Plan</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[140px] h-10 rounded-xl border-slate-800 bg-slate-950/70 text-xs text-slate-200">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Hotels Table List */}
      <Card className="bg-slate-900/70 border-slate-800/80 rounded-3xl backdrop-blur-xl text-slate-100 overflow-hidden shadow-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/70 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/60">
                <tr>
                  <th className="px-6 py-4">Hotel / Brand</th>
                  <th className="px-6 py-4">Plan Tier</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Provisioned Modules</th>
                  <th className="px-6 py-4">Limits</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                      Loading hotel records...
                    </td>
                  </tr>
                ) : filteredHotels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No hotels found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredHotels.map((hotel) => {
                    const modules = hotel.enabled_modules || [];
                    const hasAI = modules.includes("ai");
                    const hasPOS = modules.includes("pos");
                    const hasKDS = modules.includes("kitchen");
                    const hasTables = modules.includes("tables");

                    return (
                      <tr key={hotel.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-extrabold text-sm shrink-0 shadow-sm">
                              {hotel.name?.substring(0, 2).toUpperCase() || "KP"}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-base">{hotel.name}</span>
                                {hasAI && (
                                  <Badge className="bg-cyan-950/80 text-cyan-300 border-cyan-800/60 text-[10px] py-0 px-1.5 flex items-center gap-1 font-semibold">
                                    <Sparkles className="h-2.5 w-2.5" /> AI
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                {hotel.city || "Bengaluru"}, {hotel.country || "India"} • {hotel.business_type || "Restaurant"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <Badge
                            variant="outline"
                            className={`capitalize text-xs font-semibold px-2.5 py-1 ${
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

                        <td className="px-6 py-4">
                          <Badge
                            className={`capitalize text-xs font-medium border px-2.5 py-0.5 ${
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
                          <div className="flex flex-wrap items-center gap-1 max-w-xs">
                            {hasPOS && (
                              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 font-medium border border-slate-700">
                                POS
                              </span>
                            )}
                            {hasTables && (
                              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 font-medium border border-slate-700">
                                Tables
                              </span>
                            )}
                            {hasKDS && (
                              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-amber-300 font-medium border border-amber-700/50 bg-amber-950/30">
                                KDS
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400 font-semibold ml-1">
                              +{Math.max(0, modules.length - 3)} more
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-300">
                          <div><span className="font-semibold text-white">{hotel.max_tables || 40}</span> Tables</div>
                          <div className="text-slate-400"><span className="font-semibold text-slate-200">{hotel.max_staff || 20}</span> Staff</div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => openProvisioning(hotel)}
                              className="h-8 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-all gap-1"
                            >
                              <Sliders className="h-3.5 w-3.5" /> Provision
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActiveHotel(hotel);
                                setDeleteConfirmOpen(true);
                              }}
                              className="h-8 w-8 p-0 rounded-xl border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

      {/* Onboard Hotel Modal */}
      <Dialog open={onboardModalOpen} onOpenChange={setOnboardModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-400" />
              Onboard New Hotel / Restaurant
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Register hotel identity, assign plan tier, and customize initial feature modules.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-slate-300">Hotel / Restaurant Name *</Label>
              <Input
                placeholder="e.g. The Oberoi Grand / Burger Shack"
                value={newHotel.name}
                onChange={(e) => setNewHotel({ ...newHotel, name: e.target.value })}
                className="h-10 rounded-xl bg-slate-900 border-slate-800 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Business Format</Label>
              <Select
                value={newHotel.business_type}
                onValueChange={(val) => setNewHotel({ ...newHotel, business_type: val })}
              >
                <SelectTrigger className="h-10 rounded-xl bg-slate-900 border-slate-800 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="Fine Dining">Fine Dining</SelectItem>
                  <SelectItem value="QSR / Fast Food">QSR / Fast Food</SelectItem>
                  <SelectItem value="Hotel Dining">Hotel Dining</SelectItem>
                  <SelectItem value="Cafe / Bakery">Cafe / Bakery</SelectItem>
                  <SelectItem value="Cloud Kitchen">Cloud Kitchen</SelectItem>
                  <SelectItem value="Bar & Pub">Bar & Pub</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Cuisine Focus</Label>
              <Input
                placeholder="e.g. Continental, North Indian"
                value={newHotel.cuisine}
                onChange={(e) => setNewHotel({ ...newHotel, cuisine: e.target.value })}
                className="h-10 rounded-xl bg-slate-900 border-slate-800 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">City & Location</Label>
              <Input
                placeholder="e.g. Bengaluru, Karnataka"
                value={newHotel.city}
                onChange={(e) => setNewHotel({ ...newHotel, city: e.target.value })}
                className="h-10 rounded-xl bg-slate-900 border-slate-800 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Plan Tier</Label>
              <Select
                value={newHotel.plan_tier}
                onValueChange={(val) => setNewHotel({ ...newHotel, plan_tier: val })}
              >
                <SelectTrigger className="h-10 rounded-xl bg-slate-900 border-slate-800 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="starter">Starter (Basic)</SelectItem>
                  <SelectItem value="pro">Pro Plan (Standard)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (Full Suite)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Owner / Manager Email</Label>
              <Input
                type="email"
                placeholder="manager@hotel.com"
                value={newHotel.contact_email}
                onChange={(e) => setNewHotel({ ...newHotel, contact_email: e.target.value })}
                className="h-10 rounded-xl bg-slate-900 border-slate-800 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Contact Phone</Label>
              <Input
                placeholder="+91 98765 43210"
                value={newHotel.contact_phone}
                onChange={(e) => setNewHotel({ ...newHotel, contact_phone: e.target.value })}
                className="h-10 rounded-xl bg-slate-900 border-slate-800 text-xs"
              />
            </div>

            {/* Modules Checkbox selection */}
            <div className="space-y-2 md:col-span-2 pt-2 border-t border-slate-800/80">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span>Provisioned Feature Modules</span>
                <span className="text-[11px] text-indigo-400 lowercase font-normal">
                  {newHotel.enabled_modules.length} selected
                </span>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_AVAILABLE_MODULES.map((mod) => {
                  const Icon = mod.icon;
                  const isChecked = newHotel.enabled_modules.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => toggleNewHotelModule(mod.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition-all ${
                        isChecked
                          ? "bg-indigo-950/60 border-indigo-600/50 text-indigo-200"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${isChecked ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-medium truncate">{mod.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-800 pt-4">
            <Button
              variant="outline"
              onClick={() => setOnboardModalOpen(false)}
              className="border-slate-800 text-slate-400 hover:text-white rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newHotel.name.trim()) {
                  toast.error("Hotel name is required");
                  return;
                }
                createHotelMutation.mutate(newHotel);
              }}
              disabled={createHotelMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl"
            >
              {createHotelMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Provisioning Hotel...
                </>
              ) : (
                "Complete Onboarding"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hotel Feature Provisioning Drawer / Modal */}
      {activeHotel && (
        <Dialog open={provisionDrawerOpen} onOpenChange={setProvisionDrawerOpen}>
          <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-3xl rounded-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-800/80 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-indigo-400" />
                    Manage & Provision: {activeHotel.name}
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs mt-1">
                    Control which services, POS features, and AI copilot tools are enabled for this hotel tenant.
                  </DialogDescription>
                </div>
                <Badge
                  className={`capitalize text-xs font-semibold ${
                    activeHotel.status === "suspended"
                      ? "bg-rose-950/80 text-rose-300 border-rose-800/60"
                      : activeHotel.status === "trial"
                      ? "bg-amber-950/80 text-amber-300 border-amber-800/60"
                      : "bg-emerald-950/80 text-emerald-300 border-emerald-800/60"
                  }`}
                >
                  {activeHotel.status || "active"}
                </Badge>
              </div>
            </DialogHeader>

            <Tabs defaultValue="modules" className="w-full">
              <TabsList className="bg-slate-900 border border-slate-800/80 p-1 rounded-2xl w-full grid grid-cols-3">
                <TabsTrigger value="modules" className="text-xs font-medium rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  Feature Modules ({activeHotel.enabled_modules?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="plan" className="text-xs font-medium rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  Plan & Quotas
                </TabsTrigger>
                <TabsTrigger value="details" className="text-xs font-medium rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  Hotel Info
                </TabsTrigger>
              </TabsList>

              {/* Feature Modules Tab */}
              <TabsContent value="modules" className="mt-4 space-y-4">
                <div className="flex items-center justify-between bg-indigo-950/30 border border-indigo-800/40 p-3 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs text-indigo-200 font-medium">
                      Toggle modules on or off. Disabled modules will disappear instantly from this hotel&apos;s app.
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveHotel({
                          ...activeHotel,
                          enabled_modules: ALL_AVAILABLE_MODULES.map((m) => m.id),
                        })
                      }
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Enable All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ALL_AVAILABLE_MODULES.map((mod) => {
                    const Icon = mod.icon;
                    const isEnabled = (activeHotel.enabled_modules || []).includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                          isEnabled
                            ? "bg-slate-900/90 border-slate-700/80 shadow-sm"
                            : "bg-slate-950/60 border-slate-800/60 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div
                            className={`p-2.5 rounded-xl shrink-0 ${
                              isEnabled
                                ? mod.id === "ai"
                                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                  : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                : "bg-slate-800 text-slate-500 border border-slate-700"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold text-white truncate">{mod.name}</p>
                              {mod.badge && (
                                <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 text-[9px] py-0 px-1">
                                  {mod.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">{mod.desc}</p>
                          </div>
                        </div>

                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => toggleModule(mod.id)}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Plan & Quotas Tab */}
              <TabsContent value="plan" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Subscription Tier</Label>
                    <Select
                      value={activeHotel.plan_tier || "pro"}
                      onValueChange={(val) => setActiveHotel({ ...activeHotel, plan_tier: val })}
                    >
                      <SelectTrigger className="h-10 rounded-xl bg-slate-900 border-slate-800 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                        <SelectItem value="starter">Starter (Basic)</SelectItem>
                        <SelectItem value="pro">Pro Plan (Standard)</SelectItem>
                        <SelectItem value="enterprise">Enterprise (Unlimited)</SelectItem>
                        <SelectItem value="custom">Custom Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Account Status</Label>
                    <Select
                      value={activeHotel.status || "active"}
                      onValueChange={(val) => setActiveHotel({ ...activeHotel, status: val })}
                    >
                      <SelectTrigger className="h-10 rounded-xl bg-slate-900 border-slate-800 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="trial">Trial Period</SelectItem>
                        <SelectItem value="suspended">Suspended / Deactivated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Max Tables Limit</Label>
                    <Input
                      type="number"
                      value={activeHotel.max_tables || 40}
                      onChange={(e) =>
                        setActiveHotel({ ...activeHotel, max_tables: parseInt(e.target.value) || 0 })
                      }
                      className="h-10 rounded-xl bg-slate-900 border-slate-800 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Max Staff Accounts</Label>
                    <Input
                      type="number"
                      value={activeHotel.max_staff || 20}
                      onChange={(e) =>
                        setActiveHotel({ ...activeHotel, max_staff: parseInt(e.target.value) || 0 })
                      }
                      className="h-10 rounded-xl bg-slate-900 border-slate-800 text-xs"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Hotel Info Tab */}
              <TabsContent value="details" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-semibold text-slate-300">Hotel Name</Label>
                    <Input
                      value={activeHotel.name || ""}
                      onChange={(e) => setActiveHotel({ ...activeHotel, name: e.target.value })}
                      className="h-10 rounded-xl bg-slate-900 border-slate-800 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Business Format</Label>
                    <Input
                      value={activeHotel.business_type || ""}
                      onChange={(e) => setActiveHotel({ ...activeHotel, business_type: e.target.value })}
                      className="h-10 rounded-xl bg-slate-900 border-slate-800 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Cuisine</Label>
                    <Input
                      value={activeHotel.cuisine || ""}
                      onChange={(e) => setActiveHotel({ ...activeHotel, cuisine: e.target.value })}
                      className="h-10 rounded-xl bg-slate-900 border-slate-800 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">City</Label>
                    <Input
                      value={activeHotel.city || ""}
                      onChange={(e) => setActiveHotel({ ...activeHotel, city: e.target.value })}
                      className="h-10 rounded-xl bg-slate-900 border-slate-800 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">GST / Tax Number</Label>
                    <Input
                      value={activeHotel.gst_number || ""}
                      onChange={(e) => setActiveHotel({ ...activeHotel, gst_number: e.target.value })}
                      className="h-10 rounded-xl bg-slate-900 border-slate-800 text-xs"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="border-t border-slate-800 pt-4 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setProvisionDrawerOpen(false)}
                className="border-slate-800 text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => updateHotelMutation.mutate(activeHotel)}
                disabled={updateHotelMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl gap-1.5 shadow-lg shadow-indigo-600/25"
              >
                {updateHotelMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Provisioning Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-400 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
              Delete Hotel Record?
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-1">
              Are you sure you want to permanently delete <strong className="text-white">{activeHotel?.name}</strong>? All associated menu items, tables, and orders will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-slate-800 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="border-slate-800 text-slate-400 hover:text-white rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteHotelMutation.mutate(activeHotel?.id)}
              disabled={deleteHotelMutation.isPending}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl"
            >
              {deleteHotelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
