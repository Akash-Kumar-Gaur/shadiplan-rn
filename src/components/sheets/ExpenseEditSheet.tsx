import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from "react-native";
import { useDeleteExpense, useUpdateExpense } from "../../hooks/use-wallet-mutations";
import type { BudgetCategory, Transaction } from "../../types/wedding";
import { EXPENSE_TAG_PRESETS } from "../../types/wedding";
import { shortDate } from "../../lib/format";
import { AppBottomSheet, SheetTextInput, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
import { SheetPicker } from "../SheetPicker";
import { colors, fonts, radius } from "../../theme/tokens";

type Props = {
  transaction: Transaction | null;
  weddingId: string | undefined;
  budgetCategories: BudgetCategory[];
  onClose: () => void;
};

export const ExpenseEditSheet = forwardRef<BottomSheetModal, Props>(function ExpenseEditSheet(
  { transaction, weddingId, budgetCategories, onClose },
  ref,
) {
  const innerRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => innerRef.current!);

  const updateExpense = useUpdateExpense(weddingId);
  const deleteExpense = useDeleteExpense(weddingId);

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [paidDate, setPaidDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [note, setNote] = useState("");
  const [taggedFor, setTaggedFor] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [error, setError] = useState<string | null>(null);

  const vendorLinked = !!transaction?.vendorId;

  useEffect(() => {
    if (!transaction) return;
    setAmount(String(transaction.amount));
    setCategoryId(transaction.categoryId || budgetCategories[0]?.id || "");
    setVendorName(transaction.vendorName);
    setPaidDate(new Date(`${transaction.date}T12:00:00`));
    setShowDatePicker(false);
    setNote(transaction.note ?? "");
    setTaggedFor(transaction.taggedFor ?? []);
    setCustomTag("");
    setError(null);
  }, [transaction, budgetCategories]);

  const toggleTag = (tag: string) => {
    setTaggedFor((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const addCustomTag = () => {
    const next = customTag.trim();
    if (!next) return;
    setTaggedFor((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setCustomTag("");
  };

  const handleSave = async () => {
    if (!transaction) return;
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (!categoryId) {
      setError("Select a category");
      return;
    }

    setError(null);
    try {
      await updateExpense.mutateAsync({
        id: transaction.id,
        vendorId: transaction.vendorId,
        patch: {
          amount: parsed,
          categoryId,
          vendorName: vendorLinked ? undefined : vendorName.trim() || undefined,
          date: paidDate.toISOString().slice(0, 10),
          note: note.trim() || undefined,
          taggedFor
}
});
      innerRef.current?.dismiss();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save transaction");
    }
  };

  const handleDelete = () => {
    if (!transaction) return;
    Alert.alert("Remove transaction?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          deleteExpense.mutate(
            { id: transaction.id, vendorId: transaction.vendorId },
            {
              onSuccess: () => {
                innerRef.current?.dismiss();
                onClose();
              },
              onError: (err) => {
                Alert.alert(
                  "Could not remove",
                  err instanceof Error ? err.message : "Try again",
                );
              }
},
          );
        }
},
    ]);
  };

  if (!transaction) return null;

  const categoryItems = budgetCategories.map((c) => ({ label: c.name, value: c.id }));
  const saving = updateExpense.isPending;
  const customOnlyTags = taggedFor.filter(
    (t) => !(EXPENSE_TAG_PRESETS as readonly string[]).includes(t),
  );

  return (
    <AppBottomSheet
      ref={innerRef}
      title="Edit transaction"
      subtitle={vendorLinked ? "Linked to a vendor payment" : undefined}
      onDismiss={onClose}
    >
      <View style={formStyles.field}>
        <Text style={formStyles.label}>Amount *</Text>
        <SheetTextInput
          style={formStyles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Category</Text>
        <SheetPicker selectedValue={categoryId} onValueChange={setCategoryId} items={categoryItems} />
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Tagged for</Text>
        <Text style={tagStyles.hint}>Who is this expense for?</Text>
        <View style={tagStyles.chipRow}>
          {EXPENSE_TAG_PRESETS.map((tag) => {
            const selected = taggedFor.includes(tag);
            return (
              <AppPressable
                key={tag}
                onPress={() => toggleTag(tag)}
                style={[tagStyles.chip, selected && tagStyles.chipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[tagStyles.chipText, selected && tagStyles.chipTextSelected]}>
                  {tag}
                </Text>
              </AppPressable>
            );
          })}
          {customOnlyTags.map((tag) => (
            <AppPressable
              key={tag}
              onPress={() => toggleTag(tag)}
              style={[tagStyles.chip, tagStyles.chipSelected]}
            >
              <Text style={[tagStyles.chipText, tagStyles.chipTextSelected]}>{tag}</Text>
            </AppPressable>
          ))}
        </View>
        <View style={tagStyles.customRow}>
          <SheetTextInput
            style={[formStyles.input, tagStyles.customInput]}
            value={customTag}
            onChangeText={setCustomTag}
            placeholder="Custom name or role"
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={addCustomTag}
            returnKeyType="done"
          />
          <AppPressable onPress={addCustomTag} style={tagStyles.addCustomBtn}>
            <Text style={tagStyles.addCustomText}>Add</Text>
          </AppPressable>
        </View>
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>{vendorLinked ? "Vendor" : "Vendor / description"}</Text>
        <SheetTextInput
          style={[formStyles.input, vendorLinked && { opacity: 0.6 }]}
          value={vendorName}
          onChangeText={setVendorName}
          editable={!vendorLinked}
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Date</Text>
        <AppPressable style={formStyles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={{ paddingTop: 12, color: colors.foreground }}>
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

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Note</Text>
        <SheetTextInput style={formStyles.textarea} value={note} onChangeText={setNote} multiline />
      </View>

      {error ? <Text style={formStyles.error}>{error}</Text> : null}

      <AppPressable
        onPress={handleSave}
        disabled={saving}
        style={[formStyles.primaryBtn, saving && formStyles.primaryBtnDisabled]}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={formStyles.primaryBtnText}>Save changes</Text>
        )}
      </AppPressable>

      <AppPressable
        onPress={handleDelete}
        disabled={deleteExpense.isPending}
        style={{ marginTop: 16, alignItems: "center" }}
      >
        {deleteExpense.isPending ? (
          <ActivityIndicator color={colors.destructive} />
        ) : (
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.destructive }}>
            Remove transaction
          </Text>
        )}
      </AppPressable>
    </AppBottomSheet>
  );
});

const tagStyles = StyleSheet.create({
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 8
},
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
},
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card
},
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.secondary
},
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.foreground
},
  chipTextSelected: {
    color: colors.primary
},
  customRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    alignItems: "center"
},
  customInput: {
    flex: 1
},
  addCustomBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
},
  addCustomText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primary
}
});
