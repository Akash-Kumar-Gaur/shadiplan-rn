import { FileText, Image as ImageIcon } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import type { VendorCandidate } from "../types/wedding";
import { AmountText } from "./AmountText";
import { AppPressable } from "./AppPressable";
import { colors, fonts, radius } from "../theme/tokens";

export function VendorCandidateCard({
  candidate,
  onPress,
}: {
  candidate: VendorCandidate;
  onPress: () => void;
}) {
  const hasFiles = candidate.files.length > 0;
  const firstIsImage = hasFiles && /\.(png|jpe?g|gif|webp|heic)$/i.test(candidate.files[0]?.fileName ?? "");

  return (
    <AppPressable onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {candidate.name}
          </Text>
          <Text style={styles.contact} numberOfLines={1}>
            {candidate.contactName || candidate.phone || "No contact"}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            candidate.status === "promoted" && styles.badgePromoted,
            candidate.status === "rejected" && styles.badgeRejected,
          ]}
        >
          <Text style={styles.badgeText}>{candidate.status}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        {candidate.proposedAmount != null ? (
          <AmountText value={candidate.proposedAmount} style={styles.amount} />
        ) : (
          <Text style={styles.amountMuted}>No quote yet</Text>
        )}
        {hasFiles ? (
          <View style={styles.fileHint}>
            {firstIsImage ? (
              <ImageIcon size={14} color={colors.mutedForeground} />
            ) : (
              <FileText size={14} color={colors.mutedForeground} />
            )}
            <Text style={styles.fileCount}>{candidate.files.length}</Text>
          </View>
        ) : null}
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
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.secondary,
  },
  badgePromoted: {
    backgroundColor: "rgba(77, 139, 106, 0.2)",
  },
  badgeRejected: {
    backgroundColor: "rgba(196, 74, 58, 0.15)",
  },
  badgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.foreground,
    textTransform: "capitalize",
  },
  footer: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amount: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.foreground,
  },
  amountMuted: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  fileHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fileCount: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
