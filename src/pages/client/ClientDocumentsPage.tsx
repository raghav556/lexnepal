import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { FileText, Download, Upload, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";

const TYPE_COLORS: Record<string, string> = {
  pleading:       "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  evidence:       "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  contract:       "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  affidavit:      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  correspondence: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  other:          "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

function DownloadButton({ storageId }: { storageId: string }) {
  const url = useQuery(api.documents.getFileUrl, { storageId });
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      disabled={!url}
      onClick={() => {
        if (url) window.open(url, "_blank");
      }}
    >
      <Download className="w-4 h-4" />
    </Button>
  );
}

export default function ClientDocumentsPage() {
  const currentUser = useCurrentUser();
  const cases = useQuery(api.cases.listCases, currentUser ? { clientId: currentUser._id as any } : "skip" as any) || [];
  const allDocs = useQuery(api.documents.listDocuments, {}) || [];
  
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.createDocument);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (currentUser === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const clientCaseIds = new Set(cases.map((c: any) => c._id));
  const clientDocs = allDocs.filter((doc: any) => doc.caseId && clientCaseIds.has(doc.caseId) && !doc.isPrivileged);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Default to the first active case for client uploads (in a real app, they'd pick the case first)
    const activeCase = cases.find((c: any) => c.status === "active") || cases[0];
    if (!activeCase) {
      toast.error("You do not have any active cases to upload documents to.");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Get upload URL from Convex
      const postUrl = await generateUploadUrl();
      
      // 2. Post file to Convex Storage (with local mock fallback)
      let storageId = "";
      if (postUrl === "mock-upload-url") {
        storageId = URL.createObjectURL(file); // Mock: store local object URL
      } else {
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!result.ok) throw new Error(`Upload failed: ${result.statusText}`);
        const json = await result.json();
        storageId = json.storageId;
      }

      // 3. Save document metadata to database
      await createDocument({
        caseId: activeCase._id,
        title: file.name,
        type: "other",
        storageId,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        tags: [],
        isTemplate: false,
        isPrivileged: false, // Clients upload non-privileged docs by definition
      });

      toast.success("Document uploaded successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 font-sans">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">My Documents</h1>
        <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          {isUploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
          Upload File
        </Button>
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange}
        />
      </div>

      <div className="space-y-3">
        {clientDocs.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No Documents Yet</EmptyTitle>
              <EmptyDescription>
                Documents shared by your legal team will appear here. You can also upload files directly.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          clientDocs.map((doc: any) => {
            const matchedCase = cases.find((c: any) => c._id === doc.caseId);
            const sizeStr = (doc.sizeBytes / (1024 * 1024)).toFixed(2) + " MB";
            const dateStr = new Date(doc._creationTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            
            return (
              <Card key={doc._id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant="secondary" className={`text-[10px] uppercase font-semibold ${TYPE_COLORS[doc.type] || TYPE_COLORS.other}`}>
                        {doc.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{matchedCase?.caseNumber || "General"}</span>
                      {doc.version > 1 && <span className="text-xs text-muted-foreground">v{doc.version}</span>}
                      <span className="text-xs text-muted-foreground">{sizeStr}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Uploaded {dateStr}</p>
                  </div>
                  <DownloadButton storageId={doc.storageId} />
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
