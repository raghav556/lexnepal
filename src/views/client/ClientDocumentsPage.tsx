import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { FileText, Download, Upload, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import { useMyClient } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useDocuments, useUploadDocument, useDownloadDocument } from "@/client/queries/documents";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";

const TYPE_COLORS: Record<string, string> = {
  pleading: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  evidence: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  contract: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  affidavit: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  correspondence: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

function DownloadButton({ documentId }: { documentId: string }) {
  const downloadDocument = useDownloadDocument();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const url = await downloadDocument(documentId);
          if (url) window.open(String(url), "_blank");
        } catch (err: any) {
          toast.error(err?.message || "Download failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
    </Button>
  );
}

export default function ClientDocumentsPage() {
  const currentUser = useCurrentUser();
  const clientRecord = useMyClient();
  const clientId = clientRecord?._id;
  const cases = useCases(clientId ? { clientId } : {}) || [];
  const allDocs = useDocuments({}) || [];
  const uploadDocument = useUploadDocument();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const caseIds = new Set(cases.map((c: any) => c._id));
  const clientDocs = allDocs.filter((d: any) => d.caseId && caseIds.has(d.caseId));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Files cannot exceed 50 MB.");
      return;
    }
    const activeCase = cases.find((c: any) => c.status === "active") || cases[0];
    if (!activeCase) {
      toast.error("You do not have any active cases to upload documents to.");
      return;
    }

    setIsUploading(true);
    try {
      await uploadDocument({
        file,
        caseId: activeCase._id,
        title: file.name,
        type: "other",
        isPrivileged: false,
      });
      toast.success("Document uploaded and quarantined for security scanning.");
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
          {isUploading ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-1" />
          )}
          Upload File
        </Button>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.tif,.tiff,.txt"
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
                Documents shared by your legal team will appear here. You can also upload files
                directly.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          clientDocs.map((doc: any) => {
            const matchedCase = cases.find((c: any) => c._id === doc.caseId);
            return (
              <Card key={doc._id}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {doc.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {matchedCase?.title || "Case"} · {doc.mimeType}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={TYPE_COLORS[doc.type] || TYPE_COLORS.other}>{doc.type}</Badge>
                    <DownloadButton documentId={doc._id} />
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {currentUser?.name ? `Visible to ${currentUser.name}` : "Client document"}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
