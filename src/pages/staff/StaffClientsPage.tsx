import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Search, Plus, User, Building2 } from "lucide-react";
import { toast } from "sonner";

const CLIENTS = [
  { id: "1", name: "Prakash Sharma", type: "individual", email: "p.sharma@email.com", phone: "+977 98XXXXXXXX", activeCases: 1, kycStatus: "verified" },
  { id: "2", name: "TechVenture Pvt. Ltd.", type: "corporate", email: "legal@techventure.com.np", phone: "+977 01 XXXXXXX", activeCases: 2, kycStatus: "verified" },
  { id: "3", name: "Suresh Gurung", type: "individual", email: "s.gurung@email.com", phone: "+977 98XXXXXXXX", activeCases: 1, kycStatus: "submitted" },
  { id: "4", name: "Nepal Bank Ltd.", type: "corporate", email: "legal@nepalnational.com.np", phone: "+977 01 XXXXXXX", activeCases: 1, kycStatus: "verified" },
  { id: "5", name: "Grand Hotel Pvt. Ltd.", type: "corporate", email: "gm@grandhotel.com.np", phone: "+977 01 XXXXXXX", activeCases: 0, kycStatus: "verified" },
];

const KYC_COLORS: Record<string, string> = {
  verified: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  submitted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function StaffClientsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Clients</h1>
        <Button size="sm" onClick={() => toast.info("Client creation coming in the next milestone!")}><Plus className="w-4 h-4 mr-1" /> New Client</Button>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search clients..." /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CLIENTS.map((c) => (
          <Card key={c.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                {c.type === "corporate" ? <Building2 className="w-5 h-5 text-accent" /> : <User className="w-5 h-5 text-accent" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-foreground truncate">{c.name}</p>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">{c.type === "corporate" ? "Corporate" : "Individual"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{c.email}</p>
                <p className="text-xs text-muted-foreground">{c.phone}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge className={`text-xs ${KYC_COLORS[c.kycStatus]}`}>KYC: {c.kycStatus}</Badge>
                  <span className="text-xs text-muted-foreground">{c.activeCases} active case{c.activeCases !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
