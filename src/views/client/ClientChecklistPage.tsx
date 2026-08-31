"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Circle,
  ClipboardList,
  MessageSquare,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useMyClient } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";
import { useTasks } from "@/client/queries/tasks";
import { cn } from "@/lib/utils.ts";
import { formatTaskDue, TASK_STATUS_LABELS, type TaskStatus } from "@/lib/task-constants.ts";
import { useI18n } from "@/lib/i18n-context.tsx";
import {
  DashboardButton,
  DashboardListRow,
  DashboardListSkeleton,
  DashboardSection,
  DashboardStatusLabel,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { DASHBOARD_METRIC_TONES } from "@/lib/dashboard-semantics";

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
        (task: any) =>
          task.clientVisible &&
          task.caseId &&
          caseIds.has(task.caseId) &&
          !task.archivedAt &&
          !task.parentTaskId,
      ),
    [tasks, caseIds],
  );

  const done = checklist.filter((task: any) => task.status === "done").length;
  const pending = checklist.length - done;
  const completionRate = checklist.length > 0 ? Math.round((done / checklist.length) * 100) : 100;

  if (clientRecord === undefined) {
    return (
      <PortalPageShell
        portal="client"
        loading
        loadingLabel="Loading your checklist items…"
        title="Checklist"
      >
        <div />
      </PortalPageShell>
    );
  }

  if (clientRecord === null) {
    return (
      <PortalPageShell
        portal="client"
        decorated
        showTodayDate
        eyebrow="Matter Progress"
        title="Action Checklist"
        description="Shared action items and legal milestones."
        icon={ClipboardList}
      >
        <EmptyState
          title="No client profile linked"
          description="Your portal account is not linked to a client profile yet. Contact the firm to view case action checklists."
          icon={ClipboardList}
        />
      </PortalPageShell>
    );
  }

  const metrics = [
    {
      label: "Total Action Items",
      value: String(checklist.length),
      icon: ClipboardList,
      tone: DASHBOARD_METRIC_TONES.cases,
      helperText: "Matter milestones",
    },
    {
      label: "Completed",
      value: String(done),
      icon: CheckCircle2,
      tone: "success" as const,
      helperText: `${completionRate}% completed`,
    },
    {
      label: "Pending Action",
      value: String(pending),
      icon: Clock,
      tone: pending > 0 ? ("warning" as const) : ("success" as const),
      helperText: "In progress items",
    },
  ];

  return (
    <PortalPageShell
      portal="client"
      decorated
      showTodayDate
      eyebrow="Matter Progress"
      title="Action Checklist"
      description="Track shared action items, document submissions, and case milestones managed by your legal team."
      icon={ClipboardList}
      metrics={metrics}
      actions={
        <DashboardButton asChild size="sm" variant="secondary">
          <Link href="/client/messages">
            <MessageSquare className="w-4 h-4 mr-1.5" /> Ask your advocate
          </Link>
        </DashboardButton>
      }
    >
      <DashboardSection
        title="Your action items"
        description={`Showing ${checklist.length} shared item${checklist.length === 1 ? "" : "s"}`}
        icon={ClipboardList}
        actions={
          <span className="text-xs font-mono font-semibold text-muted-foreground bg-dashboard-neutral-soft px-2.5 py-1 rounded-md border border-dashboard-border">
            {done}/{checklist.length} {t("tasks.done") || "Done"}
          </span>
        }
      >
        {tasks === undefined ? (
          <DashboardListSkeleton rows={4} />
        ) : checklist.length === 0 ? (
          <EmptyState
            title="No shared action items yet"
            description="When your legal team shares checklist items on your matters, they will appear here. You can message the firm or book a consultation in the meantime."
            icon={ClipboardList}
            action={
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <DashboardButton asChild size="sm" variant="outline">
                  <Link href="/client/messages">
                    <MessageSquare className="w-4 h-4 mr-1.5" />
                    Messages
                  </Link>
                </DashboardButton>
                <DashboardButton asChild size="sm" variant="outline">
                  <Link href="/client/booking">
                    <Calendar className="w-4 h-4 mr-1.5" />
                    Book Appointment
                  </Link>
                </DashboardButton>
              </div>
            }
          />
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5 rounded-xl border border-dashboard-border bg-dashboard-panel p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Milestone Completion</span>
                <span className="font-mono font-bold text-dashboard-primary">
                  {completionRate}% Completed
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-dashboard-neutral-soft">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-dashboard-primary to-dashboard-focus transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
            {checklist.map((task: any) => {
              const matchedCase = cases.find((c: any) => c._id === task.caseId);
              const due = formatTaskDue(task);
              const isDone = task.status === "done";
              return (
                <DashboardListRow
                  key={task._id}
                  className={cn(
                    "flex items-start gap-3 p-4",
                    isDone && "bg-dashboard-neutral-soft/40 opacity-80",
                  )}
                >
                  {isDone ? (
                    <CheckSquare className="w-5 h-5 mt-0.5 text-dashboard-success shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 mt-0.5 text-dashboard-neutral shrink-0" />
                  )}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm font-semibold text-foreground",
                          isDone && "line-through text-muted-foreground",
                        )}
                      >
                        {task.title}
                      </p>
                      {matchedCase ? (
                        <span className="text-[10px] font-mono text-muted-foreground bg-dashboard-neutral-soft px-1.5 py-0.5 rounded border border-dashboard-border shrink-0">
                          {matchedCase.caseNumber}
                        </span>
                      ) : null}
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1 items-center">
                      {due && (
                        <span className="text-[10px] text-muted-foreground font-medium">
                          Due: {due}
                        </span>
                      )}
                      <DashboardStatusLabel
                        status={task.priority}
                        className="text-[10px] uppercase"
                      />
                      <DashboardStatusLabel
                        status={task.status}
                        label={TASK_STATUS_LABELS[task.status as TaskStatus] || task.status}
                        className="text-[10px]"
                      />
                    </div>
                  </div>
                </DashboardListRow>
              );
            })}
          </div>
        )}
      </DashboardSection>
    </PortalPageShell>
  );
}
