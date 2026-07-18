import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import {
  useCreateBudgetCategory,
  useUpdateBudgetCategory
} from "../../hooks/use-wallet-mutations";
import type { BudgetCategory } from "../../types/wedding";
import { AppBottomSheet, SheetTextInput, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
import { colors } from "../../theme/tokens";

type Props = {
  weddingId: string | undefined;
  /** When set, sheet edits this category instead of creating. */
  category?: BudgetCategory | null;
  onDone?: () => void;
};

export const CategoryFormSheet = forwardRef<BottomSheetModal, Props>(function CategoryFormSheet(
  { weddingId, category = null, onDone },
  ref,
) {
  const innerRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => innerRef.current!);

  const createCategory = useCreateBudgetCategory(weddingId);
  const updateCategory = useUpdateBudgetCategory(weddingId);
  const isEdit = !!category;

  const [name, setName] = useState("");
  const [planned, setPlanned] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setPlanned(String(category.planned));
    } else {
      setName("");
      setPlanned("");
    }
    setError(null);
  }, [category]);

  const reset = () => {
    if (!category) {
      setName("");
      setPlanned("");
    }
    setError(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Category name is required");
      return;
    }

    setError(null);
    try {
      if (isEdit && category) {
        await updateCategory.mutateAsync({
          id: category.id,
          updates: { name: name.trim(), planned: Number(planned) || 0 }
});
      } else {
        await createCategory.mutateAsync({
          name: name.trim(),
          planned: Number(planned) || 0
});
      }
      reset();
      innerRef.current?.dismiss();
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? "Could not update category" : "Could not add category");
    }
  };

  const pending = createCategory.isPending || updateCategory.isPending;

  return (
    <AppBottomSheet
      ref={innerRef}
      title={isEdit ? "Edit category" : "Add category"}
      onDismiss={() => {
        reset();
        onDone?.();
      }}
    >
      <View style={formStyles.field}>
        <Text style={formStyles.label}>Name *</Text>
        <SheetTextInput
          style={formStyles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Photography"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Planned amount</Text>
        <SheetTextInput
          style={formStyles.input}
          value={planned}
          onChangeText={setPlanned}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {error ? <Text style={formStyles.error}>{error}</Text> : null}

      <AppPressable
        onPress={handleSubmit}
        disabled={pending}
        style={[formStyles.primaryBtn, pending && formStyles.primaryBtnDisabled]}
      >
        {pending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={formStyles.primaryBtnText}>{isEdit ? "Save changes" : "Add category"}</Text>
        )}
      </AppPressable>
    </AppBottomSheet>
  );
});

/** @deprecated Prefer CategoryFormSheet — kept as alias for create-only call sites. */
export const CategoryCreateSheet = CategoryFormSheet;
