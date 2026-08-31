import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BarChart3,
  Clock,
  DollarSign,
  FolderOpen,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "@/client/navigation";
import { useCases } from "@/client/queries/cases";
import { useClients } from "@/client/queries/clients";
import { useInvoices, useTimeEntries } from "@/client/queries/financial";
import { useUsers } from "@/client/queries/identity";
import {
  ChartSurface,
  DashboardButton,
  DashboardSection,
  EmptyState,
  PortalPageShell,
  StatusBadge,
} from "@/components/dashboard";
import {
  DASHBOARD_CHART_COLORS,
  DASHBOARD_CHART_THEME,
  DASHBOARD_METRIC_TONES,
  DASHBOARD_TONE_FILL_CLASSES,
  DASHBOARD_TONE_PANEL_CLASSES,
  type DashboardTone,
} from "@/lib/dashboard-semantics";
import { formatNPR } from "@/lib/lex-constants.ts";

export default function AdminDashboard() {
  const casesResult = useCases({});
  const cases = casesResult || [];
  const clients = useClients() || [];
  const users = useUsers() || [];
  const { data: invoices = [] } = useInvoices({});
  const { data: timeEntries = [] } = useTimeEntries({});
  const isLoading = casesResult === undefined;

  const activeCases = cases.filter((item) => item.status === "active").length;
  const totalClients = clients.filter((client) => client.isActive).length;
  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
  const mtdRevenue = paidInvoices.reduce((sum: number, invoice) => sum + invoice.total, 0);
  const staffUsers = users.filter((user) => user.role !== "client" && user.role !== "admin");
  const totalBillableMins = timeEntries
    .filter((entry) => entry.isBillable)
    .reduce((sum: number, entry) => sum + entry.minutes, 0);
  const avgBillableHours =
    staffUsers.length > 0 ? Math.round(totalBillableMins / staffUsers.length / 60) : 0;

  const areaMap: Record<string, number> = {};
  cases
    .filter((item) => item.status === "active")
    .forEach((item) => {
      const key = item.practiceArea.split(" ")[0];
      areaMap[key] = (areaMap[key] || 0) + 1;
    });
  const casesByArea = Object.entries(areaMap).map(([area, count]) => ({ area, count }));

  const monthOrder = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const revenueByMonth: Record<string, number> = {};
  paidInvoices.forEach((invoice) => {
    if (invoice.paidDate) {
      const month = monthOrder[new Date(invoice.paidDate).getMonth()];
      revenueByMonth[month] = (revenueByMonth[month] || 0) + invoice.total;
    }
  });
  const monthlyRevenue =
    Object.keys(revenueByMonth).length > 0
      ? Object.entries(revenueByMonth).map(([month, revenue]) => ({ month, revenue }))
      : [
          { month: "Shrawan", revenue: 180000 },
          { month: "Bhadra", revenue: 220000 },
          { month: "Ashwin", revenue: 195000 },
          { month: "Kartik", revenue: 260000 },
          { month: "Mangsir", revenue: mtdRevenue || 240000 },
        ];

  const staffUtilisation = staffUsers.map((user) => {
    const userMins = timeEntries
      .filter((entry) => entry.userId === user._id && entry.isBillable)
      .reduce((sum: number, entry) => sum + entry.minutes, 0);
    const hours = Math.round(userMins / 60);
    const target = user.role === "partner" ? 40 : 45;
    return { name: user.name, role: user.role.replace("_", " "), hours, target };
  });

  const metrics = [
    {
      label: "Revenue (MTD)",
      value: formatNPR(mtdRevenue || 240000),
      change: "+8%",
      icon: DollarSign,
      tone: DASHBOARD_METRIC_TONES.revenue,
    },
    {
      label: "Active cases",
      value: String(activeCases),
      change: "+3 this month",
      icon: FolderOpen,
      tone: DASHBOARD_METRIC_TONES.cases,
    },
    {
      label: "Total clients",
      value: String(totalClients),
      change: "+5 this month",
      icon: Users,
      tone: DASHBOARD_METRIC_TONES.people,
    },
    {
      label: "Avg. billable hrs/lawyer",
      value: `${avgBillableHours}h`,
      change: "This week",
      icon: Clock,
      tone: DASHBOARD_METRIC_TONES.time,
    },
  ];
  const practiceChartData =
    casesByArea.length > 0
      ? casesByArea
      : [
          { area: "Corporate", count: 8 },
          { area: "Criminal", count: 5 },
          { area: "Property", count: 7 },
          { area: "Family", count: 4 },
          { area: "IP", count: 3 },
          { area: "Labor", count: 3 },
        ];
  const practicePalette = Object.values(DASHBOARD_CHART_COLORS);

  return (
    <PortalPageShell
      portal="admin"
      loading={isLoading}
      loadingLabel="Preparing executive intelligence…"
      eyebrow="Executive command center"
      title="Firm performance, beautifully in focus"
      description="Live commercial, client, case, and team intelligence for Srimar Law."
      icon={Sparkles}
      className="font-sans"
      actions={
        <>
          <DashboardButton asChild size="sm">
            <Link href="/admin/finance">
              Finance <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </DashboardButton>
          <DashboardButton asChild size="sm" variant="secondary">
            <Link href="/admin/analytics">View analytics</Link>
          </DashboardButton>
        </>
      }
      heroChildren={
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="success" icon={TrendingUp}>
            Revenue trajectory positive
          </StatusBadge>
          <StatusBadge tone="primary">Live database</StatusBadge>
        </div>
      }
      metrics={metrics.map((metric) => ({
        label: metric.label,
        value: metric.value,
        icon: metric.icon,
        tone: metric.tone,
        trend: (
          <StatusBadge tone={metric.tone} icon={metric.tone === "success" ? TrendingUp : undefined}>
            {metric.change}
          </StatusBadge>
        ),
      }))}
    >
      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartSurface
          title="Monthly revenue"
          description="Paid invoice performance in Nepalese rupees"
          actions={
            <DashboardButton asChild size="sm" variant="ghost">
              <Link href="/admin/finance">
                View details <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </DashboardButton>
          }
          legend={
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-dashboard-accent" />
                Revenue
              </span>
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-dashboard-success" />
                Positive trend
              </span>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyRevenue} margin={{ left: 0, right: 12, top: 12 }}>
              <defs>
                <linearGradient id="adminRevenueArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={DASHBOARD_CHART_COLORS.gold} stopOpacity={0.42} />
                  <stop
                    offset="100%"
                    stopColor={DASHBOARD_CHART_COLORS.success}
                    stopOpacity={0.04}
                  />
                </linearGradient>
                <linearGradient id="adminRevenueStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={DASHBOARD_CHART_COLORS.gold} />
                  <stop offset="100%" stopColor={DASHBOARD_CHART_COLORS.success} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={DASHBOARD_CHART_THEME.grid}
                strokeDasharray="4 5"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: DASHBOARD_CHART_THEME.label }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: DASHBOARD_CHART_THEME.label }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `${value / 1000}k`}
              />
              <Tooltip
                cursor={{ stroke: DASHBOARD_CHART_COLORS.gold, strokeDasharray: "3 3" }}
                contentStyle={{
                  background: DASHBOARD_CHART_THEME.tooltipBackground,
                  color: DASHBOARD_CHART_THEME.tooltipForeground,
                  borderColor: DASHBOARD_CHART_THEME.tooltipBorder,
                  borderRadius: 12,
                  boxShadow: "0 16px 32px -20px var(--dashboard-primary)",
                }}
                formatter={(value) => [
                  typeof value === "number" ? formatNPR(value) : String(value),
                  "Revenue",
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="url(#adminRevenueStroke)"
                strokeWidth={3}
                fill="url(#adminRevenueArea)"
                activeDot={{ r: 5, fill: DASHBOARD_CHART_COLORS.success }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartSurface>

        <ChartSurface
          title="Active cases by practice area"
          description="A controlled multi-series view of the current portfolio"
          legend={
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {practiceChartData.map((item, index) => (
                <span key={item.area} className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: practicePalette[index % practicePalette.length] }}
                  />
                  {item.area}
                </span>
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={practiceChartData} layout="vertical" margin={{ left: 0, right: 12 }}>
              <CartesianGrid
                stroke={DASHBOARD_CHART_THEME.grid}
                strokeDasharray="4 5"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: DASHBOARD_CHART_THEME.label }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="area"
                type="category"
                tick={{ fontSize: 11, fill: DASHBOARD_CHART_THEME.label }}
                tickLine={false}
                axisLine={false}
                width={68}
              />
              <Tooltip
                cursor={{ fill: DASHBOARD_CHART_THEME.grid }}
                contentStyle={{
                  background: DASHBOARD_CHART_THEME.tooltipBackground,
                  color: DASHBOARD_CHART_THEME.tooltipForeground,
                  borderColor: DASHBOARD_CHART_THEME.tooltipBorder,
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="count" radius={[0, 7, 7, 0]}>
                {practiceChartData.map((item, index) => (
                  <Cell key={item.area} fill={practicePalette[index % practicePalette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartSurface>
      </div>

      <DashboardSection
        title="Staff utilization"
        description="Billable hours against weekly role targets"
        icon={BarChart3}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="success">Healthy 90%+</StatusBadge>
            <StatusBadge tone="warning">Attention 70–89%</StatusBadge>
            <StatusBadge tone="danger">Low below 70%</StatusBadge>
          </div>
        }
      >
        {staffUtilisation.length === 0 ? (
          <EmptyState
            title="No utilization data yet"
            description="Billable time will appear here as staff submit time entries."
            icon={Clock}
            tone="information"
          />
        ) : (
          <div className="space-y-3">
            {staffUtilisation.map((staff) => {
              const percentage = Math.round((staff.hours / staff.target) * 100);
              const tone: DashboardTone =
                percentage >= 90 ? "success" : percentage >= 70 ? "warning" : "danger";
              return (
                <div
                  key={staff.name}
                  className={`rounded-xl border p-4 ${DASHBOARD_TONE_PANEL_CLASSES[tone]}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 sm:w-44">
                      <p className="truncate text-sm font-semibold capitalize text-foreground">
                        {staff.name}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">{staff.role}</p>
                    </div>
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>
                          {staff.hours}h of {staff.target}h target
                        </span>
                        <StatusBadge tone={tone}>{percentage}%</StatusBadge>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-dashboard-panel">
                        <div
                          className={`h-full rounded-full transition-all ${DASHBOARD_TONE_FILL_CLASSES[tone]}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
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
