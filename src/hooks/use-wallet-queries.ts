import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchVendors } from "../lib/vendor-guest-api";
import {
  applyActualsFromTransactions,
  fetchBudgetCategoriesRaw,
  fetchTransactions,
  mergeTransactionSources,
} from "../lib/wallet-api";
import { weddingQueryKeys } from "../lib/wedding-query-keys";
import type { BudgetCategory, Transaction, Vendor } from "../types/wedding";

const EMPTY_CATEGORIES: BudgetCategory[] = [];
const EMPTY_TRANSACTIONS: Transaction[] = [];
const EMPTY_VENDORS: Vendor[] = [];

export function useTransactions(weddingId: string | undefined) {
  return useQuery({
    queryKey: weddingQueryKeys.transactions(weddingId ?? ""),
    queryFn: () => fetchTransactions(weddingId!),
    enabled: !!weddingId,
  });
}

export function useWalletData(weddingId: string | undefined) {
  const categoriesQuery = useQuery({
    queryKey: weddingQueryKeys.budgetCategories(weddingId ?? ""),
    queryFn: () => fetchBudgetCategoriesRaw(weddingId!),
    enabled: !!weddingId,
  });
  const transactionsQuery = useTransactions(weddingId);
  const vendorsQuery = useQuery({
    queryKey: weddingQueryKeys.vendors(weddingId ?? ""),
    queryFn: () => fetchVendors(weddingId!),
    enabled: !!weddingId,
  });

  const budgetCategoriesRaw = categoriesQuery.data ?? EMPTY_CATEGORIES;
  const dbTransactions = transactionsQuery.data ?? EMPTY_TRANSACTIONS;
  const vendors = vendorsQuery.data ?? EMPTY_VENDORS;

  const transactions = useMemo(
    () => mergeTransactionSources(dbTransactions, vendors, budgetCategoriesRaw),
    [dbTransactions, vendors, budgetCategoriesRaw],
  );

  const budgetCategories = useMemo(
    () => applyActualsFromTransactions(budgetCategoriesRaw, transactions),
    [budgetCategoriesRaw, transactions],
  );

  const isLoading =
    !!weddingId &&
    (categoriesQuery.isPending || transactionsQuery.isPending || vendorsQuery.isPending);

  return {
    budgetCategories,
    budgetCategoriesRaw,
    transactions,
    isLoading,
  };
}
