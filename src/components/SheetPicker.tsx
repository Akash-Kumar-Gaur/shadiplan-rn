import { Picker } from "@react-native-picker/picker";
import { Platform, StyleSheet, View } from "react-native";
import { colors, radius } from "../theme/tokens";

/**
 * Native picker for bottom sheets.
 * Do not set overflow:hidden on the wrap — it clips the iOS wheel / selection highlight.
 */
export function SheetPicker<T extends string>({
  selectedValue,
  onValueChange,
  items,
}: {
  selectedValue: T;
  onValueChange: (value: T) => void;
  items: { label: string; value: T }[];
}) {
  return (
    <View style={styles.wrap}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={(v) => onValueChange(v as T)}
        style={styles.picker}
        itemStyle={Platform.OS === "ios" ? styles.iosItem : undefined}
      >
        {items.map((item) => (
          <Picker.Item key={item.value} label={item.label} value={item.value} />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    // Intentionally no overflow:hidden — clips picker selection on iOS
    paddingVertical: Platform.OS === "ios" ? 4 : 0,
  },
  picker: {
    width: "100%",
    height: Platform.OS === "ios" ? 140 : 52,
  },
  iosItem: {
    fontSize: 16,
    height: 140,
  },
});
