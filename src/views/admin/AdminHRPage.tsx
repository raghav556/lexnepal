"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import { downloadCsv } from "@/lib/csv-download.ts";
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
import {
  DashboardFilterBar,
  DashboardSection,
  DashboardStatusLabel,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  DualDateDisplay,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";

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
  const staffUsers = useMemo(() => (users || []).filter((u) => u.role !== "client"), [users]);

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
  const leaveCount = attendance.filter(
    (a) => a.status === "leave" || a.status === "half_day",
  ).length;
  const pendingLeaves = leaveRequests.filter((l) => l.status === "pending").length;
  const salarySetCount = staffUsers.filter((u) => Number(u.baseSalary ?? 0) > 0).length;

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
      <PortalPageShell
        portal="admin"
        loading
        loadingLabel="Loading HR workspace…"
        title="HR management"
        icon={Clock}
      >
        {null}
      </PortalPageShell>
    );
  }

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm min-w-0";

  return (
    <PortalPageShell
      portal="admin"
      decorated
      showTodayDate
      eyebrow="People operations"
      titleKey="portal.hr.title"
      descriptionKey="portal.hr.description"
      icon={Clock}
      heroChildren={
        <p className="text-xs text-muted-foreground">
          Staff: {staffUsers.length} · Salaries set: {salarySetCount}
        </p>
      }
      metrics={[
        {
          label: isSelectedToday ? "Present today" : "Present (date)",
          value: presentCount,
          icon: CheckCircle,
          tone: "success",
        },
        {
          label: isSelectedToday ? "Absent today" : "Absent (date)",
          value: absentCount,
          icon: UserX,
          tone: "danger",
        },
        {
          label: "On leave / half",
          value: leaveCount,
          icon: CalendarOff,
          tone: "information",
        },
        {
          label: "Pending leaves",
          value: pendingLeaves,
          icon: Clock,
          tone: "warning",
        },
      ]}
    >
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
          <DashboardSection title="Daily attendance" icon={Clock}>
            <DashboardFilterBar className="mb-4">
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 self-end"
                onClick={exportAttendance}
              >
                <Download className="w-4 h-4 mr-1.5" />
                Export CSV
              </Button>
            </DashboardFilterBar>

            <p className="text-sm text-muted-foreground mb-4">
              Showing{" "}
              <span className="text-foreground font-medium">
                <DualDateDisplay isoDate={selectedDate} />
              </span>
              {isSelectedToday ? " (today)" : null} · {attendanceRows.length} row(s)
            </p>

            {attendanceRows.length === 0 ? (
              <EmptyState
                title="No staff match"
                description="No staff match the current filters."
                icon={UserX}
              />
            ) : (
              <DashboardTable>
                <DashboardTableHead>
                  <tr>
                    <DashboardTableHeaderCell>Staff</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Status</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Clock</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className="text-right">
                      Actions
                    </DashboardTableHeaderCell>
                  </tr>
                </DashboardTableHead>
                <DashboardTableBody>
                  {attendanceRows.map(({ user, uid, record }) => {
                    const busy = busyUserId === uid;
                    return (
                      <DashboardTableRow key={uid} striped>
                        <DashboardTableCell className="min-w-0">
                          <Link
                            href="/admin/users"
                            className="text-sm font-medium text-foreground hover:underline"
                          >
                            {user.name}
                          </Link>
                          <p className="text-xs text-muted-foreground capitalize">
                            {formatLabel(String(user.role))}
                          </p>
                        </DashboardTableCell>
                        <DashboardTableCell>
                          {record ? (
                            <DashboardStatusLabel
                              status={record.status}
                              className="text-xs capitalize"
                            />
                          ) : (
                            <DashboardStatusLabel
                              tone="neutral"
                              label="Unrecorded"
                              className="text-xs"
                            />
                          )}
                        </DashboardTableCell>
                        <DashboardTableCell className="text-xs text-muted-foreground tabular-nums">
                          {record?.clockIn
                            ? `In ${record.clockIn}${record.clockOut ? ` · Out ${record.clockOut}` : ""}`
                            : "—"}
                        </DashboardTableCell>
                        <DashboardTableCell>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              disabled={busy}
                              onClick={() => upsertStatus(uid, "present", { clockIn: clockNow() })}
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
                              className="h-8 text-xs"
                              disabled={busy}
                              onClick={() => upsertStatus(uid, "absent")}
                            >
                              Absent
                            </Button>
                            {record?.status === "present" && record.clockIn && !record.clockOut && (
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
                        </DashboardTableCell>
                      </DashboardTableRow>
                    );
                  })}
                </DashboardTableBody>
              </DashboardTable>
            )}
          </DashboardSection>
        </TabsContent>

        <TabsContent value="leave" className="mt-0 space-y-3 min-w-0">
          <DashboardSection title="Leave requests" icon={CalendarOff}>
            <DashboardFilterBar className="mb-4">
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 self-end"
                onClick={exportLeaves}
              >
                <Download className="w-4 h-4 mr-1.5" />
                Export CSV
              </Button>
            </DashboardFilterBar>

            <p className="text-sm text-muted-foreground mb-4">{filteredLeaves.length} request(s)</p>

            {filteredLeaves.length === 0 ? (
              <EmptyState
                title="No leave requests"
                description="No leave requests match the current filters."
                icon={CalendarOff}
              />
            ) : (
              <DashboardTable>
                <DashboardTableHead>
                  <tr>
                    <DashboardTableHeaderCell>Staff</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Type</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Dates</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Status</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className="text-right">
                      Actions
                    </DashboardTableHeaderCell>
                  </tr>
                </DashboardTableHead>
                <DashboardTableBody>
                  {filteredLeaves.map((l) => {
                    const lid = l.id ?? l._id;
                    return (
                      <DashboardTableRow key={lid} striped data-testid="admin-leave-row">
                        <DashboardTableCell>
                          <Link href="/admin/users" className="text-sm font-medium hover:underline">
                            {getUserName(l.userId)}
                          </Link>
                          {l.reason ? (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {l.reason}
                            </p>
                          ) : null}
                        </DashboardTableCell>
                        <DashboardTableCell className="capitalize text-xs">
                          {formatLabel(l.type)}
                        </DashboardTableCell>
                        <DashboardTableCell className="text-xs tabular-nums text-muted-foreground">
                          <DualDateDisplay isoDate={l.fromDate} />
                          {l.toDate !== l.fromDate ? (
                            <>
                              {" → "}
                              <DualDateDisplay isoDate={l.toDate} />
                            </>
                          ) : null}
                        </DashboardTableCell>
                        <DashboardTableCell>
                          <DashboardStatusLabel status={l.status} className="text-xs" />
                        </DashboardTableCell>
                        <DashboardTableCell>
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
                        </DashboardTableCell>
                      </DashboardTableRow>
                    );
                  })}
                </DashboardTableBody>
              </DashboardTable>
            )}
          </DashboardSection>

          <DashboardSection
            title="Leave balances"
            description="Firm defaults: annual 18 · sick 12 (override per person). Weekends skipped on approve sync."
            icon={CalendarOff}
            actions={
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
            }
          >
            {leaveBalances.length === 0 ? (
              <EmptyState
                title="No balances"
                description="No configured balances for this year."
                icon={CalendarOff}
              />
            ) : (
              <DashboardTable>
                <DashboardTableHead>
                  <tr>
                    <DashboardTableHeaderCell>Staff</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Type</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className="text-right">
                      Entitled
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className="text-right">Used</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className="text-right">
                      Pending
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className="text-right">
                      Remaining
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className="text-right">
                      Adjust
                    </DashboardTableHeaderCell>
                  </tr>
                </DashboardTableHead>
                <DashboardTableBody>
                  {leaveBalances.map((b) => (
                    <DashboardTableRow key={`${b.userId}-${b.type}-${b.year}`} striped>
                      <DashboardTableCell className="font-medium">
                        {getUserName(b.userId)}
                      </DashboardTableCell>
                      <DashboardTableCell className="text-xs capitalize">
                        {formatLabel(b.type)}
                        <span className="text-muted-foreground ml-1">({b.source})</span>
                      </DashboardTableCell>
                      <DashboardTableCell className="text-right tabular-nums">
                        {b.entitledDays}
                      </DashboardTableCell>
                      <DashboardTableCell className="text-right tabular-nums text-muted-foreground">
                        {b.usedDays}
                      </DashboardTableCell>
                      <DashboardTableCell className="text-right tabular-nums text-muted-foreground">
                        {b.pendingDays}
                      </DashboardTableCell>
                      <DashboardTableCell className="text-right tabular-nums font-medium">
                        {b.remainingDays}
                      </DashboardTableCell>
                      <DashboardTableCell>
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
                      </DashboardTableCell>
                    </DashboardTableRow>
                  ))}
                </DashboardTableBody>
              </DashboardTable>
            )}
          </DashboardSection>
        </TabsContent>

        <TabsContent value="payroll" className="mt-0 space-y-4 min-w-0">
          <DashboardSection
            title="Payroll runs"
            description="Snapshot base salaries into a draft run, review, then finalize (immutable). Staff see finalized payslips only."
            icon={DollarSign}
          >
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
              <EmptyState
                title="No payroll runs"
                description="Generate a draft from the month above."
                icon={DollarSign}
              />
            ) : (
              <DashboardTable>
                <DashboardTableHead>
                  <tr>
                    <DashboardTableHeaderCell>Period</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Status</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className="text-right">
                      Lines
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className="text-right">
                      Actions
                    </DashboardTableHeaderCell>
                  </tr>
                </DashboardTableHead>
                <DashboardTableBody>
                  {payrollRuns.map((run) => (
                    <DashboardTableRow key={run.id} striped>
                      <DashboardTableCell>
                        <p className="text-sm font-medium">{run.label ?? run.periodStart}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          <DualDateDisplay isoDate={run.periodStart} />
                          {" → "}
                          <DualDateDisplay isoDate={run.periodEnd} />
                        </p>
                      </DashboardTableCell>
                      <DashboardTableCell>
                        <DashboardStatusLabel
                          status={run.status === "finalized" ? "approved" : "pending"}
                          label={run.status}
                          className="text-xs"
                        />
                      </DashboardTableCell>
                      <DashboardTableCell className="text-right tabular-nums">
                        {run.lineCount}
                      </DashboardTableCell>
                      <DashboardTableCell>
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
                                        err instanceof Error ? err.message : "Failed to finalize",
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
                      </DashboardTableCell>
                    </DashboardTableRow>
                  ))}
                </DashboardTableBody>
              </DashboardTable>
            )}

            {selectedRunId && selectedRun?.lines ? (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    Run detail — {selectedRun.label ?? selectedRun.periodStart}{" "}
                    <DashboardStatusLabel
                      status={selectedRun.status === "finalized" ? "approved" : "pending"}
                      label={selectedRun.status}
                      className="text-xs ml-1"
                    />
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
          </DashboardSection>

          <DashboardSection
            title={`Live preview — ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}
            description="Calculator only — use Generate draft run to persist a snapshot"
            icon={DollarSign}
            actions={
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
            }
          >
            {payroll.length === 0 ? (
              <EmptyState
                title="No payroll data"
                description="Set base salaries below to generate payroll."
                icon={DollarSign}
              />
            ) : (
              <DashboardTable>
                <DashboardTableHead>
                  <tr>
                    <DashboardTableHeaderCell>Employee</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className="text-right">
                      Gross
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className="text-right">
                      PF (emp.)
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className="text-right">
                      SSF (er.)
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className="text-right">Tax</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className="text-right">
                      Net Pay
                    </DashboardTableHeaderCell>
                  </tr>
                </DashboardTableHead>
                <DashboardTableBody>
                  {payroll.map((p) => (
                    <DashboardTableRow key={p.userId} striped>
                      <DashboardTableCell>
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {formatLabel(String(p.role))}
                        </p>
                      </DashboardTableCell>
                      <DashboardTableCell className="text-right text-muted-foreground">
                        {formatNPR(p.gross)}
                      </DashboardTableCell>
                      <DashboardTableCell className="text-right text-muted-foreground">
                        {formatNPR(p.pf)}
                      </DashboardTableCell>
                      <DashboardTableCell className="text-right text-muted-foreground">
                        {formatNPR(p.ssf)}
                      </DashboardTableCell>
                      <DashboardTableCell className="text-right text-muted-foreground">
                        {formatNPR(p.tax)}
                      </DashboardTableCell>
                      <DashboardTableCell className="text-right font-semibold text-foreground">
                        {formatNPR(p.net)}
                      </DashboardTableCell>
                    </DashboardTableRow>
                  ))}
                </DashboardTableBody>
              </DashboardTable>
            )}
          </DashboardSection>

          <DashboardSection
            title="Base salary (NPR / month)"
            description={`${salarySetCount} of ${staffUsers.length} staff have a salary on file.`}
            icon={DollarSign}
          >
            <DashboardTable>
              <DashboardTableHead>
                <tr>
                  <DashboardTableHeaderCell>Staff</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Salary state</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell className="text-right">Update</DashboardTableHeaderCell>
                </tr>
              </DashboardTableHead>
              <DashboardTableBody>
                {staffUsers.map((u) => {
                  const uid = userKey(u);
                  const amount = Number(u.baseSalary ?? 0);
                  const hasSalary = amount > 0;
                  return (
                    <DashboardTableRow key={uid} striped>
                      <DashboardTableCell>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {formatLabel(String(u.role))}
                        </p>
                      </DashboardTableCell>
                      <DashboardTableCell>
                        {hasSalary ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <DashboardStatusLabel tone="success" label="Set" className="text-xs" />
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {formatNPR(amount)}
                            </span>
                          </div>
                        ) : (
                          <DashboardStatusLabel
                            tone="neutral"
                            label="Not set"
                            className="text-xs"
                          />
                        )}
                      </DashboardTableCell>
                      <DashboardTableCell>
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
                      </DashboardTableCell>
                    </DashboardTableRow>
                  );
                })}
              </DashboardTableBody>
            </DashboardTable>
          </DashboardSection>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        state={confirm}
        busy={confirmBusy}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      />
    </PortalPageShell>
  );
}
