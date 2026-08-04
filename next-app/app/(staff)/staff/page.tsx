"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, CalendarDays, CheckSquare, Clock, AlertTriangle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useQuery } from "@/client/data/convex-bridge";
import { api } from "@/convex/_generated/api.js";
import { PRIORITY_COLORS } from "@/lib/task-constants";
import { useStaffDirectory } from "@/client/queries/identity";
import { useCases } from "@/client/queries/cases";

export default function StaffDashboard() {
  const cases = useCases({}) || [];
  const hearings = useQuery(api.hearings.listHearings, {}) || [];
  const tasks = useQuery(api.tasks.listTasks, {}) || [];
  const workload = useQuery(api.tasks.listWorkload, {}) || [];
  const users = useStaffDirectory() || [];
  const timeEntries = useQuery(api.timeEntries.listTimeEntries, {}) || [];

  // Compute stats dynamically
  const activeCasesCount = cases.filter((c: any) => c.status === "active").length;
  const todayHearingsCount = hearings.filter((h: any) => h.status === "scheduled").length;
  const pendingTasksCount = tasks.filter((t: any) => t.status === "todo" || t.status === "in_progress").length;
  const totalMinutes = timeEntries.reduce((sum: number, e: any) => sum + e.minutes, 0);
  const unbilledHours = (totalMinutes / 60).toFixed(1) + "h";

  const STATS = [
    { label: "Active Cases", value: String(activeCasesCount), icon: FolderOpen, color: "text-blue-400" },
    { label: "Upcoming Hearings", value: String(todayHearingsCount), icon: CalendarDays, color: "text-amber-400" },
    { label: "Pending Tasks", value: String(pendingTasksCount), icon: CheckSquare, color: "text-green-400" },
    { label: "Logged Hours", value: unbilledHours, icon: Clock, color: "text-purple-400" },
  ];

  // Up to 3 upcoming hearings
  const upcomingHearings = hearings
    .filter((h: any) => h.status === "scheduled")
    .slice(0, 3)
    .map((h: any) => {
      const caseObj = cases.find((c: any) => c._id === h.caseId);
      return {
        id: h._id,
        case: caseObj ? caseObj.title : "Unknown Case",
        court: h.court,
        dateBs: h.dateBs,
        time: h.time || "N/A",
        urgent: h.purpose?.toLowerCase().includes("final") || false,
      };
    });

  // Up to 3 priority tasks
  const urgentTasks = tasks
    .filter((t: any) => t.status !== "done" && t.status !== "cancelled")
    .sort((a: any, b: any) => {
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4);
    })
    .slice(0, 3)
    .map((t: any) => ({
      id: t._id,
      title: t.title,
      due: t.dueDateBs || "No due date",
      priority: t.priority,
    }));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Staff Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Good morning. Here's today's overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Upcoming Hearings</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/staff/hearings">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingHearings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No upcoming hearings scheduled.</p>
            ) : (
              upcomingHearings.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex flex-col items-center justify-center text-accent flex-shrink-0">
                      <span className="text-xs font-bold leading-none">{h.dateBs.split(" ")[0] || "Court"}</span>
                      <span className="text-[10px] leading-none opacity-70 mt-0.5">{h.dateBs.split(" ")[1] || ""}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground line-clamp-1">{h.case}</p>
                      <p className="text-xs text-muted-foreground">{h.court} &mdash; {h.time}</p>
                    </div>
                  </div>
                  {h.urgent && <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Priority Tasks</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/staff/tasks">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {urgentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No pending tasks.</p>
            ) : (
              urgentTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    <p className="text-xs text-muted-foreground">Due: {t.due}</p>
                  </div>
                  <Badge className={`text-xs ml-2 flex-shrink-0 uppercase ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Team Workload
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link href="/staff/tasks">Open board</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {workload.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No open tasks.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(workload as any[]).slice(0, 6).map((row) => {
                const user = users.find((u: any) => u._id === row.assignedTo);
                return (
                  <div key={row.assignedTo} className="p-3 rounded-lg border border-border">
                    <p className="text-sm font-semibold truncate">{user?.name || "Staff"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {row.total} open · {row.urgent} high ·{" "}
                      <span className={row.overdue > 0 ? "text-destructive font-medium" : ""}>{row.overdue} overdue</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

