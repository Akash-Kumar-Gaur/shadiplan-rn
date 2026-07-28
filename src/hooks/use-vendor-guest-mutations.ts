import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateGuestGroupInput,
  CreateGuestInput,
  CreateVendorInput,
  Guest,
  UpdateGuestInput,
  UpdateVendorInput,
  Vendor,
} from "../types/wedding";
import {
  deleteGuest,
  deleteVendor,
  insertGuest,
  insertGuestGroup,
  insertVendor,
  recordVendorPayment,
  updateGuest,
  updateVendor,
} from "../lib/vendor-guest-api";
import { cancelVendorReminder, scheduleVendorReminder } from "../lib/vendor-reminders";
import { weddingQueryKeys } from "../lib/wedding-query-keys";
import type { BudgetCategory } from "../types/wedding";

export function useCreateVendor(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      input,
      budgetCategories,
    }: {
      input: CreateVendorInput;
      budgetCategories: BudgetCategory[];
    }) => {
      if (!weddingId) throw new Error("No wedding loaded");
      return insertVendor(weddingId, input, budgetCategories);
    },
    onSuccess: (vendor) => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.vendors(weddingId) });
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.budgetCategories(weddingId) });
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.transactions(weddingId) });
      void scheduleVendorReminder(vendor);
    },
  });
}

export function useUpdateVendor(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vendorId,
      input,
    }: {
      vendorId: string;
      input: UpdateVendorInput;
    }) => {
      if (!weddingId) throw new Error("No wedding loaded");
      return updateVendor(weddingId, vendorId, input);
    },
    onSuccess: (vendor) => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.vendors(weddingId) });
      void scheduleVendorReminder(vendor);
    },
  });
}

export function useDeleteVendor(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vendorId: string) => {
      if (!weddingId) throw new Error("No wedding loaded");
      await deleteVendor(weddingId, vendorId);
    },
    onSuccess: (_data, vendorId) => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.vendors(weddingId) });
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.transactions(weddingId) });
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.budgetCategories(weddingId) });
      void cancelVendorReminder(vendorId);
    },
  });
}

export function useMarkVendorPaid(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vendor,
      budgetCategories,
    }: {
      vendor: Vendor;
      budgetCategories: BudgetCategory[];
    }) => {
      if (!weddingId) throw new Error("No wedding loaded");
      const balance = vendor.totalCost - vendor.advancePaid;
      if (balance <= 0) return;
      const categoryId =
        budgetCategories.find((c) => c.name === vendor.category)?.id ??
        budgetCategories[0]?.id;
      if (!categoryId) throw new Error("No budget category available");
      const today = new Date().toISOString().slice(0, 10);
      await recordVendorPayment(weddingId, vendor, categoryId, balance, today);
      await cancelVendorReminder(vendor.id);
    },
    onSuccess: () => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.vendors(weddingId) });
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.budgetCategories(weddingId) });
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.transactions(weddingId) });
    },
  });
}

/** Record a partial (or full) vendor payment — updates vendor_payments + transactions + advance_paid. */
export function useAddVendorPayment(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vendor,
      budgetCategories,
      amount,
      paidDate,
      note,
    }: {
      vendor: Vendor;
      budgetCategories: BudgetCategory[];
      amount: number;
      paidDate: string;
      note?: string;
    }) => {
      if (!weddingId) throw new Error("No wedding loaded");
      if (!amount || amount <= 0) throw new Error("Enter a valid amount");
      const categoryId =
        budgetCategories.find((c) => c.name === vendor.category)?.id ??
        budgetCategories[0]?.id;
      if (!categoryId) throw new Error("No budget category available");
      await recordVendorPayment(weddingId, vendor, categoryId, amount, paidDate, note);
      const newAdvance = vendor.advancePaid + amount;
      if (newAdvance >= vendor.totalCost) {
        await cancelVendorReminder(vendor.id);
      }
    },
    onSuccess: () => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.vendors(weddingId) });
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.budgetCategories(weddingId) });
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.transactions(weddingId) });
    },
  });
}

export function useCreateGuestGroup(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGuestGroupInput) => {
      if (!weddingId) throw new Error("No wedding loaded");
      return insertGuestGroup(weddingId, input);
    },
    onSuccess: () => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.guestGroups(weddingId) });
    },
  });
}

export function useCreateGuest(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGuestInput) => {
      if (!weddingId) throw new Error("No wedding loaded");
      return insertGuest(weddingId, input);
    },
    onSuccess: () => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.guests(weddingId) });
    },
  });
}

export function useUpdateGuest(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdateGuestInput }) => {
      if (!weddingId) throw new Error("No wedding loaded");
      await updateGuest(weddingId, id, patch);
    },
    onMutate: async ({ id, patch }) => {
      if (!weddingId) return {};
      const key = weddingQueryKeys.guests(weddingId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Guest[]>(key);
      queryClient.setQueryData<Guest[]>(key, (old) =>
        (old ?? []).map((guest) => (guest.id === id ? { ...guest, ...patch } : guest)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (!weddingId || !context?.previous) return;
      queryClient.setQueryData(weddingQueryKeys.guests(weddingId), context.previous);
    },
    onSettled: () => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.guests(weddingId) });
    },
  });
}

export function useDeleteGuest(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!weddingId) throw new Error("No wedding loaded");
      await deleteGuest(weddingId, id);
    },
    onMutate: async (id) => {
      if (!weddingId) return {};
      const key = weddingQueryKeys.guests(weddingId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Guest[]>(key);
      queryClient.setQueryData<Guest[]>(key, (old) => (old ?? []).filter((g) => g.id !== id));
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (!weddingId || !context?.previous) return;
      queryClient.setQueryData(weddingQueryKeys.guests(weddingId), context.previous);
    },
    onSettled: () => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.guests(weddingId) });
    },
  });
}
