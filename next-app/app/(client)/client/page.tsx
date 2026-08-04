"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FolderOpen, FileText, Receipt, MessageSquare, CalendarDays, ArrowRight, Loader2 } from "lucide-react";
import { useQuery } from "@/client/data/convex-bridge";
import { api } from "@/convex/_generated/api.js";
import { useMyClient } from "@/client/queries/clients";

import { useMessages } from "@/client/queries/communication";
import { useCases } from "@/client/queries/cases";
import { formatNPR } from "@/lib/lex-constants";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useStaffDirectory } from "@/client/queries/identity";
import { useInvoices } from "@/client/queries/financial";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed_won: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  inquiry: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function ClientDashboard() {
  // Keep SSR and first client paint identical — query data is client-only.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const currentUser = useCurrentUser();
  const clientRecord = useMyClient();
  const clientId = clientRecord?._id;

  const cases = useCases(clientId ? { clientId } : {}) || [];
  const { data: invoices = [] } = useInvoices(clientId ? { clientId: clientId as any } : {});
  const hearings = useQuery(api.hearings.listHearings, {}) || [];
  const users = useStaffDirectory() || [];
  const documents = useQuery(api.documents.listDocuments, {}) || [];

  const caseIds = new Set(cases.map((c: any) => c._id));
  const myHearings = hearings.filter(
    (h: any) => caseIds.has(h.caseId) && h.status === "scheduled",
  );
  const activeCases = cases.filter((c: any) => c.status === "active");
  const outstanding = invoices
    .filter((i: any) => i.status !== "paid" && i.status !== "cancelled")
    .reduce((s: number, i: any) => s + (i.total || 0), 0);
  const pendingDocs = documents.filter(
    (d: any) => d.caseId && caseIds.has(d.caseId) && d.requiresSignature && d.signatureStatus === "pending",
  );

  // Lightweight unread estimate: non-internal messages on client cases (best-effort)
  const firstCaseId = cases[0]?._id;
  const { data: msgsResponse } = useMessages(firstCaseId || "", false);
  const msgs = msgsResponse?.page || [];
  const unreadEstimate = msgs.filter(
    (m: any) => !m.isInternal && currentUser && !(m.readBy || []).includes(currentUser._id || (currentUser as any).id),
  ).length;

  if (!mounted || clientRecord === undefined) {
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
          No client profile is linked to this account yet. Please contact the firm to complete setup.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Welcome back{clientRecord.fullName ? `, ${clientRecord.fullName.split(" ")[0]}` : ""}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Here's an overview of your matters with Srimar Law.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Cases", value: String(activeCases.length), icon: FolderOpen, color: "text-blue-500" },
          { label: "Pending Signatures", value: String(pendingDocs.length), icon: FileText, color: "text-amber-500" },
          { label: "Unread Messages", value: String(unreadEstimate), icon: MessageSquare, color: "text-green-500" },
          { label: "Outstanding Balance", value: formatNPR(outstanding), icon: Receipt, color: "text-red-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={stat.color}><stat.icon className="w-5 h-5" /></div>
              <div>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Active Cases</CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
            <Link href="/client/cases">View all <ArrowRight className="ml-1 w-3 h-3" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeCases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No active cases.</p>
          ) : (
            activeCases.map((c: any) => {
              const lawyer = users.find((u: any) => u._id === c.assignedLawyerId);
              const nextHearing = myHearings.find((h: any) => h.caseId === c._id);
              return (
                <div key={c._id} className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Assigned: {lawyer?.name || "Unassigned"}</p>
                    {nextHearing && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-accent">
                        <CalendarDays className="w-3 h-3" />Next hearing: {nextHearing.dateBs || nextHearing.dateGregorian}
                      </div>
                    )}
                  </div>
                  <Badge className={`text-xs ${STATUS_COLORS[c.status] || ""}`}>{c.status === "active" ? "Active" : c.status}</Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Upcoming Hearings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {myHearings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No upcoming hearings.</p>
          ) : (
            myHearings.slice(0, 5).map((h: any) => {
              const matchedCase = cases.find((c: any) => c._id === h.caseId);
              const dayPart = (h.dateBs || "").split(" ")[0] || "—";
              const monthPart = (h.dateBs || "").split(" ")[1] || "";
              return (
                <div key={h._id} className="flex items-center gap-4 p-3 rounded-lg bg-accent/5 border border-accent/20">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex flex-col items-center justify-center">
                    <span className="text-accent text-xs font-bold">{dayPart}</span>
                    <span className="text-accent text-xs">{monthPart}</span>
                  </div>
                  <div>
                     <p className="text-sm font-medium text-foreground">{matchedCase?.title || "Hearing"}</p>
                     <p className="text-xs text-muted-foreground">{h.court} {h.time ? `— ${h.time}` : ""}</p>
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

