"use client";

import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderOpen,
  MessageSquare,
  PenTool,
  Receipt,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Link } from "@/client/navigation";
import { useCases } from "@/client/queries/cases";
import { useMyClient, useMyTeam } from "@/client/queries/clients";
import { useMessages } from "@/client/queries/communication";
import { useDocuments } from "@/client/queries/documents";
import { useInvoices } from "@/client/queries/financial";
import { useHearings } from "@/client/queries/hearings";
import { useTasks } from "@/client/queries/tasks";
import {
  ActionPanel,
  DashboardButton,
  DashboardListRow,
  DashboardListSkeleton,
  DashboardSection,
  DashboardStatusLabel,
  EmptyState,
  PortalPageShell,
  StatusBadge,
} from "@/components/dashboard";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import {
  DASHBOARD_METRIC_TONES,
  DASHBOARD_TONE_BORDER_CLASSES,
  getDashboardStatusTone,
} from "@/lib/dashboard-semantics";
import { formatNPR } from "@/lib/lex-constants.ts";

export default function ClientDashboard() {
  const currentUser = useCurrentUser();
  const clientRecord = useMyClient();
  const clientId = clientRecord?._id;
  const cases = useCases(clientId ? { clientId } : {}) || [];
  const { data: invoices = [] } = useInvoices(clientId ? { clientId } : {});
  const hearings = useHearings({}) || [];
  const users = useMyTeam() ?? [];
  const documents = useDocuments({}) || [];
  const tasks = useTasks() || [];

  const caseIds = new Set(cases.map((item) => item._id));
  const myHearings = hearings.filter(
    (item) => caseIds.has(item.caseId) && item.status === "scheduled",
  );
  const activeCases = cases.filter((item) => item.status === "active");
  const outstanding = invoices
    .filter((item) => item.status !== "paid" && item.status !== "cancelled")
    .reduce((sum: number, item) => sum + (item.total || 0), 0);
  const pendingDocs = documents.filter(
    (item) =>
      item.caseId &&
      caseIds.has(item.caseId) &&
      item.requiresSignature &&
      item.signatureStatus === "pending",
  );

  const messageCaseIds = [0, 1, 2, 3, 4].map((index) => cases[index]?._id || "");
  const m0 = useMessages(messageCaseIds[0], false);
  const m1 = useMessages(messageCaseIds[1], false);
  const m2 = useMessages(messageCaseIds[2], false);
  const m3 = useMessages(messageCaseIds[3], false);
  const m4 = useMessages(messageCaseIds[4], false);
  const uid = currentUser?._id || currentUser?.id;
  const unreadEstimate = [m0, m1, m2, m3, m4].reduce((sum, response, index) => {
    if (!messageCaseIds[index] || !uid) return sum;
    return (
      sum +
      (response.data?.page || []).filter(
        (message) =>
          !message.isInternal && message.senderId !== uid && !(message.readBy || []).includes(uid),
      ).length
    );
  }, 0);
  const checklistOpen = tasks.filter(
    (item) =>
      item.clientVisible &&
      item.caseId &&
      caseIds.has(item.caseId) &&
      !item.archivedAt &&
      !item.parentTaskId &&
      item.status !== "done",
  ).length;
  const kycStatus = clientRecord?.kycStatus;
  const unpaidInvoices = invoices.filter(
    (item) => item.status === "sent" || item.status === "overdue",
  ).length;

  if (clientRecord === undefined) {
    return (
      <PortalPageShell
        portal="client"
        loading
        loadingLabel="Preparing your secure client portal…"
        title="Client Portal"
      >
        <div />
      </PortalPageShell>
    );
  }

  if (clientRecord === null) {
    return (
      <PortalPageShell
        portal="client"
        decorated
        showTodayDate
        eyebrow="Client access"
        title="Welcome to LexNepal"
        description="Your client portal account is active."
        icon={ShieldCheck}
      >
        <EmptyState
          title="No client profile linked"
          description="No client profile is linked to this account yet. Please contact the firm to complete setup."
          icon={ShieldCheck}
          tone="information"
        />
      </PortalPageShell>
    );
  }

  const actions: { href: string; label: string; detail: string; icon: typeof PenTool }[] = [];
  if (pendingDocs.length > 0)
    actions.push({
      href: "/client/signatures",
      label: "Sign documents",
      detail: `${pendingDocs.length} awaiting signature`,
      icon: PenTool,
    });
  if (kycStatus === "pending" || kycStatus === "rejected")
    actions.push({
      href: "/client/kyc",
      label: kycStatus === "rejected" ? "Resubmit KYC" : "Complete KYC",
      detail: "Identity verification required",
      icon: ShieldCheck,
    });
  if (unpaidInvoices > 0)
    actions.push({
      href: "/client/billing",
      label: "Pay invoices",
      detail: `${unpaidInvoices} unpaid · ${formatNPR(outstanding)}`,
      icon: Receipt,
    });
  if (checklistOpen > 0)
    actions.push({
      href: "/client/checklist",
      label: "Checklist items",
      detail: `${checklistOpen} open`,
      icon: ClipboardList,
    });

  const portalMetrics = [
    {
      label: "Active cases",
      value: String(activeCases.length),
      icon: FolderOpen,
      tone: DASHBOARD_METRIC_TONES.cases,
      helperText: "In progress matters",
    },
    {
      label: "Pending signatures",
      value: String(pendingDocs.length),
      icon: FileText,
      tone: DASHBOARD_METRIC_TONES.signatures,
      helperText: "Action required",
    },
    {
      label: "Unread messages",
      value: String(unreadEstimate),
      icon: MessageSquare,
      tone: DASHBOARD_METRIC_TONES.messages,
      helperText: "From your legal team",
    },
    {
      label: "Outstanding balance",
      value: formatNPR(outstanding),
      icon: Receipt,
      tone: DASHBOARD_METRIC_TONES.balance,
      helperText: `${unpaidInvoices} unpaid invoice${unpaidInvoices === 1 ? "" : "s"}`,
    },
  ];

  return (
    <PortalPageShell
      portal="client"
      decorated
      showTodayDate
      eyebrow="Your legal portal"
      title={`Welcome back${clientRecord.fullName ? `, ${clientRecord.fullName.split(" ")[0]}` : ""}`}
      description="A clear, secure overview of your matters with the firm."
      icon={Sparkles}
      metrics={portalMetrics}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <DashboardButton asChild size="sm">
            <Link href="/client/messages">
              Message your team <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </DashboardButton>
          <DashboardButton asChild size="sm" variant="secondary">
            <Link href="/client/booking">Book appointment</Link>
          </DashboardButton>
        </div>
      }
      heroChildren={
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="success" icon={ShieldCheck}>
            Secure client access
          </StatusBadge>
          <StatusBadge tone="information">Kathmandu jurisdiction</StatusBadge>
        </div>
      }
    >
      {actions.length > 0 ? (
        <ActionPanel
          title="Action needed"
          description="Complete these priority items to keep your matters moving."
          icon={ClipboardList}
          tone="warning"
          state="warning"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {actions.map((action) => (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                className="group flex items-center gap-3 rounded-lg border border-dashboard-warning/30 bg-dashboard-panel/75 p-3 transition-all hover:border-dashboard-warning/55 hover:bg-dashboard-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-dashboard-warning-soft text-dashboard-warning">
                  <action.icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{action.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{action.detail}</p>
                </div>
                <ArrowRight
                  className="size-3.5 text-dashboard-warning transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        </ActionPanel>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardSection
          title="Active cases"
          description="Matter status and your assigned legal team"
          icon={FolderOpen}
          actions={
            <DashboardButton asChild variant="ghost" size="sm">
              <Link href="/client/cases">
                View all <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </DashboardButton>
          }
        >
          {cases === undefined ? (
            <DashboardListSkeleton rows={3} />
          ) : activeCases.length === 0 ? (
            <EmptyState
              title="No active cases"
              description="Your active legal matters will appear here."
              icon={FolderOpen}
              tone="information"
            />
          ) : (
            <div className="space-y-3">
              {activeCases.map((item) => {
                const lawyer = users.find(
                  (user) => user._id === item.assignedLawyerId || user.id === item.assignedLawyerId,
                );
                const nextHearing = myHearings.find((hearing) => hearing.caseId === item._id);
                const tone = getDashboardStatusTone(item.status);
                return (
                  <DashboardListRow
                    key={item._id}
                    className={`border-l-4 ${DASHBOARD_TONE_BORDER_CLASSES[tone]}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono font-medium text-muted-foreground bg-dashboard-neutral-soft px-1.5 py-0.5 rounded border border-dashboard-border">
                          {item.caseNumber}
                        </span>
                        <DashboardStatusLabel status={item.status} className="text-[10px]" />
                      </div>
                      <Link
                        href={`/client/cases/${item._id}`}
                        className="text-sm font-semibold text-foreground hover:text-dashboard-primary hover:underline"
                      >
                        {item.title}
                      </Link>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <UserRound className="size-3.5 text-dashboard-information" aria-hidden />
                        Lawyer: {lawyer?.name || "Being assigned"}
                      </p>
                      {nextHearing ? (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-dashboard-information-foreground">
                          <CalendarDays
                            className="size-3.5 text-dashboard-information"
                            aria-hidden
                          />
                          Next hearing: {nextHearing.dateBs || nextHearing.dateGregorian}
                        </p>
                      ) : null}
                    </div>
                  </DashboardListRow>
                );
              })}
            </div>
          )}
        </DashboardSection>

        <DashboardSection
          title="Upcoming hearings"
          description="Important court dates and locations"
          icon={CalendarDays}
          actions={
            <DashboardButton asChild variant="ghost" size="sm">
              <Link href="/client/hearings">
                View all <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </DashboardButton>
          }
        >
          {hearings === undefined ? (
            <DashboardListSkeleton rows={3} />
          ) : myHearings.length === 0 ? (
            <EmptyState
              title="No upcoming hearings"
              description="Scheduled court dates will appear here."
              icon={CalendarDays}
              tone="information"
            />
          ) : (
            <div className="space-y-3">
              {myHearings.slice(0, 5).map((hearing) => {
                const matchedCase = cases.find((item) => item._id === hearing.caseId);
                const dateParts = (hearing.dateBs || "").split(" ");
                return (
                  <DashboardListRow key={hearing._id} className="gap-3">
                    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border border-dashboard-accent/35 bg-dashboard-accent-soft text-dashboard-accent-foreground">
                      <span className="text-xs font-bold">{dateParts[0] || "—"}</span>
                      <span className="text-[10px]">{dateParts[1] || "Court"}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {matchedCase?.title || "Hearing"}
                      </p>
                      <p className="mt-1 text-xs text-dashboard-information-foreground">
                        {hearing.court}
                        {hearing.time ? ` · ${hearing.time}` : ""}
                      </p>
                    </div>
                  </DashboardListRow>
                );
              })}
            </div>
          )}
        </DashboardSection>
      </div>
    </PortalPageShell>
  );
}
