import { useQuery } from "@tanstack/react-query";
import { fetchPlanningTasks } from "../lib/wedding-api";
import { weddingQueryKeys } from "../lib/wedding-query-keys";

export function usePlanningTasks(weddingId: string | undefined) {
  return useQuery({
    queryKey: weddingQueryKeys.planningTasks(weddingId ?? ""),
    queryFn: () => fetchPlanningTasks(weddingId!),
    enabled: !!weddingId,
  });
}
