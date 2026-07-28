import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MailPlus, Search } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Guest, RsvpStatus } from "../types/wedding";
import { computeGuestHeadcounts } from "../lib/guest-headcount";
import { useGuestGroups, useGuests } from "../hooks/use-vendor-guest-queries";
import { useWeddingMeta } from "../hooks/use-wedding-meta";
import { AppPressable } from "../components/AppPressable";
import { AnimatedScreenTitle } from "../components/AnimatedScreenTitle";
import { Fab } from "../components/Fab";
import { FilterChip } from "../components/FilterChip";
import { GuestHeadcountSummaryCard } from "../components/GuestHeadcountSummary";
import { GuestRow } from "../components/GuestRow";
import { GuestCreateSheet } from "../components/sheets/GuestCreateSheet";
import { GuestEditSheet } from "../components/sheets/GuestEditSheet";
import { DrawerMenuButton } from "../components/DrawerMenuButton";
import { ScreenEmpty } from "../components/ScreenEmpty";
import { ScreenLoader } from "../components/ScreenLoader";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts, radius, spacing } from "../theme/tokens";

type Filter = "all" | RsvpStatus;

export function GuestsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    data: wedding,
    isLoading: weddingLoading,
  } = useWeddingMeta();
  const weddingId = wedding?.id;
  const {
    data: guests = [],
    isLoading: guestsLoading,
  } = useGuests(weddingId);
  const {
    data: guestGroups = [],
    isLoading: groupsLoading,
  } = useGuestGroups(weddingId);

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  const createRef = useRef<BottomSheetModal>(null);
  const editRef = useRef<BottomSheetModal>(null);

  const headcounts = useMemo(() => computeGuestHeadcounts(guests), [guests]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return guests.filter((g) => {
      if (filter !== "all" && g.rsvp !== filter) return false;
      if (q && !g.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [filter, query, guests]);

  const grouped = useMemo(() => {
    return guestGroups
      .map((group) => ({ group, members: filtered.filter((g) => g.groupId === group.id) }))
      .filter((x) => x.members.length > 0);
  }, [filtered, guestGroups]);

  useEffect(() => {
    if (selectedGuest) editRef.current?.present();
  }, [selectedGuest]);

  const openCreate = useCallback(() => createRef.current?.present(), []);
  const closeEdit = useCallback(() => setSelectedGuest(null), []);

  const loading = weddingLoading || guestsLoading || groupsLoading;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenLoader />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>ShadiPlan</Text>
            <AnimatedScreenTitle style={styles.title}>Guests</AnimatedScreenTitle>
          </View>
          <DrawerMenuButton />
        </View>
        <GuestHeadcountSummaryCard headcounts={headcounts} />

        <View style={styles.searchWrap}>
          <Search size={16} color={colors.mutedForeground} style={styles.searchIcon} />
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Search guests"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <FilterChip active={filter === "all"} onPress={() => setFilter("all")}>
            All
          </FilterChip>
          <FilterChip active={filter === "Pending"} onPress={() => setFilter("Pending")}>
            RSVP pending
          </FilterChip>
          <FilterChip active={filter === "Confirmed"} onPress={() => setFilter("Confirmed")}>
            Confirmed
          </FilterChip>
          <FilterChip active={filter === "Declined"} onPress={() => setFilter("Declined")}>
            Declined
          </FilterChip>
        </ScrollView>
      </View>

      <View style={styles.body}>
        {!wedding ? (
          <ScreenEmpty description="Finish setting up your wedding to manage guests here." />
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 120, flexGrow: 1 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {grouped.length === 0 ? (
              <ScreenEmpty
                title={guests.length === 0 ? "No guests yet" : "No guests match your search or filter"}
                description={
                  guests.length === 0
                    ? "Add your first guest with the + button."
                    : "Try a different search or filter."
                }
              />
            ) : (
              grouped.map(({ group, members }) => (
                <View key={group.id} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionHeaderLeft}>
                      <Text style={styles.sectionTitle}>{group.name}</Text>
                      <Text style={styles.sectionSide}>{group.side} side</Text>
                    </View>
                    <AppPressable
                      onPress={() => navigation.navigate("Invite", { groupId: group.id })}
                      style={styles.groupInviteBtn}
                      accessibilityLabel={`Create invite for ${group.name}`}
                    >
                      <MailPlus size={14} color={colors.primary} />
                      <Text style={styles.groupInviteText}>Group invite</Text>
                    </AppPressable>
                  </View>
                  <View style={styles.card}>
                    {members.map((g, i) => (
                      <View key={g.id}>
                        <GuestRow
                          guest={g}
                          onPress={() => setSelectedGuest(g)}
                          onInvite={() => navigation.navigate("Invite", { guestId: g.id })}
                        />
                        {i < members.length - 1 ? <View style={styles.divider} /> : null}
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {wedding ? <Fab onPress={openCreate} label="Add guest" /> : null}

      <GuestCreateSheet ref={createRef} weddingId={weddingId} guestGroups={guestGroups} />
      <GuestEditSheet
        ref={editRef}
        guest={selectedGuest}
        guestGroups={guestGroups}
        weddingId={weddingId}
        onClose={closeEdit}
        onInvite={(id) => navigation.navigate("Invite", { guestId: id })}
      />
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.screen,
  },
  eyebrow: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  title: {
    fontFamily: fonts.headingMedium,
    fontSize: 24,
    color: colors.foreground,
    marginTop: 4,
  },
  searchWrap: {
    marginTop: 12,
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: 12,
    zIndex: 1,
  },
  search: {
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(237,228,214,0.5)",
    paddingLeft: 36,
    paddingRight: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.foreground,
  },
  chips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    paddingRight: spacing.screen,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  sectionHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontFamily: fonts.headingMedium,
    fontSize: 18,
    color: colors.foreground,
  },
  sectionSide: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },
  groupInviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  groupInviteText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 64,
  },
});
