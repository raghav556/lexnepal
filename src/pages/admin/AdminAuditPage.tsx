import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Shield, User, FileText, DollarSign, Search, Loader2 } from "lucide-react";
import type { ElementType } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";

const ACTION_COLORS: Record<string, string> = {
  VIEW:    "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  CREATE:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  UPDATE:  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  DELETE:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  SEND:    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  UPLOAD:  "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  CONVERT: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
};

const RESOURCE_ICONS: Record<string, ElementType> = {
  documents: FileText,
  cases:     Shield,
  users:     User,
  invoices:  DollarSign,
  leads:     Search,
};

const RESOURCE_OPTIONS = ["all", "cases", "documents", "invoices", "users", "leads"];

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminAuditPage() {
  const [resourceFilter, setResourceFilter] = useState<string>("all");

  // Fetch audit log — resource filter sent to query for index use when specific
  const auditLog = useQuery(
    api.auditLog.listAuditLog,
    resourceFilter !== "all" ? { resource: resourceFilter } : {}
  ) || [];

  const users = useQuery(api.users.listUsers, {}) || [];

  const isLoading = auditLog === undefined;

  const getUserName = (userId: string) =>
    users.find((u: any) => u._id === userId)?.name || "Unknown User";

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 font-sans">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Audit Log</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Immutable record of all user actions. Read-only. Admin access only.
          </p>
        </div>
        {/* Resource filter */}
        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="Filter by resource" />
          </SelectTrigger>
          <SelectContent>
            {RESOURCE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r} className="capitalize">
                {r === "all" ? "All Resources" : r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Events", value: auditLog.length },
          { label: "Create / Updates", value: auditLog.filter((e: any) => ["CREATE","UPDATE"].includes(e.action)).length },
          { label: "Sensitive Deletes", value: auditLog.filter((e: any) => e.action === "DELETE").length },
          { label: "Unique Users", value: new Set(auditLog.map((e: any) => e.userId)).size },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Audit entries */}
      <div className="space-y-2">
        {auditLog.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-sm text-muted-foreground">
              No audit events found for the selected filter.
            </CardContent>
          </Card>
        ) : (
          auditLog.map((entry: any) => {
            const ResourceIcon = RESOURCE_ICONS[entry.resource] ?? Shield;
            const actionColor = ACTION_COLORS[entry.action] ?? ACTION_COLORS.VIEW;
            return (
              <Card key={entry._id}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <ResourceIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded font-semibold ${actionColor}`}>
                        {entry.action}
                      </span>
                      <span className="text-xs font-medium text-foreground">
                        {getUserName(entry.userId)}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        on {entry.resource}
                      </span>
                    </div>
                    {entry.details && (
                      <p className="text-sm text-foreground">{entry.details}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{formatTime(entry._creationTime)}</span>
                      {entry.ipAddress && (
                        <span className="font-mono">IP: {entry.ipAddress}</span>
                      )}
                      {entry.resourceId && (
                        <span className="font-mono">{entry.resourceId}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
