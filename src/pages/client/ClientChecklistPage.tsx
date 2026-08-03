import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { CheckSquare, Circle, Loader2, ClipboardList } from "lucide-react";
import { useQuery } from "@/client/data/convex-bridge.ts";
import { api } from "@/convex/_generated/api.js";
import { useMyClient } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";
import { useTasks } from "@/client/queries/tasks";
import { cn } from "@/lib/utils.ts";
import { formatTaskDue, PRIORITY_COLORS, TASK_STATUS_LABELS, type TaskStatus } from "@/lib/task-constants.ts";
import { useI18n } from "@/lib/i18n-context.tsx";

/**
 * Client-visible checklist items only (tasks.clientVisible on the client's cases).
 * Clients cannot mutate tasks — read-only progress view.
 */
export default function ClientChecklistPage() {
  const { t } = useI18n();
  const clientRecord = useMyClient();
  const clientId = clientRecord?._id;
  const cases = useCases(clientId ? { clientId } : {}) || [];
  const tasks = useTasks() || [];

  const caseIds = useMemo(() => new Set(cases.map((c: any) => c._id)), [cases]);
  const checklist = useMemo(
    () =>
      tasks.filter(
        (t: any) =>
          t.clientVisible &&
          t.caseId &&
          caseIds.has(t.caseId) &&
          !t.archivedAt &&
          !t.parentTaskId,
      ),
    [tasks, caseIds],
  );

  if (clientRecord === undefined) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const done = checklist.filter((t: any) => t.status === "done").length;

  return (
    <div className="p-4 sm:p-6 space-y-4 font-sans max-w-3xl mx-auto">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">{t("tasks.client_checklist")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("tasks.client_checklist_sub")}</p>
      </div>

      <Card>
        <CardHeader className="py-3 border-b border-border bg-secondary/20">
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              {t("tasks.your_items")}
            </span>
            <span className="text-xs font-mono font-normal text-muted-foreground">
              {done}/{checklist.length} {t("tasks.done")}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {checklist.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">{t("tasks.no_client_items")}</p>
          ) : (
            checklist.map((task: any) => {
              const matchedCase = cases.find((c: any) => c._id === task.caseId);
              const due = formatTaskDue(task);
              const isDone = task.status === "done";
              return (
                <div
                  key={task._id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    isDone ? "bg-secondary/30 opacity-70" : "bg-card",
                  )}
                >
                  {isDone ? (
                    <CheckSquare className="w-4 h-4 mt-0.5 text-accent shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-semibold", isDone && "line-through text-muted-foreground")}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                      {matchedCase && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          [{matchedCase.caseNumber}]
                        </span>
                      )}
                      {due && <span className="text-[10px] text-muted-foreground">Due: {due}</span>}
                      <Badge className={`text-[9px] uppercase ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge>
                      <Badge variant="secondary" className="text-[9px]">
                        {TASK_STATUS_LABELS[task.status as TaskStatus] || task.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
