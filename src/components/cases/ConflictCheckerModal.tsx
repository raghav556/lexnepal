import { useEffect, useState } from "react";
import { useCaseCommands, useConflictCommands, useConflictPreview } from "@/client/queries/cases";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { AlertTriangle, CheckCircle2, Search, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ConflictHitList, ConflictRiskSummary } from "@/components/conflicts/ConflictHitList";
import type { ConflictOfficialResultDto } from "@/shared/contracts/conflicts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId?: string;
  caseNumber?: string;
  initialQuery?: string;
  matterContext?: {
    clientName?: string;
    opposingCounsel?: string;
    caseNumber?: string;
  };
  onOfficialClearance?: (result: ConflictOfficialResultDto) => void;
}

export function ConflictCheckerModal({
  open,
  onOpenChange,
  caseId,
  caseNumber,
  initialQuery = "",
  matterContext,
  onOfficialClearance,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [isMarking, setIsMarking] = useState(false);
  const [isOfficialRunning, setIsOfficialRunning] = useState(false);
  const [officialResult, setOfficialResult] = useState<ConflictOfficialResultDto | null>(null);

  const { markConflict: markConflictChecked } = useCaseCommands();
  const conflictCommands = useConflictCommands();
  const preview = useConflictPreview(debouncedQuery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setDebouncedQuery(initialQuery);
      setOfficialResult(null);
    }
  }, [open, initialQuery]);

  const hits = preview?.hits;
  const hasConflicts = hits && hits.length > 0;
  const searched = debouncedQuery.trim().length >= 2;
  const highRisk = preview?.summary.high ?? 0;

  const handleOfficialCheck = async () => {
    if (debouncedQuery.trim().length < 2) return;
    setIsOfficialRunning(true);
    try {
      const outcome = await conflictCommands.search(debouncedQuery.trim(), { matterContext });
      setOfficialResult(outcome);
      onOfficialClearance?.(outcome);
      if (outcome.summary.total === 0) {
        toast.success("Official clearance logged — no conflicts found.");
      } else if (outcome.summary.high > 0) {
        toast.warning("High-risk hits found — partner review required.");
      } else {
        toast.info("Matches found — review before granting clearance.");
      }
    } catch {
      toast.error("Official conflict check failed.");
    } finally {
      setIsOfficialRunning(false);
    }
  };

  const handleMarkCleared = async () => {
    if (!caseId) return;
    setIsMarking(true);
    try {
      await markConflictChecked(caseId, true);
      toast.success(`Conflict check cleared for case ${caseNumber || caseId}`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to mark conflict checked");
    } finally {
      setIsMarking(false);
    }
  };

  const handleClose = () => {
    setQuery("");
    setDebouncedQuery("");
    setOfficialResult(null);
    onOpenChange(false);
  };

  const clearanceGranted =
    officialResult &&
    (officialResult.summary.total === 0 ||
      (officialResult.summary.high === 0 && officialResult.summary.total > 0));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Conflict of Interest Checker
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Live preview scans firm records without logging. Run an <strong>official check</strong>{" "}
            before opening a new matter — it creates an audit record.
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Client, company, opposing counsel, email, phone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {searched && preview === undefined && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Preview scan…</span>
            </div>
          )}

          {searched && preview && (
            <>
              <ConflictRiskSummary summary={preview.summary} />
              {!hasConflicts && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-sm text-emerald-800 dark:text-emerald-300">
                    Preview: no matches for &ldquo;{debouncedQuery}&rdquo;.
                  </p>
                </div>
              )}
              {hasConflicts && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 dark:text-red-300">
                    {highRisk > 0
                      ? `${highRisk} high-risk hit(s) — do not proceed without partner sign-off.`
                      : `${hits!.length} match(es) found in preview.`}
                  </p>
                </div>
              )}
              {hasConflicts && <ConflictHitList hits={hits!} />}
            </>
          )}

          {!searched && (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <ShieldCheck className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Enter at least 2 characters to preview</p>
            </div>
          )}

          {officialResult && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm">
              Official check logged · ID{" "}
              <span className="font-mono text-xs">{officialResult.checkId}</span> ·{" "}
              {officialResult.summary.total} hit(s)
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Close
          </Button>
          <Button
            variant="secondary"
            onClick={handleOfficialCheck}
            disabled={!searched || isOfficialRunning}
            className="w-full sm:w-auto"
          >
            {isOfficialRunning ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ShieldCheck className="w-4 h-4 mr-2" />
            )}
            Run official check
          </Button>
          {caseId && searched && clearanceGranted && (
            <Button
              onClick={handleMarkCleared}
              disabled={isMarking}
              className="w-full sm:w-auto gap-2"
            >
              {isMarking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Mark case cleared
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
