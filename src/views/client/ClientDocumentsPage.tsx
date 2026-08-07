"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { FileText, Download, Upload, Loader2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import { Input } from "@/components/ui/input.tsx";
import { useMyClient } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useDocuments, useUploadDocument, useDownloadDocument } from "@/client/queries/documents";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

const DOC_TYPES = [
  "pleading",
  "evidence",
  "contract",
  "affidavit",
  "correspondence",
  "other",
] as const;

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
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Download failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
    </Button>
  );
}

function DocPreviewBody({
  url,
  mimeType,
  title,
}: {
  url: string | null;
  mimeType: string;
  title: string;
}) {
  if (url === null) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground gap-2 min-h-[240px]">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading preview…
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center min-h-[240px]">
        Preview unavailable for this file.
      </div>
    );
  }
  if (mimeType.startsWith("image/")) {
    return (
      <div className="flex-1 overflow-auto p-2">
        <img src={url} alt={title} className="max-w-full mx-auto rounded" />
      </div>
    );
  }
  if (mimeType === "application/pdf" || title.toLowerCase().endsWith(".pdf")) {
    return (
      <iframe
        title={title}
        src={url}
        className="flex-1 w-full min-h-[320px] rounded border bg-background"
      />
    );
  }
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center min-h-[240px]">
      <FileText className="w-10 h-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Preview not supported for this file type.</p>
      <Button asChild variant="outline" size="sm">
        <a href={url} target="_blank" rel="noreferrer">
          Open file
        </a>
      </Button>
    </div>
  );
}

export default function ClientDocumentsPage() {
  const currentUser = useCurrentUser();
  const clientRecord = useMyClient();
  const clientId = clientRecord?._id;
  const cases = useCases(clientId ? { clientId } : {}) || [];
  const searchParams = useSearchParams();
  const queryCaseId = searchParams.get("caseId") || "";

  const [filterCaseId, setFilterCaseId] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "firm" | "mine">("all");
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadCaseId, setUploadCaseId] = useState<string>("");
  const [uploadType, setUploadType] = useState<(typeof DOC_TYPES)[number]>("other");
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const uploadDocument = useUploadDocument();
  const downloadDocument = useDownloadDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (queryCaseId) setFilterCaseId(queryCaseId);
  }, [queryCaseId]);

  useEffect(() => {
    if (!uploadCaseId && cases.length > 0) {
      const active = cases.find((c: any) => c.status === "active") || cases[0];
      setUploadCaseId(active._id);
    }
  }, [cases, uploadCaseId]);

  const listFilters = useMemo(() => {
    if (filterCaseId && filterCaseId !== "all") return { caseId: filterCaseId };
    return {};
  }, [filterCaseId]);

  const allDocs = useDocuments(listFilters) || [];
  const myUserId = currentUser?._id || currentUser?.id;
  const clientDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allDocs.filter((d: any) => {
      if (filterType !== "all" && d.type !== filterType) return false;
      if (sourceFilter === "mine" && d.uploadedBy !== myUserId) return false;
      if (sourceFilter === "firm" && d.uploadedBy === myUserId) return false;
      if (q && !String(d.title || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allDocs, filterType, sourceFilter, search, myUserId]);

  useEffect(() => {
    if (!previewDoc) {
      setPreviewUrl(null);
      return;
    }
    setPreviewUrl(null);
    void downloadDocument(previewDoc._id)
      .then((url) => setPreviewUrl(url ? String(url) : ""))
      .catch(() => setPreviewUrl(""));
  }, [previewDoc?._id]);

  const uploadFile = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Files cannot exceed 50 MB.");
      return;
    }
    if (!uploadCaseId) {
      toast.error("Select a matter before uploading.");
      return;
    }

    setIsUploading(true);
    try {
      await uploadDocument({
        file,
        caseId: uploadCaseId,
        title: file.name,
        type: uploadType,
        isPrivileged: false,
        confidentialityLevel: "public",
      });
      toast.success("Document uploaded and quarantined for security scanning.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload document.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  if (clientRecord === null) {
    return (
      <div className="p-4 sm:p-6 text-sm text-muted-foreground">
        No client profile is linked to this account. Contact the firm to view documents.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold text-foreground">My Documents</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Select value={uploadCaseId} onValueChange={setUploadCaseId}>
            <SelectTrigger className="w-full sm:w-[200px] h-9">
              <SelectValue placeholder="Matter" />
            </SelectTrigger>
            <SelectContent>
              {cases.map((c: any) => (
                <SelectItem key={c._id} value={c._id}>
                  [{c.caseNumber}] {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={uploadType} onValueChange={(v) => setUploadType(v as (typeof DOC_TYPES)[number])}>
            <SelectTrigger className="w-full sm:w-[140px] h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading || !uploadCaseId}>
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-1" />
            )}
            Upload
          </Button>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.tif,.tiff,.txt"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title…"
          className="h-9 sm:max-w-xs"
        />
        <Select value={filterCaseId} onValueChange={setFilterCaseId}>
          <SelectTrigger className="w-full sm:w-[220px] h-9">
            <SelectValue placeholder="Filter matter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All matters</SelectItem>
            {cases.map((c: any) => (
              <SelectItem key={c._id} value={c._id}>
                [{c.caseNumber}] {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[160px] h-9">
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {DOC_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}>
          <SelectTrigger className="w-full sm:w-[160px] h-9">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="firm">From firm</SelectItem>
            <SelectItem value="mine">Uploaded by you</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        className={cn(
          "rounded-xl border border-dashed p-6 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border bg-secondary/10",
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void uploadFile(file);
        }}
      >
        <Upload className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          Drag and drop a file here, or use Upload above. Select a matter first.
        </p>
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
            const scan = doc.uploadStatus || doc.status;
            return (
              <Card key={doc._id}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="break-words">{doc.title}</span>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {matchedCase?.title || "Case"} · {doc.mimeType}
                      {scan ? ` · ${scan}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge className={TYPE_COLORS[doc.type] || TYPE_COLORS.other}>{doc.type}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(doc)} title="Preview">
                      <Eye className="w-4 h-4" />
                    </Button>
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

      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl w-[calc(100vw-1rem)] max-h-[90dvh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="break-words pr-6">{previewDoc?.title}</DialogTitle>
          </DialogHeader>
          <DocPreviewBody
            url={previewUrl}
            mimeType={previewDoc?.mimeType || ""}
            title={previewDoc?.title || ""}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
