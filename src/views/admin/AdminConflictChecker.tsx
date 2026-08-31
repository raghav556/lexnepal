import React, { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Search,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Download,
  XCircle,
  Clock,
  BarChart3,
  Filter,
  ShieldCheck,
} from "lucide-react";
import { FadeInUp } from "@/components/ui/animations.tsx";
import { toast } from "sonner";
import {
  useConflictCommands,
  useConflictStats,
  useRecentConflictChecks,
} from "@/client/queries/cases";
import { ConflictHitList, ConflictRiskSummary } from "@/components/conflicts/ConflictHitList";
import type { ConflictHitDto } from "@/shared/contracts/domains";
import type { ConflictOfficialResultDto, ConflictSearchScope } from "@/shared/contracts/conflicts";
import { cn } from "@/lib/utils";
import {
  DashboardButton,
  DashboardSection,
  DashboardStatusLabel,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { DASHBOARD_METRIC_TONES, DASHBOARD_TONE_PANEL_CLASSES } from "@/lib/dashboard-semantics";

function ConflictStatusLabel({ status }: { status: string }) {
  if (status === "cleared") {
    return (
      <DashboardStatusLabel
        tone="success"
        label="Cleared"
        icon={CheckCircle2}
        className="text-xs"
      />
    );
  }
  if (status === "conflict") {
    return (
      <DashboardStatusLabel tone="danger" label="Conflict" icon={XCircle} className="text-xs" />
    );
  }
  return (
    <DashboardStatusLabel
      tone="warning"
      label="Pending review"
      icon={AlertTriangle}
      className="text-xs"
    />
  );
}

const DEFAULT_SCOPE: ConflictSearchScope = {
  clients: true,
  cases: true,
  leads: true,
  appointments: true,
};

export default function AdminConflictChecker() {
  const [searchQuery, setSearchQuery] = useState("");
  const [scope, setScope] = useState<ConflictSearchScope>(DEFAULT_SCOPE);
  const [isSearching, setIsSearching] = useState(false);
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null);
  const [result, setResult] = useState<ConflictOfficialResultDto | null>(null);
  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionKind, setDecisionKind] = useState<"cleared" | "conflict">("cleared");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [isDeciding, setIsDeciding] = useState(false);

  const conflictCommands = useConflictCommands();
  const recentChecks = useRecentConflictChecks() || [];
  const stats = useConflictStats();
  const reportRef = useRef<HTMLDivElement>(null);

  const filteredHits = useMemo(() => {
    if (!result?.hits) return [] as ConflictHitDto[];
    return result.hits.filter((hit) => {
      const severityOk = severityFilter === "all" || hit.severity === severityFilter;
      const typeOk = typeFilter === "all" || hit.type === typeFilter;
      return severityOk && typeOk;
    });
  }, [result, severityFilter, typeFilter]);

  const hitTypes = useMemo(() => {
    if (!result?.hits) return [] as string[];
    return [...new Set(result.hits.map((h) => h.type))];
  }, [result]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setActiveCheckId(null);
    setResult(null);
    setSeverityFilter("all");
    setTypeFilter("all");

    try {
      const outcome = await conflictCommands.search(searchQuery.trim(), { scope });
      setResult(outcome);
      setActiveCheckId(outcome.checkId);
    } catch {
      toast.error("Conflict search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const openDecision = (kind: "cleared" | "conflict") => {
    setDecisionKind(kind);
    setDecisionNotes(
      kind === "cleared"
        ? "Reviewed all hits. No disqualifying conflict — clearance granted."
        : "Potential conflict identified. Matter intake blocked pending partner review.",
    );
    setDecisionOpen(true);
  };

  const submitDecision = async () => {
    if (!activeCheckId) return;
    setIsDeciding(true);
    try {
      await conflictCommands.updateStatus(activeCheckId, decisionKind, decisionNotes.trim());
      toast.success(
        decisionKind === "cleared"
          ? "Conflict check cleared and logged."
          : "Conflict flagged — do not proceed with intake.",
      );
      setDecisionOpen(false);
    } catch {
      toast.error("Failed to save conflict decision.");
    } finally {
      setIsDeciding(false);
    }
  };

  const toggleScope = (key: keyof ConflictSearchScope) => {
    setScope((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="conflict-report-root w-full min-w-0" ref={reportRef}>
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .conflict-report-root { padding: 0; max-width: 100%; }
          body { background: white; color: black; }
        }
      `}</style>

      <PortalPageShell
        portal="admin"
        className="max-w-6xl mx-auto print:hidden"
        eyebrow="Compliance intelligence"
        title="Enterprise conflict intelligence"
        description="Multi-source clearance across clients, matters, CRM leads, and consultation requests."
        icon={ShieldCheck}
        metrics={
          stats
            ? [
                {
                  label: "Checks this month",
                  value: stats.checksThisMonth,
                  icon: BarChart3,
                  tone: DASHBOARD_METRIC_TONES.cases,
                },
                {
                  label: "Total logged",
                  value: stats.totalChecks,
                  icon: ShieldAlert,
                  tone: "information",
                },
                {
                  label: "Pending review",
                  value: stats.pendingReviews,
                  icon: Clock,
                  tone: "warning",
                },
                {
                  label: "Cleared",
                  value: stats.clearedCount,
                  icon: CheckCircle2,
                  tone: "success",
                },
                {
                  label: "Conflicts flagged",
                  value: stats.conflictCount,
                  icon: XCircle,
                  tone: "danger",
                },
              ]
            : undefined
        }
      >
        <div className="hidden print:block mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold text-black">Conflict Clearance Report</h1>
          <p className="text-sm text-gray-600">Generated {new Date().toLocaleString()}</p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Search query:</strong> {searchQuery}
            </div>
            <div>
              <strong>Total hits:</strong> {result?.summary.total ?? 0}
            </div>
            <div>
              <strong>High-risk hits:</strong> {result?.summary.high ?? 0}
            </div>
            <div>
              <strong>Check ID:</strong> {activeCheckId ?? "—"}
            </div>
          </div>
        </div>

        <DashboardSection title="Official conflict search" icon={Search} className="print:hidden">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Person, company, counsel, email, phone, case #, KYC ID…"
                className="pl-9 h-11"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <DashboardButton type="submit" disabled={isSearching} className="h-11">
              {isSearching ? "Searching…" : "Run official check"}
            </DashboardButton>
          </form>

          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Sources:
            </span>
            {(Object.keys(scope) as (keyof ConflictSearchScope)[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleScope(key)}
                className={cn(
                  "text-xs px-3 py-1 rounded-full border transition-colors",
                  scope[key]
                    ? "bg-dashboard-primary-soft border-dashboard-primary/35 text-dashboard-primary"
                    : "bg-muted/30 border-border text-muted-foreground",
                )}
              >
                {key}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Official checks are audit-logged with your identity, timestamp, and hit summary. Use
            before accepting any new matter or client engagement.
          </p>
        </DashboardSection>

        {result && !isSearching && (
          <FadeInUp>
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg">
                    Results for{" "}
                    <span className="text-accent italic break-all">
                      &ldquo;{result.query}&rdquo;
                    </span>
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Checked {new Date(result.searchedAt).toLocaleString()} · Check ID{" "}
                    <span className="font-mono text-xs">{activeCheckId}</span>
                  </p>
                </div>
                <DashboardButton
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="print:hidden"
                >
                  <Download className="w-4 h-4 mr-2" /> Export clearance report
                </DashboardButton>
              </div>

              <ConflictRiskSummary summary={result.summary} />

              {result.summary.total === 0 ? (
                <div
                  className={`rounded-xl border p-8 text-center ${DASHBOARD_TONE_PANEL_CLASSES.success}`}
                >
                  <CheckCircle2 className="w-12 h-12 text-dashboard-success mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-dashboard-success">
                    Clear — no matching records
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
                    No clients, matters, leads, or consultation requests matched this query across
                    selected sources. Clearance auto-logged as cleared.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className={`rounded-lg border p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden ${DASHBOARD_TONE_PANEL_CLASSES.danger}`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-dashboard-danger mt-0.5 shrink-0" />
                      <div>
                        <h4 className="font-bold text-dashboard-danger">
                          {result.summary.high > 0
                            ? "High-risk matches require partner review"
                            : "Potential conflicts detected"}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Review each hit, open linked records, then record your clearance decision.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                      <DashboardButton variant="outline" onClick={() => openDecision("conflict")}>
                        <XCircle className="w-4 h-4 mr-2" /> Flag conflict
                      </DashboardButton>
                      <DashboardButton onClick={() => openDecision("cleared")}>
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Grant clearance
                      </DashboardButton>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 print:hidden">
                    <select
                      className="text-sm border border-input rounded-md px-2 py-1.5 bg-background"
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value as typeof severityFilter)}
                    >
                      <option value="all">All severities</option>
                      <option value="high">High only</option>
                      <option value="medium">Medium only</option>
                      <option value="low">Low only</option>
                    </select>
                    <select
                      className="text-sm border border-input rounded-md px-2 py-1.5 bg-background"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option value="all">All types</option>
                      {hitTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <ConflictHitList hits={filteredHits} />
                </>
              )}
            </div>
          </FadeInUp>
        )}

        <DashboardSection title="Audit trail — recent checks" icon={Clock} className="print:hidden">
          {recentChecks.length === 0 ? (
            <EmptyState
              title="No conflict checks yet"
              description="Official conflict checks will appear here once logged."
              icon={Clock}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">When</th>
                    <th className="px-4 py-3 text-left">Query</th>
                    <th className="px-4 py-3 text-left">Hits</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Run by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentChecks.map((check: any) => (
                    <tr key={check._id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {new Date(check.timestamp ?? check.checkedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium max-w-xs truncate">
                        &ldquo;{check.searchQuery}&rdquo;
                      </td>
                      <td className="px-4 py-3">{check.hitsCount}</td>
                      <td className="px-4 py-3">
                        <ConflictStatusLabel status={check.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{check.runByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardSection>
      </PortalPageShell>

      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionKind === "cleared" ? "Grant conflict clearance" : "Flag as conflict"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Decision notes (audit record)</Label>
            <Textarea
              rows={5}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="Document your reasoning for compliance…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionOpen(false)}>
              Cancel
            </Button>
            <DashboardButton
              onClick={submitDecision}
              disabled={isDeciding || !decisionNotes.trim()}
            >
              {isDeciding ? "Saving…" : "Save decision"}
            </DashboardButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
