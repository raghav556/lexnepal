"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  ArrowLeft,
  CalendarDays,
  CheckSquare,
  Circle,
  Clock,
  FileText,
  FolderOpen,
  Hash,
  Loader2,
  MapPin,
  MessageSquare,
  Scale,
  ShieldAlert,
  Upload,
  User,
} from "lucide-react";
import { useClientCaseQuery } from "@/client/queries/cases";
import { caseQueryFailureKind } from "@/client/queries/case-query-error";
import { useMyTeam } from "@/client/queries/clients";
import {
  CASE_DETAIL_HERO_CLASS,
  CASE_DETAIL_TABS_LIST_CLASS,
  CASE_LIFECYCLE_LABELS,
  toLifecycleStatus,
} from "@/shared/contracts/case-ui";
import { CaseQueryState } from "@/components/cases/case-query-state";
import { useHearings } from "@/client/queries/hearings";
import { useDocuments, useDownloadDocument } from "@/client/queries/documents";
import { useTasks } from "@/client/queries/tasks";
import { useMessages, useNotifications } from "@/client/queries/communication";
import { formatTaskDue, TASK_STATUS_LABELS, type TaskStatus } from "@/lib/task-constants.ts";
import { initialsOf, localDateIso, relativeTime } from "@/lib/dashboard-format";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import {
  DashboardButton,
  DashboardListRow,
  DashboardListSkeleton,
  DashboardSection,
  DashboardStatusLabel,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";

type ClientNotification = {
  _id?: string;
  id?: string;
  title?: string | null;
  body?: string | null;
  type?: string | null;
  relatedId?: string | null;
  caseId?: string | null;
  link?: string | null;
  createdAt?: string | null;
  _creationTime?: number | string | null;
};

function DocDownload({ documentId }: { documentId: string }) {
  const downloadDocument = useDownloadDocument();
  const [busy, setBusy] = useState(false);
  return (
    <DashboardButton
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const url = await downloadDocument(documentId);
          if (url) window.open(String(url), "_blank");
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Download failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Download"}
    </DashboardButton>
  );
}

/** Same ICS pattern as Client Home / Hearings — not a second calendar engine. */
function downloadHearingIcs(input: {
  id: string;
  title: string;
  court?: string | null;
  purpose?: string | null;
  dateGregorian?: string | null;
  time?: string | null;
}) {
  const day = String(input.dateGregorian ?? "")
    .slice(0, 10)
    .replace(/-/g, "");
  if (!day) return;
  const start =
    input.time && /^\d{1,2}:\d{2}/.test(input.time)
      ? `${day}T${input.time.split(":")[0]?.padStart(2, "0")}${input.time.split(":")[1]?.slice(0, 2)}00`
      : day;
  const summary = `${input.title} — ${input.court || "Court"}`.replace(/[,;]/g, " ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Srimar Law//Client Portal//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${input.id}@srimar.law`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    start.includes("T") ? `DTSTART;TZID=Asia/Kathmandu:${start}` : `DTSTART;VALUE=DATE:${start}`,
    `SUMMARY:${summary}`,
  ];
  if (input.purpose) lines.push(`DESCRIPTION:${String(input.purpose).replace(/[,;]/g, " ")}`);
  if (input.court) lines.push(`LOCATION:${String(input.court).replace(/[,;]/g, " ")}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "srimar-hearing.ics";
  anchor.click();
  URL.revokeObjectURL(url);
}

function hearingDateParts(dateGregorian?: string | null) {
  if (!dateGregorian) return null;
  const date = new Date(`${dateGregorian.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
    year: String(date.getFullYear()),
  };
}

function notificationBelongsToMatter(notification: ClientNotification, matterId: string): boolean {
  const related = String(notification.relatedId ?? "").trim();
  if (related && related === matterId) return true;
  const caseId = String(notification.caseId ?? "").trim();
  if (caseId && caseId === matterId) return true;
  const link = String(notification.link ?? "");
  return link.includes(`/client/cases/${matterId}`);
}

function notificationTitle(notification: ClientNotification): string {
  const title = String(notification.title ?? "").trim();
  if (title) return title;
  const body = String(notification.body ?? "")
    .split(/[.!\n]/)[0]
    ?.trim();
  return body || "Update";
}

function notificationCategory(type?: string | null): string | undefined {
  switch (type) {
    case "hearing_reminder":
      return "Hearing";
    case "message":
      return "Message";
    case "document_request":
      return "Document";
    case "task_due":
      return "Task";
    case "system":
      return "Update";
    default:
      return type || undefined;
  }
}

function TeamAvatar({ name, avatar }: { name: string; avatar?: string | null }) {
  const photo = avatar?.trim();
  if (photo) {
    return <img src={photo} alt="" className="client-matter-detail-avatar-image" />;
  }
  return (
    <span className="client-matter-detail-avatar" aria-hidden>
      {initialsOf(name) || <User className="size-3.5" />}
    </span>
  );
}

export default function ClientCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const caseId = params?.id || "";
  const caseQuery = useClientCaseQuery(caseId || null);
  const caseData = caseQuery.data;
  const team = useMyTeam();
  const hearingsQuery = useHearings(caseId ? { caseId } : "skip");
  const hearings = hearingsQuery === undefined ? undefined : hearingsQuery || [];
  const documentsQuery = useDocuments(caseId ? { caseId } : {});
  const documents = documentsQuery === undefined ? undefined : documentsQuery || [];
  const tasksQuery = useTasks(caseId ? { caseId } : "skip");
  const tasks = tasksQuery === undefined ? undefined : tasksQuery || [];
  const { data: messagesResponse } = useMessages(caseId || "", false);
  const messages = messagesResponse?.page || [];
  const notificationsQuery = useNotifications();
  const notifications = (notificationsQuery.data ?? []) as ClientNotification[];

  const checklist = useMemo(
    () =>
      (tasks ?? []).filter(
        (t: { clientVisible?: boolean; archivedAt?: string; parentTaskId?: string }) =>
          t.clientVisible && !t.archivedAt && !t.parentTaskId,
      ),
    [tasks],
  );
  const openActions = checklist.filter((t: { status?: string }) => t.status !== "done");
  const checklistDone = checklist.length - openActions.length;
  const pendingSignatures = (documents ?? []).filter((d) => {
    const row = d as { requiresSignature?: boolean; signatureStatus?: string };
    return row.requiresSignature && row.signatureStatus === "pending";
  }).length;

  const todayIso = localDateIso(new Date());
  const nextHearing = useMemo(() => {
    const list = hearings ?? [];
    const upcoming = list
      .filter(
        (h: { status?: string; dateGregorian?: string }) =>
          h.status === "scheduled" &&
          h.dateGregorian &&
          String(h.dateGregorian).slice(0, 10) >= todayIso,
      )
      .sort((a: { dateGregorian?: string }, b: { dateGregorian?: string }) =>
        String(a.dateGregorian).localeCompare(String(b.dateGregorian)),
      );
    return upcoming[0] ?? list.find((h: { status?: string }) => h.status === "scheduled") ?? null;
  }, [hearings, todayIso]);

  const matterUpdates = useMemo(() => {
    if (!caseId) return [];
    return notifications
      .filter((n) => notificationBelongsToMatter(n, caseId))
      .sort((a, b) => {
        const left = String(a.createdAt ?? a._creationTime ?? "");
        const right = String(b.createdAt ?? b._creationTime ?? "");
        return right.localeCompare(left);
      });
  }, [notifications, caseId]);

  const teamMembers = team ?? [];
  const avatarById = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of teamMembers) {
      const photo = member.avatar?.trim();
      if (photo) map.set(member.id || member._id, photo);
    }
    return map;
  }, [teamMembers]);

  if (!caseId || caseQuery.isError) {
    const kind = !caseId ? "not_found" : caseQueryFailureKind(caseQuery.error);
    return (
      <CaseQueryState
        portal="client"
        kind={kind}
        scope="detail"
        backHref="/client/cases"
        onRetry={
          caseQuery.isError
            ? () => {
                void caseQuery.refetch();
              }
            : undefined
        }
      />
    );
  }

  if (caseQuery.isPending || caseData === undefined) {
    return (
      <PortalPageShell
        portal="client"
        className="client-matter-detail"
        loading
        loadingLabel="Loading matter details…"
        title="Matter Details"
      >
        <div />
      </PortalPageShell>
    );
  }

  if (caseData === null) {
    return (
      <CaseQueryState portal="client" kind="not_found" scope="detail" backHref="/client/cases" />
    );
  }

  const advocate = caseData.advocate;
  const advocateName = advocate?.name?.trim() ? advocate.name : "Unassigned";
  const lifecycle = toLifecycleStatus(caseData.status);
  const statusLabel = CASE_LIFECYCLE_LABELS[lifecycle];
  const courtLabel = caseData.court?.trim() ? caseData.court : "Not specified";
  const visibleParties = caseData.parties ?? [];
  const opposingParties = visibleParties.filter((party) => party.side === "opposing");
  const nextHearingParts = hearingDateParts(nextHearing?.dateGregorian);
  const hearingLabel = nextHearing
    ? String(nextHearing.dateBs || nextHearing.dateGregorian || "Scheduled")
    : "None scheduled";
  const metaParts = [
    caseData.practiceArea,
    `Matter No. ${caseData.caseNumber}`,
    caseData.court?.trim() || null,
  ].filter(Boolean);

  const breadcrumb = (
    <nav aria-label="Breadcrumb" className="client-matter-detail-breadcrumb">
      <ol className="client-matter-detail-breadcrumb-list">
        <li>
          <Link href="/client/cases" className="client-matter-detail-breadcrumb-link">
            My Matters
          </Link>
        </li>
        <li aria-hidden="true" className="client-matter-detail-breadcrumb-sep">
          /
        </li>
        <li>
          <span aria-current="page" className="client-matter-detail-breadcrumb-current">
            {caseData.title}
          </span>
        </li>
      </ol>
    </nav>
  );

  return (
    <PortalPageShell
      portal="client"
      className="client-matter-detail"
      eyebrow={
        <div className="client-matter-detail-eyebrow">
          {breadcrumb}
          <span data-hero-chips className="client-matter-detail-status-wrap">
            <DashboardStatusLabel
              status={caseData.status}
              label={statusLabel}
              className="client-matter-detail-status text-xs"
            />
          </span>
        </div>
      }
      title={caseData.title}
      description={
        <span className="client-matter-detail-hero-copy">
          <span className="sr-only">{`Matter #${caseData.caseNumber}`}</span>
          <span className="client-matter-detail-hero-meta">{metaParts.join(" · ")}</span>
          {caseData.clientSummary ? (
            <span className="client-matter-detail-hero-summary">{caseData.clientSummary}</span>
          ) : null}
        </span>
      }
      icon={Scale}
      heroClassName={cn(CASE_DETAIL_HERO_CLASS, "client-matter-detail-hero")}
      metricsClassName="max-sm:hidden"
      actions={
        <div className="client-matter-detail-hero-actions">
          <DashboardButton asChild variant="secondary" size="sm">
            <Link href="/client/cases">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to My Matters
            </Link>
          </DashboardButton>
          <DashboardButton asChild size="sm">
            <Link href={`/client/messages?caseId=${caseId}`}>
              <MessageSquare className="w-4 h-4 mr-1.5" /> Message Legal Team
            </Link>
          </DashboardButton>
          <DashboardButton asChild variant="outline" size="sm">
            <Link href={`/client/documents?caseId=${caseId}`}>
              <Upload className="w-4 h-4 mr-1.5" /> Upload Document
            </Link>
          </DashboardButton>
        </div>
      }
    >
      <Tabs defaultValue="overview" className="client-matter-detail-tabs w-full space-y-2">
        <TabsList
          aria-label="Matter sections"
          className={`${CASE_DETAIL_TABS_LIST_CLASS} client-matter-detail-tablist`}
        >
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hearings">Hearings</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-2 space-y-2">
          {pendingSignatures > 0 ? (
            <DashboardSection
              density="compact"
              className="client-matter-detail-alert border-dashboard-warning/40 bg-dashboard-warning-soft"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-dashboard-warning shrink-0" />
                  <p className="text-sm font-medium text-dashboard-warning-foreground">
                    {pendingSignatures} document{pendingSignatures === 1 ? "" : "s"} awaiting your
                    digital signature.
                  </p>
                </div>
                <DashboardButton asChild size="sm">
                  <Link href="/client/signatures">Review Signatures</Link>
                </DashboardButton>
              </div>
            </DashboardSection>
          ) : null}

          <div className="client-matter-detail-facts" aria-label="Matter summary">
            <div className="client-matter-detail-fact" data-tone="information">
              <span className="client-matter-detail-fact-icon" aria-hidden>
                <Hash className="size-3.5" />
              </span>
              <div className="client-matter-detail-fact-copy">
                <span className="client-matter-detail-fact-label">Matter Number</span>
                <span className="client-matter-detail-fact-value font-mono">
                  {caseData.caseNumber}
                </span>
              </div>
            </div>
            <div className="client-matter-detail-fact" data-tone="success">
              <span className="client-matter-detail-fact-icon" aria-hidden>
                <Scale className="size-3.5" />
              </span>
              <div className="client-matter-detail-fact-copy">
                <span className="client-matter-detail-fact-label">Current Status</span>
                <span className="client-matter-detail-fact-value">
                  <DashboardStatusLabel
                    status={caseData.status}
                    label={statusLabel}
                    className="text-xs"
                  />
                </span>
              </div>
            </div>
            <div className="client-matter-detail-fact" data-tone="warning">
              <span className="client-matter-detail-fact-icon" aria-hidden>
                <CalendarDays className="size-3.5" />
              </span>
              <div className="client-matter-detail-fact-copy">
                <span className="client-matter-detail-fact-label">Next Hearing</span>
                <span className="client-matter-detail-fact-value">{hearingLabel}</span>
              </div>
            </div>
            <div className="client-matter-detail-fact" data-tone="primary">
              <span className="client-matter-detail-fact-icon" aria-hidden>
                <CheckSquare className="size-3.5" />
              </span>
              <div className="client-matter-detail-fact-copy">
                <span className="client-matter-detail-fact-label">Open Actions</span>
                <span className="client-matter-detail-fact-value">{openActions.length}</span>
              </div>
            </div>
          </div>

          <div className="client-matter-detail-overview">
            <div className="client-matter-detail-main space-y-2">
              <DashboardSection
                title="About This Matter"
                density="compact"
                className="client-matter-detail-card"
              >
                {caseData.clientSummary ? (
                  <p className="client-matter-detail-about-summary">{caseData.clientSummary}</p>
                ) : null}
                <dl className="client-matter-detail-about">
                  <div>
                    <dt>Practice Area</dt>
                    <dd>{caseData.practiceArea}</dd>
                  </div>
                  <div>
                    <dt>Court</dt>
                    <dd>{courtLabel}</dd>
                  </div>
                  <div>
                    <dt>Lead Advocate</dt>
                    <dd>{advocateName}</dd>
                  </div>
                  {visibleParties.length > 0 && opposingParties.length > 0 ? (
                    <div>
                      <dt>Opposing Party</dt>
                      <dd>{opposingParties.map((p) => p.name).join(", ")}</dd>
                    </div>
                  ) : null}
                </dl>
              </DashboardSection>

              <DashboardSection
                title="Recent Matter Activity"
                density="compact"
                className="client-matter-detail-card"
              >
                {matterUpdates.length === 0 ? (
                  <EmptyState
                    title="No recent matter activity"
                    description="Updates related to this matter will appear here when your legal team shares them."
                    icon={FolderOpen}
                  />
                ) : (
                  <ul className="client-matter-detail-activity">
                    {matterUpdates.slice(0, 4).map((notification) => (
                      <li
                        key={String(notification._id ?? notification.id)}
                        className="client-matter-detail-activity-item"
                      >
                        <span className="client-matter-detail-activity-time">
                          {relativeTime(
                            String(notification.createdAt ?? notification._creationTime ?? ""),
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {notificationTitle(notification)}
                          </p>
                          {notificationCategory(notification.type) ? (
                            <p className="text-xs text-muted-foreground">
                              {notificationCategory(notification.type)}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardSection>

              <DashboardSection
                title="Latest Documents"
                density="compact"
                className="client-matter-detail-card"
                actions={
                  <DashboardButton asChild size="sm" variant="ghost">
                    <Link href={`/client/documents?caseId=${caseId}`}>View All →</Link>
                  </DashboardButton>
                }
              >
                {documents === undefined ? (
                  <DashboardListSkeleton rows={2} />
                ) : documents.length === 0 ? (
                  <EmptyState
                    title="No documents shared yet"
                    description="Documents filed or shared by your legal team will appear here."
                    icon={FileText}
                  />
                ) : (
                  <div className="space-y-1.5">
                    {documents
                      .slice(0, 3)
                      .map((doc: { _id: string; title?: string; type?: string }) => (
                        <DashboardListRow key={doc._id} className="client-matter-detail-row">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <FileText className="size-4 shrink-0 text-dashboard-primary" />
                            <span className="truncate text-sm font-semibold">{doc.title}</span>
                            <DashboardStatusLabel status={doc.type} className="text-[10px]" />
                          </div>
                          <DocDownload documentId={doc._id} />
                        </DashboardListRow>
                      ))}
                  </div>
                )}
              </DashboardSection>
            </div>

            <aside className="client-matter-detail-rail" aria-label="Matter sidebar">
              <section className="client-matter-detail-rail-card">
                <div className="client-matter-detail-rail-head">
                  <h2>Upcoming Hearing</h2>
                  <DashboardButton asChild size="sm" variant="ghost">
                    <Link href="/client/hearings">View All →</Link>
                  </DashboardButton>
                </div>
                {nextHearing ? (
                  <div className="client-matter-detail-hearing">
                    {nextHearingParts ? (
                      <div className="client-matter-detail-hearing-date" aria-hidden>
                        <span className="client-matter-detail-hearing-day">
                          {nextHearingParts.day}
                        </span>
                        <span className="client-matter-detail-hearing-month">
                          {nextHearingParts.month}
                        </span>
                        <span className="client-matter-detail-hearing-year">
                          {nextHearingParts.year}
                        </span>
                      </div>
                    ) : null}
                    <div className="client-matter-detail-hearing-body">
                      <ul className="client-matter-detail-hearing-lines">
                        <li>
                          <MapPin className="size-3.5" aria-hidden />
                          <span>{nextHearing.court || "Court TBD"}</span>
                        </li>
                        {nextHearing.time ? (
                          <li>
                            <Clock className="size-3.5" aria-hidden />
                            <span>{nextHearing.time}</span>
                          </li>
                        ) : null}
                        {nextHearing.purpose ? (
                          <li>
                            <Scale className="size-3.5" aria-hidden />
                            <span>{nextHearing.purpose}</span>
                          </li>
                        ) : null}
                        {nextHearing.dateBs ? (
                          <li>
                            <CalendarDays className="size-3.5" aria-hidden />
                            <span>{nextHearing.dateBs} (BS)</span>
                          </li>
                        ) : null}
                      </ul>
                      <DashboardButton
                        size="sm"
                        variant="outline"
                        className="client-matter-detail-hearing-ics"
                        onClick={() =>
                          downloadHearingIcs({
                            id: String(nextHearing._id),
                            title: caseData.title,
                            court: nextHearing.court,
                            purpose: nextHearing.purpose,
                            dateGregorian: nextHearing.dateGregorian,
                            time: nextHearing.time,
                          })
                        }
                      >
                        Add to Calendar
                      </DashboardButton>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="No upcoming hearing"
                    description="Scheduled appearances for this matter will show here."
                    icon={CalendarDays}
                  />
                )}
              </section>

              <section className="client-matter-detail-rail-card">
                <div className="client-matter-detail-rail-head">
                  <h2>Your Legal Team</h2>
                </div>
                {advocate?.name?.trim() || teamMembers.length > 0 ? (
                  <ul className="client-matter-detail-team-list">
                    {advocate?.name?.trim() ? (
                      <li className="client-matter-detail-team-row">
                        <TeamAvatar name={advocate.name} avatar={avatarById.get(advocate.id)} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{advocate.name}</p>
                          <p className="text-xs text-muted-foreground">Lead Advocate</p>
                        </div>
                        <DashboardButton asChild size="sm" variant="ghost">
                          <Link
                            href={`/client/messages?caseId=${caseId}`}
                            aria-label={`Message ${advocate.name}`}
                          >
                            <MessageSquare className="size-4" />
                          </Link>
                        </DashboardButton>
                      </li>
                    ) : null}
                    {teamMembers
                      .filter((m) => m.id !== advocate?.id && m._id !== advocate?.id)
                      .slice(0, 4)
                      .map((member) => (
                        <li key={member.id || member._id} className="client-matter-detail-team-row">
                          <TeamAvatar name={member.name} avatar={member.avatar} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{member.name}</p>
                            <p className="text-xs text-muted-foreground">Legal Team</p>
                          </div>
                          <DashboardButton asChild size="sm" variant="ghost">
                            <Link
                              href={`/client/messages?caseId=${caseId}`}
                              aria-label={`Message ${member.name}`}
                            >
                              <MessageSquare className="size-4" />
                            </Link>
                          </DashboardButton>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <EmptyState
                    title="Advocate unassigned"
                    description="Your legal team will appear here once assigned to this matter."
                    icon={User}
                  />
                )}
              </section>

              <section className="client-matter-detail-rail-card">
                <div className="client-matter-detail-rail-head">
                  <h2>Your Actions</h2>
                  <DashboardButton asChild size="sm" variant="ghost">
                    <Link href="/client/checklist">View Checklist →</Link>
                  </DashboardButton>
                </div>
                {openActions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No open client actions right now.</p>
                ) : (
                  <ul className="space-y-2">
                    {openActions.slice(0, 3).map((task: { _id: string; title?: string }) => (
                      <li key={task._id} className="flex items-start gap-2 text-sm">
                        <Circle className="mt-0.5 size-4 shrink-0 text-dashboard-neutral" />
                        <span className="font-medium">{task.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="client-matter-detail-help">
                <div className="client-matter-detail-help-copy">
                  <h2>Need Assistance?</h2>
                  <p>Message your legal team about this matter anytime.</p>
                  <DashboardButton asChild size="sm">
                    <Link href={`/client/messages?caseId=${caseId}`}>Send a Message →</Link>
                  </DashboardButton>
                </div>
              </section>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="hearings" className="mt-3 space-y-3">
          <DashboardSection
            title="Court Hearings"
            description="Scheduled dates and appearance records"
            className="client-matter-detail-card"
          >
            {hearings === undefined ? (
              <DashboardListSkeleton rows={3} />
            ) : hearings.length === 0 ? (
              <EmptyState
                title="No hearings on this matter"
                description="Hearings scheduled for this court matter will appear here automatically."
                icon={CalendarDays}
              />
            ) : (
              <div className="space-y-2">
                {hearings.map(
                  (h: {
                    _id: string;
                    dateBs?: string;
                    dateGregorian?: string;
                    time?: string | null;
                    status?: string;
                    court?: string;
                    purpose?: string | null;
                  }) => (
                    <DashboardListRow key={h._id} className="client-matter-detail-row">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <CalendarDays className="mt-0.5 size-5 shrink-0 text-dashboard-accent" />
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold">
                              {h.dateBs || h.dateGregorian}
                              {h.time ? ` · ${h.time}` : ""}
                            </p>
                            <DashboardStatusLabel status={h.status} className="text-xs" />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {h.court || "Court TBD"}
                            {h.purpose ? ` · ${h.purpose}` : ""}
                          </p>
                        </div>
                      </div>
                    </DashboardListRow>
                  ),
                )}
              </div>
            )}
          </DashboardSection>
        </TabsContent>

        <TabsContent value="team" className="mt-3 space-y-3">
          <DashboardSection
            title="Your Legal Team"
            description="People working on this matter"
            className="client-matter-detail-card"
          >
            {team === undefined ? (
              <DashboardListSkeleton rows={3} />
            ) : !advocate?.name?.trim() && teamMembers.length === 0 ? (
              <EmptyState
                title="Advocate unassigned"
                description="Your legal team will appear here once assigned to this matter."
                icon={User}
              />
            ) : (
              <ul className="client-matter-detail-team-list">
                {advocate?.name?.trim() ? (
                  <li className="client-matter-detail-team-row">
                    <TeamAvatar name={advocate.name} avatar={avatarById.get(advocate.id)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{advocate.name}</p>
                      <p className="text-xs text-muted-foreground">Lead Advocate</p>
                    </div>
                    <DashboardButton asChild size="sm" variant="outline">
                      <Link href={`/client/messages?caseId=${caseId}`}>Message</Link>
                    </DashboardButton>
                  </li>
                ) : null}
                {teamMembers
                  .filter((m) => m.id !== advocate?.id && m._id !== advocate?.id)
                  .map((member) => (
                    <li key={member.id || member._id} className="client-matter-detail-team-row">
                      <TeamAvatar name={member.name} avatar={member.avatar} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{member.name}</p>
                        <p className="text-xs text-muted-foreground">Legal Team</p>
                      </div>
                      <DashboardButton asChild size="sm" variant="outline">
                        <Link href={`/client/messages?caseId=${caseId}`}>Message</Link>
                      </DashboardButton>
                    </li>
                  ))}
              </ul>
            )}
          </DashboardSection>
        </TabsContent>

        <TabsContent value="actions" className="mt-3 space-y-3">
          <DashboardSection
            title="Client Action Checklist"
            description={`${checklistDone}/${checklist.length} completed`}
            className="client-matter-detail-card"
            actions={
              <DashboardButton asChild size="sm" variant="outline">
                <Link href="/client/checklist">Open Checklist</Link>
              </DashboardButton>
            }
          >
            {tasks === undefined ? (
              <DashboardListSkeleton rows={3} />
            ) : checklist.length === 0 ? (
              <EmptyState
                title="No client-visible actions"
                description="Any pending client action items will appear here."
                icon={CheckSquare}
              />
            ) : (
              <div className="space-y-2">
                {checklist.map(
                  (task: {
                    _id: string;
                    title?: string;
                    description?: string | null;
                    status?: string;
                    priority?: string;
                  }) => {
                    const isDone = task.status === "done";
                    const due = formatTaskDue(
                      task as { dueDateBs?: string | null; dueDate?: string | null },
                    );
                    return (
                      <DashboardListRow
                        key={task._id}
                        className={cn(
                          "client-matter-detail-row flex items-start gap-3",
                          isDone && "opacity-75",
                        )}
                      >
                        {isDone ? (
                          <CheckSquare className="mt-0.5 size-5 shrink-0 text-dashboard-success" />
                        ) : (
                          <Circle className="mt-0.5 size-5 shrink-0 text-dashboard-neutral" />
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <p
                            className={cn(
                              "text-sm font-semibold",
                              isDone && "line-through text-muted-foreground",
                            )}
                          >
                            {task.title}
                          </p>
                          {task.description ? (
                            <p className="text-xs text-muted-foreground">{task.description}</p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2">
                            {due ? (
                              <span className="text-[10px] text-muted-foreground">Due: {due}</span>
                            ) : null}
                            <DashboardStatusLabel status={task.priority} className="text-[10px]" />
                            <DashboardStatusLabel
                              status={task.status}
                              label={TASK_STATUS_LABELS[task.status as TaskStatus] || task.status}
                              className="text-[10px]"
                            />
                          </div>
                        </div>
                      </DashboardListRow>
                    );
                  },
                )}
              </div>
            )}
          </DashboardSection>
        </TabsContent>

        <TabsContent value="documents" className="mt-3 space-y-3">
          <DashboardSection
            title="Case Documents"
            description="Files filed or shared by your legal team"
            className="client-matter-detail-card"
            actions={
              <div className="flex flex-wrap gap-2">
                <DashboardButton asChild size="sm" variant="outline">
                  <Link href={`/client/documents?caseId=${caseId}`}>
                    <Upload className="mr-1 size-4" /> Upload via Documents
                  </Link>
                </DashboardButton>
                <DashboardButton asChild size="sm" variant="ghost">
                  <Link href={`/client/documents?caseId=${caseId}`}>View All Documents</Link>
                </DashboardButton>
              </div>
            }
          >
            {documents === undefined ? (
              <DashboardListSkeleton rows={3} />
            ) : documents.length === 0 ? (
              <EmptyState
                title="No documents shared yet"
                description="Documents filed or shared by your legal team will appear here."
                icon={FileText}
              />
            ) : (
              <div className="space-y-2">
                {documents.map(
                  (doc: {
                    _id: string;
                    title?: string;
                    type?: string;
                    mimeType?: string;
                    requiresSignature?: boolean;
                    signatureStatus?: string;
                  }) => (
                    <DashboardListRow key={doc._id} className="client-matter-detail-row">
                      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <FileText className="mt-0.5 size-5 shrink-0 text-dashboard-primary" />
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="break-words text-sm font-semibold">{doc.title}</span>
                              <DashboardStatusLabel status={doc.type} className="text-xs" />
                              {doc.requiresSignature ? (
                                <DashboardStatusLabel
                                  status={doc.signatureStatus}
                                  className="text-xs"
                                />
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {doc.mimeType || "Document"}
                            </p>
                          </div>
                        </div>
                        <DocDownload documentId={doc._id} />
                      </div>
                    </DashboardListRow>
                  ),
                )}
              </div>
            )}
          </DashboardSection>
        </TabsContent>

        <TabsContent value="updates" className="mt-3 space-y-3">
          <DashboardSection
            title="Recent Matter Activity"
            description="Notifications related to this matter"
            className="client-matter-detail-card"
          >
            {matterUpdates.length === 0 ? (
              <EmptyState
                title="No recent matter activity"
                description="Updates related to this matter will appear here when your legal team shares them."
                icon={FolderOpen}
              />
            ) : (
              <ul className="client-matter-detail-activity">
                {matterUpdates.map((notification) => (
                  <li
                    key={String(notification._id ?? notification.id)}
                    className="client-matter-detail-activity-item"
                  >
                    <span className="client-matter-detail-activity-time">
                      {relativeTime(
                        String(notification.createdAt ?? notification._creationTime ?? ""),
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{notificationTitle(notification)}</p>
                      {notificationCategory(notification.type) ? (
                        <p className="text-xs text-muted-foreground">
                          {notificationCategory(notification.type)}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>

          {messages.length > 0 ? (
            <DashboardSection
              title="Recent Discussion"
              description="Secure messages on this matter"
              className="client-matter-detail-card"
              actions={
                <DashboardButton asChild size="sm" variant="outline">
                  <Link href={`/client/messages?caseId=${caseId}`}>Open full chat</Link>
                </DashboardButton>
              }
            >
              <div className="space-y-2">
                {messages
                  .slice(-6)
                  .map(
                    (msg: {
                      _id: string;
                      senderId?: string;
                      content?: string;
                      _creationTime?: number;
                    }) => {
                      const sender = teamMembers.find(
                        (u) => u._id === msg.senderId || u.id === msg.senderId,
                      );
                      return (
                        <DashboardListRow
                          key={msg._id}
                          className="client-matter-detail-row space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">
                              {sender?.name || "Legal Team"}
                            </span>
                            <span>
                              {msg._creationTime
                                ? new Date(msg._creationTime).toLocaleString()
                                : ""}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {msg.content}
                          </p>
                        </DashboardListRow>
                      );
                    },
                  )}
              </div>
            </DashboardSection>
          ) : null}
        </TabsContent>
      </Tabs>
    </PortalPageShell>
  );
}
