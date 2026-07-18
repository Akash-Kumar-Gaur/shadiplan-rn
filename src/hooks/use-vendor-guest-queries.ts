import { useQuery } from "@tanstack/react-query";
import { fetchBudgetCategories, fetchGuestGroups, fetchGuests, fetchVendors } from "../lib/vendor-guest-api";
import { weddingQueryKeys } from "../lib/wedding-query-keys";

export function useVendors(weddingId: string | undefined) {
  return useQuery({
    queryKey: weddingQueryKeys.vendors(weddingId ?? ""),
    queryFn: () => fetchVendors(weddingId!),
    enabled: !!weddingId,
  });
}

export function useGuests(weddingId: string | undefined) {
  return useQuery({
    queryKey: weddingQueryKeys.guests(weddingId ?? ""),
    queryFn: () => fetchGuests(weddingId!),
    enabled: !!weddingId,
  });
}

export function useGuestGroups(weddingId: string | undefined) {
  return useQuery({
    queryKey: weddingQueryKeys.guestGroups(weddingId ?? ""),
    queryFn: () => fetchGuestGroups(weddingId!),
    enabled: !!weddingId,
  });
}

export function useBudgetCategories(weddingId: string | undefined) {
  return useQuery({
    queryKey: weddingQueryKeys.budgetCategories(weddingId ?? ""),
    queryFn: () => fetchBudgetCategories(weddingId!),
    enabled: !!weddingId,
  });
}
