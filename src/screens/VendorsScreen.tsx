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
import type { Vendor, VendorCategory } from "../types/wedding";
import { useBudgetCategories, useVendors } from "../hooks/use-vendor-guest-queries";
import { useWeddingMeta } from "../hooks/use-wedding-meta";
import { syncVendorReminders } from "../lib/vendor-reminders";
import { Fab } from "../components/Fab";
import { FilterChip } from "../components/FilterChip";
import { DrawerMenuButton } from "../components/DrawerMenuButton";
import { ScreenEmpty } from "../components/ScreenEmpty";
import { ScreenLoader } from "../components/ScreenLoader";
import { VendorCard } from "../components/VendorCard";
import { VendorCreateSheet } from "../components/sheets/VendorCreateSheet";
import { VendorDetailSheet } from "../components/sheets/VendorDetailSheet";
import { colors, fonts, spacing } from "../theme/tokens";

type Filter = "all" | "due" | "confirmed";

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
  const { data: budgetCategories = [] } = useBudgetCategories(weddingId);

  const [filter, setFilter] = useState<Filter>("all");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const createRef = useRef<BottomSheetModal>(null);
  const detailRef = useRef<BottomSheetModal>(null);

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

  useEffect(() => {
    if (selectedVendor) detailRef.current?.present();
  }, [selectedVendor]);

  useEffect(() => {
    if (!selectedVendor) return;
    const fresh = vendors.find((v) => v.id === selectedVendor.id);
    if (fresh && fresh !== selectedVendor) setSelectedVendor(fresh);
  }, [vendors, selectedVendor]);

  const openCreate = useCallback(() => createRef.current?.present(), []);
  const closeDetail = useCallback(() => setSelectedVendor(null), []);

  const loading = weddingLoading || vendorsLoading;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>ShadiPlan</Text>
            <Text style={styles.title}>Vendors</Text>
          </View>
          <DrawerMenuButton />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <FilterChip active={filter === "all"} onPress={() => setFilter("all")}>
            All
          </FilterChip>
          <FilterChip active={filter === "due"} onPress={() => setFilter("due")}>
            Payment due
          </FilterChip>
          <FilterChip active={filter === "confirmed"} onPress={() => setFilter("confirmed")}>
            Confirmed
          </FilterChip>
        </ScrollView>
      </View>

      <View style={styles.body}>
        {loading ? (
          <ScreenLoader />
        ) : !wedding ? (
          <ScreenEmpty description="Set up your wedding on the web app to manage vendors here." />
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
                title="No vendors yet"
                description="Add your first vendor with the + button."
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
        )}
      </View>

      {wedding && !loading ? <Fab onPress={openCreate} label="Add vendor" /> : null}

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
  chips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    paddingRight: spacing.screen,
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: fonts.headingMedium,
    fontSize: 18,
    color: colors.foreground,
  },
  sectionCount: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
