import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Users } from "lucide-react";

type WorkloadRow = {
  assignedTo: string;
  total: number;
  urgent: number;
  overdue: number;
};

type Props = {
  workload: WorkloadRow[];
  users: any[];
  onFilterAssignee: (userId: string) => void;
};

export function TaskWorkloadView({ workload, users, onFilterAssignee }: Props) {
  if (workload.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">No open tasks to show workload.</p>
    );
  }

  const max = Math.max(...workload.map((w) => w.total), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-primary" />
        <h3 className="font-serif text-lg font-bold">Team Workload</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {workload.map((row) => {
          const user = users.find((u: any) => u._id === row.assignedTo);
          const pct = Math.round((row.total / max) * 100);
          return (
            <Card
              key={row.assignedTo}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => onFilterAssignee(row.assignedTo)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold truncate">{user?.name || user?.email || "Unknown"}</p>
                  <Badge variant="secondary">{row.total} open</Badge>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-primary/80 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span className="text-orange-600 dark:text-orange-400 font-medium">{row.urgent} high/urgent</span>
                  <span className={row.overdue > 0 ? "text-destructive font-medium" : ""}>{row.overdue} overdue</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
