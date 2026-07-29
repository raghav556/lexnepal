import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { FileText, Upload, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";

const DOCS = [
  { id: "1", name: "Sharma Appeal Petition", case: "KTM/2081/001", type: "pleading", version: 2, date: "28 Ashwin 2081", size: "340 KB", privileged: false },
  { id: "2", name: "Property Title Deed (Exhibit A)", case: "KTM/2081/001", type: "evidence", version: 1, date: "5 Ashwin 2081", size: "2.1 MB", privileged: false },
  { id: "3", name: "Client Retainer Agreement", case: "KTM/2081/001", type: "contract", version: 1, date: "1 Baisakh 2081", size: "180 KB", privileged: true },
  { id: "4", name: "TechVenture Trademark Certificate", case: "KTM/2081/002", type: "evidence", version: 1, date: "10 Kartik 2081", size: "890 KB", privileged: false },
  { id: "5", name: "MOA Draft v3", case: "KTM/2081/567", type: "contract", version: 3, date: "2 Mangsir 2081", size: "940 KB", privileged: false },
];

const TYPE_COLORS: Record<string, string> = {
  pleading: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  evidence: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  contract: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  affidavit: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  other: "bg-gray-100 text-gray-800",
};

export default function StaffDocumentsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Documents</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => toast.info("Document templates coming in milestone 5!")}>Templates</Button>
          <Button size="sm" onClick={() => toast.info("Document upload coming in milestone 5!")}><Upload className="w-4 h-4 mr-1" /> Upload</Button>
        </div>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search documents..." /></div>
        <Button variant="secondary" size="sm"><Filter className="w-4 h-4 mr-1" /> Filter</Button>
      </div>
      <div className="space-y-2">
        {DOCS.map((doc) => (
          <Card key={doc.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-accent" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                  {doc.privileged && <Badge className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 flex-shrink-0">Privileged</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`text-xs ${TYPE_COLORS[doc.type] ?? TYPE_COLORS.other}`}>{doc.type}</Badge>
                  <span className="text-xs text-muted-foreground font-mono">{doc.case}</span>
                  <span className="text-xs text-muted-foreground">v{doc.version}</span>
                  <span className="text-xs text-muted-foreground">{doc.size}</span>
                  <span className="text-xs text-muted-foreground">{doc.date}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => toast.info("Document viewer coming in milestone 5!")}>View</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
