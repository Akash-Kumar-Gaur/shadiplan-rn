import { supabase } from "./supabase";

export type EmergencyContact = {
  id: string;
  weddingId: string;
  name: string;
  phone: string;
  role?: string;
  notes?: string;
};

export type CreateEmergencyContactInput = {
  name: string;
  phone: string;
  role?: string;
  notes?: string;
};

export type UpdateEmergencyContactInput = Partial<CreateEmergencyContactInput>;

type Row = {
  id: string;
  wedding_id: string;
  name: string;
  phone: string;
  role: string | null;
  notes: string | null;
};

function mapContact(row: Row): EmergencyContact {
  return {
    id: row.id,
    weddingId: row.wedding_id,
    name: row.name,
    phone: row.phone,
    role: row.role ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export async function fetchEmergencyContacts(weddingId: string): Promise<EmergencyContact[]> {
  const { data, error } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapContact(row as Row));
}

export async function insertEmergencyContact(
  weddingId: string,
  input: CreateEmergencyContactInput,
): Promise<EmergencyContact> {
  const { data, error } = await supabase
    .from("emergency_contacts")
    .insert({
      wedding_id: weddingId,
      name: input.name.trim(),
      phone: input.phone.trim(),
      role: input.role?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapContact(data as Row);
}

export async function updateEmergencyContact(
  id: string,
  patch: UpdateEmergencyContactInput,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.phone !== undefined) payload.phone = patch.phone.trim();
  if (patch.role !== undefined) payload.role = patch.role?.trim() || null;
  if (patch.notes !== undefined) payload.notes = patch.notes?.trim() || null;

  const { error } = await supabase.from("emergency_contacts").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteEmergencyContact(id: string): Promise<void> {
  const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
  if (error) throw error;
}
