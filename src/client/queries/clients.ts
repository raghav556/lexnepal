/* eslint-disable @typescript-eslint/no-explicit-any -- KYC file rows are view-shaped, not a contract DTO */
import { useCallback } from "react";
import { useQuery as useTanstackQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { queryKeys } from "@/client/queries/query-keys";
import { computeSHA256 } from "@/lib/document-utils.ts";
import type { ClientDto } from "@/shared/contracts/domains";

export function useClients(): ClientDto[] | undefined {
  return useTanstackQuery({
    queryKey: queryKeys.clients.list,
    queryFn: ({ signal }) => apiClient.request<ClientDto[]>("/api/v1/clients", { signal }),
  }).data;
}

export function useMyClient(): ClientDto | null | undefined {
  const { data, isPending, isError } = useTanstackQuery({
    queryKey: queryKeys.clients.mine,
    queryFn: ({ signal }) => apiClient.request<ClientDto | null>("/api/v1/clients/me", { signal }),
    retry: 1,
    staleTime: 30_000,
  });
  if (isPending) return undefined;
  if (isError) return null;
  return data ?? null;
}

/** Advocates/team on the caller's matters — client-safe (no staff directory). */
export function useMyTeam():
  | Array<{
      id: string;
      _id: string;
      name: string;
      email: string;
      role: string;
      avatar: string | null;
    }>
  | undefined {
  return useTanstackQuery({
    queryKey: queryKeys.clients.myTeam,
    queryFn: ({ signal }) =>
      apiClient.request<
        Array<{
          id: string;
          _id: string;
          name: string;
          email: string;
          role: string;
          avatar: string | null;
        }>
      >("/api/v1/clients/me/team", { signal }),
    retry: 1,
    staleTime: 60_000,
  }).data;
}

export function useKycFiles(clientId: string | null) {
  return useTanstackQuery({
    queryKey: queryKeys.clients.kycFiles(clientId ?? "none"),
    queryFn: ({ signal }) =>
      apiClient.request<any[]>(`/api/v1/clients/${clientId}/kyc-files`, { signal }),
    enabled: Boolean(clientId),
  }).data;
}

export function useClientCommands() {
  const queryClient = useQueryClient();
  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
  }, [queryClient]);
  return {
    async create(input: Record<string, unknown>) {
      const result = await apiClient.request("/api/v1/clients", { method: "POST", body: input });
      await invalidate();
      return result;
    },
    async update(clientId: string, input: Record<string, unknown>) {
      const result = await apiClient.request(`/api/v1/clients/${clientId}`, {
        method: "PATCH",
        body: input,
      });
      await invalidate();
      return result;
    },
    /**
     * Uploads a KYC file through the quarantine intent flow: request an intent, PUT the bytes to
     * object storage, mark it complete, then poll until the scanner promotes it.
     */
    async uploadKycFile(file: File, documentType: "government_id" | "proof_of_address") {
      const sha256 = await computeSHA256(file);
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
      const result = await apiClient.request("/api/v1/clients/me/kyc-submissions", {
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
      const result = await apiClient.request(`/api/v1/clients/${clientId}/kyc-review`, {
        method: "POST",
        body: { decision, rejectionReason },
      });
      await invalidate();
      return result;
    },
    async grantPortalAccess(clientId: string) {
      const result = await apiClient.request<{
        client: ClientDto;
        user: { id: string; email: string | null; isPending: boolean; isActive: boolean };
        created: boolean;
        linked: boolean;
        inviteSent: boolean;
        alreadyLinked: boolean;
      }>(`/api/v1/clients/${clientId}/portal-access`, { method: "POST" });
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({ queryKey: queryKeys.identity.all }),
      ]);
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
