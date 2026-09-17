"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { CalendarDays, FolderOpen, Plus, Search } from "lucide-react";
import { Link, useNavigate } from "@/client/navigation";
import { useSearchParams } from "next/navigation";
import { caseQueryFailureKind } from "@/client/queries/case-query-error";
import { useCasesQuery } from "@/client/queries/cases";
import { useClients } from "@/client/queries/clients";
import { useHearings } from "@/client/queries/hearings";
import { useStaffDirectory } from "@/client/queries/identity";
import { CaseCreateDialog } from "@/components/cases/case-create-dialog";
import { CaseIdentity } from "@/components/cases/case-identity";
import { CaseQueryState } from "@/components/cases/case-query-state";
import { CaseStatusFilters } from "@/components/cases/case-status-filters";
import {
  DashboardButton,
  DashboardFilterBar,
  DashboardListRow,
  DashboardListSkeleton,
  DashboardSection,
  DualDateDisplay,
  EmptyState,
  HeroStatChip,
  PortalPageShell,
  StaffHeroChipRow,
  StatusBadge,
} from "@/components/dashboard";
import { Pagination } from "@/components/ui/pagination.tsx";
import { Input } from "@/components/ui/input.tsx";
import { usePagination } from "@/hooks/use-pagination.ts";
import { getDashboardStatusTone, DASHBOARD_TONE_FILL_CLASSES } from "@/lib/dashboard-semantics";
import { cn } from "@/lib/utils.ts";
import {
  CASE_LIFECYCLE_LABELS,
  CASE_LIFECYCLE_STATUSES,
  CASE_LIST_HERO_CLASS,
  caseDetailPath,
  matchesCaseStatusFilter,
  type CaseStatusFilter,
  type CaseWorkspaceBasePath,
} from "@/shared/contracts/case-ui";
import type { CaseDto } from "@/shared/contracts/domains";

export interface CasesWorkspaceProps {
  basePath: CaseWorkspaceBasePath;
  portal: "staff" | "admin";
}

function CasesWorkspaceInner({ basePath, portal }: CasesWorkspaceProps) {
  const navigate = useNavigate();
  const searchParams = useSearchParams();
  const casesQuery = useCasesQuery({});
  const casesData = casesQuery.data;
  const cases = casesData ?? [];
  const clients = useClients() || [];
  const users = useStaffDirectory() || [];
  const hearings = useHearings({}) || [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseStatusFilter>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "board">("list");

  useEffect(() => {
    if (searchParams.get("create") === "1") setShowCreateModal(true);
  }, [searchParams]);

  const filteredCases = useMemo(() => {
    const queryStr = search.toLowerCase();
    return cases.filter((matter) => {
      if (!matchesCaseStatusFilter(matter.status, statusFilter)) return false;
      const client = clients.find((entry) => entry._id === matter.clientId);
      const lawyer = users.find((entry) => entry._id === matter.assignedLawyerId);
      if (!queryStr) return true;
      return (
        matter.title.toLowerCase().includes(queryStr) ||
        matter.caseNumber.toLowerCase().includes(queryStr) ||
        Boolean(client && client.fullName.toLowerCase().includes(queryStr)) ||
        Boolean(lawyer && lawyer.name?.toLowerCase().includes(queryStr))
      );
    });
  }, [cases, clients, search, statusFilter, users]);

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, prevPage, resetPagination } =
    usePagination(filteredCases, 10);

  useEffect(() => {
    resetPagination();
  }, [search, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<CaseStatusFilter, number>> = { all: cases.length };
    for (const status of CASE_LIFECYCLE_STATUSES) {
      counts[status] = cases.filter((matter) =>
        matchesCaseStatusFilter(matter.status, status),
      ).length;
    }
    return counts;
  }, [cases]);

  const activeCount = statusCounts.active ?? 0;
  const onHoldCount = statusCounts.on_hold ?? 0;
  const closedCount = statusCounts.closed ?? 0;

  const handleCreateOpenChange = (open: boolean) => {
    setShowCreateModal(open);
    if (!open && searchParams.get("create") === "1") {
      navigate(basePath, { replace: true });
    }
  };

  if (casesQuery.isError) {
    return (
      <CaseQueryState
        portal={portal}
        kind={caseQueryFailureKind(casesQuery.error)}
        scope="list"
        onRetry={() => {
          void casesQuery.refetch();
        }}
      />
    );
  }

  return (
    <PortalPageShell
      portal={portal}
      loading={casesData === undefined}
      loadingLabel="Loading matters…"
      titleKey="portal.cases.title"
      descriptionKey="portal.cases.description"
      eyebrow={portal === "admin" ? "Matters" : undefined}
      icon={FolderOpen}
      heroClassName={CASE_LIST_HERO_CLASS}
      actions={
        <DashboardButton size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="size-3.5" aria-hidden /> New case
        </DashboardButton>
      }
      heroChildren={
        <StaffHeroChipRow>
          <HeroStatChip icon={FolderOpen} value={cases.length} label="total matters" />
          <HeroStatChip icon={FolderOpen} value={activeCount} label="active" />
          <HeroStatChip icon={CalendarDays} value={onHoldCount} label="on hold" />
          <HeroStatChip icon={FolderOpen} value={closedCount} label="closed" />
        </StaffHeroChipRow>
      }
    >
      <DashboardSection title="Filters & view">
        <DashboardFilterBar className="justify-between gap-3">
          <div className="relative w-full sm:max-w-[360px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 bg-dashboard-panel h-9"
              placeholder="Search by case number, title, client, or lawyer..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <CaseStatusFilters
            value={statusFilter}
            onChange={setStatusFilter}
            counts={statusCounts}
          />
          <div
            role="group"
            aria-label="Case view"
            className="flex bg-dashboard-neutral-soft p-1 rounded-lg border border-dashboard-border w-full sm:w-auto shrink-0"
          >
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex-1 sm:flex-none px-6 py-1.5 text-xs font-semibold tracking-wide rounded-md transition-all duration-200",
                viewMode === "list"
                  ? "bg-dashboard-panel shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              List View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={cn(
                "flex-1 sm:flex-none px-6 py-1.5 text-xs font-semibold tracking-wide rounded-md transition-all duration-200",
                viewMode === "board"
                  ? "bg-dashboard-panel shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              By status
            </button>
          </div>
        </DashboardFilterBar>
      </DashboardSection>

      {viewMode === "list" ? (
        <>
          <DashboardSection
            title="Matter list"
            description={`${filteredCases.length} matching matters`}
          >
            {casesQuery.isPending ? (
              <DashboardListSkeleton rows={6} />
            ) : cases.length === 0 ? (
              <EmptyState
                title="No cases on file"
                description="Create a case to start the matter file."
                icon={FolderOpen}
                action={
                  <DashboardButton size="sm" onClick={() => setShowCreateModal(true)}>
                    <Plus className="size-3.5" aria-hidden /> Create a case
                  </DashboardButton>
                }
              />
            ) : paginatedItems.length === 0 ? (
              <EmptyState
                title="No matching cases"
                description="No cases match your search or status filter."
                icon={FolderOpen}
              />
            ) : (
              <div className="space-y-2">
                {paginatedItems.map((matter: CaseDto) => {
                  const client = clients.find((entry) => entry._id === matter.clientId);
                  const lawyer = users.find((entry) => entry._id === matter.assignedLawyerId);
                  const hearing = hearings.find(
                    (entry: { caseId?: string; status?: string }) =>
                      entry.caseId === matter._id && entry.status === "scheduled",
                  );
                  const nextHearingDate =
                    matter.nextHearing ||
                    (hearing as { dateGregorian?: string; dateBs?: string } | undefined)
                      ?.dateGregorian ||
                    (hearing as { dateBs?: string } | undefined)?.dateBs;

                  return (
                    <DashboardListRow key={matter._id} className="group p-4 sm:p-5">
                      <div className="flex-1 min-w-0">
                        <CaseIdentity
                          caseNumber={matter.caseNumber}
                          status={matter.status}
                          closureOutcome={matter.closureOutcome}
                          practiceArea={matter.practiceArea}
                          filingDate={matter.filingDate}
                          className="mb-2"
                        />
                        <Link
                          href={caseDetailPath(basePath, matter._id)}
                          className="font-serif font-bold text-lg text-foreground group-hover:text-dashboard-primary transition-colors block mb-2 leading-tight"
                        >
                          {matter.title}
                        </Link>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-dashboard-primary-soft flex items-center justify-center text-dashboard-primary font-bold text-[10px]">
                              {client ? client.fullName.charAt(0).toUpperCase() : "?"}
                            </div>
                            <span className="font-medium">
                              {client ? client.fullName : "Unknown"}
                            </span>
                          </div>
                          <div className="hidden sm:block w-1 h-1 rounded-full bg-border" />
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-dashboard-information-soft flex items-center justify-center text-dashboard-information font-bold text-[10px]">
                              {lawyer ? lawyer.name?.charAt(0).toUpperCase() : "?"}
                            </div>
                            <span>{lawyer ? lawyer.name : "Unassigned"}</span>
                          </div>
                        </div>
                      </div>

                      {nextHearingDate ? (
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-dashboard-border pt-3 sm:pt-0 sm:pl-5 shrink-0 gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Next hearing
                          </span>
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-dashboard-warning-foreground bg-dashboard-warning-soft border border-dashboard-warning/35 px-3 py-1.5 rounded-lg">
                            <CalendarDays className="w-4 h-4" aria-hidden />
                            <DualDateDisplay isoDate={nextHearingDate} />
                          </div>
                        </div>
                      ) : null}
                    </DashboardListRow>
                  );
                })}
              </div>
            )}
          </DashboardSection>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            onNextPage={nextPage}
            onPrevPage={prevPage}
            className="mt-6"
          />
        </>
      ) : (
        <div className="flex gap-5 overflow-x-auto pb-6 pt-2 snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
          {CASE_LIFECYCLE_STATUSES.map((statusKey) => {
            const columnCases = filteredCases.filter((matter) =>
              matchesCaseStatusFilter(matter.status, statusKey),
            );
            const columnTone = getDashboardStatusTone(statusKey);
            return (
              <div
                key={statusKey}
                className="flex-shrink-0 w-[320px] bg-dashboard-neutral-soft/50 border border-dashboard-border rounded-2xl flex flex-col max-h-[75vh] snap-start"
              >
                <div className="p-4 border-b border-dashboard-border flex items-center justify-between sticky top-0 bg-dashboard-panel/80 backdrop-blur-md rounded-t-2xl z-10">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-2 h-2 rounded-full ${DASHBOARD_TONE_FILL_CLASSES[columnTone]}`}
                    />
                    <h3 className="font-semibold text-[13px] uppercase tracking-wider">
                      {CASE_LIFECYCLE_LABELS[statusKey]}
                    </h3>
                  </div>
                  <StatusBadge tone="neutral" className="text-[10px] px-2">
                    {columnCases.length}
                  </StatusBadge>
                </div>
                <div className="p-3 overflow-y-auto space-y-3 flex-1 min-h-[150px] scrollbar-thin scrollbar-thumb-border">
                  {columnCases.map((matter) => {
                    const client = clients.find((entry) => entry._id === matter.clientId);
                    return (
                      <div
                        key={matter._id}
                        className="group rounded-xl border border-dashboard-border bg-dashboard-panel p-4 transition-all hover:border-dashboard-primary/40 hover:shadow-sm"
                      >
                        <div className="flex flex-col h-full relative">
                          <CaseIdentity
                            caseNumber={matter.caseNumber}
                            status={matter.status}
                            closureOutcome={matter.closureOutcome}
                            practiceArea={matter.practiceArea}
                            className="mb-2.5"
                          />
                          <Link
                            href={caseDetailPath(basePath, matter._id)}
                            className="font-serif font-bold text-[15px] text-foreground group-hover:text-dashboard-primary leading-snug block mb-3 line-clamp-3 transition-colors before:absolute before:inset-0"
                          >
                            {matter.title}
                          </Link>
                          <div className="mt-auto pt-3 border-t border-dashboard-border flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-5 h-5 rounded-full bg-dashboard-primary-soft flex items-center justify-center text-dashboard-primary font-bold text-[10px] shrink-0">
                              {client ? client.fullName.charAt(0).toUpperCase() : "?"}
                            </div>
                            <span className="truncate font-medium">
                              {client ? client.fullName : "Unknown"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {columnCases.length === 0 && (
                    <EmptyState
                      title="No cases"
                      description="No matters in this column."
                      className="py-6"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CaseCreateDialog
        open={showCreateModal}
        onOpenChange={handleCreateOpenChange}
        clients={clients}
        lawyers={users}
        onCreated={(created) => {
          const id = created.id ?? created._id;
          if (id) navigate(caseDetailPath(basePath, id));
        }}
      />
    </PortalPageShell>
  );
}

export function CasesWorkspace(props: CasesWorkspaceProps) {
  return (
    <Suspense fallback={null}>
      <CasesWorkspaceInner {...props} />
    </Suspense>
  );
}
