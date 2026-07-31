import React, { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Search, ShieldAlert, CheckCircle2, User, FileText, AlertTriangle, Download, XCircle, Clock } from "lucide-react";
import { FadeInUp } from "@/components/ui/animations.tsx";
import { toast } from "sonner";

export default function AdminConflictChecker() {
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null);

  // Fetch all potential conflict sources
  const clients = useQuery(api.clients.listClients, {}) || [];
  const cases = useQuery(api.cases.listCases, {}) || [];
  
  // Conflict checks backend
  const logSearch = useMutation(api.conflictChecks.logSearch);
  const updateStatus = useMutation(api.conflictChecks.updateStatus);
  const recentChecks = useQuery(api.conflictChecks.listRecentChecks, {}) || [];
  
  const [results, setResults] = useState<{
    type: string;
    name: string;
    context: string;
    match: string;
  }[]>([]);

  const reportRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    setActiveCheckId(null);
    
    // Simulate complex DB search across multiple tables
    const q = searchQuery.toLowerCase();
    const hits: any[] = [];

    // Check clients
    for (const client of clients) {
      if (client.fullName.toLowerCase().includes(q) || (client.companyName && client.companyName.toLowerCase().includes(q))) {
        hits.push({
          type: "Client",
          name: client.fullName,
          context: client.type === 'corporate' ? `Corporate Client: ${client.companyName}` : "Individual Client",
          match: "Name/Company match",
        });
      }
    }

    // Check cases (Opposing Counsel, Parties)
    for (const c of cases) {
      if (c.opposingCounsel && c.opposingCounsel.toLowerCase().includes(q)) {
        hits.push({
          type: "Opposing Counsel",
          name: c.opposingCounsel,
          context: `Case: ${c.title} (${c.caseNumber})`,
          match: "Opposing Counsel match",
        });
      }
      if (c.title.toLowerCase().includes(q)) {
          hits.push({
          type: "Case Party",
          name: c.title,
          context: `Case: ${c.caseNumber}`,
          match: "Case Title match",
        });
      }
    }

    setResults(hits);
    setIsSearching(false);

    // Log to backend
    try {
      const checkId = await logSearch({
        searchQuery: searchQuery,
        hitsCount: hits.length,
        runByName: "Admin User", // Will use identity if logged in
      });
      setActiveCheckId(checkId);
    } catch (error) {
      console.error("Failed to log search", error);
    }
  };

  const handleClear = async () => {
    if (!activeCheckId) return;
    try {
      await updateStatus({
        checkId: activeCheckId as any,
        status: "cleared",
        notes: "Manually reviewed and cleared by attorney.",
      });
      toast.success("Conflict check cleared successfully.");
    } catch (e) {
      toast.error("Failed to clear conflict check.");
    }
  };

  const handleReject = async () => {
    if (!activeCheckId) return;
    try {
      await updateStatus({
        checkId: activeCheckId as any,
        status: "conflict",
        notes: "Marked as a conflict.",
      });
      toast.error("Matter flagged as a conflict. Do not proceed.");
    } catch (e) {
      toast.error("Failed to update check.");
    }
  };

  const handleDownloadReport = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-8" ref={reportRef}>
      <div className="print:hidden">
        <h1 className="font-serif text-3xl font-bold text-foreground">Conflict Checker</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Search across all clients, opposing counsels, and cases to ensure no conflict of interest before accepting a new matter.
        </p>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold text-black">Conflict Clearance Report</h1>
        <p className="text-sm text-gray-600">Generated on {new Date().toLocaleString()}</p>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div><strong>Search Query:</strong> {searchQuery}</div>
          <div><strong>Hits Found:</strong> {results.length}</div>
          <div><strong>Run By:</strong> Authorized Personnel</div>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm print:hidden">
        <CardHeader className="bg-secondary/20 border-b pb-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-accent" />
            <div>
              <CardTitle className="text-lg">Run Global Search</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Search by Person Name, Company Name, or Opposing Counsel..." 
                className="pl-10 h-12 text-lg"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isSearching} className="h-12 px-8 bg-accent hover:bg-accent/90">
              {isSearching ? "Searching..." : "Check Conflicts"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {hasSearched && !isSearching && (
        <FadeInUp>
          <div className="space-y-6 mt-8 print:mt-0">
            <h2 className="font-semibold text-lg flex items-center gap-2 text-foreground print:text-black">
              Search Results for <span className="text-accent print:text-black italic">"{searchQuery}"</span>
            </h2>
            
            {results.length === 0 ? (
              <div className="bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-900/50 rounded-xl p-8 flex flex-col items-center justify-center text-center print:border-black print:bg-white">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-4 print:text-black" />
                <h3 className="text-xl font-bold text-green-700 dark:text-green-400 mb-2 print:text-black">No Conflicts Found</h3>
                <p className="text-green-600/80 dark:text-green-400/80 print:text-black">
                  There are no records of this individual or entity in our database. It is safe to proceed.
                </p>
                <div className="mt-6 flex items-center gap-3 print:hidden">
                  <Button onClick={handleDownloadReport} className="bg-green-600 hover:bg-green-700">
                    <Download className="w-4 h-4 mr-2" /> Download Clearance Report
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-900/50 rounded-lg p-4 flex flex-col md:flex-row md:items-start justify-between gap-4 print:border-black print:bg-white">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0 print:text-black" />
                    <div>
                      <h4 className="font-bold text-red-700 dark:text-red-400 print:text-black">Potential Conflicts Detected</h4>
                      <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1 print:text-black">
                        We found {results.length} record(s) matching your search. Please review the details below.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 print:hidden">
                    <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={handleReject}>
                      <XCircle className="w-4 h-4 mr-2" /> Mark as Conflict
                    </Button>
                    <Button onClick={handleClear} className="bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Clear Conflict
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {results.map((res, i) => (
                    <Card key={i} className="border-red-200 dark:border-red-900/50 shadow-sm overflow-hidden print:border-gray-300 print:shadow-none">
                      <div className="flex">
                        <div className="w-2 bg-red-500 shrink-0 print:bg-black" />
                        <div className="p-4 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-secondary print:bg-gray-200 flex items-center justify-center shrink-0">
                              {res.type === "Client" ? <User className="w-5 h-5 text-muted-foreground print:text-black" /> : <FileText className="w-5 h-5 text-muted-foreground print:text-black" />}
                            </div>
                            <div>
                              <p className="font-bold text-lg text-foreground print:text-black">{res.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-semibold uppercase bg-secondary print:border print:border-black print:bg-white px-2 py-0.5 rounded text-foreground print:text-black">{res.type}</span>
                                <span className="text-sm text-muted-foreground print:text-gray-700">{res.context}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground print:text-gray-700 italic">Match via: {res.match}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                
                {/* Print action for conflicted results */}
                <div className="pt-4 print:hidden">
                   <Button variant="outline" onClick={handleDownloadReport}>
                    <Download className="w-4 h-4 mr-2" /> Download Report
                  </Button>
                </div>
              </div>
            )}
          </div>
        </FadeInUp>
      )}

      {/* Recent Checks Audit Log */}
      <div className="mt-12 print:hidden">
        <h3 className="text-xl font-bold font-serif mb-4 flex items-center gap-2 text-foreground">
          <Clock className="w-5 h-5 text-accent" /> Recent Check History
        </h3>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Date & Time</th>
                  <th className="px-6 py-4 font-medium">Search Query</th>
                  <th className="px-6 py-4 font-medium">Hits</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Run By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentChecks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No conflict checks have been run yet.
                    </td>
                  </tr>
                ) : (
                  recentChecks.map((check: any) => (
                    <tr key={check._id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {new Date(check.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        "{check.searchQuery}"
                      </td>
                      <td className="px-6 py-4">
                        {check.hitsCount}
                      </td>
                      <td className="px-6 py-4">
                        {check.status === "cleared" && <span className="text-xs font-semibold text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3"/> Cleared</span>}
                        {check.status === "conflict" && <span className="text-xs font-semibold text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded-full flex items-center gap-1 w-max"><XCircle className="w-3 h-3"/> Conflict</span>}
                        {check.status === "pending" && <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-1 rounded-full flex items-center gap-1 w-max"><AlertTriangle className="w-3 h-3"/> Pending</span>}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {check.runByName}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

    </div>
  );
}
