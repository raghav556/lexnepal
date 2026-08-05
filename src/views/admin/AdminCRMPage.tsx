import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import { useLeads, useLeadCommands } from "@/client/queries/crm";
import { Loader2, UserPlus, Phone, Mail, Tag, X, Link as LinkIcon, CheckCircle2, KanbanSquare, AlignJustify, Search } from "lucide-react";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import { useStaffDirectory } from "@/client/queries/identity";

const STATUS_COLORS: Record<string, string> = {
  new:                    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  contacted:              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  consultation_scheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  converted:              "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  lost:                   "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  new:                    "New",
  contacted:              "Contacted",
  consultation_scheduled: "Consult Scheduled",
  converted:              "Converted",
  lost:                   "Lost",
};

interface ConvertModalState {
  leadId: string;
  leadName: string;
  email?: string;
  phone?: string;
}

export default function AdminCRMPage() {
  const { data: leads = [], isLoading: leadsLoading } = useLeads({});
  const { data: users = [] } = useStaffDirectory() as any;
  const { updateLead, convertToClient, generateIntakeLink } = useLeadCommands();

  // List by default on phones (avoids page-wide horizontal scroll from kanban columns)
  const [view, setView] = useState<"kanban" | "list">(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches
      ? "kanban"
      : "list",
  );
  const [search, setSearch] = useState("");
  const [detailsModal, setDetailsModal] = useState<any | null>(null);

  const [convertModal, setConvertModal] = useState<ConvertModalState | null>(null);
  const [convertType, setConvertType] = useState<"individual" | "corporate">("individual");
  const [convertCompany, setConvertCompany] = useState("");
  const [converting, setConverting] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  const isLoading = leadsLoading || users === undefined;
  const staffUsers = users.filter((u: any) => u.role !== "client");

  const filteredLeads = leads.filter((l: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.fullName.toLowerCase().includes(q) || 
           (l.email && l.email.toLowerCase().includes(q)) || 
           (l.phone && l.phone.includes(q));
  });

  const {
    paginatedItems,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    resetPagination
  } = usePagination(filteredLeads, 10);

  useEffect(() => {
    resetPagination();
  }, [search, view]);

  const handleStatusChange = async (leadId: string, status: string) => {
    try {
      await updateLead.mutateAsync({ leadId: leadId, status: status });
      toast.success("Pipeline status updated.");
      if (detailsModal && (detailsModal.id === leadId || detailsModal._id === leadId)) {
        setDetailsModal((prev: any) => ({ ...prev, status }));
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status.");
    }
  };

  const handleAssigneeChange = async (leadId: string, assigneeId: string) => {
    try {
      await updateLead.mutateAsync({ leadId: leadId, assignedTo: assigneeId === "unassigned" ? undefined : assigneeId });
      toast.success("Lead assignment updated.");
      if (detailsModal && (detailsModal.id === leadId || detailsModal._id === leadId)) {
        setDetailsModal((prev: any) => ({ ...prev, assignedTo: assigneeId === "unassigned" ? undefined : assigneeId }));
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update assignment.");
    }
  };

  const handleSaveNotes = async () => {
    if (!detailsModal) return;
    setSavingDetails(true);
    try {
      await updateLead.mutateAsync({ leadId: detailsModal.id || detailsModal._id, notes: detailsModal.notes });
      toast.success("Notes saved.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save notes.");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleGenerateLink = async (leadId: string) => {
    try {
      const token = await generateIntakeLink.mutateAsync({ leadId });
      const url = `${window.location.origin}/intake/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Intake link generated and copied to clipboard!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate link.");
    }
  };

  const handleConvertSubmit = async () => {
    if (!convertModal) return;
    setConverting(true);
    try {
      const clientArgs: any = {
        leadId: convertModal.leadId as any,
        type: convertType,
      };
      if (convertType === "corporate" && convertCompany.trim()) {
        clientArgs.companyName = convertCompany.trim();
      }
      await convertToClient.mutateAsync(clientArgs);
      toast.success(`"${convertModal.leadName}" has been converted to a client record.`);
      setConvertModal(null);
      setDetailsModal(null);
      setConvertCompany("");
      setConvertType("individual");
    } catch (err: any) {
      toast.error(err?.message || "Conversion failed.");
    } finally {
      setConverting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Card component for rendering a single lead in both Kanban and List
  const LeadCard = ({ lead, isKanban = false }: { lead: any, isKanban?: boolean }) => (
    <div 
      className={`bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer ${isKanban ? 'p-3' : 'p-3.5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'}`}
      onClick={(e) => {
        // Prevent opening details if clicking on buttons/selects
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.select-trigger')) return;
        setDetailsModal(lead);
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{lead.fullName}</p>
          {isKanban && (
            <Badge variant="secondary" className="text-[9px] capitalize">{lead.source?.replace("_", " ")}</Badge>
          )}
        </div>
        
        <div className={`flex flex-wrap items-center gap-2 mt-1 ${isKanban ? 'flex-col items-start gap-1' : ''}`}>
          {lead.phone && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" />{lead.phone}
            </span>
          )}
          {lead.email && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground truncate w-full">
              <Mail className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{lead.email}</span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {lead.practiceAreaInterest && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Tag className="w-2.5 h-2.5" />{lead.practiceAreaInterest}
            </Badge>
          )}
          {!isKanban && (
            <Badge variant="secondary" className="text-[10px] capitalize">
              {lead.source?.replace("_", " ")}
            </Badge>
          )}
          {lead.intakeSubmitted && (
            <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800">
              <CheckCircle2 className="w-2.5 h-2.5" /> Intake Submitted
            </Badge>
          )}
          {lead.assignedTo && (
            <span className="text-[10px] text-muted-foreground ml-auto bg-muted px-1.5 py-0.5 rounded-sm">
              {staffUsers.find((u: any) => u.id === lead.assignedTo || u._id === lead.assignedTo)?.name || "Assigned"}
            </span>
          )}
        </div>
      </div>
      
      {!isKanban && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0 w-full sm:w-auto min-w-0">
          <Badge className={`text-xs whitespace-nowrap w-fit ${STATUS_COLORS[lead.status]}`}>
            {STATUS_LABELS[lead.status]}
          </Badge>
          {lead.status !== "converted" && (
            <Select
              value={lead.status}
              onValueChange={(val) => handleStatusChange(lead.id || lead._id, val)}
            >
              <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs select-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).filter(([k]) => k !== "converted").map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {lead.status !== "converted" && lead.status !== "lost" && (
            <Button
              size="sm"
              className="text-xs h-8 gap-1 w-full sm:w-auto"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); setConvertModal({ leadId: lead.id || lead._id, leadName: lead.fullName, email: lead.email, phone: lead.phone }); }}
            >
              <UserPlus className="w-3 h-3" /> Convert
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-3 sm:p-6 space-y-4 font-sans h-full flex flex-col w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0 min-w-0">
        <div className="min-w-0">
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-foreground">CRM — Lead Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage intake inquiries and convert to client matters.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto min-w-0">
          <div className="relative min-w-0 flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 h-9 text-sm w-full"
              placeholder="Search leads…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-muted rounded-md p-1 shrink-0 self-start">
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={`p-1.5 rounded-sm transition-colors ${view === "kanban" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="Kanban view"
            >
              <KanbanSquare className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`p-1.5 rounded-sm transition-colors ${view === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="List view"
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Pipeline KPIs: scrollable chips on phone (no page overflow), 5-col on large screens */}
      <div className="flex-shrink-0 min-w-0 -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="flex lg:grid lg:grid-cols-5 gap-2 sm:gap-3 overflow-x-auto lg:overflow-visible pb-1 snap-x snap-mandatory lg:snap-none">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <Card
              key={key}
              className={`min-w-[140px] sm:min-w-[160px] lg:min-w-0 snap-start shrink-0 lg:shrink ${key === "converted" ? "border-green-500/30" : ""}`}
            >
              <CardContent className="p-3 text-center">
                <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                  {leads.filter((l: any) => l.status === key).length}
                </p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-snug px-0.5">
                  {label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {view === "kanban" ? (
        <div className="flex-1 min-w-0 mt-1 flex flex-col overflow-hidden">
          <p className="md:hidden text-xs text-muted-foreground mb-2 shrink-0">
            Swipe sideways to browse pipeline stages.
          </p>
          <div className="flex-1 min-w-0 overflow-x-auto overscroll-x-contain pb-4">
            <div className="flex gap-3 sm:gap-4 w-max max-w-none h-full min-h-[420px]">
              {Object.keys(STATUS_LABELS).map((statusKey) => {
                const colLeads = filteredLeads.filter((l: any) => l.status === statusKey);
                return (
                  <div
                    key={statusKey}
                    className="w-[min(280px,85vw)] sm:w-72 md:w-80 flex flex-col bg-secondary/20 rounded-xl border border-border/40 min-h-[420px] max-h-[min(750px,70vh)] shrink-0"
                  >
                    <div className="p-3 border-b border-border/40 flex items-center justify-between gap-2 bg-card/50 rounded-t-xl sticky top-0 z-10">
                      <h3 className="font-semibold text-sm text-foreground truncate">{STATUS_LABELS[statusKey]}</h3>
                      <Badge variant="secondary" className="text-xs shrink-0">{colLeads.length}</Badge>
                    </div>
                    <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-0">
                      {colLeads.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No leads</p>
                      ) : (
                        colLeads.map((lead: any) => (
                          <LeadCard key={lead.id || lead._id} lead={lead} isKanban={true} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <Card className="flex-1 mt-2">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-semibold font-serif flex items-center justify-between">
              <span>List View</span>
              <span className="text-sm font-normal text-muted-foreground">{filteredLeads.length} total</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {paginatedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No leads found.</p>
              ) : (
                paginatedItems.map((lead: any) => (
                  <LeadCard key={lead.id || lead._id} lead={lead} isKanban={false} />
                ))
              )}
            </div>
            {paginatedItems.length > 0 && (
              <div className="p-4 border-t border-border">
                <Pagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  onNextPage={nextPage}
                  onPrevPage={prevPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lead Details Modal */}
      {detailsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-end animate-in fade-in-20">
          <div className="bg-card w-full max-w-md h-full shadow-2xl flex flex-col border-l border-border animate-in slide-in-from-right-10">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <h3 className="font-serif text-xl font-bold text-foreground">Lead Details</h3>
              <button onClick={() => setDetailsModal(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold text-foreground">{detailsModal.fullName}</h2>
                  <Badge className={`capitalize ${STATUS_COLORS[detailsModal.status]}`}>{STATUS_LABELS[detailsModal.status]}</Badge>
                </div>
                <div className="space-y-1.5 mt-4">
                  {detailsModal.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" /> {detailsModal.phone}
                    </div>
                  )}
                  {detailsModal.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" /> {detailsModal.email}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Source</p>
                  <Badge variant="secondary" className="capitalize">{detailsModal.source?.replace("_", " ")}</Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Practice Area</p>
                  {detailsModal.practiceAreaInterest ? (
                    <span className="text-sm font-medium">{detailsModal.practiceAreaInterest}</span>
                  ) : <span className="text-sm text-muted-foreground">Unspecified</span>}
                </div>
              </div>

              {detailsModal.message && (
                <div className="pt-4 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Initial Inquiry Message</p>
                  <div className="bg-muted/50 p-3 rounded-md text-sm text-foreground whitespace-pre-wrap">
                    "{detailsModal.message}"
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Pipeline Status</p>
                  <Select
                    value={detailsModal.status}
                    onValueChange={(val) => handleStatusChange(detailsModal.id || detailsModal._id, val)}
                    disabled={detailsModal.status === "converted"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key} disabled={key === "converted"}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Assigned Staff</p>
                  <Select
                    value={detailsModal.assignedTo || "unassigned"}
                    onValueChange={(val) => handleAssigneeChange(detailsModal.id || detailsModal._id, val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {staffUsers.map((u: any) => (
                        <SelectItem key={u.id || u._id} value={u.id || u._id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Internal Notes</p>
                  <Textarea 
                    placeholder="Add internal notes about this lead..."
                    className="resize-none h-24"
                    value={detailsModal.notes || ""}
                    onChange={(e) => setDetailsModal((prev: any) => ({ ...prev, notes: e.target.value }))}
                  />
                  <div className="flex justify-end mt-2">
                    <Button size="sm" onClick={handleSaveNotes} disabled={savingDetails}>
                      {savingDetails ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      Save Notes
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/10 space-y-2">
              {detailsModal.status !== "converted" && detailsModal.status !== "lost" && (
                <>
                  <Button 
                    className="w-full gap-2" 
                    variant="outline"
                    onClick={() => handleGenerateLink(detailsModal.id || detailsModal._id)}
                  >
                    <LinkIcon className="w-4 h-4" />
                    {detailsModal.intakeToken ? "Copy Existing Intake Link" : "Generate Client Intake Link"}
                  </Button>
                  <Button 
                    className="w-full gap-2" 
                    onClick={() => setConvertModal({
                      leadId: detailsModal.id || detailsModal._id,
                      leadName: detailsModal.fullName,
                      email: detailsModal.email,
                      phone: detailsModal.phone,
                    })}
                  >
                    <UserPlus className="w-4 h-4" /> Convert to Client Record
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Convert to Client Modal (re-used) */}
      {convertModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-foreground">Convert to Client</h3>
              <button onClick={() => setConvertModal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Creating a client record for <span className="font-semibold text-foreground">"{convertModal.leadName}"</span>.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Client Type</label>
                <Select value={convertType} onValueChange={(v) => setConvertType(v as any)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {convertType === "corporate" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Company Name</label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. Himalaya Trading Pvt. Ltd."
                    value={convertCompany}
                    onChange={(e) => setConvertCompany(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setConvertModal(null)}>Cancel</Button>
              <Button className="flex-1 gap-1" onClick={handleConvertSubmit} disabled={converting}>
                {converting ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                Confirm Convert
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
