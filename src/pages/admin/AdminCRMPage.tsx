import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Loader2, UserPlus, Phone, Mail, Tag, X } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  new:                    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  contacted:              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  consultation_scheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  converted:              "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  lost:                   "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  new:                    "New",
  contacted:              "Contacted",
  consultation_scheduled: "Consult Scheduled",
  converted:              "Converted",
  lost:                   "Lost",
};

interface ConvertModalState {
  leadId: string;
  leadName: string;
  email?: string;
  phone?: string;
}

export default function AdminCRMPage() {
  const leads = useQuery(api.leads.listLeads, {}) || [];
  const updateLead = useMutation(api.leads.updateLead);
  const convertToClient = useMutation(api.leads.convertToClient);

  const [convertModal, setConvertModal] = useState<ConvertModalState | null>(null);
  const [convertType, setConvertType] = useState<"individual" | "corporate">("individual");
  const [convertCompany, setConvertCompany] = useState("");
  const [converting, setConverting] = useState(false);

  const isLoading = leads === undefined;

  const handleStatusChange = async (leadId: string, status: string) => {
    try {
      await updateLead({ leadId: leadId as any, status: status as any });
      toast.success("Pipeline status updated.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status.");
    }
  };

  const handleConvertSubmit = async () => {
    if (!convertModal) return;
    setConverting(true);
    try {
      const clientArgs: any = {
        leadId: convertModal.leadId as any,
        type: convertType,
      };
      if (convertType === "corporate" && convertCompany.trim()) {
        clientArgs.companyName = convertCompany.trim();
      }
      await convertToClient(clientArgs);
      toast.success(`"${convertModal.leadName}" has been converted to a client record.`);
      setConvertModal(null);
      setConvertCompany("");
      setConvertType("individual");
    } catch (err: any) {
      toast.error(err?.message || "Conversion failed.");
    } finally {
      setConverting(false);
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
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">CRM — Lead Pipeline</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage intake inquiries and convert to client matters.</p>
      </div>

      {/* Pipeline summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <Card key={key} className={key === "converted" ? "border-green-500/30" : ""}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">
                {leads.filter((l: any) => l.status === key).length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leads list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold font-serif">All Leads ({leads.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {leads.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No leads in the pipeline yet.</p>
          ) : (
            leads.map((lead: any) => (
              <div key={lead._id} className="flex items-start justify-between p-3.5 border border-border rounded-lg hover:shadow-xs transition-shadow gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{lead.fullName}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {lead.phone && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />{lead.phone}
                      </span>
                    )}
                    {lead.email && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" />{lead.email}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {lead.practiceAreaInterest && (
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Tag className="w-2.5 h-2.5" />{lead.practiceAreaInterest}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {lead.source?.replace("_", " ")}
                    </Badge>
                    {lead.notes && (
                      <span className="text-xs text-muted-foreground italic line-clamp-1">{lead.notes}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={`text-xs whitespace-nowrap ${STATUS_COLORS[lead.status]}`}>
                    {STATUS_LABELS[lead.status]}
                  </Badge>
                  {/* Status dropdown */}
                  {lead.status !== "converted" && (
                    <Select
                      value={lead.status}
                      onValueChange={(val) => handleStatusChange(lead._id, val)}
                    >
                      <SelectTrigger className="w-[130px] h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).filter(([k]) => k !== "converted").map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {/* Convert to Client button */}
                  {lead.status !== "converted" && lead.status !== "lost" && (
                    <Button
                      size="sm"
                      className="text-xs h-7 gap-1 whitespace-nowrap"
                      variant="outline"
                      onClick={() =>
                        setConvertModal({
                          leadId: lead._id,
                          leadName: lead.fullName,
                          email: lead.email,
                          phone: lead.phone,
                        })
                      }
                    >
                      <UserPlus className="w-3 h-3" /> Convert
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Convert to Client Modal */}
      {convertModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-foreground">Convert to Client</h3>
              <button onClick={() => setConvertModal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Creating a client record for <span className="font-semibold text-foreground">"{convertModal.leadName}"</span>.
              Their contact details will be pre-filled from the lead record.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Client Type</label>
                <Select value={convertType} onValueChange={(v) => setConvertType(v as any)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {convertType === "corporate" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Company Name</label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. Himalaya Trading Pvt. Ltd."
                    value={convertCompany}
                    onChange={(e) => setConvertCompany(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setConvertModal(null)}>
                Cancel
              </Button>
              <Button className="flex-1 gap-1" onClick={handleConvertSubmit} disabled={converting}>
                {converting ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                Confirm Convert
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
