import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import {
  Wallet,
  Plus,
  Save,
  Loader2,
  Calendar,
  CreditCard,
  Building2,
  FileText,
  Tag,
  Sparkles,
  HelpCircle,
  IndianRupee
} from "lucide-react";
import { EXPENSE_CATEGORIES, COMMON_UNITS } from "./ExpenseMasterCatalogModal";

const PAYMENT_MODES = [
  { id: "cash", label: "Cash" },
  { id: "upi", label: "UPI (GPay / PhonePe / Paytm)" },
  { id: "card", label: "Debit / Credit Card" },
  { id: "bank_transfer", label: "NetBanking / Bank Transfer" },
  { id: "credit", label: "Vendor Credit (Pay Later)" },
];

export function ExpenseLoggerModal({
  open,
  onOpenChange,
  restaurantId,
  masterItems = [],
  editingExpense = null,
}) {
  const queryClient = useQueryClient();

  const [selectedMasterItemId, setSelectedMasterItemId] = useState("other");
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("Raw Materials");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("units");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [vendorName, setVendorName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [remarks, setRemarks] = useState("");

  // Initialize or reset form
  useEffect(() => {
    if (editingExpense) {
      setSelectedMasterItemId(editingExpense.master_item_id || "other");
      setItemName(editingExpense.item_name || "");
      setCategory(editingExpense.category || "Raw Materials");
      setAmount(editingExpense.amount?.toString() || "");
      setQuantity(editingExpense.quantity?.toString() || "1");
      setUnit(editingExpense.unit || "units");
      setPaymentMode(editingExpense.payment_mode || "cash");
      setExpenseDate(
        editingExpense.expense_date || new Date().toISOString().split("T")[0]
      );
      setVendorName(editingExpense.vendor_name || "");
      setInvoiceNumber(editingExpense.invoice_number || "");
      setRemarks(editingExpense.remarks || "");
    } else {
      setSelectedMasterItemId("other");
      setItemName("");
      setCategory("Raw Materials");
      setAmount("");
      setQuantity("1");
      setUnit("units");
      setPaymentMode("cash");
      setExpenseDate(new Date().toISOString().split("T")[0]);
      setVendorName("");
      setInvoiceNumber("");
      setRemarks("");
    }
  }, [editingExpense, open]);

  // Handle master item selection
  function handleSelectMasterItem(id) {
    setSelectedMasterItemId(id);
    if (id === "other") {
      setItemName("");
      setCategory("Miscellaneous / Other");
      setUnit("units");
    } else {
      const found = masterItems.find((m) => m.id === id);
      if (found) {
        setItemName(found.name);
        setCategory(found.category);
        setUnit(found.default_unit || "units");
        if (found.default_cost && !amount) {
          setAmount(found.default_cost.toString());
        }
      }
    }
  }

  // Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const finalItemName =
        selectedMasterItemId === "other"
          ? itemName.trim()
          : masterItems.find((m) => m.id === selectedMasterItemId)?.name ||
            itemName.trim();

      if (!finalItemName) throw new Error("Please specify an item name or reason.");
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error("Please enter a valid expense amount greater than 0.");
      }

      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        restaurant_id: restaurantId,
        master_item_id: selectedMasterItemId === "other" ? null : selectedMasterItemId,
        item_name: finalItemName,
        category: category,
        amount: numericAmount,
        quantity: parseFloat(quantity) || 1,
        unit: unit,
        payment_mode: paymentMode,
        expense_date: expenseDate,
        vendor_name: vendorName.trim() || null,
        invoice_number: invoiceNumber.trim() || null,
        remarks: remarks.trim() || null,
        created_by: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      if (editingExpense) {
        const { error } = await supabase
          .from("expenses")
          .update(payload)
          .eq("id", editingExpense.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("expenses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(
        editingExpense
          ? "Expense record updated!"
          : "Expense logged successfully!"
      );
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["restaurant-expenses", restaurantId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save expense");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-xl rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-brand" />
            {editingExpense ? "Edit Expense Entry" : "Log Business Expense"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Pick from your master supplies or enter custom remarks and expenses.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4 py-2"
        >
          {/* Master Item Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Select Required Item from Master Catalog</span>
              <span className="text-[11px] text-brand font-normal">
                {masterItems.length} catalog items available
              </span>
            </Label>
            <Select
              value={selectedMasterItemId}
              onValueChange={handleSelectMasterItem}
            >
              <SelectTrigger className="rounded-xl h-11 text-sm bg-muted/50 border-border">
                <SelectValue placeholder="Choose requirement..." />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="other" className="font-semibold text-brand">
                  ✨ + Other (Custom Expense / Reason)
                </SelectItem>
                {masterItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Name input if "other" is selected */}
          {selectedMasterItemId === "other" && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-muted/40 border border-border/80">
              <Label className="text-xs font-semibold">Custom Item Name / Reason *</Label>
              <Input
                placeholder="e.g. Special festival decor, repair plumber, pest control"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required={selectedMasterItemId === "other"}
                className="rounded-xl h-10 text-sm"
              />
            </div>
          )}

          {/* Category & Amount Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Expense Category</Label>
              <Select value={category} onValueChange={setCategory}>
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
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Amount (₹) *</span>
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                  ₹
                </span>
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="rounded-xl h-10 pl-8 text-sm font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Quantity & Payment Mode Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Quantity</Label>
              <Input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
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
              <Label className="text-xs font-semibold">Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>
                      {pm.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date & Vendor Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Expense Date *</Label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className="rounded-xl h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Vendor / Supplier (Optional)</Label>
              <Input
                placeholder="e.g. Metro Cash & Carry, Local Dairy"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>
          </div>

          {/* Invoice No & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Bill / Invoice No. (Optional)</Label>
              <Input
                placeholder="e.g. INV-89241"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Remarks & Notes</Label>
              <Input
                placeholder="Any special remarks or reason..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 text-xs font-semibold gap-1.5 shadow-md"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  {editingExpense ? "Update Expense" : "Log Expense Entry"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
