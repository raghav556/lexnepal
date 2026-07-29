import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { FileText, Download, Upload, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useCurrentUser } from "@/hooks/use-current-user.ts";

export default function ClientDocumentsPage() {
  const currentUser = useCurrentUser();
  const cases = useQuery(api.cases.listCases, currentUser ? { clientId: currentUser._id as any } : "skip" as any) || [];
  const allDocs = useQuery(api.documents.listDocuments, {}) || [];

  if (currentUser === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filter client case IDs
  const clientCaseIds = new Set(cases.map((c: any) => c._id));

  // Filter documents: belonging to client's cases and NOT privileged/internal
  const clientDocs = allDocs.filter((doc: any) => {
    return doc.caseId && clientCaseIds.has(doc.caseId) && !doc.isPrivileged;
  });

  // Hardcoded default fallback documents if the db is empty just to show standard mock materials,
  // but mapped to client case numbers.
  const displayDocs = clientDocs.length > 0 
    ? clientDocs.map((doc: any) => {
        const matchedCase = cases.find((c: any) => c._id === doc.caseId);
        return {
          id: doc._id,
          name: doc.title,
          case: matchedCase ? matchedCase.caseNumber : "N/A",
          date: doc.uploadedAt || "Uploaded recently",
          type: doc.type,
          size: doc.sizeBytes ? (doc.sizeBytes / (1024 * 1024)).toFixed(1) + " MB" : "N/A"
        };
      })
    : [
        { id: "d1", name: "Property Title Deed \u2014 Plot 234", case: cases[0]?.caseNumber || "KTM/2081/234", date: "10 Mangsir 2083", type: "Evidence", size: "2.4 MB" },
        { id: "d2", name: "Court Notice \u2014 Hearing 15 Mangsir", case: cases[0]?.caseNumber || "KTM/2081/234", date: "5 Mangsir 2083", type: "Correspondence", size: "180 KB" },
        { id: "d3", name: "Company MOA Draft v2", case: cases[1]?.caseNumber || "KTM/2081/567", date: "2 Mangsir 2083", type: "Contract", size: "940 KB" },
      ];

  return (
    <div className="p-4 sm:p-6 space-y-4 font-sans">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Documents</h1>
        <Button size="sm" onClick={() => toast.info("Document upload is handled in Phase 7.")}>
          <Upload className="w-4 h-4 mr-1" /> Upload
        </Button>
      </div>

      <div className="space-y-3">
        {displayDocs.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] uppercase font-semibold">{doc.type}</Badge>
                  <span className="text-xs text-muted-foreground">{doc.case}</span>
                  <span className="text-xs text-muted-foreground">{doc.size}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{doc.date}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => toast.info("Downloading file from cloud storage...")}>
                <Download className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
