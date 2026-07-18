import type { TimelineEvent } from "./wedding-api";
import { formatShortDate } from "./lead-time-dates";
import { formatDisplayTime, parseTimeToMinutes } from "./time-utils";

export type InviteThemeId = "floral" | "minimal" | "royal" | "pastel";

export interface SavedInvite {
  id: string;
  weddingId: string;
  guestId: string | null;
  guestGroupId: string | null;
  eventIds: string[];
  theme: InviteThemeId;
}

export interface InviteEventDetail {
  name: string;
  dateLabel: string;
  venue: string;
}

function compareTimelineEvents(a: TimelineEvent, b: TimelineEvent): number {
  const byDate = a.eventDate.localeCompare(b.eventDate);
  if (byDate !== 0) return byDate;
  return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
}

export function buildInviteEventDetails(events: TimelineEvent[]): InviteEventDetail[] {
  return [...events].sort(compareTimelineEvents).map((event) => ({
    name: event.name,
    dateLabel: `${formatShortDate(event.eventDate)} · ${formatDisplayTime(event.time) || "Time TBC"}`,
    venue: event.venue?.trim() || "Venue TBC",
  }));
}
