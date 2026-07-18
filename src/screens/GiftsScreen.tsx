import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift as GiftIcon, Trash2 } from "lucide-react-native";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppBottomSheet, SheetTextInput, formStyles } from "../components/AppBottomSheet";
import { AppPressable } from "../components/AppPressable";
import { Fab } from "../components/Fab";
import { ScreenEmpty } from "../components/ScreenEmpty";
import { ScreenLoader } from "../components/ScreenLoader";
import { StackScreenHeader } from "../components/StackScreenHeader";
import { useGuests } from "../hooks/use-vendor-guest-queries";
import { useWeddingMeta } from "../hooks/use-wedding-meta";
import { formatINR } from "../lib/format";
import {
  deleteGift,
  fetchGifts,
  insertGift,
  updateGift,
  type Gift
} from "../lib/gifts-api";
import { weddingQueryKeys } from "../lib/wedding-query-keys";
import { colors, fonts, radius, spacing } from "../theme/tokens";

type Filter = "thanks_pending" | "all";

export function GiftsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: wedding, isLoading: weddingLoading } = useWeddingMeta();
  const weddingId = wedding?.id;
  const { data: guests = [] } = useGuests(weddingId);
  const addRef = useRef<BottomSheetModal>(null);
  const editRef = useRef<BottomSheetModal>(null);
  const [filter, setFilter] = useState<Filter>("thanks_pending");
  const [editingGift, setEditingGift] = useState<Gift | null>(null);

  const giftsQuery = useQuery({
    queryKey: weddingQueryKeys.gifts(weddingId ?? ""),
    queryFn: () => fetchGifts(weddingId!),
    enabled: !!weddingId
});

  const gifts = giftsQuery.data ?? [];
  const filtered = useMemo(() => {
    if (filter === "thanks_pending") return gifts.filter((g) => !g.thankYouSent);
    return gifts;
  }, [filter, gifts]);

  const pendingCount = gifts.filter((g) => !g.thankYouSent).length;

  const invalidate = () => {
    if (!weddingId) return;
    void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.gifts(weddingId) });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateGift>[2] }) => {
      if (!weddingId) throw new Error("No wedding");
      return updateGift(weddingId, id, patch);
    },
    onMutate: async ({ id, patch }) => {
      if (!weddingId) return {};
      const key = weddingQueryKeys.gifts(weddingId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Gift[]>(key);
      queryClient.setQueryData<Gift[]>(key, (old) =>
        (old ?? []).map((g) => (g.id === id ? { ...g, ...patch } : g)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (!weddingId || !context?.previous) return;
      queryClient.setQueryData(weddingQueryKeys.gifts(weddingId), context.previous);
    },
    onSettled: invalidate
});

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!weddingId) throw new Error("No wedding");
      return deleteGift(weddingId, id);
    },
    onSuccess: invalidate
});

  const openEdit = (gift: Gift) => {
    setEditingGift(gift);
    requestAnimationFrame(() => editRef.current?.present());
  };

  const confirmDeleteGift = (gift: Gift) => {
    Alert.alert("Delete gift?", gift.giverName, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteMutation.mutate(gift.id, {
            onSuccess: () => {
              editRef.current?.dismiss();
              setEditingGift(null);
            }
})
},
    ]);
  };

  const loading = weddingLoading || (!!weddingId && giftsQuery.isPending);

  if (loading) {
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
      <StackScreenHeader title="Gift Tracker" />
      <View style={styles.tabs}>
        <AppPressable
          onPress={() => setFilter("thanks_pending")}
          style={[styles.tab, filter === "thanks_pending" && styles.tabActive]}
        >
          <Text style={[styles.tabText, filter === "thanks_pending" && styles.tabTextActive]}>
            Thank you pending{pendingCount > 0 ? ` (${pendingCount})` : ""}
          </Text>
        </AppPressable>
        <AppPressable
          onPress={() => setFilter("all")}
          style={[styles.tab, filter === "all" && styles.tabActive]}
        >
          <Text style={[styles.tabText, filter === "all" && styles.tabTextActive]}>All</Text>
        </AppPressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.screen, paddingBottom: insets.bottom + 88 }}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <GiftIcon size={28} color={colors.mutedForeground} />
            <Text style={styles.empty}>
              {filter === "thanks_pending" && gifts.length > 0
                ? "All thank-yous sent — nice work."
                : "No gifts logged yet."}
            </Text>
          </View>
        ) : (
          filtered.map((gift) => (
            <View key={gift.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppPressable
                  onPress={() => openEdit(gift)}
                  accessibilityLabel={`Edit gift from ${gift.giverName}`}
                >
                  <Text style={styles.name}>{gift.giverName}</Text>
                  <Text style={styles.meta}>
                    {[
                      gift.amount != null ? formatINR(gift.amount) : null,
                      gift.giftDescription,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </Text>
                </AppPressable>
                <View style={styles.thanksRow}>
                  <Text style={styles.thanksLabel}>Thank you sent</Text>
                  <Switch
                    value={gift.thankYouSent}
                    onValueChange={(thankYouSent) =>
                      updateMutation.mutate({ id: gift.id, patch: { thankYouSent } })
                    }
                    trackColor={{ false: colors.border, true: colors.success }}
                  />
                </View>
              </View>
              <AppPressable
                onPress={() => confirmDeleteGift(gift)}
                accessibilityLabel="Delete gift"
              >
                <Trash2 size={16} color={colors.destructive} />
              </AppPressable>
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Add gift" aboveTabBar={false} onPress={() => addRef.current?.present()} />
      <GiftFormSheet
        ref={addRef}
        weddingId={weddingId!}
        guests={guests.map((g) => ({ id: g.id, name: g.name }))}
        onSaved={invalidate}
      />
      <GiftFormSheet
        ref={editRef}
        weddingId={weddingId!}
        guests={guests.map((g) => ({ id: g.id, name: g.name }))}
        gift={editingGift}
        onSaved={invalidate}
        onDelete={confirmDeleteGift}
        onDismiss={() => setEditingGift(null)}
      />
    </View>
  );
}

const GiftFormSheet = forwardRef<
  BottomSheetModal,
  {
    weddingId: string;
    guests: { id: string; name: string }[];
    gift?: Gift | null;
    onSaved: () => void;
    onDelete?: (gift: Gift) => void;
    onDismiss?: () => void;
  }
>(function GiftFormSheet({ weddingId, guests, gift = null, onSaved, onDelete, onDismiss }, ref) {
  const innerRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => innerRef.current!);
  const isEdit = !!gift;

  const [giverName, setGiverName] = useState("");
  const [guestId, setGuestId] = useState<string | undefined>();
  const [guestQuery, setGuestQuery] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [thankYouSent, setThankYouSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const suggestions = useMemo(() => {
    const q = guestQuery.trim().toLowerCase();
    if (!q) return guests.slice(0, 6);
    return guests.filter((g) => g.name.toLowerCase().includes(q)).slice(0, 8);
  }, [guests, guestQuery]);

  useEffect(() => {
    if (gift) {
      setGiverName(gift.giverName);
      setGuestId(gift.guestId);
      setGuestQuery(gift.giverName);
      setAmount(gift.amount != null ? String(gift.amount) : "");
      setDescription(gift.giftDescription ?? "");
      setNotes(gift.notes ?? "");
      setThankYouSent(gift.thankYouSent);
    } else {
      setGiverName("");
      setGuestId(undefined);
      setGuestQuery("");
      setAmount("");
      setDescription("");
      setNotes("");
      setThankYouSent(false);
    }
    setError(null);
  }, [gift]);

  const reset = () => {
    if (!gift) {
      setGiverName("");
      setGuestId(undefined);
      setGuestQuery("");
      setAmount("");
      setDescription("");
      setNotes("");
      setThankYouSent(false);
    }
    setError(null);
  };

  const handleSubmit = async () => {
    if (!giverName.trim()) {
      setError("Giver name is required");
      return;
    }
    const parsedAmount = amount.trim() ? Number(amount) : undefined;
    if (amount.trim() && (!parsedAmount || parsedAmount <= 0)) {
      setError("Enter a valid amount");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (isEdit && gift) {
        await updateGift(weddingId, gift.id, {
          giverName: giverName.trim(),
          guestId,
          amount: parsedAmount,
          giftDescription: description.trim() || undefined,
          notes: notes.trim() || undefined,
          thankYouSent
});
      } else {
        await insertGift(weddingId, {
          giverName: giverName.trim(),
          guestId,
          amount: parsedAmount,
          giftDescription: description.trim() || undefined,
          notes: notes.trim() || undefined,
          thankYouSent
});
      }
      reset();
      innerRef.current?.dismiss();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save gift");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!gift || !onDelete) return;
    onDelete(gift);
  };

  return (
    <AppBottomSheet
      ref={innerRef}
      title={isEdit ? "Edit gift" : "Add gift"}
      onDismiss={onDismiss}
    >
      <View style={formStyles.field}>
        <Text style={formStyles.label}>From</Text>
        <SheetTextInput
          style={formStyles.input}
          value={giverName}
          onChangeText={(text: string) => {
            setGiverName(text);
            setGuestQuery(text);
            setGuestId(undefined);
          }}
          placeholder="Guest or giver name"
          placeholderTextColor={colors.textMuted}
        />
        {suggestions.length > 0 && !guestId ? (
          <View style={styles.suggestions}>
            {suggestions.map((g) => (
              <AppPressable
                key={g.id}
                onPress={() => {
                  setGiverName(g.name);
                  setGuestId(g.id);
                  setGuestQuery(g.name);
                }}
                style={styles.suggestion}
              >
                <Text style={styles.suggestionText}>{g.name}</Text>
              </AppPressable>
            ))}
          </View>
        ) : null}
      </View>
      <View style={formStyles.field}>
        <Text style={formStyles.label}>Amount (₹)</Text>
        <SheetTextInput
          style={formStyles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
        />
      </View>
      <View style={formStyles.field}>
        <Text style={formStyles.label}>Gift description</Text>
        <SheetTextInput
          style={formStyles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
        />
      </View>
      <View style={formStyles.field}>
        <Text style={formStyles.label}>Notes</Text>
        <SheetTextInput
          style={formStyles.textarea}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
        />
      </View>
      <View style={formStyles.switchRow}>
        <Text style={formStyles.label}>Thank you sent</Text>
        <Switch
          value={thankYouSent}
          onValueChange={setThankYouSent}
          trackColor={{ false: colors.border, true: colors.success }}
        />
      </View>
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
      <AppPressable
        onPress={() => void handleSubmit()}
        disabled={saving}
        style={[formStyles.primaryBtn, saving && formStyles.primaryBtnDisabled]}
      >
        {saving ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={formStyles.primaryBtnText}>{isEdit ? "Save changes" : "Save gift"}</Text>
        )}
      </AppPressable>
      {isEdit && onDelete ? (
        <AppPressable onPress={handleDelete} style={{ marginTop: 16, alignItems: "center" }}>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.destructive }}>
            Remove gift
          </Text>
        </AppPressable>
      ) : null}
    </AppBottomSheet>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.screen,
    paddingTop: 12
},
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border
},
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.mutedForeground },
  tabTextActive: { color: colors.primaryForeground },
  emptyCard: { alignItems: "center", gap: 12, paddingVertical: 40 },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "flex-start"
},
  name: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.foreground },
  meta: { marginTop: 2, fontFamily: fonts.body, fontSize: 12, color: colors.mutedForeground },
  thanksRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
},
  thanksLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.foreground },
  suggestions: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: "hidden"
},
  suggestion: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
},
  suggestionText: { fontFamily: fonts.body, fontSize: 14, color: colors.foreground }
});
