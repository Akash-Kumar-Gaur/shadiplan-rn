import { ChevronDown } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppPressable } from "../AppPressable";
import { colors, fonts, radius } from "../../theme/tokens";

export function AccordionSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.card}>
      <AppPressable onPress={() => setOpen((v) => !v)} style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
        <ChevronDown
          size={16}
          color={colors.mutedForeground}
          style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
        />
      </AppPressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

export function CompletedGroup({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;

  return (
    <View style={styles.completedWrap}>
      <AppPressable onPress={() => setOpen((v) => !v)} style={styles.completedHeader}>
        <ChevronDown
          size={14}
          color={colors.mutedForeground}
          style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
        />
        <Text style={styles.completedLabel}>Completed ({count})</Text>
      </AppPressable>
      {open ? <View style={styles.completedBody}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    overflow: "hidden",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.foreground,
  },
  badge: {
    backgroundColor: "rgba(237, 228, 214, 0.6)",
    borderRadius: radius.xl,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  completedWrap: {
    marginTop: 4,
  },
  completedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(237, 228, 214, 0.4)",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  completedLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  completedBody: {
    marginTop: 8,
    gap: 8,
  },
});
