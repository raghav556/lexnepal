import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { CheckSquare, Circle, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import {
  PRIORITY_COLORS,
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

  if (variant === "list") {
    return (
      <Card
        className={cn(
          "hover:shadow-sm cursor-pointer",
          (done || cancelled) && "opacity-75",
          overdue && "border-destructive/40",
        )}
        onClick={() => onOpen(task)}
      >
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={(e) => onToggleComplete(task, e)}
              className="text-muted-foreground hover:text-accent cursor-pointer flex-shrink-0"
              disabled={cancelled}
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
            <Badge className={`text-xs capitalize ${PRIORITY_COLORS[task.priority]}`}>
              {task.priority}
            </Badge>
            <Badge variant="secondary" className="text-xs capitalize">
              {TASK_STATUS_LABELS[task.status as TaskStatus] || task.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      draggable={draggable && !cancelled}
      onDragStart={(e) => onDragStart?.(task, e)}
      className={cn(
        "hover:shadow-md transition-all cursor-pointer",
        (done || cancelled) && "opacity-75",
        overdue && "border-destructive/40",
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
            className="mt-0.5 text-muted-foreground hover:text-accent cursor-pointer flex-shrink-0"
            disabled={cancelled}
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
              <Badge className={`text-[9px] uppercase ${PRIORITY_COLORS[task.priority]}`}>
                {task.priority}
              </Badge>
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
