"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
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
} from "lucide-react";
import { useCase } from "@/client/queries/cases";
import { useMyTeam } from "@/client/queries/clients";
import { useHearings } from "@/client/queries/hearings";
import { useDocuments, useDownloadDocument } from "@/client/queries/documents";
import { useTasks } from "@/client/queries/tasks";
import { useMessages } from "@/client/queries/communication";
import { formatTaskDue, PRIORITY_COLORS, TASK_STATUS_LABELS, type TaskStatus } from "@/lib/task-constants.ts";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed_won: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  closed_lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  inquiry: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

function DocDownload({ documentId }: { documentId: string }) {
  const downloadDocument = useDownloadDocument();
  const [busy, setBusy] = useState(false);
  return (
    <Button
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
    </Button>
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
    () => team.find((u) => u._id === caseData?.assignedLawyerId || u.id === caseData?.assignedLawyerId),
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
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (caseData === null) {
    return (
      <div className="p-6 text-center space-y-3">
        <h2 className="text-lg font-semibold text-destructive">Matter not found</h2>
        <p className="text-sm text-muted-foreground">
          This case is unavailable or is not linked to your portal account.
        </p>
        <Button asChild variant="secondary" size="sm">
          <Link href="/client/cases">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to cases
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 font-sans min-w-0">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="p-1 h-auto">
          <Link href="/client/cases">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground font-mono">{caseData.caseNumber}</span>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Badge
            className={`text-[10px] uppercase tracking-wider font-bold ${STATUS_COLORS[caseData.status] || "bg-gray-100 text-gray-800"}`}
          >
            {String(caseData.status).replace("_", " ")}
          </Badge>
          <Badge variant="outline" className="text-[10px] uppercase">
            {caseData.practiceArea}
          </Badge>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          {caseData.title}
        </h1>
        {caseData.description ? (
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">
            {caseData.description}
          </p>
        ) : null}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hearings">Hearings</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Advocate", value: lawyer?.name || "Unassigned" },
              { label: "Court", value: caseData.court || "Not specified" },
              {
                label: "Next hearing",
                value: nextHearing
                  ? String(
                      (nextHearing as { dateBs?: string; dateGregorian?: string }).dateBs ||
                        (nextHearing as { dateGregorian?: string }).dateGregorian ||
                        "Scheduled",
                    )
                  : "None scheduled",
              },
              {
                label: "Open checklist",
                value: `${checklist.length - checklistDone} / ${checklist.length}`,
              },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-sm font-semibold mt-1 break-words">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {pendingSignatures > 0 ? (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm">
                  {pendingSignatures} document{pendingSignatures === 1 ? "" : "s"} awaiting your
                  signature.
                </p>
                <Button asChild size="sm">
                  <Link href="/client/signatures">Review signatures</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/client/documents?caseId=${caseId}`}>
                <FolderOpen className="w-4 h-4 mr-1" /> All documents
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/client/messages?caseId=${caseId}`}>
                <MessageSquare className="w-4 h-4 mr-1" /> Open chat
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/client/checklist">
                <CheckSquare className="w-4 h-4 mr-1" /> Checklist
              </Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="hearings" className="mt-4 space-y-3">
          {hearings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hearings on this matter.</p>
          ) : (
            hearings.map((h: any) => (
              <Card key={h._id}>
                <CardContent className="p-4 flex items-start gap-3">
                  <CalendarDays className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {h.dateBs || h.dateGregorian}
                      {h.time ? ` · ${h.time}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {h.court || "Court TBD"} · {h.status}
                      {h.purpose ? ` · ${h.purpose}` : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4 space-y-3">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No documents shared yet.</p>
          ) : (
            documents.map((doc: any) => (
              <Card key={doc._id}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="break-words">{doc.title}</span>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {doc.type} · {doc.mimeType}
                    </p>
                  </div>
                  <DocDownload documentId={doc._id} />
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="messages" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button asChild size="sm" variant="outline">
              <Link href={`/client/messages?caseId=${caseId}`}>Open full chat</Link>
            </Button>
          </div>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>
          ) : (
            messages.slice(-12).map((msg: any) => {
              const sender = team.find((u) => u._id === msg.senderId || u.id === msg.senderId);
              return (
                <div key={msg._id} className="rounded-lg border p-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">
                    {sender?.name || "Team"} ·{" "}
                    {msg._creationTime
                      ? new Date(msg._creationTime).toLocaleString()
                      : ""}
                  </p>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="checklist" className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground mb-2">
            {checklistDone}/{checklist.length} done
          </p>
          {checklist.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No client-visible checklist items.
            </p>
          ) : (
            checklist.map((task: any) => {
              const isDone = task.status === "done";
              const due = formatTaskDue(task);
              return (
                <div
                  key={task._id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    isDone ? "bg-secondary/30 opacity-70" : "bg-card",
                  )}
                >
                  {isDone ? (
                    <CheckSquare className="w-4 h-4 mt-0.5 text-accent shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-semibold", isDone && "line-through text-muted-foreground")}>
                      {task.title}
                    </p>
                    {task.description ? (
                      <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {due ? <span className="text-[10px] text-muted-foreground">Due: {due}</span> : null}
                      <Badge className={`text-[9px] uppercase ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                      </Badge>
                      <Badge variant="secondary" className="text-[9px]">
                        {TASK_STATUS_LABELS[task.status as TaskStatus] || task.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
