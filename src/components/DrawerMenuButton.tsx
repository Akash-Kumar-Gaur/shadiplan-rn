import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Menu } from "lucide-react-native";
import { StyleSheet } from "react-native";
import { AppPressable } from "./AppPressable";
import { colors } from "../theme/tokens";

/** Hamburger that opens the parent drawer from any tab screen. Kept out of MainDrawer to avoid require cycles. */
export function DrawerMenuButton() {
  const navigation = useNavigation();

  return (
    <AppPressable
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      style={styles.menuBtn}
      accessibilityLabel="Open menu"
    >
      <Menu size={18} color={colors.foreground} />
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
});
