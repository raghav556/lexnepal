import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { useState } from "react";

const LEADS = [
  { id: "1", name: "Rajan Karki", phone: "+977 98XXXXXXXX", area: "Property Law", source: "website", status: "new", date: "15 Mangsir 2081" },
  { id: "2", name: "Srijana Thapa", phone: "+977 98XXXXXXXX", area: "Family Law", source: "referral", status: "contacted", date: "14 Mangsir 2081" },
  { id: "3", name: "Himalaya Trading Pvt. Ltd.", phone: "+977 01 XXXXXXX", area: "Corporate Law", source: "website", status: "consultation_scheduled", date: "12 Mangsir 2081" },
  { id: "4", name: "Gopal Bhandari", phone: "+977 98XXXXXXXX", area: "Criminal Law", source: "walk_in", status: "converted", date: "8 Mangsir 2081" },
  { id: "5", name: "Sunita Gurung", phone: "+977 98XXXXXXXX", area: "Immigration", source: "social", status: "lost", date: "5 Mangsir 2081" },
];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  consultation_scheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  converted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New", contacted: "Contacted", consultation_scheduled: "Consult Scheduled", converted: "Converted", lost: "Lost",
};

export default function AdminCRMPage() {
  const [leads, setLeads] = useState(LEADS);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h1 className="font-serif text-2xl font-bold text-foreground">CRM \u2014 Lead Pipeline</h1>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <Card key={key} className={key === "converted" ? "border-green-500/30" : ""}>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-foreground">{leads.filter((l) => l.status === key).length}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">All Leads</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {leads.map((lead) => (
            <div key={lead.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">{lead.name}</p>
                <p className="text-xs text-muted-foreground">{lead.phone} \u2014 {lead.area}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs capitalize">{lead.source.replace("_", " ")}</Badge>
                  <span className="text-xs text-muted-foreground">{lead.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className={`text-xs ${STATUS_COLORS[lead.status]}`}>{STATUS_LABELS[lead.status]}</Badge>
                <Select value={lead.status} onValueChange={(val) => { setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, status: val } : l)); toast.success("Status updated"); }}>
                  <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
