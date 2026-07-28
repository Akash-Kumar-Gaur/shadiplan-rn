import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { FilePlus, ImagePlus } from "lucide-react-native";
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useFormDirty } from "../../hooks/use-form-dirty";
import {
  useCreateVendorCandidate,
  useUploadCandidateFile,
} from "../../hooks/use-vendor-candidates";
import type { VendorCategory } from "../../types/wedding";
import { VENDOR_CATEGORIES } from "../../types/wedding";
import { colors } from "../../theme/tokens";
import { AppBottomSheet, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
import { AppSelect } from "../AppSelect";
import { AppTextInput } from "../AppTextInput";

type PendingFile = { uri: string; name: string };

type Props = {
  weddingId: string | undefined;
  onCreated?: () => void;
};

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
      setPendingFiles((prev) => [...prev, { uri: asset.uri, name: fileName }]);
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
      setPendingFiles((prev) => [...prev, { uri: asset.uri, name: asset.name }]);
      setError(null);
    };

    const handleSubmit = async () => {
      if (!name.trim()) {
        setError("Name is required");
        return;
      }
      const amount = proposedAmount.trim() ? Number(proposedAmount) : undefined;
      if (proposedAmount.trim() && (!amount || amount < 0)) {
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
        for (const file of pendingFiles) {
          await uploadFile.mutateAsync({
            candidateId: created.id,
            localUri: file.uri,
            fileName: file.name,
          });
        }
        reset();
        innerRef.current?.dismiss();
        onCreated?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add candidate");
      }
    };

    const saving = createCandidate.isPending || uploadFile.isPending;

    return (
      <AppBottomSheet ref={innerRef} title="Add to shortlist" isDirty={isDirty} onDismiss={reset}>
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
            <Text key={f.uri} style={{ marginTop: 8, color: colors.textMuted, fontSize: 13 }}>
              {f.name}
            </Text>
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
      </AppBottomSheet>
    );
  },
);
