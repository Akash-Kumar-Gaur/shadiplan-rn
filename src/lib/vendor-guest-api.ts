import { supabase } from "./supabase";
import type {
  BudgetCategory,
  CreateGuestGroupInput,
  CreateGuestInput,
  CreateVendorInput,
  Guest,
  GuestGroup,
  UpdateGuestInput,
  UpdateVendorInput,
  Vendor,
  VendorCategory,
  VendorStatus,
} from "../types/wedding";

type VendorRow = {
  id: string;
  wedding_id: string;
  name: string;
  category: string;
  contact_name: string | null;
  phone: string | null;
  total_cost: number;
  advance_paid: number;
  due_date: string | null;
  status: string;
  notes: string | null;
};

type PaymentRow = {
  id: string;
  vendor_id: string;
  amount: number;
  paid_date: string;
  note: string | null;
};

function asVendorCategory(value: string): VendorCategory {
  const allowed: VendorCategory[] = [
    "Venue",
    "Catering",
    "Photography",
    "Decor",
    "Music",
    "Transport",
    "Attire",
    "Other",
  ];
  return allowed.find((c) => c === value) ?? "Other";
}

function asVendorStatus(value: string): VendorStatus {
  if (value === "Confirmed" || value === "Paid") return value;
  return "Pending";
}

function mapVendor(row: VendorRow, payments: PaymentRow[]): Vendor {
  return {
    id: row.id,
    name: row.name,
    category: asVendorCategory(row.category),
    contactName: row.contact_name ?? "",
    phone: row.phone ?? "",
    totalCost: Number(row.total_cost),
    advancePaid: Number(row.advance_paid),
    dueDate: row.due_date ?? "",
    status: asVendorStatus(row.status),
    notes: row.notes ?? undefined,
    payments: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      date: p.paid_date,
      note: p.note ?? undefined,
    })),
  };
}

export async function fetchVendors(weddingId: string): Promise<Vendor[]> {
  const { data: vendorRows, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("due_date", { ascending: true });

  if (error) throw error;
  if (!vendorRows?.length) return [];

  const vendorIds = vendorRows.map((v) => v.id);
  const { data: paymentRows, error: payError } = await supabase
    .from("vendor_payments")
    .select("*")
    .in("vendor_id", vendorIds);

  if (payError) throw payError;

  const paymentsByVendor = new Map<string, PaymentRow[]>();
  for (const payment of paymentRows ?? []) {
    const list = paymentsByVendor.get(payment.vendor_id) ?? [];
    list.push(payment as PaymentRow);
    paymentsByVendor.set(payment.vendor_id, list);
  }

  return (vendorRows as VendorRow[]).map((row) =>
    mapVendor(row, paymentsByVendor.get(row.id) ?? []),
  );
}

export async function fetchBudgetCategories(weddingId: string): Promise<BudgetCategory[]> {
  const { data, error } = await supabase
    .from("budget_categories")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("name");

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    planned: Number(row.planned),
    actual: 0,
  }));
}

export async function recordVendorPayment(
  weddingId: string,
  vendor: Vendor,
  categoryId: string,
  amount: number,
  paidDate: string,
  note?: string,
): Promise<void> {
  const { data: payment, error: paymentError } = await supabase
    .from("vendor_payments")
    .insert({
      vendor_id: vendor.id,
      amount,
      paid_date: paidDate,
      note: note ?? null,
    })
    .select()
    .single();

  if (paymentError) throw paymentError;

  const { error: txError } = await supabase.from("transactions").insert({
    id: payment.id,
    wedding_id: weddingId,
    vendor_id: vendor.id,
    vendor_name: vendor.name,
    category_id: categoryId,
    amount,
    paid_date: paidDate,
    note: note ?? null,
  });
  if (txError) throw txError;

  const newAdvance = vendor.advancePaid + amount;
  const { error: vendorError } = await supabase
    .from("vendors")
    .update({
      advance_paid: newAdvance,
      status: newAdvance >= vendor.totalCost ? "Paid" : "Confirmed",
    })
    .eq("id", vendor.id);
  if (vendorError) throw vendorError;
}

export async function insertVendor(
  weddingId: string,
  input: CreateVendorInput,
  budgetCategories: BudgetCategory[],
): Promise<Vendor> {
  const { data, error } = await supabase
    .from("vendors")
    .insert({
      wedding_id: weddingId,
      name: input.name.trim(),
      category: input.category,
      contact_name: input.contactName.trim() || null,
      phone: input.phone.trim() || null,
      total_cost: input.totalCost,
      advance_paid: 0,
      due_date: input.dueDate || null,
      status: input.status,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;

  let vendor = mapVendor(data as VendorRow, []);

  if (input.advancePaid > 0) {
    const categoryId =
      budgetCategories.find((c) => c.name === input.category)?.id ??
      budgetCategories[0]?.id;
    if (categoryId) {
      const paidDate = new Date().toISOString().slice(0, 10);
      await recordVendorPayment(weddingId, vendor, categoryId, input.advancePaid, paidDate);
      const refreshed = await fetchVendors(weddingId);
      vendor = refreshed.find((v) => v.id === vendor.id) ?? vendor;
    } else {
      await supabase.from("vendors").update({ advance_paid: input.advancePaid }).eq("id", vendor.id);
      vendor = { ...vendor, advancePaid: input.advancePaid };
    }
  }

  return vendor;
}

export async function updateVendor(
  weddingId: string,
  vendorId: string,
  input: UpdateVendorInput,
): Promise<Vendor> {
  const advance = Math.min(Math.max(0, input.advancePaid), input.totalCost);
  const { data, error } = await supabase
    .from("vendors")
    .update({
      name: input.name.trim(),
      category: input.category,
      contact_name: input.contactName.trim() || null,
      phone: input.phone.trim() || null,
      total_cost: input.totalCost,
      advance_paid: advance,
      due_date: input.dueDate || null,
      status: input.status,
      notes: input.notes?.trim() || null,
    })
    .eq("wedding_id", weddingId)
    .eq("id", vendorId)
    .select()
    .single();

  if (error) throw error;

  const { data: payments, error: payError } = await supabase
    .from("vendor_payments")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("paid_date", { ascending: false });
  if (payError) throw payError;

  return mapVendor(data as VendorRow, (payments ?? []) as PaymentRow[]);
}

export async function deleteVendor(weddingId: string, vendorId: string): Promise<void> {
  const { error } = await supabase
    .from("vendors")
    .delete()
    .eq("wedding_id", weddingId)
    .eq("id", vendorId);
  if (error) throw error;
}

export async function fetchGuestGroups(weddingId: string): Promise<GuestGroup[]> {
  const { data, error } = await supabase
    .from("guest_groups")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("name");

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    side: row.side === "Groom" ? "Groom" : "Bride",
  }));
}

export async function insertGuestGroup(
  weddingId: string,
  input: CreateGuestGroupInput,
): Promise<GuestGroup> {
  const { data, error } = await supabase
    .from("guest_groups")
    .insert({
      wedding_id: weddingId,
      name: input.name.trim(),
      side: input.side,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    side: data.side === "Groom" ? "Groom" : "Bride",
  };
}

export async function fetchGuests(weddingId: string): Promise<Guest[]> {
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("name");

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    groupId: row.group_id ?? "",
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    rsvp: (row.rsvp as Guest["rsvp"]) ?? "Pending",
    meal: (row.meal as Guest["meal"]) ?? "Veg",
    accommodation: row.accommodation ?? false,
    transportNeeded: row.transport_needed ?? false,
    accompanyingCount: row.accompanying_count ?? 0,
    notes: row.notes ?? undefined,
  }));
}

export async function insertGuest(weddingId: string, input: CreateGuestInput): Promise<Guest> {
  const { data, error } = await supabase
    .from("guests")
    .insert({
      wedding_id: weddingId,
      group_id: input.groupId,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      rsvp: "Pending",
      meal: input.meal,
      accommodation: input.accommodation,
      transport_needed: input.transportNeeded,
      accompanying_count: input.accompanyingCount ?? 0,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    groupId: data.group_id ?? "",
    phone: data.phone ?? undefined,
    email: data.email ?? undefined,
    rsvp: (data.rsvp as Guest["rsvp"]) ?? "Pending",
    meal: (data.meal as Guest["meal"]) ?? "Veg",
    accommodation: data.accommodation ?? false,
    transportNeeded: data.transport_needed ?? false,
    accompanyingCount: data.accompanying_count ?? 0,
    notes: data.notes ?? undefined,
  };
}

export async function updateGuest(
  weddingId: string,
  id: string,
  patch: UpdateGuestInput,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.groupId !== undefined) payload.group_id = patch.groupId;
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.rsvp !== undefined) payload.rsvp = patch.rsvp;
  if (patch.meal !== undefined) payload.meal = patch.meal;
  if (patch.accommodation !== undefined) payload.accommodation = patch.accommodation;
  if (patch.transportNeeded !== undefined) payload.transport_needed = patch.transportNeeded;
  if (patch.accompanyingCount !== undefined) payload.accompanying_count = patch.accompanyingCount;
  if (patch.notes !== undefined) payload.notes = patch.notes?.trim() || null;
  if (patch.phone !== undefined) payload.phone = patch.phone?.trim() || null;

  const { error } = await supabase
    .from("guests")
    .update(payload)
    .eq("wedding_id", weddingId)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGuest(weddingId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("guests")
    .delete()
    .eq("wedding_id", weddingId)
    .eq("id", id);
  if (error) throw error;
}
