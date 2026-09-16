"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ClipboardCheck,
  DollarSign,
  FileCheck2,
  FolderOpen,
  PenTool,
  Plus,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Zap,
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
import { cn } from "@/lib/utils";
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

/** Smooth count-up animation for metric values */
function CountUp({ value }: { value: string }) {
  const num = parseInt(value, 10);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (isNaN(num) || num <= 0 || !ref.current) return;
    let start = 0;
    const duration = 800;
    const step = Math.max(1, Math.ceil(num / 30));
    const interval = duration / (num / step);
    const timer = setInterval(() => {
      start = Math.min(start + step, num);
      if (ref.current) ref.current.textContent = String(start);
      if (start >= num) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [num]);
  if (isNaN(num)) return <span>{value}</span>;
  return (
    <span ref={ref} className="animate-metric-value tabular-nums">
      0
    </span>
  );
}

/** Resolve audit event to icon + color */
function auditEventStyle(action: string) {
  const a = action.toLowerCase();
  if (a.includes("login") || a.includes("sign") || a.includes("auth"))
    return {
      icon: ShieldCheck,
      dot: "bg-emerald-500 shadow-emerald-500/50",
      iconBg:
        "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400",
    };
  if (a.includes("delete") || a.includes("remove") || a.includes("revoke"))
    return {
      icon: AlertTriangle,
      dot: "bg-rose-500 shadow-rose-500/50",
      iconBg:
        "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400",
    };
  if (a.includes("payroll") || a.includes("salary") || a.includes("payment"))
    return {
      icon: DollarSign,
      dot: "bg-amber-500 shadow-amber-500/50",
      iconBg:
        "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400",
    };
  return {
    icon: Activity,
    dot: "bg-[#487FFF] shadow-[#487FFF]/50",
    iconBg:
      "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-400",
  };
}

const QUICK_ACTIONS = [
  { label: "New case", href: "/admin/cases/new", icon: Briefcase },
  { label: "Schedule hearing", href: "/admin/appointments", icon: CalendarDays },
  { label: "Add client", href: "/admin/clients", icon: UserPlus },
  { label: "Create task", href: "/admin/tasks", icon: CheckSquare },
] as const;

export default function AdminDashboard() {
  const [operationsView, setOperationsView] = useState<"trend" | "cases">("trend");
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
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Glass status pills */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
            <CheckSquare className="size-3.5 text-amber-300" aria-hidden />
            {openTasks.length} open task{openTasks.length === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
            <span
              className={cn(
                "size-2 rounded-full",
                pendingApprovalsTotal > 0 ? "bg-rose-400 animate-pulse" : "bg-emerald-400",
              )}
            />
            {pendingApprovalsTotal} pending approval{pendingApprovalsTotal === 1 ? "" : "s"}
          </span>
          {/* Live indicator */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/60 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live · Updated just now
          </span>
        </div>
      }
    >
      {/* ── Tier 1: Metric Grid (3-col, default density, count-up) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 dashboard-animate-stagger">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={<CountUp value={metric.value} />}
            icon={metric.icon}
            tone={metric.tone}
            helperText={metric.helper}
            density="default"
            chevron={Boolean(metric.href)}
          />
        ))}
      </div>

      {/* ── Tier 3: Quick Actions Strip ── */}
      <div className="flex flex-wrap items-center gap-2 dashboard-animate-stagger">
        <span className="mr-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Zap className="size-3.5 text-dashboard-primary" aria-hidden />
          Quick actions
        </span>
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashboard-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-dashboard-primary/30 dark:bg-slate-900/50"
          >
            <action.icon className="size-3.5 text-dashboard-primary" aria-hidden />
            {action.label}
          </Link>
        ))}
      </div>

      {/* ── Tier 2: Bento Grid — Unified 2-Row Layout ── */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-12 dashboard-animate-stagger">
        {/* ── Row 1: Chart & Upcoming Matters (8-col) + Priorities (4-col) ── */}
        <ChartSurface
          className="xl:col-span-8"
          headerClassName="dashboard-header-tint-chart"
          density="compact"
          title="Firm Operations Overview"
          description={
            operationsView === "trend"
              ? "Scheduled hearings by month"
              : "Active matters with hearings in next 14 days"
          }
          actions={
            <div className="inline-flex items-center rounded-xl border border-dashboard-border bg-slate-100/80 p-0.5 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setOperationsView("trend")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                  operationsView === "trend"
                    ? "bg-white text-foreground shadow-sm dark:bg-slate-900"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Activity className="size-3 text-dashboard-primary" aria-hidden />
                Hearings
              </button>
              <button
                type="button"
                onClick={() => setOperationsView("cases")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                  operationsView === "cases"
                    ? "bg-white text-foreground shadow-sm dark:bg-slate-900"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <FolderOpen className="size-3 text-amber-500" aria-hidden />
                Upcoming Cases
                {attentionCases.length > 0 ? (
                  <span className="ml-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    {attentionCases.length}
                  </span>
                ) : null}
              </button>
            </div>
          }
          legend={
            operationsView === "trend" ? (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <span aria-hidden className="size-2.5 rounded-full bg-[#487FFF]" />
                  Hearings
                </span>
              </div>
            ) : undefined
          }
        >
          {operationsView === "trend" ? (
            operationsSeries.length === 0 ? (
              /* Ghost chart empty state */
              <div className="relative h-64 w-full overflow-hidden rounded-xl">
                {/* Faint ghost chart shape */}
                <svg
                  viewBox="0 0 400 160"
                  className="absolute inset-0 h-full w-full opacity-[0.08]"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="ghostGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#487FFF" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#487FFF" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 120 Q50 80 100 100 T200 60 T300 90 T400 40 L400 160 L0 160 Z"
                    fill="url(#ghostGrad)"
                  />
                  <path
                    d="M0 120 Q50 80 100 100 T200 60 T300 90 T400 40"
                    fill="none"
                    stroke="#487FFF"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                </svg>
                {/* Horizontal grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between py-4 opacity-[0.06]">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-px bg-slate-400" />
                  ))}
                </div>
                {/* Centered message */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="flex size-11 items-center justify-center rounded-2xl border border-dashboard-primary/20 bg-gradient-to-br from-blue-50 to-indigo-50 text-dashboard-primary shadow-sm dark:from-blue-950/30 dark:to-indigo-950/30">
                    <CalendarDays className="size-5" aria-hidden />
                  </span>
                  <p className="mt-3 text-sm font-bold text-foreground">No hearing history yet</p>
                  <p className="mt-1 max-w-xs text-center text-xs text-muted-foreground">
                    Monthly hearing activity appears as hearings are scheduled.
                  </p>
                  <DashboardButton asChild size="sm" className="mt-3">
                    <Link href="/admin/appointments">
                      Schedule a hearing <ArrowRight className="size-3" aria-hidden />
                    </Link>
                  </DashboardButton>
                </div>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={operationsSeries}
                    margin={{ top: 12, right: 12, bottom: 0, left: -16 }}
                  >
                    <defs>
                      <linearGradient id="hearingsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#487FFF" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="#487FFF" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="var(--dashboard-chart-grid)"
                      vertical={false}
                      strokeDasharray="3 3"
                    />
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
                        background: "rgba(255, 255, 255, 0.95)",
                        color: "#0F172A",
                        border: "1px solid #E2E8F0",
                        borderRadius: 12,
                        boxShadow: "0 10px 25px -5px rgba(72, 127, 255, 0.15)",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="hearings"
                      name="Hearings"
                      stroke="#487FFF"
                      fill="url(#hearingsGradient)"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#487FFF", stroke: "#FFFFFF", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#487FFF", stroke: "#FFFFFF", strokeWidth: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )
          ) : attentionCases.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-b from-emerald-50/50 to-transparent px-6 py-10 text-center dark:from-emerald-950/10">
              <span className="flex size-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="size-5" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-bold text-foreground">All clear!</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No active matters have hearings scheduled in the next 14 days.
              </p>
              <DashboardButton asChild size="sm" className="mt-3">
                <Link href="/admin/cases">
                  Go to Cases <ArrowRight className="size-3" aria-hidden />
                </Link>
              </DashboardButton>
            </div>
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
        </ChartSurface>

        {/* Today's Priorities (4-col) */}
        <DashboardSection
          className="xl:col-span-4"
          headerClassName={
            priorities.length === 0
              ? "dashboard-header-tint-priorities-clear"
              : "dashboard-header-tint-priorities-active"
          }
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
            <div className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-b from-emerald-50/50 to-transparent px-6 py-8 text-center dark:from-emerald-950/10">
              <span className="flex size-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="size-5" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-bold text-foreground">All clear!</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your work queue is healthy. No hearings or reviews today.
              </p>
            </div>
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

        {/* ── Row 2: Approvals (5-col) + Team Workload (3-col) + Audit (4-col) ── */}
        <DashboardSection
          className="xl:col-span-5"
          headerClassName="dashboard-header-tint-approvals"
          density="compact"
          title="Approvals & Publishing"
          description="Items awaiting your review"
          icon={FileCheck2}
          actions={
            <DashboardButton asChild variant="ghost" size="sm">
              <Link href="/admin/clients">
                View all <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </DashboardButton>
          }
        >
          {approvalQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-b from-emerald-50/50 to-transparent px-6 py-8 text-center dark:from-emerald-950/10">
              <span className="flex size-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="size-5" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-bold text-foreground">Queue is clear</p>
              <p className="mt-1 text-xs text-muted-foreground">
                KYC, leave, and CMS items appear here when submitted.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvalQueue.map((entry) => (
                <Link key={entry.id} href={entry.href} className="block">
                  <DashboardListRow className="border-l-[3px] border-l-amber-400">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400">
                      <entry.icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {entry.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{entry.category}</p>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                      Review <ArrowRight className="size-3" aria-hidden />
                    </span>
                  </DashboardListRow>
                </Link>
              ))}
            </div>
          )}
        </DashboardSection>

        {/* Team Workload (3-col) */}
        <DashboardSection
          className="xl:col-span-3"
          headerClassName="dashboard-header-tint-workload"
          density="compact"
          title="Team Workload"
          description="Open & overdue tasks"
          icon={Users}
          actions={
            <DashboardButton asChild variant="ghost" size="sm">
              <Link href="/admin/tasks">
                View all <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </DashboardButton>
          }
        >
          {workload.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-b from-blue-50/50 to-transparent px-4 py-8 text-center dark:from-blue-950/10">
              <span className="flex size-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-600 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-400">
                <Users className="size-5" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-bold text-foreground">No open workload</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Assign tasks from Cases to populate.
              </p>
              <DashboardButton asChild size="sm" className="mt-3">
                <Link href="/admin/cases">
                  Go to Cases <ArrowRight className="size-3" aria-hidden />
                </Link>
              </DashboardButton>
            </div>
          ) : (
            <div className="space-y-3">
              {workload.slice(0, 5).map((row) => {
                const user = userNameById.get(row.assignedTo);
                const name = user?.name || "Team member";
                const initials = name
                  .split(" ")
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                const tone: DashboardTone =
                  row.overdue > 0 ? "danger" : row.urgent > 0 ? "warning" : "neutral";
                const maxLoad = 10;
                const pct = Math.min(Math.round((row.total / maxLoad) * 100), 100);
                return (
                  <div
                    key={row.assignedTo}
                    className="rounded-2xl border border-dashboard-border bg-white dark:bg-slate-900/50 p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-dashboard-primary/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-950 dark:to-blue-900 text-xs font-black text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {initials || "TM"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-bold text-foreground">{name}</p>
                          <StatusBadge tone={tone}>
                            {row.overdue > 0 ? `${row.overdue} overdue` : `${row.total} open`}
                          </StatusBadge>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="truncate text-xs text-muted-foreground">
                            {row.total} open · {row.urgent} high priority
                          </p>
                          <span className="shrink-0 text-[10px] font-bold text-muted-foreground tabular-nums">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          row.overdue > 0
                            ? "bg-gradient-to-r from-rose-500 to-red-600"
                            : row.urgent > 0
                              ? "bg-gradient-to-r from-amber-400 to-orange-500"
                              : "bg-gradient-to-r from-blue-500 to-indigo-600"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {/* Legend */}
              <div className="flex items-center justify-center gap-3 pt-1 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-gradient-to-r from-rose-500 to-red-600" />{" "}
                  Overdue
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />{" "}
                  Urgent
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" />{" "}
                  Normal
                </span>
              </div>
            </div>
          )}
        </DashboardSection>

        {/* Audit & Security Activity (4-col) */}
        <DashboardSection
          className="xl:col-span-4"
          headerClassName="dashboard-header-tint-audit"
          density="compact"
          title="Audit & Security"
          description="Recent system events"
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
            <div className="space-y-2.5">
              {audit.slice(0, 5).map((event) => {
                const style = auditEventStyle(event.action);
                const EventIcon = style.icon;
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 rounded-xl border border-dashboard-border bg-white dark:bg-slate-900/40 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-dashboard-primary/30"
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                        style.iconBg,
                      )}
                    >
                      <EventIcon className="size-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-foreground">
                        {event.action
                          .replaceAll(".", " ")
                          .replaceAll("_", " ")
                          .replace(/^\w/, (char) => char.toUpperCase())}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {event.actorName ?? "System"} · {event.resource}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
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
