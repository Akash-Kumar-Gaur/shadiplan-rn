import { BedDouble, Car, Drumstick, Leaf, MailPlus, Sprout } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import type { Guest, MealPref } from "../types/wedding";
import { AppPressable } from "./AppPressable";
import { StatusBadge } from "./StatusBadge";
import { colors, fonts, radius } from "../theme/tokens";

function MealMeta({ meal }: { meal: MealPref }) {
  const config =
    meal === "Non-veg"
      ? { Icon: Drumstick, label: "Non-veg" }
      : meal === "Jain"
        ? { Icon: Sprout, label: "Jain" }
        : { Icon: Leaf, label: "Veg" };
  const { Icon, label } = config;

  return (
    <View style={styles.metaItem}>
      <Icon size={12} color={colors.mutedForeground} />
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

export function GuestRow({
  guest,
  onPress,
  onInvite,
}: {
  guest: Guest;
  onPress: () => void;
  onInvite?: () => void;
}) {
  const initials = guest.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <View style={styles.row}>
      <AppPressable onPress={onPress} style={styles.mainPress}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {guest.name}
            </Text>
            {guest.accompanyingCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>+{guest.accompanyingCount}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.metaRow}>
            <MealMeta meal={guest.meal} />
            {guest.accommodation ? (
              <View style={styles.metaItem}>
                <BedDouble size={12} color={colors.mutedForeground} />
                <Text style={styles.metaText}>Room</Text>
              </View>
            ) : null}
            {guest.transportNeeded ? (
              <View style={styles.metaItem}>
                <Car size={12} color={colors.mutedForeground} />
                <Text style={styles.metaText}>Transport</Text>
              </View>
            ) : null}
          </View>
        </View>
      </AppPressable>
      <View style={styles.rightCol}>
        <StatusBadge
          status={
            guest.rsvp === "Confirmed" ? "done" : guest.rsvp === "Declined" ? "declined" : "pending"
          }
        />
        {onInvite ? (
          <AppPressable
            onPress={onInvite}
            style={styles.inviteBtn}
            accessibilityLabel={`Create invite for ${guest.name}`}
          >
            <MailPlus size={16} color={colors.mutedForeground} />
          </AppPressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mainPress: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.foreground,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    flexShrink: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.foreground,
  },
  badge: {
    backgroundColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.mutedForeground,
  },
  metaRow: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
  rightCol: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
  },
  inviteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
