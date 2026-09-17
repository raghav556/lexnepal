/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect } from "react";
import {
  useMutation as useTanstackMutation,
  useQuery as useTanstackQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { ApiClientError, normalizeApiError } from "@/client/api/errors";
import { queryKeys } from "@/client/queries/query-keys";
import { computeSHA256 } from "@/lib/document-utils.ts";
import type {
  DocumentDto,
  ListDocumentsInput,
  SearchDocumentsInput,
} from "@/shared/contracts/domains";

export type DocumentUploadIntentStatus = {
  intentId: string;
  status: string;
  documentId: string | null;
  caseId: string | null;
  originalFileName?: string;
  type?: string | null;
};

async function waitForDocumentIntent(
  intentId: string,
  current?: DocumentUploadIntentStatus,
): Promise<DocumentUploadIntentStatus> {
  let latest = current;
  if (latest?.status === "rejected") {
    throw new Error("The file was rejected during scanning and was not added to this Misl.");
  }
  if (latest?.status === "expired") {
    throw new Error("The upload expired before scanning finished.");
  }
  if (latest?.status === "promoted") return latest;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    latest = await apiClient.request<DocumentUploadIntentStatus>(
      `/api/v1/document-upload-intents/${intentId}`,
    );
    if (latest.status === "promoted") return latest;
    if (latest.status === "rejected") {
      throw new Error("The file was rejected during scanning and was not added to this Misl.");
    }
    if (latest.status === "expired") {
      throw new Error("The upload expired before scanning finished.");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return latest ?? { intentId, status: "scanning", documentId: null, caseId: null };
}

async function uploadViaIntent(input: {
  file: File;
  caseId?: string;
  parentDocumentId?: string;
  metadata?: Record<string, unknown>;
}): Promise<DocumentUploadIntentStatus> {
  const sha256 = await computeSHA256(input.file);
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
      metadata: input.metadata,
    },
  });
  const form = new FormData();
  Object.entries(intent.upload.fields).forEach(([key, value]) => form.append(key, value));
  form.append("file", input.file);
  const uploaded = await fetch(intent.upload.url, { method: "POST", body: form });
  if (!uploaded.ok) throw new Error("Object storage rejected the document upload");
  const completed = await apiClient.request<DocumentUploadIntentStatus>(
    `/api/v1/document-upload-intents/${intent.intentId}/complete`,
    { method: "POST", body: {} },
  );
  const settled = await waitForDocumentIntent(intent.intentId, {
    ...completed,
    intentId: intent.intentId,
  });
  return { ...settled, intentId: intent.intentId };
}

export function useDocuments(filters: ListDocumentsInput | "skip" = {}): DocumentDto[] | undefined {
  const activeFilters = filters === "skip" ? {} : filters;
  const next = useTanstackQuery({
    queryKey: queryKeys.documents.list(activeFilters),
    queryFn: ({ signal }) =>
      apiClient.request<DocumentDto[]>("/api/v1/documents", {
        query: {
          caseId: activeFilters.caseId,
          isTemplate:
            activeFilters.isTemplate === undefined ? undefined : String(activeFilters.isTemplate),
          inTrash: activeFilters.inTrash === undefined ? undefined : String(activeFilters.inTrash),
        },
        signal,
      }),
    enabled: filters !== "skip",
  });
  return next.data;
}

const SCANNING_INTENT_STATUSES = new Set(["pending", "uploaded", "scanning"]);

export function useWatchDocumentUploadIntents(
  intentIds: string[],
  onUpdate: (intent: DocumentUploadIntentStatus) => void,
) {
  const key = [...intentIds].sort().join(",");
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const ids = key.split(",").filter(Boolean);
    const poll = async () => {
      await Promise.all(
        ids.map(async (intentId) => {
          try {
            const next = await apiClient.request<DocumentUploadIntentStatus>(
              `/api/v1/document-upload-intents/${intentId}`,
            );
            if (!cancelled) onUpdate({ ...next, intentId });
          } catch {
            // Keep watching until the scan settles or the row is removed.
          }
        }),
      );
    };
    const timer = window.setInterval(poll, 1500);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [key, onUpdate]);
}

export { SCANNING_INTENT_STATUSES };

export function useDocumentSearch(filters: SearchDocumentsInput | null): DocumentDto[] | undefined {
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
    enabled: filters !== null,
  });
  return filters === null ? undefined : next.data;
}

export function useRecentDocuments(limit: number): DocumentDto[] | undefined {
  const next = useTanstackQuery({
    queryKey: queryKeys.documents.recent(limit),
    queryFn: ({ signal }) =>
      apiClient.request<DocumentDto[]>("/api/v1/documents/recent", { query: { limit }, signal }),
  });
  return next.data;
}

export function useDocumentVersions(documentId: string | null): DocumentDto[] {
  const next = useTanstackQuery({
    queryKey: queryKeys.documents.versions(documentId || "none"),
    queryFn: ({ signal }) =>
      apiClient.request<DocumentDto[]>(`/api/v1/documents/${documentId}/versions`, { signal }),
    enabled: !!documentId,
  });
  return next.data ?? [];
}

/**
 * Uploads the file and its metadata through quarantine, scanning, and promotion.
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();
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
    }): Promise<DocumentUploadIntentStatus> => {
      try {
        const result = await uploadViaIntent({
          file: input.file,
          caseId: input.caseId,
          parentDocumentId: input.parentDocumentId,
          metadata: {
            title: input.title,
            description: input.description,
            type: input.type,
            tags: input.tags,
            isTemplate: input.isTemplate,
            isPrivileged: input.isPrivileged,
            confidentialityLevel: input.confidentialityLevel,
          },
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

export function useUpdateDocument(): (input: {
  id: string;
  updates: Record<string, unknown>;
}) => Promise<unknown> {
  const queryClient = useQueryClient();
  const nextMutation = useTanstackMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) =>
      apiClient.request("/api/v1/documents/" + id, { method: "PATCH", body: updates }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
  });
  return useCallback(
    async (input) => {
      try {
        return await nextMutation.mutateAsync(input);
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [nextMutation],
  );
}

export function useTrashDocument() {
  const queryClient = useQueryClient();
  return useCallback(
    async (documentId: string) => {
      try {
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
    [queryClient],
  );
}

export function useRestoreDocument() {
  const queryClient = useQueryClient();
  return useCallback(
    async (documentId: string) => {
      try {
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
    [queryClient],
  );
}

export function useRestoreDocumentVersion() {
  const queryClient = useQueryClient();
  return useCallback(
    async (input: { documentId: string; versionId: string }) => {
      try {
        const restored = await apiClient.request<DocumentDto>(
          `/api/v1/documents/${input.documentId}/versions/${input.versionId}/restore`,
          { method: "POST", body: {} },
        );
        await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
        return restored;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [queryClient],
  );
}

export function useHardDeleteDocument() {
  const queryClient = useQueryClient();
  return useCallback(
    async (documentId: string) => {
      try {
        return await apiClient.request(`/api/v1/documents/${documentId}`, { method: "DELETE" });
      } catch (error) {
        throw normalizeApiError(error);
      } finally {
        await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
      }
    },
    [queryClient],
  );
}

export function useDownloadDocument() {
  return useCallback(async (documentId: string) => {
    try {
      const result = await apiClient.request<{ url: string }>(
        `/api/v1/documents/${documentId}/download`,
      );
      return result.url;
    } catch (error) {
      throw normalizeApiError(error);
    }
  }, []);
}

export function useDownloadDocumentArchive() {
  return useCallback(async (documentIds: string[]) => {
    try {
      const response = await fetch("/api/v1/documents/download-zip", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentIds }),
      });
      if (!response.ok) throw await ApiClientError.fromResponse(response);
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const fileName = disposition.match(/filename="([^"]+)"/i)?.[1] || "documents.zip";
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
      return { fileName, sizeBytes: blob.size };
    } catch (error) {
      throw normalizeApiError(error);
    }
  }, []);
}

export function useSetLegalHold(): (input: {
  documentId: string;
  reason: string;
}) => Promise<unknown> {
  const queryClient = useQueryClient();
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
        return await nextMutation.mutateAsync(input);
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [nextMutation],
  );
}

export function useShareDocument(): (input: {
  documentId: string;
  shareData: Record<string, unknown>;
}) => Promise<string> {
  const queryClient = useQueryClient();
  return useCallback(
    async (input) => {
      try {
        const result = await apiClient.request<{ token: string }>(
          "/api/v1/documents/" + input.documentId + "/share",
          { method: "POST", body: input.shareData },
        );
        await queryClient.invalidateQueries({
          queryKey: ["documents", "shares", input.documentId],
        });
        return result.token;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [queryClient],
  );
}

export function useRevokeDocumentShare() {
  const queryClient = useQueryClient();
  return useCallback(
    async (input: { documentId: string; shareId: string }) => {
      try {
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
    [queryClient],
  );
}

export function useDocumentShares(documentId: string | null) {
  const next = useTanstackQuery({
    queryKey: ["documents", "shares", documentId],
    queryFn: ({ signal }) =>
      apiClient.request<any[]>(`/api/v1/documents/${documentId}/share`, { signal }),
    enabled: !!documentId,
  });
  return next.data ?? [];
}

export function usePublicSharedDocument() {
  return {
    get: useCallback(
      async (token: string, password?: string) =>
        apiClient.request(`/api/v1/public/document-shares/${token}`, {
          method: "POST",
          body: { password },
        }),
      [],
    ),
    download: useCallback(
      async (token: string, password?: string) =>
        apiClient.request<{ isPasswordRequired: boolean; url?: string }>(
          `/api/v1/public/document-shares/${token}/download`,
          { method: "POST", body: { password } },
        ),
      [],
    ),
  };
}

/**
 * Queues server-side text extraction. Returns once the job is accepted, not once text is ready —
 * the extracted text lands in the document's `searchableText` and powers document search.
 */
export function useExtractDocumentText() {
  const queryClient = useQueryClient();
  return useCallback(
    async (documentId: string) => {
      try {
        return await apiClient.request<{ jobId: string; status: string; queued: boolean }>(
          `/api/v1/documents/${documentId}/extract-text`,
          { method: "POST", body: {} },
        );
      } catch (error) {
        throw normalizeApiError(error);
      } finally {
        await queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
      }
    },
    [queryClient],
  );
}
