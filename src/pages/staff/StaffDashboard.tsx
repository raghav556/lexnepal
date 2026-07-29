import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { FolderOpen, CalendarDays, CheckSquare, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "react-router-dom";

const STATS = [
  { label: "Active Cases", value: "24", icon: FolderOpen, color: "text-blue-400" },
  { label: "Today's Hearings", value: "3", icon: CalendarDays, color: "text-amber-400" },
  { label: "Pending Tasks", value: "11", icon: CheckSquare, color: "text-green-400" },
  { label: "Unbilled Hours (Week)", value: "14.5h", icon: Clock, color: "text-purple-400" },
];

const UPCOMING_HEARINGS = [
  { id: "1", case: "Sharma vs. Municipality", court: "Supreme Court", dateBs: "15 Mangsir 2081", time: "10:00 AM", urgent: false },
  { id: "2", case: "TechVenture IP Dispute", court: "High Court, Patan", dateBs: "15 Mangsir 2081", time: "2:00 PM", urgent: false },
  { id: "3", case: "Gurung Family Dispute", court: "District Court, KTM", dateBs: "16 Mangsir 2081", time: "11:00 AM", urgent: true },
];

const URGENT_TASKS = [
  { id: "1", title: "File bail application \u2014 Gurung case", due: "Today", priority: "urgent" },
  { id: "2", title: "Review MOA draft before client meeting", due: "Tomorrow", priority: "high" },
  { id: "3", title: "Submit trademark registration docs", due: "3 days", priority: "medium" },
];

export default function StaffDashboard() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Staff Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Good morning. Here's today's overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <Card key={s.label}><CardContent className="p-4 flex items-center gap-3">
            <s.icon className={`w-5 h-5 ${s.color}`} />
            <div><p className="text-xl font-bold text-foreground">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Upcoming Hearings</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs"><Link to="/staff/hearings">View all</Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {UPCOMING_HEARINGS.map((h) => (
              <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex flex-col items-center justify-center text-accent">
                    <span className="text-xs font-bold leading-none">{h.dateBs.split(" ")[0]}</span>
                    <span className="text-xs leading-none opacity-70">{h.dateBs.split(" ")[1]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{h.case}</p>
                    <p className="text-xs text-muted-foreground">{h.court} \u2014 {h.time}</p>
                  </div>
                </div>
                {h.urgent && <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Priority Tasks</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs"><Link to="/staff/tasks">View all</Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {URGENT_TASKS.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">Due: {t.due}</p>
                </div>
                <Badge className={`text-xs ml-2 flex-shrink-0 ${
                  t.priority === "urgent" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                  t.priority === "high" ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" :
                  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}>{t.priority}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
