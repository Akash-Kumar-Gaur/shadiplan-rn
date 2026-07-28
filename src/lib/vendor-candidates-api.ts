import { supabase } from "./supabase";
import type {
  CreateVendorCandidateInput,
  Vendor,
  VendorCandidate,
  VendorCandidateFile,
  VendorCandidateStatus,
  VendorCategory,
} from "../types/wedding";

const BUCKET = "vendor-documents";

type CandidateRow = {
  id: string;
  wedding_id: string;
  name: string;
  category: string;
  contact_name: string | null;
  phone: string | null;
  proposed_amount: number | string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

type FileRow = {
  id: string;
  vendor_candidate_id: string;
  storage_path: string;
  file_name: string | null;
  uploaded_at: string;
};

function mapFile(row: FileRow): VendorCandidateFile {
  return {
    id: row.id,
    vendorCandidateId: row.vendor_candidate_id,
    storagePath: row.storage_path,
    fileName: row.file_name ?? undefined,
    uploadedAt: row.uploaded_at,
  };
}

function mapCandidate(row: CandidateRow, files: VendorCandidateFile[]): VendorCandidate {
  const amount =
    row.proposed_amount == null || row.proposed_amount === ""
      ? undefined
      : Number(row.proposed_amount);
  return {
    id: row.id,
    weddingId: row.wedding_id,
    name: row.name,
    category: row.category as VendorCategory,
    contactName: row.contact_name ?? undefined,
    phone: row.phone ?? undefined,
    proposedAmount: Number.isFinite(amount) ? amount : undefined,
    notes: row.notes ?? undefined,
    status: (row.status as VendorCandidateStatus) || "considering",
    createdAt: row.created_at,
    files,
  };
}

export async function fetchVendorCandidates(weddingId: string): Promise<VendorCandidate[]> {
  const { data, error } = await supabase
    .from("vendor_candidates")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as CandidateRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { data: fileData, error: fileError } = await supabase
    .from("vendor_candidate_files")
    .select("*")
    .in("vendor_candidate_id", ids)
    .order("uploaded_at", { ascending: false });
  if (fileError) throw fileError;

  const filesByCandidate = new Map<string, VendorCandidateFile[]>();
  for (const row of (fileData ?? []) as FileRow[]) {
    const list = filesByCandidate.get(row.vendor_candidate_id) ?? [];
    list.push(mapFile(row));
    filesByCandidate.set(row.vendor_candidate_id, list);
  }

  return rows.map((row) => mapCandidate(row, filesByCandidate.get(row.id) ?? []));
}

export async function insertVendorCandidate(
  weddingId: string,
  input: CreateVendorCandidateInput,
): Promise<VendorCandidate> {
  const { data, error } = await supabase
    .from("vendor_candidates")
    .insert({
      wedding_id: weddingId,
      name: input.name.trim(),
      category: input.category,
      contact_name: input.contactName?.trim() || null,
      phone: input.phone?.trim() || null,
      proposed_amount: input.proposedAmount ?? null,
      notes: input.notes?.trim() || null,
      status: "considering",
    })
    .select()
    .single();
  if (error) throw error;
  return mapCandidate(data as CandidateRow, []);
}

export async function updateVendorCandidateStatus(
  candidateId: string,
  status: VendorCandidateStatus,
): Promise<void> {
  const { error } = await supabase
    .from("vendor_candidates")
    .update({ status })
    .eq("id", candidateId);
  if (error) throw error;
}

export async function rejectOtherCandidatesInCategory(
  weddingId: string,
  category: VendorCategory,
  exceptCandidateId: string,
): Promise<void> {
  const { error } = await supabase
    .from("vendor_candidates")
    .update({ status: "rejected" })
    .eq("wedding_id", weddingId)
    .eq("category", category)
    .eq("status", "considering")
    .neq("id", exceptCandidateId);
  if (error) throw error;
}

export async function promoteCandidate(candidate: VendorCandidate): Promise<Vendor> {
  const { data, error } = await supabase
    .from("vendors")
    .insert({
      wedding_id: candidate.weddingId,
      name: candidate.name.trim(),
      category: candidate.category,
      contact_name: candidate.contactName?.trim() || null,
      phone: candidate.phone?.trim() || null,
      total_cost: candidate.proposedAmount ?? 0,
      advance_paid: 0,
      due_date: null,
      status: "Confirmed",
      notes: candidate.notes?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;

  await updateVendorCandidateStatus(candidate.id, "promoted");

  return {
    id: data.id,
    name: data.name,
    category: data.category as VendorCategory,
    contactName: data.contact_name ?? "",
    phone: data.phone ?? "",
    totalCost: Number(data.total_cost) || 0,
    advancePaid: Number(data.advance_paid) || 0,
    dueDate: data.due_date ?? "",
    status: "Confirmed",
    notes: data.notes ?? undefined,
    payments: [],
  };
}

function guessContentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

export async function uploadCandidateFile(
  weddingId: string,
  candidateId: string,
  localUri: string,
  fileName: string,
): Promise<VendorCandidateFile> {
  const safeName = fileName.replace(/[^\w.\-()+ ]+/g, "_");
  const storagePath = `${weddingId}/${candidateId}/${Date.now()}-${safeName}`;
  const contentType = guessContentType(safeName);

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, blob, { contentType, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("vendor_candidate_files")
    .insert({
      vendor_candidate_id: candidateId,
      storage_path: storagePath,
      file_name: safeName,
    })
    .select()
    .single();
  if (error) throw error;
  return mapFile(data as FileRow);
}

export async function getCandidateFileSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Could not create signed URL");
  return data.signedUrl;
}

export async function deleteCandidateFile(file: VendorCandidateFile): Promise<void> {
  const { error: dbError } = await supabase
    .from("vendor_candidate_files")
    .delete()
    .eq("id", file.id);
  if (dbError) throw dbError;

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([file.storagePath]);
  if (storageError) throw storageError;
}

export function isImageFileName(fileName?: string): boolean {
  if (!fileName) return false;
  return /\.(png|jpe?g|gif|webp|heic)$/i.test(fileName);
}
