import { useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, FileDown, Share2 } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { LinearGradient } from "expo-linear-gradient";
import { AppPressable } from "../components/AppPressable";
import { INVITE_THEME_IDS, INVITE_THEMES } from "../components/invite/InviteThemes";
import { ScreenEmpty } from "../components/ScreenEmpty";
import { ScreenLoader } from "../components/ScreenLoader";
import { useSavedInvite } from "../hooks/use-invite-query";
import { useGuestGroups, useGuests } from "../hooks/use-vendor-guest-queries";
import { useTimelineEvents } from "../hooks/use-timeline-events";
import { useWeddingMeta } from "../hooks/use-wedding-meta";
import { upsertInvite } from "../lib/invite-api";
import { getCardDimensions } from "../lib/invite-export";
import { buildInviteEventDetails, type InviteThemeId } from "../lib/invite-utils";
import { dateTabLabel, distinctEventDates } from "../lib/lead-time-dates";
import { formatDisplayTime } from "../lib/time-utils";
import { weddingQueryKeys } from "../lib/wedding-query-keys";
import type { TimelineEvent } from "../lib/wedding-api";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts, radius, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Invite">;

const PREVIEW_MAX_WIDTH = Dimensions.get("window").width - spacing.screen * 2 - 32;

export function InviteScreen({ navigation, route }: Props) {
  const { guestId, groupId } = route.params;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const cardRef = useRef<View>(null);

  const { data: wedding, isLoading: weddingLoading } = useWeddingMeta();
  const weddingId = wedding?.id;
  const { data: timelineEvents = [], isLoading: eventsLoading } = useTimelineEvents(weddingId);
  const { data: guests = [] } = useGuests(weddingId);
  const { data: guestGroups = [] } = useGuestGroups(weddingId);
  const savedQuery = useSavedInvite(weddingId, guestId, groupId);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<InviteThemeId>("floral");
  const [savedInviteId, setSavedInviteId] = useState<string | undefined>();
  const [restored, setRestored] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const guest = guestId ? guests.find((g) => g.id === guestId) : undefined;
  const group = groupId ? guestGroups.find((g) => g.id === groupId) : undefined;
  const targetLabel = guest?.name ?? group?.name ?? "Guest";

  useEffect(() => {
    setSelectedIds(new Set());
    setTheme("floral");
    setSavedInviteId(undefined);
    setRestored(false);
    setShowCompleted(false);
  }, [guestId, groupId]);

  useEffect(() => {
    if (restored || !savedQuery.data) return;
    const ids = new Set(savedQuery.data.eventIds);
    setSelectedIds(ids);
    setTheme(savedQuery.data.theme);
    setSavedInviteId(savedQuery.data.id);
    const hasCompleted = timelineEvents.some((e) => ids.has(e.id) && e.done);
    if (hasCompleted) setShowCompleted(true);
    setRestored(true);
  }, [savedQuery.data, restored, timelineEvents]);

  const completedCount = useMemo(
    () => timelineEvents.filter((e) => e.done).length,
    [timelineEvents],
  );

  const visibleEvents = useMemo(
    () => (showCompleted ? timelineEvents : timelineEvents.filter((e) => !e.done)),
    [timelineEvents, showCompleted],
  );

  useEffect(() => {
    if (showCompleted) return;
    setSelectedIds((prev) => {
      const next = new Set(
        [...prev].filter((id) => {
          const event = timelineEvents.find((e) => e.id === id);
          return !event || !event.done;
        }),
      );
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [timelineEvents, showCompleted]);

  const eventDates = useMemo(() => distinctEventDates(visibleEvents), [visibleEvents]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const date of eventDates) {
      const events = visibleEvents.filter((e) => e.eventDate === date);
      if (events.length > 0) map.set(date, events);
    }
    return map;
  }, [visibleEvents, eventDates]);

  const selectedEvents = useMemo(
    () => timelineEvents.filter((e) => selectedIds.has(e.id)),
    [timelineEvents, selectedIds],
  );

  const cardProps = useMemo(
    () => ({
      coupleNames: wedding?.coupleNames ?? "Couple",
      events: buildInviteEventDetails(selectedEvents),
      location: wedding?.location ?? "",
    }),
    [wedding, selectedEvents],
  );

  const cardDimensions = useMemo(
    () => getCardDimensions(cardProps.events.length),
    [cardProps.events.length],
  );

  const previewScale = PREVIEW_MAX_WIDTH / cardDimensions.width;
  const previewHeight = cardDimensions.height * previewScale;

  const ThemeComponent = INVITE_THEMES[theme].Component;

  const toggleEvent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const persistInvite = async () => {
    if (!wedding) return;
    const saved = await upsertInvite({
      weddingId: wedding.id,
      guestId,
      guestGroupId: groupId,
      eventIds: [...selectedIds],
      theme,
      existingId: savedInviteId ?? savedQuery.data?.id,
    });
    setSavedInviteId(saved.id);
    void queryClient.invalidateQueries({
      queryKey: weddingQueryKeys.invite(wedding.id, guestId, groupId),
    });
  };

  const canExport =
    !!wedding && cardProps.events.length > 0 && cardProps.coupleNames.trim().length > 0;

  const handleExport = async (mode: "share" | "pdf") => {
    if (!cardRef.current || !wedding || !canExport) return;
    setExporting(true);
    try {
      await persistInvite();

      if (mode === "share") {
        const uri = await captureRef(cardRef, {
          format: "png",
          quality: 1,
          result: "tmpfile",
          width: cardDimensions.width,
          height: cardDimensions.height,
        });
        const available = await Sharing.isAvailableAsync();
        if (!available) {
          Alert.alert("Sharing unavailable", "Sharing is not available on this device.");
          return;
        }
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: `${wedding.coupleNames} — Wedding invite`,
        });
      } else {
        const imageUri = await captureRef(cardRef, {
          format: "png",
          quality: 1,
          result: "base64",
          width: cardDimensions.width,
          height: cardDimensions.height,
        });
        const html = `<html><body style="margin:0;padding:0;"><img src="data:image/png;base64,${imageUri}" style="width:100%;display:block;" /></body></html>`;
        const { uri } = await Print.printToFileAsync({ html });
        const available = await Sharing.isAvailableAsync();
        if (!available) {
          Alert.alert("PDF ready", "PDF was created but sharing is unavailable on this device.");
          return;
        }
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `${wedding.coupleNames} — Wedding invite PDF`,
          UTI: "com.adobe.pdf",
        });
      }
    } catch (err) {
      Alert.alert("Export failed", err instanceof Error ? err.message : "Could not export invite");
    } finally {
      setExporting(false);
    }
  };

  if (!guestId && !groupId) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenEmpty description="No guest or group selected." />
        <AppPressable onPress={() => navigation.goBack()} style={styles.backCenter}>
          <Text style={styles.backText}>Back to guests</Text>
        </AppPressable>
      </View>
    );
  }

  const loading = weddingLoading || eventsLoading || savedQuery.isPending;

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
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{targetLabel}</Text>
        <Text style={styles.title}>Create invite</Text>
        <AppPressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <ArrowLeft size={14} color={colors.primary} />
          <Text style={styles.backText}>Back to guests</Text>
        </AppPressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.screen,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>Events</Text>
          {completedCount > 0 ? (
            <View style={styles.showCompletedRow}>
              <Text style={styles.showCompletedLabel}>Show completed</Text>
              <Switch
                value={showCompleted}
                onValueChange={setShowCompleted}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.card}
              />
            </View>
          ) : null}
        </View>
        <View style={styles.listCard}>
          {[...eventsByDate.entries()].map(([date, events], index) => (
            <View
              key={date}
              style={[
                styles.dayBlock,
                index < eventsByDate.size - 1 && styles.dayBlockBorder,
              ]}
            >
              <Text style={styles.dayLabel}>{dateTabLabel(date, index)}</Text>
              {events.map((event) => {
                const checked = selectedIds.has(event.id);
                return (
                  <AppPressable
                    key={event.id}
                    onPress={() => toggleEvent(event.id)}
                    style={styles.eventRow}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                    <View style={styles.eventText}>
                      <Text style={styles.eventName}>
                        {event.name}
                        {event.done ? " (completed)" : ""}
                      </Text>
                      <Text style={styles.eventMeta}>
                        {formatDisplayTime(event.time)} · {event.venue || "Venue TBC"}
                      </Text>
                    </View>
                  </AppPressable>
                );
              })}
            </View>
          ))}
          {eventsByDate.size === 0 ? (
            <Text style={styles.emptyEvents}>
              {timelineEvents.length === 0
                ? "No timeline events yet — add them from your checklist."
                : "No upcoming events — turn on “Show completed” to include past ones."}
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Theme</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.themeRow}
        >
          {INVITE_THEME_IDS.map((id) => {
            const selected = theme === id;
            return (
              <AppPressable
                key={id}
                onPress={() => setTheme(id)}
                style={[styles.themeItem, selected && styles.themeItemSelected]}
                accessibilityLabel={INVITE_THEMES[id].label}
              >
                <LinearGradient
                  colors={[...INVITE_THEMES[id].swatchColors]}
                  style={styles.themeSwatch}
                />
                <Text style={styles.themeLabel}>{INVITE_THEMES[id].label}</Text>
              </AppPressable>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>Preview</Text>
        <View style={styles.previewCard}>
          <View
            style={{
              width: PREVIEW_MAX_WIDTH,
              height: previewHeight,
              overflow: "hidden",
              borderRadius: radius.md,
            }}
          >
            <View
              ref={cardRef}
              collapsable={false}
              style={{
                width: cardDimensions.width,
                height: cardDimensions.height,
                transform: [{ scale: previewScale }],
                transformOrigin: "top left",
              }}
            >
              <ThemeComponent {...cardProps} />
            </View>
          </View>
        </View>

        <AppPressable
          onPress={() => void handleExport("share")}
          disabled={exporting || !canExport}
          style={[styles.primaryBtn, (exporting || !canExport) && styles.btnDisabled]}
        >
          {exporting ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Share2 size={16} color={colors.primaryForeground} />
              <Text style={styles.primaryBtnText}>Share via WhatsApp</Text>
            </>
          )}
        </AppPressable>

        <AppPressable
          onPress={() => void handleExport("pdf")}
          disabled={exporting || !canExport}
          style={[styles.outlineBtn, (exporting || !canExport) && styles.btnDisabled]}
        >
          <FileDown size={16} color={colors.primary} />
          <Text style={styles.outlineBtnText}>Save PDF</Text>
        </AppPressable>

        {!canExport && cardProps.events.length === 0 ? (
          <Text style={styles.hint}>Select at least one event to export.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.screen,
    paddingBottom: 12,
  },
  eyebrow: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.foreground,
    marginTop: 2,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  backCenter: {
    alignItems: "center",
    marginTop: 16,
  },
  backText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.primary,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.foreground,
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sectionTitleInline: {
    marginTop: 0,
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  showCompletedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  showCompletedLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 16,
  },
  dayBlock: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dayBlockBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.primaryForeground,
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
  },
  eventText: {
    flex: 1,
    minWidth: 0,
  },
  eventName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  eventMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  emptyEvents: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    padding: 24,
  },
  themeRow: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 8,
    marginBottom: 8,
  },
  themeItem: {
    alignItems: "center",
    padding: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeItemSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  themeSwatch: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
  },
  themeLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  previewCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    marginBottom: 12,
  },
  primaryBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.primaryForeground,
  },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  outlineBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.primary,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: 12,
  },
});
