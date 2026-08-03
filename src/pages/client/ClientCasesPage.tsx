import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { FolderOpen, CalendarDays, Loader2 } from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { useQuery } from "@/client/data/convex-bridge.ts";
import { api } from "@/convex/_generated/api.js";
import { useMyClient } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useStaffDirectory } from "@/client/queries/identity";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed_won: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  closed_lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  inquiry: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function ClientCasesPage() {
  const currentUser = useCurrentUser();
  const clientRecord = useMyClient();
  const clientId = clientRecord?._id;
  const cases = useCases(clientId ? { clientId } : {}) || [];
  const users = useStaffDirectory() || [];
  const hearings = useQuery(api.hearings.listHearings, {}) || [];

  if (currentUser === undefined || clientRecord === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h1 className="font-serif text-2xl font-bold text-foreground">My Cases</h1>

      {cases.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FolderOpen /></EmptyMedia>
            <EmptyTitle>No cases yet</EmptyTitle>
            <EmptyDescription>Your cases will appear here once your advocate creates them.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {cases.map((c: any) => {
            const lawyer = users.find((u: any) => u._id === c.assignedLawyerId);
            const nextHearingObj = hearings.find((h: any) => h.caseId === c._id && h.status === "scheduled");

            return (
              <Card key={c._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs font-mono">{c.caseNumber}</Badge>
                        <Badge className={`text-xs capitalize ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-800"}`}>
                          {c.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">{c.title}</h3>
                      <p className="text-xs text-muted-foreground">Practice Area: {c.practiceArea}</p>
                      <p className="text-xs text-muted-foreground">Assigned Advocate: {lawyer ? lawyer.name : "Unassigned"}</p>
                      <p className="text-xs text-muted-foreground">Court: {c.court || "Not Specified"}</p>
                      {nextHearingObj && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-accent font-medium">
                          <CalendarDays className="w-3 h-3" />Next Hearing: {nextHearingObj.dateBs}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
