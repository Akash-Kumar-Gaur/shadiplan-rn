import { useQuery } from "@tanstack/react-query";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Printer, Share2 } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { Alert, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import { AppPressable } from "../components/AppPressable";
import { ScreenEmpty } from "../components/ScreenEmpty";
import { ScreenLoader } from "../components/ScreenLoader";
import { StackScreenHeader } from "../components/StackScreenHeader";
import { useTimelineEvents } from "../hooks/use-timeline-events";
import { useWeddingMeta } from "../hooks/use-wedding-meta";
import { fetchEventSongs, groupSongsByMoment, type EventSong } from "../lib/event-songs-api";
import { dateTabLabel, distinctEventDates } from "../lib/lead-time-dates";
import { formatDisplayTime, parseTimeToMinutes } from "../lib/time-utils";
import type { TimelineEvent } from "../lib/wedding-api";
import { colors, fonts, radius, spacing } from "../theme/tokens";

export function RunSheetScreen() {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<View>(null);
  const { data: wedding, isLoading: weddingLoading } = useWeddingMeta();
  const weddingId = wedding?.id;
  const { data: timelineEvents = [], isLoading: eventsLoading } = useTimelineEvents(weddingId);

  const eventDates = useMemo(() => distinctEventDates(timelineEvents), [timelineEvents]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const activeDate = selectedDate ?? eventDates[0] ?? null;

  const dayEvents = useMemo(() => {
    if (!activeDate) return [];
    return timelineEvents
      .filter((e) => e.eventDate === activeDate)
      .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  }, [timelineEvents, activeDate]);

  const songsQuery = useQuery({
    queryKey: ["run-sheet-songs", dayEvents.map((e) => e.id).join(",")],
    queryFn: async () => {
      const entries = await Promise.all(
        dayEvents.map(async (event) => [event.id, await fetchEventSongs(event.id)] as const),
      );
      return Object.fromEntries(entries) as Record<string, EventSong[]>;
    },
    enabled: dayEvents.length > 0,
  });

  const songsByEvent = songsQuery.data ?? {};

  const plainText = useMemo(
    () =>
      buildPlainTextRunSheet(
        wedding?.coupleNames ?? "Wedding",
        activeDate,
        dayEvents,
        songsByEvent,
      ),
    [wedding?.coupleNames, activeDate, dayEvents, songsByEvent],
  );

  const handleShare = async () => {
    try {
      if (sheetRef.current && (await Sharing.isAvailableAsync())) {
        const uri = await captureRef(sheetRef, { format: "png", quality: 1, result: "tmpfile" });
        await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png" });
        return;
      }
      await Share.share({
        title: `Run sheet — ${wedding?.coupleNames ?? "Wedding"}`,
        message: plainText,
      });
    } catch {
      // cancelled
    }
  };

  const handleExportPdf = async () => {
    try {
      const html = buildRunSheetHtml(
        wedding?.coupleNames ?? "Wedding",
        wedding?.location ?? "",
        activeDate,
        eventDates,
        dayEvents,
        songsByEvent,
      );
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      } else {
        Alert.alert("PDF ready", uri);
      }
    } catch (err) {
      Alert.alert("Export failed", err instanceof Error ? err.message : "Try again");
    }
  };

  const loading = weddingLoading || eventsLoading;

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
      <StackScreenHeader title="Day-of Run Sheet" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.screen, paddingBottom: insets.bottom + 32 }}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
          {eventDates.map((date, i) => (
            <AppPressable
              key={date}
              onPress={() => setSelectedDate(date)}
              style={[styles.dayChip, activeDate === date && styles.dayChipActive]}
            >
              <Text
                style={[styles.dayChipText, activeDate === date && styles.dayChipTextActive]}
              >
                {dateTabLabel(date, i)}
              </Text>
            </AppPressable>
          ))}
        </ScrollView>

        <View ref={sheetRef} collapsable={false} style={styles.sheetCard}>
          <Text style={styles.sheetEyebrow}>Run sheet</Text>
          <Text style={styles.sheetTitle}>{wedding.coupleNames}</Text>
          <Text style={styles.sheetMeta}>
            {activeDate
              ? dateTabLabel(activeDate, eventDates.indexOf(activeDate))
              : "No date"}
            {wedding.location ? ` · ${wedding.location}` : ""}
          </Text>

          {dayEvents.length === 0 ? (
            <Text style={styles.empty}>No events on this day.</Text>
          ) : (
            dayEvents.map((event) => {
              const songs = songsByEvent[event.id] ?? [];
              const grouped = groupSongsByMoment(songs);
              return (
                <View key={event.id} style={styles.eventRow}>
                  <Text style={styles.time}>{formatDisplayTime(event.time) || "TBC"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventName}>{event.name}</Text>
                    <Text style={styles.meta}>
                      {event.venue || "Venue TBC"}
                      {event.dressCode ? ` · ${event.dressCode}` : ""}
                    </Text>
                    {grouped.map(({ moment, songs: momentSongs }) => (
                      <View key={moment} style={styles.songGroup}>
                        <Text style={styles.moment}>{moment}</Text>
                        {momentSongs.map((s) => (
                          <Text key={s.id} style={styles.songLine}>
                            {s.songName}
                            {s.artist ? ` — ${s.artist}` : ""}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.actions}>
          <AppPressable
            onPress={() => void handleShare()}
            disabled={dayEvents.length === 0}
            style={[styles.actionBtn, styles.outlineBtn, dayEvents.length === 0 && styles.disabled]}
          >
            <Share2 size={16} color={colors.primary} />
            <Text style={styles.outlineText}>Share</Text>
          </AppPressable>
          <AppPressable
            onPress={() => void handleExportPdf()}
            disabled={dayEvents.length === 0}
            style={[styles.actionBtn, styles.primaryBtn, dayEvents.length === 0 && styles.disabled]}
          >
            <Printer size={16} color={colors.primaryForeground} />
            <Text style={styles.primaryText}>PDF</Text>
          </AppPressable>
        </View>
      </ScrollView>
    </View>
  );
}

function buildPlainTextRunSheet(
  coupleNames: string,
  date: string | null,
  events: TimelineEvent[],
  songsByEvent: Record<string, EventSong[]>,
): string {
  const lines = [`${coupleNames} — Run sheet`, date ?? "", ""];
  for (const event of events) {
    lines.push(
      `${formatDisplayTime(event.time) || "TBC"} — ${event.name} — ${event.venue || "Venue TBC"}`,
    );
    for (const group of groupSongsByMoment(songsByEvent[event.id] ?? [])) {
      lines.push(`  ${group.moment}:`);
      for (const s of group.songs) {
        lines.push(`    ${s.songName}${s.artist ? ` — ${s.artist}` : ""}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

function buildRunSheetHtml(
  coupleNames: string,
  location: string,
  activeDate: string | null,
  eventDates: string[],
  events: TimelineEvent[],
  songsByEvent: Record<string, EventSong[]>,
): string {
  const dayLabel = activeDate
    ? dateTabLabel(activeDate, eventDates.indexOf(activeDate))
    : "";
  const rows = events
    .map((event) => {
      const songs = groupSongsByMoment(songsByEvent[event.id] ?? [])
        .map(
          (g) =>
            `<div style="margin-top:6px;padding-left:10px;border-left:2px solid #EDE4D6">
              <div style="font-size:10px;text-transform:uppercase;color:#8A7F73">${escapeHtml(g.moment)}</div>
              ${g.songs
                .map(
                  (s) =>
                    `<div style="font-size:12px">${escapeHtml(s.songName)}${
                      s.artist ? ` — ${escapeHtml(s.artist)}` : ""
                    }</div>`,
                )
                .join("")}
            </div>`,
        )
        .join("");
      return `<tr>
        <td style="vertical-align:top;padding:10px 8px;width:80px;font-weight:600">${escapeHtml(formatDisplayTime(event.time) || "TBC")}</td>
        <td style="padding:10px 8px">
          <div style="font-weight:600">${escapeHtml(event.name)}</div>
          <div style="font-size:12px;color:#8A7F73">${escapeHtml(event.venue || "Venue TBC")}</div>
          ${songs}
        </td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#3C332C;padding:24px}
    h1{font-size:24px;margin:4px 0} .meta{color:#8A7F73;font-size:13px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse} tr{border-bottom:1px solid #EDE4D6}</style></head>
    <body>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8A7F73">Run sheet</div>
      <h1>${escapeHtml(coupleNames)}</h1>
      <div class="meta">${escapeHtml(dayLabel)}${location ? ` · ${escapeHtml(location)}` : ""}</div>
      <table>${rows}</table>
    </body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  dayScroll: { marginBottom: 16 },
  dayChip: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.mutedForeground },
  dayChipTextActive: { color: colors.primaryForeground },
  sheetCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    padding: 16,
  },
  sheetEyebrow: {
    fontFamily: fonts.body,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.mutedForeground,
  },
  sheetTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.foreground, marginTop: 4 },
  sheetMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.mutedForeground, marginBottom: 12 },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.mutedForeground, textAlign: "center", paddingVertical: 24 },
  eventRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  time: {
    width: 64,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.foreground,
  },
  eventName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.foreground },
  meta: { marginTop: 2, fontFamily: fonts.body, fontSize: 12, color: colors.mutedForeground },
  songGroup: {
    marginTop: 8,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  moment: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.mutedForeground,
  },
  songLine: { fontFamily: fonts.body, fontSize: 12, color: colors.foreground },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  outlineBtn: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  primaryBtn: { backgroundColor: colors.terracottaDark },
  outlineText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },
  primaryText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primaryForeground },
  disabled: { opacity: 0.45 },
});
