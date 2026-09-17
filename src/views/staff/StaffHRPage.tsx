"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog.tsx";
import { CalendarDays, CalendarOff, Clock, Hourglass, Loader2, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import {
  useAttendance,
  useHrCommands,
  useLeaveBalances,
  useLeaveRequests,
} from "@/client/queries/hr";
import type { LeaveCreateInput } from "@/shared/contracts/hr";
import { nowHrClockLabel, parseHrClock } from "@/shared/hr/timezone";
import {
  DashboardButton,
  DashboardSection,
  DualDateDisplay,
  EmptyState,
  HeroHealthChip,
  HeroStatChip,
  MetricCard,
  PortalPageShell,
  STAFF_HERO_OUTLINE_BUTTON_CLASS,
  StaffHeroChipRow,
  StatusBadge,
} from "@/components/dashboard";
import { getDashboardStatusTone } from "@/lib/dashboard-semantics";

const LEAVE_TYPES: LeaveCreateInput["type"][] = [
  "annual",
  "sick",
  "maternity",
  "paternity",
  "unpaid",
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function formatType(value: string) {
  return value.replace(/_/g, " ");
}

function formatDuration(date: string, clockIn?: string | null, clockOut?: string | null) {
  const start = parseHrClock(date, clockIn);
  const end = parseHrClock(date, clockOut);
  if (!start || !end || end <= start) return null;
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

function sessionStatusLabel(opts: {
  hasRecord: boolean;
  clockedIn: boolean;
  clockedOut: boolean;
  status?: string;
}) {
  if (opts.clockedOut) return "Day closed";
  if (opts.clockedIn) return "Present";
  if (opts.hasRecord) return formatType(opts.status ?? "recorded");
  return "Not recorded";
}

export default function StaffHRPage() {
  const currentUser = useCurrentUser();
  const userId = currentUser?.id ?? currentUser?._id;
  const today = todayIso();
  const historyFrom = daysAgoIso(30);
  const balanceYear = new Date().getUTCFullYear();

  const attendanceData = useAttendance(userId ? { userId } : undefined, Boolean(userId));
  const leaveRequestsData = useLeaveRequests(userId ? { userId } : undefined, Boolean(userId));
  const leaveBalancesData = useLeaveBalances(
    userId ? { userId, year: balanceYear } : undefined,
    Boolean(userId),
  );
  const attendance = attendanceData ?? [];
  const leaveRequests = leaveRequestsData ?? [];
  const leaveBalances = leaveBalancesData ?? [];
  const { upsertAttendance, createLeaveRequest } = useHrCommands();
  const isHrLoading =
    Boolean(userId) &&
    (attendanceData === undefined ||
      leaveRequestsData === undefined ||
      leaveBalancesData === undefined);

  const [busy, setBusy] = useState(false);
  const [hrTab, setHrTab] = useState("attendance");
  const [scrollToRequestForm, setScrollToRequestForm] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmDialogState>(null);
  const [leaveType, setLeaveType] = useState<LeaveCreateInput["type"]>("annual");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [reason, setReason] = useState("");

  const openLeavePanel = (scrollToForm = false) => {
    setHrTab("leave");
    setScrollToRequestForm(scrollToForm);
  };

  useEffect(() => {
    if (hrTab !== "leave" || !scrollToRequestForm) return;
    const node = document.getElementById("staff-request-leave");
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
    setScrollToRequestForm(false);
  }, [hrTab, scrollToRequestForm]);

  const todayRecord = useMemo(
    () => attendance.find((row) => row.date === today),
    [attendance, today],
  );

  const history = useMemo(
    () =>
      [...attendance]
        .filter((row) => row.date >= historyFrom && row.date <= today)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [attendance, historyFrom, today],
  );

  const ownLeaves = useMemo(
    () => [...leaveRequests].sort((a, b) => b.fromDate.localeCompare(a.fromDate)),
    [leaveRequests],
  );

  const pendingLeaveCount = ownLeaves.filter((row) => row.status === "pending").length;
  const annualBalance = leaveBalances.find((row) => row.type === "annual");
  const clockedIn = Boolean(todayRecord?.clockIn);
  const clockedOut = Boolean(todayRecord?.clockOut);
  const hoursToday = formatDuration(today, todayRecord?.clockIn, todayRecord?.clockOut);
  const clockLabel = nowHrClockLabel();

  const handleClockIn = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      await upsertAttendance.mutateAsync({
        userId,
        date: today,
        clockIn: clockLabel,
        status: "present",
      });
      toast.success("Clocked in.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to clock in.");
    } finally {
      setBusy(false);
    }
  };

  const handleClockOut = () => {
    if (!userId || !todayRecord?.clockIn) return;
    setConfirm({
      title: "Clock out?",
      description: `End your day for ${today}? Clock-in was ${todayRecord.clockIn}.`,
      confirmLabel: "Clock out",
      onConfirm: async () => {
        setBusy(true);
        try {
          await upsertAttendance.mutateAsync({
            userId,
            date: today,
            clockIn: todayRecord.clockIn,
            clockOut: nowHrClockLabel(),
            status: "present",
          });
          toast.success("Clocked out.");
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Failed to clock out.");
        } finally {
          setBusy(false);
          setConfirm(null);
        }
      },
    });
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (toDate < fromDate) {
      toast.error("End date must be on or after start date.");
      return;
    }
    setBusy(true);
    try {
      await createLeaveRequest.mutateAsync({
        type: leaveType,
        fromDate,
        toDate,
        reason: reason.trim() || undefined,
      });
      toast.success("Leave request submitted.");
      setReason("");
      setFromDate(today);
      setToDate(today);
      setLeaveType("annual");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit leave.");
    } finally {
      setBusy(false);
    }
  };

  if (currentUser === undefined) {
    return (
      <PortalPageShell portal="staff" loading loadingLabel="Loading HR workspace…" title="HR">
        {null}
      </PortalPageShell>
    );
  }

  if (!userId) {
    return (
      <PortalPageShell
        portal="staff"
        title="HR"
        description="Sign in is required to use HR self-service."
      >
        <EmptyState title="Sign in required" description="Sign in to access HR self-service." />
      </PortalPageShell>
    );
  }

  const canClockIn = !todayRecord || todayRecord.status === "absent";
  const canClockOut =
    todayRecord?.status === "present" && Boolean(todayRecord.clockIn) && !todayRecord.clockOut;
  const todayStatus = sessionStatusLabel({
    hasRecord: Boolean(todayRecord),
    clockedIn,
    clockedOut,
    status: todayRecord?.status,
  });
  const todayTone = clockedOut
    ? "success"
    : clockedIn
      ? "information"
      : getDashboardStatusTone(todayRecord?.status);

  return (
    <PortalPageShell
      portal="staff"
      title="HR"
      description="Your workday and leave, in one place."
      icon={Clock}
      actions={
        <>
          {canClockIn ? (
            <DashboardButton size="sm" variant="primary" onClick={handleClockIn} disabled={busy}>
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <LogIn className="size-3.5" aria-hidden />
              )}
              Clock in
            </DashboardButton>
          ) : canClockOut ? (
            <DashboardButton size="sm" variant="primary" onClick={handleClockOut} disabled={busy}>
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <LogOut className="size-3.5" aria-hidden />
              )}
              Clock out
            </DashboardButton>
          ) : null}
          <DashboardButton
            size="sm"
            variant="outline"
            className={STAFF_HERO_OUTLINE_BUTTON_CLASS}
            onClick={() => openLeavePanel(true)}
          >
            <CalendarOff className="size-3.5" aria-hidden /> Request leave
          </DashboardButton>
        </>
      }
      heroChildren={
        <StaffHeroChipRow>
          <HeroHealthChip
            healthy={clockedIn}
            overdueCount={0}
            healthyLabel={clockedOut ? "Day closed" : "Clocked in"}
            unhealthyLabel="Not recorded"
          />
          <HeroStatChip icon={Clock} value={history.length} label="days recorded" />
          <HeroStatChip icon={CalendarOff} value={pendingLeaveCount} label="pending leave" />
          <HeroStatChip
            icon={CalendarOff}
            value={annualBalance?.remainingDays ?? "—"}
            label="annual remaining"
          />
        </StaffHeroChipRow>
      }
    >
      {isHrLoading ? (
        <div className="space-y-5" aria-busy="true" aria-label="Loading HR workspace">
          <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl border border-dashboard-border bg-dashboard-panel"
              />
            ))}
          </div>
          <div className="h-16 animate-pulse rounded-2xl border border-dashboard-border bg-dashboard-panel" />
          <div className="h-56 animate-pulse rounded-2xl border border-dashboard-border bg-dashboard-panel" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
            <MetricCard
              label="Hours today"
              value={hoursToday ?? "—"}
              helperText={
                clockedOut ? "Day closed" : clockedIn ? "Still in office" : "Clock in to start"
              }
              icon={Hourglass}
              tone={hoursToday ? "success" : "neutral"}
              density="compact"
            />
            <MetricCard
              label="Days recorded"
              value={history.length}
              helperText="Last 30 days"
              icon={CalendarDays}
              tone="information"
              density="compact"
            />
            <MetricCard
              label="Pending leave"
              value={pendingLeaveCount}
              helperText="Waiting for review"
              icon={CalendarOff}
              tone={pendingLeaveCount > 0 ? "warning" : "neutral"}
              density="compact"
              chevron
              role="button"
              tabIndex={0}
              className="cursor-pointer"
              onClick={() => openLeavePanel()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openLeavePanel();
                }
              }}
            />
            <MetricCard
              label="Annual remaining"
              value={annualBalance?.remainingDays ?? "—"}
              helperText={
                annualBalance
                  ? `${annualBalance.remainingDays} of ${annualBalance.entitledDays}`
                  : "No balance on file"
              }
              icon={CalendarOff}
              tone="information"
              density="compact"
              chevron
              role="button"
              tabIndex={0}
              className="cursor-pointer"
              onClick={() => openLeavePanel()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openLeavePanel();
                }
              }}
            />
          </div>

          <div
            className="inline-flex w-fit max-w-full items-center rounded-lg border border-dashboard-border bg-dashboard-neutral-soft/60 p-1"
            role="tablist"
            aria-label="HR section"
          >
            {(
              [
                { value: "attendance", label: "Attendance", icon: Clock },
                { value: "leave", label: "Leave", icon: CalendarOff },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={hrTab === value}
                onClick={() => setHrTab(value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus",
                  hrTab === value
                    ? "bg-dashboard-panel text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          {hrTab === "attendance" ? (
            <div className="space-y-4 min-w-0">
              <DashboardSection
                title="Today"
                description={<DualDateDisplay isoDate={today} alwaysDual />}
                icon={Clock}
                actions={
                  canClockIn || canClockOut ? (
                    <div className="flex flex-wrap gap-2">
                      {canClockIn ? (
                        <DashboardButton
                          type="button"
                          size="sm"
                          disabled={busy}
                          onClick={handleClockIn}
                        >
                          {busy ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          ) : (
                            <LogIn className="size-3.5" aria-hidden />
                          )}
                          Clock in
                        </DashboardButton>
                      ) : null}
                      {canClockOut ? (
                        <DashboardButton
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={handleClockOut}
                        >
                          <LogOut className="size-3.5" aria-hidden />
                          Clock out
                        </DashboardButton>
                      ) : null}
                    </div>
                  ) : undefined
                }
              >
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={todayTone} className="capitalize">
                      {todayStatus}
                    </StatusBadge>
                    {hoursToday ? (
                      <p className="text-xs font-medium text-muted-foreground">
                        Worked {hoursToday}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                    <div className="rounded-xl border border-dashboard-border bg-dashboard-neutral-soft/50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        In
                      </p>
                      <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                        {todayRecord?.clockIn ?? "—"}
                      </p>
                    </div>
                    <div className="hidden h-px w-12 bg-dashboard-border sm:block" aria-hidden />
                    <div className="rounded-xl border border-dashboard-border bg-dashboard-neutral-soft/50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Out
                      </p>
                      <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                        {todayRecord?.clockOut ?? (clockedIn ? "Still in office" : "—")}
                      </p>
                    </div>
                  </div>
                </div>
              </DashboardSection>

              <DashboardSection title="Last 30 days">
                {history.length === 0 ? (
                  <EmptyState
                    title="No attendance history"
                    description="Clock in to start your record."
                    icon={Clock}
                  />
                ) : (
                  <div className="space-y-2">
                    {history.map((row) => {
                      const duration = formatDuration(row.date, row.clockIn, row.clockOut);
                      return (
                        <div
                          key={row.id}
                          className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashboard-border bg-dashboard-panel p-3.5 sm:p-4"
                        >
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-semibold">
                              <DualDateDisplay isoDate={row.date} alwaysDual />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {row.clockIn
                                ? `In ${row.clockIn}${row.clockOut ? ` · Out ${row.clockOut}` : " · Still in office"}`
                                : "No clock times"}
                              {duration ? ` · ${duration}` : ""}
                            </p>
                          </div>
                          <StatusBadge
                            tone={getDashboardStatusTone(row.status)}
                            className="capitalize"
                          >
                            {formatType(row.status)}
                          </StatusBadge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </DashboardSection>
            </div>
          ) : (
            <div className="space-y-4 min-w-0">
              {leaveBalances.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="font-serif text-base font-bold text-foreground">
                    Balances — {balanceYear}
                  </h2>
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    {leaveBalances.map((balance) => (
                      <MetricCard
                        key={`${balance.type}-${balance.year}`}
                        label={formatType(balance.type)}
                        value={balance.remainingDays}
                        density="compact"
                        tone="information"
                        icon={CalendarOff}
                        helperText={[
                          `Remaining ${balance.remainingDays} of ${balance.entitledDays}`,
                          balance.pendingDays > 0 ? `${balance.pendingDays} pending` : null,
                          balance.usedDays > 0 ? `${balance.usedDays} used` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              <DashboardSection id="staff-request-leave" title="Request leave">
                <form className="space-y-3" onSubmit={handleLeaveSubmit}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="leave-type">Type</Label>
                      <Select
                        value={leaveType}
                        onValueChange={(value) => setLeaveType(value as LeaveCreateInput["type"])}
                      >
                        <SelectTrigger id="leave-type" aria-label="Type" className="capitalize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAVE_TYPES.map((type) => (
                            <SelectItem key={type} value={type} className="capitalize">
                              {formatType(type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="leave-from">From</Label>
                        <Input
                          id="leave-from"
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="leave-to">To</Label>
                        <Input
                          id="leave-to"
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="leave-reason">Reason (optional)</Label>
                      <Input
                        id="leave-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        maxLength={2000}
                        placeholder="Brief note for your reviewer"
                      />
                    </div>
                  </div>
                  <DashboardButton type="submit" size="sm" disabled={busy}>
                    {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                    Submit request
                  </DashboardButton>
                </form>
              </DashboardSection>

              <DashboardSection title="My requests">
                {ownLeaves.length === 0 ? (
                  <EmptyState
                    title="No leave requests"
                    description="You have not submitted any leave requests yet."
                    icon={CalendarOff}
                  />
                ) : (
                  <div className="space-y-2">
                    {ownLeaves.map((row) => (
                      <div
                        key={row.id}
                        className="flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-2xl border border-dashboard-border bg-dashboard-panel p-3.5 sm:p-4"
                        data-testid="leave-request-row"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-semibold capitalize">{formatType(row.type)}</p>
                          <p className="text-xs text-muted-foreground">
                            <DualDateDisplay isoDate={row.fromDate} alwaysDual />
                            {row.toDate !== row.fromDate ? (
                              <>
                                {" → "}
                                <DualDateDisplay isoDate={row.toDate} alwaysDual />
                              </>
                            ) : null}
                          </p>
                          {row.reason ? (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {row.reason}
                            </p>
                          ) : null}
                        </div>
                        <StatusBadge
                          tone={getDashboardStatusTone(row.status)}
                          className="capitalize"
                        >
                          {row.status}
                        </StatusBadge>
                      </div>
                    ))}
                  </div>
                )}
              </DashboardSection>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        state={confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        busy={busy}
      />
    </PortalPageShell>
  );
}
