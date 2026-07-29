import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { FileText, Download, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";

const DOCS = [
  { name: "Property Title Deed \u2014 Plot 234", case: "KTM/2081/234", date: "10 Mangsir 2081", type: "Evidence", size: "2.4 MB" },
  { name: "Court Notice \u2014 Hearing 15 Mangsir", case: "KTM/2081/234", date: "5 Mangsir 2081", type: "Correspondence", size: "180 KB" },
  { name: "Company MOA Draft v2", case: "KTM/2081/567", date: "2 Mangsir 2081", type: "Contract", size: "940 KB" },
];

export default function ClientDocumentsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Documents</h1>
        <Button size="sm" onClick={() => toast.info("Document upload coming in the next milestone!")}
        ><Upload className="w-4 h-4 mr-1" /> Upload</Button>
      </div>
      <div className="space-y-3">
        {DOCS.map((doc) => (
          <Card key={doc.name}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-accent" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-xs">{doc.type}</Badge>
                  <span className="text-xs text-muted-foreground">{doc.case}</span>
                  <span className="text-xs text-muted-foreground">{doc.size}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{doc.date}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => toast.info("Download feature coming soon!")}><Download className="w-4 h-4" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
