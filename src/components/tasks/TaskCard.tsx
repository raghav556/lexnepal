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
  variant?: "kanban" | "list";
  draggable?: boolean;
  onOpen: (task: any) => void;
  onToggleComplete: (task: any, e: React.MouseEvent) => void;
  onDragStart?: (task: any, e: React.DragEvent) => void;
};

const interactiveCardClass =
  "cursor-pointer transition-all hover:shadow-sm hover:border-dashboard-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus focus-visible:ring-offset-1";

export function TaskCard({
  task,
  caseLabel,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(task);
    }
  };

  if (variant === "list") {
    return (
      <Card
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={cn(
          interactiveCardClass,
          (done || cancelled) && "opacity-75",
          overdue && "border-l-4 border-l-dashboard-danger",
        )}
        onClick={() => onOpen(task)}
      >
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={(e) => onToggleComplete(task, e)}
              className="text-muted-foreground hover:text-accent cursor-pointer flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus rounded"
              disabled={cancelled}
              aria-label={done ? "Reopen task" : "Mark task done"}
            >
              {done ? (
                <CheckSquare className="w-4 h-4 text-accent" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </button>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-semibold truncate",
                  (done || cancelled) && "line-through text-muted-foreground",
                )}
              >
                {task.title}
              </p>
              <p
                className={cn(
                  "text-xs truncate",
                  overdue ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {caseLabel || "General Task"}
                {due ? ` — Due: ${due}` : ""}
                {overdue ? " (Overdue)" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge tone={getDashboardStatusTone(task.priority)} className="capitalize">
              {task.priority}
            </StatusBadge>
            <StatusBadge tone={getDashboardStatusTone(task.status)}>
              {TASK_STATUS_LABELS[task.status as TaskStatus] || task.status}
            </StatusBadge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      draggable={draggable && !cancelled}
      onDragStart={(e) => onDragStart?.(task, e)}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        interactiveCardClass,
        (done || cancelled) && "opacity-75",
        overdue && "border-l-4 border-l-dashboard-danger",
        draggable && !cancelled && "cursor-grab active:cursor-grabbing",
      )}
      onClick={() => onOpen(task)}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {draggable && !cancelled && (
            <GripVertical className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/50 shrink-0" />
          )}
          <button
            type="button"
            onClick={(e) => onToggleComplete(task, e)}
            className="mt-0.5 text-muted-foreground hover:text-accent cursor-pointer flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus rounded"
            disabled={cancelled}
            aria-label={done ? "Reopen task" : "Mark task done"}
          >
            {done ? (
              <CheckSquare className="w-4 h-4 text-accent" />
            ) : (
              <Circle className="w-4 h-4" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm font-semibold truncate",
                (done || cancelled) && "line-through text-muted-foreground",
              )}
            >
              {task.title}
            </p>
            {caseLabel && (
              <p className="text-xs font-semibold text-muted-foreground truncate mt-0.5">
                {caseLabel}
              </p>
            )}
            <div className="flex items-center justify-between gap-1.5 mt-2 flex-wrap">
              <StatusBadge
                tone={getDashboardStatusTone(task.priority)}
                className="text-[9px] uppercase"
              >
                {task.priority}
              </StatusBadge>
              {due && !done && (
                <span
                  className={cn(
                    "text-[10px]",
                    overdue ? "text-destructive font-semibold" : "text-muted-foreground",
                  )}
                >
                  Due: {due}
                  {overdue ? " · Overdue" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
