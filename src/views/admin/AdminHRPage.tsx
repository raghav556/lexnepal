"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog.tsx";
import {
  Clock,
  CalendarOff,
  DollarSign,
  Loader2,
  CheckCircle,
  XCircle,
  Download,
  Search,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { formatNPR } from "@/lib/lex-constants.ts";
import { useUsers } from "@/client/queries/identity";
import {
  useAttendance,
  useHrCommands,
  useLeaveBalances,
  useLeaveRequests,
  usePayroll,
  usePayrollRun,
  usePayrollRuns,
} from "@/client/queries/hr";
import type { AttendanceDto, LeaveRequestDto, LeaveType } from "@/shared/contracts/hr";
import { nowHrClockLabel } from "@/shared/hr/timezone";

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  absent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  leave: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  half_day: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  unset: "bg-muted text-muted-foreground",
};

type AttendanceStatusFilter = "all" | "recorded" | "unrecorded" | AttendanceDto["status"];
type LeaveStatusFilter = "all" | LeaveRequestDto["status"];
type LeaveTypeFilter = "all" | LeaveRequestDto["type"];

function userKey(u: { id?: string; _id?: string }) {
  return u.id ?? u._id ?? "";
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function clockNow() {
  return nowHrClockLabel();
}

export default function AdminHRPage() {
  const today = todayIso();
  const [selectedDate, setSelectedDate] = useState(today);
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatusFilter>("all");
  const [leaveSearch, setLeaveSearch] = useState("");
  const [leaveStatus, setLeaveStatus] = useState<LeaveStatusFilter>("all");
  const [leaveType, setLeaveType] = useState<LeaveTypeFilter>("all");
  const [leaveBalanceYear, setLeaveBalanceYear] = useState(new Date().getUTCFullYear());
  const [payrollMonth, setPayrollMonth] = useState(() => today.slice(0, 7));
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmDialogState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const users = useUsers();
  const attendance = useAttendance({ date: selectedDate }) ?? [];
  const leaveRequests = useLeaveRequests({}) ?? [];
  const leaveBalances = useLeaveBalances({ year: leaveBalanceYear }) ?? [];
  const payroll = usePayroll() ?? [];
  const payrollRuns = usePayrollRuns() ?? [];
  const selectedRun = usePayrollRun(selectedRunId ?? undefined, Boolean(selectedRunId));
  const {
    reviewLeaveRequest,
    upsertAttendance,
    setBaseSalary,
    upsertLeaveBalance,
    createPayrollRun,
    finalizePayrollRun,
  } = useHrCommands();

  const isLoading = users === undefined;
  const staffUsers = useMemo(
    () => (users || []).filter((u) => u.role !== "client"),
    [users],
  );

  const attendanceByUser = useMemo(() => {
    const map = new Map<string, AttendanceDto>();
    for (const row of attendance) map.set(row.userId, row);
    return map;
  }, [attendance]);

  const getUserName = (userId: string) =>
    staffUsers.find((u) => userKey(u) === userId)?.name || userId;

  const attendanceRows = useMemo(() => {
    const q = attendanceSearch.trim().toLowerCase();
    return staffUsers
      .map((u) => {
        const uid = userKey(u);
        return { user: u, uid, record: attendanceByUser.get(uid) };
      })
      .filter(({ user, record }) => {
        if (q) {
          const hay = `${user.name ?? ""} ${user.email ?? ""} ${user.role ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (attendanceStatus === "all") return true;
        if (attendanceStatus === "recorded") return Boolean(record);
        if (attendanceStatus === "unrecorded") return !record;
        return record?.status === attendanceStatus;
      })
      .sort((a, b) => (a.user.name ?? "").localeCompare(b.user.name ?? ""));
  }, [staffUsers, attendanceByUser, attendanceSearch, attendanceStatus]);

  const filteredLeaves = useMemo(() => {
    const q = leaveSearch.trim().toLowerCase();
    return leaveRequests
      .filter((l) => {
        if (leaveStatus !== "all" && l.status !== leaveStatus) return false;
        if (leaveType !== "all" && l.type !== leaveType) return false;
        if (!q) return true;
        const name = getUserName(l.userId).toLowerCase();
        const hay = `${name} ${l.type} ${l.reason ?? ""} ${l.fromDate} ${l.toDate}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (b.status === "pending" && a.status !== "pending") return 1;
        return b.fromDate.localeCompare(a.fromDate);
      });
  }, [leaveRequests, leaveSearch, leaveStatus, leaveType, staffUsers]);

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const absentCount = attendance.filter((a) => a.status === "absent").length;
  const leaveCount = attendance.filter((a) => a.status === "leave" || a.status === "half_day").length;
  const pendingLeaves = leaveRequests.filter((l) => l.status === "pending").length;
  const salarySetCount = staffUsers.filter((u) => Number(u.baseSalary ?? 0) > 0).length;

  const dateLabel = useMemo(() => {
    const d = new Date(`${selectedDate}T12:00:00`);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDate]);

  const isSelectedToday = selectedDate === today;

  const upsertStatus = async (
    userId: string,
    status: AttendanceDto["status"],
    extras?: { clockIn?: string; clockOut?: string },
  ) => {
    setBusyUserId(userId);
    try {
      await upsertAttendance.mutateAsync({
        userId,
        date: selectedDate,
        status,
        ...extras,
      });
      toast.success(`Marked ${formatLabel(status)}.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update attendance.");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleClockOut = async (userId: string, clockIn: string) => {
    setBusyUserId(userId);
    try {
      await upsertAttendance.mutateAsync({
        userId,
        date: selectedDate,
        clockIn,
        clockOut: clockNow(),
        status: "present",
      });
      toast.success("Clocked out.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to clock out.");
    } finally {
      setBusyUserId(null);
    }
  };

  const askLeaveReview = (leave: LeaveRequestDto, status: "approved" | "rejected") => {
    const lid = leave.id ?? leave._id;
    setConfirm({
      title: status === "approved" ? "Approve leave?" : "Reject leave?",
      description: `${getUserName(leave.userId)} — ${formatLabel(leave.type)} (${leave.fromDate} → ${leave.toDate}).`,
      confirmLabel: status === "approved" ? "Approve" : "Reject",
      destructive: status === "rejected",
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await reviewLeaveRequest.mutateAsync({ leaveRequestId: lid, status });
          toast.success(`Leave ${status}.`);
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Failed to update leave.");
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const exportAttendance = () => {
    downloadCsv(
      `hr-attendance-${selectedDate}.csv`,
      ["Date", "Name", "Email", "Role", "Status", "Clock In", "Clock Out"],
      attendanceRows.map(({ user, record }) => [
        selectedDate,
        user.name ?? "",
        user.email ?? "",
        user.role ?? "",
        record?.status ?? "unrecorded",
        record?.clockIn ?? "",
        record?.clockOut ?? "",
      ]),
    );
  };

  const exportLeaves = () => {
    downloadCsv(
      `hr-leave-${today}.csv`,
      ["Name", "Type", "From", "To", "Status", "Reason"],
      filteredLeaves.map((l) => [
        getUserName(l.userId),
        l.type,
        l.fromDate,
        l.toDate,
        l.status,
        l.reason ?? "",
      ]),
    );
  };

  const exportPayroll = () => {
    downloadCsv(
      `hr-payroll-${today}.csv`,
      ["Name", "Role", "Gross", "PF Employee", "SSF Employer", "Tax", "Net"],
      payroll.map((p) => [p.name, p.role, p.gross, p.pf, p.ssf, p.tax, p.net]),
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpiCards = [
    {
      label: isSelectedToday ? "Present Today" : "Present (date)",
      value: presentCount,
      icon: CheckCircle,
      tone: "bg-green-500/10 text-green-500",
    },
    {
      label: isSelectedToday ? "Absent Today" : "Absent (date)",
      value: absentCount,
      icon: UserX,
      tone: "bg-red-500/10 text-red-500",
    },
    {
      label: "On Leave / Half",
      value: leaveCount,
      icon: CalendarOff,
      tone: "bg-blue-500/10 text-blue-500",
    },
    {
      label: "Pending Leaves",
      value: pendingLeaves,
      icon: Clock,
      tone: "bg-amber-500/10 text-amber-500",
    },
  ];

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm min-w-0";

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 font-sans w-full min-w-0 max-w-none">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-foreground">HR Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Attendance, leave, and payroll for firm staff.
          </p>
        </div>
        <p className="text-xs text-muted-foreground shrink-0">
          Staff: {staffUsers.length} · Salaries set: {salarySetCount}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="min-w-0 overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-medium leading-snug">
                    {label}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold mt-1 tabular-nums leading-none">
                    {value}
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${tone}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="attendance" className="w-full min-w-0">
        <TabsList className="mb-4 h-auto w-full grid grid-cols-3 gap-1">
          <TabsTrigger value="attendance" className="text-xs sm:text-sm px-1 sm:px-3 gap-1">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Attendance</span>
          </TabsTrigger>
          <TabsTrigger value="leave" className="text-xs sm:text-sm px-1 sm:px-3 gap-1">
            <CalendarOff className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Leave</span>
          </TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs sm:text-sm px-1 sm:px-3 gap-1">
            <DollarSign className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Payroll</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-0 space-y-3 min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="space-y-1.5 w-full sm:w-auto">
              <Label htmlFor="hr-date">Date</Label>
              <Input
                id="hr-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || today)}
                className="h-9 w-full sm:w-44"
              />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <Label htmlFor="hr-att-search">Search</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="hr-att-search"
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  placeholder="Name, email, role"
                  className="h-9 pl-8"
                />
              </div>
            </div>
            <div className="space-y-1.5 w-full sm:w-44">
              <Label htmlFor="hr-att-status">Status</Label>
              <select
                id="hr-att-status"
                className={selectClass}
                value={attendanceStatus}
                onChange={(e) => setAttendanceStatus(e.target.value as AttendanceStatusFilter)}
              >
                <option value="all">All staff</option>
                <option value="recorded">Recorded</option>
                <option value="unrecorded">Unrecorded</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="half_day">Half day</option>
                <option value="leave">Leave</option>
              </select>
            </div>
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={exportAttendance}>
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Showing <span className="text-foreground font-medium">{dateLabel}</span>
            {isSelectedToday ? " (today)" : null} · {attendanceRows.length} row(s)
          </p>

          {attendanceRows.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No staff match the current filters.
              </CardContent>
            </Card>
          ) : (
            <Card className="min-w-0 overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left py-2.5 px-3">Staff</th>
                        <th className="text-left py-2.5 px-3">Status</th>
                        <th className="text-left py-2.5 px-3">Clock</th>
                        <th className="text-right py-2.5 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {attendanceRows.map(({ user, uid, record }) => {
                        const busy = busyUserId === uid;
                        return (
                          <tr key={uid} className="align-top">
                            <td className="py-3 px-3 min-w-0">
                              <Link
                                href="/admin/users"
                                className="text-sm font-medium text-foreground hover:underline"
                              >
                                {user.name}
                              </Link>
                              <p className="text-xs text-muted-foreground capitalize">
                                {formatLabel(String(user.role))}
                              </p>
                            </td>
                            <td className="py-3 px-3">
                              {record ? (
                                <Badge className={`text-xs capitalize ${STATUS_COLORS[record.status]}`}>
                                  {formatLabel(record.status)}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Unrecorded
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-3 text-xs text-muted-foreground tabular-nums">
                              {record?.clockIn
                                ? `In ${record.clockIn}${record.clockOut ? ` · Out ${record.clockOut}` : ""}`
                                : "—"}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs text-green-700 dark:text-green-400"
                                  disabled={busy}
                                  onClick={() =>
                                    upsertStatus(uid, "present", { clockIn: clockNow() })
                                  }
                                >
                                  Present
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs"
                                  disabled={busy}
                                  onClick={() => upsertStatus(uid, "half_day", { clockIn: clockNow() })}
                                >
                                  Half day
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs text-red-700 dark:text-red-400"
                                  disabled={busy}
                                  onClick={() => upsertStatus(uid, "absent")}
                                >
                                  Absent
                                </Button>
                                {record?.status === "present" &&
                                  record.clockIn &&
                                  !record.clockOut && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-8 text-xs"
                                      disabled={busy}
                                      onClick={() => handleClockOut(uid, record.clockIn!)}
                                    >
                                      Clock out
                                    </Button>
                                  )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="leave" className="mt-0 space-y-3 min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              <Label htmlFor="hr-leave-search">Search</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="hr-leave-search"
                  value={leaveSearch}
                  onChange={(e) => setLeaveSearch(e.target.value)}
                  placeholder="Name, type, reason"
                  className="h-9 pl-8"
                />
              </div>
            </div>
            <div className="space-y-1.5 w-full sm:w-40">
              <Label htmlFor="hr-leave-status">Status</Label>
              <select
                id="hr-leave-status"
                className={selectClass}
                value={leaveStatus}
                onChange={(e) => setLeaveStatus(e.target.value as LeaveStatusFilter)}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="space-y-1.5 w-full sm:w-40">
              <Label htmlFor="hr-leave-type">Type</Label>
              <select
                id="hr-leave-type"
                className={selectClass}
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveTypeFilter)}
              >
                <option value="all">All types</option>
                <option value="annual">Annual</option>
                <option value="sick">Sick</option>
                <option value="maternity">Maternity</option>
                <option value="paternity">Paternity</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={exportLeaves}>
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">{filteredLeaves.length} request(s)</p>

          {filteredLeaves.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No leave requests match the current filters.
              </CardContent>
            </Card>
          ) : (
            <Card className="min-w-0 overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left py-2.5 px-3">Staff</th>
                        <th className="text-left py-2.5 px-3">Type</th>
                        <th className="text-left py-2.5 px-3">Dates</th>
                        <th className="text-left py-2.5 px-3">Status</th>
                        <th className="text-right py-2.5 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredLeaves.map((l) => {
                        const lid = l.id ?? l._id;
                        return (
                          <tr key={lid} className="align-top" data-testid="admin-leave-row">
                            <td className="py-3 px-3">
                              <Link
                                href="/admin/users"
                                className="text-sm font-medium hover:underline"
                              >
                                {getUserName(l.userId)}
                              </Link>
                              {l.reason ? (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {l.reason}
                                </p>
                              ) : null}
                            </td>
                            <td className="py-3 px-3 capitalize text-xs">{formatLabel(l.type)}</td>
                            <td className="py-3 px-3 text-xs tabular-nums text-muted-foreground">
                              {l.fromDate}
                              {l.toDate !== l.fromDate ? ` → ${l.toDate}` : ""}
                            </td>
                            <td className="py-3 px-3">
                              <Badge className={`text-xs ${STATUS_COLORS[l.status]}`}>{l.status}</Badge>
                            </td>
                            <td className="py-3 px-3">
                              {l.status === "pending" ? (
                                <div className="flex flex-wrap justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs gap-1"
                                    onClick={() => askLeaveReview(l, "approved")}
                                  >
                                    <CheckCircle className="w-3 h-3" /> Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 text-xs gap-1"
                                    onClick={() => askLeaveReview(l, "rejected")}
                                  >
                                    <XCircle className="w-3 h-3" /> Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="pb-3 px-3 sm:px-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold font-serif">Leave balances</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Firm defaults: annual 18 · sick 12 (override per person). Weekends skipped on
                  approve sync.
                </p>
              </div>
              <div className="space-y-1.5 w-full sm:w-32">
                <Label htmlFor="hr-balance-year">Year</Label>
                <Input
                  id="hr-balance-year"
                  type="number"
                  className="h-9"
                  value={leaveBalanceYear}
                  onChange={(e) => setLeaveBalanceYear(Number(e.target.value) || leaveBalanceYear)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {leaveBalances.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 px-3">
                  No configured balances for this year.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left py-2.5 px-3">Staff</th>
                        <th className="text-left py-2.5 px-3">Type</th>
                        <th className="text-right py-2.5 px-3">Entitled</th>
                        <th className="text-right py-2.5 px-3">Used</th>
                        <th className="text-right py-2.5 px-3">Pending</th>
                        <th className="text-right py-2.5 px-3">Remaining</th>
                        <th className="text-right py-2.5 px-3">Adjust</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {leaveBalances.map((b) => (
                        <tr key={`${b.userId}-${b.type}-${b.year}`}>
                          <td className="py-3 px-3 text-sm font-medium">{getUserName(b.userId)}</td>
                          <td className="py-3 px-3 text-xs capitalize">
                            {formatLabel(b.type)}
                            <span className="text-muted-foreground ml-1">({b.source})</span>
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums">{b.entitledDays}</td>
                          <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">
                            {b.usedDays}
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">
                            {b.pendingDays}
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums font-medium">
                            {b.remainingDays}
                          </td>
                          <td className="py-3 px-3">
                            <form
                              className="flex items-center justify-end gap-2"
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const fd = new FormData(e.currentTarget);
                                const entitledDays = Number(fd.get("entitled"));
                                try {
                                  await upsertLeaveBalance.mutateAsync({
                                    userId: b.userId,
                                    type: b.type as LeaveType,
                                    year: b.year,
                                    entitledDays,
                                  });
                                  toast.success("Leave balance updated.");
                                } catch (err: unknown) {
                                  toast.error(
                                    err instanceof Error ? err.message : "Failed to update balance",
                                  );
                                }
                              }}
                            >
                              <input
                                name="entitled"
                                type="number"
                                min={0}
                                max={366}
                                defaultValue={b.entitledDays}
                                className="w-20 h-8 rounded-md border border-input bg-background px-2 text-sm"
                              />
                              <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">
                                Save
                              </Button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-0 space-y-4 min-w-0">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="pb-3 px-3 sm:px-6">
              <CardTitle className="text-sm font-semibold font-serif">Payroll runs</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Snapshot base salaries into a draft run, review, then finalize (immutable). Staff
                see finalized payslips only.
              </p>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-4 space-y-4">
              <form
                className="flex flex-col sm:flex-row sm:items-end gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const [y, m] = payrollMonth.split("-").map(Number);
                  if (!y || !m) {
                    toast.error("Pick a valid month.");
                    return;
                  }
                  const periodStart = `${payrollMonth}-01`;
                  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
                  const periodEnd = `${payrollMonth}-${String(lastDay).padStart(2, "0")}`;
                  try {
                    const run = await createPayrollRun.mutateAsync({
                      periodStart,
                      periodEnd,
                      label: new Date(`${periodStart}T12:00:00`).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      }),
                    });
                    setSelectedRunId(run.id);
                    toast.success("Draft payroll run created.");
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : "Failed to create run");
                  }
                }}
              >
                <div className="space-y-1.5 w-full sm:w-44">
                  <Label htmlFor="hr-payroll-month">Pay period (month)</Label>
                  <Input
                    id="hr-payroll-month"
                    type="month"
                    className="h-9"
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(e.target.value)}
                  />
                </div>
                <Button type="submit" size="sm" className="h-9" disabled={createPayrollRun.isPending}>
                  {createPayrollRun.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : null}
                  Generate draft run
                </Button>
              </form>

              {payrollRuns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No payroll runs yet. Generate a draft from the month above.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left py-2.5 px-3">Period</th>
                        <th className="text-left py-2.5 px-3">Status</th>
                        <th className="text-right py-2.5 px-3">Lines</th>
                        <th className="text-right py-2.5 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {payrollRuns.map((run) => (
                        <tr key={run.id}>
                          <td className="py-3 px-3">
                            <p className="text-sm font-medium">{run.label ?? run.periodStart}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {run.periodStart} → {run.periodEnd}
                            </p>
                          </td>
                          <td className="py-3 px-3">
                            <Badge
                              className={`text-xs ${
                                run.status === "finalized"
                                  ? STATUS_COLORS.approved
                                  : STATUS_COLORS.pending
                              }`}
                            >
                              {run.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums">{run.lineCount}</td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap justify-end gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => setSelectedRunId(run.id)}
                              >
                                View
                              </Button>
                              {run.status === "draft" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() =>
                                    setConfirm({
                                      title: "Finalize payroll run?",
                                      description: `${run.label ?? run.periodStart} will become immutable. Staff can then view their payslips.`,
                                      confirmLabel: "Finalize",
                                      onConfirm: async () => {
                                        setConfirmBusy(true);
                                        try {
                                          await finalizePayrollRun.mutateAsync(run.id);
                                          setSelectedRunId(run.id);
                                          toast.success("Payroll run finalized.");
                                        } catch (err: unknown) {
                                          toast.error(
                                            err instanceof Error
                                              ? err.message
                                              : "Failed to finalize",
                                          );
                                        } finally {
                                          setConfirmBusy(false);
                                        }
                                      },
                                    })
                                  }
                                >
                                  Finalize
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedRunId && selectedRun?.lines ? (
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      Run detail — {selectedRun.label ?? selectedRun.periodStart}{" "}
                      <Badge
                        className={`text-xs ml-1 ${
                          selectedRun.status === "finalized"
                            ? STATUS_COLORS.approved
                            : STATUS_COLORS.pending
                        }`}
                      >
                        {selectedRun.status}
                      </Badge>
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => setSelectedRunId(null)}
                    >
                      Close
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[560px]">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground">
                          <th className="text-left py-2 pr-4">Employee</th>
                          <th className="text-right py-2 pr-4">Gross</th>
                          <th className="text-right py-2 pr-4">PF</th>
                          <th className="text-right py-2 pr-4">SSF</th>
                          <th className="text-right py-2 pr-4">Tax</th>
                          <th className="text-right py-2">Net</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedRun.lines.map((line) => (
                          <tr key={line.id}>
                            <td className="py-2 pr-4">
                              <p className="font-medium">{line.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {formatLabel(line.role)}
                              </p>
                            </td>
                            <td className="text-right py-2 pr-4 text-muted-foreground">
                              {formatNPR(line.gross)}
                            </td>
                            <td className="text-right py-2 pr-4 text-muted-foreground">
                              {formatNPR(line.pf)}
                            </td>
                            <td className="text-right py-2 pr-4 text-muted-foreground">
                              {formatNPR(line.ssf)}
                            </td>
                            <td className="text-right py-2 pr-4 text-muted-foreground">
                              {formatNPR(line.tax)}
                            </td>
                            <td className="text-right py-2 font-semibold">{formatNPR(line.net)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="pb-3 px-3 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold font-serif">
                  Live preview —{" "}
                  {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Calculator only — use Generate draft run to persist a snapshot
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0"
                disabled={payroll.length === 0}
                onClick={exportPayroll}
              >
                <Download className="w-4 h-4 mr-1.5" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-4">
              {payroll.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No staff with base salary set. Set salaries below to generate payroll.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left py-2 pr-4">Employee</th>
                        <th className="text-right py-2 pr-4">Gross</th>
                        <th className="text-right py-2 pr-4">PF (emp.)</th>
                        <th className="text-right py-2 pr-4">SSF (er.)</th>
                        <th className="text-right py-2 pr-4">Tax</th>
                        <th className="text-right py-2">Net Pay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {payroll.map((p) => (
                        <tr key={p.userId}>
                          <td className="py-3 pr-4">
                            <p className="font-medium text-foreground">{p.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {formatLabel(String(p.role))}
                            </p>
                          </td>
                          <td className="text-right py-3 pr-4 text-muted-foreground">
                            {formatNPR(p.gross)}
                          </td>
                          <td className="text-right py-3 pr-4 text-muted-foreground">
                            {formatNPR(p.pf)}
                          </td>
                          <td className="text-right py-3 pr-4 text-muted-foreground">
                            {formatNPR(p.ssf)}
                          </td>
                          <td className="text-right py-3 pr-4 text-muted-foreground">
                            {formatNPR(p.tax)}
                          </td>
                          <td className="text-right py-3 font-semibold text-foreground">
                            {formatNPR(p.net)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="pb-3 px-3 sm:px-6">
              <CardTitle className="text-sm font-semibold font-serif">
                Base salary (NPR / month)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {salarySetCount} of {staffUsers.length} staff have a salary on file.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left py-2.5 px-3">Staff</th>
                      <th className="text-left py-2.5 px-3">Salary state</th>
                      <th className="text-right py-2.5 px-3">Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {staffUsers.map((u) => {
                      const uid = userKey(u);
                      const amount = Number(u.baseSalary ?? 0);
                      const hasSalary = amount > 0;
                      return (
                        <tr key={uid}>
                          <td className="py-3 px-3">
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {formatLabel(String(u.role))}
                            </p>
                          </td>
                          <td className="py-3 px-3">
                            {hasSalary ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={`text-xs ${STATUS_COLORS.approved}`}>Set</Badge>
                                <span className="text-xs tabular-nums text-muted-foreground">
                                  {formatNPR(amount)}
                                </span>
                              </div>
                            ) : (
                              <Badge className={`text-xs ${STATUS_COLORS.unset}`}>Not set</Badge>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <form
                              className="flex items-center justify-end gap-2"
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const fd = new FormData(e.currentTarget);
                                const baseSalary = Number(fd.get("salary"));
                                try {
                                  await setBaseSalary.mutateAsync({ userId: uid, baseSalary });
                                  toast.success(`Salary updated for ${u.name}`);
                                } catch (err: unknown) {
                                  toast.error(
                                    err instanceof Error ? err.message : "Failed to set salary",
                                  );
                                }
                              }}
                            >
                              <input
                                name="salary"
                                type="number"
                                min={0}
                                step={1}
                                defaultValue={hasSalary ? amount : ""}
                                placeholder="0"
                                className="w-28 h-9 rounded-md border border-input bg-background px-2 text-sm"
                              />
                              <Button type="submit" size="sm" variant="outline" className="h-9 text-xs">
                                Save
                              </Button>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        state={confirm}
        busy={confirmBusy}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      />
    </div>
  );
}
