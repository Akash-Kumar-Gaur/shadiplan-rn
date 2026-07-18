import { Minus, Plus } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { AppPressable } from "./AppPressable";
import { colors, fonts, radius } from "../theme/tokens";

const MAX = 10;

export function AccompanyingCountStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const clamped = Math.min(MAX, Math.max(0, value));

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Accompanying guests</Text>
      <Text style={styles.hint}>Spouse, kids, or plus-ones not listed separately.</Text>
      <View style={styles.row}>
        <Text style={styles.prompt}>Bringing anyone with them?</Text>
        <View style={styles.controls}>
          <AppPressable
            onPress={() => onChange(Math.max(0, clamped - 1))}
            disabled={clamped <= 0}
            style={[styles.btn, clamped <= 0 && styles.btnDisabled]}
          >
            <Minus size={14} color={colors.foreground} />
          </AppPressable>
          <Text style={styles.count}>{clamped}</Text>
          <AppPressable
            onPress={() => onChange(Math.min(MAX, clamped + 1))}
            disabled={clamped >= MAX}
            style={[styles.btn, clamped >= MAX && styles.btnDisabled]}
          >
            <Plus size={14} color={colors.foreground} />
          </AppPressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  row: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  prompt: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.foreground,
    marginRight: 8,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  count: {
    minWidth: 24,
    textAlign: "center",
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
  },
});
