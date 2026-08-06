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
import type { CaseDto, ConflictHitDto, ListCasesInput } from "@/shared/contracts/domains";

export function useCases(filters: ListCasesInput = {}): CaseDto[] | undefined {
  return useTanstackQuery({
    queryKey: queryKeys.cases.list(filters),
    queryFn: ({ signal }) =>
      apiClient.request<CaseDto[]>("/api/v1/cases", { query: { ...filters }, signal }),
  }).data;
}

export function useCase(caseId: string | null, details = false): any {
  return useTanstackQuery({
    queryKey: [...queryKeys.cases.detail(caseId ?? "none"), details],
    queryFn: ({ signal }) =>
      apiClient.request(`/api/v1/cases/${caseId}`, {
        query: details ? { details: true } : {},
        signal,
      }),
    enabled: Boolean(caseId),
  }).data;
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
    async markConflict(caseId: string, cleared: boolean) {
      const result = await apiClient.request(`/api/v1/cases/${caseId}/conflict-decision`, {
        method: "POST",
        body: { cleared },
      });
      await invalidate();
      return result;
    },
  };
}

export function useConflictSearch(query: string): ConflictHitDto[] | undefined {
  return useTanstackQuery({
    queryKey: queryKeys.conflicts.search(query),
    queryFn: () =>
      apiClient.request<{ hits: ConflictHitDto[] }>("/api/v1/conflict-checks/search", {
        method: "POST",
        body: { query },
      }),
    enabled: query.length >= 2,
    staleTime: 30_000,
  }).data?.hits;
}

export function useRecentConflictChecks(): any[] | undefined {
  return useTanstackQuery({
    queryKey: queryKeys.conflicts.recent,
    queryFn: ({ signal }) => apiClient.request<any[]>("/api/v1/conflict-checks", { signal }),
  }).data;
}

export function useConflictCommands() {
  const client = useQueryClient();
  return {
    /** Runs the search server-side; the API also records the check and returns its id. */
    async search(query: string) {
      return apiClient.request<{ checkId: string; hits: ConflictHitDto[] }>(
        "/api/v1/conflict-checks/search",
        { method: "POST", body: { query } },
      );
    },
    async updateStatus(checkId: string, status: "cleared" | "conflict", notes?: string) {
      const result = await apiClient.request(`/api/v1/conflict-checks/${checkId}`, {
        method: "PATCH",
        body: { status, notes },
      });
      await client.invalidateQueries({ queryKey: queryKeys.conflicts.all });
      return result;
    },
  };
}
