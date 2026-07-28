import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { useFormDirty } from "../../hooks/use-form-dirty";
import { useDeleteExpense, useUpdateExpense } from "../../hooks/use-wallet-mutations";
import type { BudgetCategory, Transaction } from "../../types/wedding";
import { EXPENSE_TAG_PRESETS } from "../../types/wedding";
import { shortDate } from "../../lib/format";
import { AppBottomSheet, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
import { requestAppConfirm, showAppAlert } from "../ConfirmSheet";
import { AppSelect } from "../AppSelect";
import { AppTextInput } from "../AppTextInput";
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

  const formValues = useMemo(
    () => ({
      amount,
      categoryId,
      vendorName,
      paidDate,
      note,
      taggedFor,
      customTag,
    }),
    [amount, categoryId, vendorName, paidDate, note, taggedFor, customTag],
  );

  const baseline = useMemo(
    () => ({
      amount: transaction ? String(transaction.amount) : "",
      categoryId: transaction?.categoryId || budgetCategories[0]?.id || "",
      vendorName: transaction?.vendorName ?? "",
      paidDate: transaction
        ? new Date(`${transaction.date}T12:00:00`)
        : new Date(),
      note: transaction?.note ?? "",
      taggedFor: transaction?.taggedFor ?? [],
      customTag: "",
    }),
    [transaction, budgetCategories],
  );

  const isDirty = useFormDirty(formValues, baseline);

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
    requestAppConfirm({
      title: "Remove transaction?",
      message: "This cannot be undone.",
      confirmLabel: "Remove",
      destructive: true,
      onConfirm: () => {
        deleteExpense.mutate(
          { id: transaction.id, vendorId: transaction.vendorId },
          {
            onSuccess: () => {
              innerRef.current?.dismiss();
              onClose();
            },
            onError: (err) => {
              showAppAlert(
                "Could not remove",
                err instanceof Error ? err.message : "Try again",
              );
            },
          },
        );
      },
    });
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
      isDirty={isDirty}
      onDismiss={onClose}
    >
      <AppTextInput
        label="Amount *"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="0"
      />

      <AppSelect
        label="Category"
        value={categoryId}
        onSelect={setCategoryId}
        options={categoryItems}
      />

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
          <AppTextInput
            value={customTag}
            onChangeText={setCustomTag}
            placeholder="Custom name or role"
            onSubmitEditing={addCustomTag}
            returnKeyType="done"
            containerStyle={{ flex: 1, marginBottom: 0 }}
          />
          <AppPressable onPress={addCustomTag} style={tagStyles.addCustomBtn}>
            <Text style={tagStyles.addCustomText}>Add</Text>
          </AppPressable>
        </View>
      </View>

      <AppTextInput
        label={vendorLinked ? "Vendor" : "Vendor / description"}
        value={vendorName}
        onChangeText={setVendorName}
        editable={!vendorLinked}
        placeholder="Optional"
        style={vendorLinked ? { opacity: 0.6 } : undefined}
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

      <AppTextInput label="Note" value={note} onChangeText={setNote} multiline />

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
  addCustomBtn: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
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
