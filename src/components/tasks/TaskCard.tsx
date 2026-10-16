import { Card, CardContent } from "@/components/ui/card.tsx";
import { CheckSquare, Circle, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { StatusBadge, getDashboardStatusTone } from "@/components/dashboard";
import {
  TASK_STATUS_LABELS,
  formatTaskDue,
  isTaskOverdue,
  type TaskStatus,
} from "@/lib/task-constants.ts";

type TaskCardProps = {
  task: any;
  caseLabel?: string | null;
  assigneeLabel?: string;
  variant?: "kanban" | "list";
  draggable?: boolean;
  onOpen: (task: any) => void;
  onToggleComplete: (task: any, e: React.MouseEvent) => void;
  onDragStart?: (task: any, e: React.DragEvent) => void;
};

export function TaskCard({
  task,
  caseLabel,
  assigneeLabel,
  variant = "kanban",
  draggable = false,
  onOpen,
  onToggleComplete,
  onDragStart,
}: TaskCardProps) {
  const due = formatTaskDue(task);
  const overdue = isTaskOverdue(task);
  const done = task.status === "done";
  const cancelled = task.status === "cancelled";
  return (
    <Card
      role="article"
      aria-label={`Task: ${task.title}`}
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest("button")) return;
        event.currentTarget
          .querySelector<HTMLButtonElement>(".staff-task-title")
          ?.focus({ preventScroll: true });
        onOpen(task);
      }}
      data-task-id={String(task._id)}
      className={cn(
        "staff-task-card",
        variant === "list" ? "staff-task-row" : "staff-task-board-card",
      )}
      data-overdue={overdue || undefined}
      data-completed={done || cancelled || undefined}
      draggable={draggable && !cancelled}
      onDragStart={(e) => onDragStart?.(task, e)}
    >
      <CardContent className="staff-task-record">
        <div className="staff-task-record-title">
          {draggable && !cancelled ? (
            <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : null}
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label={(done ? "Reopen task: " : "Complete task: ") + task.title}
            className="staff-task-completion"
            disabled={cancelled}
            onClick={(e) => onToggleComplete(task, e)}
          >
            {done ? (
              <CheckSquare className="size-5" aria-hidden />
            ) : (
              <Circle className="size-5" aria-hidden />
            )}
          </button>
          <div className="min-w-0">
            <button type="button" className="staff-task-title" onClick={() => onOpen(task)}>
              {task.title}
            </button>
            {task.description ? <p className="staff-task-excerpt">{task.description}</p> : null}
          </div>
        </div>
        <div className="staff-task-matter">
          <span className="staff-task-mobile-label">Related matter</span>
          {caseLabel || "General Task"}
        </div>
        <div>
          <span className="staff-task-mobile-label">Status</span>
          <StatusBadge tone={getDashboardStatusTone(task.status)}>
            {TASK_STATUS_LABELS[task.status as TaskStatus] || task.status}
          </StatusBadge>
        </div>
        <div>
          <span className="staff-task-mobile-label">Priority</span>
          <StatusBadge tone={getDashboardStatusTone(task.priority)} className="capitalize">
            {task.priority}
          </StatusBadge>
        </div>
        <div className="staff-task-due">
          <span className="staff-task-mobile-label">Due date</span>
          {due || "Not set"}
          {task.dueDateBs && task.dueDate ? <small>{task.dueDate.slice(0, 10)} AD</small> : null}
          {overdue ? <strong>Overdue</strong> : null}
        </div>
        {variant === "list" ? (
          <div className="staff-task-assignee">
            <span className="staff-task-mobile-label">Assigned to</span>
            {assigneeLabel || "Name unavailable"}
          </div>
        ) : null}
        <button
          type="button"
          className="staff-task-view"
          aria-label={"View task: " + task.title}
          onClick={() => onOpen(task)}
        >
          View
        </button>
      </CardContent>
    </Card>
  );
}
