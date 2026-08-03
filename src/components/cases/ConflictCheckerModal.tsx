import { useState, useEffect } from "react";
import { useCaseCommands, useConflictSearch } from "@/client/queries/cases";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { AlertTriangle, CheckCircle2, Search, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional: pre-fill query and lock to a specific case for marking cleared
  caseId?: string;
  caseNumber?: string;
}

export function ConflictCheckerModal({ open, onOpenChange, caseId, caseNumber }: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isMarking, setIsMarking] = useState(false);

  const { markConflict: markConflictChecked } = useCaseCommands();

  // Debounce the search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const hits = useConflictSearch(debouncedQuery);

  const hasConflicts = hits && hits.length > 0;
  const searched = debouncedQuery.length >= 2;

  const handleMarkCleared = async () => {
    if (!caseId) return;
    setIsMarking(true);
    try {
      await markConflictChecked(caseId, true);
      toast.success(`Conflict check cleared for case ${caseNumber || caseId}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to mark conflict checked");
    } finally {
      setIsMarking(false);
    }
  };

  const handleClose = () => {
    setQuery("");
    setDebouncedQuery("");
    onOpenChange(false);
  };

  const typeColors: Record<string, string> = {
    "Existing Client": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "Existing Case": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    "Opposing Counsel": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Conflict of Interest Checker
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Search by client name, opposing party, or related entity to detect any existing
            relationships before accepting a new case engagement.
          </p>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Type a name, company, or party to check..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Banner */}
          {searched && hits === undefined && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Scanning records…</span>
            </div>
          )}

          {searched && hits !== undefined && !hasConflicts && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  No conflicts found
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  "{debouncedQuery}" does not match any existing clients, cases, or opposing
                  parties.
                </p>
              </div>
            </div>
          )}

          {searched && hasConflicts && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                  ⚠ Conflict Detected — {hits!.length} hit{hits!.length !== 1 ? "s" : ""} found
                </p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                  Review each match carefully before proceeding with this engagement.
                </p>
              </div>
            </div>
          )}

          {/* Results Table */}
          {searched && hits !== undefined && hits.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Matched Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Case #
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {hits!.map((hit, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <Badge
                          className={`text-xs ${typeColors[hit.type] || "bg-gray-100 text-gray-700"}`}
                        >
                          {hit.type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-foreground">{hit.name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{hit.reason}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">
                        {hit.caseNumber || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!searched && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <ShieldCheck className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Enter at least 2 characters to begin searching</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          {caseId && searched && !hasConflicts && (
            <Button onClick={handleMarkCleared} disabled={isMarking} className="gap-2">
              {isMarking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Mark Conflict-Cleared for Case
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
