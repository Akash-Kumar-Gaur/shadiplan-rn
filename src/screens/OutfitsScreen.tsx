import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppBottomSheet, SheetTextInput, formStyles } from "../components/AppBottomSheet";
import { AppPressable } from "../components/AppPressable";
import { ScreenEmpty } from "../components/ScreenEmpty";
import { ScreenLoader } from "../components/ScreenLoader";
import { StackScreenHeader } from "../components/StackScreenHeader";
import { useTimelineEvents } from "../hooks/use-timeline-events";
import { useWeddingMeta } from "../hooks/use-wedding-meta";
import { dateTabLabel, distinctEventDates } from "../lib/lead-time-dates";
import {
  deleteOutfitPlan,
  fetchOutfitPlans,
  OUTFIT_COLOR_PRESETS,
  OUTFIT_PERSON_PRESETS,
  upsertOutfitPlan,
  type OutfitPlan
} from "../lib/outfit-plans-api";
import { parseTimeToMinutes } from "../lib/time-utils";
import type { TimelineEvent } from "../lib/wedding-api";
import { weddingQueryKeys } from "../lib/wedding-query-keys";
import { colors, fonts, radius, spacing } from "../theme/tokens";

type ViewMode = "clash" | "grid";
type EditTarget = { person: string; event: TimelineEvent; existing?: OutfitPlan };

export function OutfitsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: wedding, isLoading: weddingLoading } = useWeddingMeta();
  const weddingId = wedding?.id;
  const { data: timelineEvents = [], isLoading: eventsLoading } = useTimelineEvents(weddingId);

  const [view, setView] = useState<ViewMode>("clash");
  const [clashDate, setClashDate] = useState<string | null>(null);
  const [people, setPeople] = useState<string[]>([...OUTFIT_PERSON_PRESETS]);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const editRef = useRef<BottomSheetModal>(null);
  const addPersonRef = useRef<BottomSheetModal>(null);
  const [newPerson, setNewPerson] = useState("");

  const plansQuery = useQuery({
    queryKey: weddingQueryKeys.outfitPlans(weddingId ?? ""),
    queryFn: () => fetchOutfitPlans(weddingId!),
    enabled: !!weddingId
});

  const plans = plansQuery.data ?? [];
  const eventDates = useMemo(() => distinctEventDates(timelineEvents), [timelineEvents]);
  const activeClashDate = clashDate ?? eventDates[0] ?? null;

  const eventsByDate = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const date of eventDates) {
      map.set(
        date,
        timelineEvents
          .filter((e) => e.eventDate === date)
          .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)),
      );
    }
    return map;
  }, [timelineEvents, eventDates]);

  const peopleFromPlans = useMemo(() => {
    const set = new Set(people);
    for (const p of plans) set.add(p.person);
    return [...set];
  }, [people, plans]);

  const planLookup = useMemo(() => {
    const map = new Map<string, OutfitPlan>();
    for (const p of plans) map.set(`${p.person}::${p.timelineEventId}`, p);
    return map;
  }, [plans]);

  const clashOutfits = useMemo(() => {
    if (!activeClashDate) return [];
    const dayEvents = eventsByDate.get(activeClashDate) ?? [];
    const eventIds = new Set(dayEvents.map((e) => e.id));
    return plans
      .filter((p) => eventIds.has(p.timelineEventId) && p.color)
      .map((p) => ({
        plan: p,
        event: dayEvents.find((e) => e.id === p.timelineEventId)!
}))
      .filter((x) => x.event);
  }, [activeClashDate, eventsByDate, plans]);

  const invalidate = () => {
    if (!weddingId) return;
    void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.outfitPlans(weddingId) });
  };

  const upsertMutation = useMutation({
    mutationFn: (input: Parameters<typeof upsertOutfitPlan>[1]) => {
      if (!weddingId) throw new Error("No wedding");
      return upsertOutfitPlan(weddingId, input);
    },
    onSuccess: invalidate
});

  const deleteMutation = useMutation({
    mutationFn: deleteOutfitPlan,
    onSuccess: invalidate
});

  const openEdit = (target: EditTarget) => {
    setEditTarget(target);
    requestAnimationFrame(() => editRef.current?.present());
  };

  const loading = weddingLoading || eventsLoading || (!!weddingId && plansQuery.isPending);

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
      <StackScreenHeader title="Outfit Planner" />
      <View style={styles.tabs}>
        <AppPressable
          onPress={() => setView("clash")}
          style={[styles.tab, view === "clash" && styles.tabActive]}
        >
          <Text style={[styles.tabText, view === "clash" && styles.tabTextActive]}>Color clash</Text>
        </AppPressable>
        <AppPressable
          onPress={() => setView("grid")}
          style={[styles.tab, view === "grid" && styles.tabActive]}
        >
          <Text style={[styles.tabText, view === "grid" && styles.tabTextActive]}>By event</Text>
        </AppPressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.screen, paddingBottom: insets.bottom + 32 }}
      >
        {timelineEvents.length === 0 ? (
          <ScreenEmpty description="Add timeline events first — outfits are planned per event." />
        ) : view === "clash" ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
              {eventDates.map((date, i) => (
                <AppPressable
                  key={date}
                  onPress={() => setClashDate(date)}
                  style={[styles.dayChip, activeClashDate === date && styles.dayChipActive]}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      activeClashDate === date && styles.dayChipTextActive,
                    ]}
                  >
                    {dateTabLabel(date, i)}
                  </Text>
                </AppPressable>
              ))}
            </ScrollView>
            {clashOutfits.length === 0 ? (
              <Text style={styles.empty}>No colors set for this day yet.</Text>
            ) : (
              clashOutfits.map(({ plan, event }) => (
                <AppPressable
                  key={plan.id}
                  onPress={() => openEdit({ person: plan.person, event, existing: plan })}
                  style={styles.clashRow}
                >
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: plan.color ?? colors.border },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{plan.person}</Text>
                    <Text style={styles.meta}>
                      {event.name}
                      {plan.outfitDescription ? ` · ${plan.outfitDescription}` : ""}
                    </Text>
                  </View>
                </AppPressable>
              ))
            )}
          </>
        ) : (
          <>
            <AppPressable
              onPress={() => addPersonRef.current?.present()}
              style={styles.addPersonBtn}
            >
              <Text style={styles.addPersonText}>+ Add person</Text>
            </AppPressable>
            {peopleFromPlans.map((person) => (
              <View key={person} style={styles.personBlock}>
                <Text style={styles.personTitle}>{person}</Text>
                {timelineEvents.map((event) => {
                  const existing = planLookup.get(`${person}::${event.id}`);
                  return (
                    <AppPressable
                      key={event.id}
                      onPress={() => openEdit({ person, event, existing })}
                      style={styles.cell}
                    >
                      {existing?.color ? (
                        <View
                          style={[styles.cellSwatch, { backgroundColor: existing.color }]}
                        />
                      ) : (
                        <View style={styles.cellEmpty} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cellEvent}>{event.name}</Text>
                        <Text style={styles.meta}>
                          {existing?.outfitDescription || existing?.color || "Tap to fill"}
                        </Text>
                      </View>
                    </AppPressable>
                  );
                })}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <OutfitEditSheet
        ref={editRef}
        target={editTarget}
        saving={upsertMutation.isPending || deleteMutation.isPending}
        onSave={async (input) => {
          await upsertMutation.mutateAsync(input);
          editRef.current?.dismiss();
          setEditTarget(null);
        }}
        onDelete={async (id) => {
          await deleteMutation.mutateAsync(id);
          editRef.current?.dismiss();
          setEditTarget(null);
        }}
        onDismiss={() => setEditTarget(null)}
      />

      <AppBottomSheet ref={addPersonRef} title="Add person">
        <View style={formStyles.field}>
          <Text style={formStyles.label}>Name</Text>
          <SheetTextInput
            style={formStyles.input}
            value={newPerson}
            onChangeText={setNewPerson}
            placeholder="e.g. Sister of Bride"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <AppPressable
          onPress={() => {
            const name = newPerson.trim();
            if (!name) return;
            setPeople((prev) => (prev.includes(name) ? prev : [...prev, name]));
            setNewPerson("");
            addPersonRef.current?.dismiss();
          }}
          style={formStyles.primaryBtn}
        >
          <Text style={formStyles.primaryBtnText}>Add</Text>
        </AppPressable>
      </AppBottomSheet>
    </View>
  );
}

const OutfitEditSheet = forwardRef<
  BottomSheetModal,
  {
    target: EditTarget | null;
    saving: boolean;
    onSave: (input: Parameters<typeof upsertOutfitPlan>[1]) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onDismiss: () => void;
  }
>(function OutfitEditSheet({ target, saving, onSave, onDelete, onDismiss }, ref) {
  const innerRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => innerRef.current!);

  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [designer, setDesigner] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setDescription(target.existing?.outfitDescription ?? "");
    setColor(target.existing?.color ?? "");
    setDesigner(target.existing?.jewellerOrDesigner ?? "");
    setNotes(target.existing?.notes ?? "");
    setError(null);
  }, [target]);

  const handleSave = async () => {
    if (!target) return;
    setError(null);
    try {
      await onSave({
        timelineEventId: target.event.id,
        person: target.person,
        outfitDescription: description.trim() || undefined,
        color: color.trim() || undefined,
        jewellerOrDesigner: designer.trim() || undefined,
        notes: notes.trim() || undefined
});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  };

  return (
    <AppBottomSheet
      ref={innerRef}
      title={target ? `${target.person}` : "Outfit"}
      subtitle={target?.event.name}
      onDismiss={onDismiss}
    >
      <View style={formStyles.field}>
        <Text style={formStyles.label}>Outfit</Text>
        <SheetTextInput
          style={formStyles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Red lehenga"
          placeholderTextColor={colors.textMuted}
        />
      </View>
      <View style={formStyles.field}>
        <Text style={formStyles.label}>Color</Text>
        <View style={styles.colorGrid}>
          {OUTFIT_COLOR_PRESETS.map((c) => (
            <AppPressable
              key={c.hex}
              onPress={() => setColor(c.hex)}
              style={[
                styles.colorChip,
                { backgroundColor: c.hex },
                color === c.hex && styles.colorChipSelected,
              ]}
              accessibilityLabel={c.label}
            >
              <View />
            </AppPressable>
          ))}
        </View>
      </View>
      <View style={formStyles.field}>
        <Text style={formStyles.label}>Designer / jeweller</Text>
        <SheetTextInput
          style={formStyles.input}
          value={designer}
          onChangeText={setDesigner}
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
        />
      </View>
      <View style={formStyles.field}>
        <Text style={formStyles.label}>Notes</Text>
        <SheetTextInput
          style={formStyles.textarea}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
        />
      </View>
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
      <AppPressable
        onPress={() => void handleSave()}
        disabled={saving}
        style={[formStyles.primaryBtn, saving && formStyles.primaryBtnDisabled]}
      >
        {saving ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={formStyles.primaryBtnText}>Save</Text>
        )}
      </AppPressable>
      {target?.existing ? (
        <AppPressable
          onPress={() =>
            Alert.alert("Clear outfit?", undefined, [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => void onDelete(target.existing!.id)
},
            ])
          }
          style={formStyles.outlineBtn}
        >
          <Text style={[formStyles.outlineBtnText, { color: colors.destructive }]}>
            Clear outfit
          </Text>
        </AppPressable>
      ) : null}
    </AppBottomSheet>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.screen,
    paddingTop: 12
},
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border
},
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
},
  tabText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.mutedForeground },
  tabTextActive: { color: colors.primaryForeground },
  dayScroll: { marginBottom: 16 },
  dayChip: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border
},
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.mutedForeground },
  dayChipTextActive: { color: colors.primaryForeground },
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: 24
},
  clashRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
},
  swatch: { width: 36, height: 36, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  name: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.foreground },
  meta: { marginTop: 2, fontFamily: fonts.body, fontSize: 12, color: colors.mutedForeground },
  addPersonBtn: { marginBottom: 16 },
  addPersonText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },
  personBlock: { marginBottom: 20 },
  personTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.foreground,
    marginBottom: 8
},
  cell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
},
  cellSwatch: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  cellEmpty: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed"
},
  cellEvent: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.foreground },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  colorChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border
},
  colorChipSelected: {
    borderWidth: 3,
    borderColor: colors.primary
}
});
