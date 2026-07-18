import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSetWeddingBudget } from "../../hooks/use-checklist-mutations";
import { colors } from "../../theme/tokens";
import { AppBottomSheet, SheetTextInput, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";

type Props = {
  weddingId: string | undefined;
  currentBudget: number | null;
};

export const SetBudgetSheet = forwardRef<BottomSheetModal, Props>(function SetBudgetSheet(
  { weddingId, currentBudget },
  ref,
) {
  const innerRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => innerRef.current!);

  const setBudget = useSetWeddingBudget(weddingId);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setAmount(currentBudget != null ? String(currentBudget) : "");
    setError(null);
  };

  const handleSubmit = async () => {
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      setError("Enter a valid budget amount");
      return;
    }
    setError(null);
    try {
      await setBudget.mutateAsync(parsed);
      innerRef.current?.dismiss();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save budget");
    }
  };

  return (
    <AppBottomSheet ref={innerRef} title="Set total budget" onDismiss={reset}>
      <View style={formStyles.field}>
        <Text style={formStyles.label}>Total budget (₹)</Text>
        <SheetTextInput
          style={formStyles.input}
          keyboardType="number-pad"
          placeholder="e.g. 5000000"
          value={amount}
          onChangeText={setAmount}
        />
        <Text style={{ marginTop: 6, fontSize: 12, color: colors.mutedForeground }}>
          Your overall wedding budget — category splits can be adjusted in Wallet.
        </Text>
      </View>
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
      <AppPressable
        onPress={() => void handleSubmit()}
        style={[formStyles.primaryBtn, setBudget.isPending && formStyles.primaryBtnDisabled]}
        disabled={setBudget.isPending}
      >
        {setBudget.isPending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={formStyles.primaryBtnText}>Save budget</Text>
        )}
      </AppPressable>
    </AppBottomSheet>
  );
});
