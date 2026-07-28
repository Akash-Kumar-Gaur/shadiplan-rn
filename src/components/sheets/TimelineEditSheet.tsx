import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { useFormDirty } from "../../hooks/use-form-dirty";
import { useDeleteTimelineEvent, useUpdateTimelineEvent } from "../../hooks/use-checklist-mutations";
import type { TimelineEvent } from "../../lib/wedding-api";
import { shortDate } from "../../lib/format";
import { normalizeTimeForStorage } from "../../lib/time-utils";
import { AppBottomSheet, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
import { requestAppConfirm, showAppAlert } from "../ConfirmSheet";
import { AppTextInput } from "../AppTextInput";
import { TimePicker } from "../TimePicker";
import { colors, fonts } from "../../theme/tokens";

type Props = {
  event: TimelineEvent | null;
  weddingId: string | undefined;
  onClose: () => void;
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

export const TimelineEditSheet = forwardRef<BottomSheetModal, Props>(function TimelineEditSheet(
  { event, weddingId, onClose },
  ref,
) {
  const innerRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => innerRef.current!);

  const updateEvent = useUpdateTimelineEvent(weddingId);
  const deleteEvent = useDeleteTimelineEvent(weddingId);

  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [time, setTime] = useState("19:00");
  const [venue, setVenue] = useState("");
  const [dressCode, setDressCode] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;
    setName(event.name);
    setEventDate(event.eventDate);
    setTime(event.time);
    setVenue(event.venue ?? "");
    setDressCode(event.dressCode ?? "");
    setError(null);
    setShowDatePicker(false);
  }, [event]);

  const formValues = useMemo(
    () => ({ name, eventDate, time, venue, dressCode }),
    [name, eventDate, time, venue, dressCode],
  );

  const baseline = useMemo(
    () => ({
      name: event?.name ?? "",
      eventDate: event?.eventDate ?? "",
      time: event?.time ?? "19:00",
      venue: event?.venue ?? "",
      dressCode: event?.dressCode ?? "",
    }),
    [event],
  );

  const isDirty = useFormDirty(formValues, baseline);

  const handleSave = async () => {
    if (!event) return;
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
      await updateEvent.mutateAsync({
        id: event.id,
        patch: {
          name: name.trim(),
          eventDate,
          time: normalizedTime,
          venue: venue.trim(),
          dressCode: dressCode.trim()
}
});
      innerRef.current?.dismiss();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save event");
    }
  };

  const handleDelete = () => {
    if (!event) return;
    requestAppConfirm({
      title: "Remove event?",
      message: `"${event.name}" and its songs will be removed.`,
      confirmLabel: "Remove",
      destructive: true,
      onConfirm: () => {
        deleteEvent.mutate(event.id, {
          onSuccess: () => {
            innerRef.current?.dismiss();
            onClose();
          },
          onError: (err) => {
            showAppAlert("Could not remove", err instanceof Error ? err.message : "Try again");
          },
        });
      },
    });
  };

  if (!event) return null;

  const saving = updateEvent.isPending;

  return (
    <AppBottomSheet ref={innerRef} title="Edit timeline event" isDirty={isDirty} onDismiss={onClose}>
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
        onPress={() => void handleSave()}
        style={[formStyles.primaryBtn, saving && formStyles.primaryBtnDisabled]}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={formStyles.primaryBtnText}>Save changes</Text>
        )}
      </AppPressable>

      <AppPressable
        onPress={handleDelete}
        disabled={deleteEvent.isPending}
        style={{ marginTop: 16, alignItems: "center" }}
      >
        {deleteEvent.isPending ? (
          <ActivityIndicator color={colors.destructive} />
        ) : (
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.destructive }}>
            Remove event
          </Text>
        )}
      </AppPressable>
    </AppBottomSheet>
  );
});
