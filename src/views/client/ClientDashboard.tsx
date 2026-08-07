import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "@/client/navigation";
import {
  FolderOpen,
  FileText,
  Receipt,
  MessageSquare,
  CalendarDays,
  ArrowRight,
  Loader2,
  ShieldCheck,
  PenTool,
  ClipboardList,
} from "lucide-react";
import { useMyClient, useMyTeam } from "@/client/queries/clients";
import { useMessages } from "@/client/queries/communication";
import { useCases } from "@/client/queries/cases";
import { useHearings } from "@/client/queries/hearings";
import { formatNPR } from "@/lib/lex-constants.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useInvoices } from "@/client/queries/financial";
import { useDocuments } from "@/client/queries/documents";
import { useTasks } from "@/client/queries/tasks";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed_won: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  inquiry: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function ClientDashboard() {
  const currentUser = useCurrentUser();
  const clientRecord = useMyClient();
  const clientId = clientRecord?._id;

  const cases = useCases(clientId ? { clientId } : {}) || [];
  const { data: invoices = [] } = useInvoices(clientId ? { clientId: clientId as any } : {});
  const hearings = useHearings({}) || [];
  const users = useMyTeam() ?? [];
  const documents = useDocuments({}) || [];
  const tasks = useTasks() || [];

  const caseIds = new Set(cases.map((c: any) => c._id));
  const myHearings = hearings.filter(
    (h: any) => caseIds.has(h.caseId) && h.status === "scheduled",
  );
  const activeCases = cases.filter((c: any) => c.status === "active");
  const outstanding = invoices
    .filter((i: any) => i.status !== "paid" && i.status !== "cancelled")
    .reduce((s: number, i: any) => s + (i.total || 0), 0);
  const pendingDocs = documents.filter(
    (d: any) =>
      d.caseId && caseIds.has(d.caseId) && d.requiresSignature && d.signatureStatus === "pending",
  );

  // Warm caches for up to 5 matters; unread KPI uses primary thread (best-effort aggregate).
  const caseId0 = cases[0]?._id || "";
  const caseId1 = cases[1]?._id || "";
  const caseId2 = cases[2]?._id || "";
  const caseId3 = cases[3]?._id || "";
  const caseId4 = cases[4]?._id || "";
  const m0 = useMessages(caseId0, false);
  const m1 = useMessages(caseId1, false);
  const m2 = useMessages(caseId2, false);
  const m3 = useMessages(caseId3, false);
  const m4 = useMessages(caseId4, false);
  const uid = currentUser?._id || currentUser?.id;
  const unreadEstimate = [m0, m1, m2, m3, m4].reduce((sum, resp, idx) => {
    const id = [caseId0, caseId1, caseId2, caseId3, caseId4][idx];
    if (!id || !uid) return sum;
    const msgs = resp.data?.page || [];
    return (
      sum +
      msgs.filter(
        (m: any) => !m.isInternal && m.senderId !== uid && !(m.readBy || []).includes(uid),
      ).length
    );
  }, 0);

  const checklistOpen = tasks.filter(
    (t: any) =>
      t.clientVisible &&
      t.caseId &&
      caseIds.has(t.caseId) &&
      !t.archivedAt &&
      !t.parentTaskId &&
      t.status !== "done",
  ).length;

  const kycStatus = clientRecord?.kycStatus;
  const unpaidInvoices = invoices.filter(
    (i: any) => i.status === "sent" || i.status === "overdue",
  ).length;

  if (clientRecord === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (clientRecord === null) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="font-serif text-2xl font-bold text-foreground">Welcome</h1>
        <p className="text-muted-foreground text-sm mt-2">
          No client profile is linked to this account yet. Please contact the firm to complete
          setup.
        </p>
      </div>
    );
  }

  const actions: { href: string; label: string; detail: string; icon: typeof PenTool }[] = [];
  if (pendingDocs.length > 0) {
    actions.push({
      href: "/client/signatures",
      label: "Sign documents",
      detail: `${pendingDocs.length} awaiting signature`,
      icon: PenTool,
    });
  }
  if (kycStatus === "pending" || kycStatus === "rejected") {
    actions.push({
      href: "/client/kyc",
      label: kycStatus === "rejected" ? "Resubmit KYC" : "Complete KYC",
      detail: "Identity verification required",
      icon: ShieldCheck,
    });
  }
  if (unpaidInvoices > 0) {
    actions.push({
      href: "/client/billing",
      label: "Pay invoices",
      detail: `${unpaidInvoices} unpaid · ${formatNPR(outstanding)}`,
      icon: Receipt,
    });
  }
  if (checklistOpen > 0) {
    actions.push({
      href: "/client/checklist",
      label: "Checklist items",
      detail: `${checklistOpen} open`,
      icon: ClipboardList,
    });
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">
          Welcome back{clientRecord.fullName ? `, ${clientRecord.fullName.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Here&apos;s an overview of your matters with Srimar Law.
        </p>
      </div>

      {actions.length > 0 ? (
        <Card className="border-accent/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Action needed</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {actions.map((a) => (
              <Link
                key={a.href + a.label}
                href={a.href}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-secondary/50 transition-colors"
              >
                <a.icon className="w-4 h-4 text-accent shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{a.label}</p>
                  <p className="text-xs text-muted-foreground">{a.detail}</p>
                </div>
                <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Active Cases",
            value: String(activeCases.length),
            icon: FolderOpen,
            color: "text-blue-500",
            href: "/client/cases",
          },
          {
            label: "Pending Signatures",
            value: String(pendingDocs.length),
            icon: FileText,
            color: "text-amber-500",
            href: "/client/signatures",
          },
          {
            label: "Unread Messages",
            value: String(unreadEstimate),
            icon: MessageSquare,
            color: "text-green-500",
            href: "/client/messages",
          },
          {
            label: "Outstanding Balance",
            value: formatNPR(outstanding),
            icon: Receipt,
            color: "text-red-500",
            href: "/client/billing",
          },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:bg-secondary/40 transition-colors h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={stat.color}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Active Cases</CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
            <Link href="/client/cases">
              View all <ArrowRight className="ml-1 w-3 h-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeCases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No active cases.</p>
          ) : (
            activeCases.map((c: any) => {
              const lawyer = users.find(
                (u: any) => u._id === c.assignedLawyerId || u.id === c.assignedLawyerId,
              );
              const nextHearing = myHearings.find((h: any) => h.caseId === c._id);
              return (
                <div
                  key={c._id}
                  className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                >
                  <div>
                    <Link
                      href={`/client/cases/${c._id}`}
                      className="text-sm font-medium text-foreground hover:underline"
                    >
                      {c.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Assigned: {lawyer?.name || "Unassigned"}
                    </p>
                    {nextHearing && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-accent">
                        <CalendarDays className="w-3 h-3" />
                        Next hearing: {nextHearing.dateBs || nextHearing.dateGregorian}
                      </div>
                    )}
                  </div>
                  <Badge className={`text-xs ${STATUS_COLORS[c.status] || ""}`}>
                    {c.status === "active" ? "Active" : c.status}
                  </Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Upcoming Hearings</CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
            <Link href="/client/hearings">
              View all <ArrowRight className="ml-1 w-3 h-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {myHearings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No upcoming hearings.</p>
          ) : (
            myHearings.slice(0, 5).map((h: any) => {
              const matchedCase = cases.find((c: any) => c._id === h.caseId);
              const dayPart = (h.dateBs || "").split(" ")[0] || "—";
              const monthPart = (h.dateBs || "").split(" ")[1] || "";
              return (
                <div
                  key={h._id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-accent/5 border border-accent/20"
                >
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex flex-col items-center justify-center">
                    <span className="text-accent text-xs font-bold">{dayPart}</span>
                    <span className="text-accent text-xs">{monthPart}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {matchedCase?.title || "Hearing"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {h.court} {h.time ? `— ${h.time}` : ""}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
