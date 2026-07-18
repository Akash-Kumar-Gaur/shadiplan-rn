import { supabase } from "./supabase";
import type { InviteThemeId, SavedInvite } from "./invite-utils";

type InviteRow = {
  id: string;
  wedding_id: string;
  guest_id: string | null;
  guest_group_id: string | null;
  event_ids: string[];
  theme: string;
};

function mapInvite(row: InviteRow): SavedInvite {
  return {
    id: row.id,
    weddingId: row.wedding_id,
    guestId: row.guest_id,
    guestGroupId: row.guest_group_id,
    eventIds: row.event_ids ?? [],
    theme: row.theme as InviteThemeId,
  };
}

export async function fetchInviteForGuest(
  weddingId: string,
  guestId: string,
): Promise<SavedInvite | null> {
  const { data, error } = await supabase
    .from("invites")
    .select("*")
    .eq("wedding_id", weddingId)
    .eq("guest_id", guestId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapInvite(data as InviteRow) : null;
}

export async function fetchInviteForGroup(
  weddingId: string,
  groupId: string,
): Promise<SavedInvite | null> {
  const { data, error } = await supabase
    .from("invites")
    .select("*")
    .eq("wedding_id", weddingId)
    .eq("guest_group_id", groupId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapInvite(data as InviteRow) : null;
}

export async function upsertInvite(input: {
  weddingId: string;
  guestId?: string;
  guestGroupId?: string;
  eventIds: string[];
  theme: InviteThemeId;
  existingId?: string;
}): Promise<SavedInvite> {
  const payload = {
    wedding_id: input.weddingId,
    guest_id: input.guestId ?? null,
    guest_group_id: input.guestGroupId ?? null,
    event_ids: input.eventIds,
    theme: input.theme,
  };

  if (input.existingId) {
    const { data, error } = await supabase
      .from("invites")
      .update(payload)
      .eq("id", input.existingId)
      .select()
      .single();
    if (error) throw error;
    return mapInvite(data as InviteRow);
  }

  const { data, error } = await supabase.from("invites").insert(payload).select().single();
  if (error) throw error;
  return mapInvite(data as InviteRow);
}
