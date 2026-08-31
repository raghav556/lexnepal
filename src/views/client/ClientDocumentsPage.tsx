"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Download, Upload, Loader2, Eye, Filter, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input.tsx";
import { useMyClient } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useDocuments, useUploadDocument, useDownloadDocument } from "@/client/queries/documents";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  DashboardButton,
  DashboardFilterBar,
  DashboardListRow,
  DashboardListSkeleton,
  DashboardSection,
  DashboardStatusLabel,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { DASHBOARD_METRIC_TONES } from "@/lib/dashboard-semantics";

const DOC_TYPES = [
  "pleading",
  "evidence",
  "contract",
  "affidavit",
  "correspondence",
  "other",
] as const;

function DownloadButton({ documentId }: { documentId: string }) {
  const downloadDocument = useDownloadDocument();
  const [busy, setBusy] = useState(false);
  return (
    <DashboardButton
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0"
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
      title="Download file"
    >
      {busy ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
    </DashboardButton>
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
      <div className="flex-1 flex items-center justify-center text-sm text-dashboard-neutral gap-2 min-h-[240px]">
        <Loader2 className="w-4 h-4 animate-spin text-dashboard-primary" /> Loading preview…
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-dashboard-neutral p-6 text-center min-h-[240px]">
        Preview unavailable for this file.
      </div>
    );
  }
  if (mimeType.startsWith("image/")) {
    return (
      <div className="flex-1 overflow-auto p-2">
        <img
          src={url}
          alt={title}
          className="max-w-full mx-auto rounded-lg border border-dashboard-border"
        />
      </div>
    );
  }
  if (mimeType === "application/pdf" || title.toLowerCase().endsWith(".pdf")) {
    return (
      <iframe
        title={title}
        src={url}
        className="flex-1 w-full min-h-[360px] rounded-lg border border-dashboard-border bg-dashboard-panel"
      />
    );
  }
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center min-h-[240px]">
      <FileText className="w-10 h-10 text-dashboard-neutral" />
      <p className="text-sm text-dashboard-neutral">Preview not supported for this file type.</p>
      <DashboardButton asChild variant="outline" size="sm">
        <a href={url} target="_blank" rel="noreferrer">
          Open file
        </a>
      </DashboardButton>
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
      if (active) setUploadCaseId(active._id);
    }
  }, [cases, uploadCaseId]);

  const queryArgs = useMemo(() => {
    if (filterCaseId !== "all") return { caseId: filterCaseId };
    return {};
  }, [filterCaseId]);

  const docs = useDocuments(queryArgs) || [];

  const filteredDocs = useMemo(() => {
    return docs.filter((doc: any) => {
      if (filterType !== "all" && doc.type !== filterType) return false;
      if (sourceFilter === "mine" && doc.uploaderId !== currentUser?._id) return false;
      if (sourceFilter === "firm" && doc.uploaderId === currentUser?._id) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = (doc.title || "").toLowerCase().includes(q);
        const matchesType = (doc.type || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesType) return false;
      }
      return true;
    });
  }, [docs, filterType, sourceFilter, search, currentUser?._id]);

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, prevPage } = usePagination({
    items: filteredDocs,
    itemsPerPage: 8,
  });

  const handleOpenPreview = async (doc: any) => {
    setPreviewDoc(doc);
    setPreviewUrl(null);
    try {
      const url = await downloadDocument(doc._id);
      setPreviewUrl(url ? String(url) : "");
    } catch {
      toast.error("Failed to load document preview.");
      setPreviewUrl("");
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!uploadCaseId) {
      toast.error("Please select a case for this document.");
      return;
    }
    setIsUploading(true);
    let successCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await uploadDocument({
          file,
          title: file.name,
          type: uploadType,
          caseId: uploadCaseId,
        });
        successCount++;
      }
      toast.success(
        successCount === 1
          ? "Document uploaded securely."
          : `${successCount} documents uploaded securely.`,
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (currentUser === undefined || clientRecord === undefined) {
    return (
      <PortalPageShell
        portal="client"
        loading
        loadingLabel="Loading your documents…"
        title="Documents"
      >
        <div />
      </PortalPageShell>
    );
  }

  if (clientRecord === null) {
    return (
      <PortalPageShell
        portal="client"
        decorated
        showTodayDate
        eyebrow="Vault & Filings"
        title="Documents"
        description="Access and upload court pleadings, evidence, and filings."
        icon={FileText}
      >
        <EmptyState
          title="No client profile linked"
          description="Your account is not linked to a client profile yet. Contact the firm to access your document vault."
          icon={FileText}
        />
      </PortalPageShell>
    );
  }

  const pendingSigs = docs.filter(
    (d: any) => d.requiresSignature && d.signatureStatus === "pending",
  ).length;
  const myUploads = docs.filter((d: any) => d.uploaderId === currentUser?._id).length;

  const metrics = [
    {
      label: "Total Documents",
      value: String(docs.length),
      icon: FileText,
      tone: DASHBOARD_METRIC_TONES.documents,
      helperText: "Matter files on record",
    },
    {
      label: "Awaiting Signature",
      value: String(pendingSigs),
      tone: pendingSigs > 0 ? ("warning" as const) : ("success" as const),
      helperText: "Digital signature queue",
    },
    {
      label: "Uploaded by You",
      value: String(myUploads),
      tone: "information" as const,
      helperText: "Client submissions",
    },
    {
      label: "Shared by Firm",
      value: String(docs.length - myUploads),
      tone: "neutral" as const,
      helperText: "Pleadings & orders",
    },
  ];

  return (
    <PortalPageShell
      portal="client"
      decorated
      showTodayDate
      eyebrow="Vault & Filings"
      title="Documents"
      description="Access court filings, evidence, and documents shared between you and your legal team."
      icon={FileText}
      metrics={metrics}
    >
      <DashboardSection
        title="Upload Document"
        description="Share evidence, IDs, or forms directly with your assigned lawyer"
        icon={Upload}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Matter</label>
              <Select value={uploadCaseId} onValueChange={setUploadCaseId}>
                <SelectTrigger className="w-full bg-dashboard-panel h-9 text-xs">
                  <SelectValue placeholder="Select a matter…" />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c: any) => (
                    <SelectItem key={c._id} value={c._id}>
                      [{c.caseNumber}] {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Document Type</label>
              <Select
                value={uploadType}
                onValueChange={(val) => setUploadType(val as (typeof DOC_TYPES)[number])}
              >
                <SelectTrigger className="w-full bg-dashboard-panel h-9 text-xs capitalize">
                  <SelectValue placeholder="Document category" />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
              dragOver
                ? "border-dashboard-primary bg-dashboard-primary-soft"
                : "border-dashboard-border bg-dashboard-panel hover:border-dashboard-primary/50"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div className="flex flex-col items-center gap-2">
              {isUploading ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin text-dashboard-primary" />
                  <p className="text-sm font-semibold text-foreground">Uploading files securely…</p>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-dashboard-primary-soft flex items-center justify-center text-dashboard-primary">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Drop files here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOCX, JPG, PNG up to 25MB (Encrypted storage)
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </DashboardSection>

      <DashboardSection
        title="Document Library"
        description={`Showing ${filteredDocs.length} document${filteredDocs.length === 1 ? "" : "s"}`}
        icon={FileText}
      >
        <div className="space-y-4">
          <DashboardFilterBar className="justify-between">
            <div className="relative w-full sm:max-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 bg-dashboard-panel h-9 text-xs"
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterCaseId} onValueChange={setFilterCaseId}>
                <SelectTrigger className="w-[180px] bg-dashboard-panel h-9 text-xs">
                  <SelectValue placeholder="All Matters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Matters</SelectItem>
                  {cases.map((c: any) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px] bg-dashboard-panel h-9 text-xs capitalize">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex bg-dashboard-neutral-soft p-1 rounded-lg border border-dashboard-border">
                {(["all", "firm", "mine"] as const).map((source) => (
                  <button
                    key={source}
                    onClick={() => setSourceFilter(source)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      sourceFilter === source
                        ? "bg-dashboard-panel text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {source === "all" ? "All" : source === "firm" ? "Firm" : "My Uploads"}
                  </button>
                ))}
              </div>
            </div>
          </DashboardFilterBar>

          {docs === undefined ? (
            <DashboardListSkeleton rows={4} />
          ) : filteredDocs.length === 0 ? (
            <EmptyState
              title="No documents found"
              description="No documents match the selected filters."
              icon={FileText}
            />
          ) : (
            <div className="space-y-4">
              <DashboardTable>
                <DashboardTableHead>
                  <DashboardTableRow>
                    <DashboardTableHeaderCell>Document Title</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Matter</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Category</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Source</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className="text-right">
                      Actions
                    </DashboardTableHeaderCell>
                  </DashboardTableRow>
                </DashboardTableHead>
                <DashboardTableBody>
                  {paginatedItems.map((doc: any) => {
                    const matchedCase = cases.find((c: any) => c._id === doc.caseId);
                    const isMine = doc.uploaderId === currentUser?._id;
                    return (
                      <DashboardTableRow key={doc._id} striped>
                        <DashboardTableCell>
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-dashboard-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground text-xs truncate max-w-[240px]">
                                {doc.title}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {doc.mimeType || "File"}
                              </p>
                            </div>
                          </div>
                        </DashboardTableCell>
                        <DashboardTableCell className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {matchedCase ? matchedCase.title : "General"}
                        </DashboardTableCell>
                        <DashboardTableCell>
                          <DashboardStatusLabel
                            status={doc.type}
                            className="text-[10px] uppercase"
                          />
                        </DashboardTableCell>
                        <DashboardTableCell>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isMine
                                ? "bg-dashboard-primary-soft text-dashboard-primary"
                                : "bg-dashboard-neutral-soft text-dashboard-neutral"
                            }`}
                          >
                            {isMine ? "You" : "Legal Team"}
                          </span>
                        </DashboardTableCell>
                        <DashboardTableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <DashboardButton
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleOpenPreview(doc)}
                              title="Preview document"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </DashboardButton>
                            <DownloadButton documentId={doc._id} />
                          </div>
                        </DashboardTableCell>
                      </DashboardTableRow>
                    );
                  })}
                </DashboardTableBody>
              </DashboardTable>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                onNextPage={nextPage}
                onPrevPage={prevPage}
              />
            </div>
          )}
        </div>
      </DashboardSection>

      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="truncate pr-6 text-base font-serif">
              {previewDoc?.title || "Document preview"}
            </DialogTitle>
          </DialogHeader>
          {previewDoc ? (
            <DocPreviewBody
              url={previewUrl}
              mimeType={previewDoc.mimeType || ""}
              title={previewDoc.title || "document"}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
