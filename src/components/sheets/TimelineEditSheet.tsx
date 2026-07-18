import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from "react-native";
import { useDeleteTimelineEvent, useUpdateTimelineEvent } from "../../hooks/use-checklist-mutations";
import type { TimelineEvent } from "../../lib/wedding-api";
import { shortDate } from "../../lib/format";
import { normalizeTimeForStorage } from "../../lib/time-utils";
import { AppBottomSheet, SheetTextInput, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
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
    Alert.alert("Remove event?", `"${event.name}" and its songs will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          deleteEvent.mutate(event.id, {
            onSuccess: () => {
              innerRef.current?.dismiss();
              onClose();
            },
            onError: (err) => {
              Alert.alert("Could not remove", err instanceof Error ? err.message : "Try again");
            }
});
        }
},
    ]);
  };

  if (!event) return null;

  const saving = updateEvent.isPending;

  return (
    <AppBottomSheet ref={innerRef} title="Edit timeline event" onDismiss={onClose}>
      <View style={formStyles.field}>
        <Text style={formStyles.label}>Event name</Text>
        <SheetTextInput
          style={formStyles.input}
          placeholder="e.g. Sangeet"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Date</Text>
        <Pressable onPress={() => setShowDatePicker(true)}>
          <Text style={formStyles.input}>{eventDate ? shortDate(eventDate) : "Pick date"}</Text>
        </Pressable>
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

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Venue</Text>
        <SheetTextInput
          style={formStyles.input}
          placeholder="Venue name"
          value={venue}
          onChangeText={setVenue}
        />
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Dress code</Text>
        <SheetTextInput
          style={formStyles.input}
          placeholder="e.g. Traditional"
          value={dressCode}
          onChangeText={setDressCode}
        />
      </View>

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
