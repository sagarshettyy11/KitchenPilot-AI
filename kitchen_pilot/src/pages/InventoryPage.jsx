import React, { useState, useEffect, useMemo } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  History,
  Sparkles,
  TrendingDown,
  RefreshCcw,
  PlusCircle,
  MinusCircle,
  Filter,
  ArrowDown,
  ArrowUp,
  X,
  PackageCheck
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

const mod = MODULES.find((m) => m.id === "inventory");

const STORAGE_KEY_INVENTORY = "kitchenpilot_inventory_items_v3";
const STORAGE_KEY_MOVEMENTS = "kitchenpilot_stock_movements_v3";

// No pre-seeded catalog schema.


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
            Something went wrong rendering the Inventory Page
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

export function InventoryPage() {
  return (
    <ErrorBoundary>
      <InventoryPageContent />
    </ErrorBoundary>
  );
}

function InventoryPageContent() {
  const { user, roles } = useOutletContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Local state persistence
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [refillItem, setRefillItem] = useState(null);
  const [refillAmount, setRefillAmount] = useState("");

  // Add Item form state
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Staples");
  const [newStock, setNewStock] = useState("");
  const [newUnit, setNewUnit] = useState("kg");
  const [newReorder, setNewReorder] = useState("");
  const [newCost, setNewCost] = useState("");

  useEffect(() => {
    document.title = "Inventory Management · KitchenPilot";
    
    // Inventory Items
    const storedInv = localStorage.getItem(STORAGE_KEY_INVENTORY);
    if (storedInv) {
      try {
        setInventory(JSON.parse(storedInv));
      } catch (e) {
        setInventory([]);
      }
    } else {
      setInventory([]);
      localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify([]));
    }

    // Movements
    const storedMoves = localStorage.getItem(STORAGE_KEY_MOVEMENTS);
    if (storedMoves) {
      try {
        setMovements(JSON.parse(storedMoves));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Filter lists
  const filteredInventory = useMemo(() => {
    return inventory.map((item) => {
      // Determine status
      let status = "In Stock";
      if (item.stock === 0) {
        status = "Out of Stock";
      } else if (item.stock <= item.reorder) {
        status = "Low Stock";
      }
      return { ...item, status };
    }).filter((item) => {
      // Category Filter
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;

      // Status Filter
      if (statusFilter !== "all" && item.status.toLowerCase() !== statusFilter.toLowerCase()) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!item.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [inventory, categoryFilter, statusFilter, searchQuery]);

  // Inventory stats
  const inventoryStats = useMemo(() => {
    const totalItems = inventory.length;
    const categoriesCount = new Set(inventory.map(i => i.category)).size;
    const lowStockCount = inventory.filter(i => i.stock > 0 && i.stock <= i.reorder).length;
    const outOfStockCount = inventory.filter(i => i.stock === 0).length;

    return {
      totalItems,
      categoriesCount,
      lowStockCount,
      outOfStockCount
    };
  }, [inventory]);

  // Add stock refilling action
  const handleRefillStock = (e) => {
    e.preventDefault();
    if (!refillItem || !refillAmount || Number(refillAmount) <= 0) {
      toast.error("Please enter a valid amount to refill");
      return;
    }

    const refillVal = Number(refillAmount);
    const updatedInv = inventory.map((item) => {
      if (item.id === refillItem.id) {
        return {
          ...item,
          stock: Number((item.stock + refillVal).toFixed(3))
        };
      }
      return item;
    });

    const newMovement = {
      id: `move-${Date.now()}`,
      category: refillItem.category,
      name: refillItem.name,
      amount: refillVal,
      type: "Refill",
      reason: "Manual Stock Add",
      date: new Date().toISOString()
    };

    const updatedMoves = [newMovement, ...movements];

    setInventory(updatedInv);
    setMovements(updatedMoves);
    localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(updatedInv));
    localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(updatedMoves));

    // Reset Form
    setRefillAmount("");
    setRefillItem(null);
    toast.success(`Successfully refilled ${refillVal} ${refillItem.unit} of ${refillItem.name}!`);
  };

  // Add custom raw material item
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newReorder || !newCost) {
      toast.error("Please fill in Name, Reorder point, and Unit cost");
      return;
    }

    const startingStock = newStock ? Number(newStock) : 0;
    const newIngredient = {
      id: `i-${Date.now()}`,
      name: newName,
      category: newCategory,
      stock: startingStock,
      unit: newUnit,
      reorder: Number(newReorder),
      cost: Number(newCost)
    };

    const updatedInv = [...inventory, newIngredient];
    setInventory(updatedInv);
    localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(updatedInv));

    if (startingStock > 0) {
      const newMovement = {
        id: `move-${Date.now()}`,
        category: newCategory,
        name: newName,
        amount: startingStock,
        type: "Refill",
        reason: "Initial Stock Set",
        date: new Date().toISOString()
      };
      const updatedMoves = [newMovement, ...movements];
      setMovements(updatedMoves);
      localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(updatedMoves));
    }

    // Reset Form
    setNewName("");
    setNewCategory("Staples");
    setNewStock("");
    setNewUnit("kg");
    setNewReorder("");
    setNewCost("");
    setIsAddOpen(false);

    toast.success("Ingredient registered in raw catalog!");
  };

  // Delete raw item from list
  const handleDeleteItem = (id, name) => {
    const updatedInv = inventory.filter(i => i.id !== id);
    setInventory(updatedInv);
    localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(updatedInv));
    toast.success(`${name} removed from inventory list.`);
  };

  if (!hasAnyRole(roles, mod.roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Get status color tag
  const getStatusClasses = (status) => {
    switch (status) {
      case "Out of Stock": return "bg-destructive/15 text-destructive border-destructive/20";
      case "Low Stock": return "bg-warning/15 text-warning border-warning/20 animate-pulse";
      default: return "bg-success/15 text-success border-success/20";
    }
  };

  return (
    <main className="flex-1 p-4 md:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-2.5 py-1 text-[11px] font-semibold text-indigo-600">
            <Boxes className="h-3.5 w-3.5" />
            Raw Material Stocks
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Inventory Manager</h1>
          <p className="text-sm text-muted-foreground">
            Monitor raw material levels, track ingredient consumption, and refill items.
          </p>
        </div>
        <div>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Raw Material
          </Button>
        </div>
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <CardContent className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Raw items</span>
              <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-600">
                <Boxes className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {inventoryStats.totalItems} Items
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Across {inventoryStats.categoriesCount} categories</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <CardContent className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Low Stock alerts</span>
              <div className="rounded-xl bg-warning/10 p-2 text-warning">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {inventoryStats.lowStockCount} Items
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Below critical reorder points</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <CardContent className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Out of Stock</span>
              <div className="rounded-xl bg-destructive/10 p-2 text-destructive">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {inventoryStats.outOfStockCount} Items
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Ingredients set at 0 quantity</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <CardContent className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">KDS Connections</span>
              <div className="rounded-xl bg-success/10 p-2 text-success">
                <PackageCheck className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                Active & Live
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Menu deductions connected to KDS</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Controls */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 flex flex-col lg:flex-row items-center gap-4 justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search raw material name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl border-border/60 text-xs h-9 focus:ring-brand"
            />
          </div>

          <div className="w-full sm:w-40">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="rounded-xl border-border/60 text-xs h-9">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Staples">Staples & Flour</SelectItem>
                <SelectItem value="Dairy">Dairy Products</SelectItem>
                <SelectItem value="Poultry">Poultry & Meat</SelectItem>
                <SelectItem value="Veggies">Fresh Vegetables</SelectItem>
                <SelectItem value="Other">Other Items</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-40">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-xl border-border/60 text-xs h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="in stock">In Stock</SelectItem>
                <SelectItem value="low stock">Low Stock</SelectItem>
                <SelectItem value="out of stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Layout Split: Inventory Table and Log movements list */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ingredient Stock Ledger Grid */}
        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden lg:col-span-2">
          <div className="overflow-x-auto">
            {filteredInventory.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No raw materials found matching filters
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-semibold">
                    <th className="p-4">Raw Ingredient</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Stock Level</th>
                    <th className="p-4">Reorder Limit</th>
                    <th className="p-4">Est Cost/Unit</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition">
                      <td className="p-4 font-bold text-foreground">{item.name}</td>
                      <td className="p-4 text-muted-foreground">{item.category}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-foreground">
                            {item.stock} {item.unit}
                          </span>
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-bold border",
                            getStatusClasses(item.status)
                          )}>
                            {item.status}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-muted-foreground">
                        {item.reorder} {item.unit}
                      </td>
                      <td className="p-4 font-medium text-foreground">
                        {formatINR(item.cost)} / {item.unit}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRefillItem(item)}
                            className="rounded-lg text-[10px] h-7 px-2 border-border/60 text-brand font-bold cursor-pointer"
                          >
                            Refill
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Stock movement log history */}
        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden flex flex-col h-[500px]">
          <div className="border-b border-border/60 p-4 shrink-0 bg-muted/20">
            <h2 className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
              <History className="h-4 w-4 text-muted-foreground" />
              Stock Movement History
            </h2>
            <p className="text-[11px] text-muted-foreground">Log of KDS deductions and manual refills</p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/60 p-1 min-h-0">
            {movements.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground/60">
                No stock movements logged yet
              </div>
            ) : (
              movements.map((move) => (
                <div key={move.id} className="p-3 text-xs flex items-center justify-between hover:bg-muted/20 transition">
                  <div>
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      {move.name}
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded",
                        move.type === "Refill" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      )}>
                        {move.type}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-medium truncate max-w-[200px]" title={move.reason}>
                      {move.reason}
                    </div>
                    <div className="text-[9px] text-muted-foreground/80 mt-0.5">
                      {formatIndianDateTime(move.date)}
                    </div>
                  </div>

                  <span className={cn(
                    "font-bold font-mono text-xs flex items-center gap-0.5",
                    move.type === "Refill" ? "text-success" : "text-destructive"
                  )}>
                    {move.type === "Refill" ? "+" : "-"}
                    {move.amount}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* MODAL: Add Raw Material */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Register Raw Material</DialogTitle>
            <DialogDescription>Add a new ingredient category to your inventory database.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs text-muted-foreground">Ingredient Name *</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Fresh Cream"
                className="rounded-xl border-border/60 text-xs"
                required
              />
            </div>
            
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="category" className="text-xs text-muted-foreground">Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger id="category" className="rounded-xl border-border/60 text-xs">
                    <SelectValue placeholder="Staples" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Staples">Staples & Flour</SelectItem>
                    <SelectItem value="Dairy">Dairy Products</SelectItem>
                    <SelectItem value="Poultry">Poultry & Meat</SelectItem>
                    <SelectItem value="Veggies">Fresh Vegetables</SelectItem>
                    <SelectItem value="Other">Other Items</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="unit" className="text-xs text-muted-foreground">Unit</Label>
                <Select value={newUnit} onValueChange={setNewUnit}>
                  <SelectTrigger id="unit" className="rounded-xl border-border/60 text-xs">
                    <SelectValue placeholder="kg" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="kg">kilograms (kg)</SelectItem>
                    <SelectItem value="Liters">Liters (L)</SelectItem>
                    <SelectItem value="units">units (qty)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="stock" className="text-xs text-muted-foreground">Starting Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  step="0.01"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  placeholder="0.0"
                  className="rounded-xl border-border/60 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="reorder" className="text-xs text-muted-foreground">Reorder Limit *</Label>
                <Input
                  id="reorder"
                  type="number"
                  step="0.01"
                  value={newReorder}
                  onChange={(e) => setNewReorder(e.target.value)}
                  placeholder="e.g. 5"
                  className="rounded-xl border-border/60 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cost" className="text-xs text-muted-foreground">Cost per Unit *</Label>
                <Input
                  id="cost"
                  type="number"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  placeholder="e.g. 150"
                  className="rounded-xl border-border/60 text-xs"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" className="rounded-xl text-xs" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 text-xs">
                Register Material
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Refill stock */}
      <Dialog open={!!refillItem} onOpenChange={() => setRefillItem(null)}>
        <DialogContent className="sm:max-w-xs rounded-2xl">
          {refillItem && (
            <form onSubmit={handleRefillStock} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Refill {refillItem.name}</DialogTitle>
                <DialogDescription>
                  Add stock received from supplies vendor.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1 py-1">
                <Label htmlFor="refillAmt" className="text-xs text-muted-foreground">Quantity to Add ({refillItem.unit}) *</Label>
                <Input
                  id="refillAmt"
                  type="number"
                  step="0.01"
                  value={refillAmount}
                  onChange={(e) => setRefillAmount(e.target.value)}
                  placeholder="e.g. 10"
                  className="rounded-xl border-border/60 text-xs h-9"
                  required
                  autoFocus
                />
              </div>
              <DialogFooter className="flex gap-2">
                <Button type="button" variant="ghost" className="rounded-xl text-xs" onClick={() => setRefillItem(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 text-xs h-9">
                  Confirm Refill
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
