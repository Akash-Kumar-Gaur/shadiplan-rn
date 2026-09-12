import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { FilePlus, ImagePlus, X } from "lucide-react-native";
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useFormDirty } from "../../hooks/use-form-dirty";
import {
  useCreateVendorCandidate,
  useUploadCandidateFile,
} from "../../hooks/use-vendor-candidates";
import type { VendorCategory } from "../../types/wedding";
import { VENDOR_CATEGORIES } from "../../types/wedding";
import { colors, fonts, radius } from "../../theme/tokens";
import { AppBottomSheet, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
import { AppSelect } from "../AppSelect";
import { AppTextInput } from "../AppTextInput";
import { showAppAlert } from "../ConfirmSheet";

type PendingFile = { id: string; uri: string; name: string };

type Props = {
  weddingId: string | undefined;
  onCreated?: () => void;
};

function errorMessage(err: unknown, fallback: string): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code ?? "")
      : "";
  const msg =
    err instanceof Error && err.message
      ? err.message
      : err && typeof err === "object" && "message" in err
        ? String((err as { message?: unknown }).message ?? "")
        : "";

  if (code === "PGRST205" || /vendor_candidates/i.test(msg)) {
    return (
      "Shortlist tables are missing in Supabase. Open the SQL editor and run " +
      "supabase/vendor-candidates.sql, then try again."
    );
  }
  if (msg.trim()) return msg;
  return fallback;
}

export const VendorCandidateCreateSheet = forwardRef<BottomSheetModal, Props>(
  function VendorCandidateCreateSheet({ weddingId, onCreated }, ref) {
    const innerRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => innerRef.current!);

    const createCandidate = useCreateVendorCandidate(weddingId);
    const uploadFile = useUploadCandidateFile(weddingId);

    const [name, setName] = useState("");
    const [category, setCategory] = useState<VendorCategory>("Photography");
    const [contactName, setContactName] = useState("");
    const [phone, setPhone] = useState("");
    const [proposedAmount, setProposedAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
      setName("");
      setCategory("Photography");
      setContactName("");
      setPhone("");
      setProposedAmount("");
      setNotes("");
      setPendingFiles([]);
      setError(null);
    };

    const formValues = useMemo(
      () => ({
        name,
        category,
        contactName,
        phone,
        proposedAmount,
        notes,
        fileCount: pendingFiles.length,
      }),
      [name, category, contactName, phone, proposedAmount, notes, pendingFiles.length],
    );

    const baseline = useMemo(
      () => ({
        name: "",
        category: "Photography" as VendorCategory,
        contactName: "",
        phone: "",
        proposedAmount: "",
        notes: "",
        fileCount: 0,
      }),
      [],
    );

    const isDirty = useFormDirty(formValues, baseline);

    const pickImage = async () => {
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
      const fileName = asset.fileName ?? `estimate-${Date.now()}.jpg`;
      setPendingFiles((prev) => [
        ...prev,
        { id: `${Date.now()}-${prev.length}`, uri: asset.uri, name: fileName },
      ]);
      setError(null);
    };

    const pickDocument = async () => {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setPendingFiles((prev) => [
        ...prev,
        { id: `${Date.now()}-${prev.length}`, uri: asset.uri, name: asset.name },
      ]);
      setError(null);
    };

    const removePending = (id: string) => {
      setPendingFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const handleSubmit = async () => {
      if (!weddingId) {
        const msg = "No wedding loaded — pull to refresh and try again";
        setError(msg);
        showAppAlert("Could not add candidate", msg);
        return;
      }
      if (!name.trim()) {
        setError("Name is required");
        return;
      }
      const amount = proposedAmount.trim() ? Number(proposedAmount) : undefined;
      if (proposedAmount.trim() && (!amount || amount < 0 || !Number.isFinite(amount))) {
        setError("Enter a valid proposed amount");
        return;
      }
      setError(null);
      try {
        const created = await createCandidate.mutateAsync({
          name: name.trim(),
          category,
          contactName: contactName.trim() || undefined,
          phone: phone.trim() || undefined,
          proposedAmount: amount,
          notes: notes.trim() || undefined,
        });

        const uploadErrors: string[] = [];
        for (const file of pendingFiles) {
          try {
            await uploadFile.mutateAsync({
              candidateId: created.id,
              localUri: file.uri,
              fileName: file.name,
            });
          } catch (uploadErr) {
            console.error("[vendor-candidates] file upload failed:", uploadErr);
            uploadErrors.push(errorMessage(uploadErr, file.name));
          }
        }

        reset();
        innerRef.current?.dismiss();
        onCreated?.();

        if (uploadErrors.length > 0) {
          showAppAlert(
            "Candidate added",
            `Saved to shortlist, but ${uploadErrors.length} document(s) failed to upload:\n${uploadErrors.join("\n")}`,
          );
        }
      } catch (err) {
        console.error("[vendor-candidates] create failed:", err);
        const msg = errorMessage(err, "Could not add candidate");
        setError(msg);
        showAppAlert("Could not add candidate", msg);
      }
    };

    const saving = createCandidate.isPending || uploadFile.isPending;

    return (
      <AppBottomSheet ref={innerRef} title="Add to shortlist" isDirty={isDirty} onDismiss={reset}>
        <View>
          <AppTextInput
            label="Name *"
            value={name}
            onChangeText={setName}
            placeholder="Vendor or studio name"
          />
          <AppSelect
            label="Category"
            value={category}
            onSelect={setCategory}
            options={VENDOR_CATEGORIES.map((c) => ({ label: c, value: c }))}
          />
          <AppTextInput label="Contact name" value={contactName} onChangeText={setContactName} />
          <AppTextInput
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <AppTextInput
            label="Proposed amount (₹)"
            value={proposedAmount}
            onChangeText={setProposedAmount}
            keyboardType="numeric"
            placeholder="Quote / estimate"
          />
          <AppTextInput label="Notes" value={notes} onChangeText={setNotes} multiline />

          <View style={formStyles.field}>
            <Text style={formStyles.label}>Documents</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <AppPressable
                onPress={() => void pickImage()}
                style={[formStyles.outlineBtn, { flex: 1, marginTop: 0 }]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <ImagePlus size={16} color={colors.primary} />
                  <Text style={formStyles.outlineBtnText}>Photo</Text>
                </View>
              </AppPressable>
              <AppPressable
                onPress={() => void pickDocument()}
                style={[formStyles.outlineBtn, { flex: 1, marginTop: 0 }]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <FilePlus size={16} color={colors.primary} />
                  <Text style={formStyles.outlineBtnText}>PDF / file</Text>
                </View>
              </AppPressable>
            </View>
            {pendingFiles.map((f) => (
              <View key={f.id} style={styles.pendingRow}>
                <Text style={styles.pendingName} numberOfLines={1}>
                  {f.name}
                </Text>
                <AppPressable
                  onPress={() => removePending(f.id)}
                  hitSlop={10}
                  accessibilityLabel={`Remove ${f.name}`}
                  style={styles.removeBtn}
                >
                  <X size={16} color={colors.destructive} />
                </AppPressable>
              </View>
            ))}
          </View>

          {error ? <Text style={formStyles.error}>{error}</Text> : null}

          <AppPressable
            onPress={() => void handleSubmit()}
            disabled={saving}
            style={[formStyles.primaryBtn, saving && formStyles.primaryBtnDisabled]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={formStyles.primaryBtnText}>Add candidate</Text>
            )}
          </AppPressable>
        </View>
      </AppBottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  pendingRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pendingName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.foreground,
  },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
