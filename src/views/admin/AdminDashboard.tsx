"use client";

import { useMemo } from "react";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  FileCheck2,
  FolderOpen,
  PenTool,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "@/client/navigation";
import { useCases } from "@/client/queries/cases";
import { useClients } from "@/client/queries/clients";
import { useCmsCollection } from "@/client/queries/cms";
import { useAppointments, useLeads } from "@/client/queries/crm";
import { useDashboardData } from "@/client/queries/analytics";
import { useEnvelopes } from "@/client/queries/envelopes";
import { useHearings } from "@/client/queries/hearings";
import { useAuditEvents, useStaffDirectory } from "@/client/queries/identity";
import { useLeaveRequests } from "@/client/queries/hr";
import { useTaskWorkload, useTasks } from "@/client/queries/tasks";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  ChartSurface,
  DashboardButton,
  DashboardListRow,
  DashboardSection,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  EmptyState,
  PortalPageShell,
  StatusBadge,
} from "@/components/dashboard";
import {
  DASHBOARD_METRIC_TONES,
  DASHBOARD_TONE_FILL_CLASSES,
  getDashboardStatusTone,
  type DashboardTone,
} from "@/lib/dashboard-semantics";
import { MetricCard } from "@/components/dashboard/dashboard-primitives";
import { DualDateDisplay } from "@/components/dashboard/dual-date-display";
import { dayPartGreeting, localDateIso, relativeTime } from "@/lib/dashboard-format";

type WorkloadRow = {
  assignedTo: string;
  total: number;
  urgent: number;
  overdue: number;
};

type QueueEntry = {
  id: string;
  category: "KYC verification" | "Leave review" | "Blog review" | "News review";
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

export default function AdminDashboard() {
  const currentUser = useCurrentUser();
  const casesResult = useCases({});
  const clientsResult = useClients();
  const hearingsResult = useHearings({});
  const tasksResult = useTasks({});
  const leadsResult = useLeads();
  const analytics = useDashboardData();
  const directoryResult = useStaffDirectory();
  const workloadResult = useTaskWorkload();
  const appointmentsResult = useAppointments({});
  const auditEvents = useAuditEvents({});
  const envelopesResult = useEnvelopes();
  const blogResult = useCmsCollection("blog-posts", {}, "admin");
  const newsResult = useCmsCollection("news", {}, "admin");
  const pendingLeavesResult = useLeaveRequests({ status: "pending" });

  const cases = casesResult ?? [];
  const clients = clientsResult ?? [];
  const hearings = hearingsResult ?? [];
  const tasks = tasksResult ?? [];
  const leads = leadsResult?.data ?? [];
  const directory = directoryResult ?? [];
  const workload = (workloadResult ?? []) as WorkloadRow[];
  const appointments = appointmentsResult?.data ?? [];
  const audit = auditEvents ?? [];
  const envelopes = envelopesResult ?? [];
  const blogPosts = blogResult ?? [];
  const newsItems = newsResult ?? [];
  const pendingLeaves = pendingLeavesResult ?? [];

  const todayIso = localDateIso(new Date());
  const attentionLimitIso = localDateIso(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));

  const scheduledHearings = hearings.filter((item) => item.status === "scheduled");
  const activeCases = cases.filter((item) => item.status === "active");
  const openTasks = tasks.filter((item) => item.status === "todo" || item.status === "in_progress");

  const caseTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of cases) map.set(item._id, item.title);
    return map;
  }, [cases]);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of clients) {
      map.set(item._id, item.companyName || item.fullName);
    }
    return map;
  }, [clients]);

  const userNameById = useMemo(() => {
    const map = new Map<string, { name: string; role?: string }>();
    for (const item of directory) {
      map.set(item.id, { name: item.name || item.email || "Team member", role: item.role });
    }
    return map;
  }, [directory]);

  // Deterministic queues (documented): one actionable item per unit, no overlap.
  const kycQueue = clients.filter((item) => item.kycStatus === "submitted" && item.isActive);
  const blogQueue = blogPosts.filter((item) => item.status === "pending_review");
  const newsQueue = newsItems.filter((item) => item.status === "pending_review");
  const leaveQueue = pendingLeaves;
  const pendingApprovalsTotal =
    kycQueue.length + blogQueue.length + newsQueue.length + leaveQueue.length;

  // "Documents awaiting action" mapped to its real product meaning: signature
  // envelopes that are out for signature (status "sent") and can be reminded/voided.
  const envelopesAwaitingSignature = envelopes.filter((item) => item.status === "sent");

  const isLoading =
    casesResult === undefined ||
    clientsResult === undefined ||
    hearingsResult === undefined ||
    tasksResult === undefined ||
    leadsResult?.data === undefined ||
    analytics === undefined ||
    directoryResult === undefined ||
    workloadResult === undefined ||
    appointmentsResult === undefined ||
    appointmentsResult.isLoading ||
    auditEvents === undefined ||
    blogResult === undefined ||
    newsResult === undefined ||
    pendingLeavesResult === undefined;

  const firstName = (currentUser?.name ?? "").trim().split(/\s+/)[0] ?? "";
  const greeting = dayPartGreeting(new Date());

  const metrics = [
    {
      label: "Active matters",
      value: String(analytics?.activeCases ?? activeCases.length),
      icon: FolderOpen,
      tone: DASHBOARD_METRIC_TONES.cases,
      helper: "Matters in progress",
      href: undefined,
    },
    {
      label: "Upcoming hearings",
      value: String(analytics?.upcomingHearings ?? scheduledHearings.length),
      icon: CalendarDays,
      tone: DASHBOARD_METRIC_TONES.hearings,
      helper: "Scheduled court commitments",
      href: "/admin/appointments",
    },
    {
      label: "New leads",
      value: String(analytics?.openLeads ?? leads.length),
      icon: UserPlus,
      tone: "information" as const,
      helper: "New or contacted enquiries",
      href: "/admin/crm",
    },
    {
      label: "Pending approvals",
      value: String(pendingApprovalsTotal),
      icon: FileCheck2,
      tone: pendingApprovalsTotal > 0 ? ("danger" as const) : DASHBOARD_METRIC_TONES.tasks,
      helper: "KYC · leave · CMS review",
      href: undefined,
    },
    {
      label: "Envelopes awaiting signature",
      value: String(envelopesAwaitingSignature.length),
      icon: PenTool,
      tone: "warning" as const,
      helper: "Out for signature",
      href: undefined,
    },
    {
      label: "Active clients",
      value: String(analytics?.activeClients ?? clients.filter((item) => item.isActive).length),
      icon: Users,
      tone: DASHBOARD_METRIC_TONES.people,
      helper: "Current client relationships",
      href: "/admin/clients",
    },
  ];

  // Firm Operations Overview: the one real analytics time series.
  const operationsSeries = (analytics?.hearingsByMonth ?? []).map((point) => ({
    month: point.month,
    hearings: point.count,
  }));

  // Today's Priorities: today's schedule first, then review queues (deterministic).
  const priorities = useMemo(() => {
    const hearingEntries = scheduledHearings
      .filter((item) => item.dateGregorian === todayIso)
      .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
      .slice(0, 3)
      .map((item) => ({
        id: `hearing-${item._id}`,
        icon: CalendarDays,
        title: caseTitleById.get(item.caseId) ?? "Court hearing",
        subtitle: item.court,
        meta: item.time ?? "Today",
        href: "/admin/appointments",
      }));
    const appointmentEntries = appointments
      .filter((item) => {
        const status = (item as { status?: string }).status;
        const date = (item as { date?: string }).date;
        return status !== "cancelled" && status !== "completed" && date === todayIso;
      })
      .slice(0, 2)
      .map((item) => ({
        id: `appointment-${(item as { _id?: string })._id}`,
        icon: CalendarClock,
        title: (item as { clientName?: string }).clientName || "Client appointment",
        subtitle: (item as { practiceArea?: string }).practiceArea,
        meta: (item as { timeSlot?: string }).timeSlot ?? "Today",
        href: "/admin/appointments",
      }));
    const queueEntries: Array<{
      id: string;
      icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
      title: string;
      subtitle: string;
      meta: string;
      href: string;
    }> = [];
    for (const client of kycQueue.slice(0, 2)) {
      queueEntries.push({
        id: `kyc-${client._id}`,
        icon: ClipboardCheck,
        title: client.companyName || client.fullName,
        subtitle: "KYC verification",
        meta: "Awaiting review",
        href: "/admin/clients",
      });
    }
    for (const post of blogQueue.slice(0, 2)) {
      queueEntries.push({
        id: `blog-${post._id}`,
        icon: CheckSquare,
        title: post.title ?? "Blog article",
        subtitle: "CMS review",
        meta: "Pending review",
        href: "/admin/cms/blog",
      });
    }
    return [...hearingEntries, ...appointmentEntries, ...queueEntries].slice(0, 5);
  }, [scheduledHearings, appointments, todayIso, caseTitleById, kycQueue, blogQueue]);

  // Cases Requiring Attention: active matters with a hearing in the next 14 days,
  // soonest first (documented deterministic rule — no invented risk scoring).
  const attentionCases = useMemo(() => {
    const rows: Array<{
      caseId: string;
      caseNumber: string;
      title: string;
      clientId: string;
      practiceArea: string;
      hearingDate: string;
      court: string;
    }> = [];
    for (const hearing of scheduledHearings) {
      if (!hearing.dateGregorian || hearing.dateGregorian < todayIso) continue;
      if (hearing.dateGregorian > attentionLimitIso) continue;
      const matter = cases.find((item) => item._id === hearing.caseId);
      if (!matter || matter.status !== "active") continue;
      rows.push({
        caseId: matter._id,
        caseNumber: matter.caseNumber,
        title: matter.title,
        clientId: matter.clientId,
        practiceArea: matter.practiceArea,
        hearingDate: hearing.dateBs || hearing.dateGregorian,
        court: hearing.court ?? "Court",
      });
    }
    return rows.sort((a, b) => a.hearingDate.localeCompare(b.hearingDate)).slice(0, 5);
  }, [scheduledHearings, cases, todayIso, attentionLimitIso]);

  const approvalQueue: QueueEntry[] = [
    ...kycQueue.slice(0, 2).map((client) => ({
      id: `kyc-${client._id}`,
      category: "KYC verification" as const,
      title: client.companyName || client.fullName,
      href: "/admin/clients",
      icon: ClipboardCheck,
    })),
    ...leaveQueue.slice(0, 2).map((leave) => {
      const row = leave as { _id?: string; userId?: string };
      return {
        id: `leave-${row._id}`,
        category: "Leave review" as const,
        title: userNameById.get(row.userId ?? "")?.name ?? "Leave request",
        href: "/admin/hr",
        icon: CalendarClock,
      };
    }),
    ...blogQueue.slice(0, 2).map((post) => ({
      id: `blog-${post._id}`,
      category: "Blog review" as const,
      title: post.title ?? "Blog article",
      href: "/admin/cms/blog",
      icon: CheckSquare,
    })),
    ...newsQueue.slice(0, 2).map((item) => ({
      id: `news-${item._id}`,
      category: "News review" as const,
      title: item.title ?? "News item",
      href: "/admin/cms/news",
      icon: CheckSquare,
    })),
  ];

  return (
    <PortalPageShell
      portal="admin"
      loading={isLoading}
      loadingLabel="Preparing operational intelligence…"
      heroClassName="p-4 sm:p-5 [&_h1]:text-3xl [&_h1]:xl:text-4xl"
      eyebrow={<DualDateDisplay isoDate={new Date().toISOString()} alwaysDual />}
      title={firstName ? `${greeting}, ${firstName}` : greeting}
      description="Here's what requires organizational attention today."
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
          <StatusBadge tone={pendingApprovalsTotal > 0 ? "danger" : "success"}>
            {pendingApprovalsTotal} pending approval{pendingApprovalsTotal === 1 ? "" : "s"}
          </StatusBadge>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
            tone={metric.tone}
            helperText={metric.helper}
            density="compact"
            chevron={Boolean(metric.href)}
          />
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12">
        <ChartSurface
          className="xl:col-span-8"
          density="compact"
          title="Firm Operations Overview"
          description="Scheduled hearings by month"
          legend={
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ background: "var(--dashboard-chart-2)" }}
                />
                Hearings
              </span>
            </div>
          }
        >
          {operationsSeries.length === 0 ? (
            <EmptyState
              title="No hearing history yet"
              description="Monthly hearing activity appears as hearings are scheduled."
              icon={CalendarDays}
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={operationsSeries}
                  margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                >
                  <CartesianGrid stroke="var(--dashboard-chart-grid)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "var(--dashboard-chart-label)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "var(--dashboard-chart-label)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--dashboard-tooltip)",
                      color: "var(--dashboard-tooltip-foreground)",
                      border: "1px solid var(--dashboard-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="hearings"
                    name="Hearings"
                    stroke="var(--dashboard-chart-2)"
                    fill="var(--dashboard-chart-2)"
                    fillOpacity={0.12}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartSurface>

        <DashboardSection
          className="xl:col-span-4"
          density="compact"
          title="Today's Priorities"
          description="Key items that need attention"
          icon={CheckSquare}
          actions={
            <DashboardButton asChild variant="ghost" size="sm">
              <Link href="/admin/appointments">
                View all <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </DashboardButton>
          }
        >
          {priorities.length === 0 ? (
            <EmptyState
              title="Nothing needs attention"
              description="Today's hearings, appointments, and reviews appear here."
              icon={CheckSquare}
              tone="success"
            />
          ) : (
            <div className="space-y-3">
              {priorities.map((entry) => (
                <Link key={entry.id} href={entry.href} className="block">
                  <DashboardListRow>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashboard-primary/25 bg-dashboard-primary-soft text-dashboard-primary">
                      <entry.icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {entry.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {entry.subtitle}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{entry.meta}</span>
                  </DashboardListRow>
                </Link>
              ))}
            </div>
          )}
        </DashboardSection>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12">
        <DashboardSection
          className="xl:col-span-8"
          density="compact"
          title="Cases Requiring Attention"
          description="Active matters with hearings in the next 14 days"
          icon={FolderOpen}
        >
          {attentionCases.length === 0 ? (
            <EmptyState
              title="No hearings upcoming"
              description="Active matters with scheduled hearings appear here."
              icon={FolderOpen}
              tone="success"
            />
          ) : (
            <DashboardTable>
              <DashboardTableHead>
                <tr>
                  <DashboardTableHeaderCell>Matter No.</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Client</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Practice area</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Next hearing</DashboardTableHeaderCell>
                </tr>
              </DashboardTableHead>
              <DashboardTableBody>
                {attentionCases.map((row) => (
                  <DashboardTableRow key={row.caseId}>
                    <DashboardTableCell>
                      <span className="block text-xs font-medium tabular-nums text-muted-foreground">
                        {row.caseNumber}
                      </span>
                      <span className="block max-w-[14rem] truncate text-sm font-semibold text-foreground">
                        {row.title}
                      </span>
                    </DashboardTableCell>
                    <DashboardTableCell>
                      <span className="block max-w-[10rem] truncate text-sm">
                        {clientNameById.get(row.clientId) ?? "Client record"}
                      </span>
                    </DashboardTableCell>
                    <DashboardTableCell>
                      <span className="text-sm text-muted-foreground">{row.practiceArea}</span>
                    </DashboardTableCell>
                    <DashboardTableCell>
                      <span className="text-sm font-medium text-foreground">{row.hearingDate}</span>
                      <span className="block text-xs text-muted-foreground">{row.court}</span>
                    </DashboardTableCell>
                  </DashboardTableRow>
                ))}
              </DashboardTableBody>
            </DashboardTable>
          )}
        </DashboardSection>

        <DashboardSection
          className="xl:col-span-4"
          density="compact"
          title="Team Workload"
          description="Open, high-priority, and overdue assignments"
          icon={Users}
        >
          {workload.length === 0 ? (
            <EmptyState
              title="No open workload"
              description="Assignments will populate this team view."
              icon={Users}
              tone="neutral"
            />
          ) : (
            <div className="space-y-3">
              {workload.slice(0, 5).map((row) => {
                const user = userNameById.get(row.assignedTo);
                const tone: DashboardTone =
                  row.overdue > 0 ? "danger" : row.urgent > 0 ? "warning" : "neutral";
                const load = Math.min(Math.max(Number(row.total) * 12, 12), 100);
                return (
                  <div
                    key={row.assignedTo}
                    className="rounded-xl border border-dashboard-border bg-dashboard-canvas-elevated/40 p-3.5 transition-all hover:border-dashboard-border hover:bg-dashboard-panel-hover"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {user?.name || "Team member"}
                      </p>
                      <StatusBadge tone={tone}>
                        {row.overdue > 0 ? `${row.overdue} overdue` : `${row.total} open`}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {user?.role ? `${user.role.replace("_", " ")} · ` : ""}
                      {row.total} open · {row.urgent} high priority
                    </p>
                    <div className="mt-2.5 h-2 overflow-hidden rounded-full border border-dashboard-border/30 bg-dashboard-panel">
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
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12">
        <DashboardSection
          className="xl:col-span-8"
          density="compact"
          title="Approvals & Publishing"
          description="Items awaiting your review"
          icon={FileCheck2}
        >
          {approvalQueue.length === 0 ? (
            <EmptyState
              title="Queue is clear"
              description="KYC, leave, and CMS review items appear here when submitted."
              icon={FileCheck2}
              tone="success"
            />
          ) : (
            <div className="space-y-3">
              {approvalQueue.map((entry) => (
                <Link key={entry.id} href={entry.href} className="block">
                  <DashboardListRow>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashboard-warning/30 bg-dashboard-warning-soft text-dashboard-warning-foreground">
                      <entry.icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {entry.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{entry.category}</p>
                    </div>
                    <StatusBadge tone="warning">Pending review</StatusBadge>
                  </DashboardListRow>
                </Link>
              ))}
            </div>
          )}
        </DashboardSection>

        <DashboardSection
          className="xl:col-span-4"
          density="compact"
          title="Audit & Security Activity"
          description="Recent system activity and important events"
          icon={ShieldCheck}
          actions={
            <DashboardButton asChild variant="ghost" size="sm">
              <Link href="/admin/audit">
                View all <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </DashboardButton>
          }
        >
          {audit.length === 0 ? (
            <EmptyState
              title="No audit activity"
              description="Recent system events will appear here."
              icon={ShieldCheck}
              tone="neutral"
            />
          ) : (
            <div className="space-y-3">
              {audit.slice(0, 5).map((event) => {
                const tone: DashboardTone = getDashboardStatusTone(
                  event.action.includes("login") || event.action.includes("sign")
                    ? "in_progress"
                    : event.action.includes("delete") || event.action.includes("remove")
                      ? "danger"
                      : "information",
                );
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 rounded-xl border border-dashboard-border bg-dashboard-canvas-elevated/40 p-3 transition-all hover:border-dashboard-border hover:bg-dashboard-panel-hover"
                  >
                    <span
                      aria-hidden
                      className={`size-2 shrink-0 rounded-full ${DASHBOARD_TONE_FILL_CLASSES[tone]}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {event.action
                          .replaceAll(".", " ")
                          .replaceAll("_", " ")
                          .replace(/^\w/, (char) => char.toUpperCase())}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {event.actorName ?? "System"} · {event.resource}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {relativeTime(event.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardSection>
      </div>
    </PortalPageShell>
  );
}
