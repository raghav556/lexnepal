import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { 
  CalendarDays, FileText, Clock, User, ArrowLeft, Loader2, Save, PenTool, CheckSquare, 
  DollarSign, Plus, FolderTree, Scale, FileArchive, ArrowRight, Zap, Users,
  Printer, Link as LinkIcon, Bold, Italic, List, Underline, Highlighter, Trash2, Cloud, CloudOff
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import { PRIORITY_COLORS, formatTaskDue } from "@/lib/task-constants.ts";

type BriefSaveStatus = "idle" | "unsaved" | "saving" | "saved";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed_won: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  closed_lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  inquiry: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const MISL_CATEGORIES = [
  { id: "pleadings", label: "Pleadings (Firad/Pratiuttar)" },
  { id: "evidence", label: "Evidence (Praman)" },
  { id: "orders", label: "Court Orders (Aadesh)" },
  { id: "annexure", label: "Annexures & Exhibits" },
  { id: "misc", label: "Miscellaneous (Others)" },
];

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
  
  const tasks = useQuery(api.tasks.listTasks, caseId ? { caseId: caseId as any } : "skip") || [];
  const timeEntries = useQuery(api.timeEntries.listTimeEntries, caseId ? { caseId: caseId as any } : "skip") || [];
  const expenses = useQuery(api.expenses.list, caseId ? { caseId: caseId as any } : "skip") || [];
  const createTask = useMutation(api.tasks.createTask);
  const updateTask = useMutation(api.tasks.updateTask);
  const runSop = useMutation(api.tasks.runSop);
  const sopTemplates = useQuery(api.tasks.listSopTemplates, {}) || [];
  const practiceSops = (() => {
    if (!caseData?.practiceArea) return sopTemplates;
    const area = String(caseData.practiceArea).toLowerCase();
    const matched = sopTemplates.filter((s: any) =>
      s.practiceArea && area.includes(String(s.practiceArea).toLowerCase()),
    );
    return matched.length > 0 ? matched : sopTemplates;
  })();

  const briefs = (useQuery((api as any).briefs.list as any, caseId ? { caseId: caseId as any } : "skip") || []) as any[];
  const createBrief = useMutation((api as any).briefs.create as any);
  const updateBrief = useMutation((api as any).briefs.update as any);
  const deleteBrief = useMutation((api as any).briefs.delete as any);
  const researchNotes = (useQuery((api as any).research.listNotes as any, {}) || []) as any[];

  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [court, setCourt] = useState("");
  const [judge, setJudge] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  
  // E-Misl State
  const [expandedMisl, setExpandedMisl] = useState<Record<string, boolean>>({
    pleadings: true,
    evidence: true,
    orders: true,
  });

  // Trial Briefs State
  const [selectedBrief, setSelectedBrief] = useState<any | null>(null);
  const [briefContent, setBriefContent] = useState("");
  const [briefTitle, setBriefTitle] = useState("");
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [briefSaveStatus, setBriefSaveStatus] = useState<BriefSaveStatus>("idle");
  const editorRef = useRef<HTMLDivElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedBriefId = useRef<string | null>(null);

  const timeline = useMemo(() => {
    if (!caseData) return [];
    const events: { key: string; date: string; label: string; detail: string }[] = [];
    if (caseData.filingDate) {
      events.push({ key: "filed", date: caseData.filingDate, label: "Case Registered", detail: caseData.caseNumber });
    }
    for (const h of hearings as any[]) {
      events.push({ key: `h-${h._id}`, date: h.dateGregorian || h.dateBs || "", label: h.purpose || "Hearing", detail: `${h.court || ""} · ${h.status}${h.outcome ? ` · ${h.outcome}` : ""}` });
    }
    for (const d of documents as any[]) {
      events.push({ key: `d-${d._id}`, date: d._creationTime ? new Date(d._creationTime).toISOString().slice(0, 10) : "", label: `Document: ${d.title}`, detail: d.type || "Document" });
    }
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [caseData, hearings, documents]);

  const startEditing = () => {
    if (caseData) {
      setStatus(caseData.status); setCourt(caseData.court || ""); setJudge(caseData.judge || ""); setNotes(caseData.description || ""); setIsEditing(true);
    }
  };

  const handleUpdateCase = async () => {
    if (!caseId) return;
    setIsSaving(true);
    try {
      await updateCase({
        caseId: caseId as any, status: status as any, court: court || undefined, judge: judge || undefined, notes: notes || undefined,
      });
      toast.success("Case updated successfully!");
      setIsEditing(false);
    } catch (err: any) { toast.error(err?.message || "Failed to update case."); } finally { setIsSaving(false); }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !newTaskTitle.trim() || !currentUser) return;
    setIsAddingTask(true);
    try {
      await createTask({ title: newTaskTitle.trim(), caseId: caseId as any, assignedTo: currentUser._id as any, priority: "medium" });
      setNewTaskTitle(""); toast.success("Task added");
    } catch (err: any) { toast.error(err?.message || "Failed to add task"); } finally { setIsAddingTask(false); }
  };

  const selectBrief = useCallback((brief: any) => {
    setSelectedBrief(brief);
    setBriefTitle(brief.title);
    setBriefContent(brief.content || "");
    setShowMentionMenu(false);
    setMentionQuery("");
    setBriefSaveStatus("idle");
    loadedBriefId.current = null;
  }, []);

  const persistBrief = useCallback(async (opts?: { silent?: boolean }) => {
    if (!selectedBrief || !editorRef.current) return;
    const content = editorRef.current.innerHTML;
    setBriefContent(content);
    setBriefSaveStatus("saving");
    try {
      await updateBrief({ id: selectedBrief._id, title: briefTitle, content });
      setSelectedBrief((prev: any) => prev ? { ...prev, title: briefTitle, content, lastModified: Date.now() } : prev);
      setBriefSaveStatus("saved");
      if (!opts?.silent) toast.success("Brief saved");
    } catch {
      setBriefSaveStatus("unsaved");
      toast.error("Failed to save brief");
    }
  }, [selectedBrief, briefTitle, updateBrief]);

  const scheduleAutosave = useCallback(() => {
    setBriefSaveStatus("unsaved");
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void persistBrief({ silent: true });
    }, 1200);
  }, [persistBrief]);

  useEffect(() => {
    if (!selectedBrief || !editorRef.current) return;
    if (loadedBriefId.current === selectedBrief._id) return;
    editorRef.current.innerHTML = selectedBrief.content || "";
    loadedBriefId.current = selectedBrief._id;
  }, [selectedBrief]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  const handleCreateBrief = async () => {
    if (!caseId || !currentUser) return;
    try {
      const newId = await createBrief({
        caseId: caseId as any,
        title: "Untitled Hearing Brief",
        content: "<p></p>",
        authorId: currentUser._id as any,
      });
      selectBrief({
        _id: newId,
        caseId,
        title: "Untitled Hearing Brief",
        content: "<p></p>",
        authorId: currentUser._id,
        lastModified: Date.now(),
      });
      toast.success("Brief created");
    } catch {
      toast.error("Failed to create brief");
    }
  };

  const handleDeleteBrief = async () => {
    if (!selectedBrief) return;
    try {
      await deleteBrief({ id: selectedBrief._id });
      setSelectedBrief(null);
      setBriefTitle("");
      setBriefContent("");
      loadedBriefId.current = null;
      setBriefSaveStatus("idle");
      toast.success("Brief deleted");
    } catch {
      toast.error("Failed to delete brief");
    }
  };

  const handlePrintBrief = () => {
    if (editorRef.current) setBriefContent(editorRef.current.innerHTML);
    window.print();
  };

  const applyFormat = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    const ok = document.execCommand(command, false, value);
    if (!ok && command === "hiliteColor") {
      document.execCommand("backColor", false, value);
    }
    if (editorRef.current) setBriefContent(editorRef.current.innerHTML);
    scheduleAutosave();
  };

  const removeMentionQueryAtCursor = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent) return;
    const text = node.textContent;
    const upToCursor = text.slice(0, range.startOffset);
    const atIdx = upToCursor.lastIndexOf("@");
    if (atIdx === -1) return;
    const del = document.createRange();
    del.setStart(node, atIdx);
    del.setEnd(node, range.startOffset);
    del.deleteContents();
    sel.removeAllRanges();
    const after = document.createRange();
    after.setStart(node, atIdx);
    after.collapse(true);
    sel.addRange(after);
  };

  const insertMention = (title: string, link: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    removeMentionQueryAtCursor();
    const safeTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    document.execCommand(
      "insertHTML",
      false,
      `<a href="${link}" class="text-primary underline font-semibold bg-primary/10 px-1 rounded" contenteditable="false">@${safeTitle}</a>&nbsp;`,
    );
    setBriefContent(editor.innerHTML);
    setShowMentionMenu(false);
    setMentionQuery("");
    scheduleAutosave();
  };

  const handleEditorInput = () => {
    const editor = editorRef.current;
    if (!editor) return;
    setBriefContent(editor.innerHTML);
    const text = editor.innerText || "";
    const words = text.split(/[\s\u00a0]+/);
    const lastWord = words[words.length - 1] || "";
    if (lastWord.startsWith("@")) {
      setShowMentionMenu(true);
      setMentionQuery(lastWord.slice(1));
    } else {
      setShowMentionMenu(false);
    }
    scheduleAutosave();
  };

  const filteredDocs = documents.filter((d: any) =>
    d.title.toLowerCase().includes(mentionQuery.toLowerCase()),
  );
  const filteredPrecedents = researchNotes.filter((n: any) =>
    n.title.toLowerCase().includes(mentionQuery.toLowerCase()),
  );

  const triggerSOP = async (templateKey: string) => {
    if (!caseId || !currentUser) return;
    setIsAddingTask(true);
    try {
      const res = await runSop({
        templateKey,
        caseId: caseId as any,
        assignedTo: currentUser._id as any,
      });
      toast.success(`${(res as any).label}: ${(res as any).created} added, ${(res as any).skipped} skipped (already exist).`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to execute SOP.");
    } finally {
      setIsAddingTask(false);
    }
  };

  if (caseData === undefined) return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (caseData === null) return <div className="p-6 text-center"><h2 className="text-lg font-semibold text-destructive">Case Not Found</h2><Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate("/staff/cases")}><ArrowLeft className="w-4 h-4 mr-1" /> Return to Cases</Button></div>;

  const client = clients.find((c: any) => c._id === caseData.clientId);
  const lawyer = users.find((u: any) => u._id === caseData.assignedLawyerId);

  // Financial Ledger Data
  const totalWIP = timeEntries.reduce((sum: number, entry: any) => sum + (entry.isBillable ? (entry.minutes / 60) * entry.ratePerHour : 0), 0);
  const unbilledExpenses = expenses.filter((e: any) => e.status !== "invoiced" && e.status !== "paid").reduce((sum: number, e: any) => sum + e.amount, 0);
  // Mock Retainer data (In a real app, this would come from a Trust/Retainer table)
  const retainerBalance = 150000; 
  const totalCost = totalWIP + unbilledExpenses;
  const healthPercent = Math.max(0, Math.min(100, (retainerBalance - totalCost) / retainerBalance * 100));

  return (
    <div className="p-4 sm:p-6 space-y-6 font-sans print:p-0 print:space-y-0">
      <div className="print:hidden space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={() => navigate("/staff/cases")}><ArrowLeft className="w-4 h-4" /></Button>
          <span className="text-xs text-muted-foreground font-mono">LEX-{caseData.caseNumber}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge className={`text-[10px] uppercase tracking-wider font-bold ${STATUS_COLORS[caseData.status] || "bg-gray-100 text-gray-800"}`}>
                {caseData.status.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase text-primary/80 border-primary/20 bg-primary/5">{caseData.practiceArea}</Badge>
            </div>
            <h1 className="font-serif text-3xl font-bold text-foreground tracking-tight">{caseData.title}</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">{caseData.description || "No case description provided."}</p>
          </div>

          <div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleUpdateCase} disabled={isSaving}>{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Save</>}</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={startEditing}>Edit Details</Button>
            )}
          </div>
        </div>

        {isEditing ? (
          <Card className="border-accent/20 bg-accent/5">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-primary font-serif">Quick Editor</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs font-medium">Status</label><select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden" value={status} onChange={(e) => setStatus(e.target.value)}><option value="inquiry">Inquiry</option><option value="active">Active</option><option value="on_hold">On Hold</option><option value="closed_won">Closed Won</option><option value="closed_lost">Closed Lost</option></select></div>
                <div className="space-y-1"><label className="text-xs font-medium">Court</label><Input className="bg-background text-xs" value={court} onChange={(e) => setCourt(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs font-medium">Judge Name</label><Input className="bg-background text-xs" value={judge} onChange={(e) => setJudge(e.target.value)} /></div>
                <div className="space-y-1"><label className="text-xs font-medium">Notes / Description</label><textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus-visible:outline-hidden min-h-[60px]" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Client / Retainer", value: client ? client.fullName : "Unknown", icon: User },
              { label: "Lead Advocate", value: lawyer ? lawyer.name : "Unassigned", icon: Scale },
              { label: "Jurisdiction", value: caseData.court || "Not Specified", icon: CalendarDays },
              { label: "Presiding Judge", value: caseData.judge || "Not Assigned", icon: User },
            ].map((item) => (
              <Card key={item.label} className="border-border/60 shadow-xs bg-card/50">
                <CardContent className="p-4">
                  <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-1.5">
                    <item.icon className="w-3.5 h-3.5" /> {item.label}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Tabs defaultValue="tasks">
        <TabsList className="overflow-x-auto flex-nowrap w-full justify-start h-auto p-1.5 bg-secondary/50 rounded-lg print:hidden">
          <TabsTrigger value="tasks" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-xs px-4"><CheckSquare className="w-3.5 h-3.5 mr-2" />Tasks & SOPs</TabsTrigger>
          <TabsTrigger value="misl" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-xs px-4"><FolderTree className="w-3.5 h-3.5 mr-2" />Digital Misl (Files)</TabsTrigger>
          <TabsTrigger value="parties" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-xs px-4"><Users className="w-3.5 h-3.5 mr-2" />Parties & Counsel</TabsTrigger>
          <TabsTrigger value="financials" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-xs px-4"><DollarSign className="w-3.5 h-3.5 mr-2" />Case Ledger</TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-xs px-4"><Clock className="w-3.5 h-3.5 mr-2" />Timeline</TabsTrigger>
          <TabsTrigger value="briefs" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-xs px-4"><FileText className="w-3.5 h-3.5 mr-2" />Trial Briefs & Memos</TabsTrigger>
        </TabsList>

        {/* 1. Tasks & SOPs */}
        <TabsContent value="tasks" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Card>
                <CardHeader className="py-4 border-b border-border bg-secondary/20">
                  <CardTitle className="text-sm font-bold flex items-center gap-2"><CheckSquare className="w-4 h-4 text-primary" /> Active Tasks</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <form onSubmit={handleCreateTask} className="flex gap-2">
                    <Input placeholder="Quick add ad-hoc task..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} disabled={isAddingTask} className="h-9 text-sm" />
                    <Button type="submit" size="sm" disabled={isAddingTask || !newTaskTitle.trim()}>{isAddingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Add</>}</Button>
                  </form>
                  <div className="space-y-2 mt-4">
                    {tasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6 bg-secondary/20 rounded border border-dashed border-border">No tasks assigned.</p>
                    ) : (
                      tasks.map((task: any) => {
                        const assignee = users.find((u: any) => u._id === task.assignedTo);
                        const dueLabel = formatTaskDue(task);
                        return (
                          <div key={task._id} className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${task.status === "done" || task.status === "cancelled" ? 'bg-secondary/40 border-border/50 opacity-60' : 'bg-card hover:border-primary/30'}`}>
                            <div className="flex items-start gap-3 w-full">
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                checked={task.status === "done"}
                                disabled={task.status === "cancelled"}
                                onChange={(e) => {
                                  updateTask({
                                    taskId: task._id,
                                    status: e.target.checked ? "done" : "in_progress",
                                  }).catch(() => toast.error("Failed to update"));
                                }}
                              />
                              <div className="flex-1">
                                <p className={cn("text-sm font-semibold", (task.status === "done" || task.status === "cancelled") && "line-through text-muted-foreground")}>{task.title}</p>
                                <div className="flex flex-wrap gap-2 items-center mt-1.5">
                                  {dueLabel && <span className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">Due: {dueLabel}</span>}
                                  <Badge variant="outline" className="text-[10px] h-4 py-0 bg-background">{assignee?.name || "Unassigned"}</Badge>
                                  <Badge className={cn("text-[9px] h-4 py-0 uppercase tracking-wider", PRIORITY_COLORS[task.priority])}>{task.priority}</Badge>
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
            </div>
            <div>
              <Card className="border-primary/20 shadow-primary/5">
                <CardHeader className="py-4 border-b border-primary/10 bg-primary/5">
                  <CardTitle className="text-sm font-bold text-primary flex items-center gap-2"><Zap className="w-4 h-4" /> SOP Automation</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs text-muted-foreground mb-4">Instantly generate standard tasks for specific case stages.</p>
                  {practiceSops.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No SOP templates configured.</p>
                  ) : (
                    practiceSops.map((sop: any) => (
                      <Button key={sop._id} variant="outline" className="w-full justify-start text-left h-auto py-3 bg-background hover:bg-primary/5 hover:text-primary transition-all group border-border" onClick={() => triggerSOP(sop.key)} disabled={isAddingTask}>
                        <div>
                          <div className="font-semibold text-sm group-hover:underline">{sop.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                            {sop.taskTitles?.length || 0} tasks · {sop.practiceArea || "general"}
                          </div>
                        </div>
                      </Button>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 2. Digital Misl (Files) */}
        <TabsContent value="misl" className="mt-6">
          <Card>
            <CardHeader className="py-4 border-b border-border flex flex-row items-center justify-between bg-secondary/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2"><FolderTree className="w-4 h-4 text-primary" /> Digital Misl (E-Brief)</CardTitle>
              <Button size="sm" variant="outline"><Plus className="w-3.5 h-3.5 mr-1"/> Upload File</Button>
            </CardHeader>
            <CardContent className="p-0">
              {documents.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <FileArchive className="w-12 h-12 mb-3 opacity-20" />
                  <p>No documents uploaded to this Misl yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {MISL_CATEGORIES.map(category => {
                    // For mock purposes, just assign docs arbitrarily to categories based on their type or index
                    const catDocs = documents.filter((d: any) => {
                      if (category.id === "pleadings") return d.type?.includes("PDF") || d.title.includes("Agreement");
                      if (category.id === "evidence") return d.type?.includes("Image");
                      if (category.id === "orders") return d.title.includes("Court") || d.title.includes("Order");
                      if (category.id === "misc") return true; // fallback
                      return false;
                    });
                    
                    if (catDocs.length === 0 && category.id !== "misc") return null;

                    return (
                      <div key={category.id} className="group">
                        <div 
                          className="flex items-center justify-between p-3 bg-muted/40 cursor-pointer hover:bg-muted/70 transition-colors"
                          onClick={() => setExpandedMisl(prev => ({ ...prev, [category.id]: !prev[category.id] }))}
                        >
                          <h4 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
                            <FolderTree className="w-3.5 h-3.5 text-muted-foreground" /> {category.label}
                          </h4>
                          <Badge variant="secondary" className="text-[10px] h-5">{catDocs.length}</Badge>
                        </div>
                        {expandedMisl[category.id] && (
                          <div className="p-2 space-y-1 bg-card">
                            {catDocs.length === 0 && <p className="text-xs text-muted-foreground p-2">Empty binder.</p>}
                            {catDocs.map((doc: any, idx: number) => (
                              <div key={doc._id} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 border border-transparent hover:border-border transition-all">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                                    {(doc.type || "DOC").substring(0, 3)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-foreground cursor-pointer hover:underline">{doc.title}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">
                                      Index: {category.id.substring(0,2).toUpperCase()}-{idx+1} • {new Date(doc._creationTime).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <Button size="sm" variant="ghost" className="h-7 text-xs">View</Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Parties & Counsel */}
        <TabsContent value="parties" className="mt-6">
          <Card>
            <CardHeader className="py-4 border-b border-border flex flex-row items-center justify-between bg-secondary/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Parties Directory</CardTitle>
              <Button size="sm" variant="outline"><Plus className="w-3.5 h-3.5 mr-1"/> Add Party</Button>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border rounded-lg p-4 bg-card shadow-xs">
                  <Badge className="bg-blue-100 text-blue-800 mb-2">Our Client</Badge>
                  <h3 className="font-bold text-lg">{client?.fullName || "N/A"}</h3>
                  <p className="text-sm text-muted-foreground mt-1">Phone: {client?.phone || "N/A"}</p>
                  <p className="text-sm text-muted-foreground">Email: {client?.email || "N/A"}</p>
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground">Lead Advocate: {lawyer?.name}</span>
                  </div>
                </div>

                <div className="border border-red-200 rounded-lg p-4 bg-red-50/30 shadow-xs">
                  <Badge className="bg-red-100 text-red-800 mb-2 border-red-200">Opposing Party</Badge>
                  <h3 className="font-bold text-lg">{caseData.opposingCounsel || "Not Specified"}</h3>
                  <p className="text-sm text-muted-foreground mt-1 text-red-900/60">Information pending discovery.</p>
                  <div className="mt-3 pt-3 border-t border-red-100 flex justify-end">
                    <Button variant="outline" size="sm" className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-100">Edit Opposing</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Case Ledger (Financials) */}
        <TabsContent value="financials" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card shadow-xs border-border">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Retainer Balance</p>
                <h3 className="text-2xl font-mono font-bold text-foreground">Rs. {retainerBalance.toLocaleString()}</h3>
                <p className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1">Deposited into Trust</p>
              </CardContent>
            </Card>
            <Card className="bg-card shadow-xs border-border">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">WIP & Expenses</p>
                <h3 className="text-2xl font-mono font-bold text-foreground">Rs. {totalCost.toLocaleString()}</h3>
                <p className="text-xs text-amber-600 mt-1 font-medium flex items-center gap-1">Unbilled Total</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 shadow-xs border-primary/20">
              <CardContent className="p-5">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">Health</p>
                  <Badge variant="outline" className="text-[10px] bg-background border-primary/20 text-primary">Profitability</Badge>
                </div>
                <h3 className="text-2xl font-mono font-bold text-foreground">{healthPercent.toFixed(1)}%</h3>
                <div className="w-full bg-border h-1.5 mt-2 rounded-full overflow-hidden">
                  <div className={`h-full ${healthPercent > 20 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.max(healthPercent, 5)}%` }} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="py-4 border-b border-border bg-secondary/10">
                <CardTitle className="text-sm font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Unbilled Time (WIP)</CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[300px] overflow-y-auto">
                {timeEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No time logged.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {timeEntries.map((te: any) => {
                      const user = users.find((u: any) => u._id === te.userId);
                      return (
                        <div key={te._id} className="p-3 hover:bg-secondary/30 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-semibold">{te.description}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{user?.name} · {te.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">Rs. {te.isBillable ? ((te.minutes / 60) * te.ratePerHour).toFixed(2) : "0.00"}</p>
                            <p className="text-[10px] text-muted-foreground">{te.minutes}m @ {te.ratePerHour}/hr</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4 border-b border-border bg-secondary/10">
                <CardTitle className="text-sm font-bold flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Court Fees & Expenses</CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[300px] overflow-y-auto">
                {expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No expenses logged.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {expenses.map((e: any) => (
                      <div key={e._id} className="p-3 hover:bg-secondary/30 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-semibold">{e.description}</p>
                          <Badge variant="outline" className="mt-1 text-[9px] uppercase">{e.category}</Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">Rs. {e.amount.toLocaleString()}</p>
                          <Badge className={cn("mt-1 text-[9px] uppercase", e.status === "approved" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800")}>{e.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 5. Timeline */}
        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader className="py-4 border-b border-border bg-secondary/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Case History</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">No timeline events recorded.</p>
              ) : (
                <div className="relative border-l-2 border-primary/20 ml-3 pl-6 space-y-8 py-2">
                  {timeline.map((event, idx) => (
                    <div key={`${event.key}-${idx}`} className="relative">
                      <div className="absolute -left-[31px] w-4 h-4 bg-background border-2 border-primary rounded-full mt-1" />
                      <p className="text-xs font-mono font-bold text-primary mb-1">{event.date}</p>
                      <h4 className="text-sm font-bold text-foreground">{event.label}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{event.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. Trial Briefs */}
        <TabsContent value="briefs" className="mt-6 h-[600px] flex gap-4 print:mt-0 print:h-auto print:block">
          
          {/* Print Letterhead (Only visible on print) */}
          <div className="hidden print:block w-full mb-8 border-b-2 border-black pb-4 text-black">
             <h1 className="text-3xl font-serif font-bold text-center uppercase tracking-widest">Srimar Law</h1>
             <p className="text-center text-sm font-mono mt-1">Trial Brief & Bench Memo</p>
             <div className="flex justify-between mt-6 text-sm font-bold">
               <p>Case: {caseData.caseNumber} — {caseData.title}</p>
               <p>Date: {new Date().toLocaleDateString()}</p>
             </div>
             {briefTitle && <p className="mt-4 text-lg font-serif font-bold text-center">{briefTitle}</p>}
          </div>

          {/* Left Sidebar: Brief List */}
          <Card className="w-1/3 flex flex-col overflow-hidden print:hidden border-border bg-card shadow-xs">
            <CardHeader className="py-3 border-b border-border bg-secondary/10 flex flex-row items-center justify-between shrink-0">
              <CardTitle className="text-sm font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Case Briefs</CardTitle>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCreateBrief}><Plus className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent className="flex-1 p-2 overflow-y-auto space-y-1 bg-muted/10">
              {briefs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center mt-6">No briefs created yet.</p>
              ) : (
                briefs.map((b) => (
                  <div 
                    key={b._id} 
                    onClick={() => selectBrief(b)}
                    className={cn("p-3 rounded-lg border cursor-pointer transition-all text-left", selectedBrief?._id === b._id ? "bg-primary/5 border-primary/50 shadow-sm" : "bg-background border-border hover:border-primary/30")}
                  >
                    <h4 className="text-xs font-bold font-serif line-clamp-1">{b.title}</h4>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(b.lastModified).toLocaleDateString()}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Right Canvas: RichText Editor */}
          <Card className="flex-1 flex flex-col overflow-visible print:border-none print:shadow-none print:bg-transparent bg-card shadow-xs">
            {!selectedBrief ? (
               <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground print:hidden">
                 <PenTool className="w-12 h-12 mb-3 opacity-20" />
                 <p className="text-sm">Select or create a trial brief to start drafting.</p>
               </div>
            ) : (
               <>
                 <CardHeader className="py-3 border-b border-border bg-background shrink-0 print:hidden flex flex-row justify-between items-center z-10 gap-3">
                    <Input
                      className="font-serif text-lg font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto"
                      value={briefTitle}
                      onChange={(e) => { setBriefTitle(e.target.value); scheduleAutosave(); }}
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "hidden sm:inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide",
                        briefSaveStatus === "saving" && "text-muted-foreground",
                        briefSaveStatus === "saved" && "text-emerald-600",
                        briefSaveStatus === "unsaved" && "text-amber-600",
                        briefSaveStatus === "idle" && "text-muted-foreground/60",
                      )}>
                        {briefSaveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> Syncing</>}
                        {briefSaveStatus === "saved" && <><Cloud className="w-3 h-3" /> Saved</>}
                        {briefSaveStatus === "unsaved" && <><CloudOff className="w-3 h-3" /> Unsaved</>}
                        {briefSaveStatus === "idle" && <><Cloud className="w-3 h-3" /> Ready</>}
                      </span>
                      <Button variant="outline" size="sm" onClick={handlePrintBrief}><Printer className="w-4 h-4 mr-2" /> Print PDF</Button>
                      <Button size="sm" onClick={() => void persistBrief()} disabled={briefSaveStatus === "saving"}>
                        {briefSaveStatus === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Save</>}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDeleteBrief} title="Delete brief">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                 </CardHeader>
                 
                 {/* RichText Toolbar */}
                 <div className="px-4 py-2 border-b border-border bg-muted/30 flex flex-wrap items-center gap-1 print:hidden">
                   <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat("bold")}><Bold className="w-3.5 h-3.5" /></Button>
                   <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat("italic")}><Italic className="w-3.5 h-3.5" /></Button>
                   <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Underline" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat("underline")}><Underline className="w-3.5 h-3.5" /></Button>
                   <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Bulleted list" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat("insertUnorderedList")}><List className="w-3.5 h-3.5" /></Button>
                   <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Highlight" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat("hiliteColor", "#fef08a")}><Highlighter className="w-3.5 h-3.5" /></Button>
                   <div className="w-px h-5 bg-border mx-2 self-center" />
                   <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onMouseDown={(e) => e.preventDefault()} onClick={() => { editorRef.current?.focus(); document.execCommand("insertText", false, "@"); setShowMentionMenu(true); setMentionQuery(""); }}>
                     <LinkIcon className="w-3.5 h-3.5 mr-1" /> Mention Docs
                   </Button>
                 </div>

                 <CardContent className="flex-1 p-0 relative h-full print:h-auto">
                    <div className="absolute inset-0 p-8 overflow-y-auto print:static print:p-0 print:overflow-visible">
                      <div className="max-w-3xl mx-auto h-full relative font-serif text-base leading-loose print:max-w-none">
                        <div
                          ref={editorRef}
                          className="w-full min-h-[400px] outline-none prose prose-sm dark:prose-invert max-w-none print:hidden"
                          contentEditable
                          suppressContentEditableWarning
                          onInput={handleEditorInput}
                          onBlur={() => {
                            if (editorRef.current) setBriefContent(editorRef.current.innerHTML);
                          }}
                        />

                        <div className="hidden print:block prose prose-sm max-w-none font-serif text-black leading-relaxed" dangerouslySetInnerHTML={{ __html: briefContent || selectedBrief.content }} />

                        {showMentionMenu && (
                          <div className="absolute top-10 left-10 w-72 bg-background border border-border shadow-xl rounded-lg overflow-hidden z-50 print:hidden">
                            <div className="bg-primary/5 px-3 py-2 border-b border-border">
                              <p className="text-[10px] font-bold text-primary uppercase">Link to Evidence or Precedent</p>
                              {mentionQuery && <p className="text-[10px] text-muted-foreground mt-0.5">Filter: @{mentionQuery}</p>}
                            </div>
                            <div className="max-h-56 overflow-y-auto">
                               {filteredDocs.length > 0 && (
                                 <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40">Digital Misl</div>
                               )}
                               {filteredDocs.map((doc: any) => (
                                 <button key={doc._id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertMention(doc.title, `/staff/cases/${caseId}?misl=${doc._id}`)} className="w-full text-left px-3 py-2 text-xs hover:bg-muted border-b border-border flex items-center gap-2">
                                   <FolderTree className="w-3 h-3 text-muted-foreground shrink-0" /> <span className="line-clamp-1">{doc.title}</span>
                                 </button>
                               ))}
                               {filteredPrecedents.length > 0 && (
                                 <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40">Research Vault</div>
                               )}
                               {filteredPrecedents.map((note: any) => (
                                 <button key={note._id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertMention(note.title, `/staff/research?note=${note._id}`)} className="w-full text-left px-3 py-2 text-xs hover:bg-muted border-b border-border flex items-center gap-2">
                                   <Scale className="w-3 h-3 text-muted-foreground shrink-0" /> <span className="line-clamp-1">{note.title}</span>
                                 </button>
                               ))}
                               {filteredDocs.length === 0 && filteredPrecedents.length === 0 && (
                                 <p className="px-3 py-4 text-xs text-muted-foreground text-center">No matching evidence or precedents.</p>
                               )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                 </CardContent>
               </>
            )}
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  );
}
