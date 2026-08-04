import { useCallback } from "react";
import { useQuery as useTanstackQuery, useQueryClient } from "@tanstack/react-query";
import { anyApi as api } from "convex/server";
import {
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "@/client/data/convex-bridge";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";
import { useDomainBackend } from "@/client/data/provider";
import { queryKeys } from "@/client/queries/query-keys";

export function usePortalSigners() {
  const backend = useDomainBackend("envelopes");
  const convex = useConvexQuery(
    api.envelopes.listPortalSigners,
    backend === "convex" ? {} : "skip",
  );
  const next = useTanstackQuery({
    queryKey: [...queryKeys.envelopes.all, "signers"],
    queryFn: ({ signal }) =>
      apiClient.request<any[]>("/api/v1/envelopes/signers", { signal }),
    enabled: backend === "next",
  });
  return (backend === "convex" ? convex : next.data) ?? [];
}

export function useEnvelopes() {
  const backend = useDomainBackend("envelopes");
  const convex = useConvexQuery(
    api.envelopes.listEnvelopes,
    backend === "convex" ? {} : "skip",
  );
  const next = useTanstackQuery({
    queryKey: queryKeys.envelopes.all,
    queryFn: ({ signal }) => apiClient.request<any[]>("/api/v1/envelopes", { signal }),
    enabled: backend === "next",
  });
  return (backend === "convex" ? convex : next.data) ?? [];
}

export function useMyPendingEnvelopeActions() {
  const backend = useDomainBackend("envelopes");
  const convex = useConvexQuery(
    api.envelopes.listMyPendingEnvelopeActions,
    backend === "convex" ? {} : "skip",
  );
  const next = useTanstackQuery({
    queryKey: [...queryKeys.envelopes.all, "pending"],
    queryFn: ({ signal }) =>
      apiClient.request<any[]>("/api/v1/envelopes/pending", { signal }),
    enabled: backend === "next",
    refetchInterval: backend === "next" ? 10_000 : false,
  });
  return (backend === "convex" ? convex : next.data) ?? [];
}

export function useCreateEnvelope() {
  const backend = useDomainBackend("envelopes");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.envelopes.createEnvelope);
  return useCallback(
    async (input: {
      documentId: string;
      routing: string;
      recipientUserIds: string[];
      title?: string;
      expiresAt?: string;
    }) => {
      try {
        if (backend === "convex") {
          const result = await convexMutation(input as any);
          await queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all });
          return result;
        }
        const result = await apiClient.request<{ envelopeId: string }>("/api/v1/envelopes", {
          method: "POST",
          body: input,
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, queryClient],
  );
}

export function useSendEnvelope() {
  const backend = useDomainBackend("envelopes");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.envelopes.sendEnvelope);
  return useCallback(
    async (input: { envelopeId: string }) => {
      try {
        if (backend === "convex") {
          const result = await convexMutation(input as any);
          await queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all });
          return result;
        }
        const result = await apiClient.request(`/api/v1/envelopes/${input.envelopeId}/send`, {
          method: "POST",
          body: {},
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, queryClient],
  );
}

export function useVoidEnvelope() {
  const backend = useDomainBackend("envelopes");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.envelopes.voidEnvelope);
  return useCallback(
    async (input: { envelopeId: string; reason: string }) => {
      try {
        if (backend === "convex") {
          const result = await convexMutation(input as any);
          await queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all });
          return result;
        }
        const result = await apiClient.request(`/api/v1/envelopes/${input.envelopeId}/void`, {
          method: "POST",
          body: { reason: input.reason },
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, queryClient],
  );
}

export function useDeclineEnvelope() {
  const backend = useDomainBackend("envelopes");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.envelopes.declineEnvelope);
  return useCallback(
    async (input: { envelopeId: string; reason: string }) => {
      try {
        if (backend === "convex") {
          const result = await convexMutation(input as any);
          await queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all });
          return result;
        }
        const result = await apiClient.request(`/api/v1/envelopes/${input.envelopeId}/decline`, {
          method: "POST",
          body: { reason: input.reason },
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, queryClient],
  );
}

export function useIssueOtp() {
  const backend = useDomainBackend("envelopes");
  const convexMutation = useConvexMutation(api.envelopes.issueSigningOtp);
  return useCallback(
    async (input: { documentId: string; envelopeId?: string }) => {
      try {
        if (backend === "convex") return await convexMutation(input as any);
        return await apiClient.request<{
          challengeId: string;
          expiresAt: number;
          demoCode?: string;
        }>("/api/v1/envelopes/otp/issue", { method: "POST", body: input });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation],
  );
}

export function useVerifyOtp() {
  const backend = useDomainBackend("envelopes");
  const convexMutation = useConvexMutation(api.envelopes.verifySigningOtp);
  return useCallback(
    async (input: { challengeId: string; code: string }) => {
      try {
        if (backend === "convex") return await convexMutation(input as any);
        return await apiClient.request("/api/v1/envelopes/otp/verify", {
          method: "POST",
          body: input,
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation],
  );
}

export function useSignDocument() {
  const backend = useDomainBackend("envelopes");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.documents.signDocument);
  return useCallback(
    async (input: Record<string, unknown>) => {
      try {
        if (backend === "convex") {
          const result = await convexMutation(input as any);
          await queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all });
          await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
          return result;
        }
        const result = await apiClient.request("/api/v1/envelopes/sign", {
          method: "POST",
          body: input,
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.envelopes.all });
        await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, queryClient],
  );
}

export function useMarkDocumentViewed() {
  const backend = useDomainBackend("envelopes");
  const convexMutation = useConvexMutation(api.documents.markDocumentViewed);
  return useCallback(
    async (input: { documentId: string }) => {
      try {
        if (backend === "convex") return await convexMutation(input as any);
        return await apiClient.request("/api/v1/envelopes/mark-viewed", {
          method: "POST",
          body: input,
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation],
  );
}

export function useRequestSignature() {
  const backend = useDomainBackend("envelopes");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.documents.requestSignature);
  return useCallback(
    async (input: { documentId: string; intendedSignerUserId?: string }) => {
      try {
        if (backend === "convex") {
          const result = await convexMutation(input as any);
          await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
          return result;
        }
        const result = await apiClient.request("/api/v1/envelopes/request-signature", {
          method: "POST",
          body: input,
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, queryClient],
  );
}
