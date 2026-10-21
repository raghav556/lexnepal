import { formatDualDate, nepalDateOnly } from "@/lib/nepali-calendar";
export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskCategory = "filing" | "research" | "client" | "court" | "admin" | "other";
export type RecurrenceRule = "daily" | "weekly" | "monthly";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  filing: "Filing",
  research: "Research",
  client: "Client",
  court: "Court",
  admin: "Admin",
  other: "Other",
};

/** Overdue when Gregorian dueDate is before today and task is not done/cancelled. */
export function isTaskOverdue(task: { status?: string; dueDate?: string | null }): boolean {
  if (!task.dueDate) return false;
  if (task.status === "done" || task.status === "cancelled") return false;
  try { return nepalDateOnly(task.dueDate) < nepalDateOnly(); } catch { return false; }
}

export function formatTaskDue(task: {
  dueDateBs?: string | null;
  dueDate?: string | null;
}): string | null {
  if (task.dueDate) return formatDualDate(task.dueDate);
  if (task.dueDateBs) return `${task.dueDateBs} B.S. (A.D. unavailable)`;
  return null;
}
