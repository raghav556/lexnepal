import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { FolderOpen, CalendarDays } from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";

const CASES = [
  { id: "1", caseNumber: "KTM/2081/234", title: "Property Dispute \u2014 Bhaktapur Plot 234", status: "active", court: "District Court, Kathmandu", lawyer: "Adv. Binod Thapa", nextHearing: "15 Mangsir 2081", practiceArea: "Property Law" },
  { id: "2", caseNumber: "KTM/2081/567", title: "Company Registration \u2014 TechVenture Pvt. Ltd.", status: "active", court: "N/A (Office of Company Registrar)", lawyer: "Adv. Ramesh Adhikari", nextHearing: null, practiceArea: "Corporate Law" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  closed_won: "bg-blue-100 text-blue-800",
  inquiry: "bg-gray-100 text-gray-800",
};

export default function ClientCasesPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h1 className="font-serif text-2xl font-bold text-foreground">My Cases</h1>

      {CASES.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FolderOpen /></EmptyMedia>
            <EmptyTitle>No cases yet</EmptyTitle>
            <EmptyDescription>Your cases will appear here once your advocate creates them.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {CASES.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs font-mono">{c.caseNumber}</Badge>
                      <Badge className={`text-xs ${STATUS_COLORS[c.status]}`}>{c.status}</Badge>
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{c.title}</h3>
                    <p className="text-xs text-muted-foreground">Practice Area: {c.practiceArea}</p>
                    <p className="text-xs text-muted-foreground">Assigned Advocate: {c.lawyer}</p>
                    <p className="text-xs text-muted-foreground">Court: {c.court}</p>
                    {c.nextHearing && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-accent font-medium">
                        <CalendarDays className="w-3 h-3" />Next Hearing: {c.nextHearing}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
