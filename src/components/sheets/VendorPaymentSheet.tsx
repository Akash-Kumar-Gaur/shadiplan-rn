import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { useFormDirty } from "../../hooks/use-form-dirty";
import { useAddVendorPayment } from "../../hooks/use-vendor-guest-mutations";
import { shortDate } from "../../lib/format";
import type { BudgetCategory, Vendor } from "../../types/wedding";
import { colors, fonts } from "../../theme/tokens";
import { AmountText } from "../AmountText";
import { AppBottomSheet, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
import { AppTextInput } from "../AppTextInput";

type Props = {
  vendor: Vendor | null;
  weddingId: string | undefined;
  budgetCategories: BudgetCategory[];
  onClose: () => void;
};

export const VendorPaymentSheet = forwardRef<BottomSheetModal, Props>(function VendorPaymentSheet(
  { vendor, weddingId, budgetCategories, onClose },
  ref,
) {
  const innerRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => innerRef.current!);

  const addPayment = useAddVendorPayment(weddingId);

  const [amount, setAmount] = useState("");
  const [paidDate, setPaidDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const balance = vendor ? Math.max(0, vendor.totalCost - vendor.advancePaid) : 0;

  useEffect(() => {
    if (!vendor) return;
    setAmount(balance > 0 ? String(balance) : "");
    setPaidDate(new Date());
    setShowDatePicker(false);
    setNote("");
    setError(null);
  }, [vendor, balance]);

  const formValues = useMemo(
    () => ({
      amount,
      paidDate: paidDate.toISOString().slice(0, 10),
      note,
    }),
    [amount, paidDate, note],
  );

  const baseline = useMemo(
    () => ({
      amount: balance > 0 ? String(balance) : "",
      paidDate: new Date().toISOString().slice(0, 10),
      note: "",
    }),
    [balance],
  );

  const isDirty = useFormDirty(formValues, baseline);

  const handleSubmit = async () => {
    if (!vendor) return;
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setError(null);
    try {
      await addPayment.mutateAsync({
        vendor,
        budgetCategories,
        amount: parsed,
        paidDate: paidDate.toISOString().slice(0, 10),
        note: note.trim() || undefined,
      });
      innerRef.current?.dismiss();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add payment");
    }
  };

  if (!vendor) return null;

  return (
    <AppBottomSheet
      ref={innerRef}
      title="Add payment"
      subtitle={vendor.name}
      isDirty={isDirty}
      onDismiss={onClose}
    >
      <View style={formStyles.field}>
        <Text style={formStyles.label}>Balance remaining</Text>
        <AmountText
          value={balance}
          style={{ fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.charcoal }}
        />
      </View>

      <AppTextInput
        label="Amount *"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="0"
      />

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Date</Text>
        <AppPressable style={formStyles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={{ color: colors.charcoal, fontSize: 15 }}>
            {shortDate(paidDate.toISOString().slice(0, 10))}
          </Text>
        </AppPressable>
        {showDatePicker ? (
          <DateTimePicker
            value={paidDate}
            mode="date"
            onChange={(_, date) => {
              setShowDatePicker(Platform.OS === "ios");
              if (date) setPaidDate(date);
            }}
          />
        ) : null}
      </View>

      <AppTextInput
        label="Note"
        value={note}
        onChangeText={setNote}
        placeholder="Optional"
        multiline
      />

      {error ? <Text style={formStyles.error}>{error}</Text> : null}

      <AppPressable
        onPress={() => void handleSubmit()}
        disabled={addPayment.isPending}
        style={[formStyles.primaryBtn, addPayment.isPending && formStyles.primaryBtnDisabled]}
      >
        {addPayment.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={formStyles.primaryBtnText}>Add payment</Text>
        )}
      </AppPressable>
    </AppBottomSheet>
  );
});
