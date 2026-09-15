"use client";

import { useMemo } from "react";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderOpen,
  PenTool,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "@/client/navigation";
import { useCases } from "@/client/queries/cases";
import { useMyClient, useMyTeam } from "@/client/queries/clients";
import { useDocuments } from "@/client/queries/documents";
import { useAppointments } from "@/client/queries/crm";
import { useHearings } from "@/client/queries/hearings";
import { useNotifications } from "@/client/queries/communication";
import { useTasks } from "@/client/queries/tasks";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import {
  DashboardButton,
  DashboardListRow,
  DashboardSection,
  DashboardStatusLabel,
  EmptyState,
  MetricCard,
  PortalPageShell,
  StatusBadge,
} from "@/components/dashboard";
import { getDashboardStatusTone } from "@/lib/dashboard-semantics";
import { localDateIso, relativeTime } from "@/lib/dashboard-format";

/** Plain-language, truthful presentation for the real matter status enum. */
const CLIENT_STATUS_LANGUAGE: Record<string, string> = {
  inquiry: "Inquiry under review",
  active: "Active — in progress",
  on_hold: "On hold for now",
  closed_won: "Resolved favorably",
  closed_lost: "Closed — final outcome issued",
};

function daysUntil(dateIso?: string | null): number | null {
  if (!dateIso) return null;
  const target = Date.parse(dateIso);
  if (Number.isNaN(target)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86_400_000);
}

function relativeDaysLabel(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export default function ClientDashboard() {
  const currentUser = useCurrentUser();
  const clientRecord = useMyClient();
  const clientId = clientRecord?._id;
  const cases = useCases(clientId ? { clientId } : {}) || [];
  const hearings = useHearings({}) || [];
  const users = useMyTeam() ?? [];
  const documents = useDocuments({}) || [];
  const tasks = useTasks() || [];
  const appointmentsResult = useAppointments({});
  const appointments = appointmentsResult?.data ?? [];
  const notifications = useNotifications().data ?? [];
  const cmsSettings = usePublicCmsSettings() as Record<string, unknown> | undefined;

  const todayIso = localDateIso(new Date());

  const caseIds = new Set(cases.map((item) => item._id));
  const myHearings = hearings.filter(
    (item) => caseIds.has(item.caseId) && item.status === "scheduled",
  );
  const activeCases = cases.filter((item) => item.status === "active");
  const visibleDocuments = documents.filter((item) => !item.caseId || caseIds.has(item.caseId));
  const pendingDocs = documents.filter(
    (item) =>
      item.caseId &&
      caseIds.has(item.caseId) &&
      item.requiresSignature &&
      item.signatureStatus === "pending",
  );
  const checklistOpen = tasks.filter(
    (item) =>
      item.clientVisible &&
      item.caseId &&
      caseIds.has(item.caseId) &&
      !item.archivedAt &&
      !item.parentTaskId &&
      item.status !== "done",
  );
  const kycNeedsAction =
    clientRecord?.kycStatus === "pending" || clientRecord?.kycStatus === "rejected";
  const actionRequiredCount = pendingDocs.length + (kycNeedsAction ? 1 : 0) + checklistOpen.length;

  // Featured Matter rule (documented): the most recently updated active matter;
  // if none is active, the most recently updated matter of any status.
  const featuredMatter = useMemo(() => {
    if (cases.length === 0) return null;
    const byUpdated = (a: (typeof cases)[number], b: (typeof cases)[number]) =>
      String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""));
    const active = activeCases.slice().sort(byUpdated);
    return active[0] ?? cases.slice().sort(byUpdated)[0];
  }, [cases, activeCases]);

  const featuredLawyer = featuredMatter
    ? users.find(
        (user) =>
          user._id === featuredMatter.assignedLawyerId ||
          user.id === featuredMatter.assignedLawyerId,
      )
    : undefined;
  const featuredNextHearing = featuredMatter
    ? myHearings.find((hearing) => hearing.caseId === featuredMatter._id)
    : undefined;

  // Next appointment: nearest future, non-cancelled (server-scoped to this client).
  const nextAppointment = useMemo(() => {
    const upcoming = appointments
      .filter((item) => {
        const status = (item as { status?: string }).status;
        const date = (item as { date?: string }).date ?? "";
        return status !== "cancelled" && status !== "completed" && date >= todayIso;
      })
      .sort((a, b) =>
        String((a as { date?: string }).date).localeCompare(String((b as { date?: string }).date)),
      );
    return upcoming[0] ?? null;
  }, [appointments, todayIso]);

  // Upcoming: client-safe hearings + own appointments, chronological.
  const upcoming = useMemo(() => {
    const hearingEntries = myHearings
      .filter((item) => item.dateGregorian && item.dateGregorian >= todayIso)
      .map((item) => {
        const matter = cases.find((candidate) => candidate._id === item.caseId);
        return {
          id: `hearing-${item._id}`,
          kind: "Hearing",
          dateIso: item.dateGregorian,
          dateBs: item.dateBs,
          title: matter?.title ?? "Court hearing",
          subtitle: item.court,
          time: item.time ?? "",
        };
      });
    const appointmentEntries = appointments
      .filter((item) => {
        const status = (item as { status?: string }).status;
        const date = (item as { date?: string }).date ?? "";
        return status !== "cancelled" && status !== "completed" && date >= todayIso;
      })
      .map((item) => ({
        id: `appointment-${(item as { _id?: string })._id}`,
        kind: "Appointment",
        dateIso: (item as { date?: string }).date ?? "",
        dateBs: "",
        title: (item as { practiceArea?: string }).practiceArea || "Client meeting",
        subtitle: (item as { clientName?: string }).clientName ?? "",
        time: (item as { timeSlot?: string }).timeSlot ?? "",
      }));
    return [...hearingEntries, ...appointmentEntries]
      .sort((a, b) => a.dateIso.localeCompare(b.dateIso))
      .slice(0, 4);
  }, [myHearings, appointments, cases, todayIso]);

  const actions: {
    href: string;
    label: string;
    detail: string;
    icon: typeof PenTool;
    verb: string;
  }[] = [];
  if (pendingDocs.length > 0)
    actions.push({
      href: "/client/signatures",
      label: "Review & sign a document",
      detail: `${pendingDocs.length} awaiting your signature`,
      icon: PenTool,
      verb: "Review",
    });
  if (kycNeedsAction)
    actions.push({
      href: "/client/kyc",
      label:
        kycNeedsAction && clientRecord?.kycStatus === "rejected"
          ? "Resubmit your KYC"
          : "Complete your KYC",
      detail: "Identity verification is required",
      icon: ShieldCheck,
      verb: "Open",
    });
  if (checklistOpen.length > 0)
    actions.push({
      href: "/client/checklist",
      label: "Your checklist",
      detail: `${checklistOpen.length} item${checklistOpen.length === 1 ? "" : "s"} to complete`,
      icon: ClipboardList,
      verb: "Open",
    });

  const contactPhone = typeof cmsSettings?.phone === "string" ? cmsSettings.phone : undefined;
  const contactEmail = typeof cmsSettings?.email === "string" ? cmsSettings.email : undefined;

  const summaryCards = [
    {
      label: "Active matters",
      value: String(activeCases.length),
      helper: "Across your legal areas",
      icon: FolderOpen,
      tone: "information" as const,
      href: "/client/cases",
    },
    {
      label: "Next appointment",
      value: nextAppointment
        ? (() => {
            const date = new Date(String((nextAppointment as { date?: string }).date));
            return Number.isNaN(date.getTime())
              ? "—"
              : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
          })()
        : "—",
      helper: nextAppointment
        ? String((nextAppointment as { timeSlot?: string }).timeSlot ?? "Scheduled")
        : "Nothing booked yet",
      icon: CalendarDays,
      tone: "warning" as const,
      href: "/client/booking",
    },
    {
      label: "Documents",
      value: String(visibleDocuments.length),
      helper: "Uploaded and shared with you",
      icon: FileText,
      tone: "information" as const,
      href: "/client/documents",
    },
    {
      label: "Action required",
      value: String(actionRequiredCount),
      helper: actionRequiredCount > 0 ? "Items waiting for you" : "You're all caught up",
      icon: ShieldCheck,
      tone: actionRequiredCount > 0 ? ("danger" as const) : ("success" as const),
      href: undefined,
    },
  ];

  if (clientRecord === undefined) {
    return (
      <PortalPageShell
        portal="client"
        loading
        loadingLabel="Preparing your secure client portal…"
        title="Client Portal"
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
        eyebrow="Client access"
        title="Welcome to LexNepal"
        description="Your client portal account is active."
        icon={ShieldCheck}
      >
        <EmptyState
          title="No client profile linked"
          description="No client profile is linked to this account yet. Please contact the firm to complete setup."
          icon={ShieldCheck}
          tone="information"
        />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell
      portal="client"
      decorated
      showTodayDate
      heroClassName="p-5 sm:p-6 [&_h1]:text-3xl [&_h1]:xl:text-4xl"
      eyebrow="Your legal portal"
      title={`Welcome back${clientRecord.fullName ? `, ${clientRecord.fullName.split(" ")[0]}` : ""}`}
      description="Here's the latest on your legal matters."
      icon={Sparkles}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <DashboardButton asChild size="sm">
            <Link href="/client/messages">
              Message your team <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </DashboardButton>
          <DashboardButton asChild size="sm" variant="secondary">
            <Link href="/client/booking">Book appointment</Link>
          </DashboardButton>
        </div>
      }
      heroChildren={
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="success" icon={ShieldCheck}>
            Secure client access
          </StatusBadge>
        </div>
      }
    >
      {featuredMatter ? (
        <DashboardSection
          density="default"
          title="Featured Matter"
          icon={FolderOpen}
          actions={
            <DashboardButton asChild size="sm">
              <Link href={`/client/cases/${featuredMatter._id}`}>
                View Matter <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </DashboardButton>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                {featuredMatter.title}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {featuredMatter.caseNumber}
                </span>
                <span aria-hidden className="text-xs text-muted-foreground">
                  ·
                </span>
                <DashboardStatusLabel status={featuredMatter.status} className="text-xs" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Current status:{" "}
                <span className="font-medium text-foreground">
                  {CLIENT_STATUS_LANGUAGE[featuredMatter.status] ?? featuredMatter.status}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-dashboard-border pt-3 text-xs text-muted-foreground">
              {featuredMatter.practiceArea ? (
                <span>Practice area: {featuredMatter.practiceArea}</span>
              ) : null}
              {featuredLawyer ? <span>Your lawyer: {featuredLawyer.name}</span> : null}
              {featuredNextHearing ? (
                <span className="text-dashboard-information-foreground">
                  Next hearing: {featuredNextHearing.dateBs || featuredNextHearing.dateGregorian}
                  {featuredNextHearing.court ? ` · ${featuredNextHearing.court}` : ""}
                </span>
              ) : null}
              <StatusBadge tone={getDashboardStatusTone(featuredMatter.status)} className="ml-auto">
                {featuredMatter.status.replaceAll("_", " ")}
              </StatusBadge>
            </div>
          </div>
        </DashboardSection>
      ) : (
        <DashboardSection density="default" title="Featured Matter" icon={FolderOpen}>
          <EmptyState
            title="No matters yet"
            description="When the firm opens a matter for you, its progress will appear here."
            icon={FolderOpen}
            tone="information"
          />
        </DashboardSection>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            tone={card.tone}
            helperText={card.helper}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DashboardSection
          title="What you need to do"
          description="Items that need your attention"
          icon={ClipboardList}
          actions={
            <DashboardButton asChild variant="ghost" size="sm">
              <Link href="/client/checklist">
                View all tasks <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </DashboardButton>
          }
        >
          {actions.length === 0 ? (
            <EmptyState
              title="You're all caught up"
              description="Nothing needs your attention right now."
              icon={ClipboardList}
              tone="success"
            />
          ) : (
            <div className="space-y-3">
              {actions.map((action) => (
                <DashboardListRow key={`${action.href}-${action.label}`}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashboard-primary/25 bg-dashboard-primary-soft text-dashboard-primary">
                    <action.icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{action.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{action.detail}</p>
                  </div>
                  <DashboardButton asChild size="sm" variant="outline">
                    <Link href={action.href}>{action.verb}</Link>
                  </DashboardButton>
                </DashboardListRow>
              ))}
            </div>
          )}
        </DashboardSection>

        <DashboardSection
          title="Upcoming"
          description="Your hearings and appointments"
          icon={CalendarDays}
          actions={
            <DashboardButton asChild variant="ghost" size="sm">
              <Link href="/client/hearings">
                View calendar <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </DashboardButton>
          }
        >
          {upcoming.length === 0 ? (
            <EmptyState
              title="Nothing scheduled"
              description="Your hearings and appointments will appear here."
              icon={CalendarDays}
              tone="information"
            />
          ) : (
            <div className="space-y-3">
              {upcoming.map((entry) => {
                const days = daysUntil(entry.dateIso);
                const date = new Date(entry.dateIso);
                const dateParts = entry.dateBs.split(" ");
                return (
                  <DashboardListRow key={entry.id} className="gap-3">
                    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border border-dashboard-accent/35 bg-dashboard-accent-soft text-dashboard-accent-foreground">
                      <span className="text-xs font-bold">
                        {entry.dateBs ? dateParts[0] : date.getDate()}
                      </span>
                      <span className="text-[10px]">
                        {entry.dateBs
                          ? dateParts[1]
                          : date.toLocaleDateString("en-GB", { month: "short" })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className={`size-2 shrink-0 rounded-full ${
                            entry.kind === "Hearing"
                              ? "bg-dashboard-danger"
                              : "bg-dashboard-information"
                          }`}
                        />
                        <p className="truncate text-sm font-semibold text-foreground">
                          {entry.title}
                        </p>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {entry.kind}
                        {entry.time ? ` · ${entry.time}` : ""}
                        {entry.subtitle ? ` · ${entry.subtitle}` : ""}
                      </p>
                    </div>
                    {days !== null ? (
                      <StatusBadge tone={days <= 1 ? "warning" : "information"}>
                        {relativeDaysLabel(days)}
                      </StatusBadge>
                    ) : null}
                  </DashboardListRow>
                );
              })}
            </div>
          )}
        </DashboardSection>

        <DashboardSection
          title="Recent Updates"
          description="News about your matters"
          icon={FileText}
          actions={
            <DashboardButton asChild variant="ghost" size="sm">
              <Link href="/client/notifications">
                View All <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </DashboardButton>
          }
        >
          {notifications.length === 0 ? (
            <EmptyState
              title="No new updates right now"
              description="Updates about your matters will appear here."
              icon={FileText}
              tone="information"
            />
          ) : (
            <div className="space-y-3">
              {notifications.slice(0, 5).map((notification, index) => {
                const key = notification._id ?? notification.id ?? `update-${index}`;
                const body = notification.body ?? "";
                const created = notification._creationTime ?? notification.createdAt;
                return (
                  <div
                    key={key}
                    className="flex items-start gap-3 rounded-xl border border-dashboard-border bg-dashboard-canvas-elevated/40 p-3 transition-all hover:border-dashboard-border hover:bg-dashboard-panel-hover"
                  >
                    <span
                      aria-hidden
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        notification.isRead ? "bg-dashboard-neutral" : "bg-dashboard-primary"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-foreground">{body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {relativeTime(created ?? null)}
                      </p>
                    </div>
                    {!notification.isRead ? (
                      <StatusBadge tone="information" className="shrink-0">
                        New
                      </StatusBadge>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </DashboardSection>
      </div>

      <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashboard-border bg-dashboard-panel p-5 shadow-sm sm:flex-row sm:items-center">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-dashboard-primary/25 bg-dashboard-primary-soft text-dashboard-primary">
          <CalendarClock className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-base font-semibold text-foreground">Need Help?</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Our team is here to support you at every step.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {contactPhone ? <StatusBadge tone="neutral">Call us: {contactPhone}</StatusBadge> : null}
          {contactEmail ? <StatusBadge tone="neutral">Email: {contactEmail}</StatusBadge> : null}
          <DashboardButton asChild size="sm">
            <Link href="/client/messages">Message your team</Link>
          </DashboardButton>
        </div>
      </div>
    </PortalPageShell>
  );
}
