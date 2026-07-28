import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { useFormDirty } from "../../hooks/use-form-dirty";
import { useCreatePlanningTask } from "../../hooks/use-checklist-mutations";
import { shortDate } from "../../lib/format";
import {
  PLANNING_TASK_CATEGORIES,
  type PlanningTaskCategory
} from "../../lib/planning-categories";
import { AppBottomSheet, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
import { AppSelect } from "../AppSelect";
import { AppTextInput } from "../AppTextInput";
import { colors } from "../../theme/tokens";

type Props = {
  weddingId: string | undefined;
  commonlyMissed?: boolean;
  defaultDate?: string;
  onCreated?: () => void;
};

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const PlanningTaskCreateSheet = forwardRef<BottomSheetModal, Props>(
  function PlanningTaskCreateSheet(
    { weddingId, commonlyMissed = false, defaultDate = "", onCreated },
    ref,
  ) {
    const innerRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => innerRef.current!);

    const createTask = useCreatePlanningTask(weddingId);

    const [task, setTask] = useState("");
    const [category, setCategory] = useState<PlanningTaskCategory>("Venue");
    const [suggestedDate, setSuggestedDate] = useState(defaultDate);
    const [notes, setNotes] = useState("");
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
      setTask("");
      setCategory("Venue");
      setSuggestedDate(defaultDate);
      setNotes("");
      setError(null);
      setShowDatePicker(false);
    };

    const formValues = useMemo(
      () => ({ task, category, suggestedDate, notes }),
      [task, category, suggestedDate, notes],
    );

    const baseline = useMemo(
      () => ({
        task: "",
        category: "Venue" as PlanningTaskCategory,
        suggestedDate: defaultDate,
        notes: "",
      }),
      [defaultDate],
    );

    const isDirty = useFormDirty(formValues, baseline);

    const handleSubmit = async () => {
      if (!task.trim()) {
        setError("Task name is required");
        return;
      }
      setError(null);
      try {
        await createTask.mutateAsync({
          task: task.trim(),
          leadTime: "1mo",
          category: commonlyMissed ? "Other" : category,
          commonlyMissed,
          done: false,
          suggestedDate: suggestedDate || "",
          reason: notes.trim() || undefined
});
        innerRef.current?.dismiss();
        onCreated?.();
        reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add task");
      }
    };

    return (
      <AppBottomSheet
        ref={innerRef}
        title={commonlyMissed ? "Add reminder" : "Add task"}
        subtitle={
          commonlyMissed
            ? "Something easy to forget"
            : "Add a planning task to your checklist"
        }
        isDirty={isDirty}
        onDismiss={reset}
      >
        <AppTextInput
          label="Task name"
          placeholder="e.g. Confirm florist delivery time"
          value={task}
          onChangeText={setTask}
        />

        {!commonlyMissed ? (
          <AppSelect
            label="Category"
            value={category}
            onSelect={setCategory}
            options={PLANNING_TASK_CATEGORIES.map((c) => ({ label: c, value: c }))}
          />
        ) : null}

        <View style={formStyles.field}>
          <Text style={formStyles.label}>Date (optional)</Text>
          <AppPressable style={formStyles.input} onPress={() => setShowDatePicker(true)}>
            <Text
              style={{
                color: suggestedDate ? colors.charcoal : colors.textMuted,
                fontSize: 15,
              }}
            >
              {suggestedDate ? shortDate(suggestedDate) : "Pick date"}
            </Text>
          </AppPressable>
          {showDatePicker ? (
            <DateTimePicker
              value={suggestedDate ? parseIsoDate(suggestedDate) : new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_e, date) => {
                if (Platform.OS !== "ios") setShowDatePicker(false);
                if (date) setSuggestedDate(toIsoDate(date));
              }}
            />
          ) : null}
          {Platform.OS === "ios" && showDatePicker ? (
            <AppPressable onPress={() => setShowDatePicker(false)} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.primary, fontSize: 14 }}>Done</Text>
            </AppPressable>
          ) : null}
        </View>

        {!commonlyMissed ? (
          <AppTextInput
            label="Notes (optional)"
            placeholder="Any extra context"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        ) : null}

        {error ? <Text style={formStyles.error}>{error}</Text> : null}

        <AppPressable
          onPress={() => void handleSubmit()}
          style={[formStyles.primaryBtn, createTask.isPending && formStyles.primaryBtnDisabled]}
          disabled={createTask.isPending}
        >
          {createTask.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={formStyles.primaryBtnText}>Add task</Text>
          )}
        </AppPressable>
      </AppBottomSheet>
    );
  },
);
