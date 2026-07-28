import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "../../components/AppPressable";
import { AppTextInput } from "../../components/AppTextInput";
import { formStyles } from "../../components/AppBottomSheet";
import type { OnboardingStackParamList } from "../../navigation/types";
import { colors, fonts, radius, spacing } from "../../theme/tokens";

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDisplay(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${iso}T12:00:00`));
  } catch {
    return iso;
  }
}

export function OnboardingBasicsScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<OnboardingStackParamList, "Basics">>();

  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return toIsoDate(d);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    d.setDate(d.getDate() + 2);
    return toIsoDate(d);
  });
  const [budget, setBudget] = useState("");
  const [picking, setPicking] = useState<"start" | "end" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    const coupleNames = [brideName.trim(), groomName.trim()].filter(Boolean).join(" & ");
    if (!coupleNames) {
      setError("Enter at least one name");
      return;
    }
    if (endDate < startDate) {
      setError("End date must be on or after the start date");
      return;
    }
    const parsedBudget = budget.trim() ? Number(budget.replace(/,/g, "")) : null;
    if (budget.trim() && (!parsedBudget || parsedBudget < 0)) {
      setError("Enter a valid budget amount, or leave it blank");
      return;
    }

    setError(null);
    navigation.navigate("Path", {
      basics: {
        coupleNames,
        location: location.trim(),
        startDate,
        date: startDate,
        endDate,
        totalBudget: parsedBudget,
      },
    });
  };

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        enableOnAndroid
        enableAutomaticScroll
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        extraScrollHeight={24}
        extraHeight={40}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 48 },
        ]}
      >
        <Text style={styles.kicker}>Welcome</Text>
        <Text style={styles.title}>Tell us about your wedding</Text>
        <Text style={styles.subtitle}>
          A few basics so we can set up your plan. You can change these anytime.
        </Text>

        <AppTextInput
          label="Bride / partner 1"
          native
          value={brideName}
          onChangeText={setBrideName}
          placeholder="Name"
          autoCapitalize="words"
        />
        <AppTextInput
          label="Groom / partner 2"
          native
          value={groomName}
          onChangeText={setGroomName}
          placeholder="Name"
          autoCapitalize="words"
        />
        <AppTextInput
          label="Location"
          native
          value={location}
          onChangeText={setLocation}
          placeholder="City or venue city"
          autoCapitalize="words"
        />

        <View style={formStyles.row2}>
          <View style={[formStyles.field, formStyles.row2col]}>
            <Text style={formStyles.label}>Start date *</Text>
            <AppPressable style={formStyles.input} onPress={() => setPicking("start")}>
              <Text style={styles.dateText}>{formatDisplay(startDate)}</Text>
            </AppPressable>
          </View>
          <View style={[formStyles.field, formStyles.row2col]}>
            <Text style={formStyles.label}>End date *</Text>
            <AppPressable style={formStyles.input} onPress={() => setPicking("end")}>
              <Text style={styles.dateText}>{formatDisplay(endDate)}</Text>
            </AppPressable>
          </View>
        </View>

        {picking ? (
          <DateTimePicker
            value={new Date(`${(picking === "start" ? startDate : endDate)}T12:00:00`)}
            mode="date"
            onChange={(_, date) => {
              if (Platform.OS !== "ios") setPicking(null);
              if (!date) return;
              const iso = toIsoDate(date);
              if (picking === "start") {
                setStartDate(iso);
                if (endDate < iso) setEndDate(iso);
              } else {
                setEndDate(iso);
              }
            }}
          />
        ) : null}
        {Platform.OS === "ios" && picking ? (
          <AppPressable onPress={() => setPicking(null)} style={styles.doneDate}>
            <Text style={styles.doneDateText}>Done</Text>
          </AppPressable>
        ) : null}

        <AppTextInput
          label="Total budget (₹) — optional"
          native
          value={budget}
          onChangeText={setBudget}
          keyboardType="numeric"
          placeholder="e.g. 1500000"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppPressable onPress={handleContinue} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Continue</Text>
        </AppPressable>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ivory },
  scroll: { paddingHorizontal: spacing.screen, flexGrow: 1 },
  kicker: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.headingMedium,
    fontSize: 28,
    color: colors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.mutedForeground,
    marginBottom: 28,
    lineHeight: 22,
  },
  dateText: { fontFamily: fonts.body, fontSize: 15, color: colors.charcoal },
  doneDate: { alignSelf: "flex-end", marginBottom: 12, padding: 8 },
  doneDateText: { fontFamily: fonts.bodyMedium, color: colors.primary },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.destructive,
    textAlign: "center",
    marginBottom: 8,
  },
  primaryBtn: {
    marginTop: 8,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.terracottaDark,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.primaryForeground,
  },
});
