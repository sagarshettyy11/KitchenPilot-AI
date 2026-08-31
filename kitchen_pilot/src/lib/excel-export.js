import * as XLSX from "xlsx";

/**
 * Export expense records to a styled Excel (.xlsx) workbook.
 *
 * @param {Array} expenses - List of expense objects
 * @param {string} restaurantName - Name of the restaurant
 * @param {string} periodLabel - e.g. "August 2026" or "Last 30 Days"
 */
export function exportExpensesToExcel(expenses = [], restaurantName = "KitchenPilot", periodLabel = "All Time") {
  if (!expenses || expenses.length === 0) {
    throw new Error("No expense records available to export.");
  }

  // 1. Prepare data rows
  let totalAmount = 0;
  const rows = expenses.map((exp, index) => {
    const amt = Number(exp.amount) || 0;
    totalAmount += amt;

    return {
      "Sl No": index + 1,
      "Expense Date": exp.expense_date || (exp.created_at ? exp.created_at.split("T")[0] : ""),
      "Item / Reason": exp.item_name || "Other",
      "Category": exp.category || "General",
      "Amount (₹)": amt,
      "Payment Mode": (exp.payment_mode || "Cash").toUpperCase(),
      "Quantity": exp.quantity || 1,
      "Unit": exp.unit || "units",
      "Vendor / Supplier": exp.vendor_name || "-",
      "Remarks / Notes": exp.remarks || "-",
      "Invoice / Bill No": exp.invoice_number || "-",
      "Logged Date": exp.created_at ? new Date(exp.created_at).toLocaleString("en-IN") : "-",
    };
  });

  // 2. Add summary total row
  rows.push({
    "Sl No": "",
    "Expense Date": "TOTAL",
    "Item / Reason": `${expenses.length} Entries`,
    "Category": "",
    "Amount (₹)": totalAmount,
    "Payment Mode": "",
    "Quantity": "",
    "Unit": "",
    "Vendor / Supplier": "",
    "Remarks / Notes": `Generated for ${restaurantName}`,
    "Invoice / Bill No": "",
    "Logged Date": new Date().toLocaleString("en-IN"),
  });

  // 3. Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // 4. Auto-fit column widths
  const colWidths = [
    { wch: 8 },  // Sl No
    { wch: 14 }, // Expense Date
    { wch: 32 }, // Item Name
    { wch: 20 }, // Category
    { wch: 16 }, // Amount
    { wch: 16 }, // Payment Mode
    { wch: 10 }, // Qty
    { wch: 10 }, // Unit
    { wch: 22 }, // Vendor
    { wch: 35 }, // Remarks
    { wch: 18 }, // Invoice No
    { wch: 22 }, // Logged Date
  ];
  worksheet["!cols"] = colWidths;

  // 5. Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");

  // 6. Generate filename
  const cleanName = restaurantName.replace(/[^a-zA-Z0-9]/g, "_");
  const cleanPeriod = periodLabel.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `${cleanName}_Expenses_${cleanPeriod}.xlsx`;

  // 7. Write file and trigger download
  XLSX.writeFile(workbook, fileName);
}
