import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import type { BudgetCategory, VendorCategory, VendorStatus } from "../../types/wedding";
import { VENDOR_CATEGORIES } from "../../types/wedding";
import { useCreateVendor } from "../../hooks/use-vendor-guest-mutations";
import { AppBottomSheet, SheetTextInput, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
import { SheetPicker } from "../SheetPicker";
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
    <AppBottomSheet ref={innerRef} title="Add vendor" onDismiss={reset}>
      <View style={formStyles.field}>
        <Text style={formStyles.label}>Name *</Text>
        <SheetTextInput
          style={formStyles.input}
          value={name}
          onChangeText={setName}
          placeholder="Vendor name"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Category</Text>
        <SheetPicker
          selectedValue={category}
          onValueChange={setCategory}
          items={VENDOR_CATEGORIES.map((c) => ({ label: c, value: c }))}
        />
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Contact name</Text>
        <SheetTextInput style={formStyles.input} value={contactName} onChangeText={setContactName} />
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Phone</Text>
        <SheetTextInput
          style={formStyles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </View>

      <View style={formStyles.row2}>
        <View style={[formStyles.field, formStyles.row2col]}>
          <Text style={formStyles.label}>Total cost (₹) *</Text>
          <SheetTextInput
            style={formStyles.input}
            value={totalCost}
            onChangeText={setTotalCost}
            keyboardType="numeric"
          />
        </View>
        <View style={[formStyles.field, formStyles.row2col]}>
          <Text style={formStyles.label}>Advance paid (₹)</Text>
          <SheetTextInput
            style={formStyles.input}
            value={advancePaid}
            onChangeText={setAdvancePaid}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={formStyles.row2}>
        <View style={[formStyles.field, formStyles.row2col]}>
          <Text style={formStyles.label}>Due date</Text>
          <AppPressable style={formStyles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={{ paddingTop: 12, color: dueDate ? colors.foreground : colors.textMuted }}>
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
        <View style={[formStyles.field, formStyles.row2col]}>
          <Text style={formStyles.label}>Status</Text>
          <SheetPicker
            selectedValue={status}
            onValueChange={setStatus}
            items={[
              { label: "Pending", value: "Pending" },
              { label: "Confirmed", value: "Confirmed" },
              { label: "Paid", value: "Paid" },
            ]}
          />
        </View>
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Notes</Text>
        <SheetTextInput
          style={formStyles.textarea}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </View>

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
