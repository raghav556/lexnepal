import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckSquare,
  FolderOpen,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "@/client/navigation";
import { useCases } from "@/client/queries/cases";
import { useHearings } from "@/client/queries/hearings";
import { useStaffDirectory } from "@/client/queries/identity";
import { useTasks, useTaskWorkload } from "@/client/queries/tasks";
import {
  DashboardButton,
  DashboardSection,
  EmptyState,
  PortalPageShell,
  StatusBadge,
} from "@/components/dashboard";
import {
  DASHBOARD_METRIC_TONES,
  DASHBOARD_TONE_BORDER_CLASSES,
  DASHBOARD_TONE_FILL_CLASSES,
  DASHBOARD_TONE_PANEL_CLASSES,
  getDashboardStatusTone,
  type DashboardTone,
} from "@/lib/dashboard-semantics";

type WorkloadRow = {
  assignedTo: string;
  total: number;
  urgent: number;
  overdue: number;
};

export default function StaffDashboard() {
  const casesResult = useCases({});
  const hearingsResult = useHearings({});
  const tasksResult = useTasks({});
  const workloadResult = useTaskWorkload();
  const usersResult = useStaffDirectory();
  const cases = casesResult || [];
  const hearings = hearingsResult || [];
  const tasks = tasksResult || [];
  const workload = workloadResult || [];
  const users = usersResult || [];
  const isLoading =
    casesResult === undefined ||
    hearingsResult === undefined ||
    tasksResult === undefined ||
    workloadResult === undefined ||
    usersResult === undefined;

  const activeCasesCount = cases.filter((item) => item.status === "active").length;
  const todayHearingsCount = hearings.filter((item) => item.status === "scheduled").length;
  const pendingTasks = tasks.filter(
    (item) => item.status === "todo" || item.status === "in_progress",
  );
  const pendingTasksCount = pendingTasks.length;
  const urgentPending = pendingTasks.some(
    (item) => item.priority === "urgent" || item.priority === "high",
  );

  const metrics = [
    {
      label: "Active cases",
      value: String(activeCasesCount),
      icon: FolderOpen,
      tone: DASHBOARD_METRIC_TONES.cases,
      helper: "Matters in progress",
    },
    {
      label: "Hearings",
      value: String(todayHearingsCount),
      icon: CalendarDays,
      tone: DASHBOARD_METRIC_TONES.hearings,
      helper: "Scheduled next",
    },
    {
      label: "Pending tasks",
      value: String(pendingTasksCount),
      icon: CheckSquare,
      tone: urgentPending ? ("danger" as const) : DASHBOARD_METRIC_TONES.tasks,
      helper: urgentPending ? "Urgent work needs attention" : "Work queue healthy",
    },
    {
      label: "Team members",
      value: String(users.length),
      icon: Users,
      tone: DASHBOARD_METRIC_TONES.people,
      helper: "Available in directory",
    },
  ];

  const upcomingHearings = hearings
    .filter((item) => item.status === "scheduled")
    .slice(0, 3)
    .map((hearing) => {
      const matchedCase = cases.find((item) => item._id === hearing.caseId);
      return {
        id: hearing._id,
        case: matchedCase?.title || "Unknown case",
        court: hearing.court,
        dateBs: hearing.dateBs,
        time: hearing.time || "N/A",
        urgent: hearing.purpose?.toLowerCase().includes("final") || false,
      };
    });
  const priorityTasks = tasks
    .filter((item) => item.status !== "done" && item.status !== "cancelled")
    .sort((a, b) => {
      const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
    })
    .slice(0, 3)
    .map((task) => ({
      id: task._id,
      title: task.title,
      due: task.dueDateBs || "No due date",
      priority: task.priority,
    }));

  return (
    <PortalPageShell
      portal="staff"
      loading={isLoading}
      loadingLabel="Preparing your operations workspace…"
      eyebrow="Operations workspace"
      title="Today’s legal work, clearly prioritized"
      description="A focused view of hearings, deadlines, cases, and team capacity."
      icon={Sparkles}
      actions={
        <>
          <DashboardButton asChild size="sm" variant="primary">
            <Link href="/staff/tasks">
              Open tasks <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </DashboardButton>
          <DashboardButton asChild size="sm" variant="outline">
            <Link href="/staff/hearings">Hearings</Link>
          </DashboardButton>
        </>
      }
      metrics={metrics.map((metric) => ({
        label: metric.label,
        value: metric.value,
        icon: metric.icon,
        tone: metric.tone,
        helperText: metric.helper,
      }))}
      heroChildren={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={urgentPending ? "danger" : "success"}>
            {urgentPending ? "Urgent items present" : "Work queue healthy"}
          </StatusBadge>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardSection
          title="Upcoming hearings"
          description="Court commitments and milestone dates"
          icon={CalendarDays}
          actions={
            <DashboardButton asChild variant="ghost" size="sm">
              <Link href="/staff/hearings">
                View all <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </DashboardButton>
          }
        >
          {upcomingHearings.length === 0 ? (
            <EmptyState
              title="No upcoming hearings"
              description="New scheduled court hearings will appear here."
              icon={CalendarDays}
              tone="neutral"
            />
          ) : (
            <div className="space-y-3">
              {upcomingHearings.map((hearing) => (
                <div
                  key={hearing.id}
                  className="flex items-center gap-3 rounded-xl border border-dashboard-border bg-dashboard-canvas-elevated/40 p-3.5 transition-all hover:border-dashboard-border hover:bg-dashboard-panel-hover"
                >
                  <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border border-dashboard-primary/30 bg-dashboard-primary-soft text-dashboard-primary">
                    <span className="text-xs font-bold leading-none">
                      {hearing.dateBs.split(" ")[0] || "Court"}
                    </span>
                    <span className="mt-1 text-[10px] leading-none opacity-80">
                      {hearing.dateBs.split(" ")[1] || ""}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{hearing.case}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {hearing.court} · {hearing.time}
                    </p>
                  </div>
                  {hearing.urgent ? (
                    <StatusBadge tone="danger" icon={AlertTriangle}>
                      Urgent
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="warning">Scheduled</StatusBadge>
                  )}
                </div>
              ))}
            </div>
          )}
        </DashboardSection>

        <DashboardSection
          title="Priority tasks"
          description="Ordered by urgency and due date"
          icon={CheckSquare}
          actions={
            <DashboardButton asChild variant="ghost" size="sm">
              <Link href="/staff/tasks">
                View all <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </DashboardButton>
          }
        >
          {priorityTasks.length === 0 ? (
            <EmptyState
              title="No pending tasks"
              description="Your active task queue is clear."
              icon={CheckSquare}
              tone="success"
            />
          ) : (
            <div className="space-y-3">
              {priorityTasks.map((task) => {
                const tone = getDashboardStatusTone(task.priority);
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-dashboard-border bg-dashboard-canvas-elevated/40 p-3.5 transition-all hover:border-dashboard-border hover:bg-dashboard-panel-hover"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{task.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Due: {String(task.due)}</p>
                    </div>
                    <StatusBadge tone={tone} className="shrink-0 uppercase">
                      {task.priority}
                    </StatusBadge>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardSection>
      </div>

      <DashboardSection
        title="Team workload"
        description="Open, high-priority, and overdue assignments"
        icon={Users}
        actions={
          <DashboardButton asChild variant="ghost" size="sm">
            <Link href="/staff/tasks">
              Open board <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </DashboardButton>
        }
      >
        {workload.length === 0 ? (
          <EmptyState
            title="No open workload"
            description="Assignments will populate this team view."
            icon={Users}
            tone="neutral"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(workload as WorkloadRow[]).slice(0, 6).map((row) => {
              const user = users.find(
                (item: any) => item.id === row.assignedTo || item._id === row.assignedTo,
              );
              const tone: DashboardTone =
                row.overdue > 0 ? "danger" : row.urgent > 0 ? "warning" : "neutral";
              const load = Math.min(Math.max(Number(row.total) * 12, 12), 100);
              return (
                <div
                  key={row.assignedTo}
                  className="rounded-xl border border-dashboard-border bg-dashboard-canvas-elevated/40 p-4 transition-all hover:border-dashboard-border hover:bg-dashboard-panel-hover"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {user?.name || user?.email || "Team member"}
                    </p>
                    <StatusBadge tone={tone}>
                      {row.overdue > 0 ? `${row.overdue} overdue` : `${row.total} open`}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {row.total} open · {row.urgent} high priority
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full border border-dashboard-border/30 bg-dashboard-panel">
                    <div
                      className={`h-full rounded-full ${DASHBOARD_TONE_FILL_CLASSES[tone]}`}
                      style={{ width: `${load}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashboardSection>
    </PortalPageShell>
  );
}
