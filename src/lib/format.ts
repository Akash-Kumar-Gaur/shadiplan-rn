export const formatINR = (n: number): string =>
  "₹" + new Intl.NumberFormat("en-IN").format(n);

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
