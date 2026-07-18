import { StyleSheet, Text, View } from "react-native";
import { AppPressable } from "./AppPressable";
import { SheetPicker } from "./SheetPicker";
import {
  HOURS_12,
  parseTime12Parts,
  toTime24,
  type TimePeriod,
} from "../lib/time-utils";
import { colors, fonts, radius } from "../theme/tokens";

type TimePickerProps = {
  value: string;
  onChange: (time24: string) => void;
  allowEmpty?: boolean;
  defaultTime?: string;
};

export function TimePicker({
  value,
  onChange,
  allowEmpty = false,
  defaultTime = "19:00",
}: TimePickerProps) {
  const displayValue = value || (allowEmpty ? "" : defaultTime);
  const { hour12, minute, period } = parseTime12Parts(displayValue || defaultTime, defaultTime);

  const emit = (nextHour12: number, nextMinute: string, nextPeriod: TimePeriod) => {
    onChange(toTime24(nextHour12, nextMinute, nextPeriod));
  };

  return (
    <View style={styles.row}>
      <View style={styles.hourWrap}>
        <SheetPicker
          selectedValue={String(hour12)}
          onValueChange={(v) => emit(Number(v), minute, period)}
          items={HOURS_12.map((h) => ({ label: String(h), value: String(h) }))}
        />
      </View>

      <View style={styles.minuteWrap}>
        <SheetPicker
          selectedValue={minute}
          onValueChange={(v) => emit(hour12, v, period)}
          items={[
            { label: ":00", value: "00" },
            { label: ":30", value: "30" },
          ]}
        />
      </View>

      <View style={styles.periodWrap}>
        {(["AM", "PM"] as const).map((p) => (
          <AppPressable
            key={p}
            onPress={() => emit(hour12, minute, p)}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: period === p }}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
          </AppPressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hourWrap: {
    flex: 1,
  },
  minuteWrap: {
    width: 88,
  },
  periodWrap: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  periodBtnActive: {
    backgroundColor: colors.primary,
  },
  periodText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  periodTextActive: {
    color: colors.cream,
  },
});
