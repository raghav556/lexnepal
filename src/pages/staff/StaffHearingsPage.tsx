import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CalendarDays, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDualDate } from "@/lib/nepali-calendar.ts";

const HEARINGS = [
  { id: "1", case: "Sharma vs. Municipality", caseNumber: "KTM/2081/001", court: "Supreme Court", dateBs: "15 Mangsir 2081", dateIso: "2024-12-01", time: "10:00 AM", status: "scheduled", lawyer: "Adv. Sita Rana" },
  { id: "2", case: "TechVenture IP Dispute", caseNumber: "KTM/2081/002", court: "High Court, Patan", dateBs: "15 Mangsir 2081", dateIso: "2024-12-01", time: "2:00 PM", status: "scheduled", lawyer: "Adv. Prabhat Gautam" },
  { id: "3", case: "Gurung Family Dispute", caseNumber: "KTM/2081/003", court: "District Court, KTM", dateBs: "16 Mangsir 2081", dateIso: "2024-12-02", time: "11:00 AM", status: "scheduled", lawyer: "Adv. Anjali Shrestha" },
  { id: "4", case: "Nepal Bank Employment", caseNumber: "KTM/2081/004", court: "Labour Court", dateBs: "28 Ashwin 2081", dateIso: "2024-10-14", time: "3:00 PM", status: "completed", lawyer: "Adv. Deepika Karki" },
];

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  adjourned: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function StaffHearingsPage() {
  const upcoming = HEARINGS.filter((h) => h.status === "scheduled");
  const past = HEARINGS.filter((h) => h.status !== "scheduled");

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Hearing Calendar</h1>
        <Button size="sm" onClick={() => toast.info("Hearing scheduling coming in the next milestone!")}><Plus className="w-4 h-4 mr-1" /> Add Hearing</Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Upcoming Hearings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {upcoming.map((h) => (
            <div key={h.id} className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex flex-col items-center justify-center text-accent flex-shrink-0">
                  <span className="text-lg font-bold leading-none">{h.dateBs.split(" ")[0]}</span>
                  <span className="text-xs opacity-80">{h.dateBs.split(" ")[1]}</span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{h.case}</p>
                  <p className="text-xs text-muted-foreground font-mono">{h.caseNumber}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{h.court} \u2014 {h.time}</p>
                  <p className="text-xs text-muted-foreground">{h.lawyer}</p>
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground/70">
                    <CalendarDays className="w-3 h-3" /><span>{formatDualDate(h.dateIso)}</span>
                  </div>
                </div>
              </div>
              <Badge className={`text-xs ${STATUS_COLORS[h.status]}`}>{h.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Past Hearings</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {past.map((h) => (
            <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border border-border opacity-70">
              <div><p className="text-sm text-foreground">{h.case}</p><p className="text-xs text-muted-foreground">{h.dateBs} \u2014 {h.court}</p></div>
              <Badge className={`text-xs ${STATUS_COLORS[h.status]}`}>{h.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
