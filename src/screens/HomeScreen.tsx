import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  AlertCircle,
  Building2,
  Bus,
  CalendarClock,
  Camera,
  ChevronRight,
  MapPin,
  Music,
  Plus,
  Shirt,
  Sparkles,
  Store,
  Utensils,
  Users,
} from "lucide-react-native";
import { useCallback, useMemo, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "../components/AppPressable";
import { AnimatedScreenTitle } from "../components/AnimatedScreenTitle";
import { DrawerMenuButton } from "../components/DrawerMenuButton";
import { HeroBackdrop } from "../components/HeroBackdrop";
import { ScreenEmpty } from "../components/ScreenEmpty";
import { ScreenLoader } from "../components/ScreenLoader";
import { SetBudgetSheet } from "../components/sheets/SetBudgetSheet";
import { TimelineCreateSheet } from "../components/sheets/TimelineCreateSheet";
import { StatusBadge } from "../components/StatusBadge";
import { useGuests, useVendors } from "../hooks/use-vendor-guest-queries";
import { useWalletData } from "../hooks/use-wallet-queries";
import { useTimelineEvents } from "../hooks/use-timeline-events";
import { useWeddingMeta } from "../hooks/use-wedding-meta";
import { computeGuestHeadcounts } from "../lib/guest-headcount";
import { formatDate } from "../lib/format";
import { AmountText } from "../components/AmountText";
import { formatShortDate } from "../lib/lead-time-dates";
import { daysUntil, daysUntilWedding, isWeddingPast } from "../lib/wedding-dates";
import type { TimelineEvent } from "../lib/wedding-api";
import type { Vendor, VendorCategory } from "../types/wedding";
import { formatDisplayTime, parseTimeToMinutes } from "../lib/time-utils";
import { colors, fonts, radius, spacing } from "../theme/tokens";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";

const CATEGORY_ICON: Record<VendorCategory, typeof Store> = {
  Venue: Building2,
  Catering: Utensils,
  Photography: Camera,
  Decor: Sparkles,
  Music: Music,
  Transport: Bus,
  Attire: Shirt,
  Other: Store,
};

function sortTimelineEvents<T extends { eventDate: string; time: string }>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    const byDate = a.eventDate.localeCompare(b.eventDate);
    if (byDate !== 0) return byDate;
    return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
  });
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const openRootScreen = useCallback(
    (screen: keyof RootStackParamList) => {
      // Tab → Drawer → Stack
      const stack = navigation.getParent()?.getParent();
      stack?.navigate(screen as never);
    },
    [navigation],
  );

  const {
    data: wedding,
    isLoading: weddingLoading,
  } = useWeddingMeta();
  const weddingId = wedding?.id;

  const {
    data: vendors = [],
    isLoading: vendorsLoading,
  } = useVendors(weddingId);
  const {
    data: guests = [],
    isLoading: guestsLoading,
  } = useGuests(weddingId);
  const {
    budgetCategories,
    isLoading: walletLoading,
  } = useWalletData(weddingId);
  const {
    data: timelineEvents = [],
    isLoading: eventsLoading,
  } = useTimelineEvents(weddingId);

  const budgetSheetRef = useRef<BottomSheetModal>(null);
  const addEventRef = useRef<BottomSheetModal>(null);

  const today = new Date().toISOString().slice(0, 10);

  const upcomingEvents = useMemo(() => {
    const sorted = sortTimelineEvents(timelineEvents);
    const incomplete = sorted.filter((e) => !e.done);
    const upcoming = incomplete.filter((e) => e.eventDate >= today);
    if (upcoming.length > 0) return upcoming.slice(0, 2);
    if (incomplete.length > 0) return incomplete.slice(0, 2);
    return sorted.slice(0, 2);
  }, [timelineEvents, today]);

  const guestHeadcounts = useMemo(() => computeGuestHeadcounts(guests), [guests]);

  const upcomingVendors = useMemo(
    () =>
      vendors
        .filter((v) => v.status !== "Paid")
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 2),
    [vendors],
  );

  const openBudgetSheet = useCallback(() => budgetSheetRef.current?.present(), []);
  const openAddEvent = useCallback(() => addEventRef.current?.present(), []);

  const loading = weddingLoading || vendorsLoading || guestsLoading || walletLoading || eventsLoading;

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
        <ScreenEmpty description="Finish setting up your wedding to see your dashboard." />
      </View>
    );
  }

  const days = daysUntilWedding(wedding.date);
  const weddingPast = isWeddingPast(wedding.date);
  const paymentsDue = vendors.filter((v) => v.status !== "Paid" && v.totalCost > v.advancePaid).length;
  const totalSpent = budgetCategories.reduce((s, c) => s + c.actual, 0);
  const hasBudget = wedding.totalBudget != null && wedding.totalBudget > 0;
  const budgetPct = hasBudget
    ? Math.min(100, Math.round((totalSpent / wedding.totalBudget!) * 100))
    : 0;

  const showAddEventPrompt = timelineEvents.length === 0;
  const hasNextUpItems = upcomingVendors.length > 0 || upcomingEvents.length > 0;

  const dateRangeLabel =
    wedding.endDate && wedding.endDate !== wedding.startDate
      ? `${formatDate(wedding.startDate)} – ${formatDate(wedding.endDate)}`
      : formatDate(wedding.date);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingHorizontal: spacing.screen }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>{wedding.location || "Your wedding"}</Text>
              <AnimatedScreenTitle style={styles.coupleTitle}>
                {wedding.coupleNames}
              </AnimatedScreenTitle>
            </View>
            <DrawerMenuButton />
          </View>
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.mutedForeground} />
            <Text style={styles.locationText}>{wedding.location || "Your wedding"}</Text>
          </View>
        </View>

        <HeroBackdrop style={styles.countdownCard}>
          <View style={styles.countdownInner}>
            <View style={styles.countdownText}>
              {weddingPast ? (
                <>
                  <Text style={styles.countdownLabel}>The big day</Text>
                  <Text style={styles.countdownNumber}>Married</Text>
                  <Text style={styles.countdownSub}>Congratulations on your wedding</Text>
                </>
              ) : (
                <>
                  <Text style={styles.countdownLabel}>Counting down</Text>
                  <Text style={styles.countdownNumber}>{days}</Text>
                  <Text style={styles.countdownSub}>days until the big day</Text>
                </>
              )}
            </View>
            <View style={styles.countdownIcon}>
              <CalendarClock size={20} color={colors.primaryForeground} />
            </View>
          </View>
          <Text style={styles.countdownMeta}>
            {dateRangeLabel} · {wedding.location}
          </Text>
        </HeroBackdrop>

        <View style={styles.statRow}>
          <StatTile
            icon={Store}
            label="Vendors"
            value={String(vendors.length)}
            onPress={() => navigation.navigate("Vendors")}
          />
          <StatTile
            icon={Users}
            label="Guests"
            value={String(guestHeadcounts.maxHeadcount)}
            onPress={() => navigation.navigate("Guests")}
          />
          <StatTile
            icon={AlertCircle}
            label="Due soon"
            value={String(paymentsDue)}
            tone={paymentsDue > 0 ? "warning" : "neutral"}
            onPress={() => navigation.navigate("Vendors")}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Next up</Text>
            {!showAddEventPrompt ? (
              <AppPressable onPress={() => navigation.navigate("Checklist")}>
                <Text style={styles.sectionLink}>See all</Text>
              </AppPressable>
            ) : null}
          </View>

          {showAddEventPrompt ? (
            <View style={styles.dashedCard}>
              <Text style={styles.dashedTitle}>Nothing planned yet</Text>
              <Text style={styles.dashedBody}>Add your first event to get started.</Text>
              <AppPressable onPress={openAddEvent} style={styles.primarySmBtn}>
                <Plus size={16} color={colors.primaryForeground} />
                <Text style={styles.primarySmBtnText}>Add event</Text>
              </AppPressable>
            </View>
          ) : hasNextUpItems ? (
            <View style={styles.nextUpCard}>
              {upcomingVendors.map((v, i) => (
                <NextUpVendorRow
                  key={v.id}
                  vendor={v}
                  isLast={i === upcomingVendors.length - 1 && upcomingEvents.length === 0}
                  onPress={() => navigation.navigate("Vendors")}
                />
              ))}
              {upcomingEvents.map((e, i) => (
                <NextUpEventRow
                  key={e.id}
                  event={e}
                  isLast={i === upcomingEvents.length - 1}
                  onPress={() => navigation.navigate("Checklist")}
                />
              ))}
            </View>
          ) : null}
        </View>

        <AppPressable
          onPress={() => openRootScreen("PhotoAlbum")}
          style={styles.albumCard}
          accessibilityRole="button"
          accessibilityLabel="Open photo album"
        >
          <View style={styles.albumIconWrap}>
            <Camera size={20} color={colors.primary} />
          </View>
          <View style={styles.albumBody}>
            <Text style={styles.albumTitle}>Photo Album</Text>
            <Text style={styles.albumMeta}>Share & collect wedding photos</Text>
          </View>
          <ChevronRight size={18} color={colors.mutedForeground} />
        </AppPressable>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Budget</Text>
            {hasBudget ? (
              <AppPressable onPress={() => navigation.navigate("Wallet")}>
                <Text style={styles.sectionLink}>Details</Text>
              </AppPressable>
            ) : null}
          </View>

          {hasBudget ? (
            <View style={styles.budgetCard}>
              <View style={styles.budgetRow}>
                <AmountText value={totalSpent} style={styles.budgetSpent} />
                <Text style={styles.budgetTotal}>
                  of <AmountText value={wedding.totalBudget!} style={styles.budgetTotal} />
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${budgetPct}%` }]} />
              </View>
              <Text style={styles.budgetMeta}>{budgetPct}% of total budget committed</Text>
            </View>
          ) : (
            <View style={styles.dashedCard}>
              <Text style={styles.dashedBody}>Set your total budget to start tracking.</Text>
              <AppPressable onPress={openBudgetSheet} style={styles.outlineSmBtn}>
                <Text style={styles.outlineSmBtnText}>Set your budget</Text>
              </AppPressable>
            </View>
          )}
        </View>
      </ScrollView>

      <SetBudgetSheet
        ref={budgetSheetRef}
        weddingId={weddingId}
        currentBudget={wedding.totalBudget}
      />
      <TimelineCreateSheet
        ref={addEventRef}
        weddingId={weddingId}
        wedding={wedding}
        defaultDate={wedding.date}
      />
    </View>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone = "neutral",
  onPress,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  tone?: "neutral" | "warning";
  onPress: () => void;
}) {
  return (
    <AppPressable
      onPress={onPress}
      style={styles.statTile}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={styles.statTileTop}>
        <View
          style={[
            styles.statIconWrap,
            tone === "warning" && { backgroundColor: "rgba(201, 138, 46, 0.2)" },
          ]}
        >
          <Icon size={14} color={tone === "warning" ? colors.warning : colors.secondaryForeground} />
        </View>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </AppPressable>
  );
}

function NextUpVendorRow({
  vendor,
  isLast,
  onPress,
}: {
  vendor: Vendor;
  isLast: boolean;
  onPress: () => void;
}) {
  const Icon = CATEGORY_ICON[vendor.category] ?? Store;
  const balance = vendor.totalCost - vendor.advancePaid;
  const due = daysUntil(vendor.dueDate);

  return (
    <AppPressable onPress={onPress} style={[styles.nextUpRow, !isLast && styles.nextUpRowBorder]}>
      <View style={styles.nextUpIcon}>
        <Icon size={16} color={colors.secondaryForeground} />
      </View>
      <View style={styles.nextUpBody}>
        <Text style={styles.nextUpTitle} numberOfLines={1}>
          {vendor.name}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
          <Text style={styles.nextUpMeta}>Balance </Text>
          <AmountText value={balance} style={styles.nextUpMeta} />
          <Text style={styles.nextUpMeta}> · due in {due}d</Text>
        </View>
      </View>
      <StatusBadge status={vendor.status === "Confirmed" ? "done" : "pending"} />
    </AppPressable>
  );
}

function NextUpEventRow({
  event,
  isLast,
  onPress,
}: {
  event: TimelineEvent;
  isLast: boolean;
  onPress: () => void;
}) {
  return (
    <AppPressable onPress={onPress} style={[styles.nextUpRow, !isLast && styles.nextUpRowBorder]}>
      <View style={styles.nextUpIcon}>
        <CalendarClock size={16} color={colors.secondaryForeground} />
      </View>
      <View style={styles.nextUpBody}>
        <Text style={styles.nextUpTitle} numberOfLines={1}>
          {event.name}
        </Text>
        <Text style={styles.nextUpMeta} numberOfLines={1}>
          {formatShortDate(event.eventDate)} · {formatDisplayTime(event.time)} · {event.venue}
        </Text>
      </View>
      <ChevronRight size={16} color={colors.mutedForeground} />
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 16,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
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
  eyebrow: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  coupleTitle: {
    marginTop: 4,
    fontFamily: fonts.headingMedium,
    fontSize: 24,
    color: colors.foreground,
  },
  locationRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  countdownCard: {
    borderRadius: radius.lg,
    padding: 24,
    marginBottom: 16,
  },
  countdownInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  countdownText: {
    flex: 1,
  },
  countdownLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.primaryForeground,
    opacity: 0.75,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  countdownNumber: {
    marginTop: 12,
    fontFamily: fonts.headingMedium,
    fontSize: 48,
    lineHeight: 52,
    color: colors.primaryForeground,
  },
  countdownSub: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.primaryForeground,
    opacity: 0.9,
  },
  countdownIcon: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(251, 247, 240, 0.15)",
    padding: 10,
  },
  countdownMeta: {
    marginTop: 16,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.primaryForeground,
    opacity: 0.8,
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  statTileTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    flex: 1,
  },
  statValue: {
    marginTop: 8,
    fontFamily: fonts.headingMedium,
    fontSize: 24,
    lineHeight: 28,
    color: colors.foreground,
  },
  albumCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
  },
  albumIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  albumBody: {
    flex: 1,
    minWidth: 0,
  },
  albumTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.foreground,
  },
  albumMeta: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: fonts.headingMedium,
    fontSize: 18,
    color: colors.foreground,
  },
  sectionLink: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.primary,
  },
  dashedCard: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    padding: 20,
  },
  dashedTitle: {
    fontFamily: fonts.headingMedium,
    fontSize: 17,
    color: colors.foreground,
  },
  dashedBody: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  primarySmBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
  },
  primarySmBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primaryForeground,
  },
  outlineSmBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    backgroundColor: colors.card,
  },
  outlineSmBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primary,
  },
  nextUpCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  nextUpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  nextUpRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nextUpIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  nextUpBody: {
    flex: 1,
    minWidth: 0,
  },
  nextUpTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  nextUpMeta: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  budgetCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  budgetRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  budgetSpent: {
    fontFamily: fonts.headingMedium,
    fontSize: 24,
    color: colors.foreground,
  },
  budgetTotal: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  progressTrack: {
    marginTop: 12,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.terracotta,
    borderRadius: 4,
  },
  budgetMeta: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
