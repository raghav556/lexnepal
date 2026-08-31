import { useDashboardData } from "@/client/queries/analytics";
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Clock,
  Users,
  Banknote,
  Briefcase,
  Activity,
} from "lucide-react";
import { ChartSurface, EmptyState, PortalPageShell } from "@/components/dashboard";
import {
  DASHBOARD_METRIC_TONES,
  DASHBOARD_TONE_FILL_CLASSES,
  getDashboardStatusTone,
} from "@/lib/dashboard-semantics";

function formatCurrency(amount: number) {
  if (amount >= 100000) return `Rs. ${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `Rs. ${(amount / 1000).toFixed(1)}K`;
  return `Rs. ${amount}`;
}

export default function AdminAnalyticsPage() {
  const data = useDashboardData();

  return (
    <PortalPageShell
      portal="admin"
      loading={!data}
      loadingLabel="Loading analytics…"
      decorated
      showTodayDate
      eyebrow="Firm intelligence"
      titleKey="portal.analytics.title"
      descriptionKey="portal.analytics.description"
      icon={BarChart3}
      metrics={
        data
          ? [
              {
                label: "Total revenue",
                value: new Intl.NumberFormat("en-NP", {
                  style: "currency",
                  currency: "NPR",
                }).format(data.totalRevenue || 0),
                icon: Banknote,
                tone: DASHBOARD_METRIC_TONES.revenue,
                helperText: "From paid invoices",
                trend: (
                  <span className="inline-flex items-center gap-1">
                    <TrendingUp className="size-3" aria-hidden /> Collected
                  </span>
                ),
              },
              {
                label: "Realization rate",
                value: `${data.realizationRate || 0}%`,
                icon: Activity,
                tone: "information",
                helperText: "Billed vs collected",
              },
              {
                label: "Avg case value",
                value: new Intl.NumberFormat("en-NP", {
                  style: "currency",
                  currency: "NPR",
                }).format(data.avgCaseValue || 0),
                icon: Briefcase,
                tone: DASHBOARD_METRIC_TONES.cases,
                helperText: `Across ${data.totalCases} cases`,
              },
              {
                label: "Client retention",
                value: `${data.retentionRate || 0}%`,
                icon: Users,
                tone: DASHBOARD_METRIC_TONES.people,
                helperText: "Active vs total clients",
              },
            ]
          : undefined
      }
    >
      {data ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartSurface title="Revenue by practice area">
            {Object.keys(data.revenueByPractice || {}).length === 0 ? (
              <EmptyState
                title="No revenue data"
                description="Paid invoice revenue by practice area will appear here."
                icon={PieChart}
              />
            ) : (
              <div className="space-y-4">
                {Object.entries(data.revenueByPractice || {}).map(([area, rev]) => {
                  const practiceValues = Object.values(data.revenueByPractice || {});
                  const maxPracticeRevenue = Math.max(
                    1,
                    ...(practiceValues.length ? practiceValues : [1]),
                  );
                  return (
                    <div key={area}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-foreground">{area}</span>
                        <span className="text-muted-foreground">{formatCurrency(rev)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-dashboard-neutral-soft">
                        <div
                          className="h-full bg-dashboard-primary transition-all duration-1000"
                          style={{ width: `${(rev / maxPracticeRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartSurface>

          <ChartSurface title="Billable hours by staff">
            {Object.keys(data.hoursByAssociate || {}).length === 0 ? (
              <EmptyState
                title="No time entries"
                description="Staff billable hours will appear once time is logged."
                icon={Clock}
              />
            ) : (
              <div className="space-y-4">
                {Object.entries(data.hoursByAssociate || {}).map(([name, hours]) => {
                  const assocValues = Object.values(data.hoursByAssociate || {});
                  const maxAssocHours = Math.max(1, ...(assocValues.length ? assocValues : [1]));
                  return (
                    <div key={name}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-foreground">{name}</span>
                        <span className="text-muted-foreground">{hours} hrs</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-dashboard-neutral-soft">
                        <div
                          className="h-full bg-dashboard-success transition-all duration-1000"
                          style={{ width: `${(hours / maxAssocHours) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartSurface>

          <ChartSurface title="Revenue trend (last 6 months)">
            {(data.monthlyRevenue || []).length === 0 ? (
              <EmptyState
                title="No monthly revenue"
                description="Revenue trends will build as invoices are paid."
                icon={TrendingUp}
              />
            ) : (
              <div className="mt-4 flex h-48 items-end justify-between gap-2">
                {(data.monthlyRevenue || []).map((m, idx) => {
                  const maxMonthly = Math.max(
                    1,
                    ...(data.monthlyRevenue || []).map((row) => row.revenue),
                  );
                  const heightPct = Math.max(10, (m.revenue / maxMonthly) * 100);
                  return (
                    <div key={idx} className="group flex flex-1 flex-col items-center gap-2">
                      <div className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        {formatCurrency(m.revenue)}
                      </div>
                      <div
                        className="w-full rounded-t-sm bg-dashboard-information transition-colors group-hover:bg-dashboard-primary"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="w-full truncate text-center text-xs text-muted-foreground">
                        {m.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartSurface>

          <ChartSurface title="Case status distribution">
            {Object.keys(data.casesByStatus || {}).length === 0 ? (
              <EmptyState
                title="No case data"
                description="Case status breakdown will appear as matters are created."
                icon={Briefcase}
              />
            ) : (
              <div className="flex flex-1 flex-col justify-center space-y-4">
                {Object.entries(data.casesByStatus || {}).map(([status, count]) => {
                  const pct = data.totalCases > 0 ? Math.round((count / data.totalCases) * 100) : 0;
                  const tone = getDashboardStatusTone(status);
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className={`size-3 rounded-full ${DASHBOARD_TONE_FILL_CLASSES[tone]}`} />
                      <span className="flex-1 text-sm font-medium capitalize text-foreground">
                        {status.replace("_", " ")}
                      </span>
                      <span className="text-sm font-semibold">{count}</span>
                      <span className="w-12 text-right text-xs text-muted-foreground">{pct}%</span>
                    </div>
                  );
                })}
                <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full">
                  {Object.entries(data.casesByStatus || {}).map(([status, count]) => {
                    const pct = data.totalCases > 0 ? (count / data.totalCases) * 100 : 0;
                    const tone = getDashboardStatusTone(status);
                    return (
                      <div
                        key={status}
                        className={`h-full ${DASHBOARD_TONE_FILL_CLASSES[tone]}`}
                        style={{ width: `${pct}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </ChartSurface>
        </div>
      ) : null}
    </PortalPageShell>
  );
}
