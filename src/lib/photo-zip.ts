import JSZip from "jszip";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export type ZipPhoto = {
  storagePath: string;
  url: string;
};

function fileNameFromPath(storagePath: string, index: number): string {
  const base = storagePath.split("/").pop() || `photo-${index + 1}.jpg`;
  return base.includes(".") ? base : `${base}.jpg`;
}

/** Build a zip in cache and open the system share sheet. */
export async function sharePhotosAsZip(
  photos: ZipPhoto[],
  zipName: string,
): Promise<void> {
  if (photos.length === 0) throw new Error("No photos to download");

  const zip = new JSZip();
  await Promise.all(
    photos.map(async (photo, i) => {
      const response = await fetch(photo.url);
      if (!response.ok) throw new Error(`Could not fetch photo ${i + 1}`);
      const buffer = await response.arrayBuffer();
      zip.file(fileNameFromPath(photo.storagePath, i), buffer);
    }),
  );

  const base64 = await zip.generateAsync({ type: "base64" });
  const name = zipName.endsWith(".zip") ? zipName : `${zipName}.zip`;
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) throw new Error("Cache directory unavailable");
  const path = `${cacheDir}${name}`;
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Sharing is not available on this device");
  }

  await Sharing.shareAsync(path, {
    mimeType: "application/zip",
    dialogTitle: "Save wedding photos",
    UTI: "public.zip-archive",
  });
}
