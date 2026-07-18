import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { AlertTriangle, ChevronRight, MapPin, Plus, Search, Shirt, Shuffle, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "../components/AppPressable";
import { DrawerMenuButton } from "../components/DrawerMenuButton";
import { Fab } from "../components/Fab";
import { ScreenEmpty } from "../components/ScreenEmpty";
import { ScreenLoader } from "../components/ScreenLoader";
import { SegmentedControl } from "../components/SegmentedControl";
import { AccordionSection, CompletedGroup } from "../components/checklist/AccordionSection";
import { TaskCheckbox } from "../components/checklist/TaskCheckbox";
import { GetSuggestionsSheet } from "../components/sheets/GetSuggestionsSheet";
import { PlanningTaskCreateSheet } from "../components/sheets/PlanningTaskCreateSheet";
import { TimelineCreateSheet } from "../components/sheets/TimelineCreateSheet";
import { TimelineEditSheet } from "../components/sheets/TimelineEditSheet";
import {
  useDeletePlanningTask,
  useSuggestMoreCommonlyMissed,
  useToggleTimelineDone,
} from "../hooks/use-checklist-mutations";
import { usePlanningTasks } from "../hooks/use-planning-tasks";
import { useTimelineEvents } from "../hooks/use-timeline-events";
import { useTogglePlanningDone } from "../hooks/use-toggle-planning-done";
import { useWeddingMeta } from "../hooks/use-wedding-meta";
import {
  dateTabLabel,
  formatLongDate,
  formatShortDate,
  groupEventsByDate,
  timelineDayDates,
} from "../lib/lead-time-dates";
import type { PlanningTask, TimelineEvent } from "../lib/wedding-api";
import { formatDisplayTime as formatTime } from "../lib/time-utils";
import { colors, fonts, radius, spacing } from "../theme/tokens";

type ChecklistView = "timeline" | "tasks" | "missed";

const VIEW_TABS: { id: ChecklistView; label: string }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "tasks", label: "Tasks" },
  { id: "missed", label: "Commonly missed" },
];

export function ChecklistScreen() {
  const insets = useSafeAreaInsets();
  const {
    data: wedding,
    isLoading: weddingLoading,
  } = useWeddingMeta();
  const weddingId = wedding?.id;

  const {
    data: tasks = [],
    isLoading: tasksLoading,
  } = usePlanningTasks(weddingId);
  const {
    data: timelineEvents = [],
    isLoading: eventsLoading,
  } = useTimelineEvents(weddingId);

  const togglePlanningDone = useTogglePlanningDone(weddingId);
  const toggleTimelineDone = useToggleTimelineDone(weddingId);
  const deleteTask = useDeletePlanningTask(weddingId);
  const suggestMore = useSuggestMoreCommonlyMissed(weddingId, wedding?.date);

  const [view, setView] = useState<ChecklistView>("timeline");
  const [selectedDate, setSelectedDate] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [missedNonce, setMissedNonce] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  const addEventRef = useRef<BottomSheetModal>(null);
  const editEventRef = useRef<BottomSheetModal>(null);
  const addTaskRef = useRef<BottomSheetModal>(null);
  const addMissedRef = useRef<BottomSheetModal>(null);
  const suggestionsRef = useRef<BottomSheetModal>(null);

  const planningTasks = useMemo(() => tasks.filter((t) => !t.commonlyMissed), [tasks]);
  const commonlyMissedTasks = useMemo(() => tasks.filter((t) => t.commonlyMissed), [tasks]);

  const weddingDays = useMemo(() => {
    if (!wedding?.startDate || !wedding?.endDate) return [];
    return timelineDayDates(wedding.startDate, wedding.endDate, timelineEvents);
  }, [wedding?.startDate, wedding?.endDate, timelineEvents]);

  const eventsByDate = useMemo(() => groupEventsByDate(timelineEvents), [timelineEvents]);

  useEffect(() => {
    if (!selectedDate && weddingDays.length) {
      setSelectedDate(weddingDays[0]);
    } else if (selectedDate && weddingDays.length && !weddingDays.includes(selectedDate)) {
      setSelectedDate(weddingDays[0]);
    }
  }, [weddingDays, selectedDate]);

  const dayEvents = useMemo(
    () => eventsByDate.get(selectedDate) ?? [],
    [eventsByDate, selectedDate],
  );

  const filteredTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    if (!q) return planningTasks;
    return planningTasks.filter(
      (t) => t.task.toLowerCase().includes(q) || t.category.toLowerCase().includes(q),
    );
  }, [planningTasks, taskSearch]);

  const tasksByCategory = useMemo(() => {
    const map = new Map<string, PlanningTask[]>();
    for (const task of filteredTasks) {
      const list = map.get(task.category) ?? [];
      list.push(task);
      map.set(task.category, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTasks]);

  const defaultOpenCategories = useMemo(
    () => tasksByCategory.slice(0, 2).map(([name]) => name),
    [tasksByCategory],
  );

  useEffect(() => {
    if (selectedEvent) editEventRef.current?.present();
  }, [selectedEvent]);

  useEffect(() => {
    if (!selectedEvent) return;
    const fresh = timelineEvents.find((e) => e.id === selectedEvent.id);
    if (fresh && fresh !== selectedEvent) setSelectedEvent(fresh);
  }, [timelineEvents, selectedEvent]);

  const openAddEvent = useCallback(() => addEventRef.current?.present(), []);
  const openAddTask = useCallback(() => addTaskRef.current?.present(), []);
  const openAddMissed = useCallback(() => addMissedRef.current?.present(), []);
  const openSuggestions = useCallback(() => suggestionsRef.current?.present(), []);
  const closeEditEvent = useCallback(() => setSelectedEvent(null), []);

  const loading = weddingLoading || tasksLoading || eventsLoading;

  const renderBody = () => {
    if (loading) {
      return <ScreenLoader />;
    }
    if (!wedding) {
      return (
        <ScreenEmpty description="Set up your wedding on the web app to see tasks here." />
      );
    }

    return (
      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingTop: 8 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {view === "timeline" ? (
          <TimelineView
            weddingDays={weddingDays}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            dayEvents={dayEvents}
            onToggleDone={(id, done) => toggleTimelineDone.mutate({ id, done })}
            onAddEvent={openAddEvent}
            onSelectEvent={setSelectedEvent}
          />
        ) : null}

        {view === "tasks" ? (
          <TasksView
            taskSearch={taskSearch}
            onSearchChange={setTaskSearch}
            tasksByCategory={tasksByCategory}
            defaultOpenCategories={defaultOpenCategories}
            onToggleDone={(id, done) => togglePlanningDone.mutate({ id, done })}
            onGetSuggestions={openSuggestions}
          />
        ) : null}

        {view === "missed" ? (
          <MissedView
            tasks={commonlyMissedTasks}
            suggestingMore={suggestMore.isPending}
            onToggleDone={(id, done) => togglePlanningDone.mutate({ id, done })}
            onRemove={(id) => deleteTask.mutate(id)}
            onSuggestMore={() => {
              const next = missedNonce + 1;
              setMissedNonce(next);
              suggestMore.mutate({ nonce: next, existingTasks: commonlyMissedTasks });
            }}
            onAddTask={openAddMissed}
          />
        ) : null}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>ShadiPlan</Text>
            <Text style={styles.heading}>Checklist</Text>
          </View>
          <DrawerMenuButton />
        </View>
        <View style={styles.segmentWrap}>
          <SegmentedControl options={VIEW_TABS} value={view} onChange={setView} />
        </View>
      </View>

      <View style={styles.body}>{renderBody()}</View>

      {view === "tasks" && wedding && !loading ? (
        <Fab onPress={openAddTask} label="Add task" />
      ) : null}

      <TimelineCreateSheet
        ref={addEventRef}
        weddingId={weddingId}
        wedding={wedding}
        defaultDate={selectedDate || wedding?.startDate || ""}
        onCreated={setSelectedDate}
      />
      <TimelineEditSheet
        ref={editEventRef}
        event={selectedEvent}
        weddingId={weddingId}
        onClose={closeEditEvent}
      />
      <PlanningTaskCreateSheet ref={addTaskRef} weddingId={weddingId} />
      <PlanningTaskCreateSheet
        ref={addMissedRef}
        weddingId={weddingId}
        commonlyMissed
        defaultDate={wedding?.startDate ?? ""}
      />
      <GetSuggestionsSheet
        ref={suggestionsRef}
        weddingId={weddingId}
        weddingDate={wedding?.date}
      />
    </View>
  );
}

function TimelineView({
  weddingDays,
  selectedDate,
  onSelectDate,
  dayEvents,
  onToggleDone,
  onAddEvent,
  onSelectEvent,
}: {
  weddingDays: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  dayEvents: TimelineEvent[];
  onToggleDone: (id: string, done: boolean) => void;
  onAddEvent: () => void;
  onSelectEvent: (event: TimelineEvent) => void;
}) {
  if (!weddingDays.length) {
    return (
      <View style={styles.dashedCard}>
        <Text style={styles.dashedTitle}>Set your wedding dates</Text>
        <Text style={styles.dashedBody}>
          Add a start and end date during setup to see your day-by-day timeline.
        </Text>
      </View>
    );
  }

  const selectedDayIndex = weddingDays.indexOf(selectedDate);
  const complete = dayEvents.filter((e) => e.done).length;
  const total = dayEvents.length;
  const pct = total > 0 ? Math.round((complete / total) * 100) : 0;

  return (
    <View style={styles.section}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayTabs}
      >
        {weddingDays.map((date, index) => {
          const active = date === selectedDate;
          return (
            <AppPressable
              key={date}
              onPress={() => onSelectDate(date)}
              style={[styles.dayTab, active && styles.dayTabActive]}
            >
              <Text style={[styles.dayTabText, active && styles.dayTabTextActive]}>
                {dateTabLabel(date, index)}
              </Text>
            </AppPressable>
          );
        })}
      </ScrollView>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryTitle}>
            {selectedDayIndex >= 0
              ? dateTabLabel(selectedDate, selectedDayIndex)
              : formatLongDate(selectedDate)}
          </Text>
          {total > 0 ? (
            <Text style={styles.summaryMeta}>
              {complete} of {total} done
            </Text>
          ) : null}
        </View>
        <Text style={styles.summarySub}>
          {total} {total === 1 ? "event" : "events"}
        </Text>
        {total > 0 ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        ) : null}
      </View>

      {dayEvents.length === 0 ? (
        <View style={styles.dashedCard}>
          <Text style={styles.dashedTitle}>
            Nothing planned for {formatLongDate(selectedDate)} yet
          </Text>
          <Text style={styles.dashedBody}>
            Add ceremonies and events for this day — nothing appears until you create it.
          </Text>
          <AppPressable onPress={onAddEvent} style={styles.addEventBtn}>
            <Text style={styles.addEventBtnText}>+ Add event</Text>
          </AppPressable>
        </View>
      ) : (
        <>
          {dayEvents.map((event) => (
            <TimelineEventRow
              key={event.id}
              event={event}
              onToggleDone={onToggleDone}
              onPress={() => onSelectEvent(event)}
            />
          ))}
          <AppPressable onPress={onAddEvent} style={styles.addEventDashed}>
            <Plus size={16} color={colors.primary} />
            <Text style={styles.addEventDashedText}>Add event</Text>
          </AppPressable>
        </>
      )}
    </View>
  );
}

function TimelineEventRow({
  event,
  onToggleDone,
  onPress,
}: {
  event: TimelineEvent;
  onToggleDone: (id: string, done: boolean) => void;
  onPress: () => void;
}) {
  return (
    <AppPressable
      onPress={onPress}
      style={[styles.eventCard, event.done && styles.eventCardDone]}
      accessibilityLabel={`Edit ${event.name}`}
    >
      <View style={styles.eventBody}>
        <Text style={styles.eventTime}>
          {formatTime(event.time)}
          {event.eventDate ? ` · ${formatShortDate(event.eventDate)}` : ""}
        </Text>
        <Text style={[styles.eventName, event.done && styles.eventNameDone]}>{event.name}</Text>
        <View style={styles.eventMeta}>
          <View style={styles.metaItem}>
            <MapPin size={12} color={colors.mutedForeground} />
            <Text style={styles.metaText}>{event.venue || "Add venue"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Shirt size={12} color={colors.mutedForeground} />
            <Text style={styles.metaText}>{event.dressCode || "—"}</Text>
          </View>
        </View>
      </View>
      <TaskCheckbox
        done={event.done}
        onToggle={() => onToggleDone(event.id, !event.done)}
      />
    </AppPressable>
  );
}

function TasksView({
  taskSearch,
  onSearchChange,
  tasksByCategory,
  defaultOpenCategories,
  onToggleDone,
  onGetSuggestions,
}: {
  taskSearch: string;
  onSearchChange: (q: string) => void;
  tasksByCategory: [string, PlanningTask[]][];
  defaultOpenCategories: string[];
  onToggleDone: (id: string, done: boolean) => void;
  onGetSuggestions: () => void;
}) {
  const isEmpty = tasksByCategory.length === 0;

  if (isEmpty && !taskSearch) {
    return (
      <View style={styles.dashedCard}>
        <Text style={styles.dashedTitle}>No planning tasks yet</Text>
        <Text style={styles.dashedBody}>
          Add tasks yourself or browse suggestions — nothing is added until you accept it.
        </Text>
        <AppPressable onPress={onGetSuggestions} style={styles.linkRow}>
          <Text style={styles.linkText}>Not sure what to add? Get suggestions</Text>
          <ChevronRight size={14} color={colors.mutedForeground} />
        </AppPressable>
      </View>
    );
  }

  if (isEmpty) {
    return <Text style={styles.emptyCenter}>No tasks match your search.</Text>;
  }

  return (
    <View style={styles.section}>
      <View style={styles.searchWrap}>
        <Search size={16} color={colors.mutedForeground} style={styles.searchIcon} />
        <TextInput
          value={taskSearch}
          onChangeText={onSearchChange}
          placeholder="Search tasks"
          placeholderTextColor={colors.mutedForeground}
          style={styles.searchInput}
        />
      </View>

      {tasksByCategory.map(([category, categoryTasks]) => {
        const pending = categoryTasks.filter((t) => !t.done);
        const completed = categoryTasks.filter((t) => t.done);
        return (
          <AccordionSection
            key={category}
            title={category}
            count={categoryTasks.length}
            defaultOpen={defaultOpenCategories.includes(category)}
          >
            {pending.map((task) => (
              <PlanningTaskRow key={task.id} task={task} onToggleDone={onToggleDone} />
            ))}
            {pending.length === 0 && completed.length > 0 ? (
              <Text style={styles.allDoneHint}>All tasks in this category are done.</Text>
            ) : null}
            <CompletedGroup count={completed.length}>
              {completed.map((task) => (
                <PlanningTaskRow key={task.id} task={task} onToggleDone={onToggleDone} />
              ))}
            </CompletedGroup>
          </AccordionSection>
        );
      })}

      <AppPressable onPress={onGetSuggestions} style={styles.linkRowCenter}>
        <Text style={styles.linkText}>Not sure what to add? Get suggestions</Text>
        <ChevronRight size={14} color={colors.mutedForeground} />
      </AppPressable>
    </View>
  );
}

function PlanningTaskRow({
  task,
  onToggleDone,
}: {
  task: PlanningTask;
  onToggleDone: (id: string, done: boolean) => void;
}) {
  return (
    <View style={styles.taskRow}>
      <TaskCheckbox done={task.done} onToggle={() => onToggleDone(task.id, !task.done)} />
      <View style={styles.taskBody}>
        <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]}>{task.task}</Text>
        {task.suggestedDate ? (
          <Text style={styles.taskMeta}>{formatShortDate(task.suggestedDate)}</Text>
        ) : null}
        {task.reason ? <Text style={styles.taskReason}>{task.reason}</Text> : null}
      </View>
    </View>
  );
}

function MissedView({
  tasks,
  suggestingMore,
  onToggleDone,
  onRemove,
  onSuggestMore,
  onAddTask,
}: {
  tasks: PlanningTask[];
  suggestingMore: boolean;
  onToggleDone: (id: string, done: boolean) => void;
  onRemove: (id: string) => void;
  onSuggestMore: () => void;
  onAddTask: () => void;
}) {
  const pending = tasks.filter((t) => !t.done);
  const completed = tasks.filter((t) => t.done);
  const total = tasks.length;

  if (total === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.dashedCard}>
          <Text style={styles.dashedTitle}>Nothing here right now</Text>
          <Text style={styles.dashedBody}>
            Suggest reminders from our pool or add your own — easy-to-forget items belong here.
          </Text>
        </View>
        <MissedActions
          suggestingMore={suggestingMore}
          onSuggestMore={onSuggestMore}
          onAddTask={onAddTask}
        />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.missedCard}>
        <View style={styles.missedHeader}>
          <AlertTriangle size={16} color={colors.flame} />
          <View style={{ flex: 1 }}>
            <Text style={styles.missedTitle}>Easy to miss</Text>
            <Text style={styles.missedSub}>
              {completed.length} of {total} handled — remove anything that doesn&apos;t apply
            </Text>
          </View>
        </View>

        {pending.map((task) => (
          <MissedTaskRow key={task.id} task={task} onToggleDone={onToggleDone} onRemove={onRemove} />
        ))}

        <CompletedGroup count={completed.length}>
          {completed.map((task) => (
            <MissedTaskRow key={task.id} task={task} onToggleDone={onToggleDone} onRemove={onRemove} />
          ))}
        </CompletedGroup>
      </View>

      <MissedActions
        suggestingMore={suggestingMore}
        onSuggestMore={onSuggestMore}
        onAddTask={onAddTask}
      />
    </View>
  );
}

function MissedTaskRow({
  task,
  onToggleDone,
  onRemove,
}: {
  task: PlanningTask;
  onToggleDone: (id: string, done: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const renderRight = () => (
    <AppPressable onPress={() => onRemove(task.id)} style={styles.swipeDelete}>
      <Trash2 size={18} color="#fff" />
    </AppPressable>
  );

  return (
    <Swipeable renderRightActions={renderRight} overshootRight={false}>
      <View style={styles.missedRow}>
        <TaskCheckbox done={task.done} onToggle={() => onToggleDone(task.id, !task.done)} />
        <View style={styles.taskBody}>
          <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]}>{task.task}</Text>
          <Text style={styles.taskMeta}>{task.leadTime}</Text>
          {task.suggestedDate ? (
            <Text style={styles.taskMeta}>{formatShortDate(task.suggestedDate)}</Text>
          ) : null}
        </View>
        <AppPressable
          onPress={() => onRemove(task.id)}
          style={styles.trashBtn}
          accessibilityLabel="Remove task"
        >
          <Trash2 size={16} color={colors.mutedForeground} />
        </AppPressable>
      </View>
    </Swipeable>
  );
}

function MissedActions({
  suggestingMore,
  onSuggestMore,
  onAddTask,
}: {
  suggestingMore: boolean;
  onSuggestMore: () => void;
  onAddTask: () => void;
}) {
  return (
    <View style={styles.missedActions}>
      <AppPressable
        onPress={onSuggestMore}
        disabled={suggestingMore}
        style={styles.outlineBtn}
      >
        <Shuffle size={16} color={colors.primary} />
        <Text style={styles.outlineBtnText}>
          {suggestingMore ? "Finding ideas…" : "Suggest more"}
        </Text>
      </AppPressable>
      <AppPressable onPress={onAddTask} style={styles.outlineBtn}>
        <Plus size={16} color={colors.primary} />
        <Text style={styles.outlineBtnText}>Add task</Text>
      </AppPressable>
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
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  body: {
    flex: 1,
  },
  bodyScroll: {
    flex: 1,
    paddingHorizontal: spacing.screen,
  },
  eyebrow: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  heading: {
    fontFamily: fonts.headingMedium,
    fontSize: 24,
    color: colors.foreground,
    marginBottom: 12,
  },
  segmentWrap: {
    marginBottom: 8,
  },
  section: {
    gap: 12,
  },
  loader: {
    marginTop: 32,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 8,
  },
  emptyCenter: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    paddingVertical: 32,
  },
  dashedCard: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  dashedTitle: {
    fontFamily: fonts.headingMedium,
    fontSize: 17,
    color: colors.foreground,
    textAlign: "center",
  },
  dashedBody: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 18,
  },
  addEventBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  addEventBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.cream,
  },
  dayTabs: {
    gap: 8,
    paddingBottom: 4,
  },
  dayTab: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  dayTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayTabText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  dayTabTextActive: {
    color: colors.cream,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
  },
  summaryTitle: {
    flex: 1,
    fontFamily: fonts.headingMedium,
    fontSize: 16,
    color: colors.foreground,
  },
  summaryMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  summarySub: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  progressTrack: {
    marginTop: 10,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(237, 228, 214, 0.6)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.terracotta,
    borderRadius: 3,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  eventCardDone: {
    opacity: 0.7,
  },
  eventBody: {
    flex: 1,
  },
  eventTime: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  eventName: {
    marginTop: 4,
    fontFamily: fonts.headingMedium,
    fontSize: 16,
    color: colors.foreground,
  },
  eventNameDone: {
    textDecorationLine: "line-through",
    color: colors.mutedForeground,
  },
  eventMeta: {
    marginTop: 8,
    gap: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  addEventDashed: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  addEventDashedText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primary,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(237, 228, 214, 0.5)",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.foreground,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  taskBody: {
    flex: 1,
  },
  taskTitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.foreground,
  },
  taskTitleDone: {
    color: colors.mutedForeground,
    textDecorationLine: "line-through",
  },
  taskMeta: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  taskReason: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  allDoneHint: {
    textAlign: "center",
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
    paddingVertical: 8,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 2,
  },
  linkRowCenter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    gap: 2,
  },
  linkText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  missedCard: {
    backgroundColor: "rgba(244, 196, 99, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(222, 142, 46, 0.35)",
    borderRadius: radius.lg,
    padding: 16,
    gap: 8,
  },
  missedHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  missedTitle: {
    fontFamily: fonts.headingMedium,
    fontSize: 16,
    color: colors.foreground,
  },
  missedSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  missedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: radius.md,
    padding: 12,
  },
  trashBtn: {
    padding: 4,
  },
  swipeDelete: {
    backgroundColor: colors.destructive,
    justifyContent: "center",
    alignItems: "center",
    width: 72,
    borderRadius: radius.md,
    marginLeft: 8,
  },
  missedActions: {
    gap: 8,
    marginTop: 4,
  },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  outlineBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primary,
  },
});
