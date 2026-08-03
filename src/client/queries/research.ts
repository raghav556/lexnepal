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
import type { ResearchDto } from "@/shared/contracts/domains";

export function useResearchNotes(): ResearchDto[] | undefined {
  const backend = useDomainBackend("research");
  const convex = useConvexQuery(api.research.listNotes, backend === "convex" ? {} : "skip") as
    | ResearchDto[]
    | undefined;
  const next = useTanstackQuery({
    queryKey: queryKeys.research.list,
    queryFn: ({ signal }) =>
      apiClient.request<ResearchDto[]>("/api/v1/research", { signal }),
    enabled: backend === "next",
  });
  if (backend === "next" && next.error) throw normalizeApiError(next.error);
  return backend === "convex" ? convex : next.data;
}

export function useResearchNote(noteId: string | null): ResearchDto | undefined {
  const backend = useDomainBackend("research");
  const next = useTanstackQuery({
    queryKey: queryKeys.research.detail(noteId ?? "none"),
    queryFn: ({ signal }) =>
      apiClient.request<ResearchDto>(`/api/v1/research/${noteId}`, { signal }),
    enabled: backend === "next" && Boolean(noteId),
  });
  if (backend === "next" && next.error) throw normalizeApiError(next.error);
  return backend === "next" ? next.data : undefined;
}

export function useResearchCommands() {
  const backend = useDomainBackend("research");
  const queryClient = useQueryClient();
  const convexCreate = useConvexMutation(api.research.createNote);
  const convexUpdate = useConvexMutation(api.research.updateNote);
  const convexDelete = useConvexMutation(api.research.deleteNote);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.research.all });

  return {
    async createNote(input: Record<string, unknown>) {
      try {
        const result =
          backend === "convex"
            ? await convexCreate(input)
            : await apiClient.request("/api/v1/research", { method: "POST", body: input });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async updateNote(noteId: string, input: Record<string, unknown>) {
      try {
        const result =
          backend === "convex"
            ? await convexUpdate({ noteId, ...input })
            : await apiClient.request(`/api/v1/research/${noteId}`, { method: "PATCH", body: input });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async deleteNote(noteId: string) {
      try {
        const result =
          backend === "convex"
            ? await convexDelete({ noteId })
            : await apiClient.request(`/api/v1/research/${noteId}`, { method: "DELETE" });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  };
}
