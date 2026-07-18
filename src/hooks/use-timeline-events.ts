import { useQuery } from "@tanstack/react-query";
import { fetchTimelineEvents } from "../lib/wedding-api";
import { weddingQueryKeys } from "../lib/wedding-query-keys";

export function useTimelineEvents(weddingId: string | undefined) {
  return useQuery({
    queryKey: weddingQueryKeys.timelineEvents(weddingId ?? ""),
    queryFn: () => fetchTimelineEvents(weddingId!),
    enabled: !!weddingId,
  });
}
