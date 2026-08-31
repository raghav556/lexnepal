import { useCallback } from "react";
import { useQuery as useTanstackQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";
import { useSessionCapabilities } from "@/client/queries/identity";
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

export function useTasks(filters: ListTasksInput | "skip" = {}): TaskDto[] | undefined {
  const activeFilters = filters === "skip" ? {} : filters;
  return useTanstackQuery({
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
    enabled: filters !== "skip",
  }).data;
}

export function useTask(taskId: string | null): TaskDto | undefined {
  return useTanstackQuery({
    queryKey: queryKeys.tasks.detail(taskId ?? "none"),
    queryFn: ({ signal }) => apiClient.request<TaskDto>(`/api/v1/tasks/${taskId}`, { signal }),
    enabled: Boolean(taskId),
  }).data;
}

export function useTaskWorkload(): unknown[] | undefined {
  const capabilities = useSessionCapabilities();
  const canViewTeamWorkload = capabilities?.includes("cases.view_all") === true;
  const workload = useTanstackQuery({
    queryKey: queryKeys.tasks.workload,
    queryFn: ({ signal }) => apiClient.request<unknown[]>("/api/v1/tasks/workload", { signal }),
    enabled: canViewTeamWorkload,
    retry: false,
  });
  if (capabilities === undefined) return undefined;
  return canViewTeamWorkload ? workload.data : [];
}

export function useTaskComments(taskId: string | null): unknown[] | undefined {
  return useTanstackQuery({
    queryKey: queryKeys.tasks.comments(taskId ?? "none"),
    queryFn: ({ signal }) =>
      apiClient.request<unknown[]>(`/api/v1/tasks/${taskId}/comments`, { signal }),
    enabled: Boolean(taskId),
  }).data;
}

export function useTaskCommands() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });

  return {
    async createTask(input: Record<string, unknown>) {
      try {
        const result = await apiClient.request("/api/v1/tasks", {
          method: "POST",
          body: normalizeTaskWriteInput(input),
        });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async updateTask(taskId: string, input: Record<string, unknown>) {
      try {
        const result = await apiClient.request(`/api/v1/tasks/${taskId}`, {
          method: "PATCH",
          body: normalizeTaskWriteInput(input),
        });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async archiveTask(taskId: string) {
      try {
        const result = await apiClient.request(`/api/v1/tasks/${taskId}/archive`, {
          method: "POST",
        });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async restoreTask(taskId: string) {
      try {
        const result = await apiClient.request(`/api/v1/tasks/${taskId}/restore`, {
          method: "POST",
        });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async deleteTask(taskId: string) {
      try {
        const result = await apiClient.request(`/api/v1/tasks/${taskId}`, { method: "DELETE" });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async addComment(taskId: string, content: string) {
      try {
        const result = await apiClient.request(`/api/v1/tasks/${taskId}/comments`, {
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
        const result = await apiClient.request("/api/v1/sop-templates/run", {
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
        const result = await apiClient.request("/api/v1/sop-templates/hearing-prep", {
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
        return await apiClient.request<{ sent: number }>("/api/v1/tasks/overdue-reminders", {
          method: "POST",
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  };
}

export function useSopTemplates(practiceArea?: string): unknown[] | undefined {
  return useTanstackQuery({
    queryKey: queryKeys.sop.list(practiceArea),
    queryFn: ({ signal }) =>
      apiClient.request<unknown[]>("/api/v1/sop-templates", {
        query: practiceArea ? { practiceArea } : {},
        signal,
      }),
  }).data;
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
