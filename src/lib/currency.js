/**
 * Indian Rupee (INR) formatting utilities.
 * Uses the Indian numbering system: thousand, lakh, crore.
 */

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrFormatter2 = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrNumber = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** Format a number as INR currency (e.g. ₹1,24,580). */
export function formatINR(value, opts = {}) {
  const v = Number.isFinite(value) ? value : 0;
  return opts.decimals ? inrFormatter2.format(v) : inrFormatter.format(v);
}

/** Format a bare number using the Indian numbering system. */
export function formatIndianNumber(value) {
  return inrNumber.format(Number.isFinite(value) ? value : 0);
}

/**
 * Compact INR for chart axes / cards.
 * 1500 → ₹1.5K, 125000 → ₹1.25L, 24500000 → ₹2.45Cr
 */
export function formatINRCompact(value) {
  const v = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (v >= 1_00_00_000) return `${sign}₹${(v / 1_00_00_000).toFixed(2).replace(/\.?0+$/, "")}Cr`;
  if (v >= 1_00_000) return `${sign}₹${(v / 1_00_000).toFixed(2).replace(/\.?0+$/, "")}L`;
  if (v >= 1_000) return `${sign}₹${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${sign}₹${v}`;
}

/** Format a date as DD/MM/YYYY (Indian locale). */
export function formatIndianDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Format a date + time in Asia/Kolkata. */
export function formatIndianDateTime(value) {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

/** Relative time — "just now", "5m ago", "2h ago", "3d ago". */
export function timeAgo(value) {
  const d = value instanceof Date ? value : new Date(value);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 30) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 30 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return formatIndianDate(d);
}

export const DEFAULT_LOCALE = "en-IN";
export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_CURRENCY = "INR";
