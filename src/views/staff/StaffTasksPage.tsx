import { CollectionContinuation } from "@/components/ui/collection-continuation";
import { formatNepalTimestamp, nepalDateOnly, formatOperationalDate } from "@/lib/nepali-calendar";
import { BsDateField } from "@/components/ui/bs-date-field";
import { StaffPagedCollection } from "@/components/dashboard/staff-paged-collection";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Plus,
  Trash2,
  Loader2,
  Save,
  Bell,
  MessageSquare,
  Archive,
  CheckSquare,
  Search,
  KanbanSquare,
  List,
  CalendarDays,
  Users,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import {
  useTasks,
  useUpdateTask,
  useTaskCommands,
  useTaskComments,
  useTaskWorkload,
} from "@/client/queries/tasks";
import { useHearings } from "@/client/queries/hearings";
import { useCases } from "@/client/queries/cases";
import { Input } from "@/components/ui/input.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useI18n } from "@/lib/i18n-context.tsx";
import { TaskCard } from "@/components/tasks/TaskCard.tsx";
import { DueDateFields } from "@/components/tasks/DueDateFields.tsx";
import { TaskCalendarView } from "@/components/tasks/TaskCalendarView.tsx";
import { useSessionCapabilities, useStaffDirectory } from "@/client/queries/identity";
import { useDocumentsQuery } from "@/client/queries/documents";
import { TaskWorkloadView } from "@/components/tasks/TaskWorkloadView.tsx";
import {
  DashboardButton,
  EmptyState,
  DashboardSection,
  usePortalBranding,
  PortalPageShell,
  STAFF_HERO_OUTLINE_BUTTON_CLASS,
  StatusBadge,
  getDashboardStatusTone,
} from "@/components/dashboard";
import { MetricCard } from "@/components/dashboard/dashboard-primitives";
import { Dialog, DialogContent, DialogDescription, DialogHeader } from "@/components/ui/dialog.tsx";
import {
  TASK_STATUS_LABELS,
  TASK_CATEGORY_LABELS,
  isTaskOverdue,
  formatTaskDue,
  type TaskPriority,
  type TaskStatus,
  type TaskCategory,
  type RecurrenceRule,
} from "@/lib/task-constants.ts";

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

type ScopeFilter = "mine" | "all";
type ViewMode = "kanban" | "list" | "calendar" | "workload";

export default function StaffTasksPage() {
  const { t, language } = useI18n();
  const { heroImageUrl } = usePortalBranding();
  const currentUser = useCurrentUser();
  const capabilities = useSessionCapabilities();
  const canViewTeamWorkload = capabilities?.includes("cases.view_all") === true;
  const [view, setView] = useState<ViewMode>("list");
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const moreFiltersTrigger = useRef<HTMLButtonElement>(null);
  const changeMoreFilters = useCallback((open: boolean) => {
    setMoreFiltersOpen(open);
    if (!open)
      requestAnimationFrame(() => {
        (moreFiltersTrigger.current ?? document.getElementById("staff-main-canvas"))?.focus();
      });
  }, []);
  const tasksQuery = useTasks({ includeArchived: showArchivedOnly || undefined });
  const tasks = tasksQuery || [];
  const isTasksLoading = tasksQuery === undefined;
  const workload = useTaskWorkload() || [];
  const cases = useCases({}) || [];
  const users = useStaffDirectory() || [];
  const hearings = useHearings({}) || [];
  const documentsQuery = useDocumentsQuery({});
  const documents = documentsQuery.data || [];

  const { createTask, archiveTask, restoreTask, deleteTask, addComment, scanOverdueReminders } =
    useTaskCommands();
  const updateTask = useUpdateTask();

  const [scope, setScope] = useState<ScopeFilter>("mine");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCase, setFilterCase] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCancelledColumn, setShowCancelledColumn] = useState(false);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [scanning, setScanning] = useState(false);

  const filteredTasks = useMemo(() => {
    let list = [...tasks];
    if (showArchivedOnly) {
      list = list.filter((t: any) => !!t.archivedAt);
    }
    if (scope === "mine" && currentUser?._id) {
      list = list.filter((t: any) => t.assignedTo === currentUser._id);
    }
    if (filterAssignee) list = list.filter((t: any) => t.assignedTo === filterAssignee);
    if (filterPriority) list = list.filter((t: any) => t.priority === filterPriority);
    if (filterCase) list = list.filter((t: any) => t.caseId === filterCase);
    if (filterStatus) list = list.filter((t: any) => t.status === filterStatus);
    else if (!showCancelledColumn && !showArchivedOnly)
      list = list.filter((t: any) => t.status !== "cancelled");
    if (filterOverdue) list = list.filter((t: any) => isTaskOverdue(t));
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((t: any) => {
        const matchedCase = cases.find((c: any) => c._id === t.caseId);
        const hay =
          `${t.title} ${t.description || ""} ${matchedCase?.caseNumber || ""} ${matchedCase?.title || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [
    tasks,
    scope,
    currentUser?._id,
    filterAssignee,
    filterPriority,
    filterCase,
    filterStatus,
    filterOverdue,
    searchQuery,
    showCancelledColumn,
    showArchivedOnly,
    cases,
  ]);

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, prevPage, resetPagination } =
    usePagination(filteredTasks, 12);

  useEffect(() => {
    resetPagination();
  }, [
    view,
    scope,
    filterAssignee,
    filterPriority,
    filterCase,
    filterStatus,
    filterOverdue,
    searchQuery,
    showCancelledColumn,
    showArchivedOnly,
  ]);

  const taskStats = useMemo(() => {
    const todayIso = nepalDateOnly();
    const open = tasks.filter(
      (t: any) => !t.archivedAt && t.status !== "done" && t.status !== "cancelled",
    );
    return {
      open: open.length,
      dueToday: open.filter((t: any) => t.dueDate && nepalDateOnly(t.dueDate) === todayIso).length,
      overdue: open.filter((t: any) => isTaskOverdue(t)).length,
      inProgress: tasks.filter((t: any) => !t.archivedAt && t.status === "in_progress").length,
      done: tasks.filter((t: any) => !t.archivedAt && t.status === "done").length,
    };
  }, [tasks]);

  const viewOptions = useMemo<{ value: ViewMode; label: string; icon: LucideIcon }[]>(
    () => [
      { value: "kanban", label: t("tasks.view_kanban"), icon: KanbanSquare },
      { value: "list", label: t("tasks.view_list"), icon: List },
      { value: "calendar", label: t("tasks.view_calendar"), icon: CalendarDays },
      ...(canViewTeamWorkload
        ? [{ value: "workload" as ViewMode, label: t("tasks.view_workload"), icon: Users }]
        : []),
    ],
    [canViewTeamWorkload, t],
  );

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const taskDialogWasOpen = useRef(false);
  const newTaskTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const wasOpen = taskDialogWasOpen.current;
    taskDialogWasOpen.current = showDetailModal;
    if (!wasOpen || showDetailModal) return;
    const frame = requestAnimationFrame(() => {
      // Archive/delete can remove the row that originally opened the dialog.
      if (document.activeElement === document.body) newTaskTrigger.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [showDetailModal]);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const comments = useTaskComments(selectedTask?._id ? String(selectedTask._id) : null) || [];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [caseId, setCaseId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueDateBs, setDueDateBs] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCaseId, setEditCaseId] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("medium");
  const [editDueDate, setEditDueDate] = useState("");
  const [editDueDateBs, setEditDueDateBs] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("todo");
  const [editHearingId, setEditHearingId] = useState("");
  const [editDocumentId, setEditDocumentId] = useState("");
  const [editCategory, setEditCategory] = useState<TaskCategory | "">("");
  const [editClientVisible, setEditClientVisible] = useState(false);
  const [editRecurring, setEditRecurring] = useState(false);
  const [editRecurrenceRule, setEditRecurrenceRule] = useState<RecurrenceRule | "">("");
  const [editWatchers, setEditWatchers] = useState<string[]>([]);
  const [editReminderAt, setEditReminderAt] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  const subtasks =
    useTasks(selectedTask?._id ? { parentTaskId: String(selectedTask._id) } : "skip") || [];

  const staffUsers = users.filter((u: any) => u.role !== "client");
  const activeCases = cases.filter(
    (c: any) => c.status === "active" || c.status === "on_hold" || c.status === "inquiry",
  );
  const caseHearings = hearings.filter((h: any) => !editCaseId || h.caseId === editCaseId);
  const caseDocs = documents.filter((d: any) => !editCaseId || d.caseId === editCaseId);

  const caseLabel = (task: any) => {
    const matched = cases.find((c: any) => c._id === task.caseId);
    return matched ? `[${matched.caseNumber}] ${matched.title}` : null;
  };

  const resetCreateForm = () => {
    setTitle("");
    setDescription("");
    setCaseId("");
    setAssignedTo(currentUser?._id || "");
    setPriority("medium");
    setDueDate("");
    setDueDateBs("");
  };

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
        dueDate: dueDate || undefined,
        dueDateBs: dueDateBs || undefined,
      });
      toast.success("Task created successfully!");
      setShowCreateModal(false);
      resetCreateForm();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.status === "cancelled") return;
    const newStatus: TaskStatus = task.status === "done" ? "in_progress" : "done";
    try {
      await updateTask({ taskId: task._id, status: newStatus });
      toast.success(newStatus === "done" ? "Task completed!" : "Task reopened as In Progress.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update task status.");
    }
  };

  const handleDragStart = (task: any, e: React.DragEvent) => {
    e.dataTransfer.setData("text/task-id", task._id);
    e.dataTransfer.setData("text/task-status", task.status);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDropOnColumn = async (status: TaskStatus, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData("text/task-id");
    const prevStatus = e.dataTransfer.getData("text/task-status");
    if (!taskId || prevStatus === status) return;
    try {
      await updateTask({ taskId: taskId as any, status });
      toast.success(`Moved to ${TASK_STATUS_LABELS[status]}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to move task.");
    }
  };

  const handleArchiveTask = async (taskId: any) => {
    if (!confirm("Archive this task? It can be restored later from the Archived filter.")) return;
    try {
      await archiveTask(String(taskId));
      toast.success("Task archived.");
      setShowDetailModal(false);
      setSelectedTask(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive task.");
    }
  };

  const handleRestoreTask = async (taskId: any) => {
    try {
      await restoreTask(String(taskId));
      toast.success("Task restored.");
      setShowDetailModal(false);
      setSelectedTask(null);
      setShowArchivedOnly(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to restore task.");
    }
  };

  const handleHardDelete = async (taskId: any) => {
    if (!confirm("Permanently delete this task and its subtasks/comments?")) return;
    try {
      await deleteTask(String(taskId));
      toast.success("Task permanently deleted.");
      setShowDetailModal(false);
      setSelectedTask(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete task.");
    }
  };

  const handleAddSubtask = async () => {
    if (!selectedTask || !subtaskTitle.trim() || !currentUser) return;
    setIsAddingSubtask(true);
    try {
      await createTask({
        title: subtaskTitle.trim(),
        assignedTo: (editAssignedTo || currentUser._id) as any,
        priority: editPriority,
        parentTaskId: selectedTask._id,
        caseId: editCaseId ? (editCaseId as any) : undefined,
      });
      setSubtaskTitle("");
      toast.success("Subtask added");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add subtask");
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const openDetails = (task: any) => {
    setSelectedTask(task);
    setEditTitle(task.title || "");
    setEditDescription(task.description || "");
    setEditCaseId(task.caseId || "");
    setEditAssignedTo(task.assignedTo || "");
    setEditPriority(task.priority || "medium");
    setEditDueDate(task.dueDate || "");
    setEditDueDateBs(task.dueDateBs || "");
    setEditStatus(task.status || "todo");
    setEditHearingId(task.hearingId || "");
    setEditDocumentId(task.documentId || "");
    setEditCategory(task.category || "");
    setEditClientVisible(!!task.clientVisible);
    setEditRecurring(!!task.isRecurring);
    setEditRecurrenceRule(task.recurrenceRule || "");
    setEditWatchers(Array.isArray(task.watchers) ? [...task.watchers] : []);
    setEditReminderAt(task.reminderAt ? nepalDateOnly(task.reminderAt) : "");
    setCommentText("");
    setSubtaskTitle("");
    setShowDetailModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !editTitle.trim() || !editAssignedTo) {
      toast.error("Title and assignee are required.");
      return;
    }
    setIsSavingEdit(true);
    // Editing another field must not turn the existing reminder instant into midnight.
    const reminderAt = selectedTask.reminderAt && editReminderAt === nepalDateOnly(selectedTask.reminderAt)
      ? selectedTask.reminderAt : editReminderAt || null;
    try {
      await updateTask({
        taskId: selectedTask._id,
        title: editTitle.trim(),
        description: editDescription.trim() ? editDescription.trim() : null,
        caseId: editCaseId ? (editCaseId as any) : null,
        assignedTo: editAssignedTo as any,
        priority: editPriority,
        dueDate: editDueDate || null,
        dueDateBs: editDueDateBs.trim() ? editDueDateBs.trim() : null,
        status: editStatus,
        hearingId: editHearingId ? (editHearingId as any) : null,
        documentId: editDocumentId ? (editDocumentId as any) : null,
        category: editCategory || null,
        clientVisible: editClientVisible,
        isRecurring: editRecurring,
        recurrenceRule: editRecurring && editRecurrenceRule ? editRecurrenceRule : null,
        watchers: editWatchers as any,
        reminderAt,
      });
      toast.success("Task updated.");
      setSelectedTask((prev: any) =>
        prev
          ? {
              ...prev,
              title: editTitle.trim(),
              description: editDescription.trim() || undefined,
              caseId: editCaseId || undefined,
              assignedTo: editAssignedTo,
              priority: editPriority,
              dueDate: editDueDate || undefined,
              dueDateBs: editDueDateBs.trim() || undefined,
              status: editStatus,
              hearingId: editHearingId || undefined,
              documentId: editDocumentId || undefined,
              category: editCategory || undefined,
              clientVisible: editClientVisible,
              isRecurring: editRecurring,
              recurrenceRule: editRecurring ? editRecurrenceRule || undefined : undefined,
              watchers: editWatchers,
              reminderAt: reminderAt || undefined,
            }
          : prev,
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to update task.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedTask || !commentText.trim()) return;
    setIsCommenting(true);
    try {
      await addComment(String(selectedTask._id), commentText.trim());
      setCommentText("");
      toast.success("Comment added");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add comment");
    } finally {
      setIsCommenting(false);
    }
  };

  const handleScanOverdue = async () => {
    setScanning(true);
    try {
      const res = await scanOverdueReminders();
      toast.success(`Sent ${(res as any)?.sent ?? 0} overdue reminder(s)`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to scan overdue tasks");
    } finally {
      setScanning(false);
    }
  };

  const kanbanColumns =
    showCancelledColumn || filterStatus === "cancelled"
      ? [...COLUMNS, { key: "cancelled" as TaskStatus, label: "Cancelled" }]
      : COLUMNS;

  const clearFilters = () => {
    setScope("mine");
    setFilterAssignee("");
    setFilterPriority("");
    setFilterCase("");
    setFilterStatus("");
    setFilterOverdue(false);
    setSearchQuery("");
    setShowCancelledColumn(false);
    setShowArchivedOnly(false);
  };

  return (
    <PortalPageShell
      portal="staff"
      titleKey="portal.tasks.title"
      descriptionKey="portal.tasks.description"
      icon={ClipboardList}
      className="staff-tasks-workspace"
      heroClassName="staff-tasks-hero"
      heroChildren={
        <div
          aria-hidden
          className="staff-tasks-hero-art"
          style={
            heroImageUrl
              ? {
                  backgroundImage: `url(${JSON.stringify(heroImageUrl)}), url("/images/staff-home-nepal.jpg")`,
                }
              : undefined
          }
        />
      }
      actions={
        <>
          <DashboardButton
            ref={newTaskTrigger}
            size="sm"
            variant="primary"
            onClick={() => {
              resetCreateForm();
              setShowCreateModal(true);
            }}
          >
            <Plus className="size-3.5" aria-hidden /> {t("tasks.new")}
          </DashboardButton>
          <DashboardButton
            variant="outline"
            size="sm"
            onClick={handleScanOverdue}
            disabled={scanning}
            className={STAFF_HERO_OUTLINE_BUTTON_CLASS}
          >
            {scanning ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Bell className="size-3.5" aria-hidden />
            )}
            {scanning ? "Scanning…" : t("tasks.due_scan")}
          </DashboardButton>
        </>
      }
    >
      {isTasksLoading ? (
        <div
          className="staff-task-loading space-y-5"
          data-view={view}
          role="status"
          aria-busy="true"
          aria-label="Loading tasks"
        >
          <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl border border-dashboard-border bg-dashboard-panel"
              />
            ))}
          </div>
          <div className="h-16 animate-pulse rounded-2xl border border-dashboard-border bg-dashboard-panel" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-72 animate-pulse rounded-2xl border border-dashboard-border bg-dashboard-panel"
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* KPI row */}
          <div className="staff-task-metrics grid grid-cols-2 gap-3.5 xl:grid-cols-4">
            <button
              type="button"
              onClick={clearFilters}
              className="group block rounded-2xl text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus focus-visible:ring-offset-2"
            >
              <MetricCard
                label="Active tasks"
                value={taskStats.open}
                helperText="Accessible open tasks"
                icon={ClipboardList}
                tone="information"
              />
            </button>
            <MetricCard
              label="Due today"
              value={taskStats.dueToday}
              helperText={
                taskStats.overdue > 0 ? `${taskStats.overdue} overdue` : "Nothing overdue"
              }
              icon={Bell}
              tone="warning"
            />
            <button
              type="button"
              onClick={() => {
                clearFilters();
                setFilterStatus("in_progress");
              }}
              className="group block rounded-2xl text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus focus-visible:ring-offset-2"
            >
              <MetricCard
                label="In progress"
                value={taskStats.inProgress}
                helperText="Being worked on"
                icon={KanbanSquare}
                tone="information"
              />
            </button>
            <button
              type="button"
              onClick={() => {
                clearFilters();
                setFilterStatus("done");
              }}
              className="group block rounded-2xl text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus focus-visible:ring-offset-2"
            >
              <MetricCard
                label="Done"
                value={taskStats.done}
                helperText="Completed"
                icon={CheckSquare}
                tone="success"
              />
            </button>
          </div>

          {/* Consolidated toolbar */}
          <DashboardSection title="Filters & view" className="staff-task-filters">
            <div className="flex flex-col gap-3">
              <div className="staff-task-toolbar-top flex flex-col gap-3 sm:flex-row sm:items-center">
                <div role="group" aria-label="Task view" className="staff-task-view-toggle">
                  {viewOptions.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={label}
                      aria-pressed={view === value}
                      onClick={() => setView(value)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus",
                        view === value
                          ? "bg-dashboard-panel text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
                <div
                  className="inline-flex w-fit items-center rounded-lg border border-dashboard-border bg-dashboard-neutral-soft/60 p-1"
                  role="group"
                  aria-label="Task scope"
                >
                  {(
                    [
                      { value: "mine", label: "My Tasks" },
                      { value: "all", label: "All Tasks" },
                    ] as const
                  ).map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={scope === value}
                      onClick={() => setScope(value)}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus",
                        scope === value
                          ? "bg-dashboard-panel text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="relative min-w-[200px] flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    className="pl-9"
                    placeholder="Search title, case…"
                    aria-label="Search tasks"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <p className="text-[11px] font-medium text-muted-foreground whitespace-nowrap sm:ml-auto">
                  {filteredTasks.length} {t("tasks.shown")} · {tasks.length} {t("tasks.total")}
                </p>
                <DashboardButton
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="px-2.5 text-xs"
                >
                  Reset
                </DashboardButton>
              </div>
              <div className="staff-task-filter-fields">
                <Select
                  value={filterCase || "all"}
                  onValueChange={(v) => setFilterCase(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="w-[180px]" aria-label="Filter by case">
                    <SelectValue placeholder="All cases" />
                  </SelectTrigger>
                  <SelectContent className="staff-task-select-menu" collisionPadding={16}>
                    <SelectItem value="all">All cases</SelectItem>
                    {cases.map((c: any) => (
                      <SelectItem key={c._id} value={c._id}>
                        [{c.caseNumber}] {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterAssignee || "all"}
                  onValueChange={(v) => setFilterAssignee(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="w-[150px]" aria-label="Filter by assignee">
                    <SelectValue placeholder="All members" />
                  </SelectTrigger>
                  <SelectContent className="staff-task-select-menu" collisionPadding={16}>
                    <SelectItem value="all">All members</SelectItem>
                    {staffUsers.map((u: any) => (
                      <SelectItem key={u._id} value={u._id}>
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterPriority || "all"}
                  onValueChange={(v) => setFilterPriority(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="w-[130px]" aria-label="Filter by priority">
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent className="staff-task-select-menu" collisionPadding={16}>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filterStatus || "all"}
                  onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="w-[140px]" aria-label="Filter by status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent className="staff-task-select-menu" collisionPadding={16}>
                    <SelectItem value="all">All statuses</SelectItem>
                    {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {TASK_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DashboardButton
                  ref={moreFiltersTrigger}
                  variant="outline"
                  onClick={() => changeMoreFilters(true)}
                  aria-haspopup="dialog"
                  aria-expanded={moreFiltersOpen}
                >
                  More Filters
                  {filterOverdue || showCancelledColumn || showArchivedOnly ? " · Active" : ""}
                </DashboardButton>
              </div>
            </div>
          </DashboardSection>

          <div className="staff-task-workspace-heading">
            <h2>
              {view === "list"
                ? "Task list"
                : view === "kanban"
                  ? "Task board"
                  : view === "calendar"
                    ? "Task calendar"
                    : "Team workload"}
            </h2>
            <p>
              {view === "workload" ? (
                "Open tasks by team member"
              ) : (
                <>
                  {filteredTasks.length} matching tasks ·{" "}
                  {scope === "mine" ? "My Tasks" : "All accessible tasks"}
                </>
              )}
            </p>
          </div>
          {view === "kanban" &&
            (tasks.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No tasks yet"
                description="Create your first task to start tracking work across the team."
                action={
                  <DashboardButton
                    size="sm"
                    onClick={() => {
                      resetCreateForm();
                      setShowCreateModal(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> {t("tasks.new")}
                  </DashboardButton>
                }
              />
            ) : (
              <div
                role="region"
                aria-label="Task status board"
                tabIndex={0}
                className={cn(
                  "staff-task-board grid grid-cols-1 gap-4",
                  kanbanColumns.length === 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3",
                )}
              >
                {kanbanColumns.map((col) => {
                  const colTasks = filteredTasks.filter((t: any) => t.status === col.key);
                  return (
                    <div
                      key={col.key}
                      className={cn(
                        "space-y-3 bg-dashboard-neutral-soft/60 p-3.5 rounded-2xl border border-dashboard-border/60 transition-colors shadow-xs",
                        dragOverCol === col.key &&
                          "border-dashboard-primary bg-dashboard-primary-soft ring-2 ring-dashboard-focus/40",
                      )}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverCol(col.key);
                      }}
                      onDragLeave={() => setDragOverCol((c) => (c === col.key ? null : c))}
                      onDrop={(e) => handleDropOnColumn(col.key, e)}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-border/30">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "size-2 rounded-full",
                              col.key === "todo" && "bg-dashboard-neutral",
                              col.key === "in_progress" && "bg-dashboard-primary",
                              col.key === "done" && "bg-dashboard-success",
                              col.key === "cancelled" && "bg-dashboard-danger",
                            )}
                          />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                            {col.label}
                          </h3>
                        </div>
                        <StatusBadge tone="neutral" className="px-2 py-0.5 text-xs font-semibold">
                          {colTasks.length}
                        </StatusBadge>
                      </div>
                      <div className="space-y-2 max-h-[70vh] overflow-y-auto min-h-[100px] flex flex-col justify-start">
                        {colTasks.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 px-4 my-auto rounded-xl border border-dashed border-dashboard-border/80 bg-dashboard-canvas/40 text-center transition-colors">
                            <CheckSquare className="size-5 text-muted-foreground/40 mb-1.5" />
                            <p className="text-xs font-semibold text-muted-foreground/80">
                              No tasks in {col.label.toLowerCase()}
                            </p>
                            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                              Drag a task here, or edit its status in Task details
                            </p>
                          </div>
                        ) : (
                          <StaffPagedCollection label={`${col.label} tasks`} resetKey={JSON.stringify([col.key, scope, filterAssignee, filterPriority, filterCase, filterStatus, filterOverdue, searchQuery, showArchivedOnly])} pageSize={12} incremental>{colTasks.map((task: any) => (
                            <TaskCard
                              key={task._id}
                              task={task}
                              caseLabel={caseLabel(task)}
                              variant="kanban"
                              draggable
                              onOpen={openDetails}
                              onToggleComplete={handleToggleComplete}
                              onDragStart={handleDragStart}
                            />
                          ))}</StaffPagedCollection>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

          {view === "list" && (
            <div className="staff-task-list space-y-2">
              {paginatedItems.length > 0 ? (
                <div className="staff-task-list-columns" aria-hidden="true">
                  <span>Task</span>
                  <span>Related matter</span>
                  <span>Status</span>
                  <span>Priority</span>
                  <span>Due date</span>
                  <span>Assigned to</span>
                  <span>Actions</span>
                </div>
              ) : null}
              {paginatedItems.length === 0 ? (
                tasks.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title="No tasks yet"
                    description="Create your first task to start tracking work across the team."
                    action={
                      <DashboardButton
                        size="sm"
                        onClick={() => {
                          resetCreateForm();
                          setShowCreateModal(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" /> {t("tasks.new")}
                      </DashboardButton>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={Search}
                    title="No tasks match these filters"
                    description="Try adjusting your search or filters, or reset them to see everything."
                    action={
                      <DashboardButton variant="secondary" size="sm" onClick={clearFilters}>
                        Reset filters
                      </DashboardButton>
                    }
                  />
                )
              ) : (
                paginatedItems.map((task: any) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    caseLabel={caseLabel(task)}
                    variant="list"
                    assigneeLabel={
                      users.find((user: any) => user._id === task.assignedTo)?.name ||
                      "Name unavailable"
                    }
                    onOpen={openDetails}
                    onToggleComplete={handleToggleComplete}
                  />
                ))
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

          {view === "calendar" && <TaskCalendarView tasks={filteredTasks} onOpen={openDetails} staffPaging />}

          {view === "workload" && canViewTeamWorkload && (
            <TaskWorkloadView
              staffPaging
              workload={workload as any[]}
              users={users}
              onFilterAssignee={(id) => {
                setScope("all");
                setFilterAssignee(id);
                setView("list");
              }}
            />
          )}
        </div>
      )}

      <Dialog open={moreFiltersOpen} onOpenChange={changeMoreFilters}>
        <DialogContent
          className="staff-task-dialog staff-task-filter-dialog"
          aria-labelledby="task-filter-heading"
          aria-describedby="task-filter-description"
        >
          <DialogHeader>
            <h2 id="task-filter-heading">More Filters</h2>
            <p id="task-filter-description">
              Refine the existing task collection. Changes apply immediately.
            </p>
          </DialogHeader>
          <div className="staff-task-advanced-filters">
            <button
              type="button"
              aria-pressed={filterOverdue}
              onClick={() => setFilterOverdue((v) => !v)}
              className={cn(
                "inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus",
                filterOverdue
                  ? "border-dashboard-danger/40 bg-dashboard-danger-soft text-dashboard-danger-foreground"
                  : "border-dashboard-border bg-dashboard-panel text-muted-foreground hover:border-dashboard-hover hover:text-foreground",
              )}
            >
              Overdue
            </button>
            <button
              type="button"
              aria-pressed={showCancelledColumn}
              onClick={() => setShowCancelledColumn((v) => !v)}
              className={cn(
                "inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus",
                showCancelledColumn
                  ? "border-dashboard-primary/40 bg-dashboard-primary-soft text-dashboard-primary-foreground"
                  : "border-dashboard-border bg-dashboard-panel text-muted-foreground hover:border-dashboard-hover hover:text-foreground",
              )}
            >
              Cancelled
            </button>
            <button
              type="button"
              aria-pressed={showArchivedOnly}
              onClick={() => setShowArchivedOnly((v) => !v)}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus",
                showArchivedOnly
                  ? "border-dashboard-primary/40 bg-dashboard-primary-soft text-dashboard-primary-foreground"
                  : "border-dashboard-border bg-dashboard-panel text-muted-foreground hover:border-dashboard-hover hover:text-foreground",
              )}
            >
              <Archive className="size-3.5" aria-hidden /> Archived
            </button>
          </div>
          <div className="staff-task-dialog-actions">
            <DashboardButton variant="outline" onClick={clearFilters}>
              Reset filters
            </DashboardButton>
            <DashboardButton onClick={() => changeMoreFilters(false)}>Show tasks</DashboardButton>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent
          className="staff-task-dialog staff-task-create-dialog"
          aria-labelledby="create-task-heading"
          aria-describedby="create-task-description-text"
        >
          <DialogHeader>
            <h2 id="create-task-heading">Create New Task</h2>
            <DialogDescription id="create-task-description-text">
              Scroll to review all fields before creating the task.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="create-task-title" className="text-xs font-medium">
                Task Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="create-task-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Draft client appeal document"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="create-task-description" className="text-xs font-medium">
                Description
              </label>
              <textarea
                id="create-task-description"
                className="w-full rounded-md border border-input bg-input px-3 py-2 text-xs min-h-[60px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="create-task-assignee" className="text-xs font-medium">
                  Assignee *
                </label>
                <select
                  id="create-task-assignee"
                  required
                  className="w-full h-9 rounded-md border border-input bg-input px-3 text-xs"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                >
                  <option value="">Choose Staff</option>
                  {staffUsers.map((u: any) => (
                    <option key={u._id} value={u._id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="create-task-case" className="text-xs font-medium">
                  Related Case
                </label>
                <select
                  id="create-task-case"
                  className="w-full h-9 rounded-md border border-input bg-input px-3 text-xs"
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                >
                  <option value="">No Case</option>
                  {activeCases.map((c: any) => (
                    <option key={c._id} value={c._id}>
                      [{c.caseNumber}] {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="create-task-priority" className="text-xs font-medium">
                Priority
              </label>
              <select
                id="create-task-priority"
                className="w-full h-9 rounded-md border border-input bg-input px-3 text-xs"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <DueDateFields
              idPrefix="create-due"
              dueDate={dueDate}
              dueDateBs={dueDateBs}
              onDueDateChange={(ad, bs) => {
                setDueDate(ad);
                setDueDateBs(bs);
              }}
              onDueDateBsChange={setDueDateBs}
            />
            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Task"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailModal && !!selectedTask} onOpenChange={setShowDetailModal}>
        <DialogContent
          className="staff-task-dialog staff-task-detail-dialog"
          aria-labelledby="task-detail-heading"
          aria-describedby="task-detail-description"
        >
          {selectedTask && (
            <>
              <DialogHeader>
                <p className="staff-task-eyebrow">Task details</p>
                <h2 id="task-detail-heading">{selectedTask.title}</h2>
                <div className="staff-task-detail-badges">
                  <StatusBadge tone={getDashboardStatusTone(selectedTask.status)}>
                    {TASK_STATUS_LABELS[selectedTask.status as TaskStatus] || selectedTask.status}
                  </StatusBadge>
                  <StatusBadge tone={getDashboardStatusTone(selectedTask.priority)}>
                    {selectedTask.priority} priority
                  </StatusBadge>
                  {isTaskOverdue(selectedTask) ? (
                    <StatusBadge tone="danger">Overdue</StatusBadge>
                  ) : null}
                </div>
                <DialogDescription id="task-detail-description">
                  Scroll to review task fields, subtasks, comments and final actions.
                </DialogDescription>
              </DialogHeader>

              <dl className="staff-task-detail-summary">
                <div>
                  <dt>Related matter</dt>
                  <dd>{caseLabel(selectedTask) || "General Task"}</dd>
                </div>
                <div>
                  <dt>Assigned to</dt>
                  <dd>
                    {users.find((user: any) => user._id === selectedTask.assignedTo)?.name ||
                      "Name unavailable"}
                  </dd>
                </div>
                <div>
                  <dt>Due date</dt>
                  <dd>
                    {formatTaskDue(selectedTask) || "Not set"}
                  </dd>
                </div>
              </dl>
              <form
                id="staff-task-edit-form"
                onSubmit={handleSaveEdit}
                className="staff-task-edit-form space-y-4"
              >
                <fieldset className="staff-task-fields">
                  <legend>Task information</legend>
                  <div className="space-y-1">
                    <label htmlFor="edit-task-title" className="text-xs font-medium">
                      Title *
                    </label>
                    <Input
                      id="edit-task-title"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="edit-task-description" className="text-xs font-medium">
                      Description
                    </label>
                    <textarea
                      id="edit-task-description"
                      className="w-full rounded-md border border-input bg-input px-3 py-2 text-xs min-h-[60px]"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="edit-task-assignee" className="text-xs font-medium">
                        Assignee *
                      </label>
                      <select
                        id="edit-task-assignee"
                        required
                        className="w-full h-9 rounded-md border border-input bg-input px-3 text-xs"
                        value={editAssignedTo}
                        onChange={(e) => setEditAssignedTo(e.target.value)}
                      >
                        {staffUsers.map((u: any) => (
                          <option key={u._id} value={u._id}>
                            {u.name || u.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="edit-task-case" className="text-xs font-medium">
                        Case
                      </label>
                      <select
                        id="edit-task-case"
                        className="w-full h-9 rounded-md border border-input bg-input px-3 text-xs"
                        value={editCaseId}
                        onChange={(e) => setEditCaseId(e.target.value)}
                      >
                        <option value="">No Case</option>
                        {cases.map((c: any) => (
                          <option key={c._id} value={c._id}>
                            [{c.caseNumber}] {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </fieldset>
                <fieldset className="staff-task-fields">
                  <legend>Linked records</legend>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="edit-task-hearing" className="text-xs font-medium">
                        Linked Hearing
                      </label>
                      <select
                        id="edit-task-hearing"
                        className="w-full h-9 rounded-md border border-input bg-input px-3 text-xs"
                        value={editHearingId}
                        onChange={(e) => setEditHearingId(e.target.value)}
                      >
                        <option value="">None</option>
                        {caseHearings.map((h: any) => (
                          <option key={h._id} value={h._id}>
                            {formatOperationalDate(h.dateGregorian, h.dateBs, language)} · {h.court}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <CollectionContinuation query={documentsQuery} noun="documents" />
                      <label htmlFor="edit-task-document" className="text-xs font-medium">
                        Linked Document
                      </label>
                      <select
                        id="edit-task-document"
                        className="w-full h-9 rounded-md border border-input bg-input px-3 text-xs"
                        value={editDocumentId}
                        onChange={(e) => setEditDocumentId(e.target.value)}
                      >
                        <option value="">None</option>
                        {editDocumentId && !caseDocs.some((document: any) => document._id === editDocumentId) ? <option value={editDocumentId}>Current linked document (not in loaded results)</option> : null}
                        {caseDocs.map((d: any) => (
                          <option key={d._id} value={d._id}>
                            {d.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </fieldset>
                <fieldset className="staff-task-fields">
                  <legend>Schedule & visibility</legend>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="edit-task-priority" className="text-xs font-medium">
                        Priority
                      </label>
                      <select
                        id="edit-task-priority"
                        className="w-full h-9 rounded-md border border-input bg-input px-3 text-xs"
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="edit-task-status" className="text-xs font-medium">
                        Status
                      </label>
                      <select
                        id="edit-task-status"
                        className="w-full h-9 rounded-md border border-input bg-input px-3 text-xs"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                      >
                        {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {TASK_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <DueDateFields
                    idPrefix="edit-due"
                    dueDate={editDueDate}
                    dueDateBs={editDueDateBs}
                    onDueDateChange={(ad, bs) => {
                      setEditDueDate(ad);
                      setEditDueDateBs(bs);
                    }}
                    onDueDateBsChange={setEditDueDateBs}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="edit-task-category" className="text-xs font-medium">
                        Category
                      </label>
                      <select
                        id="edit-task-category"
                        className="w-full h-9 rounded-md border border-input bg-input px-3 text-xs"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as TaskCategory | "")}
                      >
                        <option value="">None</option>
                        {(Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[]).map((c) => (
                          <option key={c} value={c}>
                            {TASK_CATEGORY_LABELS[c]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="edit-task-recurrence" className="text-xs font-medium">
                        Recurrence
                      </label>
                      <select
                        id="edit-task-recurrence"
                        className="w-full h-9 rounded-md border border-input bg-input px-3 text-xs"
                        value={editRecurring ? editRecurrenceRule : ""}
                        onChange={(e) => {
                          const v = e.target.value as RecurrenceRule | "";
                          setEditRecurring(!!v);
                          setEditRecurrenceRule(v);
                        }}
                      >
                        <option value="">None</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={editClientVisible}
                      onChange={(e) => setEditClientVisible(e.target.checked)}
                    />
                    Visible on client checklist portal
                  </label>

                  <div className="space-y-1">
                    <label htmlFor="edit-task-reminder" className="text-xs font-medium">
                      Reminder date
                    </label>
                    <BsDateField
                      id="edit-task-reminder"
                      value={editReminderAt}
                      onDateChange={(e) => setEditReminderAt(e)}
                    />
                  </div>

                </fieldset>
                <fieldset className="staff-task-fields">
                  <legend>Watchers</legend>
                  <div className="staff-task-related-list border border-border rounded-md p-2 space-y-1">
                    {staffUsers
                      .filter((u: any) => u._id !== editAssignedTo)
                      .map((u: any) => {
                        const checked = editWatchers.includes(u._id);
                        return (
                          <label
                            key={u._id}
                            className="flex items-center gap-2 text-xs cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="accent-primary"
                              checked={checked}
                              onChange={() => {
                                setEditWatchers((prev) =>
                                  checked ? prev.filter((id) => id !== u._id) : [...prev, u._id],
                                );
                              }}
                            />
                            {u.name || u.email}
                          </label>
                        );
                      })}
                    {staffUsers.filter((u: any) => u._id !== editAssignedTo).length === 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        No other staff to watch.
                      </p>
                    )}
                  </div>
                </fieldset>
              </form>

              {/* Subtasks */}
              <div className="border border-border rounded-lg p-3 space-y-2">
                <h3 className="staff-task-section-title">Subtasks</h3>
                <div className="staff-task-related-list space-y-1">
                  {subtasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No subtasks.</p>
                  ) : (
                    <StaffPagedCollection label="Subtasks" resetKey={String(selectedTask?._id ?? "")} pageSize={6}>{subtasks.map((st: any) => (
                      <label key={st._id} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={st.status === "done"}
                          onChange={(e) => {
                            updateTask({
                              taskId: st._id,
                              status: e.target.checked ? "done" : "todo",
                            }).catch(() => toast.error("Failed to update subtask"));
                          }}
                        />
                        <span
                          className={
                            st.status === "done" ? "line-through text-muted-foreground" : ""
                          }
                        >
                          {st.title}
                        </span>
                      </label>
                    ))}</StaffPagedCollection>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    className="h-8 text-xs"
                    aria-label="New subtask"
                    placeholder="Add subtask…"
                    value={subtaskTitle}
                    onChange={(e) => setSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleAddSubtask();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isAddingSubtask || !subtaskTitle.trim()}
                    onClick={handleAddSubtask}
                  >
                    {isAddingSubtask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
                  </Button>
                </div>
              </div>

              {/* Comments */}
              <div className="border border-border rounded-lg p-3 space-y-2">
                <h3 className="staff-task-section-title flex items-center gap-2">
                  <MessageSquare className="size-4" aria-hidden /> Comments
                </h3>
                <div className="staff-task-related-list space-y-2">
                  {comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No comments yet.</p>
                  ) : (
                    <StaffPagedCollection label="Task comments" resetKey={String(selectedTask?._id ?? "")} pageSize={6}>{comments.map((c: any) => {
                      const author = users.find((u: any) => u._id === c.authorId);
                      return (
                        <div key={c._id} className="text-xs bg-secondary/30 rounded px-2 py-1.5">
                          <span className="font-semibold">{author?.name || "Staff"}</span>
                          <span className="text-muted-foreground ml-2">
                            {formatNepalTimestamp(c._creationTime)}
                          </span>
                          <p className="mt-0.5 text-foreground">{c.content}</p>
                        </div>
                      );
                    })}</StaffPagedCollection>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    className="h-8 text-xs"
                    aria-label="New comment"
                    placeholder="Add a note…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleAddComment();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isCommenting || !commentText.trim()}
                    onClick={handleAddComment}
                  >
                    {isCommenting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Post"}
                  </Button>
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground flex gap-2 items-center">
                <StatusBadge
                  tone={getDashboardStatusTone(editPriority)}
                  className="text-[9px] uppercase"
                >
                  {editPriority}
                </StatusBadge>
                {selectedTask.completedAt && (
                  <span>Completed: {formatNepalTimestamp(selectedTask.completedAt)}</span>
                )}
              </div>
              <footer className="staff-task-detail-actions">
                <p id="task-save-help" className="staff-task-action-note">
                  Save updates task fields. Subtasks and comments are saved separately with Add and
                  Post.
                </p>
                <div className="staff-task-final-action-row">
                  <div
                    className="staff-task-record-actions"
                    role="group"
                    aria-label="Task record actions"
                  >
                    {selectedTask.archivedAt ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreTask(selectedTask._id)}
                        className="gap-1"
                      >
                        Restore
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleArchiveTask(selectedTask._id)}
                        className="gap-1"
                      >
                        <Archive className="w-3.5 h-3.5" /> Archive
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleHardDelete(selectedTask._id)}
                      className="gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  </div>
                  <div className="staff-task-save-actions" role="group" aria-label="Task edit actions">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowDetailModal(false)}
                    >
                      Close
                    </Button>
                    <Button
                      type="submit"
                      form="staff-task-edit-form"
                      aria-describedby="task-save-help"
                      size="sm"
                      disabled={isSavingEdit}
                    >
                      {isSavingEdit ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5 mr-1" /> Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </footer>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
