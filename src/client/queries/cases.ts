/* eslint-disable @typescript-eslint/no-explicit-any -- case detail payload is view-shaped, not a contract DTO */
import { useCallback } from "react";
import {
  useMutation as useTanstackMutation,
  useQuery as useTanstackQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";
import { queryKeys } from "@/client/queries/query-keys";
import type { CaseDto, ClientCaseDto, ListCasesInput } from "@/shared/contracts/domains";

export function useCasesQuery(filters: ListCasesInput = {}) {
  return useTanstackQuery({
    queryKey: queryKeys.cases.list(filters),
    queryFn: ({ signal }) =>
      apiClient.request<CaseDto[]>("/api/v1/cases", { query: { ...filters }, signal }),
  });
}

export function useCases(filters: ListCasesInput = {}): CaseDto[] | undefined {
  return useCasesQuery(filters).data;
}

/** Client portal list — server returns ClientCaseDto allowlist, not the Staff CaseDto. */
export function useClientCasesQuery(filters: ListCasesInput = {}) {
  return useTanstackQuery({
    queryKey: queryKeys.cases.list(filters),
    queryFn: ({ signal }) =>
      apiClient.request<ClientCaseDto[]>("/api/v1/cases", { query: { ...filters }, signal }),
  });
}

export function useClientCases(filters: ListCasesInput = {}): ClientCaseDto[] | undefined {
  return useClientCasesQuery(filters).data;
}

/** Client portal detail — typed allowlist; never treat this as Staff CaseDto. */
export function useClientCaseQuery(caseId: string | null) {
  return useTanstackQuery({
    queryKey: [...queryKeys.cases.detail(caseId ?? "none"), "client"],
    queryFn: ({ signal }) =>
      apiClient.request<ClientCaseDto>(`/api/v1/cases/${caseId}`, { signal }),
    enabled: Boolean(caseId),
  });
}

export function useClientCase(caseId: string | null): ClientCaseDto | null | undefined {
  return useClientCaseQuery(caseId).data;
}

export function useCaseQuery(caseId: string | null, details = false) {
  return useTanstackQuery({
    queryKey: [...queryKeys.cases.detail(caseId ?? "none"), details],
    queryFn: ({ signal }) =>
      apiClient.request<any>(`/api/v1/cases/${caseId}`, {
        query: details ? { details: true } : {},
        signal,
      }),
    enabled: Boolean(caseId),
  });
}

export function useCase(caseId: string | null, details = false): any {
  return useCaseQuery(caseId, details).data;
}

export function useCreateCase(): (input: Record<string, unknown>) => Promise<unknown> {
  const client = useQueryClient();
  const next = useTanstackMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiClient.request("/api/v1/cases", { method: "POST", body: input }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.cases.all }),
  });
  return useCallback(
    async (input) => {
      try {
        return await next.mutateAsync(input);
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [next],
  );
}

export function useCaseCommands() {
  const client = useQueryClient();
  const invalidate = async () => client.invalidateQueries({ queryKey: queryKeys.cases.all });
  return {
    async update(caseId: string, input: Record<string, unknown>) {
      const result = await apiClient.request(`/api/v1/cases/${caseId}`, {
        method: "PATCH",
        body: input,
      });
      await invalidate();
      return result;
    },
  };
}

export function useCasePartyCommands() {
  const client = useQueryClient();
  const invalidate = async () => client.invalidateQueries({ queryKey: queryKeys.cases.all });
  return {
    async create(caseId: string, input: Record<string, unknown>) {
      const result = await apiClient.request(`/api/v1/cases/${caseId}/parties`, {
        method: "POST",
        body: input,
      });
      await invalidate();
      return result;
    },
    async update(caseId: string, partyId: string, input: Record<string, unknown>) {
      const result = await apiClient.request(`/api/v1/cases/${caseId}/parties/${partyId}`, {
        method: "PATCH",
        body: input,
      });
      await invalidate();
      return result;
    },
    async remove(caseId: string, partyId: string) {
      const result = await apiClient.request(`/api/v1/cases/${caseId}/parties/${partyId}`, {
        method: "DELETE",
      });
      await invalidate();
      return result;
    },
  };
}
