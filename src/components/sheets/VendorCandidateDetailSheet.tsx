import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import {
  CheckCircle2,
  FileText,
  FilePlus,
  Image as ImageIcon,
  ImagePlus,
  XCircle,
} from "lucide-react-native";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useDeleteCandidateFile,
  usePromoteCandidate,
  useUpdateCandidateStatus,
  useUploadCandidateFile,
} from "../../hooks/use-vendor-candidates";
import {
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

export const VendorCandidateDetailSheet = forwardRef<BottomSheetModal, Props>(
  function VendorCandidateDetailSheet({ candidate, weddingId, onClose }, ref) {
    const innerRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => innerRef.current!);

    const promote = usePromoteCandidate(weddingId);
    const updateStatus = useUpdateCandidateStatus(weddingId);
    const uploadFile = useUploadCandidateFile(weddingId);
    const deleteFile = useDeleteCandidateFile(weddingId);

    const [previewUri, setPreviewUri] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      setError(null);
      setPreviewUri(null);
    }, [candidate?.id]);

    const openFile = async (file: VendorCandidateFile) => {
      try {
        const url = await getCandidateFileSignedUrl(file.storagePath);
        if (isImageFileName(file.fileName)) {
          setPreviewUri(url);
          return;
        }
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(url, {
            mimeType: "application/pdf",
            dialogTitle: file.fileName ?? "Document",
          });
        } else {
          await Linking.openURL(url);
        }
      } catch (err) {
        showAppAlert("Could not open file", err instanceof Error ? err.message : "Try again");
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
        setError(err instanceof Error ? err.message : "Upload failed");
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
        setError(err instanceof Error ? err.message : "Upload failed");
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
          <View style={styles.docCard}>
            {candidate.files.length === 0 ? (
              <Text style={styles.empty}>No documents yet</Text>
            ) : (
              candidate.files.map((file) => (
                <AppPressable
                  key={file.id}
                  onPress={() => void openFile(file)}
                  onLongPress={() => {
                    requestAppConfirm({
                      title: "Remove document?",
                      message: file.fileName ?? "This file",
                      confirmLabel: "Remove",
                      destructive: true,
                      onConfirm: () => void deleteFile.mutateAsync(file),
                    });
                  }}
                  style={styles.docRow}
                >
                  {isImageFileName(file.fileName) ? (
                    <ImageIcon size={18} color={colors.primary} />
                  ) : (
                    <FileText size={18} color={colors.primary} />
                  )}
                  <Text style={styles.docName} numberOfLines={1}>
                    {file.fileName ?? "Document"}
                  </Text>
                </AppPressable>
              ))
            )}
          </View>

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

        <Modal visible={!!previewUri} transparent animationType="fade">
          <View style={styles.previewBackdrop}>
            <AppPressable onPress={() => setPreviewUri(null)} style={styles.previewClose}>
              <Text style={styles.previewCloseText}>Close</Text>
            </AppPressable>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
            ) : null}
          </View>
        </Modal>
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
  docCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: "hidden",
  },
  empty: {
    padding: 16,
    textAlign: "center",
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  docName: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
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
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    padding: 16,
  },
  previewClose: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 2,
    padding: 8,
  },
  previewCloseText: {
    color: "#fff",
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
  previewImage: {
    width: "100%",
    height: "80%",
  },
});
