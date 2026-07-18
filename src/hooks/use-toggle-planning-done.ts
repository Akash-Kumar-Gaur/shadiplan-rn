import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PlanningTask } from "../lib/wedding-api";
import { updatePlanningTask } from "../lib/wedding-api";
import { weddingQueryKeys } from "../lib/wedding-query-keys";

type ToggleVars = { id: string; done: boolean };

/**
 * Optimistic checklist toggle — UI updates on tap; Supabase write runs in background.
 * Rolls back cache state if the mutation fails.
 */
export function useTogglePlanningDone(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, done }: ToggleVars) => {
      if (!weddingId) throw new Error("No wedding loaded");
      await updatePlanningTask(weddingId, id, { done });
    },
    onMutate: async ({ id, done }) => {
      if (!weddingId) return {};
      const key = weddingQueryKeys.planningTasks(weddingId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PlanningTask[]>(key);
      queryClient.setQueryData<PlanningTask[]>(key, (old) =>
        (old ?? []).map((task) => (task.id === id ? { ...task, done } : task)),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (!weddingId || !context?.previous) return;
      queryClient.setQueryData(weddingQueryKeys.planningTasks(weddingId), context.previous);
    },
    onSettled: () => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({
        queryKey: weddingQueryKeys.planningTasks(weddingId),
      });
    },
  });
}
