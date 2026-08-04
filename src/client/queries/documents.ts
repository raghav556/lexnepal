/* eslint-disable @typescript-eslint/no-explicit-any */
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

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function uploadViaIntent(input: {
  file: File;
  caseId?: string;
  parentDocumentId?: string;
}) {
  const sha256 = await sha256Hex(input.file);
  const intent = await apiClient.request<{
    intentId: string;
    upload: { url: string; fields: Record<string, string> };
  }>("/api/v1/document-upload-intents", {
    method: "POST",
    body: {
      fileName: input.file.name,
      mimeType: input.file.type || "application/octet-stream",
      sizeBytes: input.file.size,
      sha256,
      caseId: input.caseId,
      parentDocumentId: input.parentDocumentId,
    },
  });
  const form = new FormData();
  Object.entries(intent.upload.fields).forEach(([key, value]) => form.append(key, value));
  form.append("file", input.file);
  const uploaded = await fetch(intent.upload.url, { method: "POST", body: form });
  if (!uploaded.ok) throw new Error("Object storage rejected the document upload");
  return apiClient.request<{ status: string }>(
    `/api/v1/document-upload-intents/${intent.intentId}/complete`,
    { method: "POST", body: {} },
  );
}

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
        query: {
          caseId: filters.caseId,
          isTemplate:
            filters.isTemplate === undefined ? undefined : String(filters.isTemplate),
          inTrash: filters.inTrash === undefined ? undefined : String(filters.inTrash),
        },
        signal,
      }),
    enabled: backend === "next",
  });
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
        query: {
          query: filters!.query,
          caseId: filters!.caseId,
          type: filters!.type,
          tag: filters!.tag,
          generalOnly:
            filters!.generalOnly === undefined ? undefined : String(filters!.generalOnly),
        },
        signal,
      }),
    enabled: backend === "next" && filters !== null,
  });
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
  return backend === "convex" ? convex : next.data;
}

export function useUploadDocument() {
  const backend = useDomainBackend("documents");
  const queryClient = useQueryClient();
  const convexUploadUrl = useConvexMutation(api.documents.generateUploadUrl);
  const convexCreate = useConvexMutation(api.documents.createDocument);

  return useCallback(
    async (input: {
      file: File;
      caseId?: string;
      parentDocumentId?: string;
      title?: string;
      type?: string;
      tags?: string[];
      isTemplate?: boolean;
      isPrivileged?: boolean;
      confidentialityLevel?: string;
      description?: string;
    }) => {
      try {
        if (backend === "convex") {
          const postUrl = await convexUploadUrl();
          let storageId = "";
          if (postUrl === "mock-upload-url") {
            storageId = URL.createObjectURL(input.file);
          } else {
            const result = await fetch(postUrl, {
              method: "POST",
              headers: { "Content-Type": input.file.type || "application/octet-stream" },
              body: input.file,
            });
            if (!result.ok) throw new Error("Upload failed");
            storageId = (await result.json()).storageId;
          }
          const created = await convexCreate({
            caseId: input.caseId,
            title: input.title || input.file.name,
            type: input.type || "other",
            storageId,
            mimeType: input.file.type || "application/octet-stream",
            sizeBytes: input.file.size,
            tags: input.tags || [],
            isTemplate: input.isTemplate || false,
            isPrivileged: input.isPrivileged || false,
            confidentialityLevel: input.confidentialityLevel,
            description: input.description,
            ...(input.parentDocumentId ? { parentDocumentId: input.parentDocumentId } : {}),
          });
          await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
          return created;
        }
        const result = await uploadViaIntent({
          file: input.file,
          caseId: input.caseId,
          parentDocumentId: input.parentDocumentId,
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexCreate, convexUploadUrl, queryClient],
  );
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
        if (backend === "next") {
          throw new Error(
            "Direct document create is disabled on Next. Use the secure upload intent flow.",
          );
        }
        const result = await convexMutation(input);
        await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, nextMutation, queryClient],
  );
}

export function useUpdateDocument(): (input: {
  id: string;
  updates: Record<string, unknown>;
}) => Promise<unknown> {
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
        const result =
          backend === "convex"
            ? await convexMutation(input)
            : await nextMutation.mutateAsync(input);
        if (backend === "convex") {
          await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
        }
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, nextMutation, queryClient],
  );
}

export function useTrashDocument() {
  const backend = useDomainBackend("documents");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.documents.trashDocument);
  return useCallback(
    async (documentId: string) => {
      try {
        if (backend === "convex") return await convexMutation({ documentId });
        return await apiClient.request(`/api/v1/documents/${documentId}/trash`, {
          method: "POST",
          body: {},
        });
      } catch (error) {
        throw normalizeApiError(error);
      } finally {
        await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
      }
    },
    [backend, convexMutation, queryClient],
  );
}

export function useRestoreDocument() {
  const backend = useDomainBackend("documents");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.documents.restoreDocument);
  return useCallback(
    async (documentId: string) => {
      try {
        if (backend === "convex") return await convexMutation({ documentId });
        return await apiClient.request(`/api/v1/documents/${documentId}/restore`, {
          method: "POST",
          body: {},
        });
      } catch (error) {
        throw normalizeApiError(error);
      } finally {
        await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
      }
    },
    [backend, convexMutation, queryClient],
  );
}

export function useHardDeleteDocument() {
  const backend = useDomainBackend("documents");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.documents.hardDeleteDocument);
  return useCallback(
    async (documentId: string) => {
      try {
        if (backend === "convex") return await convexMutation({ documentId });
        return await apiClient.request(`/api/v1/documents/${documentId}`, { method: "DELETE" });
      } catch (error) {
        throw normalizeApiError(error);
      } finally {
        await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
      }
    },
    [backend, convexMutation, queryClient],
  );
}

export function useDownloadDocument() {
  const backend = useDomainBackend("documents");
  const convexUrl = useConvexMutation(api.documents.getFileUrl as any);
  return useCallback(
    async (documentId: string, storageId?: string) => {
      try {
        if (backend === "convex") {
          return await convexUrl({ storageId: storageId || documentId });
        }
        const result = await apiClient.request<{ url: string }>(
          `/api/v1/documents/${documentId}/download`,
        );
        return result.url;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexUrl],
  );
}

export function useSetLegalHold(): (input: {
  documentId: string;
  reason: string;
}) => Promise<unknown> {
  const backend = useDomainBackend("documents");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.documentSecurity.setLegalHold);
  const nextMutation = useTanstackMutation({
    mutationFn: ({ documentId, reason }: { documentId: string; reason: string }) =>
      apiClient.request("/api/v1/documents/" + documentId, {
        method: "PATCH",
        body: { isOnLegalHold: true, legalHoldReason: reason },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
  });
  return useCallback(
    async (input) => {
      try {
        const result =
          backend === "convex"
            ? await convexMutation(input)
            : await nextMutation.mutateAsync(input);
        if (backend === "convex") {
          await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
        }
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, nextMutation, queryClient],
  );
}

export function useShareDocument(): (input: {
  documentId: string;
  shareData: Record<string, unknown>;
}) => Promise<string> {
  const backend = useDomainBackend("documents");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.documents.createShareLink as any);
  return useCallback(
    async (input) => {
      try {
        if (backend === "convex") {
          const token = await convexMutation({
            documentId: input.documentId,
            ...input.shareData,
          });
          await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
          return String(token);
        }
        const result = await apiClient.request<{ token: string }>(
          "/api/v1/documents/" + input.documentId + "/share",
          { method: "POST", body: input.shareData },
        );
        await queryClient.invalidateQueries({ queryKey: ["documents", "shares", input.documentId] });
        return result.token;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, queryClient],
  );
}

export function useRevokeDocumentShare() {
  const backend = useDomainBackend("documents");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.documents.revokeShareLink as any);
  return useCallback(
    async (input: { documentId: string; shareId: string }) => {
      try {
        if (backend === "convex") {
          return await convexMutation({ shareId: input.shareId });
        }
        return await apiClient.request(`/api/v1/documents/${input.documentId}/share`, {
          method: "DELETE",
          query: { shareId: input.shareId },
        });
      } catch (error) {
        throw normalizeApiError(error);
      } finally {
        await queryClient.invalidateQueries({
          queryKey: ["documents", "shares", input.documentId],
        });
      }
    },
    [backend, convexMutation, queryClient],
  );
}

export function useDocumentShares(documentId: string | null) {
  const backend = useDomainBackend("documents");
  const convex = useConvexQuery(
    api.documents.listShareLinks as any,
    backend === "convex" && documentId ? { documentId } : "skip",
  );
  const next = useTanstackQuery({
    queryKey: ["documents", "shares", documentId],
    queryFn: ({ signal }) =>
      apiClient.request<any[]>(`/api/v1/documents/${documentId}/share`, { signal }),
    enabled: backend === "next" && !!documentId,
  });
  return (backend === "convex" ? convex : next.data) ?? [];
}

export function usePublicSharedDocument() {
  const backend = useDomainBackend("documents");
  const convexGet = useConvexMutation(api.documents.getSharedDocument);
  const convexDownload = useConvexMutation(api.documents.downloadSharedDocument);
  return {
    get: useCallback(
      async (token: string, password?: string) => {
        if (backend === "convex") return await convexGet({ token, password });
        return await apiClient.request(`/api/v1/public/document-shares/${token}`, {
          method: "POST",
          body: { password },
        });
      },
      [backend, convexGet],
    ),
    download: useCallback(
      async (token: string, password?: string) => {
        if (backend === "convex") return await convexDownload({ token, password });
        return await apiClient.request<{ isPasswordRequired: boolean; url?: string }>(
          `/api/v1/public/document-shares/${token}/download`,
          { method: "POST", body: { password } },
        );
      },
      [backend, convexDownload],
    ),
  };
}

