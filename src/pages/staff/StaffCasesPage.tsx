import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "react-router-dom";
import { Plus, Search, CalendarDays, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { PRACTICE_AREAS, COURTS } from "@/lib/lex-constants.ts";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed_won: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  closed_lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  inquiry: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function StaffCasesPage() {
  const cases = useQuery(api.cases.listCases, {}) || [];
  const clients = useQuery(api.clients.listClients, {}) || [];
  const users = useQuery(api.users.listUsers, {}) || [];
  const hearings = useQuery(api.hearings.listHearings, {}) || [];
  const createCase = useMutation(api.cases.createCase);

  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Cases</h1>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Case
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by case number, title, client, or lawyer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {filteredCases.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 bg-card rounded-lg border border-dashed border-border">
            No cases found matching your criteria.
          </p>
        ) : (
          filteredCases.map((c: any) => {
            const client = clients.find((cl: any) => cl._id === c.clientId);
            const lawyer = users.find((u: any) => u._id === c.assignedLawyerId);
            const nextHearingObj = hearings.find((h: any) => h.caseId === c._id && h.status === "scheduled");

            return (
              <Card key={c._id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{c.caseNumber}</span>
                        <Badge className={`text-xs ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-800"}`}>
                          {c.status.replace("_", " ")}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">{c.practiceArea}</Badge>
                      </div>
                      <Link to={`/staff/cases/${c._id}`} className="font-semibold text-sm text-foreground hover:text-accent transition-colors">
                        {c.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Client: {client ? client.fullName : "Unknown"} | Lawyer: {lawyer ? lawyer.name : "Unassigned"}
                      </p>
                      {nextHearingObj && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-accent">
                          <CalendarDays className="w-3 h-3" />Next hearing: {nextHearingObj.dateBs}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Case Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-30">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif font-bold text-lg text-primary">Create New Case</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Case Number <span className="text-destructive">*</span></label>
                <Input
                  required
                  placeholder="KTM/2083/123"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Case Title <span className="text-destructive">*</span></label>
                <Input
                  required
                  placeholder="Sharma Land Dispute Case"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Client <span className="text-destructive">*</span></label>
                  <select
                    required
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  >
                    <option value="">Select Client</option>
                    {clients.map((cl: any) => (
                      <option key={cl._id} value={cl._id}>{cl.fullName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Assigned Lawyer <span className="text-destructive">*</span></label>
                  <select
                    required
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                    value={assignedLawyerId}
                    onChange={(e) => setAssignedLawyerId(e.target.value)}
                  >
                    <option value="">Select Lawyer</option>
                    {users
                      .filter((u: any) => u.role !== "client")
                      .map((u: any) => (
                        <option key={u._id} value={u._id}>{u.name || u.email}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Practice Area</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                    value={practiceArea}
                    onChange={(e) => setPracticeArea(e.target.value)}
                  >
                    {PRACTICE_AREAS.map((pa) => (
                      <option key={pa} value={pa}>{pa}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Court Name</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                    value={court}
                    onChange={(e) => setCourt(e.target.value)}
                  >
                    {COURTS.map((c) => (
                      <option key={c} value={c}>{c}</option>
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
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-hidden min-h-[60px]"
                  placeholder="Case notes, key concerns, property numbers..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreateModal(false)}>
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
    </div>
  );
}
