import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "../theme/tokens";

type Status = "done" | "pending" | "neutral" | "declined";

const STYLES: Record<Status, { bg: string; text: string; border: string }> = {
  done: { bg: "rgba(46,125,80,0.15)", text: "#2E7D50", border: "rgba(46,125,80,0.35)" },
  pending: { bg: "rgba(222,142,46,0.18)", text: "#9A5E12", border: "rgba(222,142,46,0.4)" },
  neutral: { bg: colors.border, text: colors.mutedForeground, border: colors.border },
  declined: { bg: "rgba(196,74,58,0.12)", text: colors.destructive, border: "rgba(196,74,58,0.3)" },
};

const LABELS: Record<Status, string> = {
  done: "Confirmed",
  pending: "Pending",
  neutral: "—",
  declined: "Declined",
};

export function StatusBadge({ status }: { status: Status }) {
  const s = STYLES[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[styles.text, { color: s.text }]}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
});
