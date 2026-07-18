import { supabase } from "./supabase";

export type PhotoAlbum = {
  id: string;
  weddingId: string;
  accessToken: string;
};

export type PhotoUpload = {
  id: string;
  albumId: string;
  storagePath: string;
  uploaderName?: string;
  createdAt: string;
};

type AlbumRow = {
  id: string;
  wedding_id: string;
  access_token: string;
};

type UploadRow = {
  id: string;
  album_id: string;
  storage_path: string;
  uploader_name: string | null;
  created_at: string;
};

function mapAlbum(row: AlbumRow): PhotoAlbum {
  return {
    id: row.id,
    weddingId: row.wedding_id,
    accessToken: row.access_token,
  };
}

function mapUpload(row: UploadRow): PhotoUpload {
  return {
    id: row.id,
    albumId: row.album_id,
    storagePath: row.storage_path,
    uploaderName: row.uploader_name ?? undefined,
    createdAt: row.created_at,
  };
}

export async function ensurePhotoAlbum(weddingId: string): Promise<PhotoAlbum> {
  const { data: existing, error: fetchError } = await supabase
    .from("photo_albums")
    .select("*")
    .eq("wedding_id", weddingId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return mapAlbum(existing as AlbumRow);

  const { data, error } = await supabase
    .from("photo_albums")
    .insert({ wedding_id: weddingId })
    .select()
    .single();

  if (error) throw error;
  return mapAlbum(data as AlbumRow);
}

export async function fetchAlbumUploads(albumId: string): Promise<PhotoUpload[]> {
  const { data, error } = await supabase
    .from("photo_uploads")
    .select("*")
    .eq("album_id", albumId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapUpload(row as UploadRow));
}

export async function getSignedPhotoUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("wedding-photos")
    .createSignedUrl(storagePath, 60 * 60);

  if (error) throw error;
  return data.signedUrl;
}

export async function deletePhotoUpload(upload: PhotoUpload): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from("wedding-photos")
    .remove([upload.storagePath]);
  if (storageError) throw storageError;

  const { error } = await supabase.from("photo_uploads").delete().eq("id", upload.id);
  if (error) throw error;
}

/** Public guest upload URL on the web app. */
export function albumGuestUrl(accessToken: string): string {
  const origin = (process.env.EXPO_PUBLIC_WEB_APP_URL ?? "").replace(/\/$/, "");
  if (!origin) {
    return `/album/${accessToken}`;
  }
  return `${origin}/album/${accessToken}`;
}
