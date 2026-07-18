import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import { AppPressable } from "./AppPressable";
import { colors, fonts } from "../theme/tokens";

export function FilterChip({
  active,
  onPress,
  children,
}: {
  active: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <AppPressable
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
    >
      <Text style={[styles.text, active ? styles.textActive : styles.textInactive]}>{children}</Text>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipInactive: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  text: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  textActive: {
    color: colors.cream,
  },
  textInactive: {
    color: colors.mutedForeground,
  },
});
