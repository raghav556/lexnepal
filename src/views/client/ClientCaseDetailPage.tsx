"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  ArrowLeft,
  CalendarDays,
  CheckSquare,
  Circle,
  FileText,
  FolderOpen,
  Loader2,
  MessageSquare,
  ShieldAlert,
  User,
  Scale,
} from "lucide-react";
import { useCase } from "@/client/queries/cases";
import { useMyTeam } from "@/client/queries/clients";
import { useHearings } from "@/client/queries/hearings";
import { useDocuments, useDownloadDocument } from "@/client/queries/documents";
import { useTasks } from "@/client/queries/tasks";
import { useMessages } from "@/client/queries/communication";
import { formatTaskDue, TASK_STATUS_LABELS, type TaskStatus } from "@/lib/task-constants.ts";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import {
  DashboardButton,
  DashboardListRow,
  DashboardListSkeleton,
  DashboardSection,
  DashboardStatusLabel,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";

function DocDownload({ documentId }: { documentId: string }) {
  const downloadDocument = useDownloadDocument();
  const [busy, setBusy] = useState(false);
  return (
    <DashboardButton
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const url = await downloadDocument(documentId);
          if (url) window.open(String(url), "_blank");
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Download failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Download"}
    </DashboardButton>
  );
}

export default function ClientCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const caseId = params?.id || "";
  const caseData = useCase(caseId || null);
  const team = useMyTeam() || [];
  const hearings = useHearings(caseId ? { caseId } : "skip") || [];
  const documents = useDocuments(caseId ? { caseId } : {}) || [];
  const tasks = useTasks(caseId ? { caseId } : "skip") || [];
  const { data: messagesResponse } = useMessages(caseId || "", false);
  const messages = messagesResponse?.page || [];

  const lawyer = useMemo(
    () =>
      team.find((u) => u._id === caseData?.assignedLawyerId || u.id === caseData?.assignedLawyerId),
    [team, caseData?.assignedLawyerId],
  );

  const checklist = useMemo(
    () =>
      tasks.filter(
        (t: { clientVisible?: boolean; archivedAt?: string; parentTaskId?: string }) =>
          t.clientVisible && !t.archivedAt && !t.parentTaskId,
      ),
    [tasks],
  );
  const checklistDone = checklist.filter((t: { status?: string }) => t.status === "done").length;
  const pendingSignatures = documents.filter(
    (d: any) => d.requiresSignature && d.signatureStatus === "pending",
  ).length;
  const nextHearing = hearings.find((h: { status?: string }) => h.status === "scheduled");

  if (caseData === undefined) {
    return (
      <PortalPageShell
        portal="client"
        loading
        loadingLabel="Loading matter details…"
        title="Case Details"
      >
        <div />
      </PortalPageShell>
    );
  }

  if (caseData === null) {
    return (
      <PortalPageShell
        portal="client"
        eyebrow="Case not found"
        title="Matter unavailable"
        description="This case is unavailable or is not linked to your portal account."
        icon={FolderOpen}
      >
        <EmptyState
          title="Case unavailable"
          description="This case could not be loaded. Please return to your cases list."
          icon={FolderOpen}
          action={
            <DashboardButton asChild variant="outline" size="sm">
              <Link href="/client/cases">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to cases
              </Link>
            </DashboardButton>
          }
        />
      </PortalPageShell>
    );
  }

  const metrics = [
    {
      label: "Assigned Advocate",
      value: lawyer?.name || "Unassigned",
      icon: User,
      tone: "primary" as const,
      helperText: lawyer?.email || "Firm advocate",
    },
    {
      label: "Court Jurisdiction",
      value: caseData.court || "District Court",
      icon: Scale,
      tone: "neutral" as const,
      helperText: caseData.practiceArea,
    },
    {
      label: "Next Hearing",
      value: nextHearing
        ? String(
            (nextHearing as { dateBs?: string; dateGregorian?: string }).dateBs ||
              (nextHearing as { dateGregorian?: string }).dateGregorian ||
              "Scheduled",
          )
        : "None scheduled",
      icon: CalendarDays,
      tone: nextHearing ? ("warning" as const) : ("neutral" as const),
      helperText: nextHearing?.court || "Upcoming appearance",
    },
    {
      label: "Checklist Progress",
      value: `${checklistDone} / ${checklist.length}`,
      icon: CheckSquare,
      tone:
        checklistDone === checklist.length && checklist.length > 0
          ? ("success" as const)
          : ("information" as const),
      helperText: `${checklist.length - checklistDone} remaining items`,
    },
  ];

  return (
    <PortalPageShell
      portal="client"
      showTodayDate
      eyebrow={`Matter #${caseData.caseNumber}`}
      title={caseData.title}
      description={caseData.description || `Active matter in ${caseData.practiceArea}.`}
      icon={FolderOpen}
      metrics={metrics}
      actions={
        <div className="flex flex-wrap gap-2">
          <DashboardButton asChild variant="secondary" size="sm">
            <Link href="/client/cases">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to cases
            </Link>
          </DashboardButton>
          <DashboardButton asChild size="sm">
            <Link href={`/client/messages?caseId=${caseId}`}>
              <MessageSquare className="w-4 h-4 mr-1.5" /> Message team
            </Link>
          </DashboardButton>
        </div>
      }
    >
      <Tabs defaultValue="overview" className="w-full space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 border border-dashboard-border bg-dashboard-panel p-1 rounded-xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hearings">Hearings ({hearings.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="messages">Messages ({messages.length})</TabsTrigger>
          <TabsTrigger value="checklist">Checklist ({checklist.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {pendingSignatures > 0 ? (
            <DashboardSection className="border-dashboard-warning/40 bg-dashboard-warning-soft">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-dashboard-warning shrink-0" />
                  <p className="text-sm font-medium text-dashboard-warning-foreground">
                    {pendingSignatures} document{pendingSignatures === 1 ? "" : "s"} awaiting your
                    digital signature.
                  </p>
                </div>
                <DashboardButton
                  asChild
                  size="sm"
                  className="bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-foreground shrink-0"
                >
                  <Link href="/client/signatures">Review Signatures</Link>
                </DashboardButton>
              </div>
            </DashboardSection>
          ) : null}

          <DashboardSection title="Matter Details" description="Jurisdiction and classification">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3 bg-dashboard-neutral-soft rounded-lg border border-dashboard-border">
                <span className="text-xs text-muted-foreground block">Case Number</span>
                <span className="text-sm font-mono font-semibold text-foreground">
                  {caseData.caseNumber}
                </span>
              </div>
              <div className="p-3 bg-dashboard-neutral-soft rounded-lg border border-dashboard-border">
                <span className="text-xs text-muted-foreground block">Practice Area</span>
                <span className="text-sm font-semibold text-foreground">
                  {caseData.practiceArea}
                </span>
              </div>
              <div className="p-3 bg-dashboard-neutral-soft rounded-lg border border-dashboard-border">
                <span className="text-xs text-muted-foreground block">Status</span>
                <DashboardStatusLabel status={caseData.status} className="mt-1 text-xs" />
              </div>
            </div>
          </DashboardSection>

          <DashboardSection title="Quick Actions">
            <div className="flex flex-wrap gap-2">
              <DashboardButton asChild variant="outline" size="sm">
                <Link href={`/client/documents?caseId=${caseId}`}>
                  <FolderOpen className="w-4 h-4 mr-1.5" /> All documents
                </Link>
              </DashboardButton>
              <DashboardButton asChild variant="outline" size="sm">
                <Link href={`/client/messages?caseId=${caseId}`}>
                  <MessageSquare className="w-4 h-4 mr-1.5" /> Open chat
                </Link>
              </DashboardButton>
              <DashboardButton asChild variant="outline" size="sm">
                <Link href="/client/checklist">
                  <CheckSquare className="w-4 h-4 mr-1.5" /> Checklist
                </Link>
              </DashboardButton>
            </div>
          </DashboardSection>
        </TabsContent>

        <TabsContent value="hearings" className="mt-4 space-y-4">
          <DashboardSection
            title="Court Hearings"
            description="Scheduled dates and appearance records"
          >
            {hearings === undefined ? (
              <DashboardListSkeleton rows={3} />
            ) : hearings.length === 0 ? (
              <EmptyState
                title="No hearings on this matter"
                description="Hearings scheduled for this court matter will appear here automatically."
                icon={CalendarDays}
              />
            ) : (
              <div className="space-y-3">
                {hearings.map((h: any) => (
                  <DashboardListRow key={h._id}>
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <CalendarDays className="w-5 h-5 text-dashboard-accent mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {h.dateBs || h.dateGregorian}
                            {h.time ? ` · ${h.time}` : ""}
                          </p>
                          <DashboardStatusLabel status={h.status} className="text-xs" />
                        </div>
                        <p className="text-xs text-dashboard-neutral">
                          {h.court || "Court TBD"}
                          {h.purpose ? ` · Purpose: ${h.purpose}` : ""}
                        </p>
                      </div>
                    </div>
                  </DashboardListRow>
                ))}
              </div>
            )}
          </DashboardSection>
        </TabsContent>

        <TabsContent value="documents" className="mt-4 space-y-4">
          <DashboardSection
            title="Case Documents"
            description="Files filed or shared by your legal team"
          >
            {documents === undefined ? (
              <DashboardListSkeleton rows={3} />
            ) : documents.length === 0 ? (
              <EmptyState
                title="No documents shared yet"
                description="Documents filed or shared by your legal team will appear here."
                icon={FileText}
              />
            ) : (
              <div className="space-y-3">
                {documents.map((doc: any) => (
                  <DashboardListRow key={doc._id}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 flex-1">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <FileText className="w-5 h-5 text-dashboard-primary mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-foreground break-words">
                              {doc.title}
                            </span>
                            <DashboardStatusLabel status={doc.type} className="text-xs" />
                            {doc.requiresSignature ? (
                              <DashboardStatusLabel
                                status={doc.signatureStatus}
                                className="text-xs"
                              />
                            ) : null}
                          </div>
                          <p className="text-xs text-dashboard-neutral">
                            {doc.mimeType || "Document"}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <DocDownload documentId={doc._id} />
                      </div>
                    </div>
                  </DashboardListRow>
                ))}
              </div>
            )}
          </DashboardSection>
        </TabsContent>

        <TabsContent value="messages" className="mt-4 space-y-4">
          <DashboardSection
            title="Recent Case Discussion"
            description="Secure communication with your legal team"
            actions={
              <DashboardButton asChild size="sm" variant="outline">
                <Link href={`/client/messages?caseId=${caseId}`}>Open full chat</Link>
              </DashboardButton>
            }
          >
            {messages === undefined ? (
              <DashboardListSkeleton rows={3} />
            ) : messages.length === 0 ? (
              <EmptyState
                title="No messages yet"
                description="Communicate securely with your assigned advocate and legal team."
                icon={MessageSquare}
              />
            ) : (
              <div className="space-y-3">
                {messages.slice(-12).map((msg: any) => {
                  const sender = team.find((u) => u._id === msg.senderId || u.id === msg.senderId);
                  return (
                    <DashboardListRow key={msg._id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs text-dashboard-neutral">
                        <span className="font-semibold text-foreground">
                          {sender?.name || "Legal Team"}
                        </span>
                        <span>
                          {msg._creationTime ? new Date(msg._creationTime).toLocaleString() : ""}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </DashboardListRow>
                  );
                })}
              </div>
            )}
          </DashboardSection>
        </TabsContent>

        <TabsContent value="checklist" className="mt-4 space-y-4">
          <DashboardSection
            title="Client Action Checklist"
            description={`${checklistDone}/${checklist.length} completed`}
          >
            {tasks === undefined ? (
              <DashboardListSkeleton rows={3} />
            ) : checklist.length === 0 ? (
              <EmptyState
                title="No checklist items"
                description="Any pending client action items will appear here."
                icon={CheckSquare}
              />
            ) : (
              <div className="space-y-3">
                {checklist.map((task: any) => {
                  const isDone = task.status === "done";
                  const due = formatTaskDue(task);
                  return (
                    <DashboardListRow
                      key={task._id}
                      className={cn(
                        "flex items-start gap-3",
                        isDone && "opacity-75 bg-dashboard-neutral-soft/50",
                      )}
                    >
                      {isDone ? (
                        <CheckSquare className="w-5 h-5 mt-0.5 text-dashboard-success shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 mt-0.5 text-dashboard-neutral shrink-0" />
                      )}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p
                          className={cn(
                            "text-sm font-semibold text-foreground",
                            isDone && "line-through text-dashboard-neutral",
                          )}
                        >
                          {task.title}
                        </p>
                        {task.description ? (
                          <p className="text-xs text-dashboard-neutral leading-relaxed">
                            {task.description}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {due ? (
                            <span className="text-[10px] text-dashboard-neutral">Due: {due}</span>
                          ) : null}
                          <DashboardStatusLabel status={task.priority} className="text-[10px]" />
                          <DashboardStatusLabel
                            status={task.status}
                            label={TASK_STATUS_LABELS[task.status as TaskStatus] || task.status}
                            className="text-[10px]"
                          />
                        </div>
                      </div>
                    </DashboardListRow>
                  );
                })}
              </div>
            )}
          </DashboardSection>
        </TabsContent>
      </Tabs>
    </PortalPageShell>
  );
}
