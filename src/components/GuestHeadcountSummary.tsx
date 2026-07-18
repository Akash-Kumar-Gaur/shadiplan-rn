import { StyleSheet, Text, View } from "react-native";
import type { GuestHeadcountSummary } from "../lib/guest-headcount";
import { colors, fonts, radius } from "../theme/tokens";

export function GuestHeadcountSummaryCard({ headcounts }: { headcounts: GuestHeadcountSummary }) {
  return (
    <View style={styles.card}>
      <Text style={styles.line}>
        <Text style={styles.strong}>{headcounts.invitedRecords} invited</Text>
        <Text style={styles.muted}> · </Text>
        <Text style={styles.strong}>{headcounts.maxHeadcount} total guests</Text>
      </Text>
      <Text style={[styles.line, styles.lineGap]}>
        <Text style={styles.success}>{headcounts.confirmedRecords} confirmed</Text>
        <Text style={styles.muted}> · </Text>
        <Text style={styles.success}>{headcounts.confirmedHeadcount} attending</Text>
      </Text>
      {headcounts.pendingRecords > 0 ? (
        <Text style={styles.pending}>{headcounts.pendingRecords} RSVP pending</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    backgroundColor: "rgba(237,228,214,0.5)",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  line: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: "center",
  },
  lineGap: {
    marginTop: 4,
  },
  strong: {
    fontFamily: fonts.bodyMedium,
    color: colors.foreground,
  },
  muted: {
    color: colors.mutedForeground,
  },
  success: {
    fontFamily: fonts.bodyMedium,
    color: "#2E7D50",
  },
  pending: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
