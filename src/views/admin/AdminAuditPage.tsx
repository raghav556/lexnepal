import { formatNepalTimestamp } from "@/lib/nepali-calendar";
import { useI18n } from "@/lib/i18n-context";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Shield, User, FileText, Search, Activity } from "lucide-react";
import type { ElementType } from "react";
import { useAuditEvents, useUsers } from "@/client/queries/identity";
import {
  DashboardSection,
  DashboardStatusLabel,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { DASHBOARD_METRIC_TONES, type DashboardTone } from "@/lib/dashboard-semantics";

const ACTION_TONES: Record<string, DashboardTone> = {
  VIEW: "neutral",
  CREATE: "success",
  UPDATE: "information",
  DELETE: "danger",
  SEND: "primary",
  UPLOAD: "warning",
  CONVERT: "success",
};

const RESOURCE_ICONS: Record<string, ElementType> = {
  documents: FileText,
  cases: Shield,
  users: User,
  leads: Search,
};

const RESOURCE_OPTIONS = ["all", "cases", "documents", "users", "leads"];

export default function AdminAuditPage() {
  const { language } = useI18n();
  const [resourceFilter, setResourceFilter] = useState<string>("all");

  const auditEvents = useAuditEvents(resourceFilter !== "all" ? { resource: resourceFilter } : {});
  const usersResult = useUsers();
  const auditLog = auditEvents ?? [];
  const users = usersResult ?? [];
  const isLoading = auditEvents === undefined;

  const getUserName = (userId: string) =>
    users.find((u) => u.id === userId)?.name || "Unknown User";

  return (
    <PortalPageShell
      portal="admin"
      loading={isLoading}
      loadingLabel="Loading audit log…"
      eyebrow="Compliance"
      title="Audit log"
      description="Immutable record of all user actions. Read-only. Admin access only."
      icon={Shield}
      actions={
        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger
            aria-label={
              language === "ne"
                ? "अडिट अभिलेखको स्रोत छान्नुहोस्"
                : "Filter audit records by resource"
            }
            className="w-44 h-8 text-xs"
          >
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
      }
      metrics={[
        {
          label: "Events loaded",
          value: auditLog.length,
          icon: Activity,
          tone: DASHBOARD_METRIC_TONES.cases,
        },
        {
          label: "CREATE / UPDATE entries",
          value: auditLog.filter((e) => ["CREATE", "UPDATE"].includes(e.action)).length,
          helperText: "Exact action codes in loaded events",
          icon: FileText,
          tone: "information",
        },
        {
          label: "DELETE entries",
          value: auditLog.filter((e) => e.action === "DELETE").length,
          helperText: "Exact action code in loaded events",
          icon: Shield,
          tone: "danger",
        },
        {
          label: "Actors loaded",
          value: new Set(auditLog.map((e) => e.userId)).size,
          icon: User,
          tone: DASHBOARD_METRIC_TONES.people,
        },
      ]}
    >
      <DashboardSection
        title="Audit entries"
        description="Recent events for the selected filter. Counts describe the loaded records."
        icon={Activity}
      >
        {auditLog.length === 0 ? (
          <EmptyState
            title="No audit events"
            description="No audit events found for the selected filter."
            icon={Shield}
          />
        ) : (
          <div className="space-y-2">
            {auditLog.map((entry) => {
              const ResourceIcon = RESOURCE_ICONS[entry.resource] ?? Shield;
              const actionTone = ACTION_TONES[entry.action] ?? "neutral";
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-lg border border-dashboard-border bg-dashboard-panel p-4"
                >
                  <div className="w-9 h-9 rounded-lg bg-dashboard-neutral-soft flex items-center justify-center flex-shrink-0">
                    <ResourceIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <DashboardStatusLabel
                        label={entry.action}
                        tone={actionTone}
                        className="font-mono text-[10px]"
                      />
                      <span className="text-xs font-medium text-foreground">
                        {entry.actorName || getUserName(entry.userId)}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        on {entry.resource}
                      </span>
                    </div>
                    {entry.details && <p className="text-sm text-foreground">{entry.details}</p>}
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{formatNepalTimestamp(entry.createdAt, language)}</span>
                      {entry.ipAddress && <span className="font-mono">IP: {entry.ipAddress}</span>}
                      {entry.resourceId && <span className="font-mono">{entry.resourceId}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashboardSection>
    </PortalPageShell>
  );
}
