"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Download,
  Eye,
  FileText,
  FolderOpen,
  Loader2,
  MessageSquare,
  Search,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useMyClient } from "@/client/queries/clients";
import { useClientCases } from "@/client/queries/cases";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useDocuments, useUploadDocument, useDownloadDocument } from "@/client/queries/documents";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import {
  DashboardButton,
  DashboardListSkeleton,
  DashboardStatusLabel,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { CASE_LIST_HERO_CLASS } from "@/shared/contracts/case-ui";
import type { ClientCaseDto, DocumentDto } from "@/shared/contracts/domains";
import { documentTypeLabel, MAX_DOCUMENT_BYTES } from "@/shared/contracts/documents";
import { relativeTime } from "@/lib/dashboard-format";
import { cn } from "@/lib/utils";

/**
 * Types a Client may choose when uploading.
 * Intentionally narrower than repository `documentTypeSchema` storage values.
 */
const CLIENT_UPLOAD_DOC_TYPES = [
  "pleading",
  "evidence",
  "contract",
  "affidavit",
  "correspondence",
  "other",
] as const;

type ClientUploadDocType = (typeof CLIENT_UPLOAD_DOC_TYPES)[number];
type SourceFilter = "all" | "firm" | "mine";

const MAX_DOCUMENT_MB = Math.round(MAX_DOCUMENT_BYTES / (1024 * 1024));
const UPLOAD_ACCEPT_HINT = `PDF, Word, Excel, PowerPoint, JPG, PNG, TIFF, TXT — up to ${MAX_DOCUMENT_MB} MB. Files are scanned before they are added to your matter.`;

function uploaderOf(doc: DocumentDto): string | undefined {
  const raw = doc.uploadedBy ?? (doc as { uploaderId?: string }).uploaderId;
  return typeof raw === "string" ? raw : undefined;
}

function matterOf(cases: ClientCaseDto[], caseId: string | undefined): ClientCaseDto | undefined {
  if (!caseId) return undefined;
  return cases.find((matter) => matter._id === caseId || matter.id === caseId);
}

function fileKindLabel(mimeType?: string | null, title?: string | null): string {
  const mime = (mimeType || "").toLowerCase();
  const name = (title || "").toLowerCase();
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "PDF";
  if (mime.includes("word") || name.endsWith(".doc") || name.endsWith(".docx")) return "DOC";
  if (mime.includes("sheet") || name.endsWith(".xls") || name.endsWith(".xlsx")) return "XLS";
  if (mime.includes("presentation") || name.endsWith(".ppt") || name.endsWith(".pptx"))
    return "PPT";
  if (mime.startsWith("image/") || /\.(jpe?g|png|tiff?)$/i.test(name)) return "IMG";
  if (mime.startsWith("text/") || name.endsWith(".txt")) return "TXT";
  return "FILE";
}

function documentDate(doc: DocumentDto): string {
  return relativeTime(doc.createdAt || doc.updatedAt || null) || "";
}

function DownloadButton({ documentId }: { documentId: string }) {
  const downloadDocument = useDownloadDocument();
  const [busy, setBusy] = useState(false);
  return (
    <DashboardButton
      variant="ghost"
      size="sm"
      className="client-documents-icon-btn"
      disabled={busy}
      aria-label="Download document"
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
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Download className="h-3.5 w-3.5" aria-hidden />
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
      <div className="client-documents-preview-state" role="status">
        <Loader2 className="h-4 w-4 animate-spin text-dashboard-primary" aria-hidden />
        Loading preview…
      </div>
    );
  }
  if (!url) {
    return (
      <div className="client-documents-preview-state" role="status">
        Preview unavailable for this file.
      </div>
    );
  }
  if (mimeType.startsWith("image/")) {
    return (
      <div className="client-documents-preview-media">
        <img src={url} alt={title} className="client-documents-preview-image" />
      </div>
    );
  }
  if (mimeType === "application/pdf" || title.toLowerCase().endsWith(".pdf")) {
    return <iframe title={title} src={url} className="client-documents-preview-frame" />;
  }
  return (
    <div className="client-documents-preview-fallback">
      <FileText className="h-10 w-10 text-dashboard-neutral" aria-hidden />
      <p>Preview is not available for this file type.</p>
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
  const cases = useClientCases(clientId ? { clientId } : {}) || [];
  const searchParams = useSearchParams();
  const queryCaseId = searchParams.get("caseId") || "";

  const [filterCaseId, setFilterCaseId] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCaseId, setUploadCaseId] = useState<string>("");
  const [uploadType, setUploadType] = useState<ClientUploadDocType>("other");
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "success" | "failure">(
    "idle",
  );
  const [previewDoc, setPreviewDoc] = useState<DocumentDto | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const uploadDocument = useUploadDocument();
  const downloadDocument = useDownloadDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (queryCaseId) setFilterCaseId(queryCaseId);
  }, [queryCaseId]);

  useEffect(() => {
    if (!uploadCaseId && cases.length > 0) {
      const active = cases.find((c) => c.status === "active") || cases[0];
      if (active) setUploadCaseId(active._id);
    }
  }, [cases, uploadCaseId]);

  const queryArgs = useMemo(() => {
    if (filterCaseId !== "all") return { caseId: filterCaseId };
    return {};
  }, [filterCaseId]);

  const docs = useDocuments(clientRecord ? queryArgs : "skip");
  const docsList = docs ?? [];

  const filteredDocs = useMemo(() => {
    return docsList.filter((doc) => {
      if (filterType !== "all" && doc.type !== filterType) return false;
      const uploader = uploaderOf(doc);
      if (sourceFilter === "mine" && uploader !== currentUser?._id) return false;
      if (sourceFilter === "firm" && uploader === currentUser?._id) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matter = matterOf(cases, doc.caseId);
        const haystack = [doc.title, doc.type, matter?.title, matter?.caseNumber]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [docsList, filterType, sourceFilter, search, currentUser?._id, cases]);

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, prevPage } = usePagination({
    items: filteredDocs,
    itemsPerPage: 8,
  });

  const firmCount = docsList.filter((doc) => uploaderOf(doc) !== currentUser?._id).length;
  const mineCount = docsList.filter((doc) => uploaderOf(doc) === currentUser?._id).length;

  /** Display/filter types derived from loaded documents (may exceed Client upload set). */
  const presentDocTypes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const doc of docsList) {
      const key = doc.type?.trim() || "other";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => documentTypeLabel(a.type).localeCompare(documentTypeLabel(b.type)));
  }, [docsList]);

  const categoryCounts = presentDocTypes;

  const focusUploadTrigger = () => {
    window.setTimeout(() => {
      document.getElementById("client-documents-upload-trigger")?.focus();
    }, 0);
  };

  const openUploadDialog = () => {
    setUploadPhase("idle");
    setDragOver(false);
    setUploadOpen(true);
  };

  const handleUploadOpenChange = (open: boolean) => {
    if (uploadPhase === "uploading") return;
    setUploadOpen(open);
    if (!open) {
      setUploadPhase("idle");
      setDragOver(false);
      focusUploadTrigger();
    }
  };

  const handleOpenPreview = async (doc: DocumentDto) => {
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
      toast.error("Please select a matter for this document.");
      return;
    }
    setUploadPhase("uploading");
    let successCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > MAX_DOCUMENT_BYTES) {
          throw new Error(`Each file must be ${MAX_DOCUMENT_MB} MB or smaller.`);
        }
        await uploadDocument({
          file,
          title: file.name,
          type: uploadType,
          caseId: uploadCaseId,
        });
        successCount++;
      }
      setUploadPhase("success");
      toast.success(
        successCount === 1
          ? "Document uploaded. Scanning may take a moment before it appears."
          : `${successCount} documents uploaded. Scanning may take a moment before they appear.`,
      );
      window.setTimeout(() => {
        setUploadPhase("idle");
        setUploadOpen(false);
        focusUploadTrigger();
      }, 900);
    } catch (err: unknown) {
      setUploadPhase("failure");
      toast.error(err instanceof Error ? err.message : "Upload failed.");
      window.setTimeout(() => setUploadPhase("idle"), 3500);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const shellProps = {
    portal: "client" as const,
    decorated: true,
    className: "client-documents",
    heroClassName: cn(CASE_LIST_HERO_CLASS, "client-documents-hero"),
    eyebrow: "Client Portal",
    title: "Documents",
    description:
      "Access filings and evidence shared with your legal team, and upload documents for your matters.",
    icon: FileText,
    metricsClassName: "max-sm:hidden",
  };

  if (currentUser === undefined || clientRecord === undefined) {
    return (
      <PortalPageShell {...shellProps} loading loadingLabel="Loading your documents…">
        <div />
      </PortalPageShell>
    );
  }

  if (clientRecord === null) {
    return (
      <PortalPageShell {...shellProps} showTodayDate>
        <EmptyState
          title="No client profile linked"
          description="Your account is not linked to a client profile yet. Contact the firm to access your documents."
          icon={FileText}
        />
      </PortalPageShell>
    );
  }

  const emptyTitle =
    search.trim() || filterCaseId !== "all" || filterType !== "all" || sourceFilter !== "all"
      ? "No documents match your filters"
      : "No documents yet";
  const emptyDescription =
    search.trim() || filterCaseId !== "all" || filterType !== "all" || sourceFilter !== "all"
      ? "Try adjusting search, matter, type, or source filters."
      : "When the firm shares a file or you upload one, it will appear here.";

  const renderDocActions = (doc: DocumentDto) => (
    <div className="client-documents-row-actions">
      <DashboardButton
        variant="ghost"
        size="sm"
        className="client-documents-icon-btn"
        aria-label={`Preview ${doc.title}`}
        onClick={() => handleOpenPreview(doc)}
      >
        <Eye className="h-3.5 w-3.5" aria-hidden />
      </DashboardButton>
      <DownloadButton documentId={doc._id} />
    </div>
  );

  const sourceTabs = (
    <div className="client-documents-sources" role="tablist" aria-label="Document source filters">
      {(
        [
          { id: "all", label: "All", count: docsList.length },
          { id: "firm", label: "Legal Team", count: firmCount },
          { id: "mine", label: "My Uploads", count: mineCount },
        ] as const
      ).map((source) => {
        const selected = sourceFilter === source.id;
        return (
          <button
            key={source.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cn("client-documents-source", selected && "client-documents-source-active")}
            onClick={() => setSourceFilter(source.id)}
          >
            {source.label}
            <span className="client-documents-source-count">{source.count}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <PortalPageShell
      {...shellProps}
      showTodayDate
      actions={
        <div className="client-documents-hero-actions">
          <DashboardButton
            id="client-documents-upload-trigger"
            type="button"
            size="sm"
            onClick={openUploadDialog}
            aria-haspopup="dialog"
            aria-expanded={uploadOpen}
          >
            <Upload className="h-3.5 w-3.5" aria-hidden />
            Upload Document
          </DashboardButton>
          <DashboardButton asChild size="sm" variant="outline">
            <Link href="/client/cases">
              <FolderOpen className="h-3.5 w-3.5" aria-hidden />
              My Matters
            </Link>
          </DashboardButton>
        </div>
      }
    >
      <div className="client-documents-layout">
        <div className="client-documents-main">
          <div className="client-documents-toolbar" role="region" aria-label="Document filters">
            <label className="client-documents-search">
              <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="sr-only">Search documents</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents…"
                aria-label="Search documents"
              />
            </label>
            <label className="client-documents-control">
              <span className="sr-only">Filter by Matter</span>
              <select
                value={filterCaseId}
                onChange={(e) => setFilterCaseId(e.target.value)}
                aria-label="Filter by Matter"
              >
                <option value="all">All Matters</option>
                {cases.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="client-documents-control">
              <span className="sr-only">Filter by document type</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                aria-label="Filter by document type"
              >
                <option value="all">All Types</option>
                {presentDocTypes.map((row) => (
                  <option key={row.type} value={row.type}>
                    {documentTypeLabel(row.type)}
                  </option>
                ))}
              </select>
            </label>
            {sourceTabs}
          </div>

          <section className="client-documents-library" aria-label="Document library">
            <div className="client-documents-library-head">
              <h2>Document Library</h2>
              <p>
                {filteredDocs.length} document{filteredDocs.length === 1 ? "" : "s"}
                {totalPages > 1 ? ` · Page ${currentPage} of ${totalPages}` : ""}
              </p>
            </div>

            {docs === undefined ? (
              <DashboardListSkeleton rows={4} />
            ) : filteredDocs.length === 0 ? (
              <EmptyState title={emptyTitle} description={emptyDescription} icon={FileText} />
            ) : (
              <>
                <div className="client-documents-table-wrap">
                  <table className="client-documents-table">
                    <thead>
                      <tr>
                        <th scope="col">Document</th>
                        <th scope="col">Matter</th>
                        <th scope="col">Type</th>
                        <th scope="col">Source</th>
                        <th scope="col" className="client-documents-actions-col">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.map((doc) => {
                        const matchedCase = matterOf(cases, doc.caseId);
                        const isMine = uploaderOf(doc) === currentUser?._id;
                        const when = documentDate(doc);
                        return (
                          <tr key={doc._id}>
                            <td>
                              <div className="client-documents-title-cell">
                                <span className="client-documents-file-badge" aria-hidden>
                                  {fileKindLabel(doc.mimeType, doc.title)}
                                </span>
                                <div className="min-w-0">
                                  <p className="client-documents-title">{doc.title}</p>
                                  <p className="client-documents-submeta">
                                    {fileKindLabel(doc.mimeType, doc.title)}
                                    {when ? ` · ${when}` : ""}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="client-documents-matter-cell">
                              {matchedCase ? matchedCase.title : "General"}
                            </td>
                            <td>
                              <DashboardStatusLabel
                                status={doc.type}
                                className="client-documents-type-label"
                              >
                                {documentTypeLabel(doc.type)}
                              </DashboardStatusLabel>
                            </td>
                            <td>
                              <span
                                className={cn(
                                  "client-documents-source-pill",
                                  isMine
                                    ? "client-documents-source-pill-mine"
                                    : "client-documents-source-pill-firm",
                                )}
                              >
                                {isMine ? "You" : "Legal Team"}
                              </span>
                            </td>
                            <td className="client-documents-actions-col">
                              {renderDocActions(doc)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <ul className="client-documents-card-list">
                  {paginatedItems.map((doc) => {
                    const matchedCase = matterOf(cases, doc.caseId);
                    const isMine = uploaderOf(doc) === currentUser?._id;
                    const when = documentDate(doc);
                    return (
                      <li key={doc._id} className="client-documents-card">
                        <div className="client-documents-card-top">
                          <span className="client-documents-file-badge" aria-hidden>
                            {fileKindLabel(doc.mimeType, doc.title)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="client-documents-title">{doc.title}</p>
                            <p className="client-documents-submeta">
                              {matchedCase ? matchedCase.title : "General"}
                              {when ? ` · ${when}` : ""}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "client-documents-source-pill",
                              isMine
                                ? "client-documents-source-pill-mine"
                                : "client-documents-source-pill-firm",
                            )}
                          >
                            {isMine ? "You" : "Legal Team"}
                          </span>
                        </div>
                        <div className="client-documents-card-meta">
                          <DashboardStatusLabel
                            status={doc.type}
                            className="client-documents-type-label"
                          >
                            {documentTypeLabel(doc.type)}
                          </DashboardStatusLabel>
                          {renderDocActions(doc)}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {totalPages > 1 ? (
                  <nav className="client-documents-pagination" aria-label="Document pages">
                    <DashboardButton
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={currentPage <= 1}
                      onClick={prevPage}
                    >
                      Previous
                    </DashboardButton>
                    <span className="client-documents-page-status">
                      Page {currentPage} of {totalPages}
                    </span>
                    <DashboardButton
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={currentPage >= totalPages}
                      onClick={nextPage}
                    >
                      Next
                    </DashboardButton>
                    <div className="client-documents-page-jumps">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          type="button"
                          className={cn(
                            "client-documents-page-jump",
                            page === currentPage && "client-documents-page-jump-active",
                          )}
                          aria-label={`Go to page ${page}`}
                          aria-current={page === currentPage ? "page" : undefined}
                          onClick={() => goToPage(page)}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                  </nav>
                ) : null}
              </>
            )}
          </section>
        </div>

        <aside className="client-documents-rail" aria-label="Document support">
          {categoryCounts.length > 0 ? (
            <section className="client-documents-rail-card">
              <h3>Document Categories</h3>
              <ul className="client-documents-summary">
                {categoryCounts.map((row) => (
                  <li key={row.type}>
                    <span>{documentTypeLabel(row.type)}</span>
                    <strong>{row.count}</strong>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="client-documents-rail-card">
            <h3>Need to send a file?</h3>
            <p>Upload evidence or forms for a selected matter.</p>
            <DashboardButton type="button" size="sm" className="w-full" onClick={openUploadDialog}>
              <Upload className="h-3.5 w-3.5" aria-hidden />
              Upload Document
            </DashboardButton>
          </section>

          <section className="client-documents-help">
            <h3>Have questions?</h3>
            <p>Message your legal team about a shared or uploaded document.</p>
            <DashboardButton asChild size="sm" className="w-full">
              <Link href="/client/messages">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                Send a Message
              </Link>
            </DashboardButton>
          </section>
        </aside>
      </div>

      <Dialog open={uploadOpen} onOpenChange={handleUploadOpenChange}>
        <DialogContent className="client-documents-upload-dialog max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <p className="client-documents-upload-dialog-lead">
            Share a file with your legal team for a selected matter.
          </p>
          <div className="client-documents-upload-grid">
            <label className="client-documents-field">
              <span>Matter</span>
              <select
                value={uploadCaseId}
                onChange={(e) => setUploadCaseId(e.target.value)}
                aria-label="Matter for upload"
                data-autofocus
              >
                {cases.length === 0 ? (
                  <option value="">No matters available</option>
                ) : (
                  cases.map((c) => (
                    <option key={c._id} value={c._id}>
                      [{c.caseNumber}] {c.title}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="client-documents-field">
              <span>Document Type</span>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as ClientUploadDocType)}
                aria-label="Document type for upload"
              >
                {CLIENT_UPLOAD_DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {documentTypeLabel(t)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label="Upload document files"
            aria-busy={uploadPhase === "uploading"}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void handleFiles(e.dataTransfer.files);
            }}
            className={cn(
              "client-documents-dropzone",
              dragOver && "client-documents-dropzone-active",
              uploadPhase === "uploading" && "client-documents-dropzone-busy",
              uploadPhase === "success" && "client-documents-dropzone-success",
              uploadPhase === "failure" && "client-documents-dropzone-failure",
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="sr-only"
              aria-label="Choose files to upload"
              onChange={(e) => void handleFiles(e.target.files)}
            />
            {uploadPhase === "uploading" ? (
              <>
                <Loader2 className="h-7 w-7 animate-spin text-dashboard-primary" aria-hidden />
                <p className="client-documents-dropzone-title">Uploading and scanning…</p>
                <p className="client-documents-dropzone-hint">
                  Please keep this dialog open until the upload finishes.
                </p>
              </>
            ) : uploadPhase === "success" ? (
              <>
                <Upload className="h-7 w-7 text-dashboard-success" aria-hidden />
                <p className="client-documents-dropzone-title">Upload received</p>
                <p className="client-documents-dropzone-hint">
                  Your file is being scanned before it appears in the library.
                </p>
              </>
            ) : uploadPhase === "failure" ? (
              <>
                <Upload className="h-7 w-7 text-dashboard-danger" aria-hidden />
                <p className="client-documents-dropzone-title">Upload failed</p>
                <p className="client-documents-dropzone-hint">
                  Try again, or contact your legal team if the problem continues.
                </p>
              </>
            ) : (
              <>
                <div className="client-documents-dropzone-icon" aria-hidden>
                  <Upload className="h-5 w-5" />
                </div>
                <p className="client-documents-dropzone-title">
                  Drop files here or click to browse
                </p>
                <p className="client-documents-dropzone-hint">{UPLOAD_ACCEPT_HINT}</p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="client-documents-preview-dialog max-w-3xl max-h-[85vh] flex flex-col">
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
