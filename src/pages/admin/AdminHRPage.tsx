import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Clock, CalendarOff, DollarSign, Loader2, CheckCircle, XCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { formatNPR } from "@/lib/lex-constants.ts";
import { useUsers } from "@/client/queries/identity";
import {
  useAttendance,
  useHrCommands,
  useLeaveRequests,
  usePayroll,
} from "@/client/queries/hr";

const STATUS_COLORS: Record<string, string> = {
  present:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  absent:   "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  leave:    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  half_day: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending:  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function userKey(u: { id?: string; _id?: string }) {
  return u.id ?? u._id ?? "";
}

export default function AdminHRPage() {
  const today = new Date().toISOString().slice(0, 10);
  const users = useUsers();
  const attendance = useAttendance({ date: today }) ?? [];
  const leaveRequests = useLeaveRequests({}) ?? [];
  const payroll = usePayroll() ?? [];
  const { reviewLeaveRequest, upsertAttendance, setBaseSalary } = useHrCommands();

  const [processingId, setProcessingId] = useState<string | null>(null);

  const isLoading = users === undefined;
  const staffUsers = (users || []).filter((u) => u.role !== "client");

  const getUserName = (userId: string) => {
    return (users || []).find((u) => userKey(u) === userId)?.name || userId;
  };

  const handleLeaveReview = async (leaveRequestId: string, status: "approved" | "rejected") => {
    setProcessingId(leaveRequestId);
    try {
      await reviewLeaveRequest.mutateAsync({ leaveRequestId, status });
      toast.success(`Leave ${status} successfully.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update leave.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkPresent = async (userId: string) => {
    try {
      await upsertAttendance.mutateAsync({
        userId,
        date: today,
        clockIn: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        status: "present",
      });
      toast.success("Attendance recorded.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record attendance.");
    }
  };

  const handleMarkAbsent = async (userId: string) => {
    try {
      await upsertAttendance.mutateAsync({
        userId,
        date: today,
        status: "absent",
      });
      toast.success("Marked as absent.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to mark absent.");
    }
  };

  const handleClockOut = async (userId: string, clockIn: string) => {
    try {
      await upsertAttendance.mutateAsync({
        userId,
        date: today,
        clockIn,
        clockOut: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        status: "present",
      });
      toast.success("Clocked out successfully.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to clock out.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const leaveCount = attendance.filter((a) => a.status === "leave").length;
  const pendingLeaves = leaveRequests.filter((l) => l.status === "pending").length;

  const kpiCards = [
    { label: "Total Staff", value: staffUsers.length, icon: Users, tone: "bg-primary/10 text-primary" },
    { label: "Present Today", value: presentCount, icon: CheckCircle, tone: "bg-green-500/10 text-green-500" },
    { label: "On Leave", value: leaveCount, icon: CalendarOff, tone: "bg-blue-500/10 text-blue-500" },
    { label: "Pending Leaves", value: pendingLeaves, icon: Clock, tone: "bg-amber-500/10 text-amber-500" },
  ];

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 font-sans w-full min-w-0 max-w-none">
      <div className="min-w-0">
        <h1 className="font-serif text-xl sm:text-2xl font-bold text-foreground">HR Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Attendance, leave, and payroll for firm staff.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="min-w-0 overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-medium leading-snug">{label}</p>
                  <p className="text-xl sm:text-2xl font-bold mt-1 tabular-nums leading-none">{value}</p>
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
          <p className="text-sm font-medium text-foreground">
            Today — <span className="text-muted-foreground font-normal">{todayLabel}</span>
          </p>

          {staffUsers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No staff members found.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 w-full min-w-0">
              {staffUsers.map((u) => {
                const uid = userKey(u);
                const record = attendance.find((a) => a.userId === uid);
                return (
                  <Card key={uid} className="w-full min-w-0 overflow-hidden">
                    <CardContent className="p-3 sm:p-4 space-y-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {String(u.role).replace(/_/g, " ")}
                        </p>
                        {record?.clockIn && (
                          <p className="text-xs text-muted-foreground mt-1">
                            In: {record.clockIn}
                            {record.clockOut ? ` — Out: ${record.clockOut}` : " — Still in office"}
                          </p>
                        )}
                      </div>

                      <div className="w-full">
                        {record ? (
                          <div className="flex flex-wrap items-center gap-2 w-full">
                            <Badge className={`text-xs capitalize ${STATUS_COLORS[record.status]}`}>
                              {record.status.replace(/_/g, " ")}
                            </Badge>
                            {record.status === "present" && !record.clockOut && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 flex-1 sm:flex-none"
                                onClick={() => handleClockOut(uid, record.clockIn!)}
                              >
                                Clock Out
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-9 w-full sm:w-auto text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
                              onClick={() => handleMarkPresent(uid)}
                            >
                              Mark Present
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-9 w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                              onClick={() => handleMarkAbsent(uid)}
                            >
                              Absent
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leave" className="mt-0 min-w-0">
          {leaveRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No leave requests found.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {leaveRequests.map((l) => {
                const lid = l.id ?? l._id;
                return (
                  <Card key={lid} className="min-w-0 overflow-hidden">
                    <CardContent className="p-3 sm:p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{getUserName(l.userId)}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {l.type} leave — {l.fromDate} to {l.toDate}
                          </p>
                          {l.reason && <p className="text-xs text-muted-foreground mt-1 break-words">{l.reason}</p>}
                        </div>
                        <Badge className={`text-xs shrink-0 ${STATUS_COLORS[l.status]}`}>{l.status}</Badge>
                      </div>
                      {l.status === "pending" && (
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
                          <Button
                            size="sm"
                            className="text-xs h-9 gap-1 w-full sm:w-auto"
                            disabled={processingId === lid}
                            onClick={() => handleLeaveReview(lid, "approved")}
                          >
                            <CheckCircle className="w-3 h-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs h-9 gap-1 w-full sm:w-auto"
                            disabled={processingId === lid}
                            onClick={() => handleLeaveReview(lid, "rejected")}
                          >
                            <XCircle className="w-3 h-3" /> Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payroll" className="mt-0 space-y-4 min-w-0">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="pb-3 px-3 sm:px-6">
              <CardTitle className="text-sm font-semibold font-serif">
                Payroll — {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </CardTitle>
              <p className="text-xs text-muted-foreground">PF 10% · SSF 3.33% · tax bands applied server-side</p>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-4">
              {payroll.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No staff with base salary set. Set salaries below to generate payroll.
                </p>
              ) : (
                <>
                  <div className="md:hidden space-y-3">
                    {payroll.map((p) => (
                      <div key={p.userId} className="rounded-lg border border-border p-3 space-y-2 min-w-0">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{String(p.role).replace(/_/g, " ")}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <span className="text-muted-foreground">Gross</span>
                          <span className="text-right text-foreground">{formatNPR(p.gross)}</span>
                          <span className="text-muted-foreground">PF</span>
                          <span className="text-right text-muted-foreground">{formatNPR(p.pf)}</span>
                          <span className="text-muted-foreground">SSF</span>
                          <span className="text-right text-muted-foreground">{formatNPR(p.ssf)}</span>
                          <span className="text-muted-foreground">Tax</span>
                          <span className="text-right text-muted-foreground">{formatNPR(p.tax)}</span>
                          <span className="text-muted-foreground font-medium">Net Pay</span>
                          <span className="text-right font-semibold text-foreground">{formatNPR(p.net)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm min-w-[560px]">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground">
                          <th className="text-left py-2 pr-4">Employee</th>
                          <th className="text-right py-2 pr-4">Gross</th>
                          <th className="text-right py-2 pr-4">PF (10%)</th>
                          <th className="text-right py-2 pr-4">SSF (3.33%)</th>
                          <th className="text-right py-2 pr-4">Tax</th>
                          <th className="text-right py-2">Net Pay</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {payroll.map((p) => (
                          <tr key={p.userId}>
                            <td className="py-3 pr-4">
                              <p className="font-medium text-foreground">{p.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{String(p.role).replace(/_/g, " ")}</p>
                            </td>
                            <td className="text-right py-3 pr-4 text-muted-foreground">{formatNPR(p.gross)}</td>
                            <td className="text-right py-3 pr-4 text-muted-foreground">{formatNPR(p.pf)}</td>
                            <td className="text-right py-3 pr-4 text-muted-foreground">{formatNPR(p.ssf)}</td>
                            <td className="text-right py-3 pr-4 text-muted-foreground">{formatNPR(p.tax)}</td>
                            <td className="text-right py-3 font-semibold text-foreground">{formatNPR(p.net)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="pb-3 px-3 sm:px-6">
              <CardTitle className="text-sm font-semibold font-serif">Set Base Salary (NPR / month)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 sm:px-6 pb-4">
              {staffUsers.map((u) => {
                const uid = userKey(u);
                return (
                  <div key={uid} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-border rounded-lg min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{u.role?.replace(/_/g, " ")}</p>
                    </div>
                    <form
                      className="flex items-center gap-2 w-full sm:w-auto"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        const baseSalary = Number(fd.get("salary"));
                        try {
                          await setBaseSalary.mutateAsync({ userId: uid, baseSalary });
                          toast.success(`Salary updated for ${u.name}`);
                        } catch (err: unknown) {
                          toast.error(err instanceof Error ? err.message : "Failed to set salary");
                        }
                      }}
                    >
                      <input
                        name="salary"
                        type="number"
                        defaultValue={u.baseSalary ?? ""}
                        placeholder="0"
                        className="flex-1 sm:flex-none sm:w-28 h-9 rounded-md border border-input bg-background px-2 text-sm min-w-0"
                      />
                      <Button type="submit" size="sm" variant="outline" className="h-9 text-xs shrink-0">Save</Button>
                    </form>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
