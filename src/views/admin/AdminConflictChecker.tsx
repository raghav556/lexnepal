import React, { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
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
import {
  ConflictHitList,
  ConflictRiskSummary,
} from "@/components/conflicts/ConflictHitList";
import type { ConflictHitDto } from "@/shared/contracts/domains";
import type {
  ConflictOfficialResultDto,
  ConflictSearchScope,
} from "@/shared/contracts/conflicts";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  if (status === "cleared") {
    return (
      <span className="text-xs font-semibold text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full inline-flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" /> Cleared
      </span>
    );
  }
  if (status === "conflict") {
    return (
      <span className="text-xs font-semibold text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded-full inline-flex items-center gap-1">
        <XCircle className="w-3 h-3" /> Conflict
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-1 rounded-full inline-flex items-center gap-1">
      <AlertTriangle className="w-3 h-3" /> Pending review
    </span>
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
    <div
      className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 sm:space-y-8 w-full min-w-0 conflict-report-root"
      ref={reportRef}
    >
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .conflict-report-root { padding: 0; max-width: 100%; }
          body { background: white; color: black; }
        }
      `}</style>

      <div className="print:hidden min-w-0 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
              Enterprise Conflict Intelligence
            </h1>
            <p className="text-muted-foreground text-sm">
              Multi-source clearance across clients, matters, CRM leads, and consultation requests.
            </p>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 print:hidden">
          {[
            { label: "Checks this month", value: stats.checksThisMonth, icon: BarChart3 },
            { label: "Total logged", value: stats.totalChecks, icon: ShieldAlert },
            { label: "Pending review", value: stats.pendingReviews, icon: Clock },
            { label: "Cleared", value: stats.clearedCount, icon: CheckCircle2 },
            { label: "Conflicts flagged", value: stats.conflictCount, icon: XCircle },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                  <Icon className="w-4 h-4 text-accent/70" />
                </div>
                <p className="text-2xl font-bold mt-2">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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

      <Card className="border-border/50 shadow-sm print:hidden">
        <CardHeader className="bg-secondary/20 border-b pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-accent" /> Official conflict search
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
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
            <Button type="submit" disabled={isSearching} className="h-11 bg-accent hover:bg-accent/90">
              {isSearching ? "Searching…" : "Run official check"}
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
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
                    ? "bg-accent/10 border-accent/30 text-accent"
                    : "bg-muted/30 border-border text-muted-foreground",
                )}
              >
                {key}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Official checks are audit-logged with your identity, timestamp, and hit summary. Use before
            accepting any new matter or client engagement.
          </p>
        </CardContent>
      </Card>

      {result && !isSearching && (
        <FadeInUp>
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h2 className="font-semibold text-lg">
                  Results for{" "}
                  <span className="text-accent italic break-all">"{result.query}"</span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Checked {new Date(result.searchedAt).toLocaleString()} · Check ID{" "}
                  <span className="font-mono text-xs">{activeCheckId}</span>
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
                <Download className="w-4 h-4 mr-2" /> Export clearance report
              </Button>
            </div>

            <ConflictRiskSummary summary={result.summary} />

            {result.summary.total === 0 ? (
              <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/40 p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-green-800 dark:text-green-300">
                  Clear — no matching records
                </h3>
                <p className="text-sm text-green-700/80 dark:text-green-400/80 mt-2 max-w-lg mx-auto">
                  No clients, matters, leads, or consultation requests matched this query across
                  selected sources. Clearance auto-logged as cleared.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/40 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-bold text-red-800 dark:text-red-300">
                        {result.summary.high > 0
                          ? "High-risk matches require partner review"
                          : "Potential conflicts detected"}
                      </h4>
                      <p className="text-sm text-red-700/80 dark:text-red-400/80 mt-1">
                        Review each hit, open linked records, then record your clearance decision.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <Button variant="outline" className="border-red-300 text-red-700" onClick={() => openDecision("conflict")}>
                      <XCircle className="w-4 h-4 mr-2" /> Flag conflict
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => openDecision("cleared")}>
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Grant clearance
                    </Button>
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

      <div className="print:hidden space-y-4">
        <h3 className="text-lg font-bold font-serif flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent" /> Audit trail — recent checks
        </h3>
        {recentChecks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No official conflict checks logged yet.
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
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
                      <td className="px-4 py-3 font-medium max-w-xs truncate">"{check.searchQuery}"</td>
                      <td className="px-4 py-3">{check.hitsCount}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={check.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{check.runByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

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
            <Button onClick={submitDecision} disabled={isDeciding || !decisionNotes.trim()}>
              {isDeciding ? "Saving…" : "Save decision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
