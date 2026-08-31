import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  CalendarDays,
  Plus,
  X,
  Loader2,
  Edit2,
  Search,
  Filter,
  List as ListIcon,
  Calendar as CalendarIcon,
  MapPin,
  Scale,
  User,
  CheckSquare,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Server,
} from "lucide-react";
import { toast } from "sonner";
import { formatDualDate, gregorianToBs, formatBs } from "@/lib/nepali-calendar.ts";
import { COURTS } from "@/lib/lex-constants.ts";
import { useI18n } from "@/lib/i18n-context.tsx";
import { getBSDate } from "@/lib/bs-calendar.ts";
import { useStaffDirectory } from "@/client/queries/identity";
import { useCases } from "@/client/queries/cases";
import { useHearings, useHearingCommands } from "@/client/queries/hearings";
import { useTasks, useTaskCommands, useUpdateTask } from "@/client/queries/tasks";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";

import {
  DashboardButton,
  DashboardFilterBar,
  DashboardListRow,
  DashboardSection,
  DashboardStatusLabel,
  DualDateDisplay,
  EmptyState,
  PortalPageShell,
  StatusBadge,
} from "@/components/dashboard";
import { DASHBOARD_METRIC_TONES, DASHBOARD_TONE_PANEL_CLASSES } from "@/lib/dashboard-semantics";

export default function StaffHearingsPage() {
  const { t, language } = useI18n();
  const hearings = useHearings({}) || [];
  const cases = useCases({}) || [];
  const users = useStaffDirectory() || [];
  const { createHearing, updateHearing } = useHearingCommands();
  const { createHearingPrepTasks } = useTaskCommands();
  const updateTask = useUpdateTask();
  const allTasks = useTasks({}) || [];
  const [prepLoadingId, setPrepLoadingId] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // UI Toggles
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [search, setSearch] = useState("");
  const [courtFilter, setCourtFilter] = useState("all");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Scheduling Form State
  const [caseId, setCaseId] = useState("");
  const [court, setCourt] = useState(COURTS[0]);
  const [judge, setJudge] = useState("");
  const [dateGregorian, setDateGregorian] = useState("");
  const [dateBs, setDateBs] = useState("");
  const [time, setTime] = useState("10:00");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Updating Form State
  const [selectedHearingId, setSelectedHearingId] = useState("");
  const [outcome, setOutcome] = useState("");
  const [status, setStatus] = useState("completed");
  const [nextDateGregorian, setNextDateGregorian] = useState("");
  const [nextDateBs, setNextDateBs] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Handle Gregorian date selection
  const handleGregorianChange = (val: string) => {
    setDateGregorian(val);
    if (val) {
      try {
        const parts = val.split("-").map(Number);
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        setDateBs(formatBs(gregorianToBs(d)));
      } catch (e) {}
    }
  };

  const handleNextGregorianChange = (val: string) => {
    setNextDateGregorian(val);
    if (val) {
      try {
        const parts = val.split("-").map(Number);
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        setNextDateBs(formatBs(gregorianToBs(d)));
      } catch (e) {}
    }
  };

  const handleGeneratePrepTasks = async (hearingId: string) => {
    setPrepLoadingId(hearingId);
    try {
      const res = await createHearingPrepTasks(hearingId);
      toast.success(
        `Prep pack: ${(res as any).created} created, ${(res as any).skipped} already linked.`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate prep tasks.");
    } finally {
      setPrepLoadingId(null);
    }
  };

  const handleScheduleHearing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !court || !dateGregorian || !dateBs)
      return toast.error("Please fill in all required fields.");
    setIsSubmitting(true);
    try {
      await createHearing({
        caseId: caseId as any,
        court,
        judge: judge || undefined,
        dateGregorian,
        dateBs,
        time: time || undefined,
        purpose: purpose || undefined,
        notes: notes || undefined,
      });
      toast.success("Hearing scheduled successfully!");
      setShowCreateModal(false);
      setCaseId("");
      setCourt(COURTS[0]);
      setJudge("");
      setDateGregorian("");
      setDateBs("");
      setPurpose("");
      setNotes("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to schedule hearing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateHearing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHearingId) return;
    setIsUpdating(true);
    try {
      await updateHearing(String(selectedHearingId), {
        status: status as any,
        outcome: outcome || undefined,
        nextDateGregorian: nextDateGregorian || undefined,
        nextDateBs: nextDateBs || undefined,
        notes: updateNotes || undefined,
      });
      toast.success("Hearing status updated!");
      setShowUpdateModal(false);
      setSelectedHearingId("");
      setOutcome("");
      setStatus("completed");
      setNextDateGregorian("");
      setNextDateBs("");
      setUpdateNotes("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update hearing.");
    } finally {
      setIsUpdating(false);
    }
  };

  const openUpdateModal = (hearing: any) => {
    setSelectedHearingId(hearing._id);
    setStatus(hearing.status || "completed");
    setOutcome(hearing.outcome || "");
    setUpdateNotes(hearing.notes || "");
    setShowUpdateModal(true);
  };

  // Conflict Detection Algorithm
  // If the same lawyer has >= 2 hearings on the same date, flag them as conflict.
  const lawyerHearingMap: Record<string, string[]> = {};
  const upcoming = hearings.filter((h: any) => h.status === "scheduled");

  upcoming.forEach((h: any) => {
    const c = cases.find((c: any) => c._id === h.caseId);
    if (c?.assignedLawyerId) {
      const key = `${c.assignedLawyerId}_${h.dateGregorian}`;
      if (!lawyerHearingMap[key]) lawyerHearingMap[key] = [];
      lawyerHearingMap[key].push(h._id);
    }
  });

  const conflictIds = new Set<string>();
  Object.values(lawyerHearingMap).forEach((arr) => {
    if (arr.length > 1) arr.forEach((id) => conflictIds.add(id));
  });

  // Filters
  const filteredUpcoming = upcoming.filter((h: any) => {
    const matchedCase = cases.find((c: any) => c._id === h.caseId);
    const searchMatch =
      !search ||
      matchedCase?.title.toLowerCase().includes(search.toLowerCase()) ||
      matchedCase?.caseNumber.toLowerCase().includes(search.toLowerCase());
    const courtMatch = courtFilter === "all" || h.court === courtFilter;
    return searchMatch && courtMatch;
  });

  const past = hearings.filter((h: any) => h.status !== "scheduled");

  // Calendar Logic
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  return (
    <PortalPageShell
      portal="staff"
      decorated
      showTodayDate
      eyebrow="Court operations"
      titleKey="portal.hearings.title"
      descriptionKey="portal.hearings.description"
      icon={CalendarDays}
      metrics={[
        {
          label: "Scheduled",
          value: String(upcoming.length),
          icon: CalendarDays,
          tone: DASHBOARD_METRIC_TONES.hearings,
          helperText: "Upcoming hearings",
        },
        {
          label: "Conflicts",
          value: String(conflictIds.size),
          tone: conflictIds.size > 0 ? "danger" : "success",
          helperText: "Lawyer double-bookings",
        },
        {
          label: "Past archive",
          value: String(past.length),
          tone: "neutral",
          helperText: "Recorded outcomes",
        },
      ]}
      actions={
        <DashboardButton onClick={() => setShowCreateModal(true)}>
          <Plus className="size-4 mr-2" aria-hidden /> Add hearing
        </DashboardButton>
      }
    >
      <DashboardSection title="View & filters">
        <DashboardFilterBar className="justify-between">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <ListIcon className="w-4 h-4 mr-2" /> List View
            </Button>
            <Button
              variant={viewMode === "calendar" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
            >
              <CalendarIcon className="w-4 h-4 mr-2" /> Calendar Grid
            </Button>
          </div>

          {viewMode === "list" ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-8 h-9 text-xs w-full sm:w-[220px] bg-dashboard-panel"
                  placeholder="Search cases..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="h-9 rounded-md border border-dashboard-border bg-dashboard-panel px-3 py-1 text-xs outline-hidden"
                value={courtFilter}
                onChange={(e) => setCourtFilter(e.target.value)}
              >
                <option value="all">All Courts</option>
                {COURTS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </DashboardFilterBar>
      </DashboardSection>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <DashboardSection
          title={format(currentMonth, "MMMM yyyy")}
          icon={CalendarIcon}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="w-4 h-4" aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="w-4 h-4" aria-hidden />
              </Button>
              <StatusBadge tone="neutral" className="font-mono">
                {getBSDate(format(currentMonth, "yyyy-MM-dd"), language === "ne")}
              </StatusBadge>
            </div>
          }
        >
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="p-2 text-center text-xs font-bold text-muted-foreground uppercase"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 bg-border gap-[1px]">
            {daysInMonth.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayHearings = upcoming.filter((h: any) => h.dateGregorian === dateStr);
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={`bg-card min-h-[120px] p-2 ${isToday ? "bg-primary/5" : ""}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`text-sm font-bold ${isToday ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {format(day, "d")}
                    </span>
                    {dayHearings.length > 0 && (
                      <StatusBadge tone="information" className="text-[10px] h-4 px-1">
                        {dayHearings.length}
                      </StatusBadge>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayHearings.map((h: any) => {
                      const c = cases.find((c: any) => c._id === h.caseId);
                      const hasConflict = conflictIds.has(h._id);
                      return (
                        <div
                          key={h._id}
                          className={`text-[10px] p-1.5 rounded truncate border cursor-pointer hover:shadow-sm ${
                            hasConflict
                              ? DASHBOARD_TONE_PANEL_CLASSES.danger
                              : "bg-dashboard-neutral-soft border-dashboard-border"
                          }`}
                          onClick={() => openUpdateModal(h)}
                        >
                          <span className="font-bold">{h.time || "TBD"}</span> • {c?.caseNumber}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardSection>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <DashboardSection
            className="lg:col-span-2"
            title="Active hearing docket"
            icon={CalendarDays}
          >
            {filteredUpcoming.length === 0 ? (
              <EmptyState
                title="No upcoming hearings"
                description="No upcoming hearings scheduled."
                icon={CalendarDays}
              />
            ) : (
              <div className="space-y-3">
                {filteredUpcoming.map((h: any) => {
                  const matchedCase = cases.find((c: any) => c._id === h.caseId);
                  const lawyer = matchedCase
                    ? users.find((u: any) => u._id === matchedCase.assignedLawyerId)
                    : null;
                  const hasConflict = conflictIds.has(h._id);
                  const prepTasks = allTasks.filter((t: any) => t.hearingId === h._id);
                  const prepDone = prepTasks.filter((t: any) => t.status === "done").length;

                  return (
                    <DashboardListRow
                      key={h._id}
                      className={`p-4 sm:p-5 flex-col items-stretch ${hasConflict ? "border-dashboard-danger/40 bg-dashboard-danger-soft/30" : ""}`}
                    >
                      <div className="flex flex-col sm:flex-row gap-5 w-full">
                        <div className="flex-shrink-0 flex flex-col items-center justify-center w-24 h-24 rounded-2xl bg-dashboard-neutral-soft border border-dashboard-border">
                          <span className="text-3xl font-serif font-bold text-dashboard-primary leading-none">
                            {h.dateBs.split(" ")[0]}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground mt-1 uppercase">
                            {h.dateBs.split(" ").slice(1).join(" ")}
                          </span>
                          <StatusBadge tone="neutral" className="mt-2 text-[9px]">
                            <DualDateDisplay isoDate={h.dateGregorian} />
                          </StatusBadge>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-bold text-foreground text-lg truncate flex items-center gap-2">
                                {matchedCase?.title || "Unknown"}
                                {hasConflict && (
                                  <StatusBadge
                                    tone="danger"
                                    icon={AlertTriangle}
                                    className="animate-pulse"
                                  >
                                    Conflict
                                  </StatusBadge>
                                )}
                              </h4>
                              <p className="text-sm font-mono text-muted-foreground">
                                {matchedCase?.caseNumber}
                              </p>
                            </div>
                            <DashboardStatusLabel
                              status={h.status}
                              className="text-[10px] uppercase font-bold tracking-wide shrink-0"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-y-2 mt-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="w-4 h-4 text-dashboard-primary" />{" "}
                              <span className="truncate">{h.court}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="w-4 h-4 text-dashboard-primary" />{" "}
                              <span>{h.time || "Time TBD"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Scale className="w-4 h-4 text-dashboard-primary" />{" "}
                              <span className="truncate">{h.judge || "Judge Unassigned"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="w-4 h-4 text-dashboard-primary" />{" "}
                              <span className="truncate font-medium">
                                {lawyer?.name || "Unassigned"}
                              </span>
                            </div>
                          </div>

                          {h.purpose && (
                            <div className="mt-3 text-sm bg-dashboard-information-soft/50 p-2 rounded text-foreground border border-dashboard-information/20">
                              <strong>Purpose:</strong> {h.purpose}
                            </div>
                          )}

                          <div className="mt-4 pt-4 border-t border-dashboard-border">
                            <div className="flex items-center justify-between mb-2 gap-2">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Hearing prep tasks
                              </h5>
                              <span className="text-xs font-mono">
                                {prepDone}/{Math.max(prepTasks.length, 3)} Done
                              </span>
                            </div>
                            {prepTasks.length === 0 ? (
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">
                                  No prep tasks linked yet. Generate the standard Bahas pack.
                                </p>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={prepLoadingId === h._id}
                                  onClick={() => handleGeneratePrepTasks(h._id)}
                                >
                                  {prepLoadingId === h._id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                  ) : (
                                    <CheckSquare className="w-3.5 h-3.5 mr-1" />
                                  )}
                                  Generate prep pack
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {prepTasks.map((task: any) => (
                                  <label
                                    key={task._id}
                                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-dashboard-panel-hover p-1 rounded transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      className="accent-primary w-4 h-4"
                                      checked={task.status === "done"}
                                      onChange={(e) => {
                                        updateTask({
                                          taskId: task._id,
                                          status: e.target.checked ? "done" : "in_progress",
                                        }).catch(() => toast.error("Failed to update task"));
                                      }}
                                    />
                                    <span
                                      className={
                                        task.status === "done"
                                          ? "line-through text-muted-foreground"
                                          : "text-foreground"
                                      }
                                    >
                                      {task.title}
                                    </span>
                                  </label>
                                ))}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs px-1"
                                  disabled={prepLoadingId === h._id}
                                  onClick={() => handleGeneratePrepTasks(h._id)}
                                >
                                  Sync missing prep items
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="w-full flex justify-end gap-2 pt-3 border-t border-dashboard-border mt-3">
                        <Button variant="outline" size="sm" onClick={() => openUpdateModal(h)}>
                          <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Update Result
                        </Button>
                      </div>
                    </DashboardListRow>
                  );
                })}
              </div>
            )}
          </DashboardSection>

          <div className="space-y-6">
            <DashboardSection
              title="Automated Pesi sync"
              icon={Server}
              className="border-dashboard-warning/30"
            >
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Automated Pesi sync is not connected.
                </p>
                <p className="text-xs text-muted-foreground">
                  No court cause-list integration is configured. Add hearings manually until an
                  official court API or import is available.
                </p>
              </div>
            </DashboardSection>

            <DashboardSection title="Past hearings archive" className="!p-0">
              {past.length === 0 ? (
                <EmptyState
                  title="No past hearings"
                  description="No past hearings recorded."
                  icon={CalendarDays}
                  className="py-6 border-0"
                />
              ) : (
                <div className="divide-y divide-dashboard-border max-h-[400px] overflow-y-auto">
                  {past.map((h: any) => {
                    const matchedCase = cases.find((c: any) => c._id === h.caseId);
                    return (
                      <div
                        key={h._id}
                        className="p-3 opacity-75 hover:opacity-100 hover:bg-dashboard-panel-hover transition-all cursor-pointer"
                        onClick={() => openUpdateModal(h)}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-sm font-semibold line-clamp-1">{matchedCase?.title}</p>
                          <DashboardStatusLabel
                            status={h.status}
                            className="text-[9px] uppercase shrink-0"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          <DualDateDisplay isoDate={h.dateGregorian || h.dateBs} /> — {h.court}
                        </p>
                        {h.outcome && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 bg-dashboard-panel border border-dashboard-border p-1 rounded font-mono">
                            Outcome: {h.outcome}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </DashboardSection>
          </div>
        </div>
      )}

      {/* Modals omitted for brevity, keeping old ones as is */}
      {/* ...Wait, I must include all modals to prevent breaking the code... */}

      {/* Schedule Hearing Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-30 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-auto scale-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="font-serif font-bold text-xl text-primary">Schedule Case Hearing</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleScheduleHearing} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Select Case <span className="text-destructive">*</span>
                </label>
                <select
                  required
                  className="w-full h-10 rounded-md border border-input bg-secondary/30 text-foreground px-3 py-1 text-sm shadow-xs focus-visible:outline-hidden"
                  value={caseId}
                  onChange={(e) => {
                    setCaseId(e.target.value);
                    const selected = cases.find((c: any) => c._id === e.target.value);
                    if (selected && selected.court) setCourt(selected.court);
                  }}
                >
                  <option value="">Choose Case</option>
                  {cases
                    .filter((c: any) => c.status === "active")
                    .map((c: any) => (
                      <option key={c._id} value={c._id}>
                        [{c.caseNumber}] {c.title}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Court Room <span className="text-destructive">*</span>
                </label>
                <select
                  required
                  className="w-full h-10 rounded-md border border-input bg-secondary/30 text-foreground px-3 py-1 text-sm shadow-xs focus-visible:outline-hidden"
                  value={court}
                  onChange={(e) => setCourt(e.target.value)}
                >
                  {COURTS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Gregorian Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    type="date"
                    className="bg-secondary/30"
                    value={dateGregorian}
                    onChange={(e) => handleGregorianChange(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Nepali Date (B.S.)
                  </label>
                  <Input
                    readOnly
                    placeholder="Auto-calculated"
                    className="bg-muted font-bold"
                    value={dateBs}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Time
                  </label>
                  <Input
                    type="time"
                    className="bg-secondary/30"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Judge Name
                  </label>
                  <Input
                    placeholder="Hon. Justice ..."
                    className="bg-secondary/30"
                    value={judge}
                    onChange={(e) => setJudge(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Hearing Purpose
                </label>
                <Input
                  placeholder="First hearing / Written statement / Bail debate"
                  className="bg-secondary/30"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 shadow-md shadow-primary/20"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Schedule Hearing"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Hearing Status Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in-30 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-auto scale-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="font-serif font-bold text-xl text-primary">Update Hearing Results</h3>
              <button
                onClick={() => setShowUpdateModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateHearing} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Hearing Status
                </label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-secondary/30 text-foreground px-3 py-1 text-sm shadow-xs focus-visible:outline-hidden"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="completed">Completed</option>
                  <option value="adjourned">Adjourned (Postponed)</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="postponed">Postponed / Adjourned</option>
                  <option value="not_reached">Not Reached / Left Over</option>
                  <option value="bench_disqualified">Cannot Be Heard / Bench Disqualified</option>
                  <option value="could_not_present">Could Not Be Presented</option>
                  <option value="part_heard">Part-Heard / Under Consideration</option>
                  <option value="continuous">Continuous Hearing</option>
                  <option value="procedural_order">Procedural Order / Direction</option>
                  <option value="evidence_exam">Evidence Examination</option>
                  <option value="final_judgment">Decided / Final Judgment</option>
                  <option value="dismissed">Dismissed</option>
                  <option value="settled">Settled / Compromised</option>
                  <option value="archived">Filed Away / Archived</option>
                  <option value="on_hold">Put on Hold / Stayed</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Outcome / Verdict Summary
                </label>
                <textarea
                  required={status === "completed"}
                  className="w-full rounded-md border border-input bg-secondary/30 text-foreground px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden min-h-[80px]"
                  placeholder="Case outcome, court directions, verbal orders..."
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                />
              </div>
              {(status === "adjourned" ||
                status === "postponed" ||
                status === "part_heard" ||
                status === "continuous") && (
                <div className="border border-amber-200 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl space-y-3">
                  <h4 className="text-[11px] font-bold text-amber-600 uppercase tracking-wide flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Next Adjourned Date
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">
                        Gregorian Date
                      </label>
                      <Input
                        type="date"
                        className="h-9 bg-background"
                        value={nextDateGregorian}
                        onChange={(e) => handleNextGregorianChange(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">
                        Nepali Date
                      </label>
                      <Input
                        readOnly
                        placeholder="Auto"
                        className="h-9 bg-muted font-bold"
                        value={nextDateBs}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowUpdateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 shadow-md shadow-primary/20"
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Outcome"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalPageShell>
  );
}
