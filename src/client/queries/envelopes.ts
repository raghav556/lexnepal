import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { anyApi as api } from "convex/server";
import { useDomainBackend } from "@/client/data/provider";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";
import { queryKeys } from "@/client/queries/query-keys";
import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { useCallback } from "react";

export function usePortalSigners() {
  const backend = useDomainBackend("envelopes");
  const convexData = useConvexQuery(api.envelopes.listPortalSigners);
  const nextData = useQuery({
    queryKey: [...queryKeys.envelopes.all, "signers"],
    queryFn: () => apiClient.request("/api/v1/envelopes/signers"),
    enabled: backend === "next",
  });

  return {
    data: backend === "convex" ? convexData : nextData.data,
    isLoading: backend === "convex" ? convexData === undefined : nextData.isLoading,
    error: backend === "convex" ? null : nextData.error,
  };
}

export function useEnvelopes() {
  const backend = useDomainBackend("envelopes");
  const convexData = useConvexQuery(api.envelopes.listEnvelopes);
  const nextData = useQuery({
    queryKey: queryKeys.envelopes.all,
    queryFn: () => apiClient.request("/api/v1/envelopes"),
    enabled: backend === "next",
  });

  return {
    data: backend === "convex" ? convexData : nextData.data,
    isLoading: backend === "convex" ? convexData === undefined : nextData.isLoading,
    error: backend === "convex" ? null : nextData.error,
  };
}

export function useCreateEnvelope(): (input: { documentId: string; routing: string; recipientUserIds: string[]; title?: string; expiresAt?: string }) => Promise<unknown> {
  const backend = useDomainBackend("envelopes");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.envelopes.createEnvelope);
  const nextMutation = useMutation({
    mutationFn: (data: any) => apiClient.request("/api/v1/envelopes", { method: "POST", body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all }),
  });

  return useCallback(
    async (input) => {
      try {
        const result = backend === "convex" ? await convexMutation(input as any) : await nextMutation.mutateAsync(input);
        if (backend === "convex") await queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, nextMutation, queryClient],
  );
}

export function useSendEnvelope(): (input: { envelopeId: string }) => Promise<unknown> {
  const backend = useDomainBackend("envelopes");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.envelopes.sendEnvelope);
  const nextMutation = useMutation({
    mutationFn: ({ envelopeId }: { envelopeId: string }) => apiClient.request(`/api/v1/envelopes/` + envelopeId + `/send`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all }),
  });

  return useCallback(
    async (input) => {
      try {
        const result = backend === "convex" ? await convexMutation(input as any) : await nextMutation.mutateAsync(input);
        if (backend === "convex") await queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, nextMutation, queryClient],
  );
}

export function useVoidEnvelope(): (input: { envelopeId: string; reason: string }) => Promise<unknown> {
  const backend = useDomainBackend("envelopes");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.envelopes.voidEnvelope);
  const nextMutation = useMutation({
    mutationFn: ({ envelopeId, reason }: { envelopeId: string; reason: string }) => 
      apiClient.request(`/api/v1/envelopes/` + envelopeId + `/void`, { method: "POST", body: { reason } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all }),
  });

  return useCallback(
    async (input) => {
      try {
        const result = backend === "convex" ? await convexMutation(input as any) : await nextMutation.mutateAsync(input);
        if (backend === "convex") await queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, nextMutation, queryClient],
  );
}

export function useDeclineEnvelope(): (input: { envelopeId: string; reason: string }) => Promise<unknown> {
  const backend = useDomainBackend("envelopes");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.envelopes.declineEnvelope);
  const nextMutation = useMutation({
    mutationFn: ({ envelopeId, reason }: { envelopeId: string; reason: string }) => 
      apiClient.request(`/api/v1/envelopes/` + envelopeId + `/decline`, { method: "POST", body: { reason } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all }),
  });

  return useCallback(
    async (input) => {
      try {
        const result = backend === "convex" ? await convexMutation(input as any) : await nextMutation.mutateAsync(input);
        if (backend === "convex") await queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, nextMutation, queryClient],
  );
}

export function useIssueOtp(): (input: { envelopeId: string }) => Promise<unknown> {
  const backend = useDomainBackend("envelopes");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.envelopes.issueSigningOtp);
  const nextMutation = useMutation({
    mutationFn: (data: any) => apiClient.request("/api/v1/envelopes/otp/issue", { method: "POST", body: data }),
  });

  return useCallback(
    async (input) => {
      try {
        const result = backend === "convex" ? await convexMutation(input as any) : await nextMutation.mutateAsync(input);
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, nextMutation],
  );
}

export function useVerifyOtp(): (input: { envelopeId: string; otp: string }) => Promise<unknown> {
  const backend = useDomainBackend("envelopes");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.envelopes.verifySigningOtp);
  const nextMutation = useMutation({
    mutationFn: (data: any) => apiClient.request("/api/v1/envelopes/otp/verify", { method: "POST", body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all }),
  });

  return useCallback(
    async (input) => {
      try {
        const result = backend === "convex" ? await convexMutation(input as any) : await nextMutation.mutateAsync(input);
        if (backend === "convex") await queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, nextMutation, queryClient],
  );
}
