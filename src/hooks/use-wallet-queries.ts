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

  const budgetCategoriesRaw = categoriesQuery.data ?? [];
  const dbTransactions = transactionsQuery.data ?? [];
  const vendors = vendorsQuery.data ?? [];

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
