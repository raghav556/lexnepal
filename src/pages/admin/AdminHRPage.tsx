import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Clock, CalendarOff, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { formatNPR } from "@/lib/lex-constants.ts";

const ATTENDANCE = [
  { name: "Adv. Sita Rana", date: "15 Mangsir 2081", clockIn: "9:02 AM", clockOut: "6:15 PM", status: "present" },
  { name: "Adv. Binod Thapa", date: "15 Mangsir 2081", clockIn: "9:30 AM", clockOut: "6:00 PM", status: "present" },
  { name: "Adv. Anjali Shrestha", date: "15 Mangsir 2081", clockIn: null, clockOut: null, status: "leave" },
  { name: "Adv. Prabhat Gautam", date: "15 Mangsir 2081", clockIn: "8:55 AM", clockOut: "5:45 PM", status: "present" },
];

const LEAVE_REQUESTS = [
  { id: "1", name: "Adv. Anjali Shrestha", type: "sick", from: "15 Mangsir 2081", to: "17 Mangsir 2081", reason: "Medical leave", status: "approved" },
  { id: "2", name: "Sushil Bhattarai", type: "annual", from: "20 Mangsir 2081", to: "22 Mangsir 2081", reason: "Personal", status: "pending" },
];

const PAYROLL = [
  { name: "Adv. Ramesh Adhikari", role: "Partner", gross: 180000, pf: 10800, ssf: 9000, tax: 25000, net: 135200 },
  { name: "Adv. Sita Rana", role: "Partner", gross: 160000, pf: 9600, ssf: 8000, tax: 21000, net: 121400 },
  { name: "Adv. Binod Thapa", role: "Senior Associate", gross: 90000, pf: 5400, ssf: 4500, tax: 8000, net: 72100 },
  { name: "Adv. Anjali Shrestha", role: "Associate", gross: 60000, pf: 3600, ssf: 3000, tax: 3500, net: 49900 },
];

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  absent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  leave: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  half_day: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function AdminHRPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h1 className="font-serif text-2xl font-bold text-foreground">HR Management</h1>
      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance"><Clock className="w-3.5 h-3.5 mr-1" />Attendance</TabsTrigger>
          <TabsTrigger value="leave"><CalendarOff className="w-3.5 h-3.5 mr-1" />Leave</TabsTrigger>
          <TabsTrigger value="payroll"><DollarSign className="w-3.5 h-3.5 mr-1" />Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Today \u2014 15 Mangsir 2081</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {ATTENDANCE.map((a) => (
                <div key={a.name} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.name}</p>
                    {a.clockIn && <p className="text-xs text-muted-foreground">In: {a.clockIn} \u2014 Out: {a.clockOut ?? "Still in"}</p>}
                  </div>
                  <Badge className={`text-xs ${STATUS_COLORS[a.status]}`}>{a.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave" className="mt-4">
          <Card><CardContent className="p-0">
            <div className="divide-y divide-border">
              {LEAVE_REQUESTS.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{l.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{l.type} leave \u2014 {l.from} to {l.to}</p>
                    <p className="text-xs text-muted-foreground">{l.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${STATUS_COLORS[l.status]}`}>{l.status}</Badge>
                    {l.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" className="text-xs h-7 px-2" onClick={() => toast.success("Leave approved!")}>Approve</Button>
                        <Button size="sm" variant="destructive" className="text-xs h-7 px-2" onClick={() => toast.info("Leave rejected.")}>Reject</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Payroll \u2014 Mangsir 2081</CardTitle></CardHeader>
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
                        <td className="py-3 pr-4"><p className="font-medium text-foreground">{p.name}</p><p className="text-xs text-muted-foreground">{p.role}</p></td>
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
