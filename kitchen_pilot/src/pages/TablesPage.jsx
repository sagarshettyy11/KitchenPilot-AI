import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table as TableIcon,
  Plus,
  Search,
  Users,
  QrCode,
  Edit2,
  Trash2,
  Check,
  X,
  Printer,
  Info,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_KEY = "kitchenpilot_tables_data";

const DEFAULT_TABLES = [
  { id: "1", number: "T-1", name: "Window Side", capacity: 4, status: "available" },
  { id: "2", number: "T-2", name: "Window Side", capacity: 2, status: "occupied" },
  { id: "3", number: "T-3", name: "Family Area", capacity: 6, status: "available" },
  { id: "4", number: "T-4", name: "Corner Booth", capacity: 4, status: "reserved" },
  { id: "5", number: "T-5", name: "Bar Counter", capacity: 2, status: "occupied" },
  { id: "6", number: "T-6", name: "Garden Patio", capacity: 8, status: "available" },
];

// Hook to query the user's primary restaurant (or auto-provision one if missing)
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
      // Auto-provision a default restaurant
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

export function TablesPage() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();

  // Queries
  const { data: restaurant, isLoading: isRestaurantLoading } = useRestaurantId(user?.id);
  const restaurantId = restaurant?.id;

  const { data: dbTables, isLoading: isTablesLoading, error: dbTablesError } = useQuery({
    queryKey: ["tables", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tables")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("number", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
    retry: false, // Don't retry endlessly if the table is missing
  });

  // Check if tables table is missing on Supabase
  const isFallbackMode = useMemo(() => {
    if (dbTablesError) {
      const msg = dbTablesError.message || "";
      // PGRST205: relation not found. Also check description for safety
      return dbTablesError.code === "PGRST205" || msg.includes("does not exist");
    }
    return false;
  }, [dbTablesError]);

  // Local state for local storage fallback
  const [localTables, setLocalTables] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Load from local storage if fallback is active
  useEffect(() => {
    if (isFallbackMode) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setLocalTables(JSON.parse(stored));
        } catch (e) {
          setLocalTables(DEFAULT_TABLES);
        }
      } else {
        setLocalTables(DEFAULT_TABLES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TABLES));
      }
    }
  }, [isFallbackMode]);

  // Save helper for fallback mode
  const saveLocalTables = (newTables) => {
    setLocalTables(newTables);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTables));
  };

  // Unified tables array
  const tables = useMemo(() => {
    if (isFallbackMode) return localTables;
    return dbTables || [];
  }, [isFallbackMode, localTables, dbTables]);

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);

  // Active elements for modals
  const [selectedTable, setSelectedTable] = useState(null);

  // Form States (for add/edit)
  const [formNumber, setFormNumber] = useState("");
  const [formName, setFormName] = useState("");
  const [formCapacity, setFormCapacity] = useState(4);
  const [formStatus, setFormStatus] = useState("available");

  // Mutations
  const addMutation = useMutation({
    mutationFn: async (newTable) => {
      if (isFallbackMode) {
        saveLocalTables([...localTables, newTable]);
        return;
      }
      const { error } = await supabase.from("tables").insert({
        id: newTable.id,
        number: newTable.number,
        name: newTable.name,
        capacity: newTable.capacity,
        status: newTable.status,
        restaurant_id: restaurantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Table added successfully");
      queryClient.invalidateQueries({ queryKey: ["tables", restaurantId] });
      setIsAddOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const editMutation = useMutation({
    mutationFn: async (updatedTable) => {
      if (isFallbackMode) {
        const updated = localTables.map((t) => (t.id === updatedTable.id ? updatedTable : t));
        saveLocalTables(updated);
        return;
      }
      const { error } = await supabase
        .from("tables")
        .update({
          number: updatedTable.number,
          name: updatedTable.name,
          capacity: updatedTable.capacity,
          status: updatedTable.status,
        })
        .eq("id", updatedTable.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Table updated successfully");
      queryClient.invalidateQueries({ queryKey: ["tables", restaurantId] });
      setIsEditOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      if (isFallbackMode) {
        const updated = localTables.map((t) => (t.id === id ? { ...t, status } : t));
        saveLocalTables(updated);
        return;
      }
      const { error } = await supabase
        .from("tables")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Table status updated");
      queryClient.invalidateQueries({ queryKey: ["tables", restaurantId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id }) => {
      if (isFallbackMode) {
        const updated = localTables.filter((t) => t.id !== id);
        saveLocalTables(updated);
        return;
      }
      const { error } = await supabase
        .from("tables")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Table deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["tables", restaurantId] });
    },
    onError: (e) => toast.error(e.message),
  });

  // KPI Calculations
  const stats = useMemo(() => {
    const total = tables.length;
    const available = tables.filter((t) => t.status === "available").length;
    const occupied = tables.filter((t) => t.status === "occupied").length;
    const reserved = tables.filter((t) => t.status === "reserved").length;
    const totalSeating = tables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);

    return { total, available, occupied, reserved, totalSeating };
  }, [tables]);

  // Filtered Tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchesSearch =
        t.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tables, searchQuery, statusFilter]);

  // Open Add Modal
  const handleOpenAdd = () => {
    const numbers = tables.map((t) => {
      const match = t.number.match(/(\d+)/);
      return match ? parseInt(match[0], 10) : 0;
    });
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    
    setFormNumber(`T-${maxNum + 1}`);
    setFormName("");
    setFormCapacity(4);
    setFormStatus("available");
    setIsAddOpen(true);
  };

  // Submit Add Table
  const handleAddTable = (e) => {
    e.preventDefault();
    if (!formNumber.trim()) {
      toast.error("Table number is required");
      return;
    }

    const isDuplicate = tables.some(
      (t) => t.number.toLowerCase().trim() === formNumber.toLowerCase().trim()
    );
    if (isDuplicate) {
      toast.error(`Table ${formNumber} already exists`);
      return;
    }

    const newTable = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      number: formNumber.trim(),
      name: formName.trim() || "General Area",
      capacity: parseInt(formCapacity, 10) || 2,
      status: formStatus,
    };

    addMutation.mutate(newTable);
  };

  // Open Edit Modal
  const handleOpenEdit = (table) => {
    setSelectedTable(table);
    setFormNumber(table.number);
    setFormName(table.name);
    setFormCapacity(table.capacity);
    setFormStatus(table.status);
    setIsEditOpen(true);
  };

  // Submit Edit Table
  const handleEditTable = (e) => {
    e.preventDefault();
    if (!formNumber.trim()) {
      toast.error("Table number is required");
      return;
    }

    const isDuplicate = tables.some(
      (t) =>
        t.id !== selectedTable.id &&
        t.number.toLowerCase().trim() === formNumber.toLowerCase().trim()
    );
    if (isDuplicate) {
      toast.error(`Table ${formNumber} already exists`);
      return;
    }

    editMutation.mutate({
      id: selectedTable.id,
      number: formNumber.trim(),
      name: formName.trim() || "General Area",
      capacity: parseInt(formCapacity, 10) || 2,
      status: formStatus,
    });
  };

  // Delete Table
  const handleDeleteTable = (id, number) => {
    if (confirm(`Are you sure you want to delete Table ${number}?`)) {
      deleteMutation.mutate({ id });
    }
  };

  // Quick toggle status directly from the card
  const handleToggleStatus = (id, currentStatus) => {
    const statuses = ["available", "occupied", "reserved"];
    const currentIndex = statuses.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statuses.length;
    const nextStatus = statuses[nextIndex];
    toggleStatusMutation.mutate({ id, status: nextStatus });
  };

  // Open QR Code Modal
  const handleOpenQr = (table) => {
    setSelectedTable(table);
    setIsQrOpen(true);
  };

  // Custom styling classes based on table status
  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "occupied":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "reserved":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground border-border/50";
    }
  };

  const isSyncing = isRestaurantLoading || (isTablesLoading && !isFallbackMode);

  return (
    <main className="flex-1 p-4 md:p-8 bg-background/50 animate-fade-in">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Fallback Mode Dev Banner */}
        {isFallbackMode && (
          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <div className="text-sm font-bold text-amber-500 dark:text-amber-400">Local Storage Fallback Mode Active</div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Database table <code className="px-1 py-0.5 bg-muted rounded font-mono text-[11px] text-foreground border border-border/60">public.tables</code> does not exist on your Supabase instance yet. Changes will be saved locally. Click to copy SQL schema migrations.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-amber-500/25 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer shrink-0 font-medium"
              onClick={() => {
                navigator.clipboard.writeText(`-- Run this SQL in your Supabase SQL Editor:
create table public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  number text not null,
  name text not null,
  capacity integer not null default 4,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, number)
);

grant select, insert, update, delete on public.tables to authenticated;
grant all on public.tables to service_role;
alter table public.tables enable row level security;
create policy "Owners manage their tables" on public.tables for all to authenticated using (exists (select 1 from public.restaurants r where r.id = tables.restaurant_id and r.owner_id = auth.uid())) with check (exists (select 1 from public.restaurants r where r.id = tables.restaurant_id and r.owner_id = auth.uid()));
create trigger trg_tables_updated before update on public.tables for each row execute function public.tg_set_updated_at();`);
                toast.success("SQL schema migration copied to clipboard!");
              }}
            >
              Copy SQL Migration
            </Button>
          </div>
        )}

        {/* Database Connected Status Badge */}
        {!isFallbackMode && !isSyncing && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 text-[11px] font-semibold text-emerald-500 shadow-sm animate-pulse-slow">
            <Database className="h-3.5 w-3.5" /> Database Synced (Supabase Live)
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Table Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure dining rooms, manage live table occupancy, and generate customer self-ordering QR codes.
            </p>
          </div>
          <Button onClick={handleOpenAdd} disabled={isSyncing} className="bg-brand hover:bg-brand/90 text-brand-foreground cursor-pointer shadow-md gap-2 font-medium">
            <Plus className="h-4 w-4" /> Add New Table
          </Button>
        </div>

        {/* Syncing State skeleton */}
        {isSyncing ? (
          <div className="space-y-6">
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="border-border/60 bg-card shadow-sm animate-pulse h-24" />
              ))}
            </div>
            <div className="h-10 w-full bg-muted/30 rounded-xl border border-border/50 animate-pulse" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-border/60 bg-card p-5 h-44 animate-pulse shadow-sm" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Dashboard/KPI Stats Row */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
              <Card className="border-border/60 bg-card shadow-sm">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <div className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Total Tables</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight">{stats.total}</span>
                    <span className="text-xs text-muted-foreground">configured</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-emerald-500/10 bg-emerald-500/5 shadow-sm">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <div className="text-xs font-medium text-emerald-500 tracking-wide uppercase font-semibold">Available</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-emerald-500">{stats.available}</span>
                    <span className="text-xs text-emerald-600/70">ready</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-500/10 bg-amber-500/5 shadow-sm">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <div className="text-xs font-medium text-amber-500 tracking-wide uppercase font-semibold">Occupied</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-amber-500">{stats.occupied}</span>
                    <span className="text-xs text-amber-600/70">active</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-500/10 bg-blue-500/5 shadow-sm">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <div className="text-xs font-medium text-blue-500 tracking-wide uppercase font-semibold">Reserved</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-blue-500">{stats.reserved}</span>
                    <span className="text-xs text-blue-600/70">booked</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card shadow-sm col-span-2 lg:col-span-1">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <div className="text-xs font-medium text-muted-foreground tracking-wide uppercase font-semibold">Total Seating</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-foreground">{stats.totalSeating}</span>
                    <span className="text-xs text-muted-foreground font-medium">seats</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/50 bg-card/40 p-3 shadow-inner">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search table number or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-background/60 border-border/60 focus-visible:ring-brand"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: "all", label: "All Tables" },
                  { id: "available", label: "Available" },
                  { id: "occupied", label: "Occupied" },
                  { id: "reserved", label: "Reserved" },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setStatusFilter(filter.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      statusFilter === filter.id
                        ? "bg-brand text-brand-foreground border-brand shadow-sm font-semibold"
                        : "bg-background/60 text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tables Grid Layout */}
            {filteredTables.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-fade-in">
                {filteredTables.map((table) => {
                  const capArray = Array.from({ length: Math.min(table.capacity, 8) });
                  return (
                    <div
                      key={table.id}
                      className="group relative rounded-2xl border border-border/60 bg-card p-5 shadow-sm hover:shadow-md hover:border-brand/40 transition-all duration-300 flex flex-col justify-between"
                    >
                      {/* Glowing status line */}
                      <div
                        className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl transition-colors ${
                          table.status === "available"
                            ? "bg-emerald-500"
                            : table.status === "occupied"
                              ? "bg-amber-500"
                              : "bg-blue-500"
                        }`}
                      />

                      {/* Card Header */}
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/5 border border-brand/10 text-brand">
                              <TableIcon className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-foreground tracking-tight">{table.number}</h3>
                              <p className="text-xs text-muted-foreground font-medium">{table.name}</p>
                            </div>
                          </div>

                          {/* Quick occupancy switch */}
                          <button
                            onClick={() => handleToggleStatus(table.id, table.status)}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border cursor-pointer flex items-center gap-1.5 capitalize transition-all hover:scale-105 ${getStatusColor(
                              table.status
                            )}`}
                            title="Click to change status"
                          >
                            <span className="relative flex h-1.5 w-1.5">
                              <span
                                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${
                                  table.status === "available"
                                    ? "bg-emerald-400"
                                    : table.status === "occupied"
                                      ? "bg-amber-400"
                                      : "bg-blue-400"
                                }`}
                              />
                              <span
                                className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                                  table.status === "available"
                                    ? "bg-emerald-500"
                                    : table.status === "occupied"
                                      ? "bg-amber-500"
                                      : "bg-blue-500"
                                }`}
                              />
                            </span>
                            {table.status}
                          </button>
                        </div>

                        {/* Capacity indicators */}
                        <div className="mt-6">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <Users className="h-3.5 w-3.5" /> Capacity: {table.capacity} people
                          </div>
                          
                          <div className="mt-3 flex flex-wrap gap-1 bg-muted/40 p-2 rounded-lg border border-border/40">
                            {capArray.map((_, i) => (
                              <div
                                key={i}
                                className={`h-2.5 w-2.5 rounded-full border transition-all ${
                                  table.status === "occupied"
                                    ? "bg-amber-500/60 border-amber-500/20"
                                    : table.status === "reserved"
                                      ? "bg-blue-500/60 border-blue-500/20"
                                      : "bg-emerald-500/30 border-emerald-500/10 group-hover:bg-emerald-500/60"
                                }`}
                              />
                            ))}
                            {table.capacity > 8 && (
                              <span className="text-[9px] font-bold leading-none text-muted-foreground self-center ml-1">
                                +{table.capacity - 8}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenQr(table)}
                          className="flex-1 gap-1.5 text-xs h-8 cursor-pointer hover:bg-brand/5 hover:text-brand hover:border-brand/20 transition-all font-medium"
                        >
                          <QrCode className="h-3.5 w-3.5" /> QR Code
                        </Button>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(table)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
                            title="Edit Table"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTable(table.id, table.number)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer rounded-lg"
                            title="Delete Table"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty Search State */
              <div className="rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <TableIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">No tables found</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                  {searchQuery || statusFilter !== "all"
                    ? "No tables match your search queries or status filters. Try clearing your search parameters."
                    : "Get started by configuring your restaurant layout. Add tables to register seating capacity."}
                </p>
                <div className="mt-6">
                  {searchQuery || statusFilter !== "all" ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                      }}
                      className="cursor-pointer"
                    >
                      Clear Filters
                    </Button>
                  ) : (
                    <Button onClick={handleOpenAdd} className="bg-brand hover:bg-brand/90 text-brand-foreground cursor-pointer">
                      Add Table
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ================= ADD TABLE DIALOG ================= */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border border-border/80">
          <form onSubmit={handleAddTable}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Add New Table</DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Create a table to assign seating capacity and generate an order-and-pay QR code.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 mt-2">
              <div className="grid gap-2">
                <label htmlFor="add-number" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Table Identifier / Number
                </label>
                <Input
                  id="add-number"
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  placeholder="e.g. T-1, Table 12, VIP-1"
                  required
                  className="bg-background border-border/60 focus-visible:ring-brand"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="add-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Location / Section Name
                </label>
                <Input
                  id="add-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Window Side, Second Floor, Terrace"
                  className="bg-background border-border/60 focus-visible:ring-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="add-capacity" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Capacity (Seats)
                  </label>
                  <select
                    id="add-capacity"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(parseInt(e.target.value, 10))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-brand border-border/60 cursor-pointer text-foreground dark:text-foreground [&>option]:text-foreground [&>option]:bg-background"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? "Person" : "People"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label htmlFor="add-status" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Initial Status
                  </label>
                  <select
                    id="add-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-brand border-border/60 cursor-pointer text-foreground dark:text-foreground [&>option]:text-foreground [&>option]:bg-background"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="cursor-pointer" disabled={addMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" className="bg-brand hover:bg-brand/90 text-brand-foreground cursor-pointer font-medium" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Adding..." : "Add Table"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= EDIT TABLE DIALOG ================= */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border border-border/80">
          <form onSubmit={handleEditTable}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Edit Table {selectedTable?.number}</DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Modify table identifier, floor location, capacity, or current status.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 mt-2">
              <div className="grid gap-2">
                <label htmlFor="edit-number" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Table Identifier / Number
                </label>
                <Input
                  id="edit-number"
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  required
                  className="bg-background border-border/60 focus-visible:ring-brand"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="edit-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Location / Section Name
                </label>
                <Input
                  id="edit-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Window Side, Main Hall"
                  className="bg-background border-border/60 focus-visible:ring-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="edit-capacity" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Capacity (Seats)
                  </label>
                  <select
                    id="edit-capacity"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(parseInt(e.target.value, 10))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-brand border-border/60 cursor-pointer text-foreground dark:text-foreground [&>option]:text-foreground [&>option]:bg-background"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? "Person" : "People"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label htmlFor="edit-status" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Current Status
                  </label>
                  <select
                    id="edit-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-brand border-border/60 cursor-pointer text-foreground dark:text-foreground [&>option]:text-foreground [&>option]:bg-background"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="cursor-pointer" disabled={editMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" className="bg-brand hover:bg-brand/90 text-brand-foreground cursor-pointer font-medium" disabled={editMutation.isPending}>
                {editMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= QR CODE MOCK MODAL ================= */}
      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border border-border/80 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Table Stand QR Code</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Customers can scan this to open the menu and place orders.
            </DialogDescription>
          </DialogHeader>

          {/* Table Stand Mock Preview */}
          <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-2xl border border-border/50 my-2">
            <div
              id="printable-qr-stand"
              className="w-full max-w-[280px] bg-white text-slate-900 rounded-2xl border-4 border-slate-900 shadow-2xl p-6 flex flex-col items-center text-center font-sans relative overflow-hidden"
              style={{ minHeight: "360px" }}
            >
              {/* Top Banner accent */}
              <div className="absolute top-0 left-0 right-0 h-3 bg-slate-900" />

              {/* Logo / Brand */}
              <span className="mt-2 text-[10px] uppercase font-bold tracking-widest text-slate-800">KitchenPilot</span>
              <h4 className="text-md font-extrabold text-slate-800 tracking-tight mt-0.5">Dine &amp; Order</h4>

              {/* Table Info Stand Plate */}
              <div className="my-4 bg-slate-900 text-white px-5 py-2.5 rounded-xl shadow-sm">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold leading-none">Table Number</span>
                <span className="text-3xl font-black block mt-0.5 leading-none">{selectedTable?.number}</span>
              </div>

              {/* Mock SVG QR Code Grid */}
              <div className="relative p-3 bg-slate-50 border-2 border-slate-800/20 rounded-2xl shadow-inner my-2 flex items-center justify-center">
                <svg
                  className="w-36 h-36"
                  viewBox="0 0 100 100"
                  shapeRendering="crispEdges"
                >
                  <rect width="100" height="100" fill="#f8fafc" />
                  {/* Position detection markers */}
                  <rect x="0" y="0" width="28" height="28" fill="#0f172a" />
                  <rect x="4" y="4" width="20" height="20" fill="#f8fafc" />
                  <rect x="8" y="8" width="12" height="12" fill="#0f172a" />

                  <rect x="72" y="0" width="28" height="28" fill="#0f172a" />
                  <rect x="76" y="4" width="20" height="20" fill="#f8fafc" />
                  <rect x="80" y="8" width="12" height="12" fill="#0f172a" />

                  <rect x="0" y="72" width="28" height="28" fill="#0f172a" />
                  <rect x="4" y="76" width="20" height="20" fill="#f8fafc" />
                  <rect x="8" y="80" width="12" height="12" fill="#0f172a" />

                  {/* Alignment pattern */}
                  <rect x="76" y="76" width="12" height="12" fill="#0f172a" />
                  <rect x="80" y="80" width="4" height="4" fill="#f8fafc" />

                  {/* Fake QR Data cells */}
                  <rect x="36" y="4" width="8" height="4" fill="#0f172a" />
                  <rect x="52" y="0" width="4" height="8" fill="#0f172a" />
                  <rect x="64" y="8" width="4" height="12" fill="#0f172a" />
                  <rect x="32" y="16" width="12" height="4" fill="#0f172a" />
                  <rect x="48" y="20" width="16" height="4" fill="#0f172a" />
                  <rect x="12" y="32" width="4" height="8" fill="#0f172a" />
                  <rect x="24" y="36" width="8" height="4" fill="#0f172a" />
                  <rect x="40" y="32" width="12" height="4" fill="#0f172a" />
                  <rect x="60" y="36" width="8" height="12" fill="#0f172a" />
                  <rect x="76" y="32" width="16" height="4" fill="#0f172a" />
                  <rect x="4" y="48" width="8" height="4" fill="#0f172a" />
                  <rect x="20" y="44" width="12" height="8" fill="#0f172a" />
                  <rect x="48" y="48" width="4" height="16" fill="#0f172a" />
                  <rect x="68" y="52" width="12" height="4" fill="#0f172a" />
                  <rect x="88" y="44" width="4" height="8" fill="#0f172a" />
                  <rect x="32" y="60" width="8" height="8" fill="#0f172a" />
                  <rect x="16" y="64" width="4" height="4" fill="#0f172a" />
                  <rect x="56" y="68" width="12" height="4" fill="#0f172a" />
                  <rect x="72" y="60" width="4" height="8" fill="#0f172a" />
                  <rect x="88" y="68" width="8" height="4" fill="#0f172a" />
                </svg>
                {/* Center table Icon badge on QR */}
                <div className="absolute inset-0 m-auto h-7 w-7 bg-white rounded-lg border border-slate-900/20 shadow-md flex items-center justify-center text-slate-800 font-extrabold text-[10px]">
                  {selectedTable?.number}
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-3 text-slate-500 text-[10px] font-semibold leading-relaxed">
                Scan to see digital menu<br />&amp; order directly from table
              </div>

              {/* Footer stand code */}
              <div className="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-between text-[9px] text-slate-400 font-mono">
                <span>SECTOR: {selectedTable?.name || "MAIN"}</span>
                <span>ID: {selectedTable?.id.slice(0, 6)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 sm:justify-between w-full">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 self-center font-medium">
              <Info className="h-3.5 w-3.5" /> Ready to print for table tents.
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsQrOpen(false)} className="cursor-pointer">
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  toast.success(`Printing instructions sent for Table ${selectedTable?.number}`);
                  window.print();
                }}
                className="bg-slate-950 text-slate-50 hover:bg-slate-900 cursor-pointer font-medium gap-2 shadow"
              >
                <Printer className="h-4 w-4" /> Print Stand
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
