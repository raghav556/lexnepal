import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "react-router-dom";
import { Plus, Search, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";

const CASES = [
  { id: "ktm1", caseNumber: "KTM/2081/001", title: "Sharma vs. Kathmandu Municipality", status: "active", client: "Prakash Sharma", lawyer: "Adv. Sita Rana", area: "Civil Litigation", nextHearing: "15 Mangsir 2081" },
  { id: "ktm2", caseNumber: "KTM/2081/002", title: "TechVenture IP Infringement", status: "active", client: "TechVenture Pvt. Ltd.", lawyer: "Adv. Prabhat Gautam", area: "Intellectual Property", nextHearing: "15 Mangsir 2081" },
  { id: "ktm3", caseNumber: "KTM/2081/003", title: "Gurung Family Property Division", status: "active", client: "Suresh Gurung", lawyer: "Adv. Anjali Shrestha", area: "Family Law", nextHearing: "16 Mangsir 2081" },
  { id: "ktm4", caseNumber: "KTM/2081/004", title: "Nepal Bank Employment Dispute", status: "on_hold", client: "Nepal Bank Ltd.", lawyer: "Adv. Deepika Karki", area: "Labor & Employment", nextHearing: null },
  { id: "ktm5", caseNumber: "KTM/2081/005", title: "Hotel Property Title Registration", status: "closed_won", client: "Grand Hotel Pvt. Ltd.", lawyer: "Adv. Binod Thapa", area: "Property & Real Estate", nextHearing: null },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed_won: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  closed_lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  inquiry: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function StaffCasesPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Cases</h1>
        <Button size="sm" onClick={() => toast.info("Case creation coming in the next milestone!")}><Plus className="w-4 h-4 mr-1" /> New Case</Button>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search by case number, title, or client..." /></div>
      <div className="space-y-2">
        {CASES.map((c) => (
          <Card key={c.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{c.caseNumber}</span>
                    <Badge className={`text-xs ${STATUS_COLORS[c.status]}`}>{c.status.replace("_", " ")}</Badge>
                    <Badge variant="secondary" className="text-xs">{c.area}</Badge>
                  </div>
                  <Link to={`/staff/cases/${c.id}`} className="font-semibold text-sm text-foreground hover:text-accent transition-colors">{c.title}</Link>
                  <p className="text-xs text-muted-foreground mt-0.5">Client: {c.client} | Lawyer: {c.lawyer}</p>
                  {c.nextHearing && <div className="flex items-center gap-1 mt-1 text-xs text-accent"><CalendarDays className="w-3 h-3" />Next hearing: {c.nextHearing}</div>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
