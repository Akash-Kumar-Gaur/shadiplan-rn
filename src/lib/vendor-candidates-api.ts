import { supabase } from "./supabase";
import { shadowWrite, useNeonBackend } from "./supabase-dual-write";
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
  const candidateData = {
    wedding_id: weddingId,
    name: input.name.trim(),
    category: input.category,
    contact_name: input.contactName?.trim() || null,
    phone: input.phone?.trim() || null,
    proposed_amount: input.proposedAmount ?? null,
    notes: input.notes?.trim() || null,
    status: "considering",
  };

  const { data, error } = await supabase
    .from("vendor_candidates")
    .insert(candidateData)
    .select()
    .single();
  if (error) throw error;

  // Shadow write to Supabase
  if (useNeonBackend) {
    shadowWrite("vendor_candidates", "insert", { data: { ...candidateData, id: data.id } });
  }

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

  // Shadow write to Supabase
  if (useNeonBackend) {
    shadowWrite("vendor_candidates", "update", { id: candidateId, data: { status } });
  }
}

export async function rejectOtherCandidatesInCategory(
  weddingId: string,
  category: VendorCategory,
  exceptCandidateId: string,
): Promise<void> {
  // For batch updates, we can't easily shadow write each individual record,
  // so we'll log a general update. In production, fetch the IDs first if needed.
  const { error } = await supabase
    .from("vendor_candidates")
    .update({ status: "rejected" })
    .eq("wedding_id", weddingId)
    .eq("category", category)
    .eq("status", "considering")
    .neq("id", exceptCandidateId);
  if (error) throw error;

  // Note: Shadow write for batch update would require fetching IDs first.
  // For now, this is captured in the read-only operations.
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

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function storageObjectUrl(storagePath: string): string {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!baseUrl) throw new Error("Supabase URL is not configured");
  const encoded = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${baseUrl}/storage/v1/object/${BUCKET}/${encoded}`;
}

function uploadErrorFromBody(status: number, body: string): Error {
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: string };
    const msg = parsed.message ?? parsed.error;
    if (msg) return new Error(msg);
  } catch {
    // Non-JSON body — fall through to the status message.
  }
  return new Error(`Upload failed (HTTP ${status})`);
}

/** The native uploader only reads `file://` paths, so copy SAF/asset URIs first. */
async function ensureFileUri(localUri: string, fileName: string): Promise<string> {
  if (localUri.startsWith("file://")) return localUri;
  const FileSystem = await import("expo-file-system/legacy");
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) throw new Error("No cache directory available");
  const target = `${cacheDir}upload-${Date.now()}-${fileName}`;
  await FileSystem.copyAsync({ from: localUri, to: target });
  return target;
}

/**
 * Streams the file from disk via the native uploader. Reading a multi-MB photo
 * or PDF into JS (base64 → bytes) stalls or crashes Hermes, so the bytes must
 * never cross the bridge.
 */
async function uploadLocalFileToStorage(
  storagePath: string,
  localUri: string,
  fileName: string,
  contentType: string,
): Promise<void> {
  const FileSystem = await import("expo-file-system/legacy");
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token || !anonKey) {
    throw new Error("You are signed out — sign in again and retry");
  }

  const fileUri = await ensureFileUri(localUri, fileName);
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists) throw new Error("File is no longer available on this device");
  if (info.size === 0) throw new Error("File is empty");
  if (info.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `File is too large (${Math.round(info.size / 1024 / 1024)}MB). Limit is ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`,
    );
  }

  const result = await FileSystem.uploadAsync(storageObjectUrl(storagePath), fileUri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
      "content-type": contentType,
      "cache-control": "3600",
      "x-upsert": "false",
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw uploadErrorFromBody(result.status, result.body ?? "");
  }
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

  await uploadLocalFileToStorage(storagePath, localUri, safeName, contentType);

  const fileData = {
    vendor_candidate_id: candidateId,
    storage_path: storagePath,
    file_name: safeName,
  };

  const { data, error } = await supabase
    .from("vendor_candidate_files")
    .insert(fileData)
    .select()
    .single();
  if (error) {
    // Don't leave an object behind that nothing points at.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }

  // Shadow write to Supabase
  if (useNeonBackend) {
    shadowWrite("vendor_candidate_files", "insert", { data: { ...fileData, id: data.id } });
  }

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

/** Download a private candidate file to the device cache (needed for Sharing / local preview). */
export async function downloadCandidateFileToCache(
  file: VendorCandidateFile,
): Promise<{ uri: string; mimeType: string }> {
  const signedUrl = await getCandidateFileSignedUrl(file.storagePath);
  const FileSystem = await import("expo-file-system/legacy");
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) throw new Error("No cache directory available");

  const safeName = (file.fileName ?? "document").replace(/[^\w.\-()+ ]+/g, "_");
  const target = `${cacheDir}vendor-doc-${file.id}-${safeName}`;
  const result = await FileSystem.downloadAsync(signedUrl, target);
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Download failed (HTTP ${result.status})`);
  }

  const mimeType = guessContentType(safeName);
  return { uri: result.uri, mimeType };
}

export async function deleteCandidateFile(file: VendorCandidateFile): Promise<void> {
  const { error: dbError } = await supabase
    .from("vendor_candidate_files")
    .delete()
    .eq("id", file.id);
  if (dbError) throw dbError;

  // Shadow write to Supabase
  if (useNeonBackend) {
    shadowWrite("vendor_candidate_files", "delete", { id: file.id });
  }

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([file.storagePath]);
  if (storageError) throw storageError;
}

export function isImageFileName(fileName?: string): boolean {
  if (!fileName) return false;
  return /\.(png|jpe?g|gif|webp|heic)$/i.test(fileName);
}
