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
import type { ListTasksInput, TaskDto } from "@/shared/contracts/domains";

export function useTasks(filters: ListTasksInput = {}): TaskDto[] | undefined {
  const backend = useDomainBackend("tasks");
  const convex = useConvexQuery(api.tasks.listTasks, backend === "convex" ? filters : "skip") as
    TaskDto[] | undefined;
  const next = useTanstackQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: ({ signal }) =>
      apiClient.request<TaskDto[]>("/api/v1/tasks", { query: { ...filters }, signal }),
    enabled: backend === "next",
  });
  if (backend === "next" && next.error) throw normalizeApiError(next.error);
  return backend === "convex" ? convex : next.data;
}

export function useUpdateTask(): (input: Record<string, unknown>) => Promise<unknown> {
  const backend = useDomainBackend("tasks");
  const queryClient = useQueryClient();
  const convexMutation = useConvexMutation(api.tasks.updateTask);
  const nextMutation = useTanstackMutation({
    mutationFn: (input: Record<string, unknown>) => {
      const taskId = String(input.taskId ?? input.id ?? "");
      return apiClient.request(`/api/v1/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        body: input,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
  });
  return useCallback(
    async (input: Record<string, unknown>) => {
      try {
        const result =
          backend === "convex"
            ? await convexMutation(input)
            : await nextMutation.mutateAsync(input);
        if (backend === "convex")
          await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    [backend, convexMutation, nextMutation, queryClient],
  );
}
