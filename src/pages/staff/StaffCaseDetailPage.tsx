import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { CalendarDays, FileText, MessageSquare, Clock, User, ArrowLeft, Loader2, Save, Send, PenTool, CheckSquare, DollarSign, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { TemplateGeneratorModal } from "@/components/documents/TemplateGeneratorModal.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed_won: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  closed_lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  inquiry: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function StaffCaseDetailPage() {
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();

  const caseData = useQuery(api.cases.getCase, caseId ? { caseId: caseId as any } : "skip");
  const clients = useQuery(api.clients.listClients, {}) || [];
  const users = useQuery(api.users.listStaffDirectory, {}) || [];
  const hearings = useQuery(api.hearings.listHearings, caseId ? { caseId: caseId as any } : "skip") || [];
  const documents = useQuery(api.documents.listDocuments as any, caseId ? { caseId: caseId as any } : "skip") || [];
  const updateCase = useMutation(api.cases.updateCase);
  const requestSignature = useMutation(api.documents.requestSignature);
  const createEnvelope = useMutation(api.envelopes.createEnvelope);
  const sendEnvelope = useMutation(api.envelopes.sendEnvelope);
  
  const tasks = useQuery(api.tasks.listTasks, caseId ? { caseId: caseId as any } : "skip") || [];
  const timeEntries = useQuery(api.timeEntries.listTimeEntries, caseId ? { caseId: caseId as any } : "skip") || [];
  const expenses = useQuery(api.expenses.list, caseId ? { caseId: caseId as any } : "skip") || [];
  const createTask = useMutation(api.tasks.createTask);
  const updateTask = useMutation(api.tasks.updateTask);
  const [requestingDocId, setRequestingDocId] = useState<string | null>(null);
  const [envelopeDocId, setEnvelopeDocId] = useState<string | null>(null);

  const paginatedMsgs = useQuery(
    api.messages.listMessages,
    caseId ? { caseId: caseId as any, paginationOpts: { numItems: 100, cursor: null } } : "skip",
  );
  const messages = paginatedMsgs?.page || [];
  const sendMessage = useMutation(api.messages.sendMessage);
  const markMessagesRead = useMutation(api.messages.markMessagesRead);

  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [court, setCourt] = useState("");
  const [judge, setJudge] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isInternal, setIsInternal] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (caseId) {
      markMessagesRead({ caseId: caseId as any }).catch(() => {});
    }
  }, [caseId, markMessagesRead, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const timeline = useMemo(() => {
    if (!caseData) return [];
    const events: { key: string; date: string; label: string; detail: string }[] = [];
    if (caseData.filingDate) {
      events.push({
        key: "filed",
        date: caseData.filingDate,
        label: "Case Registered",
        detail: caseData.caseNumber,
      });
    }
    for (const h of hearings as any[]) {
      events.push({
        key: `h-${h._id}`,
        date: h.dateGregorian || h.dateBs || "",
        label: h.purpose || "Hearing",
        detail: `${h.court || ""} · ${h.status}${h.outcome ? ` · ${h.outcome}` : ""}`,
      });
    }
    for (const d of documents as any[]) {
      events.push({
        key: `d-${d._id}`,
        date: d._creationTime ? new Date(d._creationTime).toISOString().slice(0, 10) : "",
        label: `Document: ${d.title}`,
        detail: d.type || "Document",
      });
    }
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [caseData, hearings, documents]);

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

  const handleSendMessage = async () => {
    if (!caseId || !draft.trim()) return;
    try {
      await sendMessage({
        caseId: caseId as any,
        content: draft.trim(),
        isInternal,
        attachmentIds: [],
      });
      setDraft("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send message.");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !newTaskTitle.trim() || !currentUser) return;
    setIsAddingTask(true);
    try {
      await createTask({
        title: newTaskTitle.trim(),
        caseId: caseId as any,
        assignedTo: currentUser._id as any,
        priority: "medium",
      });
      setNewTaskTitle("");
      toast.success("Task added");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add task");
    } finally {
      setIsAddingTask(false);
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

  const totalWIP = timeEntries.reduce((sum: number, entry: any) => 
    sum + (entry.isBillable ? (entry.minutes / 60) * entry.ratePerHour : 0), 0);
  const unbilledExpenses = expenses.filter((e: any) => e.status !== "invoiced" && e.status !== "paid")
    .reduce((sum: number, e: any) => sum + e.amount, 0);

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
          <Card>
            <CardContent className="p-3 bg-primary/5 h-full rounded-xl">
              <p className="text-xs text-primary/80 font-medium flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-primary/60" />
                Financial Summary
              </p>
              <div className="mt-1 space-y-1">
                <p className="text-sm font-bold text-foreground">WIP: Rs. {totalWIP.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Unbilled Exp: Rs. {unbilledExpenses.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="tasks">
        <TabsList className="overflow-x-auto flex-nowrap w-full justify-start h-auto p-1 bg-muted/50">
          <TabsTrigger value="tasks" className="rounded-md data-[state=active]:bg-background"><CheckSquare className="w-3.5 h-3.5 mr-1" />Tasks</TabsTrigger>
          <TabsTrigger value="financials" className="rounded-md data-[state=active]:bg-background"><DollarSign className="w-3.5 h-3.5 mr-1" />Financials</TabsTrigger>
          <TabsTrigger value="hearings" className="rounded-md data-[state=active]:bg-background"><CalendarDays className="w-3.5 h-3.5 mr-1" />Hearings</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-md data-[state=active]:bg-background"><FileText className="w-3.5 h-3.5 mr-1" />Documents</TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-md data-[state=active]:bg-background"><Clock className="w-3.5 h-3.5 mr-1" />Timeline</TabsTrigger>
          <TabsTrigger value="messages" className="rounded-md data-[state=active]:bg-background"><MessageSquare className="w-3.5 h-3.5 mr-1" />Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <form onSubmit={handleCreateTask} className="flex gap-2">
                <Input 
                  placeholder="Quick add task..." 
                  value={newTaskTitle} 
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  disabled={isAddingTask}
                />
                <Button type="submit" disabled={isAddingTask || !newTaskTitle.trim()}>
                  {isAddingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Add</>}
                </Button>
              </form>

              <div className="space-y-2 mt-4">
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No tasks assigned to this case yet.</p>
                ) : (
                  tasks.map((task: any) => {
                    const assignee = users.find((u: any) => u._id === task.assignedTo);
                    return (
                      <div key={task._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5 transition-colors">
                        <div className="flex items-start gap-3">
                          <input 
                            type="checkbox" 
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={task.status === "done"}
                            onChange={(e) => {
                              updateTask({ taskId: task._id, status: e.target.checked ? "done" : "todo" }).catch(() => toast.error("Failed to update"));
                            }}
                          />
                          <div>
                            <p className={cn("text-sm font-medium", task.status === "done" && "line-through text-muted-foreground")}>{task.title}</p>
                            <div className="flex gap-2 items-center mt-1">
                              {task.dueDate && <span className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">Due: {task.dueDate}</span>}
                              <Badge variant="outline" className="text-[10px] h-4 py-0 bg-accent/5">
                                {assignee?.name || "Unassigned"}
                              </Badge>
                              <Badge className={cn("text-[10px] h-4 py-0 capitalize", 
                                task.priority === "urgent" ? "bg-red-100 text-red-800" :
                                task.priority === "high" ? "bg-orange-100 text-orange-800" :
                                task.priority === "medium" ? "bg-blue-100 text-blue-800" :
                                "bg-gray-100 text-gray-800"
                              )}>{task.priority}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financials" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Time Entries (WIP)</h3>
              {timeEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No time logged for this case.</p>
              ) : (
                <div className="space-y-2">
                  {timeEntries.map((te: any) => {
                    const user = users.find((u: any) => u._id === te.userId);
                    return (
                      <div key={te._id} className="flex justify-between items-center p-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">{te.description}</p>
                          <p className="text-xs text-muted-foreground">{user?.name} · {te.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{te.minutes} mins</p>
                          {te.isBillable && <p className="text-xs text-green-600">Rs. {((te.minutes / 60) * te.ratePerHour).toLocaleString()}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Case Expenses</h3>
              {expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expenses logged for this case.</p>
              ) : (
                <div className="space-y-2">
                  {expenses.map((exp: any) => (
                    <div key={exp._id} className="flex justify-between items-center p-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{exp.description}</p>
                        <Badge variant="outline" className="text-[10px] uppercase mt-1">{exp.category.replace("_", " ")}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">Rs. {exp.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground capitalize">{exp.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hearings" className="mt-4 space-y-3">
          {hearings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 bg-card rounded-lg border border-dashed border-border">
              No hearings scheduled for this case yet.
            </p>
          ) : (
            hearings.map((h: any) => (
              <Card key={h._id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex flex-col items-center justify-center text-accent flex-shrink-0">
                      <span className="text-xs font-bold leading-none">{(h.dateBs || "").split(" ")[0]}</span>
                      <span className="text-[10px] leading-none opacity-70 mt-0.5">{(h.dateBs || "").split(" ")[1]}</span>
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium">Case Documents</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsGeneratorOpen(true)}>
                <FileText className="w-4 h-4 mr-2" /> Generate from Template
              </Button>
            </div>
          </div>
          
          <div className="space-y-3">
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 bg-card rounded-lg border border-dashed border-border">
                No documents generated or uploaded for this case yet.
              </p>
            ) : (
              documents.map((doc: any) => (
                <div key={doc._id} className="p-3 bg-card border rounded-lg flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-8 h-8 text-primary opacity-70 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-words">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(doc._creationTime).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">{doc.type}</Badge>
                    {doc.signatureStatus === "signed" ? (
                      <Badge className="text-[10px] bg-green-500/10 text-green-700">Signed</Badge>
                    ) : doc.requiresSignature && doc.signatureStatus === "pending" ? (
                      <Badge className="text-[10px] bg-yellow-500/10 text-yellow-700">Awaiting sign</Badge>
                    ) : !doc.isPrivileged ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8"
                          disabled={requestingDocId === doc._id}
                          onClick={async () => {
                            setRequestingDocId(doc._id);
                            try {
                              await requestSignature({ documentId: doc._id });
                              toast.success("Sent for signature — client notified.");
                            } catch (err: any) {
                              toast.error(err?.message || "Could not request signature.");
                            } finally {
                              setRequestingDocId(null);
                            }
                          }}
                        >
                          {requestingDocId === doc._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <PenTool className="w-3.5 h-3.5 mr-1" /> Sign
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8"
                          disabled={envelopeDocId === doc._id}
                          title="Send multi-signer envelope (case client first)"
                          onClick={async () => {
                            const client = clients.find((c: any) => c._id === caseData?.clientId);
                            if (!client?.userId) {
                              toast.error("Case client has no portal user linked.");
                              return;
                            }
                            setEnvelopeDocId(doc._id);
                            try {
                              const { envelopeId } = await createEnvelope({
                                documentId: doc._id,
                                title: doc.title,
                                routing: "sequential",
                                recipientUserIds: [client.userId as any],
                              });
                              await sendEnvelope({ envelopeId });
                              toast.success("Envelope sent — client notified.");
                            } catch (err: any) {
                              toast.error(err?.message || "Could not create envelope.");
                            } finally {
                              setEnvelopeDocId(null);
                            }
                          }}
                        >
                          {envelopeDocId === doc._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5 mr-1" /> Envelope
                            </>
                          )}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <div className="space-y-3 p-4 bg-card border rounded-lg">
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No timeline events yet.</p>
            ) : (
              timeline.map((event, idx) => (
                <div key={event.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-accent mt-1" />
                    {idx < timeline.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                  </div>
                  <div className="pb-3">
                    <p className="text-sm font-medium text-foreground">{event.label}</p>
                    <p className="text-xs text-muted-foreground">{event.date || "—"} &mdash; {event.detail}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <Card>
            <CardContent className="p-0 flex flex-col h-[420px]">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No notes or messages for this case yet.
                  </p>
                ) : (
                  messages.map((msg: any) => {
                    const sender = users.find((u: any) => u._id === msg.senderId);
                    const isMe = msg.senderId === currentUser?._id;
                    return (
                      <div key={msg._id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                        <div className={cn(
                          "rounded-lg px-3 py-2 max-w-[85%] text-sm border",
                          msg.isInternal
                            ? "bg-muted text-foreground border-border"
                            : isMe
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-foreground border-border",
                        )}>
                          {msg.isInternal && (
                            <p className="text-[10px] uppercase tracking-wide font-semibold opacity-70 mb-1">Internal</p>
                          )}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-[10px] mt-1 opacity-70">
                            {sender?.name || "Unknown"} · {new Date(msg._creationTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="border-t p-3 space-y-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                  Internal note (hidden from client)
                </label>
                <div className="flex gap-2">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={isInternal ? "Add internal note..." : "Message client..."}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendMessage();
                    }}
                  />
                  <Button size="sm" onClick={handleSendMessage} disabled={!draft.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {caseId && caseData && (
        <TemplateGeneratorModal 
          caseId={caseId} 
          clientId={caseData.clientId} 
          open={isGeneratorOpen} 
          onOpenChange={setIsGeneratorOpen} 
        />
      )}
    </div>
  );
}
