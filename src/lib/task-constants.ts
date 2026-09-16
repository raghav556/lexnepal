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
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export function formatTaskDue(task: {
  dueDateBs?: string | null;
  dueDate?: string | null;
}): string | null {
  if (task.dueDateBs) return task.dueDateBs;
  if (task.dueDate) return task.dueDate;
  return null;
}
