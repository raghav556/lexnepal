import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Clock, Play, Square, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatNPR } from "@/lib/lex-constants.ts";

const ENTRIES = [
  { id: "1", case: "KTM/2081/001 \u2014 Sharma vs. Municipality", task: "Drafting appeal petition", date: "15 Mangsir 2081", hours: 3.5, rate: 5000, billable: true, invoiced: false },
  { id: "2", case: "KTM/2081/002 \u2014 TechVenture IP", task: "Reviewing trademark documents", date: "14 Mangsir 2081", hours: 2.0, rate: 5000, billable: true, invoiced: false },
  { id: "3", case: "KTM/2081/001 \u2014 Sharma vs. Municipality", task: "Client consultation call", date: "13 Mangsir 2081", hours: 1.0, rate: 5000, billable: true, invoiced: true },
  { id: "4", case: "Internal", task: "Team meeting", date: "12 Mangsir 2081", hours: 1.5, rate: 0, billable: false, invoiced: false },
];

export default function StaffTimeTrackerPage() {
  const [running, setRunning] = useState(false);
  const unbilledTotal = ENTRIES.filter((e) => e.billable && !e.invoiced).reduce((sum, e) => sum + e.hours * e.rate, 0);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Time Tracker</h1>
        <Button size="sm" onClick={() => toast.info("Manual time entry coming in milestone 6!")}><Plus className="w-4 h-4 mr-1" /> Add Entry</Button>
      </div>

      <Card className="border-accent/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Timer</p>
              <p className="text-4xl font-mono font-bold text-foreground">{running ? "00:12:34" : "00:00:00"}</p>
              {running && <p className="text-xs text-muted-foreground mt-1">KTM/2081/001 \u2014 Hearing preparation</p>}
            </div>
            <Button size="lg" className={running ? "bg-destructive hover:bg-destructive/90" : ""}
              onClick={() => { setRunning((v) => !v); toast.success(running ? "Timer stopped \u2014 entry saved" : "Timer started"); }}
            >
              {running ? <><Square className="w-4 h-4 mr-2" />Stop</> : <><Play className="w-4 h-4 mr-2" />Start</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Hours This Week", value: "8.0h" },
          { label: "Unbilled Hours", value: "5.5h" },
          { label: "Unbilled Amount", value: formatNPR(unbilledTotal) },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-lg font-bold text-foreground">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Recent Entries</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {ENTRIES.map((e) => (
            <div key={e.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div><p className="text-sm font-medium text-foreground">{e.task}</p><p className="text-xs text-muted-foreground">{e.case} \u2014 {e.date}</p></div>
              </div>
              <div className="flex items-center gap-3 text-right flex-shrink-0">
                <div>
                  <p className="text-sm font-semibold text-foreground">{e.hours}h</p>
                  <p className="text-xs text-muted-foreground">{e.billable ? formatNPR(e.hours * e.rate) : "Non-billable"}</p>
                </div>
                {e.invoiced ? (
                  <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Invoiced</Badge>
                ) : e.billable ? (
                  <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Unbilled</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Internal</Badge>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
