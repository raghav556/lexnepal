"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  FolderOpen,
  MessageSquare,
  Pause,
  Scale,
  Search,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useMyClient, useMyTeam } from "@/client/queries/clients";
import { useClientCasesQuery } from "@/client/queries/cases";
import { caseQueryFailureKind } from "@/client/queries/case-query-error";
import { useNotifications } from "@/client/queries/communication";
import { useHearings } from "@/client/queries/hearings";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import { Input } from "@/components/ui/input.tsx";
import { isLifecycleClosed } from "@/shared/contracts/case-status";
import {
  CASE_LIFECYCLE_LABELS,
  CASE_LIST_HERO_CLASS,
  matchesCaseStatusFilter,
  toLifecycleStatus,
  type CaseStatusFilter,
} from "@/shared/contracts/case-ui";
import { CaseQueryState } from "@/components/cases/case-query-state";
import type { ClientCaseDto, HearingDto } from "@/shared/contracts/domains";
import {
  ClientFilterBar,
  ClientHearingSummary,
  ClientSoftPanel,
  ClientStatePanel,
  ClientTimelineItem,
  DashboardButton,
  DashboardStatusLabel,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  DualDateDisplay,
  PortalPageShell,
  usePortalBranding,
} from "@/components/dashboard";
import { initialsOf, localDateIso, relativeTime } from "@/lib/dashboard-format";
import { cn } from "@/lib/utils";

type ClientNotification = {
  id?: string;
  _id?: string;
  title?: unknown;
  body?: unknown;
  type?: string | null;
  createdAt?: string;
  _creationTime?: string;
  relatedId?: string | null;
  link?: string | null;
};

const STATUS_FILTERS = ["all", "active", "on_hold", "closed"] as const;

function clientCourtLabel(court: string | null | undefined): string {
  const value = court?.trim();
  return value ? value : "Not specified";
}

function advocateName(matter: ClientCaseDto): string {
  return matter.advocate?.name?.trim() ? matter.advocate.name : "Unassigned";
}

function clientFacingStatusLabel(status: string): string {
  const lifecycle = toLifecycleStatus(status);
  if (lifecycle === "active") return "In Progress";
  if (lifecycle === "closed") return "Completed";
  return CASE_LIFECYCLE_LABELS[lifecycle];
}

function filterChipLabel(status: (typeof STATUS_FILTERS)[number]): string {
  if (status === "all") return "All";
  if (status === "active") return "In Progress";
  if (status === "closed") return "Completed";
  return CASE_LIFECYCLE_LABELS[status];
}

function todayIso(): string {
  return localDateIso(new Date());
}

function upcomingScheduledHearings(
  hearings: HearingDto[],
  matterId: string,
  today: string,
): HearingDto[] {
  return hearings
    .filter(
      (hearing) =>
        hearing.caseId === matterId &&
        hearing.status === "scheduled" &&
        Boolean(hearing.dateGregorian) &&
        String(hearing.dateGregorian).slice(0, 10) >= today,
    )
    .sort((left, right) =>
      String(left.dateGregorian)
        .slice(0, 10)
        .localeCompare(String(right.dateGregorian).slice(0, 10)),
    );
}

function nearestUpcomingHearing(
  hearings: HearingDto[],
  matterIds: Set<string>,
  today: string,
): HearingDto | null {
  const upcoming = hearings
    .filter(
      (hearing) =>
        matterIds.has(String(hearing.caseId)) &&
        hearing.status === "scheduled" &&
        Boolean(hearing.dateGregorian) &&
        String(hearing.dateGregorian).slice(0, 10) >= today,
    )
    .sort((left, right) =>
      String(left.dateGregorian)
        .slice(0, 10)
        .localeCompare(String(right.dateGregorian).slice(0, 10)),
    );
  return upcoming[0] ?? null;
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

function notificationMatterId(
  notification: ClientNotification,
  matterIds: Set<string>,
): string | null {
  const related = String(notification.relatedId ?? "").trim();
  if (related && matterIds.has(related)) return related;
  const link = String(notification.link ?? "");
  for (const matterId of matterIds) {
    if (link.includes(`/client/cases/${matterId}`)) return matterId;
  }
  return null;
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

function notificationTimestamp(notification: ClientNotification): string {
  return String(notification.createdAt ?? notification._creationTime ?? "");
}

export default function ClientCasesPage() {
  const currentUser = useCurrentUser();
  const clientRecord = useMyClient();
  const clientId = clientRecord?._id;
  const casesQuery = useClientCasesQuery(clientId ? { clientId } : {});
  const cases = casesQuery.data ?? [];
  const hearings = useHearings(clientRecord ? {} : "skip") || [];
  const team = useMyTeam();
  const notificationsQuery = useNotifications();
  const notifications = (notificationsQuery.data ?? []) as ClientNotification[];
  const { heroImageUrl } = usePortalBranding();
  const [heroMediaUsable, setHeroMediaUsable] = useState(Boolean(heroImageUrl));

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "table">("list");

  const matterTypes = useMemo(() => {
    const unique = new Set<string>();
    for (const matter of cases) {
      const type = matter.practiceArea?.trim();
      if (type) unique.add(type);
    }
    return [...unique].sort((left, right) => left.localeCompare(right));
  }, [cases]);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchesSearch =
        search === "" ||
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.caseNumber?.toLowerCase().includes(search.toLowerCase()) ||
        c.practiceArea?.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "" || c.practiceArea === typeFilter;
      return matchesSearch && matchesType && matchesCaseStatusFilter(c.status, statusFilter);
    });
  }, [cases, search, statusFilter, typeFilter]);

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, prevPage, resetPagination } =
    usePagination({
      items: filteredCases,
      itemsPerPage: 8,
    });

  const applySearch = (value: string) => {
    setSearch(value);
    resetPagination();
  };

  const applyStatusFilter = (value: CaseStatusFilter) => {
    setStatusFilter(value);
    resetPagination();
  };

  const applyTypeFilter = (value: string) => {
    setTypeFilter(value);
    resetPagination();
  };

  const activeCount = cases.filter((c) => c.status === "active").length;
  const closedCount = cases.filter((c) => isLifecycleClosed(c.status)).length;
  const onHoldCount = cases.filter((c) => c.status === "on_hold").length;
  const today = todayIso();
  const matterIds = useMemo(() => new Set(cases.map((matter) => matter._id)), [cases]);
  const nextImportantHearing = nearestUpcomingHearing(hearings, matterIds, today);
  const nextImportantMatter = nextImportantHearing
    ? cases.find((matter) => matter._id === nextImportantHearing.caseId)
    : undefined;

  const avatarByAdvocateId = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of team ?? []) {
      const photo = member.avatar?.trim();
      if (!photo) continue;
      if (member.id) map.set(member.id, photo);
      if (member._id) map.set(member._id, photo);
    }
    return map;
  }, [team]);

  const latestUpdateByMatter = useMemo(() => {
    const map = new Map<string, ClientNotification>();
    for (const notification of notifications) {
      const matterId = notificationMatterId(notification, matterIds);
      if (!matterId) continue;
      const current = map.get(matterId);
      if (!current || notificationTimestamp(notification) > notificationTimestamp(current)) {
        map.set(matterId, notification);
      }
    }
    return map;
  }, [notifications, matterIds]);

  const recentActivity = useMemo(() => {
    return notifications
      .map((notification) => {
        const matterId = notificationMatterId(notification, matterIds);
        if (!matterId) return null;
        const matter = cases.find((item) => item._id === matterId);
        return { notification, matter };
      })
      .filter(
        (item): item is { notification: ClientNotification; matter: ClientCaseDto | undefined } =>
          Boolean(item),
      )
      .sort((left, right) =>
        notificationTimestamp(right.notification).localeCompare(
          notificationTimestamp(left.notification),
        ),
      )
      .slice(0, 5);
  }, [notifications, matterIds, cases]);

  const heroPhoto =
    heroImageUrl && heroMediaUsable ? (
      <figure className="client-matters-hero-photo" aria-hidden>
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
    decorated: true,
    className: "client-matters",
    heroClassName: `${CASE_LIST_HERO_CLASS} client-matters-hero`,
    eyebrow: "Client Portal",
    title: "My Matters",
    description: "Track your legal matters and upcoming important dates.",
    icon: FolderOpen,
    actions: heroPhoto,
  };

  if (currentUser === undefined || clientRecord === undefined) {
    return (
      <PortalPageShell
        portal="client"
        {...shellProps}
        metricsClassName="max-sm:hidden"
        loading
        loadingLabel="Loading your legal matters…"
      >
        <div />
      </PortalPageShell>
    );
  }

  if (clientRecord === null) {
    return (
      <PortalPageShell
        portal="client"
        {...shellProps}
        metricsClassName="max-sm:hidden"
        showTodayDate
      >
        <ClientStatePanel
          state="empty"
          title="No client profile linked"
          description="Your portal account is not linked to a firm client record yet. Ask the firm to grant portal access from their Clients list."
          icon={FolderOpen}
        />
      </PortalPageShell>
    );
  }

  if (casesQuery.isError) {
    return (
      <CaseQueryState
        portal="client"
        kind={caseQueryFailureKind(casesQuery.error)}
        scope="list"
        onRetry={() => {
          void casesQuery.refetch();
        }}
      />
    );
  }

  if (casesQuery.isPending) {
    return (
      <PortalPageShell
        portal="client"
        {...shellProps}
        metricsClassName="max-sm:hidden"
        loading
        loadingLabel="Loading your legal matters…"
      >
        <div />
      </PortalPageShell>
    );
  }

  const summaryItems = [
    { key: "all" as const, label: "All Matters", value: cases.length, icon: FolderOpen },
    { key: "active" as const, label: "In Progress", value: activeCount, icon: Clock },
    {
      key: "on_hold" as const,
      label: CASE_LIFECYCLE_LABELS.on_hold,
      value: onHoldCount,
      icon: Pause,
    },
    { key: "closed" as const, label: "Completed", value: closedCount, icon: CheckCircle2 },
  ];

  const nextHearingParts = hearingDateParts(nextImportantHearing?.dateGregorian);

  return (
    <PortalPageShell portal="client" {...shellProps} metricsClassName="max-sm:hidden" showTodayDate>
      <section className="client-matters-summary" aria-label="Matter summary">
        {summaryItems.map((item) => {
          const selected = statusFilter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              className={cn("client-matters-summary-tile", selected && "is-selected")}
              aria-pressed={selected}
              aria-label={`${item.label}, ${item.value}`}
              onClick={() => applyStatusFilter(item.key)}
            >
              <item.icon className="client-matters-summary-icon" aria-hidden />
              <span className="client-matters-summary-copy">
                <span className="client-matters-summary-label">{item.label}</span>
                <span className="client-matters-summary-value">{item.value}</span>
              </span>
            </button>
          );
        })}
      </section>

      <ClientFilterBar className="client-matters-toolbar">
        <div className="client-matters-search">
          <label htmlFor="client-matters-search" className="sr-only">
            Search matters
          </label>
          <Search className="client-matters-search-icon" aria-hidden />
          <Input
            id="client-matters-search"
            className="client-matters-search-input"
            placeholder="Search matters..."
            value={search}
            onChange={(event) => applySearch(event.target.value)}
          />
        </div>
        <div className="client-matters-controls">
          <label className="client-matters-field">
            <span className="client-matters-field-label">Matter Type</span>
            <select
              value={typeFilter}
              onChange={(event) => applyTypeFilter(event.target.value)}
              aria-label="Matter Type"
            >
              <option value="">All matter types</option>
              {matterTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="client-matters-field">
            <span className="client-matters-field-label">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => applyStatusFilter(event.target.value as CaseStatusFilter)}
              aria-label="Status"
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {filterChipLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <div className="client-matters-view" role="tablist" aria-label="Matter view">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "list"}
              className={cn(viewMode === "list" && "is-selected")}
              onClick={() => setViewMode("list")}
            >
              Cards
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "table"}
              className={cn(viewMode === "table" && "is-selected")}
              onClick={() => setViewMode("table")}
            >
              Table
            </button>
          </div>
        </div>
      </ClientFilterBar>

      <div className="client-matters-body">
        <div className="client-matters-main">
          <h2 className="sr-only">Your matters</h2>
          {filteredCases.length === 0 ? (
            <ClientStatePanel
              state="empty"
              title={cases.length === 0 ? "No matters yet" : "No matching matters"}
              description={
                search || statusFilter !== "all" || typeFilter
                  ? "No matters match your filter criteria."
                  : "Your matters will appear here once your advocate creates them."
              }
              icon={FolderOpen}
            />
          ) : viewMode === "table" ? (
            <div className="client-matters-table-wrap">
              <DashboardTable>
                <DashboardTableHead>
                  <DashboardTableRow>
                    <DashboardTableHeaderCell>Matter Number</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Matter / Practice Area</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Advocate</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Court</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Status</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className="text-right">
                      Action
                    </DashboardTableHeaderCell>
                  </DashboardTableRow>
                </DashboardTableHead>
                <DashboardTableBody>
                  {paginatedItems.map((c) => (
                    <DashboardTableRow key={c._id} striped>
                      <DashboardTableCell className="font-mono text-xs font-semibold text-muted-foreground">
                        {c.caseNumber}
                      </DashboardTableCell>
                      <DashboardTableCell>
                        <p className="font-semibold text-foreground">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.practiceArea}</p>
                      </DashboardTableCell>
                      <DashboardTableCell className="text-xs">{advocateName(c)}</DashboardTableCell>
                      <DashboardTableCell className="text-xs text-muted-foreground">
                        {clientCourtLabel(c.court)}
                      </DashboardTableCell>
                      <DashboardTableCell>
                        <DashboardStatusLabel
                          status={c.status}
                          label={clientFacingStatusLabel(c.status)}
                          className="text-xs"
                        />
                      </DashboardTableCell>
                      <DashboardTableCell className="text-right">
                        <DashboardButton asChild size="sm" variant="ghost">
                          <Link href={`/client/cases/${c._id}`}>
                            View Matter Details <ArrowRight className="ml-1 size-3.5" aria-hidden />
                          </Link>
                        </DashboardButton>
                      </DashboardTableCell>
                    </DashboardTableRow>
                  ))}
                </DashboardTableBody>
              </DashboardTable>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                onNextPage={nextPage}
                onPrevPage={prevPage}
              />
            </div>
          ) : (
            <div className="client-matters-cards">
              {paginatedItems.map((c) => {
                const nextHearing = upcomingScheduledHearings(hearings, c._id, today)[0];
                const latestUpdate = latestUpdateByMatter.get(c._id);
                const portrait = avatarByAdvocateId.get(c.advocate?.id ?? c.assignedLawyerId);
                const name = advocateName(c);

                return (
                  <article key={c._id} className="client-matters-card">
                    <div className="client-matters-card-top">
                      <span className="client-matters-card-icon" aria-hidden>
                        <Scale className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="client-matters-card-title">{c.title}</h3>
                          <DashboardStatusLabel
                            status={c.status}
                            label={clientFacingStatusLabel(c.status)}
                          />
                        </div>
                        <p className="client-matters-card-meta">
                          {[
                            c.practiceArea || undefined,
                            c.caseNumber ? `Matter Number ${c.caseNumber}` : undefined,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                    <dl className="client-matters-card-facts">
                      <div className="client-matters-card-fact">
                        {portrait ? (
                          <img src={portrait} alt="" className="client-matters-avatar-image" />
                        ) : (
                          <span className="client-matters-avatar" aria-hidden>
                            {name === "Unassigned" ? (
                              <UserRound className="size-3.5" />
                            ) : (
                              initialsOf(name)
                            )}
                          </span>
                        )}
                        <div className="min-w-0">
                          <dt>Lead Advocate</dt>
                          <dd>{name}</dd>
                        </div>
                      </div>
                      <div className="client-matters-card-fact">
                        <span className="client-matters-fact-icon" aria-hidden>
                          <CalendarDays className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <dt>Next Hearing</dt>
                          <dd>
                            {nextHearing ? (
                              <span className="client-matters-inline-fact">
                                <DualDateDisplay
                                  isoDate={`${String(nextHearing.dateGregorian).slice(0, 10)}T00:00:00`}
                                  alwaysDual
                                />
                                {formatHearingTime(nextHearing.time)
                                  ? ` · ${formatHearingTime(nextHearing.time)}`
                                  : ""}
                              </span>
                            ) : (
                              "No upcoming hearing"
                            )}
                          </dd>
                        </div>
                      </div>
                      <div className="client-matters-card-fact">
                        <span className="client-matters-fact-icon" aria-hidden>
                          <FolderOpen className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <dt>Last Update</dt>
                          <dd>
                            {latestUpdate ? (
                              <span className="client-matters-inline-fact">
                                {notificationTitle(latestUpdate)}
                                {notificationTimestamp(latestUpdate) ? (
                                  <span className="client-matters-update-time">
                                    {relativeTime(notificationTimestamp(latestUpdate))}
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              "No recent update"
                            )}
                          </dd>
                        </div>
                      </div>
                    </dl>
                    <div className="client-matters-card-actions">
                      <DashboardButton asChild size="sm">
                        <Link href={`/client/cases/${c._id}`}>
                          View Matter Details <ArrowRight className="size-3.5" aria-hidden />
                        </Link>
                      </DashboardButton>
                      <DashboardButton asChild size="sm" variant="secondary">
                        <Link href={`/client/messages?caseId=${c._id}`}>
                          <MessageSquare className="size-3.5" aria-hidden /> Message Legal Team
                        </Link>
                      </DashboardButton>
                    </div>
                  </article>
                );
              })}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                onNextPage={nextPage}
                onPrevPage={prevPage}
              />
            </div>
          )}
        </div>

        <aside className="client-matters-rail" aria-label="Matter context">
          <section className="client-matters-rail-card" aria-labelledby="client-matters-next-date">
            <div className="client-matters-rail-head">
              <h2 id="client-matters-next-date">Next Important Date</h2>
              <DashboardButton asChild size="sm" variant="ghost">
                <Link href="/client/hearings">View Calendar</Link>
              </DashboardButton>
            </div>
            {nextImportantHearing && nextHearingParts ? (
              <ClientHearingSummary
                className="client-matters-hearing"
                date={
                  <>
                    <span className="block text-lg font-semibold">{nextHearingParts.day}</span>
                    <span className="block text-[11px] tracking-wide text-muted-foreground">
                      {nextHearingParts.month} {nextHearingParts.year}
                    </span>
                  </>
                }
                time={formatHearingTime(nextImportantHearing.time)}
                matter={nextImportantMatter?.title ?? "Your matter"}
                court={nextImportantHearing.court || undefined}
                purpose={nextImportantHearing.purpose || undefined}
                action={
                  nextImportantMatter ? (
                    <DashboardButton asChild size="sm" variant="ghost">
                      <Link href={`/client/cases/${nextImportantMatter._id}`}>View Matter</Link>
                    </DashboardButton>
                  ) : null
                }
              />
            ) : (
              <ClientStatePanel
                state="empty"
                title="No upcoming hearing"
                description="Scheduled court appearances for your matters will appear here."
                icon={CalendarDays}
              />
            )}
          </section>

          <section className="client-matters-rail-card" aria-labelledby="client-matters-activity">
            <h2 id="client-matters-activity">Recent Matter Activity</h2>
            {recentActivity.length === 0 ? (
              <ClientStatePanel
                state="empty"
                title="No recent matter activity"
                description="Updates that the firm links to your matters will appear here."
                icon={FolderOpen}
              />
            ) : (
              <div className="client-matters-activity">
                {recentActivity.map(({ notification, matter }, index) => (
                  <ClientTimelineItem
                    key={String(notification._id ?? notification.id ?? `activity-${index}`)}
                    title={notificationTitle(notification)}
                    date={relativeTime(notificationTimestamp(notification))}
                    category={notificationCategory(notification.type)}
                    matter={matter?.title}
                  />
                ))}
              </div>
            )}
          </section>

          <ClientSoftPanel className="client-matters-help" tone="information">
            <div className="client-matters-help-copy">
              <h2>Need help with a matter?</h2>
              <p>
                If you want clarification on a matter or an upcoming date, message your legal team
                from this page.
              </p>
              <DashboardButton asChild size="sm">
                <Link href="/client/messages">
                  Message Legal Team <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </DashboardButton>
            </div>
            <Scale className="client-matters-help-mark" aria-hidden />
          </ClientSoftPanel>
        </aside>
      </div>
    </PortalPageShell>
  );
}
