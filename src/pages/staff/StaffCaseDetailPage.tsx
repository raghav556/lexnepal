import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { CalendarDays, FileText, MessageSquare, Clock, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

const MOCK_CASE = {
  caseNumber: "KTM/2081/001", title: "Sharma vs. Kathmandu Municipality", status: "active",
  client: "Prakash Sharma", lawyer: "Adv. Sita Rana Magar", area: "Civil Litigation",
  court: "Supreme Court of Nepal", judge: "Hon. Justice Ramesh KC", filingDate: "1 Baisakh 2081",
  description: "Appeal against Kathmandu Metropolitan City's decision to acquire land at Bhaktapur Plot 234 without fair compensation under the Land Acquisition Act.",
  hearings: [
    { date: "15 Mangsir 2081", court: "Supreme Court", purpose: "First hearing", status: "scheduled", outcome: null },
    { date: "28 Ashwin 2081", court: "Supreme Court", purpose: "Written statement", outcome: "Statement filed. Next date set.", status: "completed" },
  ],
  timeline: [
    { date: "28 Ashwin 2081", event: "Written statement filed", user: "Adv. Sita Rana" },
    { date: "10 Ashwin 2081", event: "Case registered with Supreme Court", user: "Adv. Sita Rana" },
    { date: "1 Baisakh 2081", event: "Client consultation and retainer signed", user: "Adv. Ramesh Adhikari" },
  ],
};

export default function StaffCaseDetailPage() {
  const { caseId: _caseId } = useParams<{ caseId: string }>();

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-muted-foreground">{MOCK_CASE.caseNumber}</span>
          <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
          <Badge variant="secondary" className="text-xs">{MOCK_CASE.area}</Badge>
        </div>
        <h1 className="font-serif text-xl font-bold text-foreground">{MOCK_CASE.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{MOCK_CASE.description}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Client", value: MOCK_CASE.client, icon: User },
          { label: "Assigned Lawyer", value: MOCK_CASE.lawyer, icon: User },
          { label: "Court", value: MOCK_CASE.court, icon: CalendarDays },
          { label: "Judge", value: MOCK_CASE.judge, icon: User },
        ].map((item) => (
          <Card key={item.label}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{item.label}</p><p className="text-sm font-medium text-foreground mt-0.5">{item.value}</p></CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="hearings">
        <TabsList>
          <TabsTrigger value="hearings"><CalendarDays className="w-3.5 h-3.5 mr-1" />Hearings</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="w-3.5 h-3.5 mr-1" />Documents</TabsTrigger>
          <TabsTrigger value="timeline"><Clock className="w-3.5 h-3.5 mr-1" />Timeline</TabsTrigger>
          <TabsTrigger value="messages"><MessageSquare className="w-3.5 h-3.5 mr-1" />Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="hearings" className="mt-4 space-y-3">
          {MOCK_CASE.hearings.map((h, i) => (
            <Card key={i}><CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex flex-col items-center justify-center text-accent">
                  <span className="text-xs font-bold">{h.date.split(" ")[0]}</span>
                  <span className="text-xs opacity-70">{h.date.split(" ")[1]}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{h.purpose}</p>
                  <p className="text-xs text-muted-foreground">{h.court}</p>
                  {h.outcome && <p className="text-xs text-muted-foreground italic">{h.outcome}</p>}
                </div>
              </div>
              <Badge className={`text-xs ${h.status === "completed" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"}`}>{h.status}</Badge>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="documents" className="mt-4"><p className="text-sm text-muted-foreground">Document management coming in milestone 5.</p></TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <div className="space-y-3">
            {MOCK_CASE.timeline.map((t, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-accent mt-1.5" />
                  {i < MOCK_CASE.timeline.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                </div>
                <div className="pb-3">
                  <p className="text-sm font-medium text-foreground">{t.event}</p>
                  <p className="text-xs text-muted-foreground">{t.date} \u2014 {t.user}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="messages" className="mt-4"><p className="text-sm text-muted-foreground">Internal notes coming in milestone 5.</p></TabsContent>
      </Tabs>
    </div>
  );
}
