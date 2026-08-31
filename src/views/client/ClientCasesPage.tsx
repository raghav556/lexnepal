"use client";

import { useMemo, useState } from "react";
import { FolderOpen, CalendarDays, Search, UserRound, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMyClient, useMyTeam } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";
import { useHearings } from "@/client/queries/hearings";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import { Input } from "@/components/ui/input.tsx";
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
import { DASHBOARD_METRIC_TONES, getDashboardStatusTone } from "@/lib/dashboard-semantics";

export default function ClientCasesPage() {
  const currentUser = useCurrentUser();
  const clientRecord = useMyClient();
  const clientId = clientRecord?._id;
  const cases = useCases(clientId ? { clientId } : {}) || [];
  const users = useMyTeam() || [];
  const hearings = useHearings({}) || [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "table">("list");

  const filteredCases = useMemo(() => {
    return cases.filter((c: any) => {
      const matchesSearch =
        search === "" ||
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.caseNumber?.toLowerCase().includes(search.toLowerCase()) ||
        c.practiceArea?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [cases, search, statusFilter]);

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, prevPage } = usePagination({
    items: filteredCases,
    itemsPerPage: 8,
  });

  const activeCount = cases.filter((c: any) => c.status === "active").length;
  const closedCount = cases.filter((c: any) => c.status === "closed").length;
  const onHoldCount = cases.filter((c: any) => c.status === "on_hold").length;

  if (currentUser === undefined || clientRecord === undefined) {
    return (
      <PortalPageShell
        portal="client"
        loading
        loadingLabel="Loading your legal matters…"
        title="My Cases"
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
        eyebrow="Matter Management"
        title="My Cases"
        description="Track your open matters and legal representation."
        icon={FolderOpen}
      >
        <EmptyState
          title="No client profile linked"
          description="Your portal account is not linked to a firm client record yet. Ask the firm to grant portal access from their Clients list."
          icon={FolderOpen}
        />
      </PortalPageShell>
    );
  }

  const metrics = [
    {
      label: "Total matters",
      value: String(cases.length),
      icon: FolderOpen,
      tone: DASHBOARD_METRIC_TONES.cases,
      helperText: "All matters on file",
    },
    {
      label: "Active matters",
      value: String(activeCount),
      tone: "information" as const,
      helperText: "Ongoing proceedings",
    },
    {
      label: "On hold",
      value: String(onHoldCount),
      tone: "warning" as const,
      helperText: "Pending next action",
    },
    {
      label: "Closed / Resolved",
      value: String(closedCount),
      tone: "neutral" as const,
      helperText: "Completed matters",
    },
  ];

  return (
    <PortalPageShell
      portal="client"
      decorated
      showTodayDate
      eyebrow="Matter Overview"
      title="My Cases"
      description="Track your open matters, assigned advocates, and upcoming court hearings."
      icon={FolderOpen}
      metrics={metrics}
      actions={
        <DashboardButton asChild size="sm">
          <Link href="/client/booking">Request new consultation</Link>
        </DashboardButton>
      }
    >
      <DashboardSection title="Filter & search matters">
        <DashboardFilterBar className="justify-between">
          <div className="relative w-full sm:max-w-[360px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 bg-dashboard-panel h-9 text-sm"
              placeholder="Search by case number, title, or practice area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-dashboard-neutral-soft p-1 rounded-lg border border-dashboard-border">
              {(["all", "active", "on_hold", "closed"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    statusFilter === status
                      ? "bg-dashboard-panel text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {status === "all"
                    ? "All"
                    : status === "active"
                      ? "Active"
                      : status === "on_hold"
                        ? "On Hold"
                        : "Closed"}
                </button>
              ))}
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
          </div>
        </DashboardFilterBar>
      </DashboardSection>

      <DashboardSection
        title="Your matters"
        description={`Showing ${filteredCases.length} matter${filteredCases.length === 1 ? "" : "s"}`}
        icon={FolderOpen}
      >
        {cases === undefined ? (
          <DashboardListSkeleton rows={4} />
        ) : filteredCases.length === 0 ? (
          <EmptyState
            title="No cases found"
            description={
              search || statusFilter !== "all"
                ? "No matters match your filter criteria."
                : "Your cases will appear here once your advocate creates them."
            }
            icon={FolderOpen}
          />
        ) : viewMode === "table" ? (
          <div className="space-y-4">
            <DashboardTable>
              <DashboardTableHead>
                <DashboardTableRow>
                  <DashboardTableHeaderCell>Case Number</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Title & Practice Area</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Assigned Advocate</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Court</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Status</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell className="text-right">Action</DashboardTableHeaderCell>
                </DashboardTableRow>
              </DashboardTableHead>
              <DashboardTableBody>
                {paginatedItems.map((c: any) => {
                  const lawyer = users.find((u: any) => u._id === c.assignedLawyerId);
                  return (
                    <DashboardTableRow key={c._id} striped>
                      <DashboardTableCell className="font-mono text-xs font-semibold text-muted-foreground">
                        {c.caseNumber}
                      </DashboardTableCell>
                      <DashboardTableCell>
                        <p className="font-semibold text-foreground">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.practiceArea}</p>
                      </DashboardTableCell>
                      <DashboardTableCell className="text-xs">
                        {lawyer?.name || "Unassigned"}
                      </DashboardTableCell>
                      <DashboardTableCell className="text-xs text-muted-foreground">
                        {c.court || "District Court"}
                      </DashboardTableCell>
                      <DashboardTableCell>
                        <DashboardStatusLabel status={c.status} className="text-xs" />
                      </DashboardTableCell>
                      <DashboardTableCell className="text-right">
                        <DashboardButton asChild size="sm" variant="ghost">
                          <Link href={`/client/cases/${c._id}`}>
                            Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Link>
                        </DashboardButton>
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
              {paginatedItems.map((c: any) => {
                const lawyer = users.find((u: any) => u._id === c.assignedLawyerId);
                const nextHearingObj = hearings.find(
                  (h: any) => h.caseId === c._id && h.status === "scheduled",
                );

                return (
                  <Link key={c._id} href={`/client/cases/${c._id}`} className="block group">
                    <DashboardListRow className="hover:shadow-sm">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <DashboardStatusLabel
                            tone="neutral"
                            label={c.caseNumber}
                            className="text-xs font-mono"
                          />
                          <DashboardStatusLabel status={c.status} className="text-xs" />
                          <DashboardStatusLabel
                            tone="information"
                            label={c.practiceArea}
                            className="text-xs"
                          />
                        </div>
                        <h3 className="font-semibold text-foreground group-hover:text-dashboard-primary transition-colors">
                          {c.title}
                        </h3>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <UserRound className="w-3.5 h-3.5 text-dashboard-information" />
                            Advocate: {lawyer ? lawyer.name : "Unassigned"}
                          </span>
                          <span>Court: {c.court || "District Court"}</span>
                        </div>
                        {nextHearingObj ? (
                          <div className="flex items-center gap-1.5 text-xs text-dashboard-primary font-medium">
                            <CalendarDays className="w-3.5 h-3.5" />
                            Next Hearing: {nextHearingObj.dateBs || nextHearingObj.dateGregorian}
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 flex items-center">
                        <DashboardButton size="sm" variant="ghost" className="pointer-events-none">
                          View matter <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </DashboardButton>
                      </div>
                    </DashboardListRow>
                  </Link>
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
      </DashboardSection>
    </PortalPageShell>
  );
}
