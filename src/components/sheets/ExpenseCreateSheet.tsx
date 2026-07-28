import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { useFormDirty } from "../../hooks/use-form-dirty";
import { useCreateBudgetCategory, useCreateExpense } from "../../hooks/use-wallet-mutations";
import type { BudgetCategory } from "../../types/wedding";
import { EXPENSE_TAG_PRESETS, NEW_CATEGORY_VALUE } from "../../types/wedding";
import { shortDate } from "../../lib/format";
import { AppBottomSheet, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
import { AppSelect } from "../AppSelect";
import { AppTextInput } from "../AppTextInput";
import { colors, fonts, radius } from "../../theme/tokens";

type Props = {
  weddingId: string | undefined;
  budgetCategories: BudgetCategory[];
  onCreated?: () => void;
};

export const ExpenseCreateSheet = forwardRef<BottomSheetModal, Props>(function ExpenseCreateSheet(
  { weddingId, budgetCategories, onCreated },
  ref,
) {
  const innerRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => innerRef.current!);

  const createExpense = useCreateExpense(weddingId);
  const createCategory = useCreateBudgetCategory(weddingId);

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [paidDate, setPaidDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [note, setNote] = useState("");
  const [taggedFor, setTaggedFor] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setAmount("");
    setCategoryId(budgetCategories[0]?.id ?? NEW_CATEGORY_VALUE);
    setNewCategoryName("");
    setVendorName("");
    setPaidDate(new Date());
    setShowDatePicker(false);
    setNote("");
    setTaggedFor([]);
    setCustomTag("");
    setError(null);
  };

  useEffect(() => {
    if (budgetCategories.length === 0) setCategoryId(NEW_CATEGORY_VALUE);
    else if (!categoryId || categoryId === NEW_CATEGORY_VALUE) {
      setCategoryId(budgetCategories[0]?.id ?? NEW_CATEGORY_VALUE);
    }
  }, [budgetCategories]);

  const formValues = useMemo(
    () => ({
      amount,
      categoryId,
      newCategoryName,
      vendorName,
      paidDate: paidDate.toISOString().slice(0, 10),
      note,
      taggedFor,
      customTag,
    }),
    [amount, categoryId, newCategoryName, vendorName, paidDate, note, taggedFor, customTag],
  );

  const baseline = useMemo(
    () => ({
      amount: "",
      categoryId: budgetCategories[0]?.id ?? NEW_CATEGORY_VALUE,
      newCategoryName: "",
      vendorName: "",
      paidDate: new Date().toISOString().slice(0, 10),
      note: "",
      taggedFor: [] as string[],
      customTag: "",
    }),
    [budgetCategories],
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

  const handleSubmit = async () => {
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      setError("Enter a valid amount");
      return;
    }

    let resolvedCategoryId = categoryId;
    if (categoryId === NEW_CATEGORY_VALUE) {
      if (!newCategoryName.trim()) {
        setError("Category name is required");
        return;
      }
    } else if (!resolvedCategoryId) {
      setError("Select a category");
      return;
    }

    setError(null);
    try {
      if (categoryId === NEW_CATEGORY_VALUE) {
        const created = await createCategory.mutateAsync({ name: newCategoryName.trim(), planned: 0 });
        resolvedCategoryId = created.id;
      }

      await createExpense.mutateAsync({
        amount: parsed,
        categoryId: resolvedCategoryId,
        vendorName: vendorName.trim() || undefined,
        date: paidDate.toISOString().slice(0, 10),
        note: note.trim() || undefined,
        taggedFor: taggedFor.length ? taggedFor : undefined
});
      reset();
      innerRef.current?.dismiss();
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save expense");
    }
  };

  const categoryItems = [
    ...budgetCategories.map((c) => ({ label: c.name, value: c.id })),
    { label: "Add new category…", value: NEW_CATEGORY_VALUE },
  ];

  const saving = createExpense.isPending || createCategory.isPending;
  const customOnlyTags = taggedFor.filter(
    (t) => !(EXPENSE_TAG_PRESETS as readonly string[]).includes(t),
  );

  return (
    <AppBottomSheet ref={innerRef} title="Add expense" isDirty={isDirty} onDismiss={reset}>
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

      {categoryId === NEW_CATEGORY_VALUE ? (
        <View style={formStyles.card}>
          <AppTextInput
            label="New category name *"
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            placeholder="e.g. Decor"
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
      ) : null}

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
        label="Vendor / description"
        value={vendorName}
        onChangeText={setVendorName}
        placeholder="Optional"
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
        onPress={handleSubmit}
        disabled={saving}
        style={[formStyles.primaryBtn, saving && formStyles.primaryBtnDisabled]}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={formStyles.primaryBtnText}>Add expense</Text>
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
