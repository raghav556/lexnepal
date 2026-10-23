import { useCallback, useState } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Badge } from "@/components/ui/badge.tsx";

const DOC_TYPES = [
  "pleading",
  "affidavit",
  "contract",
  "poa",
  "correspondence",
  "evidence",
  "template",
  "court_filing",
  "notice",
  "memo",
  "other",
];

interface AdvancedSearchProps {
  cases: any[];
  onSearch: (filters: {
    query: string;
    caseId?: string;
    type?: string;
    tag?: string;
    generalOnly?: boolean;
  }) => void;
}

export function AdvancedSearch({ cases, onSearch }: AdvancedSearchProps) {
  const [query, setQuery] = useState("");
  const [caseId, setCaseId] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [tag, setTag] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const closeFilters = useCallback((nextOpen = false) => {
    setIsOpen(Boolean(nextOpen));
  }, []);

  const handleSearch = () => {
    onSearch({
      query: query.trim(),
      caseId: caseId === "all" || caseId === "general" ? undefined : caseId,
      generalOnly: caseId === "general" || undefined,
      type: type === "all" ? undefined : type,
      tag: tag.trim() || undefined,
    });
    setIsOpen(false);
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
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>

      <Button
        type="button"
        variant="outline"
        className="gap-2 shrink-0"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <Filter className="w-4 h-4" />
        Filters
        {activeFiltersCount > 0 && (
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 min-w-[20px] h-5">
            {activeFiltersCount}
          </Badge>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={closeFilters}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Advanced Search</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium text-slate-700"
                htmlFor="staff-docs-filter-case"
              >
                Case
              </label>
              <Select value={caseId} onValueChange={setCaseId}>
                <SelectTrigger id="staff-docs-filter-case" className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Case</SelectItem>
                  <SelectItem value="general">Firm General</SelectItem>
                  {cases.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.caseNumber} - {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label
                className="text-xs font-medium text-slate-700"
                htmlFor="staff-docs-filter-type"
              >
                Document Type
              </label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="staff-docs-filter-type" className="h-8 capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Type</SelectItem>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700" htmlFor="staff-docs-filter-tag">
                Tag
              </label>
              <Input
                id="staff-docs-filter-tag"
                placeholder="e.g. urgent, draft"
                className="h-8"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2 mt-4">
            <Button type="button" variant="ghost" className="h-8 text-xs" onClick={handleClear}>
              Clear
            </Button>
            <Button type="button" className="h-8 text-xs" onClick={handleSearch}>
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
