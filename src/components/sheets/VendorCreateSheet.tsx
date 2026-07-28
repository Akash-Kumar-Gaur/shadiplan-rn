import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import type { BudgetCategory, VendorCategory, VendorStatus } from "../../types/wedding";
import { VENDOR_CATEGORIES } from "../../types/wedding";
import { useFormDirty } from "../../hooks/use-form-dirty";
import { useCreateVendor } from "../../hooks/use-vendor-guest-mutations";
import { AppBottomSheet, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
import { AppSelect } from "../AppSelect";
import { AppTextInput } from "../AppTextInput";
import { colors } from "../../theme/tokens";
import { shortDate } from "../../lib/format";

type Props = {
  weddingId: string | undefined;
  budgetCategories: BudgetCategory[];
  onCreated?: () => void;
};

export const VendorCreateSheet = forwardRef<BottomSheetModal, Props>(function VendorCreateSheet(
  { weddingId, budgetCategories, onCreated },
  ref,
) {
  const innerRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => innerRef.current!);

  const createVendor = useCreateVendor(weddingId);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<VendorCategory>("Venue");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [advancePaid, setAdvancePaid] = useState("0");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [status, setStatus] = useState<VendorStatus>("Pending");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setCategory("Venue");
    setContactName("");
    setPhone("");
    setTotalCost("");
    setAdvancePaid("0");
    setDueDate(null);
    setStatus("Pending");
    setNotes("");
    setError(null);
  };

  const formValues = useMemo(
    () => ({
      name,
      category,
      contactName,
      phone,
      totalCost,
      advancePaid,
      dueDate,
      status,
      notes,
    }),
    [name, category, contactName, phone, totalCost, advancePaid, dueDate, status, notes],
  );

  const baseline = useMemo(
    () => ({
      name: "",
      category: "Venue" as VendorCategory,
      contactName: "",
      phone: "",
      totalCost: "",
      advancePaid: "0",
      dueDate: null as Date | null,
      status: "Pending" as VendorStatus,
      notes: "",
    }),
    [],
  );

  const isDirty = useFormDirty(formValues, baseline);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Vendor name is required");
      return;
    }
    const cost = Number(totalCost);
    if (!cost || cost <= 0) {
      setError("Enter a valid total cost");
      return;
    }
    const advance = Number(advancePaid) || 0;
    if (advance < 0 || advance > cost) {
      setError("Advance paid must be between 0 and total cost");
      return;
    }

    setError(null);
    try {
      await createVendor.mutateAsync({
        input: {
          name: name.trim(),
          category,
          contactName: contactName.trim(),
          phone: phone.trim(),
          totalCost: cost,
          advancePaid: advance,
          dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : "",
          status,
          notes: notes.trim() || undefined
},
        budgetCategories
});
      reset();
      innerRef.current?.dismiss();
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add vendor");
    }
  };

  return (
    <AppBottomSheet ref={innerRef} title="Add vendor" isDirty={isDirty} onDismiss={reset}>
      <AppTextInput
        label="Name *"
        value={name}
        onChangeText={setName}
        placeholder="Vendor name"
      />

      <AppSelect
        label="Category"
        value={category}
        onSelect={setCategory}
        options={VENDOR_CATEGORIES.map((c) => ({ label: c, value: c }))}
      />

      <AppTextInput
        label="Contact name"
        value={contactName}
        onChangeText={setContactName}
      />

      <AppTextInput
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <View style={formStyles.row2}>
        <AppTextInput
          label="Total cost (₹) *"
          value={totalCost}
          onChangeText={setTotalCost}
          keyboardType="numeric"
          containerStyle={formStyles.row2col}
        />
        <AppTextInput
          label="Advance paid (₹)"
          value={advancePaid}
          onChangeText={setAdvancePaid}
          keyboardType="numeric"
          containerStyle={formStyles.row2col}
        />
      </View>

      <View style={formStyles.row2}>
        <View style={[formStyles.field, formStyles.row2col]}>
          <Text style={formStyles.label}>Due date</Text>
          <AppPressable style={formStyles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: dueDate ? colors.charcoal : colors.textMuted, fontSize: 15 }}>
              {dueDate ? shortDate(dueDate.toISOString().slice(0, 10)) : "Select date"}
            </Text>
          </AppPressable>
          {showDatePicker ? (
            <DateTimePicker
              value={dueDate ?? new Date()}
              mode="date"
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === "ios");
                if (date) setDueDate(date);
              }}
            />
          ) : null}
        </View>
        <AppSelect
          label="Status"
          value={status}
          onSelect={setStatus}
          containerStyle={formStyles.row2col}
          options={[
            { label: "Pending", value: "Pending" },
            { label: "Confirmed", value: "Confirmed" },
            { label: "Paid", value: "Paid" },
          ]}
        />
      </View>

      <AppTextInput
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      {error ? <Text style={formStyles.error}>{error}</Text> : null}

      <AppPressable
        onPress={handleSubmit}
        disabled={createVendor.isPending}
        style={[formStyles.primaryBtn, createVendor.isPending && formStyles.primaryBtnDisabled]}
      >
        {createVendor.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={formStyles.primaryBtnText}>Add vendor</Text>
        )}
      </AppPressable>
    </AppBottomSheet>
  );
});
