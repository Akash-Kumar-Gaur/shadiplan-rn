import { StyleSheet, Text, View } from "react-native";
import { AppPressable } from "../AppPressable";
import { colors, fonts, radius } from "../../theme/tokens";

export function TaskCheckbox({
  done,
  onToggle,
}: {
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <AppPressable
      onPress={onToggle}
      style={[styles.checkbox, done && styles.checkboxDone]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
    >
      {done ? <Text style={styles.checkmark}>✓</Text> : null}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxDone: {
    backgroundColor: colors.terracottaDark,
    borderColor: colors.terracottaDark,
  },
  checkmark: {
    color: colors.primaryForeground,
    fontSize: 13,
    fontWeight: "600",
  },
});
