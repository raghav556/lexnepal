import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "@/client/navigation";
import { useSearchParams } from "next/navigation";
import {
  DashboardButton,
  DashboardSection,
  DashboardStatusLabel,
  DualDateDisplay,
  PortalPageShell,
  StatusBadge,
} from "@/components/dashboard";
import { getDashboardStatusTone, DASHBOARD_TONE_PANEL_CLASSES } from "@/lib/dashboard-semantics";
import {
  CalendarDays,
  Clock,
  User,
  ArrowLeft,
  Loader2,
  Save,
  CheckSquare,
  DollarSign,
  Plus,
  FolderTree,
  Scale,
  FileArchive,
  Zap,
  Users,
  MessageSquare,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import { useCase, useCaseCommands } from "@/client/queries/cases";
import { useClients } from "@/client/queries/clients";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useStaffDirectory } from "@/client/queries/identity";
import { useHearings } from "@/client/queries/hearings";
import { useDocuments } from "@/client/queries/documents";
import { useTasks, useTaskCommands, useSopTemplates, useUpdateTask } from "@/client/queries/tasks";
import { useTimeEntries, useExpenses } from "@/client/queries/financial";
import { MatterChatPanel } from "@/components/messages/MatterChatPanel";
import { cn } from "@/lib/utils.ts";
import { formatTaskDue } from "@/lib/task-constants.ts";

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
  const searchParams = useSearchParams();
  const currentUser = useCurrentUser();

  const caseData = useCase(caseId || null);
  const clients = useClients() || [];
  const users = useStaffDirectory() || [];
  const hearings = useHearings(caseId ? { caseId } : "skip") || [];
  const documents = useDocuments(caseId ? { caseId } : {}) || [];
  const { update: updateCaseAdapter } = useCaseCommands();
  const updateCase = ({ caseId: targetCaseId, ...input }: any) =>
    updateCaseAdapter(targetCaseId, input);

  const tasks = useTasks(caseId ? { caseId } : "skip") || [];
  const { data: timeEntries = [] } = useTimeEntries(caseId ? { caseId } : {});
  const { data: expenses = [] } = useExpenses(caseId ? { caseId } : {});
  const { createTask, runSop } = useTaskCommands();
  const updateTask = useUpdateTask();
  const sopTemplates = useSopTemplates() || [];
  const practiceSops = (() => {
    if (!caseData?.practiceArea) return sopTemplates;
    const area = String(caseData.practiceArea).toLowerCase();
    const matched = sopTemplates.filter(
      (s: any) => s.practiceArea && area.includes(String(s.practiceArea).toLowerCase()),
    );
    return matched.length > 0 ? matched : sopTemplates;
  })();

  const tabFromQuery = searchParams.get("tab");
  const modeFromQuery = searchParams.get("mode");
  const [activeTab, setActiveTab] = useState(tabFromQuery === "messages" ? "messages" : "tasks");
  const [messageStream, setMessageStream] = useState<"client" | "team">(
    modeFromQuery === "team" ? "team" : "client",
  );
  useEffect(() => {
    if (tabFromQuery === "messages") setActiveTab("messages");
    if (modeFromQuery === "team") setMessageStream("team");
    if (modeFromQuery === "client") setMessageStream("client");
  }, [tabFromQuery, modeFromQuery]);

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

  const triggerSOP = async (templateKey: string) => {
    if (!caseId || !currentUser) return;
    setIsAddingTask(true);
    try {
      const res = await runSop(templateKey, caseId, currentUser._id);
      toast.success(
        `${(res as any).label}: ${(res as any).created} added, ${(res as any).skipped} skipped (already exist).`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to execute SOP.");
    } finally {
      setIsAddingTask(false);
    }
  };

  if (caseData === undefined) {
    return (
      <PortalPageShell portal="staff" loading loadingLabel="Loading matter…" title="Case">
        {null}
      </PortalPageShell>
    );
  }
  if (caseData === null) {
    return (
      <PortalPageShell
        portal="staff"
        title="Case not found"
        description="This matter could not be loaded."
      >
        <DashboardButton variant="secondary" size="sm" onClick={() => navigate("/staff/cases")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Return to cases
        </DashboardButton>
      </PortalPageShell>
    );
  }

  const client = clients.find((c: any) => c._id === caseData.clientId);
  const lawyer = users.find((u: any) => u._id === caseData.assignedLawyerId);

  // Financial Ledger Data
  const totalWIP = timeEntries.reduce(
    (sum: number, entry: any) =>
      sum + (entry.isBillable ? (entry.minutes / 60) * entry.ratePerHour : 0),
    0,
  );
  const unbilledExpenses = expenses
    .filter((e: any) => e.status !== "invoiced" && e.status !== "paid")
    .reduce((sum: number, e: any) => sum + e.amount, 0);
  // Mock Retainer data (In a real app, this would come from a Trust/Retainer table)
  const retainerBalance = 150000;
  const totalCost = totalWIP + unbilledExpenses;
  const healthPercent = Math.max(
    0,
    Math.min(100, ((retainerBalance - totalCost) / retainerBalance) * 100),
  );

  return (
    <PortalPageShell
      portal="staff"
      decorated
      showTodayDate
      className="print:p-0 print:space-y-0"
      eyebrow={`LEX-${caseData.caseNumber}`}
      title={caseData.title}
      description={caseData.description || "No case description provided."}
      icon={Scale}
      actions={
        isEditing ? (
          <div className="flex items-center gap-2">
            <DashboardButton size="sm" variant="secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </DashboardButton>
            <DashboardButton size="sm" onClick={handleUpdateCase} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" /> Save
                </>
              )}
            </DashboardButton>
          </div>
        ) : (
          <DashboardButton size="sm" variant="secondary" onClick={startEditing}>
            Edit details
          </DashboardButton>
        )
      }
      heroChildren={
        <div className="flex items-center gap-2 flex-wrap">
          <DashboardStatusLabel
            status={caseData.status}
            className="text-[10px] uppercase tracking-wider font-bold"
          />
          <StatusBadge tone="information" className="text-[10px] uppercase">
            {caseData.practiceArea}
          </StatusBadge>
        </div>
      }
    >
      <div className="print:hidden space-y-6">
        <div className="flex items-center gap-2">
          <DashboardButton
            variant="ghost"
            size="sm"
            className="p-1 h-auto"
            onClick={() => navigate("/staff/cases")}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
          </DashboardButton>
        </div>

        {isEditing ? (
          <DashboardSection title="Quick editor" state="selected">
            <div className="space-y-3">
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
            </div>
          </DashboardSection>
        ) : (
          <DashboardSection title="Matter overview">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Client / Retainer",
                  value: client ? client.fullName : "Unknown",
                  icon: User,
                },
                { label: "Lead Advocate", value: lawyer ? lawyer.name : "Unassigned", icon: Scale },
                {
                  label: "Jurisdiction",
                  value: caseData.court || "Not Specified",
                  icon: CalendarDays,
                },
                { label: "Presiding Judge", value: caseData.judge || "Not Assigned", icon: User },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-dashboard-border bg-dashboard-neutral-soft/50 p-4"
                >
                  <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-1.5">
                    <item.icon className="w-3.5 h-3.5" /> {item.label}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
              {caseData.filingDate ? (
                <div className="rounded-lg border border-dashboard-border bg-dashboard-neutral-soft/50 p-4 col-span-2 lg:col-span-4">
                  <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-1.5">
                    <CalendarDays className="w-3.5 h-3.5" /> Filing date
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    <DualDateDisplay isoDate={caseData.filingDate} />
                  </p>
                </div>
              ) : null}
            </div>
          </DashboardSection>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="overflow-x-auto flex-nowrap w-full justify-start h-auto p-1.5 bg-secondary/50 rounded-lg print:hidden">
            <TabsTrigger
              value="tasks"
              className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-xs px-4"
            >
              <CheckSquare className="w-3.5 h-3.5 mr-2" />
              Tasks & SOPs
            </TabsTrigger>
            <TabsTrigger
              value="messages"
              className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-xs px-4"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger
              value="misl"
              className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-xs px-4"
            >
              <FolderTree className="w-3.5 h-3.5 mr-2" />
              Digital Misl (Files)
            </TabsTrigger>
            <TabsTrigger
              value="parties"
              className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-xs px-4"
            >
              <Users className="w-3.5 h-3.5 mr-2" />
              Parties & Counsel
            </TabsTrigger>
            <TabsTrigger
              value="financials"
              className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-xs px-4"
            >
              <DollarSign className="w-3.5 h-3.5 mr-2" />
              Case Ledger
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-xs px-4"
            >
              <Clock className="w-3.5 h-3.5 mr-2" />
              Timeline
            </TabsTrigger>
          </TabsList>

          {/* 1. Tasks & SOPs */}
          <TabsContent value="tasks" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <DashboardSection title="Active tasks" icon={CheckSquare}>
                  <form onSubmit={handleCreateTask} className="flex gap-2">
                    <Input
                      placeholder="Quick add ad-hoc task..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      disabled={isAddingTask}
                      className="h-9 text-sm"
                    />
                    <Button type="submit" size="sm" disabled={isAddingTask || !newTaskTitle.trim()}>
                      {isAddingTask ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-1" /> Add
                        </>
                      )}
                    </Button>
                  </form>
                  <div className="space-y-2 mt-4">
                    {tasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6 bg-secondary/20 rounded border border-dashed border-border">
                        No tasks assigned.
                      </p>
                    ) : (
                      tasks.map((task: any) => {
                        const assignee = users.find((u: any) => u._id === task.assignedTo);
                        const dueLabel = formatTaskDue(task);
                        return (
                          <div
                            key={task._id}
                            className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${task.status === "done" || task.status === "cancelled" ? "bg-secondary/40 border-border/50 opacity-60" : "bg-card hover:border-primary/30"}`}
                          >
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
                                <p
                                  className={cn(
                                    "text-sm font-semibold",
                                    (task.status === "done" || task.status === "cancelled") &&
                                      "line-through text-muted-foreground",
                                  )}
                                >
                                  {task.title}
                                </p>
                                <div className="flex flex-wrap gap-2 items-center mt-1.5">
                                  {dueLabel && (
                                    <span className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">
                                      Due: {dueLabel}
                                    </span>
                                  )}
                                  <StatusBadge tone="neutral" className="text-[10px] h-4 py-0">
                                    {assignee?.name || "Unassigned"}
                                  </StatusBadge>
                                  <DashboardStatusLabel
                                    status={task.priority}
                                    className="text-[9px] h-4 py-0 uppercase tracking-wider"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </DashboardSection>
              </div>
              <div>
                <DashboardSection
                  title="SOP automation"
                  icon={Zap}
                  className="border-dashboard-primary/25"
                >
                  <p className="text-xs text-muted-foreground mb-4">
                    Instantly generate standard tasks for specific case stages.
                  </p>
                  {practiceSops.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No SOP templates configured.</p>
                  ) : (
                    practiceSops.map((sop: any) => (
                      <Button
                        key={sop._id}
                        variant="outline"
                        className="w-full justify-start text-left h-auto py-3 bg-background hover:bg-primary/5 hover:text-primary transition-all group border-border"
                        onClick={() => triggerSOP(sop.key)}
                        disabled={isAddingTask}
                      >
                        <div>
                          <div className="font-semibold text-sm group-hover:underline">
                            {sop.label}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                            {sop.taskTitles?.length || 0} tasks · {sop.practiceArea || "general"}
                          </div>
                        </div>
                      </Button>
                    ))
                  )}
                </DashboardSection>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="messages" className="mt-6 space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={messageStream === "client" ? "default" : "outline"}
                onClick={() => setMessageStream("client")}
              >
                Client
              </Button>
              <Button
                type="button"
                size="sm"
                variant={messageStream === "team" ? "default" : "outline"}
                onClick={() => setMessageStream("team")}
              >
                Case Team
              </Button>
            </div>
            {caseId ? (
              <MatterChatPanel
                caseId={caseId}
                mode="staff"
                stream={messageStream}
                title={messageStream === "team" ? "Case team discussion" : "Client messages"}
                users={users}
                bordered
                className="h-[min(70vh,640px)]"
              />
            ) : null}
          </TabsContent>

          {/* 2. Digital Misl (Files) */}
          <TabsContent value="misl" className="mt-6">
            <DashboardSection
              title="Digital Misl (E-Brief)"
              icon={FolderTree}
              actions={
                <Button size="sm" variant="outline">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Upload File
                </Button>
              }
            >
              {documents.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <FileArchive className="w-12 h-12 mb-3 opacity-20" />
                  <p>No documents uploaded to this Misl yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {MISL_CATEGORIES.map((category) => {
                    // For mock purposes, just assign docs arbitrarily to categories based on their type or index
                    const catDocs = documents.filter((d: any) => {
                      if (category.id === "pleadings")
                        return d.type?.includes("PDF") || d.title.includes("Agreement");
                      if (category.id === "evidence") return d.type?.includes("Image");
                      if (category.id === "orders")
                        return d.title.includes("Court") || d.title.includes("Order");
                      if (category.id === "misc") return true; // fallback
                      return false;
                    });

                    if (catDocs.length === 0 && category.id !== "misc") return null;

                    return (
                      <div key={category.id} className="group">
                        <div
                          className="flex items-center justify-between p-3 bg-muted/40 cursor-pointer hover:bg-muted/70 transition-colors"
                          onClick={() =>
                            setExpandedMisl((prev) => ({
                              ...prev,
                              [category.id]: !prev[category.id],
                            }))
                          }
                        >
                          <h4 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
                            <FolderTree className="w-3.5 h-3.5 text-muted-foreground" />{" "}
                            {category.label}
                          </h4>
                          <StatusBadge tone="neutral" className="text-[10px] h-5">
                            {catDocs.length}
                          </StatusBadge>
                        </div>
                        {expandedMisl[category.id] && (
                          <div className="p-2 space-y-1 bg-card">
                            {catDocs.length === 0 && (
                              <p className="text-xs text-muted-foreground p-2">Empty binder.</p>
                            )}
                            {catDocs.map((doc: any, idx: number) => (
                              <div
                                key={doc._id}
                                className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 border border-transparent hover:border-border transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                                    {(doc.type || "DOC").substring(0, 3)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-foreground cursor-pointer hover:underline">
                                      {doc.title}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-mono">
                                      Index: {category.id.substring(0, 2).toUpperCase()}-{idx + 1} •{" "}
                                      <DualDateDisplay
                                        isoDate={new Date(doc._creationTime)
                                          .toISOString()
                                          .slice(0, 10)}
                                      />
                                    </p>
                                  </div>
                                </div>
                                <Button size="sm" variant="ghost" className="h-7 text-xs">
                                  View
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </DashboardSection>
          </TabsContent>

          {/* 3. Parties & Counsel */}
          <TabsContent value="parties" className="mt-6">
            <DashboardSection
              title="Parties directory"
              icon={Users}
              actions={
                <Button size="sm" variant="outline">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Party
                </Button>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border rounded-lg p-4 bg-card shadow-xs">
                  <DashboardStatusLabel label="Our client" tone="information" className="mb-2" />
                  <h3 className="font-bold text-lg">{client?.fullName || "N/A"}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Phone: {client?.phone || "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground">Email: {client?.email || "N/A"}</p>
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground">
                      Lead Advocate: {lawyer?.name}
                    </span>
                  </div>
                </div>

                <div className="border border-dashboard-danger/35 rounded-lg p-4 bg-dashboard-danger-soft/40 shadow-xs">
                  <DashboardStatusLabel label="Opposing party" tone="danger" className="mb-2" />
                  <h3 className="font-bold text-lg">
                    {caseData.opposingCounsel || "Not Specified"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Information pending discovery.
                  </p>
                  <div className="mt-3 pt-3 border-t border-dashboard-danger/20 flex justify-end">
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      Edit Opposing
                    </Button>
                  </div>
                </div>
              </div>
            </DashboardSection>
          </TabsContent>

          {/* 4. Case Ledger (Financials) */}
          <TabsContent value="financials" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DashboardSection title="Retainer balance">
                <h3 className="text-2xl font-mono font-bold text-foreground">
                  Rs. {retainerBalance.toLocaleString()}
                </h3>
                <p className="text-xs text-dashboard-success mt-1 font-medium">
                  Deposited into Trust
                </p>
              </DashboardSection>
              <DashboardSection title="WIP & expenses">
                <h3 className="text-2xl font-mono font-bold text-foreground">
                  Rs. {totalCost.toLocaleString()}
                </h3>
                <p className="text-xs text-dashboard-warning mt-1 font-medium">Unbilled Total</p>
              </DashboardSection>
              <DashboardSection title="Health" className="border-dashboard-primary/25">
                <div className="flex justify-between items-center mb-2">
                  <StatusBadge tone="primary" className="text-[10px]">
                    Profitability
                  </StatusBadge>
                </div>
                <h3 className="text-2xl font-mono font-bold text-foreground">
                  {healthPercent.toFixed(1)}%
                </h3>
                <div className="w-full bg-dashboard-border h-1.5 mt-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${healthPercent > 20 ? "bg-dashboard-success" : "bg-dashboard-danger"}`}
                    style={{ width: `${Math.max(healthPercent, 5)}%` }}
                  />
                </div>
              </DashboardSection>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DashboardSection title="Unbilled time (WIP)" icon={Clock}>
                {timeEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No time logged.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {timeEntries.map((te: any) => {
                      const user = users.find((u: any) => u._id === te.userId);
                      return (
                        <div
                          key={te._id}
                          className="p-3 hover:bg-secondary/30 flex justify-between items-center"
                        >
                          <div>
                            <p className="text-sm font-semibold">{te.description}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              {user?.name} · <DualDateDisplay isoDate={te.date} />
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">
                              Rs.{" "}
                              {te.isBillable
                                ? ((te.minutes / 60) * te.ratePerHour).toFixed(2)
                                : "0.00"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {te.minutes}m @ {te.ratePerHour}/hr
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </DashboardSection>

              <DashboardSection title="Court fees & expenses" icon={DollarSign}>
                {expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No expenses logged.
                  </p>
                ) : (
                  <div className="divide-y divide-dashboard-border">
                    {expenses.map((e: any) => (
                      <div
                        key={e._id}
                        className="p-3 hover:bg-dashboard-panel-hover flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-semibold">{e.description}</p>
                          <DashboardStatusLabel
                            label={e.category}
                            tone="neutral"
                            className="mt-1 text-[9px] uppercase"
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">
                            Rs. {e.amount.toLocaleString()}
                          </p>
                          <DashboardStatusLabel
                            status={e.status}
                            className="mt-1 text-[9px] uppercase"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DashboardSection>
            </div>
          </TabsContent>

          {/* 5. Timeline */}
          <TabsContent value="timeline" className="mt-6">
            <DashboardSection title="Case history" icon={Clock}>
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">
                  No timeline events recorded.
                </p>
              ) : (
                <div className="relative border-l-2 border-dashboard-primary/20 ml-3 pl-6 space-y-8 py-2">
                  {timeline.map((event, idx) => (
                    <div key={`${event.key}-${idx}`} className="relative">
                      <div className="absolute -left-[31px] w-4 h-4 bg-dashboard-panel border-2 border-dashboard-primary rounded-full mt-1" />
                      <p className="text-xs font-mono font-bold text-dashboard-primary mb-1">
                        <DualDateDisplay isoDate={event.date} />
                      </p>
                      <h4 className="text-sm font-bold text-foreground">{event.label}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{event.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </DashboardSection>
          </TabsContent>
        </Tabs>
      </div>
    </PortalPageShell>
  );
}
