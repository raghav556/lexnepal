import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShieldAlert, CheckCircle2, User, FileText, AlertTriangle } from "lucide-react";
import { FadeInUp } from "@/components/ui/animations";

export default function AdminConflictChecker() {
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch all potential conflict sources
  const clients = useQuery(api.clients.listClients, {}) || [];
  const cases = useQuery(api.cases.listCases, {}) || [];
  
  const [results, setResults] = useState<{
    type: string;
    name: string;
    context: string;
    match: string;
  }[]>([]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    
    // Simulate complex DB search across multiple tables
    setTimeout(() => {
      const q = searchQuery.toLowerCase();
      const hits = [];

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
    }, 800);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Conflict Checker</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Search across all clients, opposing counsels, and cases to ensure no conflict of interest before accepting a new matter.
        </p>
      </div>

      <Card className="border-border/50 shadow-sm">
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
          <div className="space-y-4 mt-8">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              Search Results for <span className="text-accent italic">"{searchQuery}"</span>
            </h2>
            
            {results.length === 0 ? (
              <div className="bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-900/50 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                <h3 className="text-xl font-bold text-green-700 dark:text-green-400 mb-2">No Conflicts Found</h3>
                <p className="text-green-600/80 dark:text-green-400/80">
                  There are no records of this individual or entity in our database. It is safe to proceed.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-900/50 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-red-700 dark:text-red-400">Potential Conflicts Detected</h4>
                    <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                      We found {results.length} record(s) matching your search. Please review the details below before accepting the matter.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {results.map((res, i) => (
                    <Card key={i} className="border-red-200 dark:border-red-900/50 shadow-sm overflow-hidden">
                      <div className="flex">
                        <div className="w-2 bg-red-500 shrink-0" />
                        <div className="p-4 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                              {res.type === "Client" ? <User className="w-5 h-5 text-muted-foreground" /> : <FileText className="w-5 h-5 text-muted-foreground" />}
                            </div>
                            <div>
                              <p className="font-bold text-lg">{res.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-semibold uppercase bg-secondary px-2 py-0.5 rounded">{res.type}</span>
                                <span className="text-sm text-muted-foreground">{res.context}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground italic">Match via: {res.match}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FadeInUp>
      )}
    </div>
  );
}
