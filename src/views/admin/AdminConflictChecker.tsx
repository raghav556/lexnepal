import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Search,
  ShieldAlert,
  CheckCircle2,
  User,
  FileText,
  AlertTriangle,
  Download,
  XCircle,
  Clock,
} from "lucide-react";
import { FadeInUp } from "@/components/ui/animations.tsx";
import { toast } from "sonner";
import { useConflictCommands, useRecentConflictChecks } from "@/client/queries/cases";

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
      <AlertTriangle className="w-3 h-3" /> Pending
    </span>
  );
}

export default function AdminConflictChecker() {
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null);

  const conflictCommands = useConflictCommands();
  const recentChecks = useRecentConflictChecks() || [];

  const [results, setResults] = useState<
    {
      type: string;
      name: string;
      context: string;
      match: string;
    }[]
  >([]);

  const reportRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setActiveCheckId(null);

    try {
      const outcome = await conflictCommands.search(searchQuery.trim());
      setResults(
        outcome.hits.map((hit) => ({
          type: hit.type,
          name: hit.name,
          context: hit.caseNumber ? `Case: ${hit.caseNumber}` : hit.reason,
          match: hit.reason,
        })),
      );
      setActiveCheckId(outcome.checkId);
    } catch (error) {
      toast.error("Conflict search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = async () => {
    if (!activeCheckId) return;
    try {
      await conflictCommands.updateStatus(
        activeCheckId,
        "cleared",
        "Manually reviewed and cleared by attorney.",
      );
      toast.success("Conflict check cleared successfully.");
    } catch {
      toast.error("Failed to clear conflict check.");
    }
  };

  const handleReject = async () => {
    if (!activeCheckId) return;
    try {
      await conflictCommands.updateStatus(activeCheckId, "conflict", "Marked as a conflict.");
      toast.error("Matter flagged as a conflict. Do not proceed.");
    } catch {
      toast.error("Failed to update check.");
    }
  };

  const handleDownloadReport = () => {
    window.print();
  };

  return (
    <div
      className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 sm:space-y-8 w-full min-w-0"
      ref={reportRef}
    >
      <div className="print:hidden min-w-0">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
          Conflict Checker
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Search clients, opposing counsel, and cases before accepting a new matter.
        </p>
      </div>

      <div className="hidden print:block mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold text-black">Conflict Clearance Report</h1>
        <p className="text-sm text-gray-600">Generated on {new Date().toLocaleString()}</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Search Query:</strong> {searchQuery}
          </div>
          <div>
            <strong>Hits Found:</strong> {results.length}
          </div>
          <div>
            <strong>Run By:</strong> Authorized Personnel
          </div>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm print:hidden min-w-0 overflow-hidden">
        <CardHeader className="bg-secondary/20 border-b pb-4 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldAlert className="w-6 h-6 text-accent shrink-0" />
            <CardTitle className="text-base sm:text-lg">Run Global Search</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1 min-w-0 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Name, company, or counsel…"
                title="Search by person name, company name, or opposing counsel"
                className="pl-9 sm:pl-10 h-11 sm:h-12 text-sm sm:text-base w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={isSearching}
              className="h-11 sm:h-12 px-6 sm:px-8 bg-accent hover:bg-accent/90 w-full sm:w-auto shrink-0"
            >
              {isSearching ? "Searching..." : "Check Conflicts"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {hasSearched && !isSearching && (
        <FadeInUp>
          <div className="space-y-6 mt-2 sm:mt-4 print:mt-0 min-w-0">
            <h2 className="font-semibold text-base sm:text-lg flex flex-wrap items-baseline gap-x-2 gap-y-1 text-foreground print:text-black min-w-0">
              <span>Search Results for</span>
              <span className="text-accent print:text-black italic break-all">"{searchQuery}"</span>
            </h2>

            {results.length === 0 ? (
              <div className="bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-900/50 rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center print:border-black print:bg-white">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-4 print:text-black" />
                <h3 className="text-lg sm:text-xl font-bold text-green-700 dark:text-green-400 mb-2 print:text-black">
                  No Conflicts Found
                </h3>
                <p className="text-sm sm:text-base text-green-600/80 dark:text-green-400/80 print:text-black">
                  There are no records of this individual or entity in our database. It is safe to
                  proceed.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 print:hidden w-full sm:w-auto">
                  <Button
                    onClick={handleDownloadReport}
                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download Clearance Report
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 min-w-0">
                <div className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-900/50 rounded-lg p-4 flex flex-col md:flex-row md:items-start justify-between gap-4 print:border-black print:bg-white">
                  <div className="flex items-start gap-3 min-w-0">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0 print:text-black" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-red-700 dark:text-red-400 print:text-black">
                        Potential Conflicts Detected
                      </h4>
                      <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1 print:text-black">
                        We found {results.length} record(s) matching your search. Please review the
                        details below.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 print:hidden">
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 w-full sm:w-auto"
                      onClick={handleReject}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Mark as Conflict
                    </Button>
                    <Button
                      onClick={handleClear}
                      className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Clear Conflict
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {results.map((res, i) => (
                    <Card
                      key={i}
                      className="border-red-200 dark:border-red-900/50 shadow-sm overflow-hidden print:border-gray-300 print:shadow-none min-w-0"
                    >
                      <div className="flex min-w-0">
                        <div className="w-2 bg-red-500 shrink-0 print:bg-black" />
                        <div className="p-4 flex-1 min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-secondary print:bg-gray-200 flex items-center justify-center shrink-0">
                              {res.type === "Client" ? (
                                <User className="w-5 h-5 text-muted-foreground print:text-black" />
                              ) : (
                                <FileText className="w-5 h-5 text-muted-foreground print:text-black" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-base sm:text-lg text-foreground print:text-black break-words">
                                {res.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-xs font-semibold uppercase bg-secondary print:border print:border-black print:bg-white px-2 py-0.5 rounded text-foreground print:text-black">
                                  {res.type}
                                </span>
                                <span className="text-sm text-muted-foreground print:text-gray-700 break-words">
                                  {res.context}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground print:text-gray-700 italic md:text-right shrink-0">
                            Match via: {res.match}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="pt-2 print:hidden">
                  <Button
                    variant="outline"
                    onClick={handleDownloadReport}
                    className="w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download Report
                  </Button>
                </div>
              </div>
            )}
          </div>
        </FadeInUp>
      )}

      {/* Recent Checks — cards on mobile, table on md+ */}
      <div className="mt-8 sm:mt-12 print:hidden min-w-0">
        <h3 className="text-lg sm:text-xl font-bold font-serif mb-4 flex items-center gap-2 text-foreground">
          <Clock className="w-5 h-5 text-accent shrink-0" /> Recent Check History
        </h3>

        {recentChecks.length === 0 ? (
          <Card className="min-w-0">
            <CardContent className="py-8 px-4 text-center text-sm text-muted-foreground">
              No conflict checks have been run yet.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile: stacked cards (no horizontal scroll) */}
            <div className="md:hidden space-y-3">
              {recentChecks.map((check: any) => (
                <Card key={check._id} className="min-w-0 overflow-hidden">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-foreground break-words min-w-0">
                        "{check.searchQuery}"
                      </p>
                      <StatusBadge status={check.status} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{new Date(check.timestamp).toLocaleString()}</span>
                      <span>
                        {check.hitsCount} hit{check.hitsCount === 1 ? "" : "s"}
                      </span>
                      <span className="truncate">{check.runByName}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop: table */}
            <Card className="hidden md:block min-w-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[640px]">
                  <thead className="bg-muted/50 text-muted-foreground uppercase border-b border-border">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 font-medium">Date & Time</th>
                      <th className="px-4 lg:px-6 py-3 font-medium">Search Query</th>
                      <th className="px-4 lg:px-6 py-3 font-medium">Hits</th>
                      <th className="px-4 lg:px-6 py-3 font-medium">Status</th>
                      <th className="px-4 lg:px-6 py-3 font-medium">Run By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentChecks.map((check: any) => (
                      <tr key={check._id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 lg:px-6 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(check.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 lg:px-6 py-3 font-medium text-foreground max-w-xs truncate">
                          "{check.searchQuery}"
                        </td>
                        <td className="px-4 lg:px-6 py-3">{check.hitsCount}</td>
                        <td className="px-4 lg:px-6 py-3">
                          <StatusBadge status={check.status} />
                        </td>
                        <td className="px-4 lg:px-6 py-3 text-muted-foreground">
                          {check.runByName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
