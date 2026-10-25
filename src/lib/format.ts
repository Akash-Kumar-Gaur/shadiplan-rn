export const formatINR = (n: number): string =>
  "₹" + new Intl.NumberFormat("en-IN").format(n);

/** Parse a YYYY-MM-DD calendar date as local midnight (not UTC). */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

/** Format a Date as YYYY-MM-DD in the device timezone. */
export function toLocalIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const formatDate = (iso: string): string => {
  const date = parseLocalDate(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const shortDate = (iso: string): string => {
  const date = parseLocalDate(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
