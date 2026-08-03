import { useQuery } from "@/client/data/convex-bridge.ts";
import { api } from "@/convex/_generated/api.js";
import { 
  BarChart3, TrendingUp, PieChart, Clock, Users, Banknote, Briefcase, Activity
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils.ts";

function formatCurrency(amount: number) {
  if (amount >= 100000) return `Rs. ${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `Rs. ${(amount / 1000).toFixed(1)}K`;
  return `Rs. ${amount}`;
}

export default function AdminAnalyticsPage() {
  const data = (useQuery(api.analytics.getDashboardData as any, {}) || null) as any;

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate max values for bar scaling
  const maxPracticeRevenue = Math.max(...Object.values(data.revenueByPractice || {0: 1}) as number[]);
  const maxAssocHours = Math.max(...Object.values(data.hoursByAssociate || {0: 1}) as number[]);
  const maxMonthly = Math.max(...(data.monthlyRevenue || []).map((m: any) => m.revenue));

  // Colors for case status
  const statusColors: Record<string, string> = {
    active: "bg-blue-500",
    closed: "bg-gray-500",
    pending_hearing: "bg-amber-500",
    appealed: "bg-purple-500"
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif text-primary flex items-center gap-2">
          <BarChart3 className="w-6 h-6" /> Advanced Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Firm performance, revenue metrics, and utilization tracking.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
            <Banknote className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg sm:text-2xl font-bold text-foreground min-w-0 truncate">{new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR" }).format(data.totalRevenue || 0)}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><TrendingUp className="w-3 h-3" /> From paid invoices</p>
        </div>
        
        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-muted-foreground">Realization Rate</p>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{data.realizationRate || 0}%</p>
          <p className="text-xs text-muted-foreground mt-1">Billed vs Collected</p>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-muted-foreground">Avg Case Value</p>
            <Briefcase className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-lg sm:text-2xl font-bold text-foreground min-w-0 truncate">{new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR" }).format(data.avgCaseValue || 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">Across {data.totalCases} cases</p>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-muted-foreground">Client Retention</p>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{data.retentionRate || 0}%</p>
          <p className="text-xs text-muted-foreground mt-1">Active vs Total Clients</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revenue by Practice Area */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
          <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" /> Revenue by Practice Area
          </h3>
          <div className="space-y-4">
            {Object.entries(data.revenueByPractice || {}).map(([area, rev]: any) => (
              <div key={area}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">{area}</span>
                  <span className="text-muted-foreground">{formatCurrency(rev)}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-1000" 
                    style={{ width: `${(rev / maxPracticeRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Billable Hours by Associate */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
          <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Billable Hours by Staff
          </h3>
          <div className="space-y-4">
            {Object.entries(data.hoursByAssociate || {}).map(([name, hours]: any) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">{name}</span>
                  <span className="text-muted-foreground">{hours} hrs</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-1000" 
                    style={{ width: `${(hours / maxAssocHours) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6-Month Revenue Trend */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
          <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Revenue Trend (Last 6 Months)
          </h3>
          <div className="flex items-end justify-between h-48 mt-4 gap-2">
            {(data.monthlyRevenue || []).map((m: any, idx: number) => {
              const heightPct = Math.max(10, (m.revenue / maxMonthly) * 100);
              return (
                <div key={idx} className="flex flex-col items-center flex-1 gap-2 group">
                  <div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatCurrency(m.revenue)}
                  </div>
                  <div className="w-full bg-blue-500 rounded-t-sm group-hover:bg-blue-400 transition-colors" style={{ height: `${heightPct}%` }} />
                  <span className="text-xs text-muted-foreground truncate w-full text-center">{m.month}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Case Status Distribution */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col">
          <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" /> Case Status Distribution
          </h3>
          <div className="flex-1 flex flex-col justify-center space-y-4">
            {Object.entries(data.casesByStatus || {}).map(([status, count]: any) => {
              const pct = Math.round((count / data.totalCases) * 100);
              const colorClass = statusColors[status] || "bg-gray-400";
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className={cn("w-3 h-3 rounded-full", colorClass)} />
                  <span className="capitalize text-sm font-medium flex-1 text-foreground">{status.replace("_", " ")}</span>
                  <span className="text-sm font-semibold">{count}</span>
                  <span className="text-xs text-muted-foreground w-12 text-right">{pct}%</span>
                </div>
              )
            })}
            
            {/* Simple stacked progress bar representation of the pie chart */}
            <div className="w-full h-3 rounded-full overflow-hidden flex mt-4">
              {Object.entries(data.casesByStatus || {}).map(([status, count]: any) => {
                const pct = (count / data.totalCases) * 100;
                const colorClass = statusColors[status] || "bg-gray-400";
                return <div key={status} className={cn("h-full", colorClass)} style={{ width: `${pct}%` }} />
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
