"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CheckSquare,
  FileText,
  FolderOpen,
  MessageSquare,
  MessagesSquare,
  Sparkles,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { Link } from "@/client/navigation";
import { useCases } from "@/client/queries/cases";
import { useClients } from "@/client/queries/clients";
import { useUnreadMessageCounts } from "@/client/queries/communication";
import { useDmThreads } from "@/client/queries/dm";
import { useRecentDocuments } from "@/client/queries/documents";
import { useAppointments } from "@/client/queries/crm";
import { useHearings } from "@/client/queries/hearings";
import { useStaffDirectory } from "@/client/queries/identity";
import { useTasks, useTaskWorkload } from "@/client/queries/tasks";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
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
  HeroHealthChip,
  HeroStatChip,
  PortalPageShell,
  ScheduleTimeline,
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

type WorkloadRow = {
  assignedTo: string;
  total: number;
  urgent: number;
  overdue: number;
};

function localDateIso(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function parseClockTime(value?: string | null): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const match = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(value);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const hours = (Number(match[1]) % 12) + (match[3].toUpperCase() === "PM" ? 12 : 0);
  return hours * 60 + Number(match[2]);
}

function relativeTime(iso?: string | null): string {
  if (!iso) return "";
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return "";
  const diffMinutes = Math.round((Date.now() - timestamp) / 60_000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function documentTypeLabel(mimeType: string): string {
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("wordprocessingml")) return "DOCX";
  if (mimeType.includes("spreadsheetml")) return "XLSX";
  if (mimeType.startsWith("image/")) return "IMG";
  return "FILE";
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/** Layout-shaped loading placeholder mirroring the dashboard structure. */
function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl border border-dashboard-border bg-dashboard-panel"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="h-72 animate-pulse rounded-2xl border border-dashboard-border bg-dashboard-panel xl:col-span-2" />
        <div className="h-72 animate-pulse rounded-2xl border border-dashboard-border bg-dashboard-panel" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl border border-dashboard-border bg-dashboard-panel" />
        <div className="h-64 animate-pulse rounded-2xl border border-dashboard-border bg-dashboard-panel" />
      </div>
    </div>
  );
}

export default function StaffDashboard() {
  const currentUser = useCurrentUser();
  const casesResult = useCases({});
  const hearingsResult = useHearings({});
  const tasksResult = useTasks({});
  const workloadResult = useTaskWorkload();
  const usersResult = useStaffDirectory();
  const clientsResult = useClients();
  const appointmentsResult = useAppointments({});
  const recentDocumentsResult = useRecentDocuments(5);
  const dmThreadsResult = useDmThreads();

  const cases = casesResult || [];
  const hearings = hearingsResult || [];
  const tasks = tasksResult || [];
  const workload = (workloadResult || []) as WorkloadRow[];
  const users = usersResult || [];
  const clients = clientsResult || [];
  const appointments = appointmentsResult?.data ?? [];
  const recentDocuments = recentDocumentsResult || [];
  const dmThreads = dmThreadsResult.data || [];

  const todayIso = localDateIso(new Date());
  const weekEndIso = localDateIso(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  const activeCases = cases.filter((item) => item.status === "active");
  const scheduledHearings = hearings.filter((item) => item.status === "scheduled");
  const pendingTasks = tasks.filter(
    (item) => item.status === "todo" || item.status === "in_progress",
  );
  const urgentPending = pendingTasks.some(
    (item) => item.priority === "urgent" || item.priority === "high",
  );

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
    for (const item of users) {
      map.set(item.id, { name: item.name || item.email || "Team member", role: item.role });
    }
    return map;
  }, [users]);

  const nextHearingByCase = useMemo(() => {
    const map = new Map<string, { dateBs: string; court: string }>();
    for (const hearing of scheduledHearings) {
      if (!map.has(hearing.caseId)) {
        map.set(hearing.caseId, { dateBs: hearing.dateBs, court: hearing.court ?? "Court" });
      }
    }
    return map;
  }, [scheduledHearings]);

  const isLoading =
    casesResult === undefined ||
    hearingsResult === undefined ||
    tasksResult === undefined ||
    workloadResult === undefined ||
    usersResult === undefined ||
    clientsResult === undefined ||
    appointmentsResult === undefined ||
    appointmentsResult.isLoading ||
    recentDocumentsResult === undefined ||
    dmThreadsResult.isLoading;

  // KPI: hearings scheduled in the next seven days (helper counts today's).
  const hearingsThisWeek = scheduledHearings.filter((item) => {
    const date = item.dateGregorian;
    return date >= todayIso && date <= weekEndIso;
  });
  const hearingsTodayCount = hearingsThisWeek.filter(
    (item) => item.dateGregorian === todayIso,
  ).length;

  // KPI: tasks due today (and overdue) from real due dates.
  const dueTodayCount = pendingTasks.filter((item) => {
    const due = (item as { dueDate?: string | null }).dueDate;
    return Boolean(due) && due!.slice(0, 10) === todayIso;
  }).length;
  const overdueCount = pendingTasks.filter((item) => {
    const due = (item as { dueDate?: string | null }).dueDate;
    return Boolean(due) && due!.slice(0, 10) < todayIso;
  }).length;

  // KPI: unread client/matter messages summed across the staff member's cases.
  const caseIds = cases.map((item) => item._id);
  const unreadCounts = useUnreadMessageCounts(caseIds);
  const unreadTotal = Object.values(unreadCounts ?? {}).reduce<number>(
    (sum, value) => sum + (Number(value) || 0),
    0,
  );

  const firstName = (currentUser?.name ?? "").trim().split(/\s+/)[0] ?? "";
  const currentHour = new Date().getHours();
  const dayPart = currentHour < 12 ? "morning" : currentHour < 17 ? "afternoon" : "evening";

  const metrics = [
    {
      label: "Active cases",
      value: String(activeCases.length),
      icon: FolderOpen,
      tone: DASHBOARD_METRIC_TONES.cases,
      helper: "Matters in progress",
      href: "/staff/cases",
    },
    {
      label: "Hearings this week",
      value: String(hearingsThisWeek.length),
      icon: CalendarDays,
      tone: DASHBOARD_METRIC_TONES.hearings,
      helper: hearingsTodayCount > 0 ? `${hearingsTodayCount} today` : "Next 7 days",
      href: "/staff/hearings",
    },
    {
      label: "Tasks due today",
      value: String(dueTodayCount),
      icon: CheckSquare,
      tone: overdueCount > 0 ? ("danger" as const) : DASHBOARD_METRIC_TONES.tasks,
      helper: overdueCount > 0 ? `${overdueCount} overdue` : "On track",
      href: "/staff/tasks",
    },
    {
      label: "Unread messages",
      value: String(unreadTotal),
      icon: MessageSquare,
      tone: unreadTotal > 0 ? ("information" as const) : DASHBOARD_METRIC_TONES.messages,
      helper: "From client matters",
      href: "/staff/messages",
    },
  ];

  // My Day: real hearings + appointments for today, chronologically sorted.
  const myDay = useMemo(() => {
    const hearingEntries = hearings
      .filter((item) => item.status === "scheduled" && item.dateGregorian === todayIso)
      .map((item) => ({
        id: `hearing-${item._id}`,
        time: item.time ?? "",
        sortKey: parseClockTime(item.time),
        title: item.purpose || "Court hearing",
        subtitle: `${caseTitleById.get(item.caseId) ?? "Matter"} · ${item.court}`,
        badge: <StatusBadge tone="warning">Hearing</StatusBadge>,
        href: "/staff/hearings" as const,
      }));
    const appointmentEntries = appointments
      .filter((item) => {
        const status = (item as { status?: string }).status;
        const date = (item as { date?: string }).date;
        return status !== "cancelled" && status !== "completed" && date === todayIso;
      })
      .map((item) => {
        const slot = (item as { timeSlot?: string }).timeSlot ?? "";
        return {
          id: `appointment-${(item as { _id?: string })._id ?? slot}`,
          time: slot,
          sortKey: parseClockTime(slot),
          title: (item as { clientName?: string }).clientName || "Client appointment",
          subtitle: (item as { practiceArea?: string }).practiceArea,
          badge: <StatusBadge tone="information">Appointment</StatusBadge>,
          href: "/staff/appointments" as const,
        };
      });
    return [...hearingEntries, ...appointmentEntries].sort((a, b) => a.sortKey - b.sortKey);
  }, [hearings, appointments, todayIso, caseTitleById]);

  const priorityTasks = pendingTasks
    .slice()
    .sort((a, b) => {
      const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
    })
    .slice(0, 5);

  const upcomingHearings = scheduledHearings.slice(0, 4);

  const quickActions = [
    { href: "/staff/tasks", icon: CheckSquare, label: "New task", description: "Create a task" },
    {
      href: "/staff/hearings",
      icon: CalendarPlus,
      label: "Add hearing",
      description: "Schedule a hearing",
    },
    {
      href: "/staff/documents",
      icon: Upload,
      label: "Upload document",
      description: "Add to matter",
    },
    { href: "/staff/clients", icon: UserPlus, label: "Add client", description: "Create client" },
    {
      href: "/staff/appointments",
      icon: CalendarDays,
      label: "Book meeting",
      description: "Schedule appointment",
    },
    {
      href: "/staff/research",
      icon: FileText,
      label: "Research",
      description: "Open research vault",
    },
  ];

  return (
    <PortalPageShell
      portal="staff"
      heroClassName="hero-animate-in p-5 sm:p-7 [&_h1]:text-3xl [&_h1]:xl:text-4xl"
      eyebrow={<DualDateDisplay isoDate={new Date().toISOString()} alwaysDual />}
      title={firstName ? `Good ${dayPart}, ${firstName}` : `Good ${dayPart}`}
      description="A focused view of hearings, deadlines, cases, and team capacity."
      icon={Sparkles}
      actions={
        <>
          <DashboardButton asChild size="sm" variant="primary">
            <Link href="/staff/tasks">
              Review today&apos;s work <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </DashboardButton>
          <DashboardButton
            asChild
            size="sm"
            variant="outline"
            className="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/20"
          >
            <Link href="/staff/hearings">Hearings</Link>
          </DashboardButton>
        </>
      }
      heroChildren={
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <HeroHealthChip
            healthy={!urgentPending && overdueCount === 0}
            overdueCount={overdueCount}
          />
          <HeroStatChip
            href="/staff/hearings"
            icon={CalendarDays}
            value={hearingsTodayCount}
            label="hearings today"
          />
          <HeroStatChip
            href="/staff/tasks"
            icon={CheckSquare}
            value={dueTodayCount}
            label="tasks due today"
          />
          <HeroStatChip
            href="/staff/messages"
            icon={MessageSquare}
            value={unreadTotal}
            label="unread messages"
          />
        </div>
      }
    >
      {isLoading ? (
        <DashboardLoadingSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
              const card = (
                <MetricCard
                  label={metric.label}
                  value={metric.value}
                  icon={metric.icon}
                  tone={metric.tone}
                  helperText={metric.helper}
                  density="compact"
                  chevron={Boolean(metric.href)}
                  className={cn(
                    "h-full card-micro-lift",
                    metric.href &&
                      "transition-all group-hover:border-dashboard-primary/50 group-hover:shadow-md",
                  )}
                />
              );
              return metric.href ? (
                <Link
                  key={metric.label}
                  href={metric.href}
                  className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus"
                >
                  {card}
                </Link>
              ) : (
                <div key={metric.label}>{card}</div>
              );
            })}
          </div>

          <nav aria-label="Quick actions" className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quick actions
            </span>
            {quickActions.map((action) => (
              <Link
                key={action.href + action.label}
                href={action.href}
                title={action.description}
                className="group inline-flex items-center gap-2 rounded-full border border-dashboard-border bg-dashboard-panel px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-all hover:border-dashboard-primary/40 hover:text-dashboard-primary hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-canvas"
              >
                <action.icon
                  className="size-3.5 text-dashboard-primary transition-transform group-hover:scale-110"
                  aria-hidden
                />
                {action.label}
              </Link>
            ))}
          </nav>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="min-w-0 space-y-6 xl:col-span-2">
              <DashboardSection
                density="compact"
                className="card-micro-lift"
                title="My Day"
                description="Today's hearings and appointments, in order"
                icon={CalendarDays}
                actions={
                  <DashboardButton asChild variant="ghost" size="sm">
                    <Link href="/staff/appointments">
                      View calendar <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </DashboardButton>
                }
              >
                {myDay.length === 0 ? (
                  <EmptyState
                    title="Nothing scheduled today"
                    description="Hearings and appointments for today will appear here."
                    icon={CalendarDays}
                    tone="neutral"
                    action={
                      <DashboardButton asChild variant="secondary" size="sm">
                        <Link href="/staff/appointments">Book appointment</Link>
                      </DashboardButton>
                    }
                  />
                ) : (
                  <ScheduleTimeline entries={myDay} />
                )}
              </DashboardSection>

              <DashboardSection
                density="compact"
                className="card-micro-lift"
                title="My Cases"
                description="Active matters and their next court dates"
                icon={FolderOpen}
                actions={
                  <DashboardButton asChild variant="ghost" size="sm">
                    <Link href="/staff/cases">
                      View All <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </DashboardButton>
                }
              >
                {activeCases.length === 0 ? (
                  <EmptyState
                    title="No active matters"
                    description="Cases assigned to you will appear here."
                    icon={FolderOpen}
                    tone="neutral"
                    action={
                      <DashboardButton asChild variant="secondary" size="sm">
                        <Link href="/staff/cases">Open cases</Link>
                      </DashboardButton>
                    }
                  />
                ) : (
                  <DashboardTable>
                    <DashboardTableHead>
                      <tr>
                        <DashboardTableHeaderCell>Matter</DashboardTableHeaderCell>
                        <DashboardTableHeaderCell>Client</DashboardTableHeaderCell>
                        <DashboardTableHeaderCell>Status</DashboardTableHeaderCell>
                        <DashboardTableHeaderCell>Next hearing</DashboardTableHeaderCell>
                      </tr>
                    </DashboardTableHead>
                    <DashboardTableBody>
                      {activeCases.slice(0, 5).map((item) => {
                        const nextHearing = nextHearingByCase.get(item._id);
                        return (
                          <DashboardTableRow key={item._id}>
                            <DashboardTableCell>
                              <span className="block text-xs font-medium tabular-nums text-muted-foreground">
                                {item.caseNumber}
                              </span>
                              <Link
                                href={`/staff/cases/${item._id}`}
                                className="block max-w-[16rem] truncate text-sm font-semibold text-foreground hover:text-dashboard-primary"
                              >
                                {item.title}
                              </Link>
                            </DashboardTableCell>
                            <DashboardTableCell>
                              <span className="block max-w-[10rem] truncate text-sm">
                                {clientNameById.get(item.clientId) ?? "Client record"}
                              </span>
                            </DashboardTableCell>
                            <DashboardTableCell>
                              <StatusBadge tone={getDashboardStatusTone(item.status)}>
                                {item.status}
                              </StatusBadge>
                            </DashboardTableCell>
                            <DashboardTableCell>
                              {nextHearing ? (
                                <span className="text-xs text-muted-foreground">
                                  {nextHearing.dateBs}
                                  <span className="block">{nextHearing.court}</span>
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </DashboardTableCell>
                          </DashboardTableRow>
                        );
                      })}
                    </DashboardTableBody>
                  </DashboardTable>
                )}
              </DashboardSection>
            </div>

            <div className="min-w-0 space-y-6">
              <DashboardSection
                density="compact"
                className="card-micro-lift"
                title="Priority Tasks"
                description="Ordered by urgency and due date"
                icon={CheckSquare}
                actions={
                  <DashboardButton asChild variant="ghost" size="sm">
                    <Link href="/staff/tasks">
                      View All <ArrowRight className="size-3.5" aria-hidden />
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
                    action={
                      <DashboardButton asChild variant="secondary" size="sm">
                        <Link href="/staff/tasks">Create task</Link>
                      </DashboardButton>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {priorityTasks.map((task) => {
                      const tone = getDashboardStatusTone(task.priority);
                      const due = (task as { dueDate?: string | null }).dueDate;
                      const dueIso = due?.slice(0, 10);
                      const dueBadge =
                        dueIso && dueIso < todayIso ? (
                          <StatusBadge tone="danger">Overdue</StatusBadge>
                        ) : dueIso === todayIso ? (
                          <StatusBadge tone="warning">Due today</StatusBadge>
                        ) : (
                          <StatusBadge tone={tone} className="uppercase">
                            {task.priority}
                          </StatusBadge>
                        );
                      return (
                        <DashboardListRow key={task._id}>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {task.title}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {task.caseId
                                ? (caseTitleById.get(task.caseId) ?? "Matter")
                                : "No matter linked"}
                              {dueIso ? ` · Due ${dueIso}` : ""}
                            </p>
                          </div>
                          {dueBadge}
                        </DashboardListRow>
                      );
                    })}
                  </div>
                )}
              </DashboardSection>

              <DashboardSection
                density="compact"
                className="card-micro-lift"
                title="Upcoming Hearings"
                description="Next court commitments"
                icon={CalendarDays}
                actions={
                  <DashboardButton asChild variant="ghost" size="sm">
                    <Link href="/staff/hearings">
                      View All <ArrowRight className="size-3.5" aria-hidden />
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
                    action={
                      <DashboardButton asChild variant="secondary" size="sm">
                        <Link href="/staff/hearings">Add hearing</Link>
                      </DashboardButton>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {upcomingHearings.map((hearing) => {
                      const urgent = hearing.purpose?.toLowerCase().includes("final") || false;
                      const dateParts = hearing.dateBs.split(" ");
                      return (
                        <div
                          key={hearing._id}
                          className="flex items-center gap-3 rounded-xl border border-dashboard-border bg-dashboard-canvas-elevated/40 p-3.5 transition-all hover:border-dashboard-border hover:bg-dashboard-panel-hover"
                        >
                          <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border border-dashboard-primary/30 bg-dashboard-primary-soft text-dashboard-primary">
                            <span className="text-xs font-bold leading-none">
                              {dateParts[0] || "Court"}
                            </span>
                            <span className="mt-1 text-[10px] leading-none opacity-80">
                              {dateParts[1] || ""}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {caseTitleById.get(hearing.caseId) ?? "Matter hearing"}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {hearing.court}
                              {hearing.time ? ` · ${hearing.time}` : ""}
                            </p>
                          </div>
                          {urgent ? (
                            <StatusBadge tone="danger" icon={AlertTriangle}>
                              Urgent
                            </StatusBadge>
                          ) : (
                            <StatusBadge tone="warning">Scheduled</StatusBadge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </DashboardSection>

              <DashboardSection
                density="compact"
                className="card-micro-lift"
                title="Messages & Team Updates"
                description="Latest from your team"
                icon={MessagesSquare}
                actions={
                  <DashboardButton asChild variant="ghost" size="sm">
                    <Link href="/staff/team-chat">
                      View All <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </DashboardButton>
                }
              >
                {dmThreads.length === 0 ? (
                  <EmptyState
                    title="No team messages yet"
                    description="Direct messages from colleagues will appear here."
                    icon={MessagesSquare}
                    tone="neutral"
                    action={
                      <DashboardButton asChild variant="secondary" size="sm">
                        <Link href="/staff/team-chat">Open team chat</Link>
                      </DashboardButton>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {dmThreads.slice(0, 5).map((thread) => (
                      <div
                        key={thread._id}
                        className="flex items-center gap-3 rounded-xl border border-dashboard-border bg-dashboard-canvas-elevated/40 p-3 transition-all hover:border-dashboard-border hover:bg-dashboard-panel-hover"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashboard-sidebar-border bg-dashboard-sidebar-active text-xs font-bold text-dashboard-sidebar-active-foreground">
                          {initialsOf(thread.peerName)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {thread.peerName}
                            </p>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {relativeTime(thread.lastMessageAt)}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {thread.lastMessage?.content ?? "No messages yet"}
                          </p>
                        </div>
                        {thread.unreadCount ? (
                          <StatusBadge tone="information">{thread.unreadCount} new</StatusBadge>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </DashboardSection>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <DashboardSection
              density="compact"
              className="card-micro-lift"
              title="Recent Documents"
              description="Latest uploads across your matters"
              icon={FileText}
              actions={
                <DashboardButton asChild variant="ghost" size="sm">
                  <Link href="/staff/documents">
                    View All <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </DashboardButton>
              }
            >
              {recentDocuments.length === 0 ? (
                <EmptyState
                  title="No documents yet"
                  description="Recently uploaded documents will appear here."
                  icon={FileText}
                  tone="neutral"
                  action={
                    <DashboardButton asChild variant="secondary" size="sm">
                      <Link href="/staff/documents">Upload document</Link>
                    </DashboardButton>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {recentDocuments.map((document) => (
                    <div
                      key={document._id}
                      className="flex items-center gap-3 rounded-xl border border-dashboard-border bg-dashboard-canvas-elevated/40 p-3 transition-all hover:border-dashboard-border hover:bg-dashboard-panel-hover"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashboard-information/30 bg-dashboard-information-soft text-[10px] font-bold text-dashboard-information-foreground">
                        {documentTypeLabel(document.mimeType)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {document.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {document.caseId
                            ? (caseTitleById.get(document.caseId) ?? "Matter document")
                            : "Unassigned"}
                          {relativeTime(document.updatedAt ?? document.createdAt)
                            ? ` · ${relativeTime(document.updatedAt ?? document.createdAt)}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashboardSection>

            <DashboardSection
              density="compact"
              className="card-micro-lift"
              title="Team Workload"
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
                  action={
                    <DashboardButton asChild variant="secondary" size="sm">
                      <Link href="/staff/tasks">Open task board</Link>
                    </DashboardButton>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {workload.slice(0, 6).map((row) => {
                    const user = userNameById.get(row.assignedTo);
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
          </div>
        </>
      )}
    </PortalPageShell>
  );
}
