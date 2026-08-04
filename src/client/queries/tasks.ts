import { useCallback } from "react";
import {
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

function normalizeTaskWriteInput(input: Record<string, unknown>) {
  const next: Record<string, unknown> = { ...input };
  delete next.taskId;
  delete next.id;
  if (next.caseId === "" || next.caseId == null) delete next.caseId;
  if (next.hearingId === "" || next.hearingId == null) delete next.hearingId;
  if (next.documentId === "" || next.documentId == null) delete next.documentId;
  if (next.parentTaskId === "" || next.parentTaskId == null) delete next.parentTaskId;
  if (next.category === "") delete next.category;
  if (next.recurrenceRule === "") delete next.recurrenceRule;
  if (next.dueDate === "") delete next.dueDate;
  if (next.reminderAt === "") delete next.reminderAt;
  return next;
}

export function useTasks(
  filters: ListTasksInput | "skip" = {},
): TaskDto[] | undefined {
  const backend = useDomainBackend("tasks");
  const activeFilters = filters === "skip" ? {} : filters;
  const convex = useConvexQuery(
    api.tasks.listTasks,
    backend === "convex" && filters !== "skip" ? activeFilters : "skip",
  ) as TaskDto[] | undefined;
  const next = useTanstackQuery({
    queryKey: queryKeys.tasks.list(activeFilters),
    queryFn: ({ signal }) =>
      apiClient.request<TaskDto[]>("/api/v1/tasks", {
        query: {
          ...activeFilters,
          includeArchived:
            activeFilters.includeArchived === undefined
              ? undefined
              : String(activeFilters.includeArchived),
        },
        signal,
      }),
    enabled: backend === "next" && filters !== "skip",
  });
  return backend === "convex" ? convex : next.data;
}

export function useTask(taskId: string | null): TaskDto | undefined {
  const backend = useDomainBackend("tasks");
  const next = useTanstackQuery({
    queryKey: queryKeys.tasks.detail(taskId ?? "none"),
    queryFn: ({ signal }) =>
      apiClient.request<TaskDto>(`/api/v1/tasks/${taskId}`, { signal }),
    enabled: backend === "next" && Boolean(taskId),
  });
  return backend === "next" ? next.data : undefined;
}

export function useTaskWorkload(): unknown[] | undefined {
  const backend = useDomainBackend("tasks");
  const convex = useConvexQuery(api.tasks.listWorkload, backend === "convex" ? {} : "skip") as
    | unknown[]
    | undefined;
  const next = useTanstackQuery({
    queryKey: queryKeys.tasks.workload,
    queryFn: ({ signal }) => apiClient.request<unknown[]>("/api/v1/tasks/workload", { signal }),
    enabled: backend === "next",
  });
  return backend === "convex" ? convex : next.data;
}

export function useTaskComments(taskId: string | null): unknown[] | undefined {
  const backend = useDomainBackend("tasks");
  const convex = useConvexQuery(
    api.tasks.listComments,
    backend === "convex" && taskId ? { taskId } : "skip",
  ) as unknown[] | undefined;
  const next = useTanstackQuery({
    queryKey: queryKeys.tasks.comments(taskId ?? "none"),
    queryFn: ({ signal }) =>
      apiClient.request<unknown[]>(`/api/v1/tasks/${taskId}/comments`, { signal }),
    enabled: backend === "next" && Boolean(taskId),
  });
  return backend === "convex" ? convex : next.data;
}

export function useTaskCommands() {
  const backend = useDomainBackend("tasks");
  const queryClient = useQueryClient();
  const convexCreate = useConvexMutation(api.tasks.createTask);
  const convexUpdate = useConvexMutation(api.tasks.updateTask);
  const convexArchive = useConvexMutation(api.tasks.archiveTask);
  const convexRestore = useConvexMutation(api.tasks.restoreTask);
  const convexDelete = useConvexMutation(api.tasks.deleteTask);
  const convexComment = useConvexMutation(api.tasks.addComment);
  const convexSop = useConvexMutation(api.tasks.runSop);
  const convexHearingPrep = useConvexMutation(api.tasks.createHearingPrepTasks);
  const convexScanOverdue = useConvexMutation(api.tasks.scanOverdueReminders);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });

  return {
    async createTask(input: Record<string, unknown>) {
      try {
        const body = normalizeTaskWriteInput(input);
        const result =
          backend === "convex"
            ? await convexCreate(body)
            : await apiClient.request("/api/v1/tasks", { method: "POST", body });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async updateTask(taskId: string, input: Record<string, unknown>) {
      try {
        const body = normalizeTaskWriteInput(input);
        const result =
          backend === "convex"
            ? await convexUpdate({ taskId, ...body })
            : await apiClient.request(`/api/v1/tasks/${taskId}`, { method: "PATCH", body });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async archiveTask(taskId: string) {
      try {
        const result =
          backend === "convex"
            ? await convexArchive({ taskId })
            : await apiClient.request(`/api/v1/tasks/${taskId}/archive`, { method: "POST" });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async restoreTask(taskId: string) {
      try {
        const result =
          backend === "convex"
            ? await convexRestore({ taskId })
            : await apiClient.request(`/api/v1/tasks/${taskId}/restore`, { method: "POST" });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async deleteTask(taskId: string) {
      try {
        const result =
          backend === "convex"
            ? await convexDelete({ taskId })
            : await apiClient.request(`/api/v1/tasks/${taskId}`, { method: "DELETE" });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async addComment(taskId: string, content: string) {
      try {
        const result =
          backend === "convex"
            ? await convexComment({ taskId, content })
            : await apiClient.request(`/api/v1/tasks/${taskId}/comments`, {
                method: "POST",
                body: { content },
              });
        await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.comments(taskId) });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async runSop(templateKey: string, caseId: string, assignedTo?: string) {
      try {
        const result =
          backend === "convex"
            ? await convexSop({ templateKey, caseId, assignedTo })
            : await apiClient.request("/api/v1/sop-templates/run", {
                method: "POST",
                body: { templateKey, caseId, assignedTo },
              });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async createHearingPrepTasks(hearingId: string, assignedTo?: string) {
      try {
        const result =
          backend === "convex"
            ? await convexHearingPrep({ hearingId, assignedTo })
            : await apiClient.request("/api/v1/sop-templates/hearing-prep", {
                method: "POST",
                body: { hearingId, assignedTo },
              });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async scanOverdueReminders() {
      try {
        const result =
          backend === "convex"
            ? await convexScanOverdue({})
            : await apiClient.request<{ sent: number }>("/api/v1/tasks/overdue-reminders", {
                method: "POST",
              });
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  };
}

export function useSopTemplates(practiceArea?: string): unknown[] | undefined {
  const backend = useDomainBackend("tasks");
  const convex = useConvexQuery(
    api.tasks.listSopTemplates,
    backend === "convex" ? { practiceArea } : "skip",
  ) as unknown[] | undefined;
  const next = useTanstackQuery({
    queryKey: queryKeys.sop.list(practiceArea),
    queryFn: ({ signal }) =>
      apiClient.request<unknown[]>("/api/v1/sop-templates", {
        query: practiceArea ? { practiceArea } : {},
        signal,
      }),
    enabled: backend === "next",
  });
  return backend === "convex" ? convex : next.data;
}

export function useUpdateTask(): (input: Record<string, unknown>) => Promise<unknown> {
  const commands = useTaskCommands();
  return useCallback(
    async (input: Record<string, unknown>) => {
      const taskId = String(input.taskId ?? input.id ?? "");
      return commands.updateTask(taskId, input);
    },
    [commands],
  );
}

export function useCreateTask(): (input: Record<string, unknown>) => Promise<unknown> {
  const commands = useTaskCommands();
  return useCallback((input: Record<string, unknown>) => commands.createTask(input), [commands]);
}
