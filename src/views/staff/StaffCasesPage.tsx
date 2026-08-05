import { useState, useEffect } from "react";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "@/client/navigation";
import { Plus, Search, CalendarDays, X, Loader2, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import { useCases, useCreateCase } from "@/client/queries/cases";
import { useClients } from "@/client/queries/clients";
import { useHearings } from "@/client/queries/hearings";
import { PRACTICE_AREAS, COURTS } from "@/lib/lex-constants.ts";
import { ConflictCheckerModal } from "@/components/cases/ConflictCheckerModal.tsx";
import { useStaffDirectory } from "@/client/queries/identity";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed_won: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  closed_lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  inquiry: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function StaffCasesPage() {
  const cases = useCases({}) || [];
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

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseNumber || !title || !clientId || !assignedLawyerId) {
      toast.error("Please fill in all required fields.");
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

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Cases</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowConflictChecker(true)}>
            <ShieldCheck className="w-4 h-4 mr-1" /> Conflict Check
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Case
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-2 rounded-xl border shadow-xs">
        <div className="relative w-full sm:w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:outline-none placeholder:text-muted-foreground/60 h-9"
            placeholder="Search by case number, title, client, or lawyer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-muted p-1 rounded-lg border w-full sm:w-auto shrink-0">
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 sm:flex-none px-6 py-1.5 text-xs font-semibold tracking-wide rounded-md transition-all duration-200 ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode("board")}
            className={`flex-1 sm:flex-none px-6 py-1.5 text-xs font-semibold tracking-wide rounded-md transition-all duration-200 ${viewMode === "board" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Kanban Board
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <>
          <div className="space-y-2">
            {paginatedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 bg-card rounded-lg border border-dashed border-border">
                No cases found matching your criteria.
              </p>
            ) : (
              paginatedItems.map((c: any) => {
                const client = clients.find((cl: any) => cl._id === c.clientId);
                const lawyer = users.find((u: any) => u._id === c.assignedLawyerId);
                const nextHearingObj = hearings.find(
                  (h: any) => h.caseId === c._id && h.status === "scheduled",
                );

                return (
                  <Card
                    key={c._id}
                    className="group hover:shadow-md hover:border-primary/40 transition-all duration-300 bg-card overflow-hidden"
                  >
                    <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border">
                            {c.caseNumber}
                          </span>
                          <Badge
                            className={`text-[10px] uppercase tracking-wider font-semibold border ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-800"}`}
                          >
                            {c.status.replace("_", " ")}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-wider font-semibold border-primary/20 text-primary/80 bg-primary/5"
                          >
                            {c.practiceArea}
                          </Badge>
                        </div>
                        <Link
                          href={`/staff/cases/${c._id}`}
                          className="font-serif font-bold text-lg text-foreground group-hover:text-primary transition-colors block mb-2 leading-tight"
                        >
                          {c.title}
                        </Link>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                              {client ? client.fullName.charAt(0).toUpperCase() : "?"}
                            </div>
                            <span className="font-medium">
                              {client ? client.fullName : "Unknown"}
                            </span>
                          </div>
                          <div className="hidden sm:block w-1 h-1 rounded-full bg-border" />
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-[10px]">
                              {lawyer ? lawyer.name?.charAt(0).toUpperCase() : "?"}
                            </div>
                            <span>{lawyer ? lawyer.name : "Unassigned"}</span>
                          </div>
                        </div>
                      </div>

                      {nextHearingObj && (
                        <div className="mt-3 sm:mt-0 sm:ml-4 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-5 shrink-0">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0 sm:mb-1.5">
                            Next Hearing
                          </span>
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-accent bg-accent/10 border border-accent/20 px-3 py-1.5 rounded-lg shadow-xs">
                            <CalendarDays className="w-4 h-4" />
                            {nextHearingObj.dateBs}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

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
            return (
              <div
                key={statusKey}
                className="flex-shrink-0 w-[320px] bg-muted/20 border border-border/60 rounded-2xl flex flex-col max-h-[75vh] snap-start shadow-xs"
              >
                <div className="p-4 border-b border-border/50 flex items-center justify-between sticky top-0 bg-card/80 backdrop-blur-md rounded-t-2xl z-10">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-2 h-2 rounded-full shadow-xs ${STATUS_COLORS[statusKey]?.split(" ")[0] || "bg-gray-500"}`}
                    />
                    <h3 className="font-semibold text-[13px] uppercase tracking-wider">
                      {statusKey.replace("_", " ")}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-background shadow-xs px-2">
                    {columnCases.length}
                  </Badge>
                </div>
                <div className="p-3 overflow-y-auto space-y-3 flex-1 min-h-[150px] scrollbar-thin scrollbar-thumb-border">
                  {columnCases.map((c: any) => {
                    const client = clients.find((cl: any) => cl._id === c.clientId);
                    return (
                      <Card
                        key={c._id}
                        className="group hover:border-primary/40 hover:shadow-md transition-all duration-300 bg-card border-border/80"
                      >
                        <CardContent className="p-4 flex flex-col h-full relative">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted/50 border px-1.5 py-0.5 rounded">
                              {c.caseNumber}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[9px] uppercase tracking-wider font-semibold border-primary/20 text-primary/80 bg-primary/5 px-1.5 py-0"
                            >
                              {c.practiceArea}
                            </Badge>
                          </div>
                          <Link
                            href={`/staff/cases/${c._id}`}
                            className="font-serif font-bold text-[15px] text-foreground group-hover:text-primary leading-snug block mb-3 line-clamp-3 transition-colors before:absolute before:inset-0"
                          >
                            {c.title}
                          </Link>
                          <div className="mt-auto pt-3 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                              {client ? client.fullName.charAt(0).toUpperCase() : "?"}
                            </div>
                            <span className="truncate font-medium">
                              {client ? client.fullName : "Unknown"}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {columnCases.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-28 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl opacity-60 bg-muted/10">
                      <span className="text-xs font-semibold tracking-wide uppercase">
                        No Cases
                      </span>
                    </div>
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
                    onChange={(e) => setClientId(e.target.value)}
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
                  onChange={(e) => setOpposingCounsel(e.target.value)}
                />
              </div>

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
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Case"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Conflict Checker Modal */}
      <ConflictCheckerModal open={showConflictChecker} onOpenChange={setShowConflictChecker} />
    </div>
  );
}
