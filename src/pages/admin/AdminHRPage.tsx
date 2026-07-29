import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Clock, CalendarOff, DollarSign, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatNPR } from "@/lib/lex-constants.ts";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

const STATUS_COLORS: Record<string, string> = {
  present:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  absent:   "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  leave:    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  half_day: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending:  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

// Static payroll (HR payroll requires a payroll module — kept as structured display)
const PAYROLL = [
  { name: "Ram Chandra",   role: "Partner",          gross: 180000, pf: 10800, ssf: 9000, tax: 25000, net: 135200 },
  { name: "Sita Thapa",    role: "Associate",         gross: 90000,  pf: 5400,  ssf: 4500, tax: 8000,  net: 72100  },
  { name: "Gita Nepal",    role: "Admin",             gross: 70000,  pf: 4200,  ssf: 3500, tax: 5500,  net: 56800  },
  { name: "Krishna Aryal", role: "Intern",            gross: 25000,  pf: 1500,  ssf: 1250, tax: 0,     net: 22250  },
];

export default function AdminHRPage() {
  const today = new Date().toISOString().slice(0, 10);
  const users = useQuery(api.users.listUsers, {}) || [];
  const attendance = useQuery(api.hr.listAttendance, { date: today }) || [];
  const leaveRequests = useQuery(api.hr.listLeaveRequests, {}) || [];

  const reviewLeave = useMutation(api.hr.reviewLeaveRequest);
  const upsertAttendance = useMutation(api.hr.upsertAttendance);

  const [processingId, setProcessingId] = useState<string | null>(null);

  const isLoading = users === undefined;

  // Staff users only (non-client, non-admin)
  const staffUsers = users.filter((u: any) => u.role !== "client");

  const getUserName = (userId: string) => {
    return users.find((u: any) => u._id === userId)?.name || userId;
  };

  const handleLeaveReview = async (leaveRequestId: string, status: "approved" | "rejected") => {
    setProcessingId(leaveRequestId);
    try {
      await reviewLeave({ leaveRequestId: leaveRequestId as any, status });
      toast.success(`Leave ${status} successfully.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update leave.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkPresent = async (userId: string) => {
    try {
      await upsertAttendance({
        userId: userId as any,
        date: today,
        clockIn: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        status: "present",
      });
      toast.success("Attendance recorded.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to record attendance.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 font-sans">
      <h1 className="font-serif text-2xl font-bold text-foreground">HR Management</h1>

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance"><Clock className="w-3.5 h-3.5 mr-1" />Attendance</TabsTrigger>
          <TabsTrigger value="leave"><CalendarOff className="w-3.5 h-3.5 mr-1" />Leave Requests</TabsTrigger>
          <TabsTrigger value="payroll"><DollarSign className="w-3.5 h-3.5 mr-1" />Payroll</TabsTrigger>
        </TabsList>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="mt-4 space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold font-serif">
                Today — {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {staffUsers.map((u: any) => {
                const record = attendance.find((a: any) => a.userId === u._id);
                return (
                  <div key={u._id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{u.role.replace("_", " ")}</p>
                      {record?.clockIn && (
                        <p className="text-xs text-muted-foreground">
                          In: {record.clockIn} — Out: {record.clockOut ?? "Still in office"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {record ? (
                        <Badge className={`text-xs capitalize ${STATUS_COLORS[record.status]}`}>{record.status}</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => handleMarkPresent(u._id)}
                        >
                          Mark Present
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Requests Tab */}
        <TabsContent value="leave" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold font-serif">Leave Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {leaveRequests.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No leave requests found.</p>
              ) : (
                <div className="divide-y divide-border">
                  {leaveRequests.map((l: any) => (
                    <div key={l._id} className="flex items-center justify-between p-4 gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{getUserName(l.userId)}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {l.type} leave — {l.fromDate} to {l.toDate}
                        </p>
                        {l.reason && <p className="text-xs text-muted-foreground">{l.reason}</p>}
                        {l.reviewedBy && (
                          <p className="text-xs text-muted-foreground">
                            Reviewed by: {getUserName(l.reviewedBy)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={`text-xs ${STATUS_COLORS[l.status]}`}>{l.status}</Badge>
                        {l.status === "pending" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="text-xs h-7 px-2 gap-1"
                              disabled={processingId === l._id}
                              onClick={() => handleLeaveReview(l._id, "approved")}
                            >
                              <CheckCircle className="w-3 h-3" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs h-7 px-2 gap-1"
                              disabled={processingId === l._id}
                              onClick={() => handleLeaveReview(l._id, "rejected")}
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold font-serif">
                Payroll — {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left py-2 pr-4">Employee</th>
                      <th className="text-right py-2 pr-4">Gross</th>
                      <th className="text-right py-2 pr-4">PF (12%)</th>
                      <th className="text-right py-2 pr-4">SSF (5%)</th>
                      <th className="text-right py-2 pr-4">Tax</th>
                      <th className="text-right py-2">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {PAYROLL.map((p) => (
                      <tr key={p.name}>
                        <td className="py-3 pr-4">
                          <p className="font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.role}</p>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
