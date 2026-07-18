import type { Guest } from "../types/wedding";

export function partySize(guest: Guest): number {
  return 1 + (guest.accompanyingCount ?? 0);
}

export type GuestHeadcountSummary = {
  invitedRecords: number;
  maxHeadcount: number;
  confirmedRecords: number;
  confirmedHeadcount: number;
  pendingRecords: number;
  declinedRecords: number;
};

export function computeGuestHeadcounts(guests: Guest[]): GuestHeadcountSummary {
  let maxHeadcount = 0;
  let confirmedRecords = 0;
  let confirmedHeadcount = 0;
  let pendingRecords = 0;
  let declinedRecords = 0;

  for (const guest of guests) {
    const size = partySize(guest);
    maxHeadcount += size;
    if (guest.rsvp === "Confirmed") {
      confirmedRecords += 1;
      confirmedHeadcount += size;
    } else if (guest.rsvp === "Pending") {
      pendingRecords += 1;
    } else if (guest.rsvp === "Declined") {
      declinedRecords += 1;
    }
  }

  return {
    invitedRecords: guests.length,
    maxHeadcount,
    confirmedRecords,
    confirmedHeadcount,
    pendingRecords,
    declinedRecords,
  };
}
