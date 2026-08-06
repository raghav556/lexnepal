import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";
import { queryKeys } from "@/client/queries/query-keys";
import type { ResearchDto } from "@/shared/contracts/domains";

export function useResearchNotes(): ResearchDto[] | undefined {
  return useQuery({
    queryKey: queryKeys.research.list,
    queryFn: ({ signal }) => apiClient.request<ResearchDto[]>("/api/v1/research", { signal }),
  }).data;
}

export function useResearchNote(noteId: string | null): ResearchDto | undefined {
  return useQuery({
    queryKey: queryKeys.research.detail(noteId ?? "none"),
    queryFn: ({ signal }) =>
      apiClient.request<ResearchDto>(`/api/v1/research/${noteId}`, { signal }),
    enabled: Boolean(noteId),
  }).data;
}

export function useResearchCommands() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.research.all });

  return {
    async createNote(input: Record<string, unknown>) {
      try {
        const result = await apiClient.request("/api/v1/research", { method: "POST", body: input });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async updateNote(noteId: string, input: Record<string, unknown>) {
      try {
        const result = await apiClient.request(`/api/v1/research/${noteId}`, {
          method: "PATCH",
          body: input,
        });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async deleteNote(noteId: string) {
      try {
        const result = await apiClient.request(`/api/v1/research/${noteId}`, { method: "DELETE" });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  };
}
