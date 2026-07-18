import { supabase } from "./supabase";

export type PhotoAlbum = {
  id: string;
  weddingId: string;
  accessToken: string;
  name: string;
  photoCount: number;
  createdAt: string;
};

export type PhotoUpload = {
  id: string;
  albumId: string;
  storagePath: string;
  uploaderName?: string;
  uploaderSessionId?: string;
  createdAt: string;
};

export type UploaderGroup = {
  key: string;
  label: string;
  photoCount: number;
  photos: PhotoUpload[];
};

type AlbumRow = {
  id: string;
  wedding_id: string;
  access_token: string;
  name: string | null;
  created_at: string;
  photo_uploads?: { count: number }[] | null;
};

type UploadRow = {
  id: string;
  album_id: string;
  storage_path: string;
  uploader_name: string | null;
  uploader_session_id: string | null;
  created_at: string;
};

function mapAlbum(row: AlbumRow): PhotoAlbum {
  const count = row.photo_uploads?.[0]?.count;
  return {
    id: row.id,
    weddingId: row.wedding_id,
    accessToken: row.access_token,
    name: row.name?.trim() || "Wedding Photos",
    photoCount: typeof count === "number" ? count : 0,
    createdAt: row.created_at,
  };
}

function mapUpload(row: UploadRow): PhotoUpload {
  return {
    id: row.id,
    albumId: row.album_id,
    storagePath: row.storage_path,
    uploaderName: row.uploader_name ?? undefined,
    uploaderSessionId: row.uploader_session_id ?? undefined,
    createdAt: row.created_at,
  };
}

function formatUploadLabel(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Group host gallery by persistent browser session (ongoing, not per-visit). */
export function groupByUploader(uploads: PhotoUpload[]): UploaderGroup[] {
  const groups = new Map<string, PhotoUpload[]>();
  for (const upload of uploads) {
    const key = upload.uploaderSessionId ?? `no-session-${upload.id}`;
    const list = groups.get(key) ?? [];
    list.push(upload);
    groups.set(key, list);
  }

  return Array.from(groups.entries())
    .map(([key, photos]) => {
      const sorted = [...photos].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const named = sorted.find((p) => p.uploaderName?.trim())?.uploaderName?.trim();
      const oldest = sorted[sorted.length - 1] ?? sorted[0];
      return {
        key,
        label: named || `Uploaded ${formatUploadLabel(oldest.createdAt)}`,
        photoCount: sorted.length,
        photos: sorted,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.photos[0]?.createdAt ?? 0).getTime() -
        new Date(a.photos[0]?.createdAt ?? 0).getTime(),
    );
}

const ALBUM_SELECT =
  "id, wedding_id, access_token, name, created_at, photo_uploads(count)";

export async function fetchWeddingAlbums(weddingId: string): Promise<PhotoAlbum[]> {
  const { data, error } = await supabase
    .from("photo_albums")
    .select(ALBUM_SELECT)
    .eq("wedding_id", weddingId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const albums = (data ?? []).map((row) => mapAlbum(row as AlbumRow));
  if (albums.length > 0) return albums;
  return [await createPhotoAlbum(weddingId, "Wedding Photos")];
}

export async function createPhotoAlbum(
  weddingId: string,
  name: string,
): Promise<PhotoAlbum> {
  const trimmed = name.trim() || "Wedding Photos";
  const { data, error } = await supabase
    .from("photo_albums")
    .insert({ wedding_id: weddingId, name: trimmed })
    .select(ALBUM_SELECT)
    .single();

  if (error) throw error;
  return mapAlbum(data as AlbumRow);
}

/** @deprecated Prefer fetchWeddingAlbums */
export async function ensurePhotoAlbum(weddingId: string): Promise<PhotoAlbum> {
  const albums = await fetchWeddingAlbums(weddingId);
  return albums[0]!;
}

export async function fetchAlbumUploads(albumId: string): Promise<PhotoUpload[]> {
  const { data, error } = await supabase
    .from("photo_uploads")
    .select("id, album_id, storage_path, uploader_name, uploader_session_id, created_at")
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

/**
 * Delete an upload row. Removes Storage only when no other row references
 * the same storage_path (copies share one file).
 */
export async function deletePhotoUpload(upload: PhotoUpload): Promise<void> {
  const { error } = await supabase.from("photo_uploads").delete().eq("id", upload.id);
  if (error) throw error;

  const { count, error: countError } = await supabase
    .from("photo_uploads")
    .select("id", { count: "exact", head: true })
    .eq("storage_path", upload.storagePath);
  if (countError) throw countError;

  if ((count ?? 0) === 0) {
    const { error: storageError } = await supabase.storage
      .from("wedding-photos")
      .remove([upload.storagePath]);
    if (storageError) throw storageError;
  }
}

export async function movePhoto(photoId: string, newAlbumId: string): Promise<void> {
  const { error } = await supabase
    .from("photo_uploads")
    .update({ album_id: newAlbumId })
    .eq("id", photoId);
  if (error) throw error;
}

export async function copyPhoto(photo: PhotoUpload, newAlbumId: string): Promise<void> {
  const { error } = await supabase.from("photo_uploads").insert({
    album_id: newAlbumId,
    storage_path: photo.storagePath,
    uploader_name: photo.uploaderName ?? null,
    uploader_session_id: photo.uploaderSessionId ?? null,
  });
  if (error) throw error;
}

export async function movePhotos(photos: PhotoUpload[], newAlbumId: string): Promise<void> {
  await Promise.all(photos.map((p) => movePhoto(p.id, newAlbumId)));
}

export async function copyPhotos(photos: PhotoUpload[], newAlbumId: string): Promise<void> {
  await Promise.all(photos.map((p) => copyPhoto(p, newAlbumId)));
}

/** Public guest upload URL on the web app. */
export function albumGuestUrl(accessToken: string): string {
  const origin = (process.env.EXPO_PUBLIC_WEB_APP_URL ?? "").replace(/\/$/, "");
  if (!origin) {
    return `/album/${accessToken}`;
  }
  return `${origin}/album/${accessToken}`;
}
