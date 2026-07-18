import { supabase } from "./supabase";
import type {
  BudgetCategory,
  CreateExpenseInput,
  Transaction,
  UpdateExpenseInput,
  Vendor,
} from "../types/wedding";

export type { CreateExpenseInput, Transaction, UpdateExpenseInput };

export const DEFAULT_BUDGET_CATEGORIES = [
  "Venue",
  "Catering",
  "Photography",
  "Decor",
  "Attire",
  "Transport",
  "Music",
  "Jewelry",
  "Misc",
] as const;

type TransactionRow = {
  id: string;
  wedding_id: string;
  vendor_id: string | null;
  vendor_name: string;
  category_id: string | null;
  amount: number;
  paid_date: string;
  note: string | null;
  tagged_for: string[] | null;
};

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    vendorId: row.vendor_id ?? undefined,
    vendorName: row.vendor_name,
    categoryId: row.category_id ?? "",
    amount: Number(row.amount),
    date: row.paid_date,
    note: row.note ?? undefined,
    taggedFor: row.tagged_for ?? [],
  };
}

export async function fetchBudgetCategoriesRaw(weddingId: string): Promise<BudgetCategory[]> {
  const { data, error } = await supabase
    .from("budget_categories")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    planned: Number(row.planned),
    actual: 0,
  }));
}

export async function fetchTransactions(weddingId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("paid_date", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapTransaction(row as TransactionRow));
}

export function buildTransactionsFromVendorPayments(
  vendors: Vendor[],
  budgetCategories: BudgetCategory[],
): Transaction[] {
  const categoryByName = new Map(budgetCategories.map((c) => [c.name, c.id]));
  const txs: Transaction[] = [];

  for (const vendor of vendors) {
    const categoryId = categoryByName.get(vendor.category) ?? budgetCategories[0]?.id ?? "";
    for (const payment of vendor.payments) {
      txs.push({
        id: payment.id,
        vendorId: vendor.id,
        vendorName: vendor.name,
        categoryId,
        amount: payment.amount,
        date: payment.date,
        note: payment.note,
        taggedFor: [],
      });
    }
  }

  return txs;
}

export function mergeTransactionSources(
  dbTransactions: Transaction[],
  vendors: Vendor[],
  budgetCategories: BudgetCategory[],
): Transaction[] {
  const dbIds = new Set(dbTransactions.map((t) => t.id));
  const legacy = buildTransactionsFromVendorPayments(vendors, budgetCategories);
  const merged = [...dbTransactions];
  for (const tx of legacy) {
    if (!dbIds.has(tx.id)) {
      merged.push(tx);
    }
  }
  return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function applyActualsFromTransactions(
  categories: BudgetCategory[],
  transactions: Transaction[],
): BudgetCategory[] {
  const sums = new Map<string, number>();
  for (const tx of transactions) {
    if (!tx.categoryId) continue;
    sums.set(tx.categoryId, (sums.get(tx.categoryId) ?? 0) + tx.amount);
  }
  return categories.map((c) => ({
    ...c,
    actual: sums.get(c.id) ?? 0,
  }));
}

export async function insertTransaction(
  weddingId: string,
  input: CreateExpenseInput,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      wedding_id: weddingId,
      vendor_id: null,
      vendor_name: input.vendorName?.trim() || "Expense",
      category_id: input.categoryId,
      amount: input.amount,
      paid_date: input.date,
      note: input.note ?? null,
      tagged_for: input.taggedFor?.length ? input.taggedFor : [],
    })
    .select()
    .single();

  if (error) throw error;
  return mapTransaction(data as TransactionRow);
}

async function syncVendorAdvanceFromPayments(vendorId: string): Promise<void> {
  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("total_cost")
    .eq("id", vendorId)
    .single();
  if (vendorError) throw vendorError;

  const { data: payments, error: payError } = await supabase
    .from("vendor_payments")
    .select("amount")
    .eq("vendor_id", vendorId);
  if (payError) throw payError;

  const advancePaid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const totalCost = Number(vendor.total_cost);
  const status = advancePaid >= totalCost ? "Paid" : advancePaid > 0 ? "Confirmed" : "Pending";

  const { error } = await supabase
    .from("vendors")
    .update({ advance_paid: advancePaid, status })
    .eq("id", vendorId);
  if (error) throw error;
}

export async function updateTransaction(
  weddingId: string,
  id: string,
  patch: UpdateExpenseInput,
): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("transactions")
    .select("vendor_id")
    .eq("wedding_id", weddingId)
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  const txPayload: Record<string, unknown> = {};
  if (patch.amount !== undefined) txPayload.amount = patch.amount;
  if (patch.categoryId !== undefined) txPayload.category_id = patch.categoryId;
  if (patch.date !== undefined) txPayload.paid_date = patch.date;
  if (patch.note !== undefined) txPayload.note = patch.note?.trim() || null;
  if (patch.taggedFor !== undefined) {
    txPayload.tagged_for = patch.taggedFor.length ? patch.taggedFor : [];
  }
  if (patch.vendorName !== undefined && !existing.vendor_id) {
    txPayload.vendor_name = patch.vendorName.trim() || "Expense";
  }

  if (Object.keys(txPayload).length > 0) {
    const { error: txError } = await supabase
      .from("transactions")
      .update(txPayload)
      .eq("wedding_id", weddingId)
      .eq("id", id);
    if (txError) throw txError;
  }

  if (existing.vendor_id) {
    const paymentPayload: Record<string, unknown> = {};
    if (patch.amount !== undefined) paymentPayload.amount = patch.amount;
    if (patch.date !== undefined) paymentPayload.paid_date = patch.date;
    if (patch.note !== undefined) paymentPayload.note = patch.note?.trim() || null;

    if (Object.keys(paymentPayload).length > 0) {
      const { error: paymentError } = await supabase
        .from("vendor_payments")
        .update(paymentPayload)
        .eq("id", id);
      if (paymentError) throw paymentError;
    }

    await syncVendorAdvanceFromPayments(existing.vendor_id);
  }
}

export async function deleteTransaction(weddingId: string, id: string): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("transactions")
    .select("vendor_id")
    .eq("wedding_id", weddingId)
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  const { error: txError } = await supabase
    .from("transactions")
    .delete()
    .eq("wedding_id", weddingId)
    .eq("id", id);
  if (txError) throw txError;

  if (existing.vendor_id) {
    const { error: paymentError } = await supabase
      .from("vendor_payments")
      .delete()
      .eq("id", id);
    if (paymentError) throw paymentError;
    await syncVendorAdvanceFromPayments(existing.vendor_id);
  }
}

export async function insertBudgetCategory(
  weddingId: string,
  input: { name: string; planned?: number },
): Promise<BudgetCategory> {
  const { data, error } = await supabase
    .from("budget_categories")
    .insert({
      wedding_id: weddingId,
      name: input.name.trim(),
      planned: input.planned ?? 0,
      actual: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    planned: Number(data.planned),
    actual: 0,
  };
}

export async function updateBudgetCategory(
  weddingId: string,
  id: string,
  updates: { name: string; planned: number },
): Promise<void> {
  const { error } = await supabase
    .from("budget_categories")
    .update({
      name: updates.name.trim(),
      planned: updates.planned,
    })
    .eq("wedding_id", weddingId)
    .eq("id", id);

  if (error) throw error;
}

/** Deletes category; transactions.category_id is ON DELETE SET NULL (uncategorized). */
export async function deleteBudgetCategory(weddingId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("budget_categories")
    .delete()
    .eq("wedding_id", weddingId)
    .eq("id", id);

  if (error) throw error;
}

export async function seedDefaultBudgetCategories(weddingId: string): Promise<void> {
  const { error } = await supabase.from("budget_categories").insert(
    DEFAULT_BUDGET_CATEGORIES.map((name) => ({
      wedding_id: weddingId,
      name,
      planned: 0,
      actual: 0,
    })),
  );
  if (error) throw error;
}

/** Seeds defaults only when a wedding has zero categories (RN onboarding / empty wallet). */
export async function ensureDefaultBudgetCategoriesIfEmpty(weddingId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("budget_categories")
    .select("id", { count: "exact", head: true })
    .eq("wedding_id", weddingId);

  if (error) throw error;
  if ((count ?? 0) > 0) return false;
  await seedDefaultBudgetCategories(weddingId);
  return true;
}
