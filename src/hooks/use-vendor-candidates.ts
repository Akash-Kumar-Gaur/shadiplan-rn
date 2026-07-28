import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateVendorCandidateInput,
  VendorCandidate,
  VendorCandidateFile,
  VendorCategory,
} from "../types/wedding";
import {
  deleteCandidateFile,
  insertVendorCandidate,
  promoteCandidate,
  rejectOtherCandidatesInCategory,
  updateVendorCandidateStatus,
  uploadCandidateFile,
  fetchVendorCandidates,
} from "../lib/vendor-candidates-api";
import { weddingQueryKeys } from "../lib/wedding-query-keys";
import { scheduleVendorReminder } from "../lib/vendor-reminders";

export function useVendorCandidates(weddingId: string | undefined) {
  return useQuery({
    queryKey: weddingQueryKeys.vendorCandidates(weddingId ?? ""),
    queryFn: () => fetchVendorCandidates(weddingId!),
    enabled: !!weddingId,
  });
}

export function useCreateVendorCandidate(weddingId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVendorCandidateInput) => {
      if (!weddingId) throw new Error("No wedding loaded");
      return insertVendorCandidate(weddingId, input);
    },
    onSuccess: () => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({
        queryKey: weddingQueryKeys.vendorCandidates(weddingId),
      });
    },
  });
}

export function useUploadCandidateFile(weddingId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      candidateId,
      localUri,
      fileName,
    }: {
      candidateId: string;
      localUri: string;
      fileName: string;
    }) => {
      if (!weddingId) throw new Error("No wedding loaded");
      return uploadCandidateFile(weddingId, candidateId, localUri, fileName);
    },
    onSuccess: () => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({
        queryKey: weddingQueryKeys.vendorCandidates(weddingId),
      });
    },
  });
}

export function useDeleteCandidateFile(weddingId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: VendorCandidateFile) => deleteCandidateFile(file),
    onSuccess: () => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({
        queryKey: weddingQueryKeys.vendorCandidates(weddingId),
      });
    },
  });
}

export function useUpdateCandidateStatus(weddingId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      candidateId,
      status,
    }: {
      candidateId: string;
      status: "considering" | "promoted" | "rejected";
    }) => updateVendorCandidateStatus(candidateId, status),
    onSuccess: () => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({
        queryKey: weddingQueryKeys.vendorCandidates(weddingId),
      });
    },
  });
}

export function usePromoteCandidate(weddingId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      candidate,
      rejectOthers,
    }: {
      candidate: VendorCandidate;
      rejectOthers: boolean;
    }) => {
      if (!weddingId) throw new Error("No wedding loaded");
      const vendor = await promoteCandidate(candidate);
      if (rejectOthers) {
        await rejectOtherCandidatesInCategory(weddingId, candidate.category, candidate.id);
      }
      return vendor;
    },
    onSuccess: (vendor) => {
      if (!weddingId) return;
      void queryClient.invalidateQueries({
        queryKey: weddingQueryKeys.vendorCandidates(weddingId),
      });
      void queryClient.invalidateQueries({ queryKey: weddingQueryKeys.vendors(weddingId) });
      void scheduleVendorReminder(vendor);
    },
  });
}

export type { VendorCategory };
