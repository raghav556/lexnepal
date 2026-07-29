import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { CalendarDays, FileText, MessageSquare, Clock, User, ArrowLeft, Loader2, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed_won: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  closed_lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  inquiry: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function StaffCaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const caseData = useQuery(api.cases.getCase, { caseId: caseId as any });
  const clients = useQuery(api.clients.listClients, {}) || [];
  const users = useQuery(api.users.listUsers, {}) || [];
  const hearings = useQuery(api.hearings.listHearings, { caseId: caseId as any }) || [];
  const updateCase = useMutation(api.cases.updateCase);

  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [court, setCourt] = useState("");
  const [judge, setJudge] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form state once data arrives
  const startEditing = () => {
    if (caseData) {
      setStatus(caseData.status);
      setCourt(caseData.court || "");
      setJudge(caseData.judge || "");
      setNotes(caseData.description || "");
      setIsEditing(true);
    }
  };

  const handleUpdateCase = async () => {
    if (!caseId) return;
    setIsSaving(true);
    try {
      await updateCase({
        caseId: caseId as any,
        status: status as any,
        court: court || undefined,
        judge: judge || undefined,
        notes: notes || undefined,
      });
      toast.success("Case updated successfully!");
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update case.");
    } finally {
      setIsSaving(false);
    }
  };

  if (caseData === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (caseData === null) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-lg font-semibold text-destructive">Case Not Found</h2>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate("/staff/cases")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Return to Cases
        </Button>
      </div>
    );
  }

  const client = clients.find((c: any) => c._id === caseData.clientId);
  const lawyer = users.find((u: any) => u._id === caseData.assignedLawyerId);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={() => navigate("/staff/cases")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground font-mono">{caseData.caseNumber}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className={`text-xs ${STATUS_COLORS[caseData.status] || "bg-gray-100 text-gray-800"}`}>
              {caseData.status.replace("_", " ")}
            </Badge>
            <Badge variant="secondary" className="text-xs">{caseData.practiceArea}</Badge>
          </div>
          <h1 className="font-serif text-xl font-bold text-foreground">{caseData.title}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">{caseData.description || "No description provided."}</p>
        </div>

        <div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={handleUpdateCase} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Save</>}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={startEditing}>Edit Case Details</Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-primary font-serif">Quick Editor</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Status</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="inquiry">Inquiry</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="closed_won">Closed Won</option>
                  <option value="closed_lost">Closed Lost</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Court</label>
                <Input
                  className="bg-background text-xs"
                  value={court}
                  onChange={(e) => setCourt(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Judge Name</label>
                <Input
                  className="bg-background text-xs"
                  value={judge}
                  onChange={(e) => setJudge(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Notes / Description</label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus-visible:outline-hidden min-h-[60px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Client", value: client ? client.fullName : "Unknown", icon: User },
            { label: "Assigned Lawyer", value: lawyer ? lawyer.name : "Unassigned", icon: User },
            { label: "Court", value: caseData.court || "Not Specified", icon: CalendarDays },
            { label: "Judge", value: caseData.judge || "Not Assigned", icon: User },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <item.icon className="w-3.5 h-3.5 text-muted-foreground/60" />
                  {item.label}
                </p>
                <p className="text-sm font-medium text-foreground mt-0.5">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="hearings">
        <TabsList>
          <TabsTrigger value="hearings"><CalendarDays className="w-3.5 h-3.5 mr-1" />Hearings</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="w-3.5 h-3.5 mr-1" />Documents</TabsTrigger>
          <TabsTrigger value="timeline"><Clock className="w-3.5 h-3.5 mr-1" />Timeline</TabsTrigger>
          <TabsTrigger value="messages"><MessageSquare className="w-3.5 h-3.5 mr-1" />Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="hearings" className="mt-4 space-y-3">
          {hearings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 bg-card rounded-lg border border-dashed border-border">
              No hearings scheduled for this case yet.
            </p>
          ) : (
            hearings.map((h: any, i: number) => (
              <Card key={h._id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex flex-col items-center justify-center text-accent flex-shrink-0">
                      <span className="text-xs font-bold leading-none">{h.dateBs.split(" ")[0]}</span>
                      <span className="text-[10px] leading-none opacity-70 mt-0.5">{h.dateBs.split(" ")[1]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{h.purpose || "Hearing"}</p>
                      <p className="text-xs text-muted-foreground">{h.court} &mdash; {h.time || "N/A"}</p>
                      {h.outcome && <p className="text-xs text-emerald-600 mt-1 font-medium italic">Outcome: {h.outcome}</p>}
                    </div>
                  </div>
                  <Badge className={`text-xs capitalize ${
                    h.status === "completed" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                    h.status === "cancelled" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  }`}>{h.status}</Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <p className="text-sm text-muted-foreground text-center py-8 bg-card rounded-lg border border-dashed border-border">
            Document management is handled in Phase 7. Live storage binding will be wired next.
          </p>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <div className="space-y-3 p-4 bg-card border rounded-lg">
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-accent mt-1" />
                <div className="w-0.5 flex-1 bg-border mt-1" />
              </div>
              <div className="pb-3">
                <p className="text-sm font-medium text-foreground">Case Registered</p>
                <p className="text-xs text-muted-foreground">{caseData.filingDate || "N/A"} &mdash; System</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-accent mt-1" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Conflict Checked & Cleared</p>
                <p className="text-xs text-muted-foreground">Automatic validation completed &mdash; Compliance Officer</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <p className="text-sm text-muted-foreground text-center py-8 bg-card rounded-lg border border-dashed border-border">
            Internal firm notes are handled in Phase 5. Dynamic messaging client will be wired there.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
