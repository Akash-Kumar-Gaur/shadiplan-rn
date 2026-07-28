import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "../components/AppPressable";
import { AppTextInput } from "../components/AppTextInput";
import { ScreenEmpty } from "../components/ScreenEmpty";
import { ScreenLoader } from "../components/ScreenLoader";
import { useWeddingMeta } from "../hooks/use-wedding-meta";
import { fetchCollaborators, inviteCollaborator } from "../lib/wedding-api";
import { weddingQueryKeys } from "../lib/wedding-query-keys";
import { colors, fonts, spacing } from "../theme/tokens";

export function CollaboratorsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { data: wedding, isLoading: weddingLoading } = useWeddingMeta();
  const weddingId = wedding?.id;
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const collaboratorsQuery = useQuery({
    queryKey: weddingQueryKeys.collaborators(weddingId ?? ""),
    queryFn: () => fetchCollaborators(weddingId!),
    enabled: !!weddingId,
  });

  const invite = useMutation({
    mutationFn: async () => {
      if (!weddingId) throw new Error("No wedding loaded");
      const trimmed = email.trim();
      if (!trimmed.includes("@")) throw new Error("Enter a valid email");
      return inviteCollaborator(weddingId, trimmed);
    },
    onSuccess: () => {
      setEmail("");
      setError(null);
      if (weddingId) {
        void queryClient.invalidateQueries({
          queryKey: weddingQueryKeys.collaborators(weddingId),
        });
      }
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Could not invite");
    },
  });

  if (weddingLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenLoader />
      </View>
    );
  }

  if (!wedding) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenEmpty description="Set up your wedding first." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.foreground} />
        </AppPressable>
        <Text style={styles.title}>Collaborators</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.hint}>
          Invite family or your planner by email — they'll get a message to sign in.
        </Text>

        {(collaboratorsQuery.data ?? []).map((c) => (
          <View key={c.id} style={styles.row}>
            <Text style={styles.rowEmail} numberOfLines={1}>
              {c.email}
            </Text>
            <Text style={styles.rowStatus}>
              {c.status === "accepted" ? "Active" : "Pending"}
            </Text>
          </View>
        ))}

        <View style={styles.inviteRow}>
          <AppTextInput
            native
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            containerStyle={{ flex: 1, marginBottom: 0 }}
          />
          <AppPressable
            onPress={() => invite.mutate()}
            disabled={invite.isPending}
            style={styles.inviteBtn}
          >
            {invite.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.inviteBtnText}>Invite</Text>
            )}
          </AppPressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.screen,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.foreground,
  },
  body: {
    padding: spacing.screen,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  rowEmail: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.foreground,
  },
  rowStatus: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  inviteRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
    alignItems: "center",
  },
  inviteBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.terracottaDark,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primaryForeground,
  },
  error: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.destructive,
  },
});
