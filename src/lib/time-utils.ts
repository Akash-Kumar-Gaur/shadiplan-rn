/** Normalize stored or typed time to 24-hour `HH:MM` for DB storage. */
export function normalizeTimeForStorage(time: string): string {
  const trimmed = time.trim();
  if (!trimmed) return "";

  const h24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (h24 && !/\s*(AM|PM)\s*$/i.test(trimmed)) {
    const hours = parseInt(h24[1], 10);
    const minutes = parseInt(h24[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  }

  return "";
}

export type TimePeriod = "AM" | "PM";
export type HalfHourMinute = "00" | "30";

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export { HOURS_12 };

export function snapToHalfHour(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return "";

  if (minutes < 15) {
    return `${String(hours).padStart(2, "0")}:00`;
  }
  if (minutes < 45) {
    return `${String(hours).padStart(2, "0")}:30`;
  }
  hours = (hours + 1) % 24;
  return `${String(hours).padStart(2, "0")}:00`;
}

export function parseTime12Parts(
  value: string | undefined | null,
  fallback = "19:00",
): { hour12: number; minute: HalfHourMinute; period: TimePeriod } {
  const normalized = snapToHalfHour(normalizeTimeForStorage(value ?? "") || fallback);
  const [h24Str, minStr] = normalized.split(":");
  const h24 = parseInt(h24Str, 10);
  const minute: HalfHourMinute = parseInt(minStr, 10) >= 30 ? "30" : "00";
  const period: TimePeriod = h24 >= 12 ? "PM" : "AM";
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, period };
}

export function toTime24(hour12: number, minute: string, period: TimePeriod): string {
  let h24 = hour12 % 12;
  if (period === "PM") h24 += 12;
  const min = minute === "30" ? "30" : "00";
  return `${String(h24).padStart(2, "0")}:${min}`;
}

export function toTimeInputValue(time: string | undefined | null): string {
  if (!time?.trim()) return "";
  const normalized = normalizeTimeForStorage(time);
  return normalized ? snapToHalfHour(normalized) : "";
}

export function formatDisplayTime(time: string | undefined | null): string {
  if (!time?.trim()) return "";
  const normalized = normalizeTimeForStorage(time);
  if (!normalized) return time.trim();
  const [hStr, mStr] = normalized.split(":");
  const hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);
  const d = new Date(2000, 0, 1, hours, minutes);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function parseTimeToMinutes(time: string): number {
  const normalized = normalizeTimeForStorage(time);
  if (normalized) {
    const [h, m] = normalized.split(":").map(Number);
    return h * 60 + m;
  }
  return 0;
}
