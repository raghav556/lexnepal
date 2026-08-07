"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog.tsx";
import { CalendarOff, Clock, DollarSign, Loader2, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { formatNPR } from "@/lib/lex-constants.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import {
  useAttendance,
  useHrCommands,
  useLeaveBalances,
  useLeaveRequests,
  usePayslips,
} from "@/client/queries/hr";
import type { LeaveCreateInput, PayslipDto } from "@/shared/contracts/hr";
import { nowHrClockLabel } from "@/shared/hr/timezone";

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  absent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  leave: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  half_day: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

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

export default function StaffHRPage() {
  const currentUser = useCurrentUser();
  const userId = currentUser?.id ?? currentUser?._id;
  const today = todayIso();
  const historyFrom = daysAgoIso(30);

  const attendance = useAttendance(userId ? { userId } : undefined, Boolean(userId)) ?? [];
  const leaveRequests = useLeaveRequests(userId ? { userId } : undefined, Boolean(userId)) ?? [];
  const balanceYear = new Date().getUTCFullYear();
  const leaveBalances =
    useLeaveBalances(userId ? { userId, year: balanceYear } : undefined, Boolean(userId)) ?? [];
  const payslips = usePayslips(Boolean(userId)) ?? [];
  const { upsertAttendance, createLeaveRequest } = useHrCommands();
  const [printSlip, setPrintSlip] = useState<PayslipDto | null>(null);

  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmDialogState>(null);
  const [leaveType, setLeaveType] = useState<LeaveCreateInput["type"]>("annual");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [reason, setReason] = useState("");

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
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Sign in is required to use HR self-service.
      </div>
    );
  }

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const canClockIn = !todayRecord || todayRecord.status === "absent";
  const canClockOut =
    todayRecord?.status === "present" && Boolean(todayRecord.clockIn) && !todayRecord.clockOut;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 font-sans w-full min-w-0 max-w-none">
      <div className="min-w-0">
        <h1 className="font-serif text-xl sm:text-2xl font-bold text-foreground">HR</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Clock attendance, request leave, and view finalized payslips.
        </p>
      </div>

      <Tabs defaultValue="attendance" className="w-full min-w-0">
        <TabsList className="mb-4 h-auto w-full grid grid-cols-3 gap-1">
          <TabsTrigger value="attendance" className="text-xs sm:text-sm gap-1">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="leave" className="text-xs sm:text-sm gap-1">
            <CalendarOff className="w-3.5 h-3.5 shrink-0" />
            Leave
          </TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs sm:text-sm gap-1">
            <DollarSign className="w-3.5 h-3.5 shrink-0" />
            Payslips
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-0 space-y-4 min-w-0">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Today — <span className="text-muted-foreground font-normal">{todayLabel}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {todayRecord ? (
                  <Badge className={STATUS_COLORS[todayRecord.status] ?? ""}>
                    {formatType(todayRecord.status)}
                  </Badge>
                ) : (
                  <Badge variant="outline">Not recorded</Badge>
                )}
                {todayRecord?.clockIn && (
                  <p className="text-xs text-muted-foreground">
                    In: {todayRecord.clockIn}
                    {todayRecord.clockOut
                      ? ` — Out: ${todayRecord.clockOut}`
                      : " — Still in office"}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || !canClockIn}
                  onClick={handleClockIn}
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4 mr-1" />
                  )}
                  Clock in
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy || !canClockOut}
                  onClick={handleClockOut}
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Clock out
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Last 30 days</p>
            {history.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No attendance history yet. Clock in to start your record.
                </CardContent>
              </Card>
            ) : (
              history.map((row) => (
                <Card key={row.id} className="min-w-0 overflow-hidden">
                  <CardContent className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium tabular-nums">{row.date}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.clockIn
                          ? `In ${row.clockIn}${row.clockOut ? ` · Out ${row.clockOut}` : ""}`
                          : "No clock times"}
                      </p>
                    </div>
                    <Badge className={STATUS_COLORS[row.status] ?? ""}>
                      {formatType(row.status)}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="leave" className="mt-0 space-y-4 min-w-0">
          {leaveBalances.length > 0 ? (
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  Balances — {balanceYear}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {leaveBalances.map((b) => (
                  <div
                    key={`${b.type}-${b.year}`}
                    className="rounded-lg border border-border p-3 text-sm"
                  >
                    <p className="font-medium capitalize">{formatType(b.type)}</p>
                    <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                      Remaining {b.remainingDays} of {b.entitledDays}
                      {b.pendingDays > 0 ? ` · ${b.pendingDays} pending` : ""}
                      {b.usedDays > 0 ? ` · ${b.usedDays} used` : ""}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Request leave</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleLeaveSubmit}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="leave-type">Type</Label>
                    <select
                      id="leave-type"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={leaveType}
                      onChange={(e) =>
                        setLeaveType(e.target.value as LeaveCreateInput["type"])
                      }
                    >
                      {LEAVE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {formatType(type)}
                        </option>
                      ))}
                    </select>
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
                <Button type="submit" size="sm" disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                  Submit request
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">My requests</p>
            {ownLeaves.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No leave requests yet.
                </CardContent>
              </Card>
            ) : (
              ownLeaves.map((row) => (
                <Card key={row.id} className="min-w-0 overflow-hidden" data-testid="leave-request-row">
                  <CardContent className="p-3 sm:p-4 flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold capitalize">{formatType(row.type)}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {row.fromDate}
                        {row.toDate !== row.fromDate ? ` → ${row.toDate}` : ""}
                      </p>
                      {row.reason ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">{row.reason}</p>
                      ) : null}
                    </div>
                    <Badge className={STATUS_COLORS[row.status] ?? ""}>{row.status}</Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="payroll" className="mt-0 space-y-4 min-w-0">
          {payslips.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No finalized payslips yet. Your firm HR will publish them after payroll finalize.
              </CardContent>
            </Card>
          ) : (
            payslips.map((slip) => (
              <Card
                key={`${slip.runId}-${slip.line.id}`}
                className="min-w-0 overflow-hidden"
                data-testid="payslip-card"
              >
                <CardContent className="p-3 sm:p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {slip.label ?? `${slip.periodStart} → ${slip.periodEnd}`}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {slip.periodStart} → {slip.periodEnd}
                        {slip.finalizedAt
                          ? ` · Finalized ${new Date(slip.finalizedAt).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs print:hidden"
                      onClick={() => {
                        setPrintSlip(slip);
                        setTimeout(() => window.print(), 50);
                      }}
                    >
                      Print
                    </Button>
                  </div>
                  <div
                    className={`grid grid-cols-2 gap-x-3 gap-y-1 text-xs ${
                      printSlip?.runId === slip.runId ? "print:block" : ""
                    }`}
                  >
                    <span className="text-muted-foreground">Gross</span>
                    <span className="text-right tabular-nums">{formatNPR(slip.line.gross)}</span>
                    <span className="text-muted-foreground">PF (employee)</span>
                    <span className="text-right tabular-nums">{formatNPR(slip.line.pf)}</span>
                    <span className="text-muted-foreground">SSF (employer)</span>
                    <span className="text-right tabular-nums">{formatNPR(slip.line.ssf)}</span>
                    <span className="text-muted-foreground">Tax</span>
                    <span className="text-right tabular-nums">{formatNPR(slip.line.tax)}</span>
                    <span className="font-medium">Net pay</span>
                    <span className="text-right font-semibold tabular-nums">
                      {formatNPR(slip.line.net)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        state={confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        busy={busy}
      />
    </div>
  );
}
