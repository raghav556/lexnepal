import { useQuery as useTanstackQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";
import { queryKeys } from "@/client/queries/query-keys";
import type { HearingDto, ListHearingsInput } from "@/shared/contracts/domains";

function normalizeHearingCreateInput(input: Record<string, unknown>) {
  const next: Record<string, unknown> = { ...input };
  if (next.hearingTime == null && typeof next.time === "string") {
    next.hearingTime = next.time;
  }
  delete next.time;
  if (next.judge === "") delete next.judge;
  if (next.purpose === "") delete next.purpose;
  if (next.notes === "") delete next.notes;
  if (next.hearingTime === "") delete next.hearingTime;
  return next;
}

function normalizeHearingUpdateInput(input: Record<string, unknown>) {
  const next: Record<string, unknown> = { ...input };
  delete next.hearingId;
  delete next.id;
  if (next.outcome === "") delete next.outcome;
  if (next.notes === "") delete next.notes;
  if (next.judge === "") delete next.judge;
  if (next.purpose === "") delete next.purpose;
  if (next.nextDateGregorian === "") delete next.nextDateGregorian;
  if (next.nextDateBs === "") delete next.nextDateBs;
  return next;
}

export function useHearings(filters: ListHearingsInput | "skip" = {}): HearingDto[] | undefined {
  const activeFilters = filters === "skip" ? {} : filters;
  const next = useTanstackQuery({
    queryKey: queryKeys.hearings.list(activeFilters),
    queryFn: ({ signal }) =>
      apiClient.request<HearingDto[]>("/api/v1/hearings", { query: { ...activeFilters }, signal }),
    enabled: filters !== "skip",
  });
  return next.data;
}

export function useHearing(hearingId: string | null): HearingDto | undefined {
  const next = useTanstackQuery({
    queryKey: queryKeys.hearings.detail(hearingId ?? "none"),
    queryFn: ({ signal }) =>
      apiClient.request<HearingDto>(`/api/v1/hearings/${hearingId}`, { signal }),
    enabled: Boolean(hearingId),
  });
  return next.data;
}

export function useHearingCommands() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.hearings.all });

  return {
    async createHearing(input: Record<string, unknown>) {
      try {
        const body = normalizeHearingCreateInput(input);
        const result = await apiClient.request("/api/v1/hearings", { method: "POST", body });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async updateHearing(hearingId: string, input: Record<string, unknown>) {
      try {
        const body = normalizeHearingUpdateInput(input);
        const result = await apiClient.request(`/api/v1/hearings/${hearingId}`, {
          method: "PATCH",
          body,
        });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  };
}
