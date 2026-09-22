"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckSquare,
  Clock,
  FolderOpen,
  MapPin,
  MessageSquare,
  Scale,
  Search,
} from "lucide-react";
import { useMyClient } from "@/client/queries/clients";
import { useClientCases } from "@/client/queries/cases";
import { useHearings } from "@/client/queries/hearings";
import { useTasks } from "@/client/queries/tasks";
import type { ClientCaseDto, HearingDto, TaskDto } from "@/shared/contracts/domains";
import { CASE_LIST_HERO_CLASS } from "@/shared/contracts/case-ui";
import {
  DashboardButton,
  DashboardListSkeleton,
  DashboardStatusLabel,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { localDateIso } from "@/lib/dashboard-format";
import { cn } from "@/lib/utils";

type ViewFilter = "upcoming" | "past" | "all";

/** Same ICS pattern as Client Home / Matter Details — not a second calendar engine. */
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

function hearingDay(hearing: HearingDto): string {
  return String(hearing.dateGregorian ?? "").slice(0, 10);
}

function isUpcomingHearing(hearing: HearingDto, today: string): boolean {
  return (
    hearing.status === "scheduled" && Boolean(hearingDay(hearing)) && hearingDay(hearing) >= today
  );
}

function compareHearingsAsc(left: HearingDto, right: HearingDto): number {
  const byDate = hearingDay(left).localeCompare(hearingDay(right));
  if (byDate !== 0) return byDate;
  return String(left.time ?? "").localeCompare(String(right.time ?? ""));
}

function compareHearingsDesc(left: HearingDto, right: HearingDto): number {
  return compareHearingsAsc(right, left);
}

function matterOf(cases: ClientCaseDto[], caseId: string | undefined): ClientCaseDto | undefined {
  if (!caseId) return undefined;
  return cases.find((matter) => matter._id === caseId || matter.id === caseId);
}

function matchesSearch(
  hearing: HearingDto,
  matter: ClientCaseDto | undefined,
  query: string,
): boolean {
  if (!query) return true;
  const haystack = [
    matter?.title,
    matter?.caseNumber,
    hearing.court,
    hearing.purpose,
    hearing.dateBs,
    hearing.dateGregorian,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function openClientActions(tasks: TaskDto[] | undefined, caseId?: string): TaskDto[] {
  if (!tasks) return [];
  return tasks.filter(
    (task) =>
      task.clientVisible &&
      !task.archivedAt &&
      !task.parentTaskId &&
      (task.status === "todo" || task.status === "in_progress") &&
      (!caseId || task.caseId === caseId),
  );
}

export default function ClientHearingsPage() {
  const clientRecord = useMyClient();
  const clientId = clientRecord?._id;
  const cases = useClientCases(clientId ? { clientId } : {}) || [];
  const hearingsQuery = useHearings(clientRecord ? {} : "skip");
  const hearings = hearingsQuery ?? [];
  const tasks = useTasks(clientRecord ? {} : "skip");

  const [viewFilter, setViewFilter] = useState<ViewFilter>("upcoming");
  const [matterFilter, setMatterFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const today = localDateIso(new Date());
  const searchQuery = search.trim().toLowerCase();

  const filteredBase = useMemo(() => {
    return hearings.filter((hearing) => {
      if (matterFilter !== "all" && hearing.caseId !== matterFilter) return false;
      const matter = matterOf(cases, hearing.caseId);
      return matchesSearch(hearing, matter, searchQuery);
    });
  }, [hearings, cases, matterFilter, searchQuery]);

  const upcoming = useMemo(
    () =>
      filteredBase.filter((hearing) => isUpcomingHearing(hearing, today)).sort(compareHearingsAsc),
    [filteredBase, today],
  );

  const past = useMemo(
    () =>
      filteredBase
        .filter((hearing) => !isUpcomingHearing(hearing, today))
        .sort(compareHearingsDesc),
    [filteredBase, today],
  );

  const allSorted = useMemo(() => [...upcoming, ...past], [upcoming, past]);

  const displayed = viewFilter === "upcoming" ? upcoming : viewFilter === "past" ? past : allSorted;

  const nextHearing = upcoming[0] ?? null;
  const nextMatter = nextHearing ? matterOf(cases, nextHearing.caseId) : undefined;
  const nextParts = hearingDateParts(nextHearing?.dateGregorian);
  const preparationActions = openClientActions(tasks, nextHearing?.caseId).slice(0, 4);

  const shellProps = {
    portal: "client" as const,
    decorated: true,
    className: "client-hearings",
    heroClassName: cn(CASE_LIST_HERO_CLASS, "client-hearings-hero"),
    eyebrow: "Client Portal",
    title: "Hearing Schedule",
    description: "View your upcoming and past hearings across your legal matters.",
    icon: CalendarDays,
    metricsClassName: "max-sm:hidden",
  };

  if (clientRecord === undefined) {
    return (
      <PortalPageShell {...shellProps} loading loadingLabel="Loading your hearings…">
        <div />
      </PortalPageShell>
    );
  }

  if (clientRecord === null) {
    return (
      <PortalPageShell {...shellProps} showTodayDate>
        <EmptyState
          title="No client profile linked"
          description="Your account is not linked to a client record. Contact the firm to access court schedules."
          icon={CalendarDays}
        />
      </PortalPageShell>
    );
  }

  const emptyTitle =
    searchQuery || matterFilter !== "all"
      ? "No hearings match your filters"
      : viewFilter === "upcoming"
        ? "No upcoming hearings"
        : viewFilter === "past"
          ? "No past hearings"
          : "No hearings found";

  const emptyDescription =
    searchQuery || matterFilter !== "all"
      ? "Try another Matter, clear search, or switch Upcoming / Past / All."
      : viewFilter === "upcoming"
        ? "When the firm schedules a court date on your matter, it will appear here."
        : "Hearing records for your matters will appear here when available.";

  const showPastBelowUpcoming = viewFilter === "upcoming";

  function renderHearingRows(items: HearingDto[]) {
    return (
      <ul className="client-hearings-list">
        {items.map((hearing) => {
          const matter = matterOf(cases, hearing.caseId);
          const parts = hearingDateParts(hearing.dateGregorian);
          return (
            <li key={hearing._id} className="client-hearings-row">
              {parts ? (
                <div className="client-hearings-dateblock client-hearings-dateblock-sm" aria-hidden>
                  <span className="client-hearings-dateblock-day">{parts.day}</span>
                  <span className="client-hearings-dateblock-month">{parts.month}</span>
                </div>
              ) : (
                <div className="client-hearings-dateblock client-hearings-dateblock-sm" aria-hidden>
                  <CalendarDays className="size-4" />
                </div>
              )}
              <div className="client-hearings-row-copy">
                <div className="client-hearings-row-top">
                  <p className="client-hearings-row-title">
                    {matter ? (
                      <Link href={`/client/cases/${matter._id}`}>{matter.title}</Link>
                    ) : (
                      "Hearing"
                    )}
                  </p>
                  <DashboardStatusLabel status={hearing.status} className="text-[10px]" />
                </div>
                <p className="client-hearings-row-meta">
                  {[
                    hearing.dateBs || hearing.dateGregorian,
                    formatHearingTime(hearing.time),
                    hearing.court?.trim() || "Court not specified",
                    hearing.purpose || null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {matter ? (
                <DashboardButton
                  asChild
                  size="sm"
                  variant="ghost"
                  className="client-hearings-row-action"
                >
                  <Link href={`/client/cases/${matter._id}`}>
                    View <ArrowRight className="size-3.5 ml-1" />
                  </Link>
                </DashboardButton>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <PortalPageShell
      {...shellProps}
      showTodayDate
      actions={
        <div className="client-hearings-hero-actions">
          <DashboardButton asChild size="sm" variant="secondary">
            <Link href="/client/cases">
              <FolderOpen className="size-4 mr-1" /> My Matters
            </Link>
          </DashboardButton>
          <DashboardButton asChild size="sm">
            <Link href="/client/messages" aria-label="Message Legal Team">
              <MessageSquare className="size-4 mr-1.5" />
              <span className="client-hearings-msg-full">Message Legal Team</span>
              <span className="client-hearings-msg-short">Message Team</span>
            </Link>
          </DashboardButton>
        </div>
      }
    >
      <div className="client-hearings-toolbar" role="region" aria-label="Hearing filters">
        <div className="client-hearings-views" role="tablist" aria-label="Hearing schedule views">
          {(
            [
              ["upcoming", "Upcoming", upcoming.length],
              ["past", "Past", past.length],
              ["all", "All", filteredBase.length],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={viewFilter === value}
              className={cn(
                "client-hearings-view",
                viewFilter === value && "client-hearings-view-active",
              )}
              onClick={() => setViewFilter(value)}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        <div className="client-hearings-controls">
          <label className="client-hearings-control">
            <span className="sr-only">Filter by Matter</span>
            <select
              value={matterFilter}
              onChange={(event) => setMatterFilter(event.target.value)}
              aria-label="Filter by Matter"
            >
              <option value="all">All Matters</option>
              {cases.map((matter) => (
                <option key={matter._id} value={matter._id}>
                  {matter.title}
                </option>
              ))}
            </select>
          </label>

          <label className="client-hearings-search">
            <Search className="size-3.5" aria-hidden />
            <span className="sr-only">Search hearings</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by matter, court or purpose…"
              aria-label="Search hearings by matter, court or purpose"
            />
          </label>
        </div>
      </div>

      <div className="client-hearings-layout">
        <div className="client-hearings-main">
          {nextHearing && viewFilter !== "past" ? (
            <section className="client-hearings-next" aria-labelledby="client-hearings-next-title">
              <div className="client-hearings-next-head">
                <h2 id="client-hearings-next-title">Next Hearing</h2>
                <DashboardStatusLabel status={nextHearing.status} className="text-xs" />
              </div>
              <div className="client-hearings-next-body">
                {nextParts ? (
                  <div className="client-hearings-dateblock" aria-hidden>
                    <span className="client-hearings-dateblock-day">{nextParts.day}</span>
                    <span className="client-hearings-dateblock-month">{nextParts.month}</span>
                    <span className="client-hearings-dateblock-year">{nextParts.year}</span>
                  </div>
                ) : null}
                <div className="client-hearings-next-copy">
                  <p className="client-hearings-next-title">{nextMatter?.title || "Hearing"}</p>
                  {nextHearing.purpose ? (
                    <p className="client-hearings-next-purpose">{nextHearing.purpose}</p>
                  ) : null}
                  <ul className="client-hearings-meta">
                    {nextHearing.time ? (
                      <li>
                        <Clock className="size-3.5 shrink-0" aria-hidden />
                        <span>{formatHearingTime(nextHearing.time)}</span>
                      </li>
                    ) : null}
                    <li>
                      <MapPin className="size-3.5 shrink-0" aria-hidden />
                      <span>{nextHearing.court?.trim() || "Court not specified"}</span>
                    </li>
                    {nextHearing.dateBs ? (
                      <li>
                        <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                        <span>{nextHearing.dateBs} (BS)</span>
                      </li>
                    ) : null}
                    {nextMatter?.caseNumber ? (
                      <li>
                        <Scale className="size-3.5 shrink-0" aria-hidden />
                        <span>Matter No. {nextMatter.caseNumber}</span>
                      </li>
                    ) : null}
                  </ul>
                  <div className="client-hearings-next-actions">
                    <DashboardButton
                      size="sm"
                      onClick={() =>
                        downloadHearingIcs({
                          id: String(nextHearing._id),
                          title: nextMatter?.title || "Hearing",
                          court: nextHearing.court,
                          purpose: nextHearing.purpose,
                          dateGregorian: nextHearing.dateGregorian,
                          time: nextHearing.time,
                        })
                      }
                    >
                      <CalendarDays className="size-3.5 mr-1" /> Add to Calendar
                    </DashboardButton>
                    {nextMatter ? (
                      <>
                        <DashboardButton asChild size="sm" variant="outline">
                          <Link href={`/client/cases/${nextMatter._id}`}>
                            <FolderOpen className="size-3.5 mr-1" /> View Matter
                          </Link>
                        </DashboardButton>
                        <DashboardButton asChild size="sm" variant="ghost">
                          <Link
                            href={`/client/messages?caseId=${nextMatter._id}`}
                            aria-label="Message Legal Team"
                          >
                            <MessageSquare className="size-3.5 mr-1" />
                            <span className="client-hearings-msg-full">Message Legal Team</span>
                            <span className="client-hearings-msg-short">Message Team</span>
                          </Link>
                        </DashboardButton>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="client-hearings-list-card" aria-label="Hearing list">
            <div className="client-hearings-list-head">
              <h2>
                {viewFilter === "upcoming"
                  ? "Upcoming Hearings"
                  : viewFilter === "past"
                    ? "Past Hearings"
                    : "All Hearings"}
              </h2>
            </div>

            {hearingsQuery === undefined ? (
              <DashboardListSkeleton rows={4} />
            ) : displayed.length === 0 ? (
              <EmptyState title={emptyTitle} description={emptyDescription} icon={CalendarDays} />
            ) : (
              renderHearingRows(displayed)
            )}
          </section>

          {showPastBelowUpcoming && hearingsQuery !== undefined ? (
            <section
              className="client-hearings-list-card client-hearings-past-fold"
              aria-label="Past hearings"
            >
              <div className="client-hearings-list-head">
                <h2>Past Hearings</h2>
              </div>
              {past.length === 0 ? (
                <p className="client-hearings-list-empty">No past hearings for this view.</p>
              ) : (
                renderHearingRows(past)
              )}
            </section>
          ) : null}
        </div>

        <aside className="client-hearings-rail" aria-label="Hearing support">
          <section className="client-hearings-rail-card">
            <div className="client-hearings-rail-head">
              <h2>Your Actions</h2>
              <DashboardButton asChild size="sm" variant="ghost">
                <Link href="/client/checklist">View Checklist →</Link>
              </DashboardButton>
            </div>
            {preparationActions.length === 0 ? (
              <p className="client-hearings-rail-empty">
                No open client actions for{" "}
                {nextMatter ? "this next hearing’s matter" : "your matters"} right now.
              </p>
            ) : (
              <ul className="client-hearings-action-list">
                {preparationActions.map((task) => (
                  <li key={task._id}>
                    <CheckSquare className="size-3.5 shrink-0 text-dashboard-primary" aria-hidden />
                    <span>{task.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="client-hearings-help">
            <h2>Need Assistance?</h2>
            <p>Message your legal team about a hearing or Matter anytime.</p>
            <DashboardButton asChild size="sm">
              <Link
                href={nextMatter ? `/client/messages?caseId=${nextMatter._id}` : "/client/messages"}
              >
                Send a Message →
              </Link>
            </DashboardButton>
          </section>
        </aside>
      </div>
    </PortalPageShell>
  );
}
