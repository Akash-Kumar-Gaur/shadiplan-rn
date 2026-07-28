import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Camera,
  Check,
  Copy,
  Download,
  FolderPlus,
  MoveRight,
  QrCode,
  Trash2,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "../components/AppPressable";
import { requestAppConfirm, showAppAlert } from "../components/ConfirmSheet";
import { AppTextInput } from "../components/AppTextInput";
import { ScreenEmpty } from "../components/ScreenEmpty";
import { ScreenLoader } from "../components/ScreenLoader";
import { StackScreenHeader } from "../components/StackScreenHeader";
import { useWeddingMeta } from "../hooks/use-wedding-meta";
import {
  albumGuestUrl,
  copyPhotos,
  createPhotoAlbum,
  deletePhotoUpload,
  fetchAlbumUploads,
  fetchWeddingAlbums,
  getSignedPhotoUrl,
  groupByUploader,
  movePhotos,
  type PhotoAlbum,
  type PhotoUpload,
  type UploaderGroup,
} from "../lib/photo-album-api";
import { sharePhotosAsZip } from "../lib/photo-zip";
import { weddingQueryKeys } from "../lib/wedding-query-keys";
import { colors, fonts, radius, spacing } from "../theme/tokens";

type TransferMode = "move" | "copy";

export function PhotoAlbumScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: wedding, isLoading: weddingLoading } = useWeddingMeta();
  const weddingId = wedding?.id;

  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newAlbumOpen, setNewAlbumOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [shareAlbum, setShareAlbum] = useState<PhotoAlbum | null>(null);
  const [transferMode, setTransferMode] = useState<TransferMode | null>(null);

  const albumsQuery = useQuery({
    queryKey: weddingQueryKeys.photoAlbums(weddingId ?? ""),
    queryFn: () => fetchWeddingAlbums(weddingId!),
    enabled: !!weddingId,
  });

  const albums = albumsQuery.data ?? [];
  const selectedAlbum = albums.find((a) => a.id === selectedAlbumId) ?? null;

  const uploadsQuery = useQuery({
    queryKey: weddingQueryKeys.photoUploads(selectedAlbum?.id ?? ""),
    queryFn: () => fetchAlbumUploads(selectedAlbum!.id),
    enabled: !!selectedAlbum?.id,
  });

  const groups = useMemo(
    () => groupByUploader(uploadsQuery.data ?? []),
    [uploadsQuery.data],
  );
  const openGroup = groups.find((g) => g.key === openGroupKey) ?? null;
  const otherAlbums = albums.filter((a) => a.id !== selectedAlbum?.id);

  const invalidateAlbums = () => {
    if (!weddingId) return;
    void queryClient.invalidateQueries({
      queryKey: weddingQueryKeys.photoAlbums(weddingId),
    });
  };

  const invalidateUploads = () => {
    if (!selectedAlbum?.id) return;
    void queryClient.invalidateQueries({
      queryKey: weddingQueryKeys.photoUploads(selectedAlbum.id),
    });
    invalidateAlbums();
  };

  const createMutation = useMutation({
    mutationFn: (name: string) => createPhotoAlbum(weddingId!, name),
    onSuccess: (album) => {
      invalidateAlbums();
      setNewAlbumOpen(false);
      setNewAlbumName("");
      setSelectedAlbumId(album.id);
      setOpenGroupKey(null);
    },
    onError: (err) => {
      showAppAlert("Could not create album", err instanceof Error ? err.message : "Try again");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (upload: PhotoUpload) => deletePhotoUpload(upload),
    onSuccess: () => invalidateUploads(),
  });

  const transferMutation = useMutation({
    mutationFn: async ({
      mode,
      photos,
      destAlbumId,
    }: {
      mode: TransferMode;
      photos: PhotoUpload[];
      destAlbumId: string;
    }) => {
      if (mode === "move") await movePhotos(photos, destAlbumId);
      else await copyPhotos(photos, destAlbumId);
    },
    onSuccess: (_data, vars) => {
      invalidateUploads();
      void queryClient.invalidateQueries({
        queryKey: weddingQueryKeys.photoUploads(vars.destAlbumId),
      });
      setTransferMode(null);
      setSelectedIds(new Set());
      setSelectMode(false);
    },
    onError: (err) => {
      showAppAlert("Transfer failed", err instanceof Error ? err.message : "Try again");
    },
  });

  const guestUrlFor = (album: PhotoAlbum) => albumGuestUrl(album.accessToken);
  const uploadCount = uploadsQuery.data?.length ?? 0;

  const shareLink = async (album: PhotoAlbum) => {
    const guestUrl = guestUrlFor(album);
    if (!guestUrl.startsWith("http")) {
      showAppAlert(
        "Set web app URL",
        "Add EXPO_PUBLIC_WEB_APP_URL to your .env so the QR points at the guest upload page.",
      );
      return;
    }
    await Share.share({ message: guestUrl, title: album.name });
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
      showAppAlert("Download failed", err instanceof Error ? err.message : "Could not create zip");
    } finally {
      setDownloading(false);
    }
  };

  const exitAlbum = () => {
    setSelectedAlbumId(null);
    setOpenGroupKey(null);
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const exitGroup = () => {
    setOpenGroupKey(null);
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedPhotos = (openGroup?.photos ?? []).filter((p) => selectedIds.has(p.id));

  const loading = weddingLoading || (!!weddingId && albumsQuery.isPending);

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
        {!selectedAlbum ? (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>Albums ({albums.length})</Text>
              <AppPressable
                onPress={() => {
                  setNewAlbumName("");
                  setNewAlbumOpen(true);
                }}
                style={styles.downloadBtn}
              >
                <FolderPlus size={14} color={colors.primary} />
                <Text style={styles.downloadText}>New album</Text>
              </AppPressable>
            </View>
            {albumsQuery.isError ? (
              <Text style={styles.empty}>Could not load albums.</Text>
            ) : (
              <View style={styles.groupList}>
                {albums.map((album) => (
                  <View key={album.id} style={styles.albumCard}>
                    <AppPressable
                      onPress={() => {
                        setSelectedAlbumId(album.id);
                        setOpenGroupKey(null);
                      }}
                      style={styles.albumCardBody}
                    >
                      <Text style={styles.groupCardTitle} numberOfLines={1}>
                        {album.name}
                      </Text>
                      <Text style={styles.groupMeta}>
                        {album.photoCount} photo{album.photoCount === 1 ? "" : "s"}
                      </Text>
                    </AppPressable>
                    <AppPressable
                      onPress={() => setShareAlbum(album)}
                      style={styles.albumShareRow}
                    >
                      <QrCode size={14} color={colors.primary} />
                      <Text style={styles.downloadText}>Share QR</Text>
                    </AppPressable>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            <AppPressable onPress={exitAlbum} style={styles.backRow}>
              <ArrowLeft size={14} color={colors.primary} />
              <Text style={styles.backText}>All albums</Text>
            </AppPressable>

            <View style={styles.sectionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupTitle}>{selectedAlbum.name}</Text>
                <Text style={styles.groupMeta}>
                  {uploadCount} photo{uploadCount === 1 ? "" : "s"}
                </Text>
              </View>
              <AppPressable onPress={() => setShareAlbum(selectedAlbum)} style={styles.downloadBtn}>
                <QrCode size={14} color={colors.primary} />
                <Text style={styles.downloadText}>Share QR</Text>
              </AppPressable>
            </View>

            {openGroup ? (
              <>
                <AppPressable onPress={exitGroup} style={styles.backRow}>
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
                    onPress={() => {
                      setSelectMode((v) => !v);
                      setSelectedIds(new Set());
                    }}
                    style={styles.downloadBtn}
                  >
                    <Text style={styles.downloadText}>{selectMode ? "Done" : "Select"}</Text>
                  </AppPressable>
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

                {selectMode && selectedIds.size > 0 ? (
                  <View style={styles.toolbar}>
                    <Text style={styles.toolbarCount}>{selectedIds.size} selected</Text>
                    <AppPressable
                      onPress={() => {
                        if (otherAlbums.length === 0) {
                          showAppAlert(
                            "Create another album",
                            "You need a second album to move or copy photos.",
                          );
                          return;
                        }
                        setTransferMode("move");
                      }}
                      style={styles.downloadBtn}
                    >
                      <MoveRight size={14} color={colors.primary} />
                      <Text style={styles.downloadText}>Move</Text>
                    </AppPressable>
                    <AppPressable
                      onPress={() => {
                        if (otherAlbums.length === 0) {
                          showAppAlert(
                            "Create another album",
                            "You need a second album to move or copy photos.",
                          );
                          return;
                        }
                        setTransferMode("copy");
                      }}
                      style={styles.downloadBtn}
                    >
                      <Copy size={14} color={colors.primary} />
                      <Text style={styles.downloadText}>Copy</Text>
                    </AppPressable>
                  </View>
                ) : null}

                <View style={styles.grid}>
                  {openGroup.photos.map((upload) => (
                    <HostPhotoCard
                      key={upload.id}
                      upload={upload}
                      selectMode={selectMode}
                      selected={selectedIds.has(upload.id)}
                      onToggleSelect={() => toggleSelected(upload.id)}
                      onDelete={() =>
                        requestAppConfirm({
                          title: "Delete photo?",
                          confirmLabel: "Delete",
                          destructive: true,
                          onConfirm: () => deleteMutation.mutate(upload),
                        })
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
                          selectedAlbum.name.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") ||
                          "album";
                        void zipPhotos(uploadsQuery.data ?? [], slug);
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
                  <Text style={styles.empty}>No photos yet — share this album's QR.</Text>
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
          </>
        )}
      </ScrollView>

      <Modal visible={newAlbumOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New album</Text>
            <AppTextInput
              native
              value={newAlbumName}
              onChangeText={setNewAlbumName}
              placeholder="e.g. Haldi, Reception…"
              autoFocus
              containerStyle={{ marginBottom: 16 }}
            />
            <View style={styles.modalActions}>
              <AppPressable onPress={() => setNewAlbumOpen(false)} style={styles.modalBtn}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </AppPressable>
              <AppPressable
                onPress={() => {
                  if (!newAlbumName.trim()) return;
                  createMutation.mutate(newAlbumName);
                }}
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                disabled={createMutation.isPending || !newAlbumName.trim()}
              >
                <Text style={[styles.modalBtnText, styles.modalBtnPrimaryText]}>
                  {createMutation.isPending ? "…" : "Create"}
                </Text>
              </AppPressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!shareAlbum} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{shareAlbum?.name ?? "Share"}</Text>
              <AppPressable onPress={() => setShareAlbum(null)}>
                <X size={18} color={colors.mutedForeground} />
              </AppPressable>
            </View>
            {shareAlbum && guestUrlFor(shareAlbum).startsWith("http") ? (
              <View style={styles.qrWrap}>
                <QRCode
                  value={guestUrlFor(shareAlbum)}
                  size={180}
                  backgroundColor="#FFFFFF"
                  color="#3C332C"
                />
              </View>
            ) : (
              <View style={styles.qrPlaceholder}>
                <Camera size={28} color={colors.mutedForeground} />
                <Text style={styles.qrHint}>Set EXPO_PUBLIC_WEB_APP_URL to enable the guest QR.</Text>
              </View>
            )}
            {shareAlbum ? (
              <>
                <Text style={styles.url} selectable>
                  {guestUrlFor(shareAlbum)}
                </Text>
                <AppPressable
                  onPress={() => void shareLink(shareAlbum)}
                  style={styles.shareBtn}
                >
                  <Copy size={16} color={colors.primary} />
                  <Text style={styles.shareText}>Share album link</Text>
                </AppPressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={transferMode != null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {transferMode === "copy" ? "Copy to album" : "Move to album"}
            </Text>
            <Text style={styles.modalHint}>
              {transferMode === "copy"
                ? "Copies share the same file. Deleting from one album leaves the other intact."
                : "Photos will leave this album and appear in the destination."}
            </Text>
            <ScrollView style={{ maxHeight: 240 }}>
              {otherAlbums.map((album) => (
                <AppPressable
                  key={album.id}
                  disabled={transferMutation.isPending}
                  onPress={() => {
                    if (!transferMode || selectedPhotos.length === 0) return;
                    transferMutation.mutate({
                      mode: transferMode,
                      photos: selectedPhotos,
                      destAlbumId: album.id,
                    });
                  }}
                  style={styles.pickerRow}
                >
                  <Text style={styles.groupCardTitle}>{album.name}</Text>
                  <Text style={styles.groupMeta}>
                    {album.photoCount} photo{album.photoCount === 1 ? "" : "s"}
                  </Text>
                </AppPressable>
              ))}
            </ScrollView>
            <AppPressable onPress={() => setTransferMode(null)} style={styles.modalBtn}>
              <Text style={styles.modalBtnText}>Cancel</Text>
            </AppPressable>
          </View>
        </View>
      </Modal>
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
  selectMode,
  selected,
  onToggleSelect,
  onDelete,
}: {
  upload: PhotoUpload;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
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
    <View style={[styles.photoCard, selected && styles.photoCardSelected]}>
      <AppPressable
        onPress={selectMode ? onToggleSelect : undefined}
        style={styles.photoFrame}
        disabled={!selectMode}
      >
        {url ? (
          <Image source={{ uri: url }} style={styles.photo} />
        ) : (
          <View style={styles.photoLoading}>
            <ActivityIndicator color={colors.mutedForeground} />
          </View>
        )}
        {selectMode ? (
          <View style={[styles.checkBadge, selected && styles.checkBadgeOn]}>
            <Check size={12} color={selected ? "#fff" : "transparent"} />
          </View>
        ) : (
          <AppPressable onPress={onDelete} style={styles.deleteBtn} accessibilityLabel="Delete photo">
            <Trash2 size={14} color={colors.destructive} />
          </AppPressable>
        )}
      </AppPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  albumCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  albumCardBody: { paddingHorizontal: 14, paddingVertical: 14 },
  albumShareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  qrWrap: { backgroundColor: "#FFFFFF", padding: 12, borderRadius: radius.md, alignSelf: "center" },
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
    marginTop: 12,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },
  sectionRow: {
    marginTop: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
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
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  toolbarCount: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.mutedForeground,
    marginRight: 4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  photoCard: { width: "47%" },
  photoCardSelected: {
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
  },
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
  checkBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBadgeOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.foreground,
    marginBottom: 12,
  },
  modalHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 12,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalBtnText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.foreground },
  modalBtnPrimaryText: { color: "#fff" },
  pickerRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
