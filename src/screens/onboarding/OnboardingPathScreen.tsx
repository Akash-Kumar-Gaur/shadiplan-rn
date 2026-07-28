import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, PenLine } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "../../components/AppPressable";
import { useAuth } from "../../lib/auth";
import { completeManualOnboarding } from "../../lib/onboarding-api";
import { weddingQueryKeys } from "../../lib/wedding-query-keys";
import type { OnboardingStackParamList } from "../../navigation/types";
import { colors, fonts, radius, spacing } from "../../theme/tokens";

export function OnboardingPathScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigation =
    useNavigation<NativeStackNavigationProp<OnboardingStackParamList, "Path">>();
  const route = useRoute<RouteProp<OnboardingStackParamList, "Path">>();
  const { basics } = route.params;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishManual = async () => {
    if (!user?.id) return;
    setBusy(true);
    setError(null);
    try {
      const wedding = await completeManualOnboarding(user.id, basics);
      queryClient.setQueryData(weddingQueryKeys.meta(user.id), wedding);
      await queryClient.invalidateQueries({ queryKey: weddingQueryKeys.meta(user.id) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your wedding");
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <Text style={styles.kicker}>Almost there</Text>
      <Text style={styles.title}>How do you want to start?</Text>
      <Text style={styles.subtitle}>
        Both paths create your wedding in the app. You can always add or change anything later.
      </Text>

      <AppPressable
        onPress={() => navigation.navigate("Questionnaire", { basics })}
        disabled={busy}
        style={styles.card}
      >
        <View style={styles.iconWrap}>
          <Sparkles size={22} color={colors.primary} />
        </View>
        <Text style={styles.cardTitle}>Help me get started</Text>
        <Text style={styles.cardBody}>
          Answer a few questions and review personalized checklist suggestions before anything is
          added.
        </Text>
      </AppPressable>

      <AppPressable onPress={finishManual} disabled={busy} style={styles.card}>
        <View style={styles.iconWrap}>
          <PenLine size={22} color={colors.primary} />
        </View>
        <Text style={styles.cardTitle}>I&apos;ll add things myself</Text>
        <Text style={styles.cardBody}>
          Jump straight to Home with default budget categories and a starter set of commonly missed
          tasks.
        </Text>
      </AppPressable>

      {busy ? <ActivityIndicator color={colors.terracottaDark} style={{ marginTop: 16 }} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AppPressable
        onPress={() => navigation.goBack()}
        disabled={busy}
        style={styles.back}
      >
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
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
    color: colors.foreground,
    marginBottom: 6,
  },
  cardBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  error: {
    marginTop: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.destructive,
    textAlign: "center",
  },
  back: { marginTop: 20, alignItems: "center", padding: 12 },
  backText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },
});
