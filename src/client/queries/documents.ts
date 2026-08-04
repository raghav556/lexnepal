import { useCallback } from "react";
import {
  useMutation as useTanstackMutation,
  useQuery as useTanstackQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { anyApi as api } from "convex/server";
import {
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "@/client/data/convex-bridge";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";
import { useDomainBackend } from "@/client/data/provider";
import { queryKeys } from "@/client/queries/query-keys";
import type {
  DocumentDto,
  ListDocumentsInput,
  SearchDocumentsInput,
} from "@/shared/contracts/domains";

export function useDocuments(filters: ListDocumentsInput = {}): DocumentDto[] | undefined {
  const backend = useDomainBackend("documents");
  const convex = useConvexQuery(
    api.documents.listDocuments,
    backend === "convex" ? filters : "skip",
  ) as DocumentDto[] | undefined;
  const next = useTanstackQuery({
    queryKey: queryKeys.documents.list(filters),
    queryFn: ({ signal }) =>
      apiClient.request<DocumentDto[]>("/api/v1/documents", {
        query: { ...filters },
        signal,
      }),
    enabled: backend === "next",
  });
  if (backend === "next" && next.error) throw normalizeApiError(next.error);
  return backend === "convex" ? convex : next.data;
}

export function useDocumentSearch(filters: SearchDocumentsInput | null): DocumentDto[] | undefined {
  const backend = useDomainBackend("documents");
  const convex = useConvexQuery(
    api.documents.searchDocuments,
    backend === "convex" && filters ? filters : "skip",
  ) as DocumentDto[] | undefined;
  const next = useTanstackQuery({
    queryKey: queryKeys.documents.search(filters),
    queryFn: ({ signal }) =>
      apiClient.request<DocumentDto[]>("/api/v1/documents/search", {
        query: { ...(filters ?? {}) },
        signal,
      }),
    enabled: backend === "next" && filters !== null,
  });
  if (backend === "next" && next.error) throw normalizeApiError(next.error);
  return filters === null ? undefined : backend === "convex" ? convex : next.data;
}

export function useRecentDocuments(limit: number): DocumentDto[] | undefined {
  const backend = useDomainBackend("documents");
  const convex = useConvexQuery(
    api.documents.getRecentDocuments,
    backend === "convex" ? { limit } : "skip",
  ) as DocumentDto[] | undefined;
  const next = useTanstackQuery({
    queryKey: queryKeys.documents.recent(limit),
    queryFn: ({ signal }) =>
      apiClient.request<DocumentDto[]>("/api/v1/documents/recent", { query: { limit }, signal }),
    enabled: backend === "next",
  });
  if (backend === "next" && next.error) throw normalizeApiError(next.error);
  return backend === "convex" ? convex : next.data;
}

export function useCreateDocument(): (input: Record<string, unknown>) => Promise<unknown> {
  const backend = useDomainBackend("documents");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.documents.createDocument);
  const nextMutation = useTanstackMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiClient.request("/api/v1/documents", { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
  });
  return useCallback(
    async (input: Record<string, unknown>) => {
      try {
        const result =
          backend === "convex"
            ? await convexMutation(input)
            : await nextMutation.mutateAsync(input);
        if (backend === "convex")
          await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, nextMutation, queryClient],
  );
}

export function useUpdateDocument(): (input: { id: string; updates: Record<string, unknown> }) => Promise<unknown> {
  const backend = useDomainBackend("documents");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.documents.updateDocument);
  const nextMutation = useTanstackMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) =>
      apiClient.request("/api/v1/documents/" + id, { method: "PATCH", body: updates }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
  });
  return useCallback(
    async (input) => {
      try {
        const result = backend === "convex" ? await convexMutation(input) : await nextMutation.mutateAsync(input);
        if (backend === "convex") await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, nextMutation, queryClient],
  );
}

export function useSetLegalHold(): (input: { documentId: string; reason: string }) => Promise<unknown> {
  const backend = useDomainBackend("documents");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.documentSecurity.setLegalHold);
  const nextMutation = useTanstackMutation({
    mutationFn: ({ documentId, reason }: { documentId: string; reason: string }) =>
      apiClient.request("/api/v1/documents/" + documentId, { method: "PATCH", body: { isOnLegalHold: true, legalHoldReason: reason } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
  });
  return useCallback(
    async (input) => {
      try {
        const result = backend === "convex" ? await convexMutation(input) : await nextMutation.mutateAsync(input);
        if (backend === "convex") await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, nextMutation, queryClient],
  );
}

export function useShareDocument(): (input: { documentId: string; shareData: Record<string, unknown> }) => Promise<unknown> {
  const backend = useDomainBackend("documents");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.documents.createShare); // Or wherever it lives in convex
  const nextMutation = useTanstackMutation({
    mutationFn: ({ documentId, shareData }: { documentId: string; shareData: Record<string, unknown> }) =>
      apiClient.request("/api/v1/documents/" + documentId + "/share", { method: "POST", body: shareData }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
  });
  return useCallback(
    async (input) => {
      try {
        const result = backend === "convex" ? await convexMutation(input) : await nextMutation.mutateAsync(input);
        if (backend === "convex") await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, nextMutation, queryClient],
  );
}
