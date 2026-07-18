import { Plus } from "lucide-react-native";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "./AppPressable";
import { colors } from "../theme/tokens";

/** Approximate React Navigation bottom tab bar height (icon + label). */
const TAB_BAR_HEIGHT = 49;

export function Fab({
  onPress,
  label,
  aboveTabBar = true,
}: {
  onPress: () => void;
  label: string;
  /** When false (stack screens), sit above the home indicator only. */
  aboveTabBar?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const bottom = (aboveTabBar ? TAB_BAR_HEIGHT : 0) + insets.bottom + 12;

  return (
    <AppPressable
      onPress={onPress}
      style={[styles.fab, { bottom }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Plus color={colors.cream} size={24} />
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
