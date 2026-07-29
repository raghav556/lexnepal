import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CheckSquare, Plus, Circle } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

type TaskStatus = "todo" | "in_progress" | "done";

const TASKS = [
  { id: "1", title: "File bail application \u2014 Gurung case", case: "KTM/2081/003", due: "Today", priority: "urgent", status: "todo" as TaskStatus },
  { id: "2", title: "Review MOA draft before client meeting", case: "KTM/2081/567", due: "Tomorrow", priority: "high", status: "in_progress" as TaskStatus },
  { id: "3", title: "Submit trademark registration docs", case: "KTM/2081/002", due: "3 days", priority: "medium", status: "todo" as TaskStatus },
  { id: "4", title: "Draft power of attorney for Thapa matter", case: "KTM/2081/008", due: "5 days", priority: "medium", status: "todo" as TaskStatus },
  { id: "5", title: "Prepare hearing brief", case: "KTM/2081/001", due: "Today", priority: "high", status: "in_progress" as TaskStatus },
  { id: "6", title: "Send invoice to Nepal Bank Ltd.", case: "KTM/2081/004", due: "Completed", priority: "low", status: "done" as TaskStatus },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

export default function StaffTasksPage() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [tasks] = useState(TASKS);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Tasks</h1>
        <div className="flex gap-2">
          <Button variant={view === "kanban" ? "default" : "secondary"} size="sm" onClick={() => setView("kanban")}>Kanban</Button>
          <Button variant={view === "list" ? "default" : "secondary"} size="sm" onClick={() => setView("list")}>List</Button>
          <Button size="sm" onClick={() => toast.info("Task creation coming in the next milestone!")}><Plus className="w-4 h-4 mr-1" /> New Task</Button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.key} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                <Badge variant="secondary" className="text-xs">{tasks.filter((t) => t.status === col.key).length}</Badge>
              </div>
              <div className="space-y-2">
                {tasks.filter((t) => t.status === col.key).map((task) => (
                  <Card key={task.id} className={cn("hover:shadow-sm transition-shadow", task.status === "done" && "opacity-60")}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        {task.status === "done" ? <CheckSquare className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
                        <div>
                          <p className={cn("text-sm font-medium", task.status === "done" ? "line-through text-muted-foreground" : "text-foreground")}>{task.title}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{task.case}</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge>
                            {task.status !== "done" && <span className="text-xs text-muted-foreground">Due: {task.due}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card key={task.id} className={cn("hover:shadow-sm", task.status === "done" && "opacity-60")}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {task.status === "done" ? <CheckSquare className="w-4 h-4 text-accent flex-shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  <div>
                    <p className={cn("text-sm font-medium", task.status === "done" ? "line-through text-muted-foreground" : "text-foreground")}>{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.case} \u2014 Due: {task.due}</p>
                  </div>
                </div>
                <Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
