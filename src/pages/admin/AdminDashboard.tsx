import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line } from "recharts";
import { TrendingUp, FolderOpen, Users, DollarSign, Clock } from "lucide-react";
import { formatNPR } from "@/lib/lex-constants.ts";

const MONTHLY_REVENUE = [
  { month: "Shrawan", revenue: 180000 },
  { month: "Bhadra", revenue: 220000 },
  { month: "Ashwin", revenue: 195000 },
  { month: "Kartik", revenue: 260000 },
  { month: "Mangsir", revenue: 240000 },
];

const CASES_BY_AREA = [
  { area: "Corporate", count: 8 },
  { area: "Criminal", count: 5 },
  { area: "Property", count: 7 },
  { area: "Family", count: 4 },
  { area: "IP", count: 3 },
  { area: "Labor", count: 3 },
];

const KPI = [
  { label: "Revenue (MTD)", value: formatNPR(240000), change: "+8%", icon: DollarSign, color: "text-green-400" },
  { label: "Active Cases", value: "24", change: "+3 this month", icon: FolderOpen, color: "text-blue-400" },
  { label: "Total Clients", value: "142", change: "+5 this month", icon: Users, color: "text-purple-400" },
  { label: "Avg. Billable Hours/Lawyer", value: "32h", change: "This week", icon: Clock, color: "text-amber-400" },
];

export default function AdminDashboard() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Executive Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Firm-wide performance overview \u2014 Mangsir 2081</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI.map((k) => (
          <Card key={k.label}><CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <k.icon className={`w-5 h-5 ${k.color}`} />
              <span className="text-xs text-muted-foreground flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> {k.change}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Monthly Revenue (NPR)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={MONTHLY_REVENUE}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v/1000}k`} />
                <Tooltip formatter={(v) => [typeof v === "number" ? formatNPR(v) : String(v), "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="oklch(0.68 0.12 60)" strokeWidth={2} dot={{ fill: "oklch(0.68 0.12 60)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Active Cases by Practice Area</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={CASES_BY_AREA} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="area" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
                <Tooltip />
                <Bar dataKey="count" fill="oklch(0.32 0.06 265)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Staff Utilization \u2014 This Week</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "Adv. Sita Rana", role: "Partner", hours: 42, target: 40 },
              { name: "Adv. Ramesh Adhikari", role: "Partner", hours: 38, target: 40 },
              { name: "Adv. Binod Thapa", role: "Senior Associate", hours: 35, target: 45 },
              { name: "Adv. Anjali Shrestha", role: "Associate", hours: 28, target: 45 },
              { name: "Adv. Prabhat Gautam", role: "Associate", hours: 44, target: 45 },
            ].map((s) => {
              const pct = Math.round((s.hours / s.target) * 100);
              return (
                <div key={s.name} className="flex items-center gap-4">
                  <div className="w-36 flex-shrink-0">
                    <p className="text-sm font-medium text-foreground text-right">{s.name}</p>
                    <p className="text-xs text-muted-foreground text-right">{s.role}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{s.hours}h / {s.target}h</span>
                      <span className={pct >= 90 ? "text-green-400" : pct >= 70 ? "text-amber-400" : "text-red-400"}>{pct}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct >= 90 ? "bg-green-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
