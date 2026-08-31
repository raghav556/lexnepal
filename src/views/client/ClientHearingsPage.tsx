"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Download, Scale, Clock, CheckCircle2 } from "lucide-react";
import { useMyClient } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";
import { useHearings } from "@/client/queries/hearings";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import {
  DashboardButton,
  DashboardFilterBar,
  DashboardListRow,
  DashboardListSkeleton,
  DashboardSection,
  DashboardStatusLabel,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { DASHBOARD_METRIC_TONES } from "@/lib/dashboard-semantics";

function toIcsDate(dateGregorian?: string, time?: string) {
  if (!dateGregorian) return null;
  const day = dateGregorian.slice(0, 10).replace(/-/g, "");
  if (time && /^\d{1,2}:\d{2}/.test(time)) {
    const [hh, mm] = time.split(":");
    return `${day}T${hh.padStart(2, "0")}${mm.padStart(2, "0")}00`;
  }
  return day;
}

function downloadHearingsIcs(hearings: any[], cases: any[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Srimar Law//Client Portal//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const h of hearings) {
    const start = toIcsDate(h.dateGregorian, h.time);
    if (!start) continue;
    const matter = cases.find((c: any) => c._id === h.caseId);
    const summary = `${matter?.title || "Hearing"} — ${h.court || "Court"}`;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${h._id || h.id}@srimar.law`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
    if (start.includes("T")) {
      lines.push(`DTSTART;TZID=Asia/Kathmandu:${start}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${start}`);
    }
    lines.push(`SUMMARY:${summary.replace(/[,;]/g, " ")}`);
    if (h.purpose) lines.push(`DESCRIPTION:${String(h.purpose).replace(/[,;]/g, " ")}`);
    if (h.court) lines.push(`LOCATION:${String(h.court).replace(/[,;]/g, " ")}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "srimar-hearings.ics";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ClientHearingsPage() {
  const clientRecord = useMyClient();
  const clientId = clientRecord?._id;
  const cases = useCases(clientId ? { clientId } : {}) || [];
  const hearings = useHearings({}) || [];

  const [tabFilter, setTabFilter] = useState<"scheduled" | "past" | "all">("scheduled");
  const [viewMode, setViewMode] = useState<"list" | "table">("list");

  const sortedHearings = useMemo(() => {
    return [...hearings].sort((a: any, b: any) =>
      String(a.dateGregorian || "").localeCompare(String(b.dateGregorian || "")),
    );
  }, [hearings]);

  const scheduled = useMemo(
    () => sortedHearings.filter((h: any) => h.status === "scheduled"),
    [sortedHearings],
  );

  const past = useMemo(
    () => sortedHearings.filter((h: any) => h.status !== "scheduled"),
    [sortedHearings],
  );

  const displayedHearings =
    tabFilter === "scheduled" ? scheduled : tabFilter === "past" ? past : sortedHearings;

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, prevPage } = usePagination({
    items: displayedHearings,
    itemsPerPage: 6,
  });

  if (clientRecord === undefined) {
    return (
      <PortalPageShell
        portal="client"
        loading
        loadingLabel="Loading your hearings…"
        title="Hearings"
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
        eyebrow="Court Calendar"
        title="Hearings"
        description="Court appearances and hearing schedules."
        icon={CalendarDays}
      >
        <EmptyState
          title="No client profile linked"
          description="Your account is not linked to a client record. Contact the firm to access court schedules."
          icon={CalendarDays}
        />
      </PortalPageShell>
    );
  }

  const nextAppearance = scheduled[0];

  const metrics = [
    {
      label: "Total Hearings",
      value: String(hearings.length),
      icon: CalendarDays,
      tone: DASHBOARD_METRIC_TONES.hearings,
      helperText: "All recorded dates",
    },
    {
      label: "Upcoming Court Dates",
      value: String(scheduled.length),
      icon: Clock,
      tone: scheduled.length > 0 ? ("warning" as const) : ("neutral" as const),
      helperText: "Pending appearances",
    },
    {
      label: "Next Scheduled",
      value: nextAppearance
        ? nextAppearance.dateBs || nextAppearance.dateGregorian || "Scheduled"
        : "None",
      icon: Scale,
      tone: "information" as const,
      helperText: nextAppearance?.court || "No pending court dates",
    },
    {
      label: "Completed Hearings",
      value: String(past.length),
      icon: CheckCircle2,
      tone: "success" as const,
      helperText: "Past appearances",
    },
  ];

  return (
    <PortalPageShell
      portal="client"
      decorated
      showTodayDate
      eyebrow="Court Calendar"
      title="Hearings"
      description="Upcoming court appearances, hearing dates, and court locations across Nepal."
      icon={CalendarDays}
      metrics={metrics}
      actions={
        <DashboardButton
          size="sm"
          variant="secondary"
          disabled={scheduled.length === 0}
          onClick={() => downloadHearingsIcs(scheduled, cases)}
        >
          <Download className="w-4 h-4" /> Export Calendar (.ICS)
        </DashboardButton>
      }
    >
      <DashboardSection title="Hearing Schedule">
        <DashboardFilterBar className="justify-between">
          <div className="flex bg-dashboard-neutral-soft p-1 rounded-lg border border-dashboard-border">
            <button
              onClick={() => setTabFilter("scheduled")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                tabFilter === "scheduled"
                  ? "bg-dashboard-panel text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Upcoming ({scheduled.length})
            </button>
            <button
              onClick={() => setTabFilter("past")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                tabFilter === "past"
                  ? "bg-dashboard-panel text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Past / Completed ({past.length})
            </button>
            <button
              onClick={() => setTabFilter("all")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                tabFilter === "all"
                  ? "bg-dashboard-panel text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({hearings.length})
            </button>
          </div>

          <div className="flex bg-dashboard-neutral-soft p-1 rounded-lg border border-dashboard-border">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === "list"
                  ? "bg-dashboard-panel text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === "table"
                  ? "bg-dashboard-panel text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Table
            </button>
          </div>
        </DashboardFilterBar>

        <div className="mt-4">
          {hearings === undefined ? (
            <DashboardListSkeleton rows={4} />
          ) : displayedHearings.length === 0 ? (
            <EmptyState
              title={tabFilter === "scheduled" ? "No upcoming hearings" : "No hearings found"}
              description={
                tabFilter === "scheduled"
                  ? "When the firm schedules a court date on your matter, it will appear here."
                  : "No hearing records match the selected filter."
              }
              icon={CalendarDays}
            />
          ) : viewMode === "table" ? (
            <div className="space-y-4">
              <DashboardTable>
                <DashboardTableHead>
                  <DashboardTableRow>
                    <DashboardTableHeaderCell>Date & Time</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Matter</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Court & Bench</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Purpose</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Status</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className="text-right">
                      Action
                    </DashboardTableHeaderCell>
                  </DashboardTableRow>
                </DashboardTableHead>
                <DashboardTableBody>
                  {paginatedItems.map((h: any) => {
                    const matter = cases.find((c: any) => c._id === h.caseId);
                    return (
                      <DashboardTableRow key={h._id} striped>
                        <DashboardTableCell className="font-semibold text-xs text-foreground">
                          {h.dateBs || h.dateGregorian}
                          {h.time ? (
                            <span className="block text-[10px] text-muted-foreground">
                              {h.time}
                            </span>
                          ) : null}
                        </DashboardTableCell>
                        <DashboardTableCell className="text-xs">
                          {matter ? (
                            <Link
                              href={`/client/cases/${matter._id}`}
                              className="font-semibold text-dashboard-primary hover:underline"
                            >
                              {matter.title}
                            </Link>
                          ) : (
                            "General Matter"
                          )}
                        </DashboardTableCell>
                        <DashboardTableCell className="text-xs text-muted-foreground">
                          {h.court || "District Court"}
                        </DashboardTableCell>
                        <DashboardTableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {h.purpose || "Hearing"}
                        </DashboardTableCell>
                        <DashboardTableCell>
                          <DashboardStatusLabel
                            status={h.status}
                            className="text-[10px] uppercase"
                          />
                        </DashboardTableCell>
                        <DashboardTableCell className="text-right">
                          {matter ? (
                            <DashboardButton
                              asChild
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                            >
                              <Link href={`/client/cases/${matter._id}`}>View</Link>
                            </DashboardButton>
                          ) : null}
                        </DashboardTableCell>
                      </DashboardTableRow>
                    );
                  })}
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
            <div className="space-y-4">
              <div className="space-y-3">
                {paginatedItems.map((h: any) => {
                  const matter = cases.find((c: any) => c._id === h.caseId);
                  const dateParts = (h.dateBs || "").split(" ");
                  return (
                    <DashboardListRow key={h._id} className="items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-dashboard-primary-soft border border-dashboard-primary/20 flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-dashboard-primary">
                          {dateParts[0] || "BS"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {dateParts[1] || "Court"}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {h.dateBs || h.dateGregorian}
                            {h.time ? ` · ${h.time}` : ""}
                          </p>
                          <DashboardStatusLabel
                            status={h.status}
                            className="text-[10px] uppercase"
                          />
                        </div>
                        <p className="text-sm text-foreground">
                          {matter ? (
                            <Link
                              href={`/client/cases/${matter._id}`}
                              className="hover:underline font-medium hover:text-dashboard-primary"
                            >
                              {matter.title}
                            </Link>
                          ) : (
                            "Hearing"
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Court:{" "}
                          <span className="text-foreground font-medium">
                            {h.court || "District Court"}
                          </span>
                          {h.purpose ? ` · Purpose: ${h.purpose}` : ""}
                        </p>
                      </div>
                    </DashboardListRow>
                  );
                })}
              </div>
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
      </DashboardSection>
    </PortalPageShell>
  );
}
