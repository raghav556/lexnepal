import { useState, useEffect } from "react";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "@/client/navigation";
import { Plus, Search, CalendarDays, X, Loader2, ShieldCheck, FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import { useCases, useCreateCase } from "@/client/queries/cases";
import { useClients } from "@/client/queries/clients";
import { useHearings } from "@/client/queries/hearings";
import { PRACTICE_AREAS, COURTS } from "@/lib/lex-constants.ts";
import { ConflictCheckerModal } from "@/components/cases/ConflictCheckerModal.tsx";
import { useStaffDirectory } from "@/client/queries/identity";
import type { ConflictOfficialResultDto } from "@/shared/contracts/conflicts";
import {
  DashboardButton,
  DashboardFilterBar,
  DashboardListRow,
  DashboardListSkeleton,
  DashboardSection,
  DashboardStatusLabel,
  DualDateDisplay,
  EmptyState,
  PortalPageShell,
  StatusBadge,
} from "@/components/dashboard";
import {
  DASHBOARD_METRIC_TONES,
  DASHBOARD_TONE_FILL_CLASSES,
  DASHBOARD_TONE_PANEL_CLASSES,
  getDashboardStatusTone,
} from "@/lib/dashboard-semantics";

export default function StaffCasesPage() {
  const casesData = useCases({});
  const cases = casesData ?? [];
  const clients = useClients() || [];
  const users = useStaffDirectory() || [];
  const hearings = useHearings({}) || [];
  const createCase = useCreateCase();

  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "board">("list");

  // Form states
  const [caseNumber, setCaseNumber] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [practiceArea, setPracticeArea] = useState(PRACTICE_AREAS[0]);
  const [clientId, setClientId] = useState("");
  const [assignedLawyerId, setAssignedLawyerId] = useState("");
  const [court, setCourt] = useState(COURTS[0]);
  const [opposingCounsel, setOpposingCounsel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConflictChecker, setShowConflictChecker] = useState(false);
  const [officialClearance, setOfficialClearance] = useState<ConflictOfficialResultDto | null>(
    null,
  );

  const selectedClient = clients.find((c: any) => c._id === clientId);
  const matterContext = {
    clientName: selectedClient?.fullName ?? selectedClient?.companyName ?? undefined,
    opposingCounsel: opposingCounsel.trim() || undefined,
    caseNumber: caseNumber.trim() || undefined,
  };

  const clearanceRequired = Boolean(clientId || opposingCounsel.trim() || title.trim());
  const hasValidClearance =
    officialClearance != null &&
    (officialClearance.summary.total === 0 || officialClearance.summary.high === 0);

  const openConflictForMatter = () => {
    const seed = opposingCounsel.trim() || selectedClient?.fullName || title.trim();
    setShowConflictChecker(true);
    return seed;
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseNumber || !title || !clientId || !assignedLawyerId) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (clearanceRequired && !hasValidClearance) {
      toast.error("Run an official conflict check before creating this matter.");
      openConflictForMatter();
      return;
    }
    setIsSubmitting(true);
    try {
      await createCase({
        caseNumber,
        title,
        description: description || undefined,
        practiceArea,
        clientId: clientId as any,
        assignedLawyerId: assignedLawyerId as any,
        teamMemberIds: [assignedLawyerId as any],
        court: court || undefined,
        opposingCounsel: opposingCounsel || undefined,
        filingDate: new Date().toISOString().split("T")[0],
      });
      toast.success("Case created successfully!");
      setShowCreateModal(false);
      // Reset form
      setCaseNumber("");
      setTitle("");
      setDescription("");
      setClientId("");
      setAssignedLawyerId("");
      setOpposingCounsel("");
      setOfficialClearance(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create case.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter cases based on search
  const filteredCases = cases.filter((c: any) => {
    const client = clients.find((cl: any) => cl._id === c.clientId);
    const lawyer = users.find((u: any) => u._id === c.assignedLawyerId);
    const queryStr = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(queryStr) ||
      c.caseNumber.toLowerCase().includes(queryStr) ||
      (client && client.fullName.toLowerCase().includes(queryStr)) ||
      (lawyer && lawyer.name?.toLowerCase().includes(queryStr))
    );
  });

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, prevPage, resetPagination } =
    usePagination(filteredCases, 10);

  useEffect(() => {
    resetPagination();
  }, [search]);

  const activeCount = cases.filter((c: any) => c.status === "active").length;
  const onHoldCount = cases.filter((c: any) => c.status === "on_hold").length;

  return (
    <PortalPageShell
      portal="staff"
      decorated
      showTodayDate
      loading={casesData === undefined}
      loadingLabel="Loading matters…"
      eyebrow="Matter management"
      titleKey="portal.cases.title"
      descriptionKey="portal.cases.description"
      icon={FolderOpen}
      metrics={[
        {
          label: "Total matters",
          value: String(cases.length),
          icon: FolderOpen,
          tone: DASHBOARD_METRIC_TONES.cases,
          helperText: "All case records",
        },
        {
          label: "Active",
          value: String(activeCount),
          tone: "information",
          helperText: "In progress",
        },
        {
          label: "On hold",
          value: String(onHoldCount),
          tone: "warning",
          helperText: "Paused matters",
        },
        {
          label: "Filtered",
          value: String(filteredCases.length),
          tone: "neutral",
          helperText: "Current view",
        },
      ]}
      actions={
        <>
          <DashboardButton
            size="sm"
            variant="secondary"
            onClick={() => setShowConflictChecker(true)}
          >
            <ShieldCheck className="size-4" aria-hidden /> Conflict check
          </DashboardButton>
          <DashboardButton size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="size-4" aria-hidden /> New case
          </DashboardButton>
        </>
      }
    >
      <DashboardSection title="Filters & view">
        <DashboardFilterBar className="justify-between">
          <div className="relative w-full sm:max-w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 bg-dashboard-panel h-9"
              placeholder="Search by case number, title, client, or lawyer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-dashboard-neutral-soft p-1 rounded-lg border border-dashboard-border w-full sm:w-auto shrink-0">
            <button
              onClick={() => setViewMode("list")}
              className={`flex-1 sm:flex-none px-6 py-1.5 text-xs font-semibold tracking-wide rounded-md transition-all duration-200 ${viewMode === "list" ? "bg-dashboard-panel shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={`flex-1 sm:flex-none px-6 py-1.5 text-xs font-semibold tracking-wide rounded-md transition-all duration-200 ${viewMode === "board" ? "bg-dashboard-panel shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Kanban Board
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
            {casesData === undefined ? (
              <DashboardListSkeleton rows={6} />
            ) : paginatedItems.length === 0 ? (
              <EmptyState
                title="No cases found"
                description="No cases match your search criteria."
                icon={FolderOpen}
              />
            ) : (
              <div className="space-y-2">
                {paginatedItems.map((c: any) => {
                  const client = clients.find((cl: any) => cl._id === c.clientId);
                  const lawyer = users.find((u: any) => u._id === c.assignedLawyerId);
                  const nextHearingObj = hearings.find(
                    (h: any) => h.caseId === c._id && h.status === "scheduled",
                  );

                  return (
                    <DashboardListRow key={c._id} className="group p-4 sm:p-5">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[10px] font-mono font-medium text-muted-foreground bg-dashboard-neutral-soft px-2 py-0.5 rounded-md border border-dashboard-border">
                            {c.caseNumber}
                          </span>
                          <DashboardStatusLabel
                            status={c.status}
                            className="text-[10px] uppercase tracking-wider"
                          />
                          <StatusBadge
                            tone="information"
                            className="text-[10px] uppercase tracking-wider"
                          >
                            {c.practiceArea}
                          </StatusBadge>
                          {c.filingDate ? (
                            <span className="text-[10px] text-muted-foreground">
                              Filed <DualDateDisplay isoDate={c.filingDate} />
                            </span>
                          ) : null}
                        </div>
                        <Link
                          href={`/staff/cases/${c._id}`}
                          className="font-serif font-bold text-lg text-foreground group-hover:text-dashboard-primary transition-colors block mb-2 leading-tight"
                        >
                          {c.title}
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

                      {nextHearingObj && (
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-dashboard-border pt-3 sm:pt-0 sm:pl-5 shrink-0 gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Next hearing
                          </span>
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-dashboard-warning-foreground bg-dashboard-warning-soft border border-dashboard-warning/35 px-3 py-1.5 rounded-lg">
                            <CalendarDays className="w-4 h-4" aria-hidden />
                            <DualDateDisplay
                              isoDate={nextHearingObj.dateGregorian || nextHearingObj.dateBs}
                            />
                          </div>
                        </div>
                      )}
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
          {["inquiry", "active", "on_hold", "closed_won", "closed_lost"].map((statusKey) => {
            const columnCases = filteredCases.filter((c: any) => c.status === statusKey);
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
                      {statusKey.replace("_", " ")}
                    </h3>
                  </div>
                  <StatusBadge tone="neutral" className="text-[10px] px-2">
                    {columnCases.length}
                  </StatusBadge>
                </div>
                <div className="p-3 overflow-y-auto space-y-3 flex-1 min-h-[150px] scrollbar-thin scrollbar-thumb-border">
                  {columnCases.map((c: any) => {
                    const client = clients.find((cl: any) => cl._id === c.clientId);
                    return (
                      <div
                        key={c._id}
                        className="group rounded-xl border border-dashboard-border bg-dashboard-panel p-4 transition-all hover:border-dashboard-primary/40 hover:shadow-sm"
                      >
                        <div className="flex flex-col h-full relative">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-[10px] font-mono font-medium text-muted-foreground bg-dashboard-neutral-soft border border-dashboard-border px-1.5 py-0.5 rounded">
                              {c.caseNumber}
                            </span>
                            <StatusBadge
                              tone="information"
                              className="text-[9px] uppercase tracking-wider px-1.5 py-0"
                            >
                              {c.practiceArea}
                            </StatusBadge>
                          </div>
                          <Link
                            href={`/staff/cases/${c._id}`}
                            className="font-serif font-bold text-[15px] text-foreground group-hover:text-dashboard-primary leading-snug block mb-3 line-clamp-3 transition-colors before:absolute before:inset-0"
                          >
                            {c.title}
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

      {/* Case Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-30">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif font-bold text-lg text-primary">Create New Case</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Case Number <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="KTM/2083/123"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Case Title <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="Sharma Land Dispute Case"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Client <span className="text-destructive">*</span>
                  </label>
                  <select
                    required
                    className="w-full h-9 rounded-md border border-input bg-input text-foreground px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                    value={clientId}
                    onChange={(e) => {
                      setClientId(e.target.value);
                      setOfficialClearance(null);
                    }}
                  >
                    <option value="">Select Client</option>
                    {clients.map((cl: any) => (
                      <option key={cl._id} value={cl._id}>
                        {cl.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Assigned Lawyer <span className="text-destructive">*</span>
                  </label>
                  <select
                    required
                    className="w-full h-9 rounded-md border border-input bg-input text-foreground px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                    value={assignedLawyerId}
                    onChange={(e) => setAssignedLawyerId(e.target.value)}
                  >
                    <option value="">Select Lawyer</option>
                    {users
                      .filter((u: any) => u.role !== "client")
                      .map((u: any) => (
                        <option key={u._id} value={u._id}>
                          {u.name || u.email}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Practice Area</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-input text-foreground px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                    value={practiceArea}
                    onChange={(e) => setPracticeArea(e.target.value)}
                  >
                    {PRACTICE_AREAS.map((pa) => (
                      <option key={pa} value={pa}>
                        {pa}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Court Name</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-input text-foreground px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                    value={court}
                    onChange={(e) => setCourt(e.target.value)}
                  >
                    {COURTS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Opposing Counsel</label>
                <Input
                  placeholder="Adv. Krishna Bhandari"
                  value={opposingCounsel}
                  onChange={(e) => {
                    setOpposingCounsel(e.target.value);
                    setOfficialClearance(null);
                  }}
                />
              </div>

              {clearanceRequired && (
                <div
                  className={`rounded-lg border p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    hasValidClearance
                      ? DASHBOARD_TONE_PANEL_CLASSES.success
                      : DASHBOARD_TONE_PANEL_CLASSES.warning
                  }`}
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {hasValidClearance
                        ? "Official conflict clearance on file"
                        : "Official conflict check required"}
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      {hasValidClearance
                        ? `Check ${officialClearance?.checkId.slice(0, 8)}… · ${officialClearance?.summary.total ?? 0} hit(s)`
                        : "Run an official check for client, counsel, and matter details before creating."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={hasValidClearance ? "outline" : "default"}
                    onClick={() => setShowConflictChecker(true)}
                  >
                    <ShieldCheck className="w-4 h-4 mr-1" />
                    {hasValidClearance ? "Re-check" : "Run check"}
                  </Button>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Description / Notes</label>
                <textarea
                  className="w-full rounded-md border border-input bg-input text-foreground px-3 py-2 text-xs shadow-xs focus-visible:outline-hidden min-h-[60px]"
                  placeholder="Case notes, key concerns, property numbers..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || (clearanceRequired && !hasValidClearance)}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Case"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Conflict Checker Modal */}
      <ConflictCheckerModal
        open={showConflictChecker}
        onOpenChange={setShowConflictChecker}
        initialQuery={opposingCounsel.trim() || selectedClient?.fullName || title.trim() || ""}
        matterContext={matterContext}
        onOfficialClearance={(result) => {
          if (result.summary.high > 0) {
            toast.error(
              "High-risk conflicts found — partner review required before creating matter.",
            );
            setOfficialClearance(null);
            return;
          }
          setOfficialClearance(result);
        }}
      />
    </PortalPageShell>
  );
}
