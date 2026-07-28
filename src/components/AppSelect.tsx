import { Check, ChevronDown } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius } from "../theme/tokens";
import { AppPressable } from "./AppPressable";

export type AppSelectOption<T extends string = string> = {
  label: string;
  value: T;
};

export type AppSelectProps<T extends string = string> = {
  label?: string;
  value: T;
  options: AppSelectOption<T>[];
  onSelect: (value: T) => void;
  placeholder?: string;
  /** Applied to the outer field wrapper (e.g. `{ flex: 1 }` in a row). */
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Controlled select that always renders the current selection in the trigger.
 * Avoids native Picker display bugs where the selected value can appear blank.
 */
export function AppSelect<T extends string>({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select…",
  containerStyle,
}: AppSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? placeholder,
    [options, value, placeholder],
  );
  const hasValue = options.some((o) => o.value === value);

  return (
    <View style={[styles.fieldWrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <AppPressable
        style={styles.trigger}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${selectedLabel}` : selectedLabel}
      >
        <Text
          style={[styles.triggerText, { color: hasValue ? colors.charcoal : colors.textMuted }]}
          numberOfLines={1}
        >
          {selectedLabel}
        </Text>
        <ChevronDown size={16} color={colors.textMuted} />
      </AppPressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handle} />
            {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}
            <ScrollView
              style={styles.optionsScroll}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              {options.map((opt) => {
                const selected = opt.value === value;
                return (
                  <AppPressable
                    key={opt.value}
                    style={[styles.optionRow, selected && styles.optionRowSelected]}
                    onPress={() => {
                      onSelect(opt.value);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {opt.label}
                    </Text>
                    {selected ? <Check size={18} color={colors.terracottaDark} /> : null}
                  </AppPressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrapper: {
    marginBottom: 16,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  trigger: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  triggerText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(60, 51, 44, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.ivory,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: 8,
    paddingHorizontal: 16,
    maxHeight: "70%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: fonts.headingMedium,
    fontSize: 18,
    color: colors.charcoal,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  optionsScroll: {
    maxHeight: 360,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    marginBottom: 2,
  },
  optionRowSelected: {
    backgroundColor: colors.secondary,
  },
  optionText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.charcoal,
  },
  optionTextSelected: {
    fontFamily: fonts.bodyMedium,
    color: colors.terracottaDark,
  },
});
