import { Card, CardContent } from "@/components/ui/card.tsx";
import { Shield, User, FileText, DollarSign } from "lucide-react";
import type { ElementType } from "react";

const AUDIT_ENTRIES = [
  { id: "1", user: "Adv. Sita Rana", action: "VIEW", resource: "documents", resourceId: "DOC-001", detail: "Viewed case document: Sharma Appeal Petition", time: "15 Mangsir 2081, 10:32 AM", ip: "192.168.1.14" },
  { id: "2", user: "Adv. Ramesh Adhikari", action: "CREATE", resource: "cases", resourceId: "KTM/2081/025", detail: "Created new case: Nepal Bank Employment Dispute", time: "15 Mangsir 2081, 9:45 AM", ip: "192.168.1.10" },
  { id: "3", user: "Admin Account", action: "UPDATE", resource: "users", resourceId: "USR-007", detail: "Changed role: Paralegal \u2192 Associate", time: "14 Mangsir 2081, 5:12 PM", ip: "192.168.1.1" },
  { id: "4", user: "Adv. Binod Thapa", action: "SEND", resource: "invoices", resourceId: "INV-2081-001", detail: "Sent invoice INV-2081-001 to Prakash Sharma", time: "14 Mangsir 2081, 3:28 PM", ip: "192.168.1.15" },
  { id: "5", user: "Adv. Prabhat Gautam", action: "UPLOAD", resource: "documents", resourceId: "DOC-089", detail: "Uploaded document: TechVenture Trademark Certificate", time: "13 Mangsir 2081, 2:10 PM", ip: "192.168.1.18" },
  { id: "6", user: "Adv. Anjali Shrestha", action: "VIEW", resource: "cases", resourceId: "KTM/2081/003", detail: "Accessed case: Gurung Family Dispute", time: "13 Mangsir 2081, 11:05 AM", ip: "192.168.1.12" },
];

const ACTION_COLORS: Record<string, string> = {
  VIEW: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  CREATE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  SEND: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  UPLOAD: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

const RESOURCE_ICONS: Record<string, ElementType> = {
  documents: FileText,
  cases: Shield,
  users: User,
  invoices: DollarSign,
};

export default function AdminAuditPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Immutable record of all user actions. Read-only.</p>
      </div>
      <div className="space-y-2">
        {AUDIT_ENTRIES.map((entry) => {
          const ResourceIcon = RESOURCE_ICONS[entry.resource] ?? Shield;
          return (
            <Card key={entry.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0"><ResourceIcon className="w-4 h-4 text-muted-foreground" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded font-semibold ${ACTION_COLORS[entry.action] ?? ACTION_COLORS.VIEW}`}>{entry.action}</span>
                    <span className="text-xs font-medium text-foreground">{entry.user}</span>
                  </div>
                  <p className="text-sm text-foreground">{entry.detail}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{entry.time}</span>
                    <span className="font-mono">IP: {entry.ip}</span>
                    <span className="font-mono">{entry.resourceId}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
