import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { useFormDirty } from "../../hooks/use-form-dirty";
import { useCreateTimelineEvent } from "../../hooks/use-checklist-mutations";
import type { Wedding } from "../../lib/wedding-api";
import { shortDate } from "../../lib/format";
import { normalizeTimeForStorage } from "../../lib/time-utils";
import { AppBottomSheet, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
import { AppTextInput } from "../AppTextInput";
import { TimePicker } from "../TimePicker";
import { colors } from "../../theme/tokens";

type Props = {
  weddingId: string | undefined;
  wedding: Wedding | null | undefined;
  defaultDate: string;
  onCreated?: (eventDate: string) => void;
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

export const TimelineCreateSheet = forwardRef<BottomSheetModal, Props>(function TimelineCreateSheet(
  { weddingId, wedding, defaultDate, onCreated },
  ref,
) {
  const innerRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => innerRef.current!);

  const createEvent = useCreateTimelineEvent(weddingId, wedding);

  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState(defaultDate);
  const [time, setTime] = useState("19:00");
  const [venue, setVenue] = useState("");
  const [dressCode, setDressCode] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEventDate(defaultDate);
  }, [defaultDate]);

  const reset = () => {
    setName("");
    setEventDate(defaultDate);
    setTime("19:00");
    setVenue("");
    setDressCode("");
    setError(null);
    setShowDatePicker(false);
  };

  const formValues = useMemo(
    () => ({ name, eventDate, time, venue, dressCode }),
    [name, eventDate, time, venue, dressCode],
  );

  const baseline = useMemo(
    () => ({
      name: "",
      eventDate: defaultDate,
      time: "19:00",
      venue: "",
      dressCode: "",
    }),
    [defaultDate],
  );

  const isDirty = useFormDirty(formValues, baseline);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Event name is required");
      return;
    }
    const normalizedTime = normalizeTimeForStorage(time);
    if (!normalizedTime) {
      setError("Pick a valid time");
      return;
    }
    setError(null);
    try {
      await createEvent.mutateAsync({
        eventDate,
        time: normalizedTime,
        name: name.trim(),
        venue: venue.trim() || undefined,
        dressCode: dressCode.trim() || undefined
});
      innerRef.current?.dismiss();
      onCreated?.(eventDate);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add event");
    }
  };

  return (
    <AppBottomSheet ref={innerRef} title="Add timeline event" isDirty={isDirty} onDismiss={reset}>
      <AppTextInput
        label="Event name"
        placeholder="e.g. Sangeet"
        value={name}
        onChangeText={setName}
      />

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Date</Text>
        <AppPressable style={formStyles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={{ color: eventDate ? colors.charcoal : colors.textMuted, fontSize: 15 }}>
            {eventDate ? shortDate(eventDate) : "Pick date"}
          </Text>
        </AppPressable>
        {showDatePicker ? (
          <DateTimePicker
            value={eventDate ? parseIsoDate(eventDate) : new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_e, date) => {
              if (Platform.OS !== "ios") setShowDatePicker(false);
              if (date) setEventDate(toIsoDate(date));
            }}
          />
        ) : null}
        {Platform.OS === "ios" && showDatePicker ? (
          <AppPressable onPress={() => setShowDatePicker(false)} style={{ marginTop: 8 }}>
            <Text style={{ color: colors.primary, fontSize: 14 }}>Done</Text>
          </AppPressable>
        ) : null}
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Time</Text>
        <TimePicker value={time} onChange={setTime} />
      </View>

      <AppTextInput
        label="Venue"
        placeholder="Venue name"
        value={venue}
        onChangeText={setVenue}
      />

      <AppTextInput
        label="Dress code"
        placeholder="e.g. Traditional"
        value={dressCode}
        onChangeText={setDressCode}
      />

      {error ? <Text style={formStyles.error}>{error}</Text> : null}

      <AppPressable
        onPress={() => void handleSubmit()}
        style={[formStyles.primaryBtn, createEvent.isPending && formStyles.primaryBtnDisabled]}
        disabled={createEvent.isPending}
      >
        {createEvent.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={formStyles.primaryBtnText}>Add event</Text>
        )}
      </AppPressable>
    </AppBottomSheet>
  );
});
