import { supabase } from "./supabase";

export type OutfitPlan = {
  id: string;
  weddingId: string;
  timelineEventId: string;
  person: string;
  outfitDescription?: string;
  color?: string;
  jewellerOrDesigner?: string;
  notes?: string;
};

export type UpsertOutfitPlanInput = {
  timelineEventId: string;
  person: string;
  outfitDescription?: string;
  color?: string;
  jewellerOrDesigner?: string;
  notes?: string;
};

type OutfitPlanRow = {
  id: string;
  wedding_id: string;
  timeline_event_id: string;
  person: string;
  outfit_description: string | null;
  color: string | null;
  jeweller_or_designer: string | null;
  notes: string | null;
};

function mapOutfit(row: OutfitPlanRow): OutfitPlan {
  return {
    id: row.id,
    weddingId: row.wedding_id,
    timelineEventId: row.timeline_event_id,
    person: row.person,
    outfitDescription: row.outfit_description ?? undefined,
    color: row.color ?? undefined,
    jewellerOrDesigner: row.jeweller_or_designer ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export const OUTFIT_PERSON_PRESETS = [
  "Bride",
  "Groom",
  "Father of Bride",
  "Mother of Bride",
  "Father of Groom",
  "Mother of Groom",
] as const;

export const OUTFIT_COLOR_PRESETS: { label: string; hex: string }[] = [
  { label: "Ivory", hex: "#F5F0E6" },
  { label: "Gold", hex: "#C9A227" },
  { label: "Maroon", hex: "#6B2C1F" },
  { label: "Red", hex: "#B91C1C" },
  { label: "Pink", hex: "#E8A0BF" },
  { label: "Peach", hex: "#E8B4A0" },
  { label: "Green", hex: "#3D6B4F" },
  { label: "Teal", hex: "#0F766E" },
  { label: "Navy", hex: "#1E3A5F" },
  { label: "Black", hex: "#1A1A1A" },
  { label: "White", hex: "#FFFFFF" },
  { label: "Silver", hex: "#C0C0C0" },
];

export async function fetchOutfitPlans(weddingId: string): Promise<OutfitPlan[]> {
  const { data, error } = await supabase
    .from("outfit_plans")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("person", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapOutfit(row as OutfitPlanRow));
}

export async function upsertOutfitPlan(
  weddingId: string,
  input: UpsertOutfitPlanInput,
): Promise<OutfitPlan> {
  const { data, error } = await supabase
    .from("outfit_plans")
    .upsert(
      {
        wedding_id: weddingId,
        timeline_event_id: input.timelineEventId,
        person: input.person.trim(),
        outfit_description: input.outfitDescription?.trim() || null,
        color: input.color?.trim() || null,
        jeweller_or_designer: input.jewellerOrDesigner?.trim() || null,
        notes: input.notes?.trim() || null,
      },
      { onConflict: "wedding_id,timeline_event_id,person" },
    )
    .select()
    .single();

  if (error) throw error;
  return mapOutfit(data as OutfitPlanRow);
}

export async function deleteOutfitPlan(id: string): Promise<void> {
  const { error } = await supabase.from("outfit_plans").delete().eq("id", id);
  if (error) throw error;
}
