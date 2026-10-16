// Offline, synthetic data and commands only. Reuse the established portal adapters.
export * from "../navigation/adapters";
export { default, default as Link } from "../navigation/adapters";
import { useMemo, useSyncExternalStore } from "react";
import { formatBs, gregorianToBs } from "@/lib/nepali-calendar";

type FixtureTask = {
  _id: string;
  title: string;
  assignedTo: string;
  status: string;
  priority: string;
  description?: string | null;
  caseId?: string | null;
  parentTaskId?: string | null;
  dueDate?: string | null;
  dueDateBs?: string | null;
  category?: string | null;
  clientVisible?: boolean;
  watchers?: string[];
  isRecurring?: boolean;
  recurrenceRule?: string | null;
  reminderAt?: string | null;
  hearingId?: string | null;
  documentId?: string | null;
  archivedAt?: string;
};
type FixtureComment = {
  _id: string;
  taskId: string;
  authorId: string;
  content: string;
  _creationTime: number;
};
let state = "populated";
let brand: string | undefined;
let revision = 0;
let tasks: FixtureTask[] = [];
let comments: FixtureComment[] = [];
let failNext = false;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const changed = () => {
  revision++;
  listeners.forEach((listener) => listener());
};
const useRevision = () => useSyncExternalStore(subscribe, () => revision);
export const attempts: { command: string; input: unknown }[] = [];
export const staff = [
  { _id: "staff-a", name: "Synthetic Sita Adhikari", role: "associate" },
  { _id: "staff-b", name: "Synthetic Nabin Shrestha", role: "paralegal" },
  { _id: "staff-c", name: "Synthetic Uma Rai", role: "partner" },
];
export function setTaskState(next = "populated", primary?: string) {
  state = next;
  brand = primary;
  attempts.length = 0;
  failNext = false;
  tasks = Array.from({ length: 27 }, (_, i) => ({
    _id: "synthetic-task-" + (i + 1),
    title:
      i === 0
        ? "Prepare evidence bundle — long legal task title for the current hearing"
        : "Synthetic task " + (i + 1),
    description: "Organize the existing case documents and review the supporting material.",
    assignedTo: i % 3 === 0 ? "staff-b" : "staff-a",
    caseId: i % 2 ? "matter-b" : "matter-a",
    status: ["todo", "in_progress", "done", "cancelled"][i % 4],
    priority: ["urgent", "high", "medium", "low"][i % 4],
    dueDate: i === 0 ? "2026-10-14" : i % 2 ? "2026-10-16" : "2026-10-22",
    dueDateBs: formatBs(gregorianToBs(new Date(2026, 9, i === 0 ? 14 : i % 2 ? 16 : 22))),
    category: "court",
    clientVisible: false,
    watchers: ["staff-c"],
    isRecurring: true,
    recurrenceRule: "weekly",
    reminderAt: "2026-10-15",
    hearingId: "hearing-a",
    documentId: "document-a",
    archivedAt: i === 26 ? "2026-10-10" : undefined,
  }));
  tasks.push({
    _id: "synthetic-subtask",
    parentTaskId: "synthetic-task-1",
    title: "Check document index",
    assignedTo: "staff-b",
    priority: "high",
    status: "todo",
  });
  comments = [
    {
      _id: "synthetic-comment",
      taskId: "synthetic-task-1",
      authorId: "staff-c",
      content: "Synthetic team review note.",
      _creationTime: 1792123200000,
    },
  ];
  changed();
}
export function failNextTaskCommand() {
  failNext = true;
}
export const taskFixtureRecords = () => tasks;
export const useCurrentUser = () => ({ ...staff[0], id: "staff-a" });
export const useSessionCapabilities = () => (state === "restricted" ? [] : ["cases.view_all"]);
export const useStaffDirectory = () => staff;
export const useCases = () => [
  {
    _id: "matter-a",
    caseNumber: "TEST-2083-001",
    title: "Synthetic construction matter",
    status: "active",
  },
  {
    _id: "matter-b",
    caseNumber: "TEST-2083-002",
    title: "Synthetic estate matter",
    status: "inquiry",
  },
];
export const useHearings = () => [
  {
    _id: "hearing-a",
    caseId: "matter-a",
    dateGregorian: "2026-10-22",
    dateBs: "2083-07-05",
    court: "Synthetic Court",
  },
];
export const useDocuments = () => [
  { _id: "document-a", caseId: "matter-a", title: "Synthetic legal document.pdf" },
];
export const usePublicCmsSettings = () => ({
  firmName: "Synthetic Legal Workspace",
  primaryColor: brand,
});
export function useTasks(
  filters: { parentTaskId?: string; includeArchived?: boolean } | "skip" = {},
) {
  const current = useRevision();
  const parent = filters === "skip" ? "skip" : filters.parentTaskId;
  const archived = filters !== "skip" && filters.includeArchived;
  return useMemo(() => {
    // This revision explicitly invalidates the otherwise stable fixture snapshot.
    void current;
    return state === "loading"
      ? undefined
      : state === "empty" || parent === "skip"
        ? []
        : tasks.filter((task) =>
            parent
              ? task.parentTaskId === parent
              : !task.parentTaskId && (archived || !task.archivedAt),
          );
  }, [current, parent, archived]);
}
export function useTaskComments(taskId: string | null) {
  const current = useRevision();
  return useMemo(() => {
    void current;
    return comments.filter((comment) => comment.taskId === taskId);
  }, [current, taskId]);
}
export function useTaskWorkload() {
  useRevision();
  if (state === "restricted" || state === "empty") return [];
  return staff.map((user) => {
    const open = tasks.filter(
      (task) =>
        !task.archivedAt &&
        !task.parentTaskId &&
        task.assignedTo === user._id &&
        !["done", "cancelled"].includes(task.status),
    );
    return {
      assignedTo: user._id,
      total: open.length,
      urgent: open.filter((t) => ["high", "urgent"].includes(t.priority)).length,
      overdue: open.filter((t) => t.dueDate && t.dueDate < "2026-10-16").length,
    };
  });
}
async function command(command: string, input: unknown) {
  attempts.push({ command, input });
  if (failNext) {
    failNext = false;
    throw new Error("Synthetic command failure; retry safely.");
  }
}
export function useUpdateTask() {
  return async (input: Partial<FixtureTask> & { taskId: string }) => {
    await command("update", input);
    tasks = tasks.map((task) => (task._id === input.taskId ? { ...task, ...input } : task));
    changed();
  };
}
export function useTaskCommands() {
  return {
    createTask: async (input: Partial<FixtureTask>) => {
      await command("create", input);
      tasks = [
        ...tasks,
        {
          ...input,
          _id: "created-" + attempts.length,
          status: "todo",
          title: input.title ?? "",
          assignedTo: input.assignedTo ?? "staff-a",
          priority: input.priority ?? "medium",
        },
      ];
      changed();
    },
    archiveTask: async (taskId: string) => {
      await command("archive", { taskId });
      tasks = tasks.map((task) =>
        task._id === taskId ? { ...task, archivedAt: "2026-10-16" } : task,
      );
      changed();
    },
    restoreTask: async (taskId: string) => {
      await command("restore", { taskId });
      tasks = tasks.map((task) =>
        task._id === taskId ? { ...task, archivedAt: undefined } : task,
      );
      changed();
    },
    deleteTask: async (taskId: string) => {
      await command("delete", { taskId });
      tasks = tasks.filter((task) => task._id !== taskId);
      changed();
    },
    addComment: async (taskId: string, content: string) => {
      await command("comment", { taskId, content });
      comments = [
        ...comments,
        {
          _id: "comment-" + attempts.length,
          taskId,
          content,
          authorId: "staff-a",
          _creationTime: 1792123200000,
        },
      ];
      changed();
    },
    scanOverdueReminders: async () => {
      await command("reminders", {});
      return { sent: 1 };
    },
  };
}
