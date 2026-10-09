"use client";

import {
  ClientQueryBoundary,
  clientQueryHasData,
  clientQuerySummary,
} from "@/components/dashboard/client-query-boundary";

import { useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  MapPin,
  MessageSquare,
  Scale,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Link } from "@/client/navigation";
import { useClientCasesQuery } from "@/client/queries/cases";
import { useMyClientQuery } from "@/client/queries/clients";
import { useDocumentsQuery } from "@/client/queries/documents";
import { useHearingsQuery } from "@/client/queries/hearings";
import { useNotifications } from "@/client/queries/communication";
import { useMyPendingEnvelopeActionsQuery } from "@/client/queries/envelopes";
import { useTasksQuery } from "@/client/queries/tasks";
import {
  ClientDocumentItem,
  ClientQueryError,
  ClientSoftPanel,
  ClientStatePanel,
  ClientTimelineItem,
  DualDateDisplay,
  DashboardButton,
  DashboardSection,
  DashboardStatusLabel,
  MetricCard,
  PortalPageShell,
  usePortalBranding,
} from "@/components/dashboard";
import { dayPartGreeting, localDateIso, relativeTime } from "@/lib/dashboard-format";

function titleCaseGreeting(date = new Date()): string {
  return dayPartGreeting(date).replace(/\b\w/g, (char) => char.toUpperCase());
}

function firstNameOf(fullName?: string | null): string | undefined {
  const first = fullName?.trim().split(/\s+/)[0];
  return first || undefined;
}

function initialsOf(name?: string | null): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return "—";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatHearingDate(dateGregorian?: string | null): string | undefined {
  if (!dateGregorian) return undefined;
  const date = new Date(`${dateGregorian.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateGregorian;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatHearingTime(time?: string | null): string | undefined {
  if (!time) return undefined;
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return time;
  const minute = match[2];
  const hour24 = Number(match[1]);
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minute} ${suffix}`;
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

function downloadHearingIcs(input: {
  id: string;
  title: string;
  court?: string | null;
  purpose?: string | null;
  dateGregorian?: string | null;
  time?: string | null;
}) {
  const day = input.dateGregorian?.slice(0, 10).replace(/-/g, "");
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

function conciseUpdateTitle(notification: { title?: unknown; body?: unknown }): string {
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
    case "system":
      return "Update";
    default:
      return type || undefined;
  }
}

function conciseUpdateDetail(notification: {
  title?: unknown;
  body?: unknown;
}): string | undefined {
  const title = String(notification.title ?? "").trim();
  const sentence = String(notification.body ?? "")
    .split(/[.!\n]/)[0]
    ?.trim();
  if (!sentence || sentence === title) return undefined;
  return sentence.length > 88 ? `${sentence.slice(0, 85).trimEnd()}…` : sentence;
}

function fileKind(type?: string | null, mimeType?: string | null): "pdf" | "doc" | "file" {
  const value = `${type ?? ""} ${mimeType ?? ""}`.toLowerCase();
  if (value.includes("pdf")) return "pdf";
  if (value.includes("doc") || value.includes("word")) return "doc";
  return "file";
}

export default function ClientDashboard() {
  const clientQuery = useMyClientQuery();
  const clientRecord = clientQuery.isPending ? undefined : (clientQuery.data ?? null);
  const clientId = clientRecord?._id;
  const casesQuery = useClientCasesQuery(clientId ? { clientId } : {});
  const hearingsQuery = useHearingsQuery(clientRecord ? {} : "skip");
  const documentsQuery = useDocumentsQuery(clientRecord ? {} : "skip");
  const tasksQuery = useTasksQuery(clientRecord ? {} : "skip");
  const cases = casesQuery.data;
  const hearings = hearingsQuery.data;
  const documents = documentsQuery.data;
  const tasks = tasksQuery.data;
  const envelopesQuery = useMyPendingEnvelopeActionsQuery();
  const pendingEnvelopeActions = clientQueryHasData(envelopesQuery)
    ? (envelopesQuery.data ?? [])
    : [];
  const notificationsQuery = useNotifications();
  const { heroImageUrl } = usePortalBranding();
  const [heroMediaUsable, setHeroMediaUsable] = useState(Boolean(heroImageUrl));

  const caseList = clientQueryHasData(casesQuery) ? (cases ?? []) : [];
  const hearingList = clientQueryHasData(hearingsQuery) ? (hearings ?? []) : [];
  const documentList = clientQueryHasData(documentsQuery) ? (documents ?? []) : [];
  const taskList = clientQueryHasData(tasksQuery) ? (tasks ?? []) : [];
  const notifications = clientQueryHasData(notificationsQuery)
    ? (notificationsQuery.data ?? [])
    : [];

  const todayIso = localDateIso(new Date());
  const caseIds = new Set(caseList.map((item) => item._id));
  const myHearings = hearingList.filter(
    (item) => caseIds.has(item.caseId) && item.status === "scheduled",
  );
  const upcomingHearings = myHearings
    .filter((item) => item.dateGregorian && item.dateGregorian >= todayIso)
    .sort((a, b) => String(a.dateGregorian).localeCompare(String(b.dateGregorian)));
  const nextHearing = upcomingHearings[0] ?? null;
  const nextHearingMatter = nextHearing
    ? caseList.find((item) => item._id === nextHearing.caseId)
    : undefined;
  const nextHearingParts = hearingDateParts(nextHearing?.dateGregorian);

  const activeCases = caseList.filter((item) => item.status === "active");
  const visibleDocuments = documentList.filter((item) => !item.caseId || caseIds.has(item.caseId));
  const pendingSignatureIds = new Set(
    pendingEnvelopeActions
      .map((item) => String(item.document?._id ?? item.document?.id ?? item.documentId ?? ""))
      .filter(Boolean),
  );
  const pendingDocsCount = pendingEnvelopeActions.length;
  const checklistOpen = taskList.filter(
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
  const actionRequiredCount = pendingDocsCount + (kycNeedsAction ? 1 : 0) + checklistOpen.length;

  const homeMatter =
    (nextHearingMatter && nextHearingMatter.status === "active" ? nextHearingMatter : null) ??
    activeCases[0] ??
    caseList[0] ??
    null;
  const homeMatterHearing = homeMatter
    ? (upcomingHearings.find((hearing) => hearing.caseId === homeMatter._id) ??
      myHearings.find((hearing) => hearing.caseId === homeMatter._id))
    : undefined;
  const homeMatterUpdate = notifications.find((notification) => {
    const related = String(
      notification.caseId ?? notification.relatedId ?? notification.entityId ?? "",
    );
    return homeMatter && related === homeMatter._id;
  });

  const recentDocuments = [...visibleDocuments]
    .sort((a, b) =>
      String(b.updatedAt ?? b.createdAt ?? "").localeCompare(
        String(a.updatedAt ?? a.createdAt ?? ""),
      ),
    )
    .slice(0, 3);
  const recentUpdates = [...notifications]
    .sort((a, b) => {
      const left = Date.parse(String(b.createdAt ?? b._creationTime ?? 0));
      const right = Date.parse(String(a.createdAt ?? a._creationTime ?? 0));
      return left - right;
    })
    .slice(0, 4);

  const firstName = firstNameOf(clientRecord?.fullName);
  const greeting = firstName ? `${titleCaseGreeting()}, ${firstName}` : titleCaseGreeting();

  const kpis = [
    {
      label: "Active Matters",
      loading:
        [casesQuery].some((query) => query.isPending && !clientQueryHasData(query)) &&
        ![casesQuery].some((query) => query.isError && !clientQueryHasData(query)),
      value: clientQueryHasData(casesQuery) ? String(activeCases.length) : "—",
      ready: clientQueryHasData(casesQuery),
      helper: "View Matters →",
      href: "/client/cases",
      icon: FolderOpen,
      tone: "information" as const,
    },
    {
      label: "Upcoming Hearing",
      loading:
        [casesQuery, hearingsQuery].some(
          (query) => query.isPending && !clientQueryHasData(query),
        ) &&
        ![casesQuery, hearingsQuery].some((query) => query.isError && !clientQueryHasData(query)),
      value:
        clientQueryHasData(casesQuery) && clientQueryHasData(hearingsQuery)
          ? String(upcomingHearings.length)
          : "—",
      ready: clientQueryHasData(casesQuery) && clientQueryHasData(hearingsQuery),
      helper: "View Calendar →",
      href: "/client/hearings",
      icon: CalendarDays,
      tone: "success" as const,
    },
    {
      label: "Documents Pending",
      loading:
        [envelopesQuery].some((query) => query.isPending && !clientQueryHasData(query)) &&
        ![envelopesQuery].some((query) => query.isError && !clientQueryHasData(query)),
      value: clientQueryHasData(envelopesQuery) ? String(pendingDocsCount) : "—",
      ready: clientQueryHasData(envelopesQuery),
      helper: "View Documents →",
      href: pendingDocsCount > 0 ? "/client/signatures" : "/client/documents",
      icon: FileText,
      tone: "warning" as const,
    },
    {
      label: "Actions Required",
      loading:
        [casesQuery, tasksQuery, envelopesQuery].some(
          (query) => query.isPending && !clientQueryHasData(query),
        ) &&
        ![casesQuery, tasksQuery, envelopesQuery].some(
          (query) => query.isError && !clientQueryHasData(query),
        ),
      value:
        clientQueryHasData(casesQuery) &&
        clientQueryHasData(tasksQuery) &&
        clientQueryHasData(envelopesQuery)
          ? String(actionRequiredCount)
          : "—",
      ready:
        clientQueryHasData(casesQuery) &&
        clientQueryHasData(tasksQuery) &&
        clientQueryHasData(envelopesQuery),
      helper: "View Tasks →",
      href: "/client/checklist",
      icon: CheckCircle2,
      tone: actionRequiredCount > 0 ? ("danger" as const) : ("success" as const),
    },
  ];

  const quickActions = [
    {
      href: "/client/documents",
      label: "Upload a Document",
      helper: "Share files with your legal team",
      icon: Upload,
      tone: "information" as const,
    },
    {
      href: "/client/booking",
      label: "Request an Appointment",
      helper: "Schedule a consultation",
      icon: CalendarDays,
      tone: "warning" as const,
    },
    {
      href: "/client/messages",
      label: "Send a Message",
      helper: "Contact your lawyer or team",
      icon: MessageSquare,
      tone: "success" as const,
    },
  ];

  const homeLoading = clientQuery.isPending;

  const kpiRow = (
    <section aria-label="Home summary" className="client-home-kpis">
      {kpis.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          aria-label={`${card.label}: ${card.value}. ${card.helper}`}
          className="client-home-kpi-link block min-w-0 rounded-[var(--dashboard-radius-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus"
        >
          <MetricCard
            density="compact"
            label={card.label}
            value={card.value}
            icon={card.icon}
            tone={card.ready ? card.tone : "neutral"}
            helperText={card.helper}
            state={card.loading ? "loading" : "default"}
          />
        </Link>
      ))}
    </section>
  );

  const heroPhoto =
    heroImageUrl && heroMediaUsable ? (
      <figure className="client-home-hero-photo" aria-hidden>
        <img
          src={heroImageUrl}
          alt=""
          onLoad={(event) => {
            if (event.currentTarget.naturalWidth <= 1 || event.currentTarget.naturalHeight <= 1) {
              setHeroMediaUsable(false);
            }
          }}
          onError={() => setHeroMediaUsable(false)}
        />
      </figure>
    ) : null;

  const shellProps = {
    portal: "client" as const,
    decorated: true,
    className: "client-home",
    heroClassName: "client-home-hero",
    eyebrow: "Client Portal",
    icon: Scale,
    actions: heroPhoto,
    heroChildren: clientRecord && !clientQuery.isError ? kpiRow : undefined,
  };

  if (homeLoading) {
    return (
      <PortalPageShell
        {...shellProps}
        title="Client Portal"
        description="Here's what's happening with your legal matters."
      >
        <ClientStatePanel
          state="loading"
          title="Preparing your portal"
          description="Your matters and updates will appear here in a moment."
          icon={Scale}
        />
      </PortalPageShell>
    );
  }

  if (clientQuery.isError) {
    return (
      <PortalPageShell
        {...shellProps}
        title="Client Portal"
        description="Here's what's happening with your legal matters."
      >
        <ClientQueryError
          title="Unable to load your client profile"
          onRetry={() => {
            void clientQuery.refetch();
          }}
          retrying={clientQuery.isFetching}
        />
      </PortalPageShell>
    );
  }

  if (clientRecord === null) {
    return (
      <PortalPageShell
        {...shellProps}
        title="Welcome"
        description="Your client portal account is active."
      >
        <ClientStatePanel
          state="empty"
          title="No client profile linked"
          description="No client profile is linked to this account yet. Please contact the firm to complete setup."
          icon={ShieldCheck}
        />
      </PortalPageShell>
    );
  }

  const advocateName = homeMatter?.advocate?.name || undefined;
  const lastUpdateTitle = homeMatterUpdate ? conciseUpdateTitle(homeMatterUpdate) : undefined;
  const lastUpdateWhen = homeMatterUpdate
    ? relativeTime(homeMatterUpdate.createdAt ?? homeMatterUpdate._creationTime ?? null)
    : undefined;

  return (
    <PortalPageShell
      {...shellProps}
      title={greeting}
      description="Here's what's happening with your legal matters."
    >
      <div className="client-home-body">
        <ClientQueryBoundary
          query={tasksQuery}
          title="Unable to load action items"
          loadingLabel="Loading action items..."
        >
          {null}
        </ClientQueryBoundary>
        <ClientQueryBoundary
          query={envelopesQuery}
          title="Unable to load signing requests"
          loadingLabel="Loading signing requests..."
        >
          {null}
        </ClientQueryBoundary>
        <div className="client-home-left">
          <DashboardSection
            className="client-home-matters"
            density="compact"
            title="Your Matters"
            actions={
              <DashboardButton asChild variant="ghost" size="sm">
                <Link href="/client/cases">
                  View All <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </DashboardButton>
            }
          >
            <ClientQueryBoundary
              query={casesQuery}
              title="Unable to load your matters"
              loadingLabel="Loading your matters…"
            >
              {homeMatter ? (
                <article className="client-home-matter">
                  <div className="client-home-matter-top">
                    <span className="client-home-matter-icon">
                      <Scale className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="client-home-matter-title">{homeMatter.title}</h3>
                        <DashboardStatusLabel status={homeMatter.status} />
                      </div>
                      <p className="client-home-matter-meta">
                        {[
                          homeMatter.practiceArea || undefined,
                          homeMatter.caseNumber ? `Case No. ${homeMatter.caseNumber}` : undefined,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  <dl className="client-home-matter-facts">
                    <div className="client-home-matter-fact">
                      <span className="client-home-matter-avatar" aria-hidden>
                        {initialsOf(advocateName)}
                      </span>
                      <div className="min-w-0">
                        <dt>Lead Advocate</dt>
                        <dd>{advocateName || "Not assigned"}</dd>
                      </div>
                    </div>
                    <div className="client-home-matter-fact">
                      <span className="client-home-matter-fact-icon" aria-hidden>
                        <CalendarDays className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <dt>Next Hearing</dt>
                        <dd>
                          {homeMatterHearing?.dateGregorian ? (
                            <DualDateDisplay
                              isoDate={`${homeMatterHearing.dateGregorian.slice(0, 10)}T00:00:00`}
                              alwaysDual
                            />
                          ) : hearingsQuery.isError ? (
                            "Hearing information unavailable"
                          ) : (
                            clientQuerySummary(
                              hearingsQuery,
                              "None scheduled",
                              "Loading hearing information…",
                              "Hearing information unavailable",
                            )
                          )}
                        </dd>
                      </div>
                    </div>
                    <div className="client-home-matter-fact">
                      <span className="client-home-matter-fact-icon" aria-hidden>
                        <FileText className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <dt>Last Update</dt>
                        <dd>
                          {lastUpdateTitle ? (
                            <>
                              {lastUpdateTitle}
                              {lastUpdateWhen ? (
                                <span className="mt-0.5 block font-medium text-muted-foreground">
                                  {lastUpdateWhen}
                                </span>
                              ) : null}
                            </>
                          ) : notificationsQuery.isError ? (
                            "Updates unavailable"
                          ) : (
                            clientQuerySummary(
                              notificationsQuery,
                              "No recent update",
                              "Loading updates…",
                              "Updates unavailable",
                            )
                          )}
                        </dd>
                      </div>
                    </div>
                  </dl>
                  <div className="client-home-matter-actions">
                    <DashboardButton asChild size="sm">
                      <Link href={`/client/cases/${homeMatter._id}`}>
                        View Matter Details <ArrowRight className="size-3.5" aria-hidden />
                      </Link>
                    </DashboardButton>
                    <DashboardButton asChild size="sm" variant="secondary">
                      <Link href="/client/messages">Message Your Legal Team</Link>
                    </DashboardButton>
                  </div>
                </article>
              ) : (
                <ClientStatePanel
                  state="empty"
                  title="No matters yet"
                  description="When the firm opens a matter for you, it will appear here."
                  icon={FolderOpen}
                />
              )}
            </ClientQueryBoundary>
          </DashboardSection>

          <div className="client-home-lower">
            <DashboardSection
              className="client-home-updates"
              density="compact"
              title="Recent Updates"
              actions={
                <DashboardButton asChild variant="ghost" size="sm">
                  <Link href="/client/notifications">
                    View All <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </DashboardButton>
              }
            >
              <ClientQueryBoundary
                query={notificationsQuery}
                title="Unable to load recent updates"
                loadingLabel="Loading recent updates…"
              >
                {recentUpdates.length === 0 ? (
                  <ClientStatePanel
                    state="empty"
                    title="No recent updates"
                    description="Updates about your matters will appear here."
                    icon={FileText}
                  />
                ) : (
                  <div>
                    {recentUpdates.map((notification, index) => (
                      <ClientTimelineItem
                        key={notification._id ?? notification.id ?? `update-${index}`}
                        title={conciseUpdateTitle(notification)}
                        date={relativeTime(
                          notification.createdAt ?? notification._creationTime ?? null,
                        )}
                        category={
                          notificationCategory(notification.type) ??
                          conciseUpdateDetail(notification)
                        }
                      />
                    ))}
                  </div>
                )}
              </ClientQueryBoundary>
            </DashboardSection>

            <DashboardSection
              className="client-home-documents"
              density="compact"
              title="Your Documents"
              actions={
                <DashboardButton asChild variant="ghost" size="sm">
                  <Link href="/client/documents">
                    View All <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </DashboardButton>
              }
            >
              <ClientQueryBoundary
                query={documentsQuery}
                title="Unable to load documents"
                loadingLabel="Loading documents…"
              >
                <ClientQueryBoundary
                  query={casesQuery}
                  title="Unable to load document matters"
                  loadingLabel="Loading document matters..."
                >
                  {recentDocuments.length === 0 ? (
                    <ClientStatePanel
                      state="empty"
                      title="No documents yet"
                      description="Documents shared with you will appear here."
                      icon={FileText}
                    />
                  ) : (
                    <div>
                      {recentDocuments.map((doc) => {
                        const pendingSignature = pendingSignatureIds.has(doc._id);
                        const kind = fileKind(doc.type, doc.mimeType);
                        return (
                          <ClientDocumentItem
                            key={doc._id}
                            data-file-kind={kind}
                            name={doc.title}
                            fileType={kind === "file" ? undefined : kind.toUpperCase()}
                            date={`Added ${relativeTime(doc.updatedAt ?? doc.createdAt ?? null)}`}
                            status={pendingSignature ? "Awaiting signature" : undefined}
                            statusTone={pendingSignature ? "warning" : "neutral"}
                            icon={<FileText className="size-4" aria-hidden />}
                            action={
                              <DashboardButton asChild size="sm" variant="ghost">
                                <Link href="/client/documents">View</Link>
                              </DashboardButton>
                            }
                          />
                        );
                      })}
                    </div>
                  )}
                </ClientQueryBoundary>
              </ClientQueryBoundary>
            </DashboardSection>
          </div>
        </div>

        <div className="client-home-right">
          <DashboardSection
            className="client-home-hearing"
            density="compact"
            title="Upcoming Hearing"
            actions={
              <DashboardButton asChild variant="ghost" size="sm">
                <Link href="/client/hearings">
                  View All <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </DashboardButton>
            }
          >
            <ClientQueryBoundary
              query={hearingsQuery}
              title="Unable to load upcoming hearings"
              loadingLabel="Loading upcoming hearings…"
            >
              <ClientQueryBoundary
                query={casesQuery}
                title="Unable to load hearing matters"
                loadingLabel="Loading hearing matters…"
              >
                {nextHearing ? (
                  <article className="client-home-hearing-card">
                    <div className="client-home-hearing-date">
                      {nextHearingParts ? (
                        <>
                          <span className="client-home-hearing-day">{nextHearingParts.day}</span>
                          <span className="client-home-hearing-month">
                            {nextHearingParts.month}
                          </span>
                          <span className="client-home-hearing-year">{nextHearingParts.year}</span>
                        </>
                      ) : (
                        (formatHearingDate(nextHearing.dateGregorian) ?? nextHearing.dateGregorian)
                      )}
                    </div>
                    <div className="client-home-hearing-lines">
                      {nextHearing.court ? (
                        <p className="client-home-hearing-line">
                          <Building2 aria-hidden />
                          <span>{nextHearing.court}</span>
                        </p>
                      ) : null}
                      {nextHearing.time ? (
                        <p className="client-home-hearing-line">
                          <Clock aria-hidden />
                          <span>{formatHearingTime(nextHearing.time) ?? nextHearing.time}</span>
                        </p>
                      ) : null}
                      {nextHearing.purpose ? (
                        <p className="client-home-hearing-line">
                          <MapPin aria-hidden />
                          <span>{nextHearing.purpose}</span>
                        </p>
                      ) : null}
                      {nextHearingMatter?.title ? (
                        <p className="client-home-hearing-line">
                          <FolderOpen aria-hidden />
                          <span>{nextHearingMatter.title}</span>
                        </p>
                      ) : null}
                      <div>
                        <DashboardButton
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            downloadHearingIcs({
                              id: nextHearing._id,
                              title: nextHearingMatter?.title ?? "Hearing",
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
                  </article>
                ) : (
                  <ClientStatePanel
                    state="empty"
                    title="No upcoming hearing"
                    description="Scheduled court appearances for your matters will appear here."
                    icon={Scale}
                  />
                )}
              </ClientQueryBoundary>
            </ClientQueryBoundary>
          </DashboardSection>

          <DashboardSection className="client-home-actions" density="compact" title="Quick Actions">
            <div className="client-home-action-list">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href} className="client-home-action-row">
                  <span className="client-home-action-icon" data-tone={action.tone}>
                    <action.icon className="size-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="client-home-action-label">{action.label}</span>
                    <span className="client-home-action-helper">{action.helper}</span>
                  </span>
                </Link>
              ))}
            </div>
          </DashboardSection>

          <ClientSoftPanel
            className="client-home-help"
            data-slot="client-home-help"
            tone="information"
          >
            <div className="client-home-help-copy">
              <h2 className="font-sans text-base font-semibold text-foreground">
                We&apos;re Here for You
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Have questions about your matter? Reach out to your legal team anytime.
              </p>
              <DashboardButton asChild size="sm" className="mt-3">
                <Link href="/client/messages">
                  Send a Message <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </DashboardButton>
            </div>
            <Scale className="client-home-help-mark" aria-hidden />
          </ClientSoftPanel>
        </div>
      </div>
    </PortalPageShell>
  );
}
