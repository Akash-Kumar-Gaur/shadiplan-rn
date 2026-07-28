import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  Building2,
  Bus,
  Camera,
  Music,
  Shirt,
  Sparkles,
  Store,
  Utensils,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Vendor, VendorCandidate, VendorCategory } from "../types/wedding";
import { useBudgetCategories, useVendors } from "../hooks/use-vendor-guest-queries";
import { useVendorCandidates } from "../hooks/use-vendor-candidates";
import { useWeddingMeta } from "../hooks/use-wedding-meta";
import { syncVendorReminders } from "../lib/vendor-reminders";
import { Fab } from "../components/Fab";
import { FilterChip } from "../components/FilterChip";
import { AnimatedScreenTitle } from "../components/AnimatedScreenTitle";
import { DrawerMenuButton } from "../components/DrawerMenuButton";
import { ScreenEmpty } from "../components/ScreenEmpty";
import { ScreenLoader } from "../components/ScreenLoader";
import { SegmentedControl } from "../components/SegmentedControl";
import { VendorCard } from "../components/VendorCard";
import { VendorCandidateCard } from "../components/VendorCandidateCard";
import { VendorCreateSheet } from "../components/sheets/VendorCreateSheet";
import { VendorDetailSheet } from "../components/sheets/VendorDetailSheet";
import { VendorPaymentSheet } from "../components/sheets/VendorPaymentSheet";
import { VendorCandidateCreateSheet } from "../components/sheets/VendorCandidateCreateSheet";
import { VendorCandidateDetailSheet } from "../components/sheets/VendorCandidateDetailSheet";
import { colors, fonts, spacing } from "../theme/tokens";

type Mode = "booked" | "shortlist";
type BookedFilter = "all" | "due" | "confirmed";
type ShortlistFilter = "considering" | "all" | "promoted" | "rejected";

const CATEGORY_ICON: Record<VendorCategory, typeof Camera> = {
  Venue: Building2,
  Catering: Utensils,
  Photography: Camera,
  Decor: Sparkles,
  Music: Music,
  Transport: Bus,
  Attire: Shirt,
  Other: Store,
};

export function VendorsScreen() {
  const insets = useSafeAreaInsets();
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
    data: candidates = [],
    isLoading: candidatesLoading,
  } = useVendorCandidates(weddingId);
  const { data: budgetCategories = [] } = useBudgetCategories(weddingId);

  const [mode, setMode] = useState<Mode>("booked");
  const [filter, setFilter] = useState<BookedFilter>("all");
  const [shortlistFilter, setShortlistFilter] = useState<ShortlistFilter>("considering");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<VendorCandidate | null>(null);

  const createRef = useRef<BottomSheetModal>(null);
  const detailRef = useRef<BottomSheetModal>(null);
  const paymentRef = useRef<BottomSheetModal>(null);
  const candidateCreateRef = useRef<BottomSheetModal>(null);
  const candidateDetailRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (vendorsLoading || vendors.length === 0) return;
    void syncVendorReminders(vendors);
  }, [vendors, vendorsLoading]);

  const filtered = useMemo(() => {
    if (filter === "due") return vendors.filter((v) => v.totalCost > v.advancePaid);
    if (filter === "confirmed") return vendors.filter((v) => v.status !== "Pending");
    return vendors;
  }, [filter, vendors]);

  const grouped = useMemo(() => {
    const map = new Map<VendorCategory, Vendor[]>();
    for (const v of filtered) {
      const list = map.get(v.category) ?? [];
      list.push(v);
      map.set(v.category, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const filteredCandidates = useMemo(() => {
    if (shortlistFilter === "all") return candidates;
    return candidates.filter((c) => c.status === shortlistFilter);
  }, [candidates, shortlistFilter]);

  const groupedCandidates = useMemo(() => {
    const map = new Map<VendorCategory, VendorCandidate[]>();
    for (const c of filteredCandidates) {
      const list = map.get(c.category) ?? [];
      list.push(c);
      map.set(c.category, list);
    }
    return Array.from(map.entries());
  }, [filteredCandidates]);

  useEffect(() => {
    if (selectedVendor) detailRef.current?.present();
  }, [selectedVendor]);

  useEffect(() => {
    if (!selectedVendor) return;
    const fresh = vendors.find((v) => v.id === selectedVendor.id);
    if (fresh && fresh !== selectedVendor) setSelectedVendor(fresh);
  }, [vendors, selectedVendor]);

  useEffect(() => {
    if (selectedCandidate) candidateDetailRef.current?.present();
  }, [selectedCandidate]);

  useEffect(() => {
    if (!selectedCandidate) return;
    const fresh = candidates.find((c) => c.id === selectedCandidate.id);
    if (fresh && fresh !== selectedCandidate) setSelectedCandidate(fresh);
  }, [candidates, selectedCandidate]);

  const openCreate = useCallback(() => {
    if (mode === "shortlist") candidateCreateRef.current?.present();
    else createRef.current?.present();
  }, [mode]);
  const closeDetail = useCallback(() => setSelectedVendor(null), []);
  const closeCandidateDetail = useCallback(() => setSelectedCandidate(null), []);
  const openAddPayment = useCallback(() => {
    requestAnimationFrame(() => paymentRef.current?.present());
  }, []);
  const closePayment = useCallback(() => {}, []);

  const loading = weddingLoading || vendorsLoading || (mode === "shortlist" && candidatesLoading);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>ShadiPlan</Text>
            <AnimatedScreenTitle style={styles.title}>Vendors</AnimatedScreenTitle>
          </View>
          <DrawerMenuButton />
        </View>

        <SegmentedControl
          options={[
            { id: "booked", label: "Booked" },
            { id: "shortlist", label: "Shortlist" },
          ]}
          value={mode}
          onChange={setMode}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {mode === "booked" ? (
            <>
              <FilterChip active={filter === "all"} onPress={() => setFilter("all")}>
                All
              </FilterChip>
              <FilterChip active={filter === "due"} onPress={() => setFilter("due")}>
                Payment due
              </FilterChip>
              <FilterChip active={filter === "confirmed"} onPress={() => setFilter("confirmed")}>
                Confirmed
              </FilterChip>
            </>
          ) : (
            <>
              <FilterChip
                active={shortlistFilter === "considering"}
                onPress={() => setShortlistFilter("considering")}
              >
                Considering
              </FilterChip>
              <FilterChip
                active={shortlistFilter === "all"}
                onPress={() => setShortlistFilter("all")}
              >
                All history
              </FilterChip>
              <FilterChip
                active={shortlistFilter === "promoted"}
                onPress={() => setShortlistFilter("promoted")}
              >
                Promoted
              </FilterChip>
              <FilterChip
                active={shortlistFilter === "rejected"}
                onPress={() => setShortlistFilter("rejected")}
              >
                Rejected
              </FilterChip>
            </>
          )}
        </ScrollView>
      </View>

      <View style={styles.body}>
        {loading ? (
          <ScreenLoader />
        ) : !wedding ? (
          <ScreenEmpty description="Finish setting up your wedding to manage vendors here." />
        ) : mode === "booked" ? (
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
                title="No vendors yet"
                description="Add your first vendor with the + button, or promote someone from Shortlist."
              />
            ) : (
              grouped.map(([category, list]) => {
                const Icon = CATEGORY_ICON[category] ?? Store;
                return (
                  <View key={category} style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Icon size={16} color={colors.primary} />
                      <Text style={styles.sectionTitle}>{category}</Text>
                      <Text style={styles.sectionCount}>· {list.length}</Text>
                    </View>
                    {list.map((v) => (
                      <VendorCard key={v.id} vendor={v} onPress={() => setSelectedVendor(v)} />
                    ))}
                  </View>
                );
              })
            )}
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 120, flexGrow: 1 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {groupedCandidates.length === 0 ? (
              <ScreenEmpty
                title="Shortlist is empty"
                description="Add candidates you're comparing — quotes, menus, and estimates stay here until you book one."
              />
            ) : (
              groupedCandidates.map(([category, list]) => {
                const Icon = CATEGORY_ICON[category] ?? Store;
                return (
                  <View key={category} style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Icon size={16} color={colors.primary} />
                      <Text style={styles.sectionTitle}>{category}</Text>
                      <Text style={styles.sectionCount}>· {list.length}</Text>
                    </View>
                    {list.map((c) => (
                      <VendorCandidateCard
                        key={c.id}
                        candidate={c}
                        onPress={() => setSelectedCandidate(c)}
                      />
                    ))}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </View>

      {wedding && !loading ? (
        <Fab
          onPress={openCreate}
          label={mode === "shortlist" ? "Add candidate" : "Add vendor"}
        />
      ) : null}

      <VendorCreateSheet
        ref={createRef}
        weddingId={weddingId}
        budgetCategories={budgetCategories}
      />
      <VendorDetailSheet
        ref={detailRef}
        vendor={selectedVendor}
        weddingId={weddingId}
        budgetCategories={budgetCategories}
        onClose={closeDetail}
        onAddPayment={openAddPayment}
      />
      <VendorPaymentSheet
        ref={paymentRef}
        vendor={selectedVendor}
        weddingId={weddingId}
        budgetCategories={budgetCategories}
        onClose={closePayment}
      />
      <VendorCandidateCreateSheet ref={candidateCreateRef} weddingId={weddingId} />
      <VendorCandidateDetailSheet
        ref={candidateDetailRef}
        candidate={selectedCandidate}
        weddingId={weddingId}
        onClose={closeCandidateDetail}
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
    gap: 12,
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
    letterSpacing: 2,
  },
  title: {
    marginTop: 4,
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.foreground,
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  body: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.screen,
    paddingTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.foreground,
  },
  sectionCount: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
