import { useState, useMemo, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, usePathname } from "@/client/navigation";
import { useSearchParams } from "next/navigation";
import { CaseIdentity } from "@/components/cases/case-identity";
import { CaseHearingDialog } from "@/components/cases/case-hearing-dialog";
import {
  CaseMislUploadDialog,
  type CaseMislUploadedFile,
} from "@/components/cases/case-misl-upload-dialog";
import { CasePartiesEditor } from "@/components/cases/case-parties-editor";
import { CaseQueryState } from "@/components/cases/case-query-state";
import { CaseStatusEditorFields } from "@/components/cases/case-status-filters";
import { CaseTeamFields } from "@/components/cases/case-team-fields";
import { DueDateFields } from "@/components/tasks/DueDateFields";
import {
  CASE_DETAIL_HERO_CLASS,
  CASE_DETAIL_TABS_LIST_CLASS,
  CASE_MISL_BINDERS,
  CASE_PARTY_SIDE_LABELS,
  caseStatusWritePayload,
  earliestIncompleteTaskDueIso,
  inferredClosureOutcome,
  mislBinderForType,
  nextRequiredAction,
  nextScheduledHearingIso,
  toLifecycleStatus,
  type CaseClosureOutcome,
  type CaseLifecycleStatus,
  type CaseWorkspaceBasePath,
} from "@/shared/contracts/case-ui";
import {
  DashboardButton,
  DashboardSection,
  DashboardStatusLabel,
  DualDateDisplay,
  HeroStatChip,
  PortalPageShell,
  STAFF_HERO_OUTLINE_BUTTON_CLASS,
  StaffHeroChipRow,
  StatusBadge,
} from "@/components/dashboard";
import {
  CalendarDays,
  Clock,
  User,
  ArrowLeft,
  Loader2,
  Save,
  CheckSquare,
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
import { useCaseQuery, useCaseCommands } from "@/client/queries/cases";
import { caseQueryFailureKind } from "@/client/queries/case-query-error";
import { useClients } from "@/client/queries/clients";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useStaffDirectory } from "@/client/queries/identity";
import { useHearings } from "@/client/queries/hearings";
import {
  SCANNING_INTENT_STATUSES,
  useDocuments,
  useDownloadDocument,
  useWatchDocumentUploadIntents,
} from "@/client/queries/documents";
import { queryKeys } from "@/client/queries/query-keys";
import type { StaffCasePartyDto } from "@/shared/contracts/staff-case";
import { useTasks, useTaskCommands, useSopTemplates, useUpdateTask } from "@/client/queries/tasks";
import { MatterChatPanel } from "@/components/messages/MatterChatPanel";
import { cn } from "@/lib/utils.ts";
import { formatTaskDue } from "@/lib/task-constants.ts";

const CASE_DETAIL_TABS = [
  "overview",
  "tasks",
  "hearings",
  "messages",
  "misl",
  "parties",
  "timeline",
] as const;

function actorUserId(user: { id?: string; _id?: string } | null | undefined): string | undefined {
  return user?.id ?? user?._id;
}

export default function StaffCaseDetailPage() {
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUser = useCurrentUser();
  const isAdminSurface = pathname?.startsWith("/admin") ?? false;
  const portal = isAdminSurface ? "admin" : "staff";
  const basePath: CaseWorkspaceBasePath = isAdminSurface ? "/admin/cases" : "/staff/cases";

  const caseQuery = useCaseQuery(caseId || null);
  const caseData = caseQuery.data;
  const clients = useClients() || [];
  const users = useStaffDirectory() || [];
  const hearings = useHearings(caseId ? { caseId } : "skip") || [];
  const documents = useDocuments(caseId ? { caseId } : "skip");
  const mislDocuments = documents ?? [];
  const downloadDocument = useDownloadDocument();
  const queryClient = useQueryClient();
  const { update: updateCaseAdapter } = useCaseCommands();
  const updateCase = ({ caseId: targetCaseId, ...input }: any) =>
    updateCaseAdapter(targetCaseId, input);

  const tasks = useTasks(caseId ? { caseId } : "skip") || [];
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
  const initialTab =
    tabFromQuery && (CASE_DETAIL_TABS as readonly string[]).includes(tabFromQuery)
      ? tabFromQuery
      : "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [messageStream, setMessageStream] = useState<"client" | "team">(
    modeFromQuery === "team" ? "team" : "client",
  );
  useEffect(() => {
    if (tabFromQuery && (CASE_DETAIL_TABS as readonly string[]).includes(tabFromQuery)) {
      setActiveTab(tabFromQuery);
    }
    if (modeFromQuery === "team") setMessageStream("team");
    if (modeFromQuery === "client") setMessageStream("client");
  }, [tabFromQuery, modeFromQuery]);

  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<CaseLifecycleStatus>("active");
  const [closureOutcome, setClosureOutcome] = useState<CaseClosureOutcome | null>(null);
  const [court, setCourt] = useState("");
  const [judge, setJudge] = useState("");
  const [opposingCounsel, setOpposingCounsel] = useState("");
  const [description, setDescription] = useState("");
  const [clientSummary, setClientSummary] = useState("");
  const [assignedLawyerId, setAssignedLawyerId] = useState("");
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskDueDateBs, setNewTaskDueDateBs] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [hearingDialogOpen, setHearingDialogOpen] = useState(false);
  const [mislUploadOpen, setMislUploadOpen] = useState(false);
  const [pendingMisl, setPendingMisl] = useState<CaseMislUploadedFile[]>([]);

  const [expandedMisl, setExpandedMisl] = useState<Record<string, boolean>>({
    pleadings: true,
    evidence: true,
    orders: true,
    annexure: true,
    misc: true,
  });

  const scanningMislIds = pendingMisl
    .filter((item) => SCANNING_INTENT_STATUSES.has(item.status))
    .map((item) => item.intentId);

  const handlePendingMislUpdate = useCallback(
    (intent: { intentId: string; status: string; documentId: string | null }) => {
      if (intent.status === "promoted") {
        setPendingMisl((prev) => prev.filter((item) => item.intentId !== intent.intentId));
        void queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
        toast.success("Document is now on this case Misl.");
        return;
      }
      setPendingMisl((prev) =>
        prev.map((item) => (item.intentId === intent.intentId ? { ...item, ...intent } : item)),
      );
      if (intent.status === "rejected") {
        toast.error("A Misl upload was rejected during scanning.");
      }
    },
    [queryClient],
  );

  useWatchDocumentUploadIntents(scanningMislIds, handlePendingMislUpdate);

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
    for (const task of tasks as any[]) {
      const due = task.dueDate ? String(task.dueDate).slice(0, 10) : "";
      if (!due) continue;
      events.push({
        key: `t-${task._id}`,
        date: due,
        label: `Task: ${task.title}`,
        detail: `${task.status || "todo"}${task.clientVisible ? " · visible to client" : ""}`,
      });
    }
    for (const d of mislDocuments as any[]) {
      events.push({
        key: `d-${d._id}`,
        date: d._creationTime ? new Date(d._creationTime).toISOString().slice(0, 10) : "",
        label: `Document: ${d.title}`,
        detail: d.type || "Document",
      });
    }
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [caseData, hearings, mislDocuments, tasks]);

  const startEditing = () => {
    if (caseData) {
      setStatus(toLifecycleStatus(caseData.status));
      setClosureOutcome(inferredClosureOutcome(caseData.status, caseData.closureOutcome));
      setCourt(caseData.court || "");
      setJudge(caseData.judge || "");
      setOpposingCounsel(caseData.opposingCounsel || "");
      setDescription(caseData.description || "");
      setClientSummary(caseData.clientSummary || "");
      const leadId = String(caseData.assignedLawyerId || "");
      setAssignedLawyerId(leadId);
      setTeamMemberIds(
        [...new Set([leadId, ...((caseData.teamMemberIds as string[] | undefined) ?? [])])].filter(
          Boolean,
        ),
      );
      setIsEditing(true);
    }
  };

  const handleUpdateCase = async () => {
    if (!caseId) return;
    setIsSaving(true);
    try {
      const statusWrite = caseStatusWritePayload(status, closureOutcome);
      await updateCase({
        caseId: caseId as any,
        status: statusWrite.status,
        closureOutcome: statusWrite.closureOutcome,
        court: court || undefined,
        judge: judge || undefined,
        opposingCounsel: opposingCounsel || undefined,
        description: description || null,
        clientSummary: clientSummary || null,
        assignedLawyerId: assignedLawyerId || undefined,
        teamMemberIds,
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
        assignedTo: actorUserId(currentUser) as any,
        priority: "medium",
        dueDate: newTaskDueDate || undefined,
        dueDateBs: newTaskDueDateBs || undefined,
      });
      setNewTaskTitle("");
      setNewTaskDueDate("");
      setNewTaskDueDateBs("");
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
      const res = await runSop(templateKey, caseId, actorUserId(currentUser));
      toast.success(
        `${(res as any).label}: ${(res as any).created} added, ${(res as any).skipped} skipped (already exist).`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to execute SOP.");
    } finally {
      setIsAddingTask(false);
    }
  };

  if (!caseId || caseQuery.isError) {
    const kind = !caseId ? "not_found" : caseQueryFailureKind(caseQuery.error);
    return (
      <CaseQueryState
        portal={portal}
        kind={kind}
        scope="detail"
        backHref={basePath}
        onRetry={
          caseQuery.isError
            ? () => {
                void caseQuery.refetch();
              }
            : undefined
        }
      />
    );
  }
  if (caseQuery.isPending || caseData === undefined) {
    return (
      <PortalPageShell portal={portal} loading loadingLabel="Loading matter…" title="Case">
        {null}
      </PortalPageShell>
    );
  }
  if (caseData === null) {
    return <CaseQueryState portal={portal} kind="not_found" scope="detail" backHref={basePath} />;
  }

  const client = clients.find((c: any) => c._id === caseData.clientId);
  const lawyer = users.find((u: any) => u._id === caseData.assignedLawyerId);
  const parties = ((caseData.parties ?? []) as StaffCasePartyDto[]).slice();
  const nextHearingIso = nextScheduledHearingIso(
    hearings as Array<{ status?: string; dateGregorian?: string | null }>,
    (caseData.nextHearing as string | null | undefined) ?? null,
  );
  const nextTaskIso =
    earliestIncompleteTaskDueIso(tasks as Array<{ status?: string; dueDate?: string | null }>) ||
    (caseData.nextTaskDue as string | null | undefined) ||
    null;
  const nextAction = nextRequiredAction(nextHearingIso, nextTaskIso);
  const teamIds = new Set<string>([
    String(caseData.assignedLawyerId || ""),
    ...((caseData.teamMemberIds as string[] | undefined) ?? []),
  ]);
  const teamRoster = users.filter((user: any) => teamIds.has(user._id) || teamIds.has(user.id));

  return (
    <PortalPageShell
      portal={portal}
      className="print:p-0 print:space-y-0"
      title={caseData.title}
      description={caseData.description || "No case description provided."}
      icon={Scale}
      heroClassName={CASE_DETAIL_HERO_CLASS}
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
          <>
            <DashboardButton size="sm" onClick={startEditing}>
              Edit details
            </DashboardButton>
            <DashboardButton
              size="sm"
              variant="outline"
              className={STAFF_HERO_OUTLINE_BUTTON_CLASS}
              aria-label="Back to cases"
              onClick={() => navigate(basePath)}
            >
              <ArrowLeft className="size-3.5" aria-hidden /> Cases
            </DashboardButton>
          </>
        )
      }
      heroChildren={
        <StaffHeroChipRow>
          <HeroStatChip icon={CalendarDays} value={hearings.length} label="hearings" />
          <HeroStatChip icon={CheckSquare} value={tasks.length} label="tasks" />
          <HeroStatChip icon={FileArchive} value={mislDocuments.length} label="documents" />
        </StaffHeroChipRow>
      }
    >
      <div className="print:hidden space-y-6">
        <div className="flex items-center gap-2">
          <DashboardButton
            variant="ghost"
            size="sm"
            className="p-1 h-auto"
            aria-label="Back to cases"
            onClick={() => navigate(basePath)}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
          </DashboardButton>
          <CaseIdentity
            caseNumber={caseData.caseNumber}
            status={caseData.status}
            closureOutcome={caseData.closureOutcome}
            practiceArea={caseData.practiceArea}
          />
        </div>

        {isEditing ? (
          <DashboardSection title="Quick editor" state="selected">
            <div className="space-y-3">
              <CaseStatusEditorFields
                status={status}
                closureOutcome={closureOutcome}
                onStatusChange={setStatus}
                onOutcomeChange={setClosureOutcome}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Court</label>
                  <Input
                    className="bg-background text-xs"
                    value={court}
                    onChange={(e) => setCourt(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Judge Name</label>
                  <Input
                    className="bg-background text-xs"
                    value={judge}
                    onChange={(e) => setJudge(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Opposing counsel</label>
                <Input
                  className="bg-background text-xs"
                  value={opposingCounsel}
                  onChange={(e) => setOpposingCounsel(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" htmlFor="case-internal-description">
                  Internal Case Description
                </label>
                <textarea
                  id="case-internal-description"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus-visible:outline-hidden min-h-[60px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" htmlFor="case-client-summary">
                  Client-visible Summary
                </label>
                <textarea
                  id="case-client-summary"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus-visible:outline-hidden min-h-[60px]"
                  value={clientSummary}
                  onChange={(e) => setClientSummary(e.target.value)}
                />
              </div>
              <CaseTeamFields
                lawyers={users}
                assignedLawyerId={assignedLawyerId}
                teamMemberIds={teamMemberIds}
                onLeadChange={setAssignedLawyerId}
                onTeamChange={setTeamMemberIds}
              />
            </div>
          </DashboardSection>
        ) : (
          <DashboardSection title="Matter overview" className="max-sm:hidden">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Client",
                  value: client ? client.fullName : "Unknown",
                  icon: User,
                },
                {
                  label: "Responsible Lawyer",
                  value: lawyer ? lawyer.name : "Unassigned",
                  icon: Scale,
                },
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
              <div className="rounded-lg border border-dashboard-border bg-dashboard-neutral-soft/50 p-4 col-span-2">
                <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-1.5">
                  <Clock className="w-3.5 h-3.5" /> Next required action
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {nextAction ? (
                    <>
                      {nextAction.kind === "hearing" ? "Hearing" : "Task"} ·{" "}
                      <DualDateDisplay isoDate={nextAction.iso} />
                    </>
                  ) : (
                    "None scheduled"
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-dashboard-border bg-dashboard-neutral-soft/50 p-4">
                <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> Next hearing
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {nextHearingIso ? (
                    <DualDateDisplay isoDate={String(nextHearingIso)} />
                  ) : (
                    "None scheduled"
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-dashboard-border bg-dashboard-neutral-soft/50 p-4">
                <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-1.5">
                  <CheckSquare className="w-3.5 h-3.5" /> Next task date
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {nextTaskIso ? <DualDateDisplay isoDate={String(nextTaskIso)} /> : "None due"}
                </p>
              </div>
              {caseData.filingDate ? (
                <div className="rounded-lg border border-dashboard-border bg-dashboard-neutral-soft/50 p-4 col-span-2">
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
          <TabsList
            aria-label="Case sections"
            className={`${CASE_DETAIL_TABS_LIST_CLASS} bg-secondary/50 rounded-lg print:hidden`}
          >
            <TabsTrigger
              value="overview"
              className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-xs px-4"
            >
              <Scale className="w-3.5 h-3.5 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-xs px-4"
            >
              <CheckSquare className="w-3.5 h-3.5 mr-2" />
              Tasks & SOPs
            </TabsTrigger>
            <TabsTrigger
              value="hearings"
              className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-xs px-4"
            >
              <CalendarDays className="w-3.5 h-3.5 mr-2" />
              Hearings
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
              value="timeline"
              className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-xs px-4"
            >
              <Clock className="w-3.5 h-3.5 mr-2" />
              Timeline
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-6 space-y-4">
            <DashboardSection title="File notes">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-1.5">
                    Internal Case Description
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {caseData.description || "No internal description."}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-1.5">
                    Client-visible Summary
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {caseData.clientSummary || "No client-visible summary."}
                  </p>
                </div>
              </div>
            </DashboardSection>
            <DashboardSection title="Case Team" icon={Users}>
              {teamRoster.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team members assigned.</p>
              ) : (
                <ul className="space-y-2">
                  {teamRoster.map((member: any) => {
                    const isLead =
                      member._id === caseData.assignedLawyerId ||
                      member.id === caseData.assignedLawyerId;
                    return (
                      <li
                        key={member._id || member.id}
                        className="flex items-center justify-between rounded-md border border-dashboard-border px-3 py-2 text-sm"
                      >
                        <span>{member.name || member.email}</span>
                        {isLead ? (
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Responsible Lawyer
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Team
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </DashboardSection>
            <DashboardSection
              title="Parties"
              icon={Users}
              actions={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("parties")}
                >
                  Manage parties
                </Button>
              }
            >
              {parties.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No case parties yet. The CRM instructing client is not added automatically.
                </p>
              ) : (
                <ul className="space-y-2">
                  {parties.map((party) => (
                    <li
                      key={party.id}
                      className="flex items-center justify-between rounded-md border border-dashboard-border px-3 py-2 text-sm"
                    >
                      <span>
                        {party.name}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {CASE_PARTY_SIDE_LABELS[party.side]}
                          {party.roleLabel ? ` · ${party.roleLabel}` : ""}
                        </span>
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {party.clientVisible ? "Visible to client" : "Staff only"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardSection>
          </TabsContent>

          {/* 1. Tasks & SOPs */}
          <TabsContent value="tasks" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <DashboardSection title="Active tasks" icon={CheckSquare}>
                  <form onSubmit={handleCreateTask} className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Quick add ad-hoc task..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        disabled={isAddingTask}
                        className="h-9 text-sm"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isAddingTask || !newTaskTitle.trim()}
                      >
                        {isAddingTask ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-1" /> Add
                          </>
                        )}
                      </Button>
                    </div>
                    <DueDateFields
                      idPrefix="case-task"
                      dueDate={newTaskDueDate}
                      dueDateBs={newTaskDueDateBs}
                      onDueDateChange={(ad, bs) => {
                        setNewTaskDueDate(ad);
                        setNewTaskDueDateBs(bs);
                      }}
                      onDueDateBsChange={setNewTaskDueDateBs}
                    />
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

          <TabsContent value="hearings" className="mt-6">
            <DashboardSection
              title="Hearings"
              icon={CalendarDays}
              actions={
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => setHearingDialogOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Schedule hearing
                </Button>
              }
            >
              {(hearings as any[]).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No hearings on this file.
                </p>
              ) : (
                <div className="space-y-2">
                  {(hearings as any[]).map((hearing) => (
                    <div
                      key={hearing._id || hearing.id}
                      className="flex items-center justify-between rounded-lg border border-dashboard-border p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold">{hearing.purpose || "Hearing"}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {hearing.court || caseData.court || "Court not set"} · {hearing.status}
                        </p>
                      </div>
                      {hearing.dateGregorian || hearing.dateBs ? (
                        <DualDateDisplay isoDate={hearing.dateGregorian || hearing.dateBs} />
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </DashboardSection>
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
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => setMislUploadOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Upload File
                </Button>
              }
            >
              {documents === undefined && pendingMisl.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <Loader2 className="w-8 h-8 mb-3 animate-spin opacity-40" />
                  <p>Loading this case Misl…</p>
                </div>
              ) : mislDocuments.length === 0 && pendingMisl.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <FileArchive className="w-12 h-12 mb-3 opacity-20" />
                  <p>No documents uploaded to this Misl yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {CASE_MISL_BINDERS.map((category) => {
                    const catDocs = mislDocuments.filter(
                      (d: any) => mislBinderForType(d.type) === category.id,
                    );
                    const catPending = pendingMisl.filter(
                      (item) => mislBinderForType(item.type) === category.id,
                    );

                    if (catDocs.length === 0 && catPending.length === 0 && category.id !== "misc") {
                      return null;
                    }

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
                            {catDocs.length + catPending.length}
                          </StatusBadge>
                        </div>
                        {expandedMisl[category.id] && (
                          <div className="p-2 space-y-1 bg-card">
                            {catDocs.length === 0 && catPending.length === 0 && (
                              <p className="text-xs text-muted-foreground p-2">Empty binder.</p>
                            )}
                            {catPending.map((item) => (
                              <div
                                key={item.intentId}
                                className="flex items-center justify-between p-2 rounded-md border border-dashed border-border"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground">
                                    {SCANNING_INTENT_STATUSES.has(item.status) ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <FileArchive className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">
                                      {item.title}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-mono">
                                      {item.status === "rejected"
                                        ? "Rejected during scanning"
                                        : "Scanning — not on this Misl yet"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
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
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const url = await downloadDocument(doc.id ?? doc._id);
                                      window.open(url, "_blank", "noopener,noreferrer");
                                    } catch (error: unknown) {
                                      toast.error(
                                        error instanceof Error
                                          ? error.message
                                          : "Failed to open document.",
                                      );
                                    }
                                  }}
                                >
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
          <TabsContent value="parties" className="mt-6 space-y-4">
            <DashboardSection title="CRM client" icon={User}>
              <div className="border border-border rounded-lg p-4 bg-card shadow-xs">
                <h3 className="font-bold text-lg">{client?.fullName || "N/A"}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Phone: {client?.phone || "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">Email: {client?.email || "N/A"}</p>
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    Responsible Lawyer: {lawyer?.name || "Unassigned"}
                  </span>
                </div>
              </div>
            </DashboardSection>
            <CasePartiesEditor
              caseId={String(caseId)}
              parties={parties}
              clients={clients.map((entry: any) => ({
                _id: entry._id ?? entry.id,
                fullName: entry.fullName,
              }))}
            />
          </TabsContent>

          {/* 4. Timeline */}
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
      {caseId ? (
        <>
          <CaseHearingDialog
            open={hearingDialogOpen}
            onOpenChange={setHearingDialogOpen}
            caseId={String(caseId)}
            defaultCourt={caseData.court}
            defaultJudge={caseData.judge}
          />
          <CaseMislUploadDialog
            open={mislUploadOpen}
            onOpenChange={setMislUploadOpen}
            caseId={String(caseId)}
            onUploaded={(file) => {
              setExpandedMisl((prev) => ({
                ...prev,
                [mislBinderForType(file.type)]: true,
              }));
              if (file.status !== "promoted") {
                setPendingMisl((prev) => [
                  ...prev.filter((item) => item.intentId !== file.intentId),
                  file,
                ]);
              }
            }}
          />
        </>
      ) : null}
    </PortalPageShell>
  );
}
