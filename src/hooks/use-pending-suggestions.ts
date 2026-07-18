import { useQuery } from "@tanstack/react-query";
import { fetchPendingSuggestions } from "../lib/wedding-api";
import { weddingQueryKeys } from "../lib/wedding-query-keys";

export function usePendingSuggestions(weddingId: string | undefined) {
  return useQuery({
    queryKey: weddingQueryKeys.pendingSuggestions(weddingId ?? ""),
    queryFn: () => fetchPendingSuggestions(weddingId!),
    enabled: !!weddingId,
  });
}
