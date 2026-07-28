import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AmountText, useAmountsHiddenPreference } from "../components/AmountText";
import { AppPressable } from "../components/AppPressable";
import { AnimatedScreenTitle } from "../components/AnimatedScreenTitle";
import { requestAppConfirm, showAppAlert } from "../components/ConfirmSheet";
import { AppSelect } from "../components/AppSelect";
import { DrawerMenuButton } from "../components/DrawerMenuButton";
import { Fab } from "../components/Fab";
import { ScreenEmpty } from "../components/ScreenEmpty";
import { ScreenLoader } from "../components/ScreenLoader";
import { CategoryFormSheet } from "../components/sheets/CategoryCreateSheet";
import { ExpenseCreateSheet } from "../components/sheets/ExpenseCreateSheet";
import { ExpenseEditSheet } from "../components/sheets/ExpenseEditSheet";
import { SetBudgetSheet } from "../components/sheets/SetBudgetSheet";
import { useDeleteBudgetCategory } from "../hooks/use-wallet-mutations";
import { useWalletData } from "../hooks/use-wallet-queries";
import { useWeddingMeta } from "../hooks/use-wedding-meta";
import { shortDate } from "../lib/format";
import { ensureDefaultBudgetCategoriesIfEmpty } from "../lib/wallet-api";
import { weddingQueryKeys } from "../lib/wedding-query-keys";
import type { BudgetCategory, Transaction } from "../types/wedding";
import { colors, fonts, radius, spacing } from "../theme/tokens";

type TxSort = "date" | "category" | "amount";

const SORT_OPTIONS: { label: string; value: TxSort }[] = [
  { label: "Date", value: "date" },
  { label: "Category", value: "category" },
  { label: "Amount", value: "amount" },
];

export function WalletScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { amountsHidden, toggleAmountsHidden } = useAmountsHiddenPreference();
  const { data: wedding, isLoading: weddingLoading } = useWeddingMeta();
  const weddingId = wedding?.id;

  const {
    budgetCategories,
    budgetCategoriesRaw,
    transactions,
    isLoading: walletLoading,
  } = useWalletData(weddingId);

  const deleteCategory = useDeleteBudgetCategory(weddingId);

  const expenseRef = useRef<BottomSheetModal>(null);
  const expenseEditRef = useRef<BottomSheetModal>(null);
  const categoryRef = useRef<BottomSheetModal>(null);
  const budgetRef = useRef<BottomSheetModal>(null);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [txSort, setTxSort] = useState<TxSort>("date");

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of budgetCategories) map.set(c.id, c.name);
    return map;
  }, [budgetCategories]);

  const sortedTransactions = useMemo(() => {
    const list = [...transactions];
    if (txSort === "amount") {
      return list.sort((a, b) => b.amount - a.amount);
    }
    if (txSort === "category") {
      return list.sort((a, b) => {
        const an = categoryNameById.get(a.categoryId) ?? "Uncategorized";
        const bn = categoryNameById.get(b.categoryId) ?? "Uncategorized";
        const byName = an.localeCompare(bn);
        if (byName !== 0) return byName;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, txSort, categoryNameById]);

  const transactionsByCategory = useMemo(() => {
    if (txSort !== "category") return null;
    const map = new Map<string, Transaction[]>();
    for (const tx of sortedTransactions) {
      const name = categoryNameById.get(tx.categoryId) ?? "Uncategorized";
      const list = map.get(name) ?? [];
      list.push(tx);
      map.set(name, list);
    }
    return Array.from(map.entries());
  }, [sortedTransactions, txSort, categoryNameById]);

  /**
   * Full amount counted against each tag present (shared expenses count fully
   * for each person tagged — not split). Flagged in UI below.
   */
  const taggedTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      for (const tag of tx.taggedFor ?? []) {
        map.set(tag, (map.get(tag) ?? 0) + tx.amount);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  const seedAttempted = useRef(false);
  useEffect(() => {
    if (!weddingId || walletLoading || seedAttempted.current) return;
    if (budgetCategoriesRaw.length > 0) return;
    seedAttempted.current = true;
    void ensureDefaultBudgetCategoriesIfEmpty(weddingId).then((seeded) => {
      if (seeded) {
        void queryClient.invalidateQueries({
          queryKey: weddingQueryKeys.budgetCategories(weddingId),
        });
      }
    });
  }, [weddingId, walletLoading, budgetCategoriesRaw.length, queryClient]);

  useEffect(() => {
    if (selectedTransaction) expenseEditRef.current?.present();
  }, [selectedTransaction]);

  useEffect(() => {
    if (!selectedTransaction) return;
    const fresh = transactions.find((t) => t.id === selectedTransaction.id);
    if (fresh && fresh !== selectedTransaction) setSelectedTransaction(fresh);
  }, [transactions, selectedTransaction]);

  const openExpense = useCallback(() => expenseRef.current?.present(), []);
  const closeExpenseEdit = useCallback(() => setSelectedTransaction(null), []);
  const openCategoryCreate = useCallback(() => {
    setEditingCategory(null);
    categoryRef.current?.present();
  }, []);
  const openCategoryEdit = useCallback((cat: BudgetCategory) => {
    setEditingCategory(cat);
    requestAnimationFrame(() => categoryRef.current?.present());
  }, []);
  const openBudget = useCallback(() => budgetRef.current?.present(), []);

  const confirmDeleteCategory = useCallback(
    (cat: BudgetCategory) => {
      requestAppConfirm({
        title: "Delete category?",
        message: `"${cat.name}" will be removed. Expenses in this category stay in your wallet as uncategorized.`,
        confirmLabel: "Delete",
        destructive: true,
        onConfirm: () => {
          deleteCategory.mutate(cat.id, {
            onError: (err) => {
              showAppAlert(
                "Could not delete",
                err instanceof Error ? err.message : "Try again",
              );
            },
          });
        },
      });
    },
    [deleteCategory],
  );

  const loading = weddingLoading || walletLoading;

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
        <ScreenEmpty description="Finish setting up your wedding to track your budget." />
      </View>
    );
  }

  const totalSpent = budgetCategories.reduce((s, c) => s + c.actual, 0);
  const totalPlanned = budgetCategories.reduce((s, c) => s + c.planned, 0);
  const hasBudget = wedding.totalBudget != null && wedding.totalBudget > 0;
  const budgetPct = hasBudget
    ? Math.min(100, Math.round((totalSpent / wedding.totalBudget!) * 100))
    : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>ShadiPlan</Text>
            <AnimatedScreenTitle style={styles.title}>Wallet</AnimatedScreenTitle>
          </View>
          <View style={styles.headerActions}>
            <AppPressable
              onPress={toggleAmountsHidden}
              style={styles.eyeBtn}
              accessibilityRole="button"
              accessibilityLabel={amountsHidden ? "Show amounts" : "Hide amounts"}
            >
              {amountsHidden ? (
                <EyeOff size={20} color={colors.foreground} />
              ) : (
                <Eye size={20} color={colors.foreground} />
              )}
            </AppPressable>
            <DrawerMenuButton />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.screen,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total spent</Text>
          {hasBudget ? (
            <>
              <View style={styles.summaryRow}>
                <AmountText value={totalSpent} style={styles.summaryAmount} />
                <Text style={styles.summaryOf}>
                  of <AmountText value={wedding.totalBudget!} style={styles.summaryOf} />
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${budgetPct}%` }]} />
              </View>
              <View style={styles.summaryMeta}>
                <Text style={styles.summaryMetaText}>{budgetPct}% committed</Text>
                <Text style={styles.summaryMetaText}>
                  Planned <AmountText value={totalPlanned} style={styles.summaryMetaText} />
                </Text>
              </View>
            </>
          ) : (
            <>
              <AmountText value={totalSpent} style={styles.summaryAmount} />
              <Text style={styles.setBudgetHint}>
                Set your total budget to start tracking against a target.
              </Text>
              <AppPressable onPress={openBudget} style={styles.outlineBtn}>
                <Text style={styles.outlineBtnText}>Set your budget</Text>
              </AppPressable>
            </>
          )}
        </View>

        {taggedTotals.length > 0 ? (
          <View style={styles.taggedCard}>
            <Text style={styles.sectionTitle}>Per person</Text>
            <Text style={styles.taggedHint}>
              Full amount counted for each tag when an expense is shared.
            </Text>
            {taggedTotals.map(([tag, total]) => (
              <View key={tag} style={styles.taggedRow}>
                <Text style={styles.taggedLabel}>{tag}</Text>
                <AmountText value={total} style={styles.taggedAmount} />
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <AppPressable onPress={openCategoryCreate} style={styles.addLink}>
            <Plus size={14} color={colors.primary} />
            <Text style={styles.addLinkText}>Add category</Text>
          </AppPressable>
        </View>

        <View style={styles.listCard}>
          {budgetCategories.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyText}>No budget categories yet.</Text>
              <AppPressable onPress={openCategoryCreate} style={styles.outlineBtn}>
                <Plus size={14} color={colors.primary} />
                <Text style={styles.outlineBtnText}>Add category</Text>
              </AppPressable>
            </View>
          ) : (
            budgetCategories.map((cat, i) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                isLast={i === budgetCategories.length - 1}
                onEdit={() => openCategoryEdit(cat)}
                onDelete={() => confirmDeleteCategory(cat)}
              />
            ))
          )}
        </View>

        <View style={styles.txHeader}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          <AppSelect
            value={txSort}
            onSelect={setTxSort}
            options={SORT_OPTIONS}
            containerStyle={styles.sortSelect}
          />
        </View>

        <View style={styles.listCard}>
          {transactions.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyText}>No transactions yet. Tap + to log an expense.</Text>
            </View>
          ) : txSort === "category" && transactionsByCategory ? (
            transactionsByCategory.map(([categoryName, txs]) => (
              <View key={categoryName}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryHeaderText}>{categoryName}</Text>
                </View>
                {txs.map((tx, i) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    isLast={i === txs.length - 1}
                    onPress={() => setSelectedTransaction(tx)}
                  />
                ))}
              </View>
            ))
          ) : (
            sortedTransactions.map((tx, i) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                isLast={i === sortedTransactions.length - 1}
                onPress={() => setSelectedTransaction(tx)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <Fab onPress={openExpense} label="Add expense" />

      <ExpenseCreateSheet
        ref={expenseRef}
        weddingId={weddingId}
        budgetCategories={budgetCategoriesRaw}
      />
      <ExpenseEditSheet
        ref={expenseEditRef}
        transaction={selectedTransaction}
        weddingId={weddingId}
        budgetCategories={budgetCategoriesRaw}
        onClose={closeExpenseEdit}
      />
      <CategoryFormSheet
        ref={categoryRef}
        weddingId={weddingId}
        category={editingCategory}
        onDone={() => setEditingCategory(null)}
      />
      <SetBudgetSheet ref={budgetRef} weddingId={weddingId} currentBudget={wedding.totalBudget} />
    </View>
  );
}

function CategoryRow({
  category,
  isLast,
  onEdit,
  onDelete,
}: {
  category: BudgetCategory;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pct =
    category.planned > 0
      ? Math.min(100, Math.round((category.actual / category.planned) * 100))
      : 0;
  const over = category.planned > 0 && category.actual > category.planned;

  const renderRight = () => (
    <AppPressable onPress={onDelete} style={styles.swipeDelete} accessibilityLabel="Delete category">
      <Trash2 size={18} color="#fff" />
    </AppPressable>
  );

  return (
    <Swipeable renderRightActions={renderRight} overshootRight={false}>
      <AppPressable
        onPress={onEdit}
        style={[styles.listRow, !isLast && styles.listRowBorder]}
        accessibilityLabel={`Edit ${category.name}`}
      >
        <View style={styles.listRowTop}>
          <Text style={styles.listRowTitle}>{category.name}</Text>
          <View style={styles.listRowRight}>
            <View style={styles.listRowAmount}>
              <AmountText
                value={category.actual}
                style={[styles.listRowActual, over && styles.overBudget]}
              />
              <Text style={styles.listRowPlanned}> / </Text>
              <AmountText value={category.planned} style={styles.listRowPlanned} />
            </View>
            <AppPressable
              onPress={onDelete}
              style={styles.trashBtn}
              accessibilityLabel={`Delete ${category.name}`}
              hitSlop={8}
            >
              <Trash2 size={14} color={colors.mutedForeground} />
            </AppPressable>
            <Pencil size={14} color={colors.mutedForeground} />
          </View>
        </View>
        <Text style={styles.listRowSub}>Spent / planned</Text>
        <View style={styles.catProgressTrack}>
          <View
            style={[
              styles.catProgressFill,
              over && styles.catProgressOver,
              { width: `${pct}%` },
            ]}
          />
        </View>
      </AppPressable>
    </Swipeable>
  );
}

function TransactionRow({
  transaction,
  isLast,
  onPress,
}: {
  transaction: Transaction;
  isLast: boolean;
  onPress: () => void;
}) {
  const tags = transaction.taggedFor ?? [];

  return (
    <AppPressable
      onPress={onPress}
      style={[styles.txRow, !isLast && styles.listRowBorder]}
      accessibilityLabel={`Edit ${transaction.vendorName} transaction`}
    >
      <View style={styles.txMain}>
        <Text style={styles.txVendor} numberOfLines={1}>
          {transaction.vendorName}
        </Text>
        {transaction.note ? (
          <Text style={styles.txNote} numberOfLines={1}>
            {transaction.note}
          </Text>
        ) : null}
        {tags.length > 0 ? (
          <View style={styles.tagRow}>
            {tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.txRight}>
        <AmountText value={transaction.amount} style={styles.txAmount} />
        <Text style={styles.txDate}>{shortDate(transaction.date)}</Text>
      </View>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.screen,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eyeBtn: {
    padding: 8,
  },
  eyebrow: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.foreground,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  summaryLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  summaryAmount: {
    fontFamily: fonts.heading,
    fontSize: 36,
    color: colors.foreground,
    marginTop: 8,
  },
  summaryOf: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.secondary,
    borderRadius: 4,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  summaryMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  summaryMetaText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  setBudgetHint: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 8,
  },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlineBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primary,
  },
  taggedCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 24,
  },
  taggedHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 4,
    marginBottom: 12,
  },
  taggedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  taggedLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  taggedAmount: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.foreground,
  },
  addLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addLinkText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.primary,
  },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 24,
  },
  emptyBlock: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  listRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
  },
  listRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  listRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  trashBtn: {
    padding: 2,
  },
  swipeDelete: {
    backgroundColor: colors.destructive,
    justifyContent: "center",
    alignItems: "center",
    width: 72,
    borderRadius: radius.md,
    marginVertical: 4,
    marginRight: 4,
  },
  listRowTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
    flex: 1,
  },
  listRowAmount: {
    flexDirection: "row",
    alignItems: "center",
  },
  listRowActual: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.foreground,
  },
  overBudget: {
    color: colors.destructive,
  },
  listRowPlanned: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  listRowSub: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  catProgressTrack: {
    height: 6,
    backgroundColor: colors.secondary,
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  catProgressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  catProgressOver: {
    backgroundColor: colors.destructive,
  },
  txHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sortSelect: {
    width: 140,
    marginBottom: 0,
  },
  categoryHeader: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryHeaderText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.secondaryForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  txMain: {
    flex: 1,
    minWidth: 0,
  },
  txVendor: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  txNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.secondary,
  },
  tagChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.secondaryForeground,
  },
  txRight: {
    alignItems: "flex-end",
  },
  txAmount: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  txDate: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
});
