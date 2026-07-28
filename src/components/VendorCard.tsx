import { Phone } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import type { Vendor } from "../types/wedding";
import { shortDate } from "../lib/format";
import { AmountText } from "./AmountText";
import { AppPressable } from "./AppPressable";
import { StatusBadge } from "./StatusBadge";
import { colors, fonts, radius } from "../theme/tokens";

export function VendorCard({ vendor, onPress }: { vendor: Vendor; onPress: () => void }) {
  const balance = vendor.totalCost - vendor.advancePaid;

  return (
    <AppPressable onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {vendor.name}
          </Text>
          <Text style={styles.contact} numberOfLines={1}>
            {vendor.contactName || "No contact"}
          </Text>
        </View>
        <StatusBadge
          status={
            vendor.status === "Paid" ? "done" : vendor.status === "Confirmed" ? "done" : "pending"
          }
        />
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Advance paid</Text>
          <AmountText value={vendor.advancePaid} style={styles.statValue} />
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Balance due</Text>
          <AmountText
            value={balance}
            style={[styles.statValue, balance <= 0 && styles.statMuted]}
          />
        </View>
      </View>
      <View style={styles.footer}>
        <View style={styles.phoneRow}>
          <Phone size={12} color={colors.mutedForeground} />
          <Text style={styles.footerText}>{vendor.phone || "—"}</Text>
        </View>
        <Text style={styles.footerText}>
          {vendor.dueDate ? `Due ${shortDate(vendor.dueDate)}` : "No due date"}
        </Text>
      </View>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  contact: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  stats: {
    marginTop: 12,
    flexDirection: "row",
    gap: 12,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  statValue: {
    marginTop: 2,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.foreground,
  },
  statMuted: {
    color: colors.mutedForeground,
  },
  footer: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
