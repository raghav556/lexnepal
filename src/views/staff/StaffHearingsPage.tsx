import { StaffPagedCollection } from "@/components/dashboard/staff-paged-collection";
import { BsDateField } from "@/components/ui/bs-date-field";
import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader } from "@/components/ui/dialog.tsx";
import {
  CalendarDays,
  CalendarCheck,
  Archive,
  Plus,
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
import {
  bsDateParts,
  gregorianToBs,
  formatBs,
  nepalDateOnly,
  viewDateIso,
  calendarMonthBounds,
  calendarMonthLabel,
  calendarDayLabel,
  calendarDateLabel,
  calendarWeekdays,
  shiftCalendarMonth,
  canShiftCalendarMonth,
} from "@/lib/nepali-calendar.ts";
import { COURTS } from "@/lib/lex-constants.ts";
import { CourtSelect } from "@/components/ui/court-select";
import {
  courtMatchesSearch,
  formatCourtName,
  officialCourtValue,
  sameCourt,
} from "@/lib/nepal-courts";
import { useI18n } from "@/lib/i18n-context.tsx";
import { useStaffDirectory } from "@/client/queries/identity";
import { useCases } from "@/client/queries/cases";
import { useHearings, useHearingCommands } from "@/client/queries/hearings";
import { useTasks, useTaskCommands, useUpdateTask } from "@/client/queries/tasks";
import { format, eachDayOfInterval, getDay } from "date-fns";

import {
  DashboardButton,
  DashboardSection,
  DashboardStatusLabel,
  DualDateDisplay,
  EmptyState,
  PortalPageShell,
  StatusBadge,
  usePortalBranding,
} from "@/components/dashboard";

/** Today's calendar date (YYYY-MM-DD) in Nepal time, independent of the browser/UTC zone. */
function nepalTodayKey(now: Date = new Date()): string {
  return nepalDateOnly(now);
}

/** Splits a stored BS date ("24 Ashwin 2083") for the date tile; null when missing/invalid. */
function parseBsDate(raw: unknown): { day: string; rest: string } | null {
  if (typeof raw !== "string") return null;
  const tokens = raw.trim().split(/\s+/);
  if (tokens.length < 2 || !/^[\d\u0966-\u096F]{1,2}$/.test(tokens[0])) return null;
  return { day: tokens[0], rest: tokens.slice(1).join(" ") };
}

function adParts(iso: unknown): { label: string; weekday: string } | null {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return { label: format(date, "dd MMM yyyy"), weekday: format(date, "EEE") };
}

export default function StaffHearingsPage() {
  const { language } = useI18n();
  const { heroImageUrl } = usePortalBranding();
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
  const [currentMonth, setCurrentMonth] = useState(() => new Date(`${nepalDateOnly()}T12:00:00`));

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
        setDateBs(formatBs(gregorianToBs(val)));
      } catch {
        setDateBs("");
      }
    } else setDateBs("");
  };

  const handleNextGregorianChange = (val: string) => {
    setNextDateGregorian(val);
    if (val) {
      try {
        setNextDateBs(formatBs(gregorianToBs(val)));
      } catch {
        setNextDateBs("");
      }
    } else setNextDateBs("");
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
    if (!caseId || !officialCourtValue(court) || !dateGregorian || !dateBs)
      return toast.error("Please fill in all required fields.");
    setIsSubmitting(true);
    try {
      await createHearing({
        caseId: caseId as any,
        court: officialCourtValue(court)!,
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
      matchedCase?.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      courtMatchesSearch(h.court, search);
    const courtMatch = courtFilter === "all" || sameCourt(h.court, courtFilter);
    return searchMatch && courtMatch;
  });

  const past = hearings.filter((h: any) => h.status !== "scheduled");
  const todayKey = nepalTodayKey();
  const hearingsToday = upcoming.filter((h: any) => h.dateGregorian === todayKey).length;

  // Calendar Logic
  const daysInMonth = eachDayOfInterval({
    start: new Date(`${calendarMonthBounds(viewDateIso(currentMonth), language).start}T12:00:00`),
    end: new Date(`${calendarMonthBounds(viewDateIso(currentMonth), language).end}T12:00:00`),
  });
  const leadingBlanks = getDay(
    new Date(`${calendarMonthBounds(viewDateIso(currentMonth), language).start}T12:00:00`),
  );
  const trailingBlanks = (7 - ((leadingBlanks + daysInMonth.length) % 7)) % 7;

  // Context for the Update Result dialog
  const selectedHearing: any = hearings.find((h: any) => h._id === selectedHearingId);
  const selectedCase: any = selectedHearing
    ? cases.find((c: any) => c._id === selectedHearing.caseId)
    : undefined;
  const selectedAd = adParts(selectedHearing?.dateGregorian);

  return (
    <PortalPageShell
      portal="staff"
      titleKey="portal.hearings.title"
      descriptionKey="portal.hearings.description"
      icon={CalendarDays}
      className="staff-hearings-workspace"
      heroClassName="staff-hearings-hero"
      metricsClassName="staff-hearings-metrics"
      metrics={[
        {
          label: "Today's hearings",
          value: String(hearingsToday),
          icon: CalendarCheck,
          tone: "information",
          helperText: hearingsToday === 0 ? "No hearings today" : "On today's docket",
        },
        {
          label: "Scheduled",
          value: String(upcoming.length),
          icon: CalendarDays,
          tone: "warning",
          helperText: "Upcoming hearings",
        },
        {
          label: "Conflicts",
          value: String(conflictIds.size),
          icon: AlertTriangle,
          tone: conflictIds.size > 0 ? "danger" : "success",
          helperText: conflictIds.size > 0 ? "Lawyer double-bookings" : "No conflicts",
        },
        {
          label: "Past archive",
          value: String(past.length),
          icon: Archive,
          tone: "neutral",
          helperText: "Recorded outcomes",
        },
      ]}
      heroChildren={
        <div
          aria-hidden
          className="staff-hearings-hero-art"
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
        <DashboardButton size="sm" variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="size-3.5" aria-hidden /> Add hearing
        </DashboardButton>
      }
    >
      <div className="staff-hearings-toolbar" role="region" aria-label="View and filters">
        <div className="staff-hearings-toolbar-title">
          <Filter className="size-4" aria-hidden /> View &amp; filters
        </div>
        <div role="group" aria-label="Hearings view" className="staff-hearings-view-toggle">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={viewMode === "list"}
            onClick={() => setViewMode("list")}
          >
            <ListIcon className="size-4" aria-hidden /> List View
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={viewMode === "calendar"}
            onClick={() => setViewMode("calendar")}
          >
            <CalendarIcon className="size-4" aria-hidden /> Calendar Grid
          </Button>
        </div>

        {viewMode === "list" ? (
          <div className="staff-hearings-filter-fields">
            <div className="staff-hearings-search">
              <Search className="staff-hearings-search-icon" aria-hidden />
              <Input
                aria-label="Search hearings by case title or number"
                placeholder="Search cases..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <CourtSelect
              id="hearing-court-filter"
              aria-label="Filter by court"
              value={courtFilter === "all" ? "" : courtFilter}
              filter
              onValueChange={(court) => setCourtFilter(court || "all")}
            />
          </div>
        ) : null}
      </div>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <DashboardSection
          className="staff-hearings-calendar-section"
          title={calendarMonthLabel(viewDateIso(currentMonth), language)}
          icon={CalendarIcon}
          actions={
            <div className="staff-hearings-month-nav">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Previous month"
                disabled={!canShiftCalendarMonth(viewDateIso(currentMonth), -1, language)}
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      `${shiftCalendarMonth(viewDateIso(currentMonth), -1, language)}T12:00:00`,
                    ),
                  )
                }
              >
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Next month"
                disabled={!canShiftCalendarMonth(viewDateIso(currentMonth), 1, language)}
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      `${shiftCalendarMonth(viewDateIso(currentMonth), 1, language)}T12:00:00`,
                    ),
                  )
                }
              >
                <ChevronRight className="size-4" aria-hidden />
              </Button>
              <StatusBadge tone="neutral" className="font-mono">
                {calendarDateLabel(viewDateIso(currentMonth), language)}
              </StatusBadge>
            </div>
          }
        >
          <div
            className="staff-hearings-calendar-scroll"
            role="region"
            aria-label="Hearing calendar (scroll horizontally on small screens)"
            tabIndex={0}
          >
            <div className="staff-hearings-calendar">
              {calendarWeekdays(language).map((d) => (
                <div key={d} className="staff-hearings-weekday">
                  {d}
                </div>
              ))}
              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <div
                  key={`lead-${i}`}
                  aria-hidden
                  className="staff-hearings-day"
                  data-blank="true"
                />
              ))}
              {daysInMonth.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayHearings = upcoming.filter((h: any) => h.dateGregorian === dateStr);
                const isToday = dateStr === todayKey;
                return (
                  <div
                    key={day.toISOString()}
                    className="staff-hearings-day"
                    data-date={dateStr}
                    data-calendar-system={language === "ne" ? "bs" : "ad"}
                    data-today={isToday ? "true" : undefined}
                  >
                    <div className="staff-hearings-day-head">
                      <span className="staff-hearings-day-number">
                        {calendarDayLabel(dateStr, language)}

                        {isToday ? <span className="sr-only"> (today)</span> : null}
                      </span>
                      {dayHearings.length > 0 && (
                        <StatusBadge tone="information" className="text-[10px] h-4 px-1">
                          {dayHearings.length}
                        </StatusBadge>
                      )}
                    </div>
                    <div className="staff-hearings-day-items">
                      {dayHearings.map((h: any) => {
                        const c = cases.find((c: any) => c._id === h.caseId);
                        const hasConflict = conflictIds.has(h._id);
                        return (
                          <button
                            key={h._id}
                            type="button"
                            className="staff-hearings-day-hearing"
                            data-conflict={hasConflict ? "true" : undefined}
                            aria-label={`Update result: ${c?.caseNumber || "hearing"} at ${h.time || "time to be decided"}${hasConflict ? ", conflict" : ""}`}
                            onClick={() => openUpdateModal(h)}
                          >
                            <strong>{h.time || "TBD"}</strong> • {c?.caseNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {Array.from({ length: trailingBlanks }).map((_, i) => (
                <div
                  key={`trail-${i}`}
                  aria-hidden
                  className="staff-hearings-day"
                  data-blank="true"
                />
              ))}
            </div>
          </div>
        </DashboardSection>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="staff-hearings-layout">
          <DashboardSection
            className="staff-hearings-docket"
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
              <ul className="staff-hearings-list">
                {
                  <StaffPagedCollection
                    label="Upcoming hearings"
                    resetKey={`${search}|${courtFilter}`}
                    footerAs="li"
                  >
                    {filteredUpcoming.map((h: any) => {
                      const matchedCase = cases.find((c: any) => c._id === h.caseId);
                      const lawyer = matchedCase
                        ? users.find((u: any) => u._id === matchedCase.assignedLawyerId)
                        : null;
                      const hasConflict = conflictIds.has(h._id);
                      const prepTasks = allTasks.filter((t: any) => t.hearingId === h._id);
                      const prepDone = prepTasks.filter((t: any) => t.status === "done").length;
                      const primaryDate = bsDateParts(h.dateGregorian, language);
                      const bs = primaryDate
                        ? { day: primaryDate.day, rest: `${primaryDate.month} ${primaryDate.year}` }
                        : parseBsDate(h.dateBs);
                      const ad = adParts(h.dateGregorian);

                      return (
                        <li
                          key={h._id}
                          className="staff-hearings-card"
                          data-conflict={hasConflict ? "true" : undefined}
                        >
                          <div className="staff-hearings-date" data-bs={bs ? "valid" : "missing"}>
                            <span className="staff-hearings-date-day">{bs ? bs.day : "—"}</span>
                            <span className="staff-hearings-date-month">
                              {bs ? bs.rest : "B.S. date unavailable"}
                            </span>
                            {ad ? (
                              <span className="staff-hearings-date-ad">
                                {ad.label} · {ad.weekday}
                              </span>
                            ) : (
                              <span className="staff-hearings-date-ad">A.D. date unavailable</span>
                            )}
                          </div>

                          <div className="staff-hearings-card-head">
                            <div className="min-w-0">
                              <h3 className="staff-hearings-card-title">
                                {matchedCase?.title || "Unknown"}
                              </h3>
                              <p className="staff-hearings-card-number">
                                {matchedCase?.caseNumber}
                              </p>
                            </div>
                            <div className="staff-hearings-card-badges">
                              {hasConflict && (
                                <StatusBadge tone="danger" icon={AlertTriangle}>
                                  Conflict
                                </StatusBadge>
                              )}
                              <DashboardStatusLabel
                                status={h.status}
                                className="text-[10px] uppercase font-bold tracking-wide shrink-0"
                              />
                            </div>
                          </div>

                          <div className="staff-hearings-meta">
                            <div>
                              <MapPin aria-hidden />{" "}
                              <span title={h.court}>{formatCourtName(h.court, language)}</span>
                            </div>
                            <div>
                              <Clock aria-hidden /> <span>{h.time || "Time TBD"}</span>
                            </div>
                            <div>
                              <Scale aria-hidden /> <span>{h.judge || "Judge Unassigned"}</span>
                            </div>
                            <div>
                              <User aria-hidden /> <span>{lawyer?.name || "Unassigned"}</span>
                            </div>
                          </div>

                          {h.purpose && (
                            <div className="staff-hearings-purpose">
                              <strong>Purpose:</strong> {h.purpose}
                            </div>
                          )}

                          <div className="staff-hearings-prep">
                            <div className="staff-hearings-prep-head">
                              <h4>Hearing prep tasks</h4>
                              {prepTasks.length > 0 ? (
                                <span>
                                  {prepDone} of {prepTasks.length} completed
                                </span>
                              ) : null}
                            </div>
                            {prepTasks.length === 0 ? (
                              <div className="staff-hearings-prep-empty">
                                <p>No prep tasks linked yet. Generate the standard Bahas pack.</p>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={prepLoadingId === h._id}
                                  onClick={() => handleGeneratePrepTasks(h._id)}
                                >
                                  {prepLoadingId === h._id ? (
                                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                                  ) : (
                                    <CheckSquare className="size-3.5" aria-hidden />
                                  )}
                                  Generate prep pack
                                </Button>
                              </div>
                            ) : (
                              <div className="staff-hearings-prep-list">
                                {
                                  <StaffPagedCollection
                                    label="Hearing prep tasks"
                                    navigationLabel={`Prep tasks for ${h.purpose || matchedCase?.caseNumber || "hearing"} on ${h.dateGregorian}`}
                                    resetKey={String(h._id)}
                                    pageSize={6}
                                  >
                                    {prepTasks.map((task: any) => (
                                      <label key={task._id} className="staff-hearings-prep-item">
                                        <input
                                          type="checkbox"
                                          checked={task.status === "done"}
                                          onChange={(e) => {
                                            updateTask({
                                              taskId: task._id,
                                              status: e.target.checked ? "done" : "in_progress",
                                            }).catch(() => toast.error("Failed to update task"));
                                          }}
                                        />
                                        <span
                                          data-done={task.status === "done" ? "true" : undefined}
                                        >
                                          {task.title}
                                        </span>
                                      </label>
                                    ))}
                                  </StaffPagedCollection>
                                }
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="staff-hearings-sync"
                                  disabled={prepLoadingId === h._id}
                                  onClick={() => handleGeneratePrepTasks(h._id)}
                                >
                                  Sync missing prep items
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="staff-hearings-card-foot">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openUpdateModal(h)}
                            >
                              <Edit2 className="size-3.5" aria-hidden /> Update Result
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </StaffPagedCollection>
                }
              </ul>
            )}
          </DashboardSection>

          <div className="staff-hearings-side">
            <DashboardSection
              title="Automated Pesi sync"
              icon={Server}
              className="staff-hearings-pesi"
            >
              <div className="staff-hearings-pesi-body">
                <p className="staff-hearings-pesi-title">Automated Pesi sync is not connected.</p>
                <p>
                  No court cause-list integration is configured. Add hearings manually until an
                  official court API or import is available.
                </p>
              </div>
            </DashboardSection>

            <DashboardSection title="Past hearings archive" className="staff-hearings-archive">
              {past.length === 0 ? (
                <EmptyState
                  title="No past hearings"
                  description="No past hearings recorded."
                  icon={CalendarDays}
                  className="py-6 border-0"
                />
              ) : (
                <ul className="staff-hearings-archive-list">
                  {
                    <StaffPagedCollection label="Past hearings" resetKey="past" footerAs="li">
                      {past.map((h: any) => {
                        const matchedCase = cases.find((c: any) => c._id === h.caseId);
                        return (
                          <li key={h._id}>
                            <button
                              type="button"
                              className="staff-hearings-archive-row"
                              onClick={() => openUpdateModal(h)}
                            >
                              <span className="staff-hearings-archive-top">
                                <span className="staff-hearings-archive-title">
                                  {matchedCase?.title}
                                </span>
                                <DashboardStatusLabel
                                  status={h.status}
                                  className="text-[9px] uppercase shrink-0"
                                />
                              </span>
                              <span className="staff-hearings-archive-sub">
                                <DualDateDisplay isoDate={h.dateGregorian} recordedBs={h.dateBs} />{" "}
                                — {formatCourtName(h.court, language)}
                              </span>
                              {h.outcome && (
                                <span className="staff-hearings-archive-outcome">
                                  Outcome: {h.outcome}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </StaffPagedCollection>
                  }
                </ul>
              )}
            </DashboardSection>
          </div>
        </div>
      )}

      {/* Schedule Hearing Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent
          className="staff-hearings-dialog"
          aria-labelledby="hearing-create-title"
          aria-describedby="hearing-create-description"
        >
          <DialogHeader>
            <h2 id="hearing-create-title">Schedule Case Hearing</h2>
            <DialogDescription id="hearing-create-description">
              Choose an active case, then set the court, date and time. Fields marked * are
              required.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleHearing} className="staff-hearings-form">
            <div className="staff-hearings-dialog-body">
              <div className="staff-hearings-field">
                <label htmlFor="hearing-create-case">
                  Select Case <span aria-hidden>*</span>
                </label>
                <select
                  id="hearing-create-case"
                  required
                  className="staff-hearings-select"
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
              <div className="staff-hearings-field">
                <label htmlFor="hearing-create-court">
                  Court <span aria-hidden>*</span>
                </label>
                <CourtSelect
                  id="hearing-create-court"
                  required
                  value={court}
                  onValueChange={setCourt}
                />
              </div>
              <div className="staff-hearings-field-row">
                <div className="staff-hearings-field locale-date-full-row">
                  <label htmlFor="hearing-create-date">
                    Date <span aria-hidden>*</span>
                  </label>
                  <BsDateField
                    id="hearing-create-date"
                    required
                    value={dateGregorian}
                    onDateChange={handleGregorianChange}
                  />
                </div>
              </div>
              <div className="staff-hearings-field-row">
                <div className="staff-hearings-field">
                  <label htmlFor="hearing-create-time">Time</label>
                  <Input
                    id="hearing-create-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
                <div className="staff-hearings-field">
                  <label htmlFor="hearing-create-judge">Judge Name</label>
                  <Input
                    id="hearing-create-judge"
                    placeholder="Hon. Justice ..."
                    value={judge}
                    onChange={(e) => setJudge(e.target.value)}
                  />
                </div>
              </div>
              <div className="staff-hearings-field">
                <label htmlFor="hearing-create-purpose">Hearing Purpose</label>
                <Input
                  id="hearing-create-purpose"
                  placeholder="First hearing / Written statement / Bail debate"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>
            </div>
            <div className="staff-hearings-dialog-actions">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" aria-label="Scheduling" />
                ) : (
                  "Schedule Hearing"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Hearing Status Modal */}
      <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
        <DialogContent
          className="staff-hearings-dialog"
          aria-labelledby="hearing-update-title"
          aria-describedby="hearing-update-description"
        >
          <DialogHeader>
            <h2 id="hearing-update-title">Update Hearing Results</h2>
            <DialogDescription id="hearing-update-description">
              Record the status and outcome for{" "}
              {selectedCase?.title ? `"${selectedCase.title}"` : "the selected hearing"}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateHearing} className="staff-hearings-form">
            <div className="staff-hearings-dialog-body">
              <dl className="staff-hearings-context" aria-label="Hearing being updated">
                <div>
                  <dt>Case</dt>
                  <dd>
                    {selectedCase?.title || "Unknown case"}
                    {selectedCase?.caseNumber ? <small>{selectedCase.caseNumber}</small> : null}
                  </dd>
                </div>
                <div>
                  <dt>Hearing</dt>
                  <dd>
                    {selectedAd
                      ? `${selectedAd.label} · ${selectedAd.weekday}`
                      : "Date unavailable"}
                    <small>
                      {[
                        selectedHearing?.time,
                        selectedHearing?.court
                          ? formatCourtName(selectedHearing.court, language)
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Court and time not recorded"}
                    </small>
                  </dd>
                </div>
              </dl>
              <div className="staff-hearings-field">
                <label htmlFor="hearing-update-status">Hearing Status</label>
                <select
                  id="hearing-update-status"
                  className="staff-hearings-select"
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
              <div className="staff-hearings-field">
                <label htmlFor="hearing-update-outcome">
                  Outcome / Verdict Summary{" "}
                  {status === "completed" ? <span aria-hidden>*</span> : null}
                </label>
                <textarea
                  id="hearing-update-outcome"
                  required={status === "completed"}
                  className="staff-hearings-textarea"
                  placeholder="Case outcome, court directions, verbal orders..."
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                />
              </div>
              {(status === "adjourned" ||
                status === "postponed" ||
                status === "part_heard" ||
                status === "continuous") && (
                <fieldset className="staff-hearings-next-date">
                  <legend>
                    <Clock className="size-3.5" aria-hidden /> Next Adjourned Date
                  </legend>
                  <div className="staff-hearings-field-row">
                    <div className="staff-hearings-field locale-date-full-row">
                      <label htmlFor="hearing-update-next-date">Date</label>
                      <BsDateField
                        id="hearing-update-next-date"
                        value={nextDateGregorian}
                        onDateChange={handleNextGregorianChange}
                      />
                    </div>
                  </div>
                </fieldset>
              )}
            </div>
            <div className="staff-hearings-dialog-actions">
              <Button type="button" variant="outline" onClick={() => setShowUpdateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <Loader2 className="size-4 animate-spin" aria-label="Saving" />
                ) : (
                  "Save Outcome"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
