import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Save,
  Tag,
  Package,
  Layers,
  Sparkles,
  CheckCircle2
} from "lucide-react";
import { formatINR } from "@/lib/currency";

export const EXPENSE_CATEGORIES = [
  "Raw Materials",
  "Dairy & Poultry",
  "Packaging",
  "Utilities",
  "Maintenance",
  "Staff & Payroll",
  "Operations",
  "Marketing",
  "Miscellaneous / Other",
];

export const COMMON_UNITS = [
  "kg",
  "litres",
  "units",
  "boxes",
  "pack",
  "cans",
  "cylinders",
  "month",
  "fixed",
];

export function ExpenseMasterCatalogModal({ open, onOpenChange, restaurantId }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "Raw Materials",
    default_unit: "units",
    default_cost: "",
    description: "",
  });

  // Fetch master items
  const { data: masterItems = [], isLoading } = useQuery({
    queryKey: ["expense-master-items", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("expense_master_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId,
  });

  // Add Item Mutation
  const addMutation = useMutation({
    mutationFn: async (itemData) => {
      const { data, error } = await supabase
        .from("expense_master_items")
        .insert({
          restaurant_id: restaurantId,
          name: itemData.name,
          category: itemData.category,
          default_unit: itemData.default_unit,
          default_cost: parseFloat(itemData.default_cost) || 0,
          description: itemData.description,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`"${data.name}" added to master expense items!`);
      setIsAdding(false);
      setFormData({
        name: "",
        category: "Raw Materials",
        default_unit: "units",
        default_cost: "",
        description: "",
      });
      queryClient.invalidateQueries({ queryKey: ["expense-master-items", restaurantId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add master item");
    },
  });

  // Update Item Mutation
  const updateMutation = useMutation({
    mutationFn: async (itemData) => {
      const { error } = await supabase
        .from("expense_master_items")
        .update({
          name: itemData.name,
          category: itemData.category,
          default_unit: itemData.default_unit,
          default_cost: parseFloat(itemData.default_cost) || 0,
          description: itemData.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemData.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Master item updated!");
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["expense-master-items", restaurantId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update item");
    },
  });

  // Delete Item Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("expense_master_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Master item deleted");
      queryClient.invalidateQueries({ queryKey: ["expense-master-items", restaurantId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete item");
    },
  });

  function startEdit(item) {
    setEditingItem({
      id: item.id,
      name: item.name,
      category: item.category,
      default_unit: item.default_unit,
      default_cost: item.default_cost || "",
      description: item.description || "",
    });
  }

  const filteredItems = masterItems.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat =
      selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-3xl rounded-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Boxes className="h-5 w-5 text-brand" />
                Master Expense Items Catalog
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Configure standard supplies, recurring bills, and inventory items required for your restaurant.
              </DialogDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingItem(null);
                setIsAdding(!isAdding);
              }}
              className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 gap-1.5 text-xs font-semibold"
            >
              <Plus className="h-4 w-4" /> Add Master Item
            </Button>
          </div>
        </DialogHeader>

        {/* Add/Edit Form */}
        {(isAdding || editingItem) && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingItem) {
                if (!editingItem.name.trim()) return toast.error("Item name required");
                updateMutation.mutate(editingItem);
              } else {
                if (!formData.name.trim()) return toast.error("Item name required");
                addMutation.mutate(formData);
              }
            }}
            className="p-4 rounded-2xl bg-muted/60 border border-border/80 space-y-4 my-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                {editingItem ? "Edit Master Item" : "Create New Master Item"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingItem(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold">Item / Requirement Name *</Label>
                <Input
                  placeholder="e.g. Fresh Dairy Milk, Gas Cylinder, Takeaway Boxes"
                  value={editingItem ? editingItem.name : formData.name}
                  onChange={(e) =>
                    editingItem
                      ? setEditingItem({ ...editingItem, name: e.target.value })
                      : setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="rounded-xl h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <Select
                  value={editingItem ? editingItem.category : formData.category}
                  onValueChange={(val) =>
                    editingItem
                      ? setEditingItem({ ...editingItem, category: val })
                      : setFormData({ ...formData, category: val })
                  }
                >
                  <SelectTrigger className="rounded-xl h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Default Unit</Label>
                <Select
                  value={editingItem ? editingItem.default_unit : formData.default_unit}
                  onValueChange={(val) =>
                    editingItem
                      ? setEditingItem({ ...editingItem, default_unit: val })
                      : setFormData({ ...formData, default_unit: val })
                  }
                >
                  <SelectTrigger className="rounded-xl h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Typical / Default Cost (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1500"
                  value={editingItem ? editingItem.default_cost : formData.default_cost}
                  onChange={(e) =>
                    editingItem
                      ? setEditingItem({ ...editingItem, default_cost: e.target.value })
                      : setFormData({ ...formData, default_cost: e.target.value })
                  }
                  className="rounded-xl h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Description / Notes</Label>
                <Input
                  placeholder="Supplier info, standard brand..."
                  value={editingItem ? editingItem.description : formData.description}
                  onChange={(e) =>
                    editingItem
                      ? setEditingItem({ ...editingItem, description: e.target.value })
                      : setFormData({ ...formData, description: e.target.value })
                  }
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="submit"
                disabled={addMutation.isPending || updateMutation.isPending}
                className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 text-xs font-semibold"
              >
                {addMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1" />
                )}
                {editingItem ? "Update Item" : "Save Master Item"}
              </Button>
            </div>
          </form>
        )}

        {/* Search & Category Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          <div className="relative flex-1 w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search master items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 rounded-xl pl-9 text-xs"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-xl text-xs">
              <SelectValue placeholder="All Categories" />
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
        </div>

        {/* Master Items List */}
        <div className="overflow-x-auto border border-border/80 rounded-2xl mt-3">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/70 text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="px-4 py-3">Item Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Default Unit</th>
                <th className="px-4 py-3">Default Cost</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-brand mb-1" />
                    Loading master items...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No items found. Click &quot;Add Master Item&quot; to register items.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {item.name}
                      {item.description && (
                        <p className="text-[10px] text-muted-foreground font-normal">{item.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] font-medium">
                        {item.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.default_unit}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {item.default_cost ? formatINR(item.default_cost) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(item)}
                          className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-brand"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (window.confirm(`Delete master item "${item.name}"?`)) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                          className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive"
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

        <DialogFooter className="pt-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {filteredItems.length} master items configured
          </span>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
