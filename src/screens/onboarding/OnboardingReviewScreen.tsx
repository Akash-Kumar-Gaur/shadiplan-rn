import { useRoute, type RouteProp } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react-native";
import { useMemo, useState } from "react";
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
import {
  buildOnboardingReviewSuggestions,
  completeAssistedOnboarding,
  type ReviewSuggestion,
} from "../../lib/onboarding-api";
import { formatShortDate } from "../../lib/lead-time-dates";
import { weddingQueryKeys } from "../../lib/wedding-query-keys";
import type { OnboardingStackParamList } from "../../navigation/types";
import { colors, fonts, radius, spacing } from "../../theme/tokens";

export function OnboardingReviewScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const route = useRoute<RouteProp<OnboardingStackParamList, "Review">>();
  const { basics, answers } = route.params;

  const weddingDate = basics.date || basics.startDate;
  const initial = useMemo(
    () => buildOnboardingReviewSuggestions(answers, weddingDate),
    [answers, weddingDate],
  );

  const [items, setItems] = useState<ReviewSuggestion[]>(initial);
  const [accepted, setAccepted] = useState<ReviewSuggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = (item: ReviewSuggestion) => {
    setAccepted((prev) => [...prev, item]);
    setItems((prev) => prev.filter((p) => p.poolItemId !== item.poolItemId));
  };

  const dismiss = (item: ReviewSuggestion) => {
    setItems((prev) => prev.filter((p) => p.poolItemId !== item.poolItemId));
  };

  const finish = async () => {
    if (!user?.id) return;
    setBusy(true);
    setError(null);
    try {
      const wedding = await completeAssistedOnboarding(user.id, basics, accepted);
      queryClient.setQueryData(weddingQueryKeys.meta(user.id), wedding);
      await queryClient.invalidateQueries({ queryKey: weddingQueryKeys.meta(user.id) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your wedding");
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Review</Text>
        <Text style={styles.title}>Pick what to add</Text>
        <Text style={styles.subtitle}>
          Accept items for your checklist. Dismiss the rest — only accepted items are saved.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.screen,
          paddingBottom: insets.bottom + 120,
        }}
      >
        {items.length === 0 ? (
          <Text style={styles.empty}>
            {accepted.length
              ? `${accepted.length} item${accepted.length === 1 ? "" : "s"} ready to save.`
              : "No suggestions left. You can continue with an empty checklist."}
          </Text>
        ) : (
          items.map((item) => (
            <View key={item.poolItemId} style={styles.row}>
              <View style={styles.rowBody}>
                <Text style={styles.category}>
                  {item.category}
                  {item.commonlyMissed ? " · commonly missed" : ""}
                </Text>
                <Text style={styles.task}>{item.task}</Text>
                {item.suggestedDate ? (
                  <Text style={styles.date}>{formatShortDate(item.suggestedDate)}</Text>
                ) : null}
              </View>
              <View style={styles.actions}>
                <AppPressable
                  onPress={() => dismiss(item)}
                  disabled={busy}
                  style={styles.dismissBtn}
                >
                  <X size={18} color={colors.mutedForeground} />
                </AppPressable>
                <AppPressable
                  onPress={() => accept(item)}
                  disabled={busy}
                  style={styles.acceptBtn}
                >
                  <Check size={18} color="#fff" />
                </AppPressable>
              </View>
            </View>
          ))
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <AppPressable
          onPress={finish}
          disabled={busy}
          style={[styles.primaryBtn, busy && styles.disabled]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {items.length === 0
                ? `Create wedding${accepted.length ? ` (${accepted.length} tasks)` : ""}`
                : `Skip remaining & create (${accepted.length} accepted)`}
            </Text>
          )}
        </AppPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ivory },
  header: { paddingHorizontal: spacing.screen, marginBottom: 12 },
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
    lineHeight: 22,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: 32,
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
  },
  rowBody: { flex: 1 },
  category: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  task: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.foreground,
    lineHeight: 21,
  },
  date: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  dismissBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.terracottaDark,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    marginTop: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.destructive,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.screen,
    paddingTop: 12,
    backgroundColor: colors.ivory,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryBtn: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.terracottaDark,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.6 },
  primaryBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.primaryForeground,
  },
});
