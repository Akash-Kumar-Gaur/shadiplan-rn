import { useMutation, useQueryClient } from "@tanstack/react-query";
import { commonlyMissedItemsToPlanningInputs } from "../lib/commonly-missed-tasks";
import { DEFAULT_PLAN_ANSWERS, generateSuggestions, pickMoreCommonlyMissed } from "../lib/suggestion-engine";
import { suggestionsToPendingInputs } from "../lib/suggestion-pending";
import type { CreateTimelineEventInput, PlanningTask, TimelineEvent, Wedding } from "../lib/wedding-api";
import {
  deletePlanningTask,
  deleteTimelineEvent,
  dismissPendingSuggestion,
  fetchPendingSuggestions,
  insertPlanningTask,
  insertPlanningTasks,
  insertTimelineEvent,
  removePendingSuggestion,
  syncPendingSuggestionsBatch,
  updateTimelineEvent,
  updateWedding,
} from "../lib/wedding-api";
import { weddingQueryKeys } from "../lib/wedding-query-keys";

export function useSetWeddingBudget(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (totalBudget: number) => {
      if (!weddingId) throw new Error("No wedding loaded");
      await updateWedding(weddingId, { totalBudget });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["wedding-meta"] });
    },
  });
}

export function useToggleTimelineDone(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      await updateTimelineEvent(id, { done });
    },
    onMutate: async ({ id, done }) => {
      if (!weddingId) return {};
      const key = weddingQueryKeys.timelineEvents(weddingId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TimelineEvent[]>(key);
      queryClient.setQueryData<TimelineEvent[]>(key, (old) =>
        (old ?? []).map((e) => (e.id === id ? { ...e, done } : e)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (weddingId && ctx?.previous) {
        queryClient.setQueryData(weddingQueryKeys.timelineEvents(weddingId), ctx.previous);
      }
    },
    onSettled: () => {
      if (weddingId) {
        void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.timelineEvents(weddingId) });
      }
    },
  });
}

export function useCreateTimelineEvent(weddingId: string | undefined, wedding: Wedding | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTimelineEventInput) => {
      if (!weddingId) throw new Error("No wedding loaded");
      await insertTimelineEvent(weddingId, input);
      if (wedding) {
        const end = wedding.endDate || wedding.date;
        if (input.eventDate > end) {
          await updateWedding(weddingId, { endDate: input.eventDate });
        }
      }
    },
    onSettled: () => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.timelineEvents(weddingId) });
      void queryClient.invalidateQueries({ queryKey: ["wedding-meta"] });
    },
  });
}

export function useUpdateTimelineEvent(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<TimelineEvent, "time" | "name" | "venue" | "dressCode" | "eventDate">>;
    }) => {
      await updateTimelineEvent(id, patch);
    },
    onMutate: async ({ id, patch }) => {
      if (!weddingId) return {};
      const key = weddingQueryKeys.timelineEvents(weddingId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TimelineEvent[]>(key);
      queryClient.setQueryData<TimelineEvent[]>(key, (old) =>
        (old ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (weddingId && ctx?.previous) {
        queryClient.setQueryData(weddingQueryKeys.timelineEvents(weddingId), ctx.previous);
      }
    },
    onSettled: () => {
      if (weddingId) {
        void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.timelineEvents(weddingId) });
      }
    },
  });
}

/** Deletes event; event_songs and outfit_plans linked to it CASCADE on the DB side. */
export function useDeleteTimelineEvent(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteTimelineEvent(id);
    },
    onMutate: async (id) => {
      if (!weddingId) return {};
      const key = weddingQueryKeys.timelineEvents(weddingId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TimelineEvent[]>(key);
      queryClient.setQueryData<TimelineEvent[]>(key, (old) => (old ?? []).filter((e) => e.id !== id));
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (weddingId && ctx?.previous) {
        queryClient.setQueryData(weddingQueryKeys.timelineEvents(weddingId), ctx.previous);
      }
    },
    onSettled: () => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.timelineEvents(weddingId) });
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.weddingSongs(weddingId) });
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.outfitPlans(weddingId) });
    },
  });
}

export function useCreatePlanningTask(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<PlanningTask, "id">) => {
      if (!weddingId) throw new Error("No wedding loaded");
      await insertPlanningTask(weddingId, input);
    },
    onSettled: () => {
      if (weddingId) {
        void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.planningTasks(weddingId) });
      }
    },
  });
}

export function useDeletePlanningTask(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!weddingId) throw new Error("No wedding loaded");
      await deletePlanningTask(weddingId, id);
    },
    onMutate: async (id) => {
      if (!weddingId) return {};
      const key = weddingQueryKeys.planningTasks(weddingId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PlanningTask[]>(key);
      queryClient.setQueryData<PlanningTask[]>(key, (old) => (old ?? []).filter((t) => t.id !== id));
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (weddingId && ctx?.previous) {
        queryClient.setQueryData(weddingQueryKeys.planningTasks(weddingId), ctx.previous);
      }
    },
    onSettled: () => {
      if (weddingId) {
        void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.planningTasks(weddingId) });
      }
    },
  });
}

export function useSuggestMoreCommonlyMissed(
  weddingId: string | undefined,
  weddingDate: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nonce, existingTasks }: { nonce: number; existingTasks: PlanningTask[] }) => {
      if (!weddingId || !weddingDate) throw new Error("Wedding required");
      const existingTexts = existingTasks.filter((t) => t.commonlyMissed).map((t) => t.task);
      const picks = pickMoreCommonlyMissed(DEFAULT_PLAN_ANSWERS, existingTexts, nonce);
      const items = commonlyMissedItemsToPlanningInputs(picks, weddingDate);
      if (!items.length) return;
      await insertPlanningTasks(weddingId, items);
    },
    onSettled: () => {
      if (weddingId) {
        void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.planningTasks(weddingId) });
      }
    },
  });
}

export function useLoadSuggestions(weddingId: string | undefined, weddingDate: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nonce: number) => {
      if (!weddingId || !weddingDate) throw new Error("Wedding required");
      const pending = await fetchPendingSuggestions(weddingId);
      const usedPoolIds = pending.map((p) => p.poolItemId);
      const result = generateSuggestions(DEFAULT_PLAN_ANSWERS, {
        includeCommonlyMissed: false,
        perCategory: 3,
        nonce,
        excludePoolItemIds: usedPoolIds,
      });
      const items = suggestionsToPendingInputs(result, weddingDate, nonce);
      return syncPendingSuggestionsBatch(weddingId, items, { usedPoolItemIds: usedPoolIds });
    },
    onSuccess: (data) => {
      if (weddingId) {
        queryClient.setQueryData(weddingQueryKeys.pendingSuggestions(weddingId), data);
      }
    },
  });
}

export function useAcceptSuggestion(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      suggestionId,
      task,
      leadTime,
      category,
      commonlyMissed,
      suggestedDate,
    }: {
      suggestionId: string;
      task: string;
      leadTime: string;
      category: string;
      commonlyMissed: boolean;
      suggestedDate: string;
    }) => {
      if (!weddingId) throw new Error("No wedding loaded");
      await insertPlanningTask(weddingId, {
        task,
        leadTime,
        category,
        commonlyMissed,
        done: false,
        suggestedDate,
      });
      await removePendingSuggestion(suggestionId);
    },
    onSettled: () => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.pendingSuggestions(weddingId) });
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.planningTasks(weddingId) });
    },
  });
}

export function useDismissSuggestion(weddingId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await dismissPendingSuggestion(id);
    },
    onSettled: () => {
      if (weddingId) {
        void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.pendingSuggestions(weddingId) });
      }
    },
  });
}
