import { BarChart3, Briefcase, CalendarDays, CheckSquare, UserPlus, Users } from "lucide-react";
import { useDashboardData } from "@/client/queries/analytics";
import { ChartSurface, EmptyState, PortalPageShell, StatusBadge } from "@/components/dashboard";
import {
  DASHBOARD_METRIC_TONES,
  DASHBOARD_TONE_FILL_CLASSES,
  getDashboardStatusTone,
} from "@/lib/dashboard-semantics";

function Distribution({ values }: { values: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(values));
  return (
    <div className="space-y-4">
      {Object.entries(values).map(([label, count]) => {
        const tone = getDashboardStatusTone(label);
        return (
          <div key={label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium capitalize text-foreground">
                {label.replaceAll("_", " ")}
              </span>
              <StatusBadge tone={tone}>{count}</StatusBadge>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-dashboard-neutral-soft">
              <div
                className={`h-full rounded-full ${DASHBOARD_TONE_FILL_CLASSES[tone]}`}
                style={{ width: `${Math.max(8, (count / max) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const data = useDashboardData();

  return (
    <PortalPageShell
      portal="admin"
      loading={!data}
      loadingLabel="Loading operational analytics…"
      decorated
      showTodayDate
      eyebrow="Firm intelligence"
      title="Operational analytics"
      description="Live matter, client, intake, task, staff, and hearing intelligence."
      icon={BarChart3}
      metrics={
        data
          ? [
              {
                label: "Active cases",
                value: String(data.activeCases),
                icon: Briefcase,
                tone: DASHBOARD_METRIC_TONES.cases,
                helperText: `Across ${data.totalCases} total matters`,
              },
              {
                label: "Active clients",
                value: String(data.activeClients),
                icon: Users,
                tone: DASHBOARD_METRIC_TONES.people,
                helperText: "Current client relationships",
              },
              {
                label: "Open leads",
                value: String(data.openLeads),
                icon: UserPlus,
                tone: "information",
                helperText: "New or contacted enquiries",
              },
              {
                label: "Active staff",
                value: String(data.activeStaff),
                icon: Users,
                tone: "neutral",
                helperText: "Enabled firm accounts",
              },
            ]
          : undefined
      }
    >
      {data ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartSurface title="Active matters by practice area">
            {Object.keys(data.mattersByPractice).length === 0 ? (
              <EmptyState
                title="No active matters"
                description="Practice-area distribution appears when matters become active."
                icon={Briefcase}
              />
            ) : (
              <Distribution values={data.mattersByPractice} />
            )}
          </ChartSurface>

          <ChartSurface title="Matter status distribution">
            {Object.keys(data.casesByStatus).length === 0 ? (
              <EmptyState
                title="No case data"
                description="Matter status counts appear when cases are created."
                icon={Briefcase}
              />
            ) : (
              <Distribution values={data.casesByStatus} />
            )}
          </ChartSurface>

          <ChartSurface
            title="Task status distribution"
            description={`${data.openTasks} open task${data.openTasks === 1 ? "" : "s"}`}
          >
            {Object.keys(data.tasksByStatus).length === 0 ? (
              <EmptyState
                title="No task activity"
                description="Task distribution appears when work is assigned."
                icon={CheckSquare}
              />
            ) : (
              <Distribution values={data.tasksByStatus} />
            )}
          </ChartSurface>

          <ChartSurface
            title="Scheduled hearings by month"
            description={`${data.upcomingHearings} upcoming hearing${data.upcomingHearings === 1 ? "" : "s"}`}
          >
            {data.hearingsByMonth.length === 0 ? (
              <EmptyState
                title="No upcoming hearings"
                description="Monthly court commitments appear when hearings are scheduled."
                icon={CalendarDays}
              />
            ) : (
              <Distribution
                values={Object.fromEntries(
                  data.hearingsByMonth.map((row) => [row.month, row.count]),
                )}
              />
            )}
          </ChartSurface>
        </div>
      ) : null}
    </PortalPageShell>
  );
}
