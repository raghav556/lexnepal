/* eslint-disable @typescript-eslint/no-explicit-any -- compatibility adapter is removed with Convex rollback */
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
import type { ClientDto } from "@/shared/contracts/domains";

export function useClients(): ClientDto[] | undefined {
  const backend = useDomainBackend("clients");
  const convex = useConvexQuery(api.clients.listClients, backend === "convex" ? {} : "skip") as
    ClientDto[] | undefined;
  const next = useTanstackQuery({
    queryKey: queryKeys.clients.list,
    queryFn: ({ signal }) => apiClient.request<ClientDto[]>("/api/v1/clients", { signal }),
    enabled: backend === "next",
  });
  if (backend === "next" && next.error) throw normalizeApiError(next.error);
  return backend === "convex" ? convex : next.data;
}

export function useMyClient(): ClientDto | null | undefined {
  const backend = useDomainBackend("clients");
  const convex = useConvexQuery(
    api.clients.getMyClientRecord,
    backend === "convex" ? {} : "skip",
  ) as ClientDto | null | undefined;
  const next = useTanstackQuery({
    queryKey: queryKeys.clients.mine,
    queryFn: ({ signal }) => apiClient.request<ClientDto | null>("/api/v1/clients/me", { signal }),
    enabled: backend === "next",
  });
  if (backend === "next" && next.error) throw normalizeApiError(next.error);
  return backend === "convex" ? convex : next.data;
}

export function useKycFiles(clientId: string | null) {
  const backend = useDomainBackend("clients");
  const convex = useConvexQuery(
    api.clients.getClientKycFileUrls,
    backend === "convex" && clientId ? { clientId } : "skip",
  );
  const next = useTanstackQuery({
    queryKey: queryKeys.clients.kycFiles(clientId ?? "none"),
    queryFn: ({ signal }) =>
      apiClient.request<any[]>(`/api/v1/clients/${clientId}/kyc-files`, { signal }),
    enabled: backend === "next" && Boolean(clientId),
  });
  if (backend === "next" && next.error) throw normalizeApiError(next.error);
  return backend === "convex" ? convex : next.data;
}

export function useClientCommands() {
  const backend = useDomainBackend("clients");
  const queryClient = useQueryClient();
  const convexCreate = useConvexMutation(api.clients.createClient);
  const convexUpdate = useConvexMutation(api.clients.updateClient);
  const convexSubmit = useConvexMutation(api.clients.submitKyc);
  const convexReview = useConvexMutation(api.clients.reviewKyc);
  const convexUploadUrl = useConvexMutation(api.documents.generateUploadUrl);
  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
  }, [queryClient]);
  return {
    async create(input: Record<string, unknown>) {
      const result =
        backend === "convex"
          ? await convexCreate(input)
          : await apiClient.request("/api/v1/clients", { method: "POST", body: input });
      await invalidate();
      return result;
    },
    async update(clientId: string, input: Record<string, unknown>) {
      const result =
        backend === "convex"
          ? await convexUpdate({ clientId, ...input })
          : await apiClient.request(`/api/v1/clients/${clientId}`, {
              method: "PATCH",
              body: input,
            });
      await invalidate();
      return result;
    },
    async uploadKycFile(file: File, documentType: "government_id" | "proof_of_address") {
      if (backend === "convex") {
        const uploadUrl = await convexUploadUrl({});
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) throw new Error("KYC upload failed");
        const result = await response.json();
        return {
          name: file.name,
          storageId: result.storageId as string,
          docType: documentType,
          mimeType: file.type,
        };
      }
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const sha256 = [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      const intent = await apiClient.request<{
        intentId: string;
        upload: { url: string; fields: Record<string, string> };
      }>("/api/v1/clients/me/kyc-upload-intents", {
        method: "POST",
        body: {
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          sha256,
          documentType,
        },
      });
      const form = new FormData();
      Object.entries(intent.upload.fields).forEach(([key, value]) => form.append(key, value));
      form.append("file", file);
      const uploaded = await fetch(intent.upload.url, { method: "POST", body: form });
      if (!uploaded.ok) throw new Error("Object storage rejected the KYC upload");
      await apiClient.request(`/api/v1/clients/me/kyc-upload-intents/${intent.intentId}/complete`, {
        method: "POST",
      });
      await waitForCleanIntent(intent.intentId);
      return {
        name: file.name,
        storageId: intent.intentId,
        docType: documentType,
        mimeType: file.type,
      };
    },
    async submitKyc(input: {
      clientId?: string;
      files: Array<{ storageId: string }>;
      address: string;
      idNumber: string;
      consentAccepted: boolean;
    }) {
      const result =
        backend === "convex"
          ? await convexSubmit(input)
          : await apiClient.request("/api/v1/clients/me/kyc-submissions", {
              method: "POST",
              body: {
                uploadIntentIds: input.files.map((file) => file.storageId),
                address: input.address,
                idNumber: input.idNumber,
                consentAccepted: input.consentAccepted,
              },
            });
      await invalidate();
      return result;
    },
    async reviewKyc(clientId: string, decision: "verified" | "rejected", rejectionReason?: string) {
      const result =
        backend === "convex"
          ? await convexReview({ clientId, decision, rejectionReason })
          : await apiClient.request(`/api/v1/clients/${clientId}/kyc-review`, {
              method: "POST",
              body: { decision, rejectionReason },
            });
      await invalidate();
      return result;
    },
  };
}

async function waitForCleanIntent(intentId: string) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const result = await apiClient.request<{ status: string; failureCode?: string }>(
      `/api/v1/clients/me/kyc-upload-intents/${intentId}`,
    );
    if (result.status === "promoted") return;
    if (result.status === "rejected")
      throw new Error(
        `KYC file was rejected${result.failureCode ? `: ${result.failureCode}` : ""}`,
      );
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("KYC scan did not finish in time");
}
