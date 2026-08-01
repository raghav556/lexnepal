import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog.tsx";
import { Badge } from "@/components/ui/badge.tsx";

const DOC_TYPES = ["pleading", "affidavit", "contract", "poa", "correspondence", "evidence", "template", "court_filing", "notice", "memo", "other"];

interface AdvancedSearchProps {
  cases: any[];
  onSearch: (filters: { query: string; caseId?: string; type?: string; tag?: string }) => void;
}

export function AdvancedSearch({ cases, onSearch }: AdvancedSearchProps) {
  const [query, setQuery] = useState("");
  const [caseId, setCaseId] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [tag, setTag] = useState<string>("");

  const handleSearch = () => {
    onSearch({
      query: query.trim(),
      caseId: caseId === "all" ? undefined : caseId,
      type: type === "all" ? undefined : type,
      tag: tag.trim() || undefined
    });
  };

  const handleClear = () => {
    setQuery("");
    setCaseId("all");
    setType("all");
    setTag("");
    onSearch({ query: "" });
  };

  const activeFiltersCount = (caseId !== "all" ? 1 : 0) + (type !== "all" ? 1 : 0) + (tag ? 1 : 0);

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full max-w-2xl">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search documents by content or title..." 
          className="pl-9 pr-4 bg-background"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // Optional: debounced search could go here
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2 shrink-0">
            <Filter className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 min-w-[20px] h-5">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Advanced Search</DialogTitle>
          </DialogHeader>
            
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Case</label>
                <Select value={caseId} onValueChange={setCaseId}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Case</SelectItem>
                    <SelectItem value="general">Firm General</SelectItem>
                    {cases.map((c) => (
                      <SelectItem key={c._id} value={c._id}>{c.caseNumber} - {c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Document Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-8 capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Type</SelectItem>
                    {DOC_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Tag</label>
                <Input 
                  placeholder="e.g. urgent, draft" 
                  className="h-8" 
                  value={tag} 
                  onChange={(e) => setTag(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-2 mt-4">
              <Button variant="ghost" className="h-8 text-xs" onClick={handleClear}>Clear</Button>
              <Button className="h-8 text-xs" onClick={handleSearch}>Apply Filters</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button onClick={handleSearch} className="shrink-0">Search</Button>
    </div>
  );
}
