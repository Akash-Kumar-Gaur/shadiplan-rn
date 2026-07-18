import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { ChevronRight } from "lucide-react-native";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import {
  useAcceptSuggestion,
  useDismissSuggestion,
  useLoadSuggestions,
} from "../../hooks/use-checklist-mutations";
import { usePendingSuggestions } from "../../hooks/use-pending-suggestions";
import type { PendingSuggestion } from "../../lib/wedding-api";
import { formatShortDate } from "../../lib/lead-time-dates";
import { AppBottomSheet, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
import { colors, fonts, radius } from "../../theme/tokens";
import { StyleSheet } from "react-native";

type Props = {
  weddingId: string | undefined;
  weddingDate: string | undefined;
};

export const GetSuggestionsSheet = forwardRef<BottomSheetModal, Props>(function GetSuggestionsSheet(
  { weddingId, weddingDate },
  ref,
) {
  const innerRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => innerRef.current!);

  const [nonce, setNonce] = useState(0);
  const { data: pending = [] } = usePendingSuggestions(weddingId);
  const loadSuggestions = useLoadSuggestions(weddingId, weddingDate);
  const acceptSuggestion = useAcceptSuggestion(weddingId);
  const dismissSuggestion = useDismissSuggestion(weddingId);

  const visible = pending.filter((p) => p.status === "pending");

  useEffect(() => {
    if (weddingId && weddingDate) {
      void loadSuggestions.mutate(nonce);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weddingId, weddingDate, nonce]);

  const handleShuffle = () => setNonce((n) => n + 1);

  return (
    <AppBottomSheet
      ref={innerRef}
      title="Checklist suggestions"
      subtitle="Nothing is added until you accept it"
    >
      {loadSuggestions.isPending && visible.length === 0 ? (
        <ActivityIndicator color={colors.terracottaDark} style={{ marginVertical: 24 }} />
      ) : visible.length === 0 ? (
        <Text style={styles.empty}>
          All caught up — add tasks manually or shuffle for more ideas.
        </Text>
      ) : (
        <View style={styles.list}>
          {visible.map((item) => (
            <SuggestionRow
              key={item.id}
              item={item}
              busy={acceptSuggestion.isPending || dismissSuggestion.isPending}
              onAccept={() =>
                acceptSuggestion.mutate({
                  suggestionId: item.id,
                  task: item.task,
                  leadTime: item.leadTime,
                  category: item.category,
                  commonlyMissed: item.commonlyMissed,
                  suggestedDate: item.suggestedDate,
                })
              }
              onDismiss={() => dismissSuggestion.mutate(item.id)}
            />
          ))}
        </View>
      )}

      <AppPressable
        onPress={handleShuffle}
        style={styles.shuffleBtn}
        disabled={loadSuggestions.isPending}
      >
        <Text style={styles.shuffleText}>
          {loadSuggestions.isPending ? "Finding ideas…" : "Shuffle again"}
        </Text>
        <ChevronRight size={14} color={colors.mutedForeground} />
      </AppPressable>
    </AppBottomSheet>
  );
});

function SuggestionRow({
  item,
  busy,
  onAccept,
  onDismiss,
}: {
  item: PendingSuggestion;
  busy: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowBody}>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.task}>{item.task}</Text>
        {item.suggestedDate ? (
          <Text style={styles.date}>{formatShortDate(item.suggestedDate)}</Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <AppPressable
          onPress={onDismiss}
          disabled={busy}
          style={styles.dismissBtn}
          accessibilityLabel="Dismiss suggestion"
        >
          <Text style={styles.dismissText}>✕</Text>
        </AppPressable>
        <AppPressable
          onPress={onAccept}
          disabled={busy}
          style={styles.acceptBtn}
          accessibilityLabel="Accept suggestion"
        >
          <Text style={styles.acceptText}>Add</Text>
        </AppPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    marginVertical: 16,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 12,
    backgroundColor: "#fff",
  },
  rowBody: {
    flex: 1,
  },
  category: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  task: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.foreground,
  },
  date: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dismissBtn: {
    padding: 6,
  },
  dismissText: {
    fontSize: 16,
    color: colors.mutedForeground,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  acceptText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.cream,
  },
  shuffleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 16,
    paddingVertical: 12,
  },
  shuffleText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
