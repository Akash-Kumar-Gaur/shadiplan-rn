import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, Copy, Download, Trash2 } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "../components/AppPressable";
import { ScreenEmpty } from "../components/ScreenEmpty";
import { ScreenLoader } from "../components/ScreenLoader";
import { StackScreenHeader } from "../components/StackScreenHeader";
import { useWeddingMeta } from "../hooks/use-wedding-meta";
import {
  albumGuestUrl,
  deletePhotoUpload,
  ensurePhotoAlbum,
  fetchAlbumUploads,
  getSignedPhotoUrl,
  groupByUploader,
  type PhotoUpload,
  type UploaderGroup,
} from "../lib/photo-album-api";
import { sharePhotosAsZip } from "../lib/photo-zip";
import { weddingQueryKeys } from "../lib/wedding-query-keys";
import { colors, fonts, radius, spacing } from "../theme/tokens";

export function PhotoAlbumScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: wedding, isLoading: weddingLoading } = useWeddingMeta();
  const weddingId = wedding?.id;
  const [downloading, setDownloading] = useState(false);
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);

  const albumQuery = useQuery({
    queryKey: weddingQueryKeys.photoAlbum(weddingId ?? ""),
    queryFn: () => ensurePhotoAlbum(weddingId!),
    enabled: !!weddingId,
  });

  const uploadsQuery = useQuery({
    queryKey: weddingQueryKeys.photoUploads(albumQuery.data?.id ?? ""),
    queryFn: () => fetchAlbumUploads(albumQuery.data!.id),
    enabled: !!albumQuery.data?.id,
  });

  const groups = useMemo(
    () => groupByUploader(uploadsQuery.data ?? []),
    [uploadsQuery.data],
  );
  const openGroup = groups.find((g) => g.key === openGroupKey) ?? null;

  const deleteMutation = useMutation({
    mutationFn: (upload: PhotoUpload) => deletePhotoUpload(upload),
    onSuccess: () => {
      if (!albumQuery.data?.id) return;
      void queryClient.invalidateQueries({
        queryKey: weddingQueryKeys.photoUploads(albumQuery.data.id),
      });
    },
  });

  const guestUrl = albumQuery.data ? albumGuestUrl(albumQuery.data.accessToken) : "";
  const hasAbsoluteUrl = guestUrl.startsWith("http");
  const uploadCount = uploadsQuery.data?.length ?? 0;

  const shareLink = async () => {
    if (!guestUrl) return;
    if (!hasAbsoluteUrl) {
      Alert.alert(
        "Set web app URL",
        "Add EXPO_PUBLIC_WEB_APP_URL to your .env (your deployed ShadiPlan web origin) so the QR points at the guest upload page.",
      );
      return;
    }
    await Share.share({ message: guestUrl, title: "Guest photo album" });
  };

  const zipPhotos = async (uploads: PhotoUpload[], zipName: string) => {
    if (uploads.length === 0) return;
    setDownloading(true);
    try {
      const photos = await Promise.all(
        uploads.map(async (u) => ({
          storagePath: u.storagePath,
          url: await getSignedPhotoUrl(u.storagePath),
        })),
      );
      await sharePhotosAsZip(photos, zipName);
    } catch (err) {
      Alert.alert("Download failed", err instanceof Error ? err.message : "Could not create zip");
    } finally {
      setDownloading(false);
    }
  };

  const loading = weddingLoading || (!!weddingId && albumQuery.isPending);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenLoader />
      </View>
    );
  }

  if (!wedding) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenEmpty description="Set up your wedding first." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StackScreenHeader title="Photo Album" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.screen, paddingBottom: insets.bottom + 32 }}
      >
        {!openGroup ? (
          <View style={styles.qrCard}>
            {albumQuery.data && hasAbsoluteUrl ? (
              <View style={styles.qrWrap}>
                <QRCode value={guestUrl} size={180} backgroundColor="#FFFFFF" color="#3C332C" />
              </View>
            ) : (
              <View style={styles.qrPlaceholder}>
                <Camera size={28} color={colors.mutedForeground} />
                <Text style={styles.qrHint}>
                  {albumQuery.isError
                    ? "Could not create album."
                    : "Set EXPO_PUBLIC_WEB_APP_URL to enable the guest QR."}
                </Text>
              </View>
            )}
            {guestUrl ? (
              <Text style={styles.url} selectable>
                {guestUrl}
              </Text>
            ) : null}
            <AppPressable onPress={() => void shareLink()} style={styles.shareBtn}>
              <Copy size={16} color={colors.primary} />
              <Text style={styles.shareText}>Share album link</Text>
            </AppPressable>
          </View>
        ) : null}

        {openGroup ? (
          <>
            <AppPressable onPress={() => setOpenGroupKey(null)} style={styles.backRow}>
              <ArrowLeft size={14} color={colors.primary} />
              <Text style={styles.backText}>All guests</Text>
            </AppPressable>
            <View style={styles.sectionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupTitle}>{openGroup.label}</Text>
                <Text style={styles.groupMeta}>
                  {openGroup.photoCount} photo{openGroup.photoCount === 1 ? "" : "s"}
                </Text>
              </View>
              <AppPressable
                onPress={() =>
                  void zipPhotos(
                    openGroup.photos,
                    `${openGroup.label.replace(/[^\w\s-]/g, "").trim() || "guest"}-photos`,
                  )
                }
                disabled={downloading}
                style={styles.downloadBtn}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Download size={14} color={colors.primary} />
                    <Text style={styles.downloadText}>Download</Text>
                  </>
                )}
              </AppPressable>
            </View>
            <View style={styles.grid}>
              {openGroup.photos.map((upload) => (
                <HostPhotoCard
                  key={upload.id}
                  upload={upload}
                  onDelete={() =>
                    Alert.alert("Delete photo?", undefined, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => deleteMutation.mutate(upload),
                      },
                    ])
                  }
                />
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>
                Guests ({groups.length}) · {uploadCount} photos
              </Text>
              {uploadCount > 0 ? (
                <AppPressable
                  onPress={() => {
                    const slug =
                      wedding.coupleNames.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") ||
                      "wedding";
                    void zipPhotos(uploadsQuery.data ?? [], `${slug}-album`);
                  }}
                  disabled={downloading}
                  style={styles.downloadBtn}
                >
                  {downloading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Download size={14} color={colors.primary} />
                      <Text style={styles.downloadText}>Download all</Text>
                    </>
                  )}
                </AppPressable>
              ) : null}
            </View>
            {uploadsQuery.isPending ? (
              <ActivityIndicator color={colors.primary} />
            ) : uploadCount === 0 ? (
              <Text style={styles.empty}>No photos yet — share the QR at the wedding.</Text>
            ) : (
              <View style={styles.groupList}>
                {groups.map((group) => (
                  <UploaderGroupCard
                    key={group.key}
                    group={group}
                    onOpen={() => setOpenGroupKey(group.key)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function UploaderGroupCard({
  group,
  onOpen,
}: {
  group: UploaderGroup;
  onOpen: () => void;
}) {
  const previews = group.photos.slice(0, 4);

  return (
    <AppPressable onPress={onOpen} style={styles.groupCard}>
      <View style={styles.thumbRow}>
        {previews.map((photo) => (
          <GroupThumb key={photo.id} storagePath={photo.storagePath} />
        ))}
        {Array.from({ length: Math.max(0, 4 - previews.length) }).map((_, i) => (
          <View key={`e-${i}`} style={styles.thumbEmpty} />
        ))}
      </View>
      <View style={styles.groupCardBody}>
        <Text style={styles.groupCardTitle} numberOfLines={1}>
          {group.label}
        </Text>
        <Text style={styles.groupMeta}>
          {group.photoCount} photo{group.photoCount === 1 ? "" : "s"}
        </Text>
      </View>
    </AppPressable>
  );
}

function GroupThumb({ storagePath }: { storagePath: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getSignedPhotoUrl(storagePath)
      .then((signed) => {
        if (!cancelled) setUrl(signed);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  return (
    <View style={styles.thumb}>
      {url ? <Image source={{ uri: url }} style={styles.thumbImage} /> : null}
    </View>
  );
}

function HostPhotoCard({
  upload,
  onDelete,
}: {
  upload: PhotoUpload;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getSignedPhotoUrl(upload.storagePath)
      .then((signed) => {
        if (!cancelled) setUrl(signed);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [upload.storagePath]);

  return (
    <View style={styles.photoCard}>
      <View style={styles.photoFrame}>
        {url ? (
          <Image source={{ uri: url }} style={styles.photo} />
        ) : (
          <View style={styles.photoLoading}>
            <ActivityIndicator color={colors.mutedForeground} />
          </View>
        )}
        <AppPressable onPress={onDelete} style={styles.deleteBtn} accessibilityLabel="Delete photo">
          <Trash2 size={14} color={colors.destructive} />
        </AppPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  qrCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  qrWrap: { backgroundColor: "#FFFFFF", padding: 12, borderRadius: radius.md },
  qrPlaceholder: { alignItems: "center", gap: 8, paddingVertical: 24 },
  qrHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  url: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },
  sectionRow: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  section: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.foreground,
    flex: 1,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  downloadText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.mutedForeground },
  groupList: { gap: 12 },
  groupCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  thumbRow: { flexDirection: "row" },
  thumb: { flex: 1, aspectRatio: 1, backgroundColor: colors.secondary },
  thumbEmpty: { flex: 1, aspectRatio: 1, backgroundColor: colors.secondary },
  thumbImage: { width: "100%", height: "100%" },
  groupCardBody: { paddingHorizontal: 14, paddingVertical: 12 },
  groupCardTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  groupTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.foreground,
  },
  groupMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  backText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  photoCard: { width: "47%" },
  photoFrame: {
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photo: { width: "100%", height: "100%" },
  photoLoading: { flex: 1, alignItems: "center", justifyContent: "center" },
  deleteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: colors.card,
    borderRadius: 999,
    padding: 6,
  },
});
