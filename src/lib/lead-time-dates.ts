import type { LeadTime } from "../data/suggestion-pool";
import { parseLocalDate, toLocalIsoDate } from "./format";
import type { TimelineEvent } from "./wedding-api";
import { parseTimeToMinutes } from "./time-utils";

const LEAD_MONTHS: Record<LeadTime, number> = {
  "12mo": 12,
  "9mo": 9,
  "6mo": 6,
  "3mo": 3,
  "1mo": 1,
  "1wk": 0,
};

export function suggestedDateFromLeadTime(weddingDate: string, leadTime: string): string {
  const base = parseLocalDate(weddingDate);
  if (leadTime === "1wk") {
    base.setDate(base.getDate() - 7);
    return toLocalIsoDate(base);
  }
  const months = LEAD_MONTHS[leadTime as LeadTime] ?? 3;
  base.setMonth(base.getMonth() - months);
  return toLocalIsoDate(base);
}

export function formatShortDate(iso: string): string {
  if (!iso) return "";
  const d = parseLocalDate(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatLongDate(iso: string): string {
  if (!iso) return "";
  const d = parseLocalDate(iso);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function datesInRange(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate) return [];
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  if (end.getTime() < start.getTime()) return [toLocalIsoDate(start)];

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    dates.push(toLocalIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function distinctEventDates(events: TimelineEvent[]): string[] {
  const dates = new Set<string>();
  for (const e of events) {
    if (e.eventDate) dates.add(e.eventDate);
  }
  return [...dates].sort((a, b) => parseLocalDate(a).getTime() - parseLocalDate(b).getTime());
}

export function groupEventsByDate(events: TimelineEvent[]): Map<string, TimelineEvent[]> {
  const map = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    if (!e.eventDate) continue;
    const list = map.get(e.eventDate) ?? [];
    list.push(e);
    map.set(e.eventDate, list);
  }
  for (const [date, list] of map) {
    list.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
    map.set(date, list);
  }
  return map;
}

export function dateTabLabel(date: string, index: number): string {
  return `Day ${index + 1} · ${formatShortDate(date)}`;
}

export function timelineDayDates(
  startDate: string,
  endDate: string,
  events: TimelineEvent[] = [],
): string[] {
  const range = datesInRange(startDate, endDate);
  const extra = distinctEventDates(events);
  const set = new Set([...range, ...extra]);
  return [...set].sort((a, b) => parseLocalDate(a).getTime() - parseLocalDate(b).getTime());
}
