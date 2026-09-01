import {
  ArrowRight,
  CalendarDays,
  CheckSquare,
  FolderOpen,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { Link } from "@/client/navigation";
import { useCases } from "@/client/queries/cases";
import { useClients } from "@/client/queries/clients";
import { useLeads } from "@/client/queries/crm";
import { useHearings } from "@/client/queries/hearings";
import { useTasks } from "@/client/queries/tasks";
import {
  ChartSurface,
  DashboardButton,
  DashboardListRow,
  EmptyState,
  PortalPageShell,
  StatusBadge,
} from "@/components/dashboard";
import {
  DASHBOARD_METRIC_TONES,
  DASHBOARD_TONE_FILL_CLASSES,
  getDashboardStatusTone,
} from "@/lib/dashboard-semantics";

function countBy<T>(rows: T[], key: (row: T) => string) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const value = key(row) || "Unspecified";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

export default function AdminDashboard() {
  const casesResult = useCases({});
  const clientsResult = useClients();
  const hearingsResult = useHearings({});
  const tasksResult = useTasks({});
  const { data: leads, isLoading: leadsLoading } = useLeads();

  const cases = casesResult ?? [];
  const clients = clientsResult ?? [];
  const hearings = hearingsResult ?? [];
  const tasks = tasksResult ?? [];
  const activeCases = cases.filter((item) => item.status === "active");
  const activeClients = clients.filter((item) => item.isActive);
  const openLeads = leads.filter((item) => item.status === "new" || item.status === "contacted");
  const upcomingHearings = hearings.filter((item) => item.status === "scheduled");
  const openTasks = tasks.filter((item) => item.status === "todo" || item.status === "in_progress");

  const casesByPractice = countBy(activeCases, (item) => item.practiceArea || "Other");
  const casesByStatus = countBy(cases, (item) => item.status || "open");
  const tasksByStatus = countBy(tasks, (item) => item.status || "todo");
  const maxPracticeCount = Math.max(1, ...Object.values(casesByPractice));
  const maxTaskCount = Math.max(1, ...Object.values(tasksByStatus));
  const isLoading =
    casesResult === undefined ||
    clientsResult === undefined ||
    hearingsResult === undefined ||
    tasksResult === undefined ||
    leadsLoading;

  return (
    <PortalPageShell
      portal="admin"
      loading={isLoading}
      loadingLabel="Preparing operational intelligence…"
      eyebrow="Executive command center"
      title="Firm operations, clearly in focus"
      description="Live matter, client, hearing, task, and intake intelligence for the firm."
      icon={Sparkles}
      actions={
        <>
          <DashboardButton asChild size="sm">
            <Link href="/admin/clients">
              Clients <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </DashboardButton>
          <DashboardButton asChild size="sm" variant="secondary">
            <Link href="/admin/analytics">View analytics</Link>
          </DashboardButton>
        </>
      }
      heroChildren={
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={openTasks.length > 0 ? "warning" : "success"} icon={CheckSquare}>
            {openTasks.length} open task{openTasks.length === 1 ? "" : "s"}
          </StatusBadge>
          <StatusBadge tone="primary">Live database</StatusBadge>
        </div>
      }
      metrics={[
        {
          label: "Active cases",
          value: String(activeCases.length),
          icon: FolderOpen,
          tone: DASHBOARD_METRIC_TONES.cases,
          helperText: "Matters in progress",
        },
        {
          label: "Active clients",
          value: String(activeClients.length),
          icon: Users,
          tone: DASHBOARD_METRIC_TONES.people,
          helperText: "Current client relationships",
        },
        {
          label: "Open leads",
          value: String(openLeads.length),
          icon: UserPlus,
          tone: "information",
          helperText: "New or contacted enquiries",
        },
        {
          label: "Upcoming hearings",
          value: String(upcomingHearings.length),
          icon: CalendarDays,
          tone: DASHBOARD_METRIC_TONES.hearings,
          helperText: "Scheduled court commitments",
        },
      ]}
    >
      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartSurface title="Active matters by practice area" description="Current portfolio mix">
          {Object.keys(casesByPractice).length === 0 ? (
            <EmptyState
              title="No active matters"
              description="Practice-area distribution appears when matters become active."
              icon={FolderOpen}
            />
          ) : (
            <div className="space-y-4">
              {Object.entries(casesByPractice).map(([area, count]) => (
                <div key={area}>
                  <div className="mb-1.5 flex justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-foreground">{area}</span>
                    <span className="font-semibold text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-dashboard-neutral-soft">
                    <div
                      className="h-full rounded-full bg-dashboard-primary"
                      style={{ width: `${Math.max(8, (count / maxPracticeCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartSurface>

        <ChartSurface title="Task status" description="Firm work queue across all matters">
          {Object.keys(tasksByStatus).length === 0 ? (
            <EmptyState
              title="No task activity"
              description="Task status distribution appears when work is assigned."
              icon={CheckSquare}
            />
          ) : (
            <div className="space-y-4">
              {Object.entries(tasksByStatus).map(([status, count]) => {
                const tone = getDashboardStatusTone(status);
                return (
                  <div key={status}>
                    <div className="mb-1.5 flex justify-between gap-3 text-sm">
                      <span className="font-medium capitalize text-foreground">
                        {status.replaceAll("_", " ")}
                      </span>
                      <StatusBadge tone={tone}>{count}</StatusBadge>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-dashboard-neutral-soft">
                      <div
                        className={`h-full rounded-full ${DASHBOARD_TONE_FILL_CLASSES[tone]}`}
                        style={{ width: `${Math.max(8, (count / maxTaskCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartSurface>

        <ChartSurface title="Matter status" description="Lifecycle distribution across all cases">
          {Object.keys(casesByStatus).length === 0 ? (
            <EmptyState
              title="No matter data"
              description="Matter status counts appear when cases are created."
              icon={FolderOpen}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(casesByStatus).map(([status, count]) => (
                <div
                  key={status}
                  className="rounded-xl border border-dashboard-border bg-dashboard-canvas-elevated/50 p-4"
                >
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className="mt-1 text-xs font-medium capitalize text-muted-foreground">
                    {status.replaceAll("_", " ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ChartSurface>

        <ChartSurface title="Upcoming hearings" description="Next scheduled court commitments">
          {upcomingHearings.length === 0 ? (
            <EmptyState
              title="No upcoming hearings"
              description="Scheduled hearings will appear here."
              icon={CalendarDays}
            />
          ) : (
            <div className="space-y-3">
              {upcomingHearings.slice(0, 5).map((hearing) => {
                const matter = cases.find((item) => item._id === hearing.caseId);
                return (
                  <DashboardListRow key={hearing._id}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {matter?.title || "Hearing"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {hearing.court} · {hearing.dateBs || hearing.dateGregorian}
                      </p>
                    </div>
                    <StatusBadge tone="information">Scheduled</StatusBadge>
                  </DashboardListRow>
                );
              })}
            </div>
          )}
        </ChartSurface>
      </div>
    </PortalPageShell>
  );
}
