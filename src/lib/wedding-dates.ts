export function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export const isWeddingPast = (weddingDate: string): boolean =>
  parseDateOnly(weddingDate).getTime() < todayDateOnly().getTime();

/** Days until wedding_date (ceremony day), not nearest event. */
export const daysUntilWedding = (weddingDate: string): number => {
  const target = parseDateOnly(weddingDate).getTime();
  const today = todayDateOnly().getTime();
  return Math.max(0, Math.ceil((target - today) / (1000 * 60 * 60 * 24)));
};

export const daysUntil = (iso: string): number =>
  Math.ceil((parseDateOnly(iso).getTime() - todayDateOnly().getTime()) / (1000 * 60 * 60 * 24));
