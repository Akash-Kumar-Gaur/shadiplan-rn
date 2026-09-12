import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import {
  CheckCircle2,
  FileText,
  FilePlus,
  Image as ImageIcon,
  ImagePlus,
  Trash2,
  XCircle,
} from "lucide-react-native";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import {
  useDeleteCandidateFile,
  usePromoteCandidate,
  useUpdateCandidateStatus,
  useUploadCandidateFile,
} from "../../hooks/use-vendor-candidates";
import {
  downloadCandidateFileToCache,
  getCandidateFileSignedUrl,
  isImageFileName,
} from "../../lib/vendor-candidates-api";
import type { VendorCandidate, VendorCandidateFile } from "../../types/wedding";
import { AmountText } from "../AmountText";
import { AppBottomSheet, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
import { requestAppConfirm, showAppAlert } from "../ConfirmSheet";
import { colors, fonts, radius } from "../../theme/tokens";

type Props = {
  candidate: VendorCandidate | null;
  weddingId: string | undefined;
  onClose: () => void;
};

type FilePreview = {
  uri: string;
  kind: "image" | "document";
  title: string;
};

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

export const VendorCandidateDetailSheet = forwardRef<BottomSheetModal, Props>(
  function VendorCandidateDetailSheet({ candidate, weddingId, onClose }, ref) {
    const insets = useSafeAreaInsets();
    const innerRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => innerRef.current!);

    const promote = usePromoteCandidate(weddingId);
    const updateStatus = useUpdateCandidateStatus(weddingId);
    const uploadFile = useUploadCandidateFile(weddingId);
    const deleteFile = useDeleteCandidateFile(weddingId);

    const [preview, setPreview] = useState<FilePreview | null>(null);
    const [opening, setOpening] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      setError(null);
      setPreview(null);
    }, [candidate?.id]);

    const openFile = async (file: VendorCandidateFile) => {
      setOpening(true);
      try {
        const title = file.fileName ?? "Document";

        if (isImageFileName(file.fileName)) {
          const { uri } = await downloadCandidateFileToCache(file);
          setPreview({ uri, kind: "image", title });
          return;
        }

        // Direct view — never use the share sheet.
        const url = await getCandidateFileSignedUrl(file.storagePath);
        if (Platform.OS === "android") {
          // Android WebView doesn't render PDFs; Custom Tabs / browser does.
          await WebBrowser.openBrowserAsync(url);
        } else {
          setPreview({ uri: url, kind: "document", title });
        }
      } catch (err) {
        console.error("[vendor-candidates] open file failed:", err);
        showAppAlert("Could not open file", errorMessage(err, "Try again"));
      } finally {
        setOpening(false);
      }
    };

    const pickImage = async () => {
      if (!candidate) return;
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError("Photo library permission is required");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setBusy(true);
      try {
        await uploadFile.mutateAsync({
          candidateId: candidate.id,
          localUri: asset.uri,
          fileName: asset.fileName ?? `estimate-${Date.now()}.jpg`,
        });
      } catch (err) {
        console.error("[vendor-candidates] upload photo failed:", err);
        setError(errorMessage(err, "Upload failed"));
      } finally {
        setBusy(false);
      }
    };

    const pickDocument = async () => {
      if (!candidate) return;
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setBusy(true);
      try {
        await uploadFile.mutateAsync({
          candidateId: candidate.id,
          localUri: asset.uri,
          fileName: asset.name,
        });
      } catch (err) {
        console.error("[vendor-candidates] upload document failed:", err);
        setError(errorMessage(err, "Upload failed"));
      } finally {
        setBusy(false);
      }
    };

    const handlePromote = () => {
      if (!candidate) return;
      requestAppConfirm({
        title: "Book this vendor?",
        message: `Promote ${candidate.name} to your booked vendors${
          candidate.proposedAmount != null ? ` at the proposed amount` : ""
        }.`,
        middleAction: {
          label: "Book only",
          onPress: () => void runPromote(false),
        },
        confirmLabel: "Book & reject others",
        destructive: true,
        onConfirm: () => void runPromote(true),
      });
    };

    const runPromote = async (rejectOthers: boolean) => {
      if (!candidate) return;
      setBusy(true);
      setError(null);
      try {
        await promote.mutateAsync({ candidate, rejectOthers });
        innerRef.current?.dismiss();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not promote");
      } finally {
        setBusy(false);
      }
    };

    const handleReject = async () => {
      if (!candidate) return;
      setBusy(true);
      try {
        await updateStatus.mutateAsync({ candidateId: candidate.id, status: "rejected" });
        innerRef.current?.dismiss();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not reject");
      } finally {
        setBusy(false);
      }
    };

    if (!candidate) return null;

    const considering = candidate.status === "considering";

    return (
      <>
        <AppBottomSheet
          ref={innerRef}
          title={candidate.name}
          subtitle={`${candidate.category} · ${candidate.status}`}
          onDismiss={onClose}
        >
          <View style={styles.metaCard}>
            {candidate.proposedAmount != null ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Proposed</Text>
                <AmountText value={candidate.proposedAmount} style={styles.metaValue} />
              </View>
            ) : null}
            {candidate.contactName ? (
              <Text style={styles.metaLine}>Contact: {candidate.contactName}</Text>
            ) : null}
            {candidate.phone ? <Text style={styles.metaLine}>Phone: {candidate.phone}</Text> : null}
            {candidate.notes ? <Text style={styles.notes}>{candidate.notes}</Text> : null}
          </View>

          <Text style={styles.sectionTitle}>Documents</Text>
          {candidate.files.length === 0 ? (
            <View style={styles.docCard}>
              <Text style={styles.empty}>No documents yet</Text>
            </View>
          ) : (
            <View style={styles.docList}>
              {candidate.files.map((file) => (
                <View key={file.id} style={styles.docItem}>
                  <AppPressable
                    onPress={() => void openFile(file)}
                    style={styles.docCard}
                    accessibilityLabel={`Open ${file.fileName ?? "document"}`}
                  >
                    <View style={styles.docOpen}>
                      {isImageFileName(file.fileName) ? (
                        <ImageIcon size={18} color={colors.primary} />
                      ) : (
                        <FileText size={18} color={colors.primary} />
                      )}
                      <Text style={styles.docName} numberOfLines={1}>
                        {file.fileName ?? "Document"}
                      </Text>
                    </View>
                  </AppPressable>
                  {considering ? (
                    <AppPressable
                      onPress={() => {
                        requestAppConfirm({
                          title: "Remove document?",
                          message: file.fileName ?? "This file",
                          confirmLabel: "Remove",
                          destructive: true,
                          onConfirm: () => void deleteFile.mutateAsync(file),
                        });
                      }}
                      style={styles.docRemoveOutside}
                      accessibilityLabel={`Remove ${file.fileName ?? "document"}`}
                    >
                      <Trash2 size={14} color={colors.destructive} />
                      <Text style={styles.docRemoveText}>Remove</Text>
                    </AppPressable>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {considering ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <AppPressable onPress={() => void pickImage()} style={[formStyles.outlineBtn, { flex: 1, marginTop: 0 }]}>
                <View style={styles.btnRow}>
                  <ImagePlus size={16} color={colors.primary} />
                  <Text style={formStyles.outlineBtnText}>Photo</Text>
                </View>
              </AppPressable>
              <AppPressable onPress={() => void pickDocument()} style={[formStyles.outlineBtn, { flex: 1, marginTop: 0 }]}>
                <View style={styles.btnRow}>
                  <FilePlus size={16} color={colors.primary} />
                  <Text style={formStyles.outlineBtnText}>PDF</Text>
                </View>
              </AppPressable>
            </View>
          ) : null}

          {error ? <Text style={formStyles.error}>{error}</Text> : null}

          {considering ? (
            <>
              <AppPressable
                onPress={handlePromote}
                disabled={busy}
                style={[formStyles.primaryBtn, busy && formStyles.primaryBtnDisabled]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.btnRow}>
                    <CheckCircle2 size={16} color={colors.primaryForeground} />
                    <Text style={formStyles.primaryBtnText}>Promote to booked</Text>
                  </View>
                )}
              </AppPressable>
              <AppPressable
                onPress={() => void handleReject()}
                disabled={busy}
                style={formStyles.outlineBtn}
              >
                <View style={styles.btnRow}>
                  <XCircle size={16} color={colors.destructive} />
                  <Text style={[formStyles.outlineBtnText, { color: colors.destructive }]}>
                    Mark rejected
                  </Text>
                </View>
              </AppPressable>
            </>
          ) : (
            <Text style={styles.statusNote}>
              This candidate is marked {candidate.status} and kept for history.
            </Text>
          )}
        </AppBottomSheet>

        <Modal
          visible={!!preview}
          animationType="fade"
          onRequestClose={() => setPreview(null)}
        >
          <View style={[styles.previewRoot, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {preview?.title ?? "Document"}
              </Text>
              <AppPressable onPress={() => setPreview(null)} style={styles.previewClose}>
                <Text style={styles.previewCloseText}>Close</Text>
              </AppPressable>
            </View>
            {preview?.kind === "image" ? (
              <Image source={{ uri: preview.uri }} style={styles.previewImage} resizeMode="contain" />
            ) : preview ? (
              <WebView
                source={{ uri: preview.uri }}
                style={styles.previewWeb}
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.previewLoading}>
                    <ActivityIndicator color={colors.terracottaDark} />
                  </View>
                )}
              />
            ) : null}
          </View>
        </Modal>

        {opening ? (
          <View style={styles.openingOverlay} pointerEvents="none">
            <ActivityIndicator color={colors.terracottaDark} />
          </View>
        ) : null}
      </>
    );
  },
);

const styles = StyleSheet.create({
  metaCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
    color: colors.foreground,
  },
  metaLine: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.foreground,
  },
  notes: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  sectionTitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  docList: {
    gap: 12,
    marginBottom: 16,
  },
  docItem: {
    gap: 6,
  },
  docCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  empty: {
    padding: 16,
    textAlign: "center",
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  docOpen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minWidth: 0,
  },
  docName: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  docRemoveOutside: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  docRemoveText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.destructive,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusNote: {
    marginTop: 12,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  previewRoot: {
    flex: 1,
    backgroundColor: "#111",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.15)",
  },
  previewTitle: {
    flex: 1,
    color: "#fff",
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  previewClose: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  previewCloseText: {
    color: colors.gold,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
  previewImage: {
    flex: 1,
    width: "100%",
  },
  previewWeb: {
    flex: 1,
    backgroundColor: "#fff",
  },
  previewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  openingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251,247,240,0.35)",
  },
});
