import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Music, Trash2 } from "lucide-react-native";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppBottomSheet, formStyles } from "../components/AppBottomSheet";
import { AppPressable } from "../components/AppPressable";
import { requestAppConfirm } from "../components/ConfirmSheet";
import { AppSelect } from "../components/AppSelect";
import { AppTextInput } from "../components/AppTextInput";
import { Fab } from "../components/Fab";
import { ScreenEmpty } from "../components/ScreenEmpty";
import { ScreenLoader } from "../components/ScreenLoader";
import { StackScreenHeader } from "../components/StackScreenHeader";
import { useFormDirty } from "../hooks/use-form-dirty";
import { useTimelineEvents } from "../hooks/use-timeline-events";
import { useWeddingMeta } from "../hooks/use-wedding-meta";
import {
  deleteEventSong,
  fetchSongsForEvents,
  insertEventSong,
  SONG_MOMENT_PRESETS,
  updateEventSong,
  type EventSong
} from "../lib/event-songs-api";
import { formatDisplayTime } from "../lib/time-utils";
import { weddingQueryKeys } from "../lib/wedding-query-keys";
import { colors, fonts, spacing } from "../theme/tokens";

const CUSTOM_MOMENT = "__custom__";

type SongRow = EventSong & { eventName: string; eventDate: string; eventTime: string };

export function SongsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: wedding, isLoading: weddingLoading } = useWeddingMeta();
  const weddingId = wedding?.id;
  const { data: events = [], isLoading: eventsLoading } = useTimelineEvents(weddingId);

  const [query, setQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingSong, setEditingSong] = useState<EventSong | null>(null);
  const addRef = useRef<BottomSheetModal>(null);
  const detailRef = useRef<BottomSheetModal>(null);
  const editRef = useRef<BottomSheetModal>(null);

  const songsQuery = useQuery({
    queryKey: weddingQueryKeys.weddingSongs(weddingId ?? ""),
    queryFn: () => fetchSongsForEvents(events.map((e) => e.id)),
    enabled: !!weddingId && events.length > 0
});

  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  const rows: SongRow[] = useMemo(() => {
    return (songsQuery.data ?? [])
      .map((song) => {
        const event = eventById.get(song.timelineEventId);
        if (!event) return null;
        return {
          ...song,
          eventName: event.name,
          eventDate: event.eventDate,
          eventTime: event.time
};
      })
      .filter((r): r is SongRow => r != null)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.songName.localeCompare(b.songName));
  }, [songsQuery.data, eventById]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.songName.toLowerCase().includes(q) ||
        r.artist?.toLowerCase().includes(q) ||
        r.moment.toLowerCase().includes(q) ||
        r.eventName.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const selectedEvent = selectedEventId ? eventById.get(selectedEventId) : undefined;
  const eventSongs = useMemo(
    () => (songsQuery.data ?? []).filter((s) => s.timelineEventId === selectedEventId),
    [songsQuery.data, selectedEventId],
  );

  const invalidate = () => {
    if (!weddingId) return;
    void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.weddingSongs(weddingId) });
  };

  const deleteMutation = useMutation({
    mutationFn: deleteEventSong,
    onSuccess: invalidate
});

  const openEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    requestAnimationFrame(() => detailRef.current?.present());
  };

  const openEditSong = (song: EventSong) => {
    setEditingSong(song);
    requestAnimationFrame(() => editRef.current?.present());
  };

  const loading =
    weddingLoading || eventsLoading || (!!weddingId && events.length > 0 && songsQuery.isPending);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenLoader />
      </View>
    );
  }

  if (!wedding) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenEmpty description="Set up your wedding first." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StackScreenHeader title="Songs" />
      <View style={styles.searchWrap}>
        <AppTextInput
          native
          value={query}
          onChangeText={setQuery}
          placeholder="Search songs, moments, events…"
          autoCorrect={false}
          containerStyle={{ marginBottom: 0 }}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.screen, paddingBottom: insets.bottom + 88 }}
        keyboardShouldPersistTaps="handled"
      >
        {events.length === 0 ? (
          <ScreenEmpty description="Add timeline events first — songs are attached per event." />
        ) : filtered.length === 0 ? (
          <Text style={styles.empty}>
            {rows.length === 0 ? "No songs yet — tap + to add one." : "No matches."}
          </Text>
        ) : (
          filtered.map((row) => (
            <AppPressable
              key={row.id}
              onPress={() => openEvent(row.timelineEventId)}
              style={styles.row}
            >
              <Music size={16} color={colors.primary} />
              <View style={styles.rowText}>
                <Text style={styles.songName}>{row.songName}</Text>
                <Text style={styles.meta}>
                  {row.moment}
                  {row.artist ? ` · ${row.artist}` : ""}
                </Text>
                <Text style={styles.eventMeta}>
                  {row.eventName} · {formatDisplayTime(row.eventTime) || "TBC"}
                </Text>
              </View>
            </AppPressable>
          ))
        )}
      </ScrollView>

      {events.length > 0 ? (
        <Fab label="Add song" aboveTabBar={false} onPress={() => addRef.current?.present()} />
      ) : null}

      <SongFormSheet
        ref={addRef}
        events={events.map((e) => ({
          id: e.id,
          label: `${e.name} · ${formatDisplayTime(e.time) || "TBC"}`
}))}
        onSaved={invalidate}
      />

      <SongFormSheet
        ref={editRef}
        events={events.map((e) => ({
          id: e.id,
          label: `${e.name} · ${formatDisplayTime(e.time) || "TBC"}`
}))}
        song={editingSong}
        onSaved={invalidate}
        onDismiss={() => setEditingSong(null)}
      />

      <AppBottomSheet
        ref={detailRef}
        title={selectedEvent?.name ?? "Event"}
        subtitle={
          selectedEvent
            ? `${formatDisplayTime(selectedEvent.time) || "TBC"} · ${selectedEvent.venue || "Venue TBC"}`
            : undefined
        }
        onDismiss={() => setSelectedEventId(null)}
      >
        {eventSongs.length === 0 ? (
          <Text style={styles.empty}>No songs for this event yet.</Text>
        ) : (
          eventSongs.map((song) => (
            <View key={song.id} style={styles.detailRow}>
              <AppPressable
                onPress={() => openEditSong(song)}
                style={{ flex: 1 }}
                accessibilityLabel={`Edit ${song.songName}`}
              >
                <Text style={styles.songName}>{song.songName}</Text>
                <Text style={styles.meta}>
                  {song.moment}
                  {song.artist ? ` · ${song.artist}` : ""}
                </Text>
              </AppPressable>
              <AppPressable
                onPress={() =>
                  requestAppConfirm({
                    title: "Remove song?",
                    message: song.songName,
                    confirmLabel: "Delete",
                    destructive: true,
                    onConfirm: () => deleteMutation.mutate(song.id),
                  })
                }
                accessibilityLabel="Delete song"
              >
                <Trash2 size={16} color={colors.destructive} />
              </AppPressable>
            </View>
          ))
        )}
      </AppBottomSheet>
    </View>
  );
}

const SongFormSheet = forwardRef<
  BottomSheetModal,
  {
    events: { id: string; label: string }[];
    song?: EventSong | null;
    onSaved: () => void;
    onDismiss?: () => void;
  }
>(function SongFormSheet({ events, song = null, onSaved, onDismiss }, ref) {
  const innerRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => innerRef.current!);
  const isEdit = !!song;

  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [momentPreset, setMomentPreset] = useState<string>(SONG_MOMENT_PRESETS[0]);
  const [customMoment, setCustomMoment] = useState("");
  const [songName, setSongName] = useState("");
  const [artist, setArtist] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setEventId(events[0]?.id ?? "");
    setMomentPreset(SONG_MOMENT_PRESETS[0]);
    setCustomMoment("");
    setSongName("");
    setArtist("");
    setLink("");
    setError(null);
  };

  useEffect(() => {
    if (song) {
      const isPreset = (SONG_MOMENT_PRESETS as readonly string[]).includes(song.moment);
      setEventId(song.timelineEventId);
      setMomentPreset(isPreset ? song.moment : CUSTOM_MOMENT);
      setCustomMoment(isPreset ? "" : song.moment);
      setSongName(song.songName);
      setArtist(song.artist ?? "");
      setLink(song.link ?? "");
    } else {
      setEventId(events[0]?.id ?? "");
      setMomentPreset(SONG_MOMENT_PRESETS[0]);
      setCustomMoment("");
      setSongName("");
      setArtist("");
      setLink("");
    }
    setError(null);
    // Only reacts to `song` identity; `events` default is only used when creating.
  }, [song]);

  const formValues = useMemo(
    () => ({
      eventId,
      momentPreset,
      customMoment,
      songName,
      artist,
      link,
    }),
    [eventId, momentPreset, customMoment, songName, artist, link],
  );

  const baseline = useMemo(() => {
    if (song) {
      const isPreset = (SONG_MOMENT_PRESETS as readonly string[]).includes(song.moment);
      return {
        eventId: song.timelineEventId,
        momentPreset: isPreset ? song.moment : CUSTOM_MOMENT,
        customMoment: isPreset ? "" : song.moment,
        songName: song.songName,
        artist: song.artist ?? "",
        link: song.link ?? "",
      };
    }
    return {
      eventId: events[0]?.id ?? "",
      momentPreset: SONG_MOMENT_PRESETS[0],
      customMoment: "",
      songName: "",
      artist: "",
      link: "",
    };
  }, [song, events]);

  const isDirty = useFormDirty(formValues, baseline);

  const handleSubmit = async () => {
    const moment = momentPreset === CUSTOM_MOMENT ? customMoment.trim() : momentPreset.trim();
    if (!eventId) {
      setError("Select an event");
      return;
    }
    if (!moment) {
      setError("Choose or enter a moment");
      return;
    }
    if (!songName.trim()) {
      setError("Song name is required");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (isEdit && song) {
        await updateEventSong(song.id, {
          moment,
          songName: songName.trim(),
          artist: artist.trim() || undefined,
          link: link.trim() || undefined
});
      } else {
        await insertEventSong(eventId, {
          moment,
          songName: songName.trim(),
          artist: artist.trim() || undefined,
          link: link.trim() || undefined
});
      }
      reset();
      innerRef.current?.dismiss();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save song");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppBottomSheet
      ref={innerRef}
      title={isEdit ? "Edit song" : "Add song"}
      subtitle={isEdit ? undefined : "Attach to a timeline event"}
      isDirty={isDirty}
      onDismiss={onDismiss}
    >
      {isEdit ? null : (
        <AppSelect
          label="Event"
          value={eventId}
          onSelect={setEventId}
          options={events.map((e) => ({ label: e.label, value: e.id }))}
        />
      )}
      <AppSelect
        label="Moment"
        value={momentPreset}
        onSelect={setMomentPreset}
        options={[
          ...SONG_MOMENT_PRESETS.map((m) => ({ label: m, value: m })),
          { label: "Custom…", value: CUSTOM_MOMENT },
        ]}
      />
      {momentPreset === CUSTOM_MOMENT ? (
        <AppTextInput
          label="Custom moment"
          value={customMoment}
          onChangeText={setCustomMoment}
          placeholder="e.g. Cake cutting"
        />
      ) : null}
      <AppTextInput
        label="Song name"
        value={songName}
        onChangeText={setSongName}
        placeholder="Song title"
      />
      <AppTextInput
        label="Artist"
        value={artist}
        onChangeText={setArtist}
        placeholder="Optional"
      />
      <AppTextInput
        label="Link"
        value={link}
        onChangeText={setLink}
        placeholder="Spotify / YouTube (optional)"
        autoCapitalize="none"
      />
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
      <AppPressable
        onPress={() => void handleSubmit()}
        disabled={saving}
        style={[formStyles.primaryBtn, saving && formStyles.primaryBtnDisabled]}
      >
        {saving ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={formStyles.primaryBtnText}>{isEdit ? "Save changes" : "Save song"}</Text>
        )}
      </AppPressable>
    </AppBottomSheet>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchWrap: { paddingHorizontal: spacing.screen, paddingTop: 12 },
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: 24
},
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "flex-start"
},
  rowText: { flex: 1 },
  songName: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.foreground },
  meta: { marginTop: 2, fontFamily: fonts.body, fontSize: 12, color: colors.mutedForeground },
  eventMeta: { marginTop: 4, fontFamily: fonts.body, fontSize: 12, color: colors.primary },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
}
});
