import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "../../components/AppPressable";
import { AppSelect } from "../../components/AppSelect";
import type {
  BudgetTier,
  DayTier,
  GuestTier,
  Tradition,
} from "../../data/suggestion-pool";
import type { PlanAnswers } from "../../lib/suggestion-engine";
import type { OnboardingStackParamList } from "../../navigation/types";
import { colors, fonts, radius, spacing } from "../../theme/tokens";

const TRADITIONS: Tradition[] = [
  "North Indian Hindu",
  "South Indian",
  "Punjabi",
  "Bengali",
  "Destination",
  "Custom",
];

export function OnboardingQuestionnaireScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<OnboardingStackParamList, "Questionnaire">>();
  const route = useRoute<RouteProp<OnboardingStackParamList, "Questionnaire">>();
  const { basics } = route.params;

  const [tradition, setTradition] = useState<Tradition>("North Indian Hindu");
  const [budgetTier, setBudgetTier] = useState<BudgetTier>("mid");
  const [guestTier, setGuestTier] = useState<GuestTier>("medium");
  const [dayTier, setDayTier] = useState<DayTier>("3-4");

  const handleContinue = () => {
    const answers: PlanAnswers = { tradition, budgetTier, guestTier, dayTier };
    navigation.navigate("Review", { basics, answers });
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.kicker}>Personalized plan</Text>
      <Text style={styles.title}>A few quick answers</Text>
      <Text style={styles.subtitle}>
        We&apos;ll suggest checklist items that fit your wedding. Nothing is added until you accept
        it on the next screen.
      </Text>

      <AppSelect
        label="Tradition / style"
        value={tradition}
        onSelect={setTradition}
        options={TRADITIONS.map((t) => ({ label: t, value: t }))}
      />
      <AppSelect
        label="Budget tier"
        value={budgetTier}
        onSelect={setBudgetTier}
        options={[
          { label: "Modest", value: "modest" },
          { label: "Mid-range", value: "mid" },
          { label: "Premium", value: "premium" },
        ]}
      />
      <AppSelect
        label="Guest count"
        value={guestTier}
        onSelect={setGuestTier}
        options={[
          { label: "Intimate (under 100)", value: "intimate" },
          { label: "Medium (100–300)", value: "medium" },
          { label: "Large (300+)", value: "large" },
        ]}
      />
      <AppSelect
        label="Number of days"
        value={dayTier}
        onSelect={setDayTier}
        options={[
          { label: "1–2 days", value: "1-2" },
          { label: "3–4 days", value: "3-4" },
          { label: "5+ days", value: "5+" },
        ]}
      />

      <AppPressable onPress={handleContinue} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>Review suggestions</Text>
      </AppPressable>

      <AppPressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>Back</Text>
      </AppPressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ivory },
  scroll: { paddingHorizontal: spacing.screen },
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
  back: { marginTop: 16, alignItems: "center", padding: 12 },
  backText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },
});
