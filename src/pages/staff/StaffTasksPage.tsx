import { useState, useEffect } from "react";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CheckSquare, Plus, Circle, X, Trash2, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Input } from "@/components/ui/input.tsx";

type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";

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
  const tasks = useQuery(api.tasks.listTasks, {}) || [];
  const cases = useQuery(api.cases.listCases, {}) || [];
  const users = useQuery(api.users.listUsers, {}) || [];

  const createTask = useMutation(api.tasks.createTask);
  const updateTask = useMutation(api.tasks.updateTask);
  const deleteTask = useMutation(api.tasks.deleteTask);

  const {
    paginatedItems,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    resetPagination
  } = usePagination(tasks, 12);

  useEffect(() => {
    resetPagination();
  }, [view]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [caseId, setCaseId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [dueDateBs, setDueDateBs] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !assignedTo) {
      toast.error("Please fill in required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createTask({
        title,
        description: description || undefined,
        caseId: caseId ? (caseId as any) : undefined,
        assignedTo: assignedTo as any,
        priority,
        dueDateBs: dueDateBs || undefined,
      });
      toast.success("Task created successfully!");
      setShowCreateModal(false);
      // Reset
      setTitle("");
      setDescription("");
      setCaseId("");
      setAssignedTo("");
      setPriority("medium");
      setDueDateBs("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid opening details modal
    const newStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    try {
      await updateTask({
        taskId: task._id,
        status: newStatus,
      });
      toast.success(newStatus === "done" ? "Task completed!" : "Task set back to To Do.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update task status.");
    }
  };

  const handleUpdateStatus = async (task: any, nextStatus: TaskStatus) => {
    try {
      await updateTask({
        taskId: task._id,
        status: nextStatus,
      });
      toast.success(`Task moved to ${nextStatus.replace("_", " ")}.`);
      if (selectedTask && selectedTask._id === task._id) {
        setSelectedTask((prev: any) => ({ ...prev, status: nextStatus }));
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update task.");
    }
  };

  const handleDeleteTask = async (taskId: any) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask({ taskId });
      toast.success("Task deleted successfully.");
      setShowDetailModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete task.");
    }
  };

  const openDetails = (task: any) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 font-sans">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Tasks</h1>
        <div className="flex gap-2">
          <Button variant={view === "kanban" ? "default" : "secondary"} size="sm" onClick={() => setView("kanban")}>Kanban</Button>
          <Button variant={view === "list" ? "default" : "secondary"} size="sm" onClick={() => setView("list")}>List</Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}><Plus className="w-4 h-4 mr-1" /> New Task</Button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t: any) => t.status === col.key);
            return (
              <div key={col.key} className="space-y-3 bg-secondary/20 p-3 rounded-xl border border-border/40">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground capitalize">{col.label}</h3>
                  <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
                </div>
                <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">No tasks</p>
                  ) : (
                    colTasks.map((task: any) => {
                      const matchedCase = cases.find((c: any) => c._id === task.caseId);
                      return (
                        <Card
                          key={task._id}
                          className={cn("hover:shadow-md transition-all cursor-pointer", task.status === "done" && "opacity-75")}
                          onClick={() => openDetails(task)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2">
                              <button
                                onClick={(e) => handleToggleComplete(task, e)}
                                className="mt-0.5 text-muted-foreground hover:text-accent cursor-pointer flex-shrink-0"
                              >
                                {task.status === "done" ? (
                                  <CheckSquare className="w-4 h-4 text-accent" />
                                ) : (
                                  <Circle className="w-4 h-4" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={cn("text-sm font-semibold truncate", task.status === "done" ? "line-through text-muted-foreground" : "text-foreground")}>
                                  {task.title}
                                </p>
                                {matchedCase && (
                                  <p className="text-xs font-semibold text-muted-foreground truncate mt-0.5">
                                    [{matchedCase.caseNumber}] {matchedCase.title}
                                  </p>
                                )}
                                <div className="flex items-center justify-between gap-1.5 mt-2 flex-wrap">
                                  <Badge className={`text-[9px] uppercase ${PRIORITY_COLORS[task.priority]}`}>
                                    {task.priority}
                                  </Badge>
                                  {task.status !== "done" && task.dueDateBs && (
                                    <span className="text-[10px] text-muted-foreground">Due: {task.dueDateBs}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No tasks recorded.</p>
          ) : (
            paginatedItems.map((task: any) => {
              const matchedCase = cases.find((c: any) => c._id === task.caseId);
              return (
                <Card
                  key={task._id}
                  className={cn("hover:shadow-sm cursor-pointer", task.status === "done" && "opacity-75")}
                  onClick={() => openDetails(task)}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => handleToggleComplete(task, e)}
                        className="text-muted-foreground hover:text-accent cursor-pointer flex-shrink-0"
                      >
                        {task.status === "done" ? (
                          <CheckSquare className="w-4 h-4 text-accent" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>
                      <div>
                        <p className={cn("text-sm font-semibold", task.status === "done" ? "line-through text-muted-foreground" : "text-foreground")}>
                          {task.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {matchedCase ? `[${matchedCase.caseNumber}] ${matchedCase.title}` : "General Task"}{" "}
                          {task.dueDateBs ? `\u2014 Due: ${task.dueDateBs}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs capitalize ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge>
                      <Badge variant="secondary" className="text-xs capitalize">{task.status.replace("_", " ")}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
          
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            onNextPage={nextPage}
            onPrevPage={prevPage}
            className="mt-6"
          />
        </div>
      )}

      {/* Task Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-30">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif font-bold text-lg text-primary">Create New Task</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Task Title <span className="text-destructive">*</span></label>
                <Input
                  required
                  placeholder="Draft client appeal document"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Task Description</label>
                <textarea
                  className="w-full rounded-md border border-input bg-input text-foreground px-3 py-2 text-xs shadow-xs focus-visible:outline-hidden min-h-[60px]"
                  placeholder="Task briefing, special notes, references..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Assignee <span className="text-destructive">*</span></label>
                  <select
                    required
                    className="w-full h-9 rounded-md border border-input bg-input text-foreground px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                  >
                    <option value="">Choose Staff</option>
                    {users
                      .filter((u: any) => u.role !== "client")
                      .map((u: any) => (
                        <option key={u._id} value={u._id}>{u.name || u.email}</option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Related Case</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-input text-foreground px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                  >
                    <option value="">No Case (General Task)</option>
                    {cases
                      .filter((c: any) => c.status === "active")
                      .map((c: any) => (
                        <option key={c._id} value={c._id}>
                          [{c.caseNumber}] {c.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Priority</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-input text-foreground px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Due Date (BS Calendar)</label>
                  <Input
                    placeholder="e.g. 15 Mangsir 2083"
                    value={dueDateBs}
                    onChange={(e) => setDueDateBs(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-30">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif font-bold text-lg text-primary">Task Details</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">{selectedTask.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedTask.description || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-secondary/30 p-3 rounded-lg border">
                <div>
                  <span className="text-muted-foreground block mb-0.5">Assigned To</span>
                  <span className="font-semibold">
                    {users.find((u: any) => u._id === selectedTask.assignedTo)?.name || "Unknown"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Due Date</span>
                  <span className="font-semibold">{selectedTask.dueDateBs || "No due date"}</span>
                </div>
                <div className="mt-2">
                  <span className="text-muted-foreground block mb-0.5">Priority</span>
                  <Badge className={`text-[9px] uppercase ${PRIORITY_COLORS[selectedTask.priority]}`}>
                    {selectedTask.priority}
                  </Badge>
                </div>
                <div className="mt-2">
                  <span className="text-muted-foreground block mb-0.5">Status</span>
                  <Badge variant="secondary" className="text-[9px] uppercase">
                    {selectedTask.status}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">Change Status:</span>
                {(["todo", "in_progress", "done"] as TaskStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(selectedTask, st)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-semibold border transition-all cursor-pointer",
                      selectedTask.status === st
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-muted-foreground border-border hover:bg-secondary/85"
                    )}
                  >
                    {st.replace("_", " ")}
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteTask(selectedTask._id)}
                  className="gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowDetailModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
