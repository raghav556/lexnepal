/* eslint-disable @typescript-eslint/no-explicit-any -- envelope and signer rows are view-shaped, not contract DTOs */
import { useCallback } from "react";
import { useQuery as useTanstackQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";
import { queryKeys } from "@/client/queries/query-keys";

export function usePortalSigners() {
  return (
    useTanstackQuery({
      queryKey: [...queryKeys.envelopes.all, "signers"],
      queryFn: ({ signal }) => apiClient.request<any[]>("/api/v1/envelopes/signers", { signal }),
    }).data ?? []
  );
}

export function useEnvelopes() {
  return (
    useTanstackQuery({
      queryKey: queryKeys.envelopes.all,
      queryFn: ({ signal }) => apiClient.request<any[]>("/api/v1/envelopes", { signal }),
    }).data ?? []
  );
}

export function useMyPendingEnvelopeActions() {
  return (
    useTanstackQuery({
      queryKey: [...queryKeys.envelopes.all, "pending"],
      queryFn: ({ signal }) => apiClient.request<any[]>("/api/v1/envelopes/pending", { signal }),
      refetchInterval: 10_000,
    }).data ?? []
  );
}

export function useCreateEnvelope() {
  const queryClient = useQueryClient();
  return useCallback(
    async (input: {
      documentId: string;
      routing: string;
      recipientUserIds: string[];
      title?: string;
      expiresAt?: string;
    }) => {
      try {
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
    [queryClient],
  );
}

export function useSendEnvelope() {
  const queryClient = useQueryClient();
  return useCallback(
    async (input: { envelopeId: string }) => {
      try {
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
    [queryClient],
  );
}

export function useVoidEnvelope() {
  const queryClient = useQueryClient();
  return useCallback(
    async (input: { envelopeId: string; reason: string }) => {
      try {
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
    [queryClient],
  );
}

export function useDeclineEnvelope() {
  const queryClient = useQueryClient();
  return useCallback(
    async (input: { envelopeId: string; reason: string }) => {
      try {
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
    [queryClient],
  );
}

export function useIssueOtp() {
  return useCallback(async (input: { documentId: string; envelopeId?: string }) => {
    try {
      return await apiClient.request<{
        challengeId: string;
        expiresAt: number;
        demoCode?: string;
      }>("/api/v1/envelopes/otp/issue", { method: "POST", body: input });
    } catch (error) {
      throw normalizeApiError(error);
    }
  }, []);
}

export function useVerifyOtp() {
  return useCallback(async (input: { challengeId: string; code: string }) => {
    try {
      return await apiClient.request("/api/v1/envelopes/otp/verify", {
        method: "POST",
        body: input,
      });
    } catch (error) {
      throw normalizeApiError(error);
    }
  }, []);
}

export function useSignDocument() {
  const queryClient = useQueryClient();
  return useCallback(
    async (input: Record<string, unknown>) => {
      try {
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
    [queryClient],
  );
}

export function useMarkDocumentViewed() {
  return useCallback(async (input: { documentId: string }) => {
    try {
      return await apiClient.request("/api/v1/envelopes/mark-viewed", {
        method: "POST",
        body: input,
      });
    } catch (error) {
      throw normalizeApiError(error);
    }
  }, []);
}

export function useRequestSignature() {
  const queryClient = useQueryClient();
  return useCallback(
    async (input: { documentId: string; intendedSignerUserId?: string }) => {
      try {
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
    [queryClient],
  );
}
