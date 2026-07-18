import { supabase } from "./supabase";

export type Gift = {
  id: string;
  weddingId: string;
  guestId?: string;
  giverName: string;
  amount?: number;
  giftDescription?: string;
  thankYouSent: boolean;
  notes?: string;
};

export type CreateGiftInput = {
  guestId?: string;
  giverName: string;
  amount?: number;
  giftDescription?: string;
  thankYouSent?: boolean;
  notes?: string;
};

export type UpdateGiftInput = Partial<CreateGiftInput>;

type GiftRow = {
  id: string;
  wedding_id: string;
  guest_id: string | null;
  giver_name: string;
  amount: number | null;
  gift_description: string | null;
  thank_you_sent: boolean;
  notes: string | null;
};

function mapGift(row: GiftRow): Gift {
  return {
    id: row.id,
    weddingId: row.wedding_id,
    guestId: row.guest_id ?? undefined,
    giverName: row.giver_name,
    amount: row.amount != null ? Number(row.amount) : undefined,
    giftDescription: row.gift_description ?? undefined,
    thankYouSent: row.thank_you_sent,
    notes: row.notes ?? undefined,
  };
}

export async function fetchGifts(weddingId: string): Promise<Gift[]> {
  const { data, error } = await supabase
    .from("gifts")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapGift(row as GiftRow));
}

export async function insertGift(weddingId: string, input: CreateGiftInput): Promise<Gift> {
  const { data, error } = await supabase
    .from("gifts")
    .insert({
      wedding_id: weddingId,
      guest_id: input.guestId ?? null,
      giver_name: input.giverName.trim(),
      amount: input.amount ?? null,
      gift_description: input.giftDescription?.trim() || null,
      thank_you_sent: input.thankYouSent ?? false,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapGift(data as GiftRow);
}

export async function updateGift(
  weddingId: string,
  id: string,
  patch: UpdateGiftInput,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.guestId !== undefined) payload.guest_id = patch.guestId || null;
  if (patch.giverName !== undefined) payload.giver_name = patch.giverName.trim();
  if (patch.amount !== undefined) payload.amount = patch.amount ?? null;
  if (patch.giftDescription !== undefined) {
    payload.gift_description = patch.giftDescription?.trim() || null;
  }
  if (patch.thankYouSent !== undefined) payload.thank_you_sent = patch.thankYouSent;
  if (patch.notes !== undefined) payload.notes = patch.notes?.trim() || null;

  const { error } = await supabase
    .from("gifts")
    .update(payload)
    .eq("wedding_id", weddingId)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGift(weddingId: string, id: string): Promise<void> {
  const { error } = await supabase.from("gifts").delete().eq("wedding_id", weddingId).eq("id", id);
  if (error) throw error;
}
