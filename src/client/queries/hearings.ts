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
import type { HearingDto, ListHearingsInput } from "@/shared/contracts/domains";

export function useHearings(filters: ListHearingsInput = {}): HearingDto[] | undefined {
  const backend = useDomainBackend("hearings");
  const convex = useConvexQuery(api.hearings.listHearings, backend === "convex" ? filters : "skip") as
    | HearingDto[]
    | undefined;
  const next = useTanstackQuery({
    queryKey: queryKeys.hearings.list(filters),
    queryFn: ({ signal }) =>
      apiClient.request<HearingDto[]>("/api/v1/hearings", { query: { ...filters }, signal }),
    enabled: backend === "next",
  });
  if (backend === "next" && next.error) throw normalizeApiError(next.error);
  return backend === "convex" ? convex : next.data;
}

export function useHearing(hearingId: string | null): HearingDto | undefined {
  const backend = useDomainBackend("hearings");
  const next = useTanstackQuery({
    queryKey: queryKeys.hearings.detail(hearingId ?? "none"),
    queryFn: ({ signal }) =>
      apiClient.request<HearingDto>(`/api/v1/hearings/${hearingId}`, { signal }),
    enabled: backend === "next" && Boolean(hearingId),
  });
  if (backend === "next" && next.error) throw normalizeApiError(next.error);
  return backend === "next" ? next.data : undefined;
}

export function useHearingCommands() {
  const backend = useDomainBackend("hearings");
  const queryClient = useQueryClient();
  const convexCreate = useConvexMutation(api.hearings.createHearing);
  const convexUpdate = useConvexMutation(api.hearings.updateHearing);
  
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.hearings.all });

  return {
    async createHearing(input: Record<string, unknown>) {
      try {
        const result =
          backend === "convex"
            ? await convexCreate(input)
            : await apiClient.request("/api/v1/hearings", { method: "POST", body: input });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async updateHearing(hearingId: string, input: Record<string, unknown>) {
      try {
        const result =
          backend === "convex"
            ? await convexUpdate({ hearingId, ...input })
            : await apiClient.request(`/api/v1/hearings/${hearingId}`, { method: "PATCH", body: input });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  };
}
