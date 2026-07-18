import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Copy, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
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
  type PhotoUpload,
} from "../lib/photo-album-api";
import { weddingQueryKeys } from "../lib/wedding-query-keys";
import { colors, fonts, radius, spacing } from "../theme/tokens";

export function PhotoAlbumScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: wedding, isLoading: weddingLoading } = useWeddingMeta();
  const weddingId = wedding?.id;

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

        <Text style={styles.section}>Uploads ({uploadsQuery.data?.length ?? 0})</Text>
        {uploadsQuery.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : (uploadsQuery.data?.length ?? 0) === 0 ? (
          <Text style={styles.empty}>No photos yet — share the QR at the wedding.</Text>
        ) : (
          <View style={styles.grid}>
            {uploadsQuery.data!.map((upload) => (
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
        )}
      </ScrollView>
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
      {upload.uploaderName ? (
        <Text style={styles.uploader} numberOfLines={1}>
          {upload.uploaderName}
        </Text>
      ) : null}
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
  section: {
    marginTop: 24,
    marginBottom: 12,
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.foreground,
  },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.mutedForeground },
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
  uploader: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
