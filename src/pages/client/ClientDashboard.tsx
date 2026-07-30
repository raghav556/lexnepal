import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "react-router-dom";
import { FolderOpen, FileText, Receipt, MessageSquare, CalendarDays, ArrowRight } from "lucide-react";

const MOCK_CASES = [
  { id: "1", title: "Property Dispute \u2014 Bhaktapur Plot 234", status: "active", nextHearing: "15 Mangsir 2081", lawyer: "Adv. Binod Thapa" },
  { id: "2", title: "Company Registration \u2014 TechVenture Pvt. Ltd.", status: "active", nextHearing: null, lawyer: "Adv. Ramesh Adhikari" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed_won: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  inquiry: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function ClientDashboard() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Here's an overview of your matters with Srimar Law.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Cases", value: "2", icon: FolderOpen, color: "text-blue-500" },
          { label: "Pending Documents", value: "3", icon: FileText, color: "text-amber-500" },
          { label: "Unread Messages", value: "1", icon: MessageSquare, color: "text-green-500" },
          { label: "Outstanding Balance", value: "NPR 15,000", icon: Receipt, color: "text-red-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={stat.color}><stat.icon className="w-5 h-5" /></div>
              <div>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Active Cases</CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
            <Link to="/client/cases">View all <ArrowRight className="ml-1 w-3 h-3" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {MOCK_CASES.map((c) => (
            <div key={c.id} className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
              <div>
                <p className="text-sm font-medium text-foreground">{c.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Assigned: {c.lawyer}</p>
                {c.nextHearing && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-accent">
                    <CalendarDays className="w-3 h-3" />Next hearing: {c.nextHearing}
                  </div>
                )}
              </div>
              <Badge className={`text-xs ${STATUS_COLORS[c.status]}`}>{c.status === "active" ? "Active" : c.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Upcoming Hearings</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-3 rounded-lg bg-accent/5 border border-accent/20">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex flex-col items-center justify-center">
              <span className="text-accent text-xs font-bold">15</span>
              <span className="text-accent text-xs">Mangsir</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Property Dispute \u2014 Bhaktapur Plot 234</p>
              <p className="text-xs text-muted-foreground">District Court, Kathmandu \u2014 11:00 AM</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
