"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  Clock3,
  Database,
  Leaf,
  Loader2,
  LogIn,
  LogOut,
  Send,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser, STAFF_ROLES } from "@/hooks/use-current-user";
import { useHrCommands } from "@/client/queries/hr";
import { ApiClientError } from "@/client/api/errors";
import {
  DashboardButton,
  DashboardSection,
  DualDateDisplay,
  EmptyState,
  MetricCard,
  PortalPageShell,
  StatusBadge,
  usePortalBranding,
} from "@/components/dashboard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { getDashboardStatusTone } from "@/lib/dashboard-semantics";
import type { LeaveCreateInput, LeaveBalanceDto } from "@/shared/contracts/hr";
import { nowHrClockLabel } from "@/shared/hr/timezone";
import {
  attendanceState,
  daysRecorded,
  hrClock,
  hrDuration,
  HR_ATTENDANCE_STATUSES,
  HR_LEAVE_STATUSES,
  HR_LEAVE_TYPES,
  kathmanduDate,
  recentHrWeek,
  recordedDuration,
  upcomingHrLeaves,
  validateHrLeave,
  validHrDate,
  supportsHrDualDate,
} from "./staff-hr-model";
import { useStaffHrData } from "./use-staff-hr-data";

const PAGE_SIZE = 8;
const displayDate = (date: string) => supportsHrDualDate(date)
  ? <DualDateDisplay isoDate={`${date}T12:00:00`} alwaysDual />
  : <span>{date} AD (BS unavailable)</span>;
function errorText(error: unknown) {
  if (error instanceof ApiClientError && error.status === 401)
    return "Your session expired. Sign in again, then retry.";
  if (error instanceof ApiClientError && error.status === 403)
    return "You do not have permission for this HR action.";
  return error instanceof Error
    ? error.message
    : "This request could not be completed. Please retry.";
}
function ResourceState({
  loading,
  error,
  retry,
  label,
}: {
  loading: boolean;
  error: unknown;
  retry: () => unknown;
  label: string;
}) {
  if (loading)
    return (
      <p className="staff-hr-notice" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading {label}…
      </p>
    );
  if (error)
    return (
      <div className="staff-hr-notice staff-hr-error" role="alert">
        <span>
          {label}: {errorText(error)}
        </span>
        <DashboardButton
          size="sm"
          variant="outline"
          onClick={() => {
            void retry();
          }}
        >
          Retry {label}
        </DashboardButton>
      </div>
    );
  return null;
}
function BalanceRows({ balances }: { balances: LeaveBalanceDto[] }) {
  if (!balances.length)
    return (
      <EmptyState
        title="No balances on file"
        description="No leave balance was returned for this year. Your HR administrator can confirm your entitlement."
        icon={Leaf}
      />
    );
  return (
    <div className="staff-hr-balances">
      {balances.map((row) => (
        <article key={row.type} className="staff-hr-balance">
          <div className="staff-hr-balance-title">
            <span className="staff-hr-icon">
              <Leaf className="size-4" aria-hidden />
            </span>
            <h3>{HR_LEAVE_TYPES[row.type]}</h3>
            <strong>
              {row.remainingDays} <span>days left</span>
            </strong>
          </div>
          <progress
            aria-label={`${HR_LEAVE_TYPES[row.type]} remaining`}
            max={Math.max(1, row.entitledDays)}
            value={Math.min(row.remainingDays, row.entitledDays)}
          />
          <dl>
            <div>
              <dt>Entitled</dt>
              <dd>{row.entitledDays} days</dd>
            </div>
            <div>
              <dt>Used</dt>
              <dd>{row.usedDays} days</dd>
            </div>
            <div>
              <dt>Pending</dt>
              <dd>{row.pendingDays} days</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
function HistoryPages({
  page,
  total,
  onChange,
  label,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
  label: string;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div className="staff-hr-pagination">
      <span>
        {total
          ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} records`
          : "0 records"}
      </span>
      <Pagination
        ariaLabel={label}
        currentPage={page}
        totalPages={pages}
        onPageChange={onChange}
        onNextPage={() => onChange(Math.min(page + 1, pages))}
        onPrevPage={() => onChange(Math.max(1, page - 1))}
      />
    </div>
  );
}

export default function StaffHRPage() {
  const user = useCurrentUser();
  const userId = user?.id ?? user?._id;
  const authorized = Boolean(userId && user && STAFF_ROLES.includes(user.role));
  const [today, setToday] = useState(() => kathmanduDate());
  useEffect(() => {
    const update = () => setToday(kathmanduDate());
    const interval = window.setInterval(update, 60_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const year = Number(today.slice(0, 4));
  const resources = useStaffHrData(userId, year, authorized);
  const { attendance: a, requests: l, balances: b } = resources;
  const { upsertAttendance, createLeaveRequest } = useHrCommands();
  const { heroImageUrl } = usePortalBranding();
  const [tab, setTab] = useState("attendance");
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const [attendancePage, setAttendancePage] = useState(1);
  const [leavePage, setLeavePage] = useState(1);
  const [leaveFilter, setLeaveFilter] = useState("all");
  const [operation, setOperation] = useState<"in" | "out" | "leave" | null>(null);
  const locked = useRef(false);
  const [feedback, setFeedback] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmOut, setConfirmOut] = useState(false);
  const clockTrigger = useRef<HTMLElement | null>(null);
  const wasConfirming = useRef(false);
  useEffect(() => {
    const closed = wasConfirming.current && !confirmOut;
    wasConfirming.current = confirmOut;
    if (!closed) return;
    const frame = requestAnimationFrame(() => {
      const trigger = clockTrigger.current;
      if (trigger?.isConnected && !trigger.matches(":disabled"))
        trigger.focus({ preventScroll: true });
      else document.getElementById("staff-hr-history")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [confirmOut]);
  const [leaveType, setLeaveType] = useState<LeaveCreateInput["type"]>("annual");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const busy = operation !== null;

  useEffect(() => {
    if (!focusTarget) return;
    const frame = requestAnimationFrame(() => {
      const el = document.getElementById(focusTarget);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
      setFocusTarget(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [tab, focusTarget]);
  const go = (next: string, target: string) => {
    setTab(next);
    setFocusTarget(target);
  };
  const attendance = useMemo(
    () =>
      (a.data ?? [])
        .filter((row) => row.userId === userId && validHrDate(row.date))
        .sort((x, y) => y.date.localeCompare(x.date)),
    [a.data, userId],
  );
  const leaves = useMemo(
    () =>
      (l.data ?? [])
        .filter(
          (row) => row.userId === userId && validHrDate(row.fromDate) && validHrDate(row.toDate),
        )
        .sort((x, y) => y.fromDate.localeCompare(x.fromDate)),
    [l.data, userId],
  );
  const balances = (b.data ?? []).filter((row) => row.userId === userId && row.year === year);
  const record = attendance.find((row) => row.date === today);
  const state = attendanceState(record);
  const canAttendance = authorized && a.ready && !a.fetching && !busy;
  const canRequest = authorized && l.ready && !l.fetching && !busy;
  const history = attendance.filter((row) => row.date <= today);
  const selectedAttendancePage = Math.min(
    attendancePage,
    Math.max(1, Math.ceil(history.length / PAGE_SIZE)),
  );
  const filteredLeaves = leaves.filter(
    (row) => leaveFilter === "all" || row.status === leaveFilter,
  );
  const selectedLeavePage = Math.min(
    leavePage,
    Math.max(1, Math.ceil(filteredLeaves.length / PAGE_SIZE)),
  );
  // Persist the displayed page after a refresh shrinks either history.
  if (attendancePage !== selectedAttendancePage) setAttendancePage(selectedAttendancePage);
  if (leavePage !== selectedLeavePage) setLeavePage(selectedLeavePage);
  const upcoming = upcomingHrLeaves(leaves, today).slice(0, 4);
  const annual = balances.find((row) => row.type === "annual");

  async function clock(action: "in" | "out") {
    if (locked.current || !canAttendance || !userId) return;
    const actualToday = kathmanduDate();
    if (actualToday !== today) {
      setToday(actualToday);
      setActionError("The Kathmandu date changed. Review today's record before clocking.");
      return;
    }
    const current = attendanceState(record);
    if (action === "in" ? !current.canClockIn : !current.canClockOut) return;
    const clockLabel = nowHrClockLabel();
    if (
      action === "out" &&
      recordedDuration({ date: today, clockIn: record?.clockIn, clockOut: clockLabel }) === null
    ) {
      setActionError(
        "Clock out must be later than clock in. Please wait until a later recorded minute.",
      );
      return;
    }
    locked.current = true;
    setOperation(action);
    setActionError("");
    setFeedback("");
    try {
      await upsertAttendance.mutateAsync({
        userId,
        date: actualToday,
        status: "present",
        clockIn: action === "in" ? clockLabel : record?.clockIn,
        ...(action === "out" ? { clockOut: clockLabel } : {}),
      });
      const message = action === "in" ? "Clock-in saved." : "Clock-out saved.";
      setFeedback(message);
      toast.success(message);
      setConfirmOut(false);
    } catch (error) {
      setActionError(errorText(error));
    } finally {
      locked.current = false;
      setOperation(null);
    }
  }
  function openClockOut() {
    clockTrigger.current = document.activeElement as HTMLElement;
    setActionError("");
    setConfirmOut(true);
  }
  const clockButtons = (
    <div className="staff-hr-buttons">
      <DashboardButton
        size="sm"
        variant="primary"
        disabled={!canAttendance || !state.canClockIn}
        onClick={() => {
          void clock("in");
        }}
      >
        <LogIn className="size-4" aria-hidden />
        {operation === "in" ? "Clocking in…" : "Clock In"}
      </DashboardButton>
      <DashboardButton
        size="sm"
        variant="outline"
        disabled={!canAttendance || !state.canClockOut}
        onClick={openClockOut}
      >
        <LogOut className="size-4" aria-hidden />
        Clock Out
      </DashboardButton>
    </div>
  );

  async function submitLeave(event: FormEvent) {
    event.preventDefault();
    if (locked.current || !canRequest) return;
    const result = validateHrLeave({
      type: leaveType,
      fromDate,
      toDate,
      reason: reason.trim() || undefined,
    });
    if (result.error) {
      setFormError(result.error);
      return;
    }
    locked.current = true;
    setOperation("leave");
    setFormError("");
    setFeedback("");
    try {
      await createLeaveRequest.mutateAsync(result.data!);
      setFeedback("Leave request submitted for review.");
      toast.success("Leave request submitted.");
      setReason("");
      setFromDate(kathmanduDate());
      setToDate(kathmanduDate());
      setLeaveType("annual");
      setLeaveFilter("all");
      setLeavePage(1);
    } catch (error) {
      setFormError(errorText(error));
    } finally {
      locked.current = false;
      setOperation(null);
    }
  }
  if (user === undefined)
    return (
      <PortalPageShell
        portal="staff"
        title="Human Resources"
        loading
        loadingLabel="Loading HR workspace…"
      >
        {null}
      </PortalPageShell>
    );
  if (!authorized)
    return (
      <PortalPageShell portal="staff" title="Human Resources">
        <EmptyState
          title="Staff sign-in required"
          description="Sign in with your Staff account to access your attendance and leave."
        />
      </PortalPageShell>
    );

  return (
    <PortalPageShell
      portal="staff"
      title="Human Resources"
      description="Your attendance, leave and workday information in one place."
      icon={Users}
      className="staff-hr-workspace"
      heroClassName="staff-hr-hero"
      heroChildren={
        <div
          aria-hidden
          className="staff-hr-hero-art"
          style={
            heroImageUrl
              ? {
                  backgroundImage: `url(${JSON.stringify(heroImageUrl)}), url('/images/staff-home-nepal.jpg')`,
                }
              : undefined
          }
        />
      }
      actions={
        <>
          {a.ready && (state.canClockIn || state.canClockOut) ? (
            <DashboardButton
              size="sm"
              variant="primary"
              disabled={!canAttendance}
              onClick={() => (state.canClockOut ? openClockOut() : void clock("in"))}
            >
              {state.canClockOut ? (
                <LogOut className="size-4" aria-hidden />
              ) : (
                <LogIn className="size-4" aria-hidden />
              )}
              {state.canClockOut ? "Clock Out" : "Clock In"}
            </DashboardButton>
          ) : null}
          <DashboardButton
            size="sm"
            variant="outline"
            onClick={() => go("leave", "staff-hr-request")}
          >
            <CalendarOff className="size-4" aria-hidden />
            Request Leave
          </DashboardButton>
        </>
      }
    >
      <div className="staff-hr-metrics">
        <MetricCard
          label="Hours Today"
          value={a.loading ? "…" : a.ready ? state.hours : "—"}
          helperText={
            !a.ready
              ? a.loading
                ? "Loading attendance"
                : "Attendance unavailable"
              : state.minutes !== null
                ? "Completed recorded duration"
                : state.canClockOut
                  ? "Clocked in · total available after clock out"
                  : "No valid completed duration"
          }
          icon={Clock3}
          tone="information"
          density="compact"
        />
        <MetricCard
          label="Days Recorded"
          value={a.loading ? "…" : a.ready ? daysRecorded(attendance, today) : "—"}
          helperText="Recorded dates this month"
          icon={CalendarDays}
          tone="warning"
          density="compact"
        />
        <MetricCard
          label="Pending Leave"
          value={
            l.loading
              ? "…"
              : l.ready
                ? leaves.filter((row) => row.status === "pending").length
                : "—"
          }
          helperText={
            l.ready
              ? "Requests awaiting review"
              : l.loading
                ? "Loading requests"
                : "Requests unavailable"
          }
          icon={CalendarOff}
          tone="danger"
          density="compact"
        />
        <MetricCard
          label="Annual Leave Remaining"
          value={b.loading ? "…" : b.ready && annual ? `${annual.remainingDays} days` : "—"}
          helperText={
            b.ready
              ? annual
                ? `Of ${annual.entitledDays} entitled days · ${year} AD`
                : "No annual balance on file"
              : b.loading
                ? "Loading balances"
                : "Balances unavailable"
          }
          icon={Leaf}
          tone="success"
          density="compact"
        />
      </div>
      <p role="status" className="staff-hr-feedback">
        {feedback}
      </p>
      {actionError && !confirmOut ? (
        <p role="alert" className="staff-hr-notice staff-hr-error">
          {actionError}
        </p>
      ) : null}
      <div className="staff-hr-layout">
        <Tabs value={tab} onValueChange={setTab} className="staff-hr-tabs">
          <TabsList aria-label="HR sections" className="staff-hr-tabs-list">
            <TabsTrigger value="attendance">
              <Clock3 aria-hidden />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="leave" aria-label="Leave & Requests">
              <CalendarOff aria-hidden />
              <span className="staff-hr-tab-full">Leave &amp; Requests</span>
              <span className="staff-hr-tab-compact" aria-hidden>Leave</span>
            </TabsTrigger>
            <TabsTrigger value="balances" aria-label="Leave Balance">
              <Database aria-hidden />
              <span className="staff-hr-tab-full">Leave Balance</span>
              <span className="staff-hr-tab-compact" aria-hidden>Balances</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="attendance" className="staff-hr-tab-panel">
            <div className="staff-hr-attendance-overview">
              <DashboardSection
                className="staff-hr-panel"
                title="Today's Attendance"
                description={displayDate(today)}
                icon={Clock3}
              >
                <ResourceState
                  loading={a.loading}
                  error={a.error}
                  retry={a.retry}
                  label="attendance"
                />
                {a.ready ? (
                  <div className="staff-hr-today-grid">
                    <div>
                      <StatusBadge tone={getDashboardStatusTone(record?.status)}>
                        {state.label}
                      </StatusBadge>
                      <p className="staff-hr-hours">{state.hours}</p>
                      <p className="staff-hr-caption">
                        {state.minutes !== null
                          ? "Recorded hours today"
                          : state.canClockOut
                            ? "Total available after clock out"
                            : "No completed duration recorded"}
                      </p>
                      {clockButtons}
                    </div>
                    <dl className="staff-hr-clock-times">
                      <div>
                        <dt>Clocked in</dt>
                        <dd>{hrClock(today, record?.clockIn)}</dd>
                      </div>
                      <div>
                        <dt>Clocked out</dt>
                        <dd>{hrClock(today, record?.clockOut)}</dd>
                      </div>
                      <div>
                        <dt>Timezone</dt>
                        <dd>Asia/Kathmandu (NPT)</dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
              </DashboardSection>
              <DashboardSection
                className="staff-hr-panel"
                title="Last seven dates"
                description="Recorded attendance only. Missing dates do not imply a holiday or absence."
                icon={CalendarDays}
              >
                {a.ready ? (
                  <div className="staff-hr-week">
                    {recentHrWeek(today).map((date) => {
                      const row = attendance.find((entry) => entry.date === date);
                      const minutes = recordedDuration(row);
                      return (
                        <div key={date} className={date === today ? "staff-hr-week-today" : ""}>
                          <span>
                            {new Date(`${date}T12:00:00+05:45`).toLocaleDateString("en-GB", {
                              weekday: "short",
                              timeZone: "Asia/Kathmandu",
                            })}
                          </span>
                          <strong>{date.slice(8)}</strong>
                          <small>{row ? HR_ATTENDANCE_STATUSES[row.status] : "No record"}</small>
                          <b>{minutes !== null ? hrDuration(minutes) : "—"}</b>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <ResourceState
                    loading={a.loading}
                    error={a.error}
                    retry={a.retry}
                    label="weekly records"
                  />
                )}
              </DashboardSection>
            </div>
            <DashboardSection
              className="staff-hr-panel"
              title={
                <span id="staff-hr-history" tabIndex={-1}>
                  Attendance History
                </span>
              }
              description="Your returned records, most recent first."
              icon={CalendarDays}
            >
              <ResourceState
                loading={a.loading}
                error={a.error}
                retry={a.retry}
                label="attendance history"
              />
              {a.ready && !history.length ? (
                <EmptyState
                  title="No attendance recorded"
                  description="Your recorded attendance will appear here after clocking in."
                  icon={Clock3}
                />
              ) : null}
              {a.ready && history.length ? (
                <>
                  <div className="staff-hr-table-wrap">
                    <table className="staff-hr-table">
                      <caption className="sr-only">
                        Your attendance records in Asia/Kathmandu
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Date (AD / BS)</th>
                          <th scope="col">Clock In</th>
                          <th scope="col">Clock Out</th>
                          <th scope="col">Hours</th>
                          <th scope="col">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history
                          .slice(
                            (selectedAttendancePage - 1) * PAGE_SIZE,
                            selectedAttendancePage * PAGE_SIZE,
                          )
                          .map((row) => {
                            const minutes = recordedDuration(row);
                            return (
                              <tr key={row.id}>
                                <td data-label="Date">{displayDate(row.date)}</td>
                                <td data-label="Clock In">{hrClock(row.date, row.clockIn)}</td>
                                <td data-label="Clock Out">{hrClock(row.date, row.clockOut)}</td>
                                <td data-label="Hours">
                                  {minutes !== null ? hrDuration(minutes) : "—"}
                                </td>
                                <td data-label="Status">
                                  <StatusBadge tone={getDashboardStatusTone(row.status)}>
                                    {HR_ATTENDANCE_STATUSES[row.status]}
                                  </StatusBadge>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  <HistoryPages
                    page={selectedAttendancePage}
                    total={history.length}
                    onChange={setAttendancePage}
                    label="Attendance history pages"
                  />
                </>
              ) : null}
            </DashboardSection>
          </TabsContent>
          <TabsContent value="leave" className="staff-hr-tab-panel">
            <DashboardSection
              className="staff-hr-panel"
              title={
                <span id="staff-hr-request" tabIndex={-1}>
                  Request Leave
                </span>
              }
              description="Send a request to your reviewer. Dates are AD; your firm's policy determines charged days."
              icon={CalendarOff}
            >
              <ResourceState
                loading={l.loading}
                error={l.error}
                retry={l.retry}
                label="leave requests"
              />
              <form
                onSubmit={submitLeave}
                noValidate
                className="staff-hr-form"
                aria-busy={operation === "leave"}
              >
                <div>
                  <Label htmlFor="staff-hr-type">Type</Label>
                  <Select
                    value={leaveType}
                    onValueChange={(value) => setLeaveType(value as LeaveCreateInput["type"])}
                    disabled={busy}
                  >
                    <SelectTrigger id="staff-hr-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(HR_LEAVE_TYPES).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="staff-hr-form-dates">
                  <div>
                    <Label htmlFor="staff-hr-from">From (AD)</Label>
                    <Input
                      id="staff-hr-from"
                      type="date"
                      required
                      value={fromDate}
                      disabled={busy}
                      onChange={(e) => setFromDate(e.target.value)}
                      aria-invalid={!!formError}
                      aria-describedby={formError ? "staff-hr-form-error" : undefined}
                    />
                  </div>
                  <div>
                    <Label htmlFor="staff-hr-to">To (AD)</Label>
                    <Input
                      id="staff-hr-to"
                      type="date"
                      required
                      value={toDate}
                      disabled={busy}
                      onChange={(e) => setToDate(e.target.value)}
                      aria-invalid={!!formError}
                      aria-describedby={formError ? "staff-hr-form-error" : undefined}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="staff-hr-reason">Reason (optional)</Label>
                  <Textarea
                    id="staff-hr-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={2000}
                    disabled={busy}
                    placeholder="A brief note for your reviewer"
                    aria-describedby="staff-hr-reason-help"
                  />
                  <p id="staff-hr-reason-help" className="staff-hr-caption">
                    Up to 2,000 characters. Only include information needed for this request.
                  </p>
                </div>
                {formError ? (
                  <p
                    id="staff-hr-form-error"
                    role="alert"
                    className="staff-hr-notice staff-hr-error"
                  >
                    {formError}
                  </p>
                ) : null}
                <DashboardButton type="submit" size="sm" disabled={!canRequest}>
                  <Send className="size-4" aria-hidden />
                  {operation === "leave" ? "Submitting…" : "Submit Request"}
                </DashboardButton>
              </form>
            </DashboardSection>
            <DashboardSection
              className="staff-hr-panel"
              title="My Leave Requests"
              description="Pending, approved and rejected requests."
              icon={CalendarDays}
              actions={
                <Select
                  value={leaveFilter}
                  onValueChange={(value) => {
                    setLeaveFilter(value);
                    setLeavePage(1);
                  }}
                >
                  <SelectTrigger aria-label="Filter leave requests">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {Object.entries(HR_LEAVE_STATUSES).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            >
              {!l.ready ? (
                <ResourceState
                  loading={l.loading}
                  error={l.error}
                  retry={l.retry}
                  label="request history"
                />
              ) : !filteredLeaves.length ? (
                <EmptyState
                  title="No leave requests"
                  description="No requests match this view."
                  icon={CalendarOff}
                />
              ) : (
                <>
                  <div className="staff-hr-leaves">
                    {filteredLeaves
                      .slice((selectedLeavePage - 1) * PAGE_SIZE, selectedLeavePage * PAGE_SIZE)
                      .map((row) => (
                        <article key={row.id} data-testid="leave-request-row">
                          <div>
                            <h3>{HR_LEAVE_TYPES[row.type]}</h3>
                            <p>
                              {displayDate(row.fromDate)}
                              {row.toDate !== row.fromDate ? (
                                <> – {displayDate(row.toDate)}</>
                              ) : null}
                            </p>
                            {row.reason ? <p className="staff-hr-reason">{row.reason}</p> : null}
                          </div>
                          <StatusBadge tone={getDashboardStatusTone(row.status)}>
                            {HR_LEAVE_STATUSES[row.status]}
                          </StatusBadge>
                        </article>
                      ))}
                  </div>
                  <HistoryPages
                    page={selectedLeavePage}
                    total={filteredLeaves.length}
                    onChange={setLeavePage}
                    label="Leave request pages"
                  />
                </>
              )}
            </DashboardSection>
          </TabsContent>
          <TabsContent value="balances" className="staff-hr-tab-panel">
            <DashboardSection
              className="staff-hr-panel"
              title={
                <span id="staff-hr-balances" tabIndex={-1}>
                  Leave Balances
                </span>
              }
              description={`${year} AD · days reported by your firm's HR system. Remaining already accounts for used and pending days.`}
              icon={Database}
            >
              <ResourceState
                loading={b.loading}
                error={b.error}
                retry={b.retry}
                label="leave balances"
              />
              {b.ready ? <BalanceRows balances={balances} /> : null}
            </DashboardSection>
          </TabsContent>
        </Tabs>
        <aside className="staff-hr-aside" aria-label="HR shortcuts and summaries">
          <DashboardSection className="staff-hr-panel" title="Quick Actions" icon={Zap}>
            <div className="staff-hr-quick-actions">
              <DashboardButton variant="outline" onClick={() => go("leave", "staff-hr-request")}>
                <CalendarOff aria-hidden />
                Request Leave
              </DashboardButton>
              <DashboardButton
                variant="outline"
                onClick={() => go("balances", "staff-hr-balances")}
              >
                <Database aria-hidden />
                View Leave Balances
              </DashboardButton>
              <DashboardButton
                variant="outline"
                onClick={() => go("attendance", "staff-hr-history")}
              >
                <Clock3 aria-hidden />
                View Attendance History
              </DashboardButton>
            </div>
          </DashboardSection>
          <DashboardSection
            className="staff-hr-panel"
            title="Upcoming Leave"
            description="Approved or pending requests ending today or later."
            icon={CalendarDays}
          >
            {!l.ready ? (
              <ResourceState
                loading={l.loading}
                error={l.error}
                retry={l.retry}
                label="upcoming leave"
              />
            ) : upcoming.length ? (
              <div className="staff-hr-upcoming">
                {upcoming.map((row) => (
                  <article key={row.id}>
                    <h3>{HR_LEAVE_TYPES[row.type]}</h3>
                    <p>
                      {displayDate(row.fromDate)}
                      {row.toDate !== row.fromDate ? <> – {displayDate(row.toDate)}</> : null}
                    </p>
                    <StatusBadge tone={getDashboardStatusTone(row.status)}>
                      {HR_LEAVE_STATUSES[row.status]}
                    </StatusBadge>
                  </article>
                ))}
              </div>
            ) : (
              <p className="staff-hr-caption">No upcoming leave requests.</p>
            )}
          </DashboardSection>
          <DashboardSection
            className="staff-hr-panel"
            title="Leave Snapshot"
            description={`${year} AD · remaining days`}
            icon={Leaf}
          >
            {!b.ready ? (
              <ResourceState loading={b.loading} error={b.error} retry={b.retry} label="balances" />
            ) : balances.length ? (
              <div className="staff-hr-snapshot">
                {balances.slice(0, 3).map((row) => (
                  <div key={row.type}>
                    <span>{HR_LEAVE_TYPES[row.type]}</span>
                    <strong>
                      {row.remainingDays} / {row.entitledDays} days
                    </strong>
                  </div>
                ))}
                <DashboardButton
                  variant="ghost"
                  size="sm"
                  onClick={() => go("balances", "staff-hr-balances")}
                >
                  View all balances
                </DashboardButton>
              </div>
            ) : (
              <p className="staff-hr-caption">No balances on file.</p>
            )}
          </DashboardSection>
          <p className="staff-hr-timezone-note">
            <CheckCircle2 className="size-4" aria-hidden />
            All attendance times use Asia/Kathmandu. Leave approvals and balances follow your
            firm&apos;s configured policy.
          </p>
        </aside>
      </div>
      <Dialog
        open={confirmOut}
        onOpenChange={(open) => {
          if (!busy) setConfirmOut(open);
        }}
      >
        <DialogContent
          className="staff-hr-confirm"
          aria-labelledby="staff-hr-confirm-title"
          aria-describedby="staff-hr-confirm-description"
        >
          <DialogHeader>
            <DialogTitle id="staff-hr-confirm-title">Clock out?</DialogTitle>
            <DialogDescription id="staff-hr-confirm-description">
              End your recorded workday for {today}? Your clock-in is{" "}
              {hrClock(today, record?.clockIn)} (Asia/Kathmandu). The recorded total will be
              available after saving.
            </DialogDescription>
          </DialogHeader>
          {actionError ? (
            <p role="alert" className="staff-hr-notice staff-hr-error">
              {actionError}
            </p>
          ) : null}
          <DialogFooter>
            <DashboardButton variant="outline" disabled={busy} onClick={() => setConfirmOut(false)}>
              Keep working
            </DashboardButton>
            <DashboardButton
              disabled={busy || !canAttendance || !state.canClockOut}
              onClick={() => {
                void clock("out");
              }}
            >
              {operation === "out" ? "Saving…" : "Confirm Clock Out"}
            </DashboardButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
