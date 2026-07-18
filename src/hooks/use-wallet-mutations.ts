import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteBudgetCategory,
  deleteTransaction,
  insertBudgetCategory,
  insertTransaction,
  updateBudgetCategory,
  updateTransaction,
} from "../lib/wallet-api";
import { weddingQueryKeys } from "../lib/wedding-query-keys";
import type {
  BudgetCategory,
  CreateBudgetCategoryInput,
  CreateExpenseInput,
  Transaction,
  UpdateExpenseInput,
} from "../types/wedding";

export function useCreateExpense(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      if (!weddingId) throw new Error("No wedding loaded");
      return insertTransaction(weddingId, input);
    },
    onMutate: async (input) => {
      if (!weddingId) return {};
      const key = weddingQueryKeys.transactions(weddingId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Transaction[]>(key);
      const optimistic: Transaction = {
        id: `optimistic-${Date.now()}`,
        vendorName: input.vendorName?.trim() || "Expense",
        categoryId: input.categoryId,
        amount: input.amount,
        date: input.date,
        note: input.note,
        taggedFor: input.taggedFor ?? [],
      };
      queryClient.setQueryData<Transaction[]>(key, (old) => [optimistic, ...(old ?? [])]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (!weddingId || !context?.previous) return;
      queryClient.setQueryData(weddingQueryKeys.transactions(weddingId), context.previous);
    },
    onSettled: () => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.transactions(weddingId) });
    },
  });
}

export function useUpdateExpense(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: UpdateExpenseInput;
      vendorId?: string;
    }) => {
      if (!weddingId) throw new Error("No wedding loaded");
      await updateTransaction(weddingId, id, patch);
    },
    onSuccess: (_data, { vendorId }) => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.transactions(weddingId) });
      if (vendorId) {
        void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.vendors(weddingId) });
      }
    },
  });
}

export function useDeleteExpense(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; vendorId?: string }) => {
      if (!weddingId) throw new Error("No wedding loaded");
      await deleteTransaction(weddingId, id);
    },
    onSuccess: (_data, { vendorId }) => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.transactions(weddingId) });
      if (vendorId) {
        void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.vendors(weddingId) });
      }
    },
  });
}

export function useCreateBudgetCategory(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBudgetCategoryInput) => {
      if (!weddingId) throw new Error("No wedding loaded");
      return insertBudgetCategory(weddingId, input);
    },
    onSuccess: () => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.budgetCategories(weddingId) });
    },
  });
}

export function useUpdateBudgetCategory(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: { name: string; planned: number };
    }) => {
      if (!weddingId) throw new Error("No wedding loaded");
      await updateBudgetCategory(weddingId, id, updates);
    },
    onMutate: async ({ id, updates }) => {
      if (!weddingId) return {};
      const key = weddingQueryKeys.budgetCategories(weddingId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BudgetCategory[]>(key);
      queryClient.setQueryData<BudgetCategory[]>(key, (old) =>
        (old ?? []).map((c) =>
          c.id === id ? { ...c, name: updates.name, planned: updates.planned } : c,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (!weddingId || !context?.previous) return;
      queryClient.setQueryData(weddingQueryKeys.budgetCategories(weddingId), context.previous);
    },
    onSettled: () => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.budgetCategories(weddingId) });
    },
  });
}

/** Deletes category; DB sets transactions.category_id to null (uncategorized). */
export function useDeleteBudgetCategory(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!weddingId) throw new Error("No wedding loaded");
      await deleteBudgetCategory(weddingId, id);
    },
    onMutate: async (id) => {
      if (!weddingId) return {};
      const catKey = weddingQueryKeys.budgetCategories(weddingId);
      const txKey = weddingQueryKeys.transactions(weddingId);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: catKey }),
        queryClient.cancelQueries({ queryKey: txKey }),
      ]);
      const previousCategories = queryClient.getQueryData<BudgetCategory[]>(catKey);
      const previousTransactions = queryClient.getQueryData<Transaction[]>(txKey);
      queryClient.setQueryData<BudgetCategory[]>(catKey, (old) =>
        (old ?? []).filter((c) => c.id !== id),
      );
      queryClient.setQueryData<Transaction[]>(txKey, (old) =>
        (old ?? []).map((tx) => (tx.categoryId === id ? { ...tx, categoryId: "" } : tx)),
      );
      return { previousCategories, previousTransactions };
    },
    onError: (_err, _id, context) => {
      if (!weddingId || !context) return;
      if (context.previousCategories) {
        queryClient.setQueryData(
          weddingQueryKeys.budgetCategories(weddingId),
          context.previousCategories,
        );
      }
      if (context.previousTransactions) {
        queryClient.setQueryData(
          weddingQueryKeys.transactions(weddingId),
          context.previousTransactions,
        );
      }
    },
    onSettled: () => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.budgetCategories(weddingId) });
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.transactions(weddingId) });
    },
  });
}
