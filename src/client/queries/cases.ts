/* eslint-disable @typescript-eslint/no-explicit-any -- compatibility adapter is removed with Convex rollback */
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
import type { CaseDto, ConflictHitDto, ListCasesInput } from "@/shared/contracts/domains";

export function useCases(filters: ListCasesInput = {}): CaseDto[] | undefined {
  const backend = useDomainBackend("cases");
  const convex = useConvexQuery(api.cases.listCases, backend === "convex" ? filters : "skip") as
    CaseDto[] | undefined;
  const next = useTanstackQuery({
    queryKey: queryKeys.cases.list(filters),
    queryFn: ({ signal }) =>
      apiClient.request<CaseDto[]>("/api/v1/cases", { query: { ...filters }, signal }),
    enabled: backend === "next",
  });
  return backend === "convex" ? convex : next.data;
}
export function useCase(caseId: string | null, details = false): any {
  const backend = useDomainBackend("cases");
  const convex = useConvexQuery(
    details ? api.cases.getCaseWithDetails : api.cases.getCase,
    backend === "convex" && caseId ? { caseId } : "skip",
  );
  const next = useTanstackQuery({
    queryKey: [...queryKeys.cases.detail(caseId ?? "none"), details],
    queryFn: ({ signal }) =>
      apiClient.request(`/api/v1/cases/${caseId}`, {
        query: details ? { details: true } : {},
        signal,
      }),
    enabled: backend === "next" && Boolean(caseId),
  });
  return backend === "convex" ? convex : next.data;
}
export function useCreateCase(): (input: Record<string, unknown>) => Promise<unknown> {
  const backend = useDomainBackend("cases");
  const client = useQueryClient();
  const convex = useConvexMutation(api.cases.createCase);
  const next = useTanstackMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiClient.request("/api/v1/cases", { method: "POST", body: input }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.cases.all }),
  });
  return useCallback(
    async (input) => {
      try {
        const result = backend === "convex" ? await convex(input) : await next.mutateAsync(input);
        if (backend === "convex") await client.invalidateQueries({ queryKey: queryKeys.cases.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convex, next, client],
  );
}
export function useCaseCommands() {
  const backend = useDomainBackend("cases");
  const client = useQueryClient();
  const convexUpdate = useConvexMutation(api.cases.updateCase);
  const convexMark = useConvexMutation(api.cases.markConflictChecked);
  const invalidate = async () => client.invalidateQueries({ queryKey: queryKeys.cases.all });
  return {
    async update(caseId: string, input: Record<string, unknown>) {
      const result =
        backend === "convex"
          ? await convexUpdate({ caseId, ...input })
          : await apiClient.request(`/api/v1/cases/${caseId}`, { method: "PATCH", body: input });
      await invalidate();
      return result;
    },
    async markConflict(caseId: string, cleared: boolean) {
      const result =
        backend === "convex"
          ? await convexMark({ caseId, cleared })
          : await apiClient.request(`/api/v1/cases/${caseId}/conflict-decision`, {
              method: "POST",
              body: { cleared },
            });
      await invalidate();
      return result;
    },
  };
}
export function useConflictSearch(query: string): ConflictHitDto[] | undefined {
  const backend = useDomainBackend("cases");
  const convex = useConvexQuery(
    api.cases.checkConflict,
    backend === "convex" && query.length >= 2 ? { query } : "skip",
  ) as { hits?: ConflictHitDto[] } | ConflictHitDto[] | undefined;
  const next = useTanstackQuery({
    queryKey: queryKeys.conflicts.search(query),
    queryFn: () =>
      apiClient.request<{ hits: ConflictHitDto[] }>("/api/v1/conflict-checks/search", {
        method: "POST",
        body: { query },
      }),
    enabled: backend === "next" && query.length >= 2,
    staleTime: 30_000,
  });
  const value = backend === "convex" ? convex : next.data;
  return Array.isArray(value) ? value : value?.hits;
}
export function useRecentConflictChecks(): any[] | undefined {
  const backend = useDomainBackend("cases");
  const convex = useConvexQuery(
    api.conflictChecks.listRecentChecks,
    backend === "convex" ? {} : "skip",
  ) as any[] | undefined;
  const next = useTanstackQuery({
    queryKey: queryKeys.conflicts.recent,
    queryFn: ({ signal }) => apiClient.request<any[]>("/api/v1/conflict-checks", { signal }),
    enabled: backend === "next",
  });
  return backend === "convex" ? convex : next.data;
}
export function useConflictCommands() {
  const backend = useDomainBackend("cases");
  const client = useQueryClient();
  const convexLog = useConvexMutation(api.conflictChecks.logSearch);
  const convexUpdate = useConvexMutation(api.conflictChecks.updateStatus);
  return {
    async search(query: string, legacyHits: ConflictHitDto[] = []) {
      if (backend === "convex") {
        const checkId = await convexLog({
          searchQuery: query,
          hitsCount: legacyHits.length,
          runByName: "Authenticated user",
        });
        return { checkId: String(checkId), hits: legacyHits };
      }
      return apiClient.request<{ checkId: string; hits: ConflictHitDto[] }>(
        "/api/v1/conflict-checks/search",
        { method: "POST", body: { query } },
      );
    },
    async logSearch(input: { searchQuery: string; hitsCount: number; runByName: string }) {
      if (backend === "convex") return convexLog(input);
      return undefined;
    },
    async updateStatus(checkId: string, status: "cleared" | "conflict", notes?: string) {
      const result =
        backend === "convex"
          ? await convexUpdate({ checkId, status, notes })
          : await apiClient.request(`/api/v1/conflict-checks/${checkId}`, {
              method: "PATCH",
              body: { status, notes },
            });
      await client.invalidateQueries({ queryKey: queryKeys.conflicts.all });
      return result;
    },
  };
}
