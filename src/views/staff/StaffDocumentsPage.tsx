import { CollectionContinuation } from "@/components/ui/collection-continuation";
import { BsDateField, reportBsDateValidity } from "@/components/ui/bs-date-field";
import { formatNepalTimestamp } from "@/lib/nepali-calendar";
import { useI18n } from "@/lib/i18n-context";
import { StaffPagedCollection } from "@/components/dashboard/staff-paged-collection";
import { useCallback, useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DashboardButton,
  DashboardSection,
  DashboardStatusLabel,
  DualDateDisplay,
  EmptyState,
  PortalPageShell,
  STAFF_HERO_OUTLINE_BUTTON_CLASS,
  StatusBadge,
  usePortalBranding,
} from "@/components/dashboard";
import {
  FileText,
  Upload,
  Filter,
  Download,
  Loader2,
  ShieldAlert,
  X,
  Lock,
  PenTool,
  Send,
  Eye,
  Folder,
  History,
  Trash2,
  Tags,
  LayoutTemplate,
  Clock,
  Link2,
  ScanText,
} from "lucide-react";
import { AdvancedSearch } from "@/components/documents/AdvancedSearch.tsx";
import {
  classifyDocumentPreview,
  previewKindLabel,
} from "@/components/documents/staff-document-preview.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { useCases } from "@/client/queries/cases";
import {
  useDocumentsQuery,
  useDocumentSearchQuery,
  useRecentDocuments,
  useUploadDocument,
  useTrashDocument,
  useRestoreDocument,
  useHardDeleteDocument,
  useSetLegalHold,
  useUpdateDocument,
  useExtractDocumentText,
  useDownloadDocument,
  useDownloadDocumentArchive,
  useDocumentVersionsQuery,
  useRestoreDocumentVersion,
} from "@/client/queries/documents";
import {
  usePortalSigners,
  useCreateEnvelope,
  useSendEnvelope,
  useRequestSignature,
} from "@/client/queries/envelopes";

const TagManagementModal = dynamic(
  () =>
    import("@/components/documents/TagManagementModal").then((module) => module.TagManagementModal),
  { ssr: false },
);
const TemplateGeneratorModal = dynamic(
  () =>
    import("@/components/documents/TemplateGeneratorModal").then(
      (module) => module.TemplateGeneratorModal,
    ),
  { ssr: false },
);
const DocumentShareModal = dynamic(
  () =>
    import("@/components/documents/DocumentShareModal").then((module) => module.DocumentShareModal),
  { ssr: false },
);
const StaffDocumentViewer = dynamic(
  () =>
    import("@/components/documents/StaffDocumentViewer").then(
      (module) => module.StaffDocumentViewer,
    ),
  { ssr: false },
);

const DOC_TYPES = [
  "pleading",
  "affidavit",
  "contract",
  "poa",
  "correspondence",
  "evidence",
  "other",
];

function formatSize(bytes: unknown): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

/** File-type chip derived from the real mime type / file extension. */
function fileKind(doc: any): { kind: string; label: string } {
  const mime = String(doc?.mimeType || "").toLowerCase();
  const ext = String(doc?.title || "")
    .split(".")
    .pop()
    ?.toLowerCase();
  if (mime.includes("pdf") || ext === "pdf") return { kind: "pdf", label: "PDF" };
  if (mime.includes("word") || ext === "doc" || ext === "docx")
    return { kind: "doc", label: "DOC" };
  if (mime.includes("sheet") || mime.includes("excel") || ext === "xls" || ext === "xlsx")
    return { kind: "sheet", label: "XLS" };
  if (mime.includes("presentation") || ext === "ppt" || ext === "pptx")
    return { kind: "slides", label: "PPT" };
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "tif", "tiff"].includes(ext || ""))
    return { kind: "image", label: "IMG" };
  if (mime.startsWith("text/") || ext === "txt") return { kind: "text", label: "TXT" };
  return { kind: "file", label: "FILE" };
}

export default function StaffDocumentsPage() {
  const { language } = useI18n();
  const { heroImageUrl } = usePortalBranding();
  const [searchFilters, setSearchFilters] = useState<{
    query: string;
    caseId?: string;
    type?: string;
    tag?: string;
    generalOnly?: boolean;
  }>({ query: "" });
  const [viewMode, setViewMode] = useState<"list" | "folders" | "trash">("list");

  const searchQuery = useDocumentSearchQuery(
    searchFilters.query ? { ...searchFilters, inTrash: viewMode === "trash" } : null,
  );
  const searchResults = searchQuery.data || [];
  const listQuery = useDocumentsQuery({
    caseId: searchFilters.query ? undefined : searchFilters.caseId,
    isTemplate: false,
    inTrash: viewMode === "trash",
  });
  const listResults = listQuery.data || [];
  const documentQuery = searchFilters.query ? searchQuery : listQuery;
  const cases = useCases({}) || [];

  const allDocs = searchFilters.query ? searchResults : listResults;
  const recentDocs = useRecentDocuments(5) || [];
  const signers = usePortalSigners();

  const uploadDocument = useUploadDocument();
  const requestSignature = useRequestSignature();
  const createEnvelope = useCreateEnvelope();
  const sendEnvelope = useSendEnvelope();
  const extractDocumentText = useExtractDocumentText();
  const softDeleteDoc = useTrashDocument();
  const restoreDoc = useRestoreDocument();
  const hardDeleteDoc = useHardDeleteDocument();
  const setLegalHold = useSetLegalHold();
  const updateDocument = useUpdateDocument();
  const downloadDocument = useDownloadDocument();
  const downloadDocumentArchive = useDownloadDocumentArchive();
  const restoreDocumentVersion = useRestoreDocumentVersion();
  const setRetention = async (args: any) =>
    updateDocument({ id: args.documentId, updates: { retentionPolicy: args.policy } });

  // States
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedSubFolder, setSelectedSubFolder] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [activeSidebarDoc, setActiveSidebarDoc] = useState<any | null>(null);
  const versionsQuery = useDocumentVersionsQuery(activeSidebarDoc?._id ?? null);
  const versionHistory = versionsQuery.data ?? [];
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [envelopeDoc, setEnvelopeDoc] = useState<any>(null);
  const [createdEnvelopeId, setCreatedEnvelopeId] = useState<string | null>(null);
  const [retentionDoc, setRetentionDoc] = useState<any>(null);
  const [retentionPolicy, setRetentionPolicy] = useState("");
  const [retentionBusy, setRetentionBusy] = useState(false);
  const [retentionError, setRetentionError] = useState("");
  const retentionLock = useRef(false);

  // Upload Form
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCaseId, setUploadCaseId] = useState<string>("general");
  const [uploadType, setUploadType] = useState<string>("other");
  const [isPrivileged, setIsPrivileged] = useState<boolean>(false);
  const [parentDocumentId, setParentDocumentId] = useState<string | null>(null);

  // Envelope Form
  const [envelopeTitle, setEnvelopeTitle] = useState("");
  const [envelopeRouting, setEnvelopeRouting] = useState<"sequential" | "parallel">("sequential");
  const [envelopeExpires, setEnvelopeExpires] = useState("");
  const [selectedSignerIds, setSelectedSignerIds] = useState<string[]>([]);
  const [isEnvelopeBusy, setIsEnvelopeBusy] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const isLoading = documentQuery.isLoading || cases === undefined;

  // Filter & Pagination
  const docsToDisplay = allDocs;
  const filteredDocs = docsToDisplay.filter((d: any) => {
    // If in trash mode, only show deleted
    if (viewMode === "trash") {
      return d.isDeleted === true;
    }
    // If not in trash mode, hide deleted
    if (d.isDeleted) return false;

    if (viewMode === "folders") {
      if (selectedFolder !== null && (d.caseId || "general") !== selectedFolder) return false;
      if (selectedSubFolder !== null && d.type !== selectedSubFolder) return false;
    }
    if (filterType !== "all" && d.type !== filterType) return false;

    if (!searchFilters.query && searchFilters.tag) {
      if (!d.tags?.some((t: string) => t.toLowerCase() === searchFilters.tag?.toLowerCase()))
        return false;
    }
    if (!searchFilters.query) {
      if (searchFilters.generalOnly && d.caseId) return false;
      if (searchFilters.caseId && d.caseId !== searchFilters.caseId) return false;
      if (searchFilters.type && d.type !== searchFilters.type) return false;
    }
    return true;
  });

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, prevPage, resetPagination } =
    usePagination(filteredDocs, 12);

  useEffect(() => {
    resetPagination();
  }, [searchFilters, filterType, viewMode, selectedFolder]);

  const toggleDocSelection = (id: string) => {
    setSelectedDocs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAll = () => {
    const pageIds = paginatedItems.map((doc: any) => doc._id);
    setSelectedDocs((selected) =>
      pageIds.every((id) => selected.includes(id))
        ? selected.filter((id) => !pageIds.includes(id))
        : [...new Set([...selected, ...pageIds])],
    );
  };

  const openNewUpload = () => {
    setSelectedFile(null);
    setUploadCaseId("general");
    setUploadType("other");
    setIsPrivileged(false);
    setParentDocumentId(null);
    setIsUploadOpen(true);
  };

  const openVersionUpload = (parentDoc: any) => {
    setSelectedFile(null);
    setUploadCaseId(parentDoc.caseId || "general");
    setUploadType(parentDoc.type);
    setIsPrivileged(parentDoc.isPrivileged);
    setParentDocumentId(parentDoc._id);
    setIsUploadOpen(true);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return toast.error("Please select a file.");
    if (selectedFile.size > 50 * 1024 * 1024) return toast.error("Files cannot exceed 50 MB.");
    setIsUploading(true);
    try {
      const result = await uploadDocument({
        file: selectedFile,
        caseId: uploadCaseId === "general" ? undefined : uploadCaseId,
        title: selectedFile.name,
        type: uploadType,
        tags: ["new"],
        isTemplate: false,
        isPrivileged,
        parentDocumentId: parentDocumentId || undefined,
      });
      const onFile = result.status === "promoted";
      toast.success(
        parentDocumentId
          ? onFile
            ? "New version is on file."
            : "New version uploaded and quarantined for scanning."
          : onFile
            ? "Document uploaded."
            : "Document uploaded and quarantined for scanning.",
      );
      setIsUploadOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document.");
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRequestSignature = async (doc: any) => {
    setRequestingId(doc._id);
    try {
      await requestSignature({ documentId: doc._id });
      toast.success("Sent for signature â€” client notified.");
    } catch (err: any) {
      toast.error(err?.message || "Could not request signature.");
    } finally {
      setRequestingId(null);
    }
  };

  const openEnvelopeModal = (doc: any) => {
    setCreatedEnvelopeId(null);
    setEnvelopeDoc(doc);
    setEnvelopeTitle(doc.title);
    setEnvelopeRouting("sequential");
    setEnvelopeExpires("");
    const matchedCase = cases.find((c: any) => c._id === doc.caseId);
    const clientSigner = signers.find((s: any) => s.role === "client");
    setSelectedSignerIds(matchedCase && clientSigner ? [clientSigner._id] : []);
  };

  const handleCreateAndSendEnvelope = async () => {
    if (!reportBsDateValidity()) return;
    if (!envelopeDoc) return;
    if (selectedSignerIds.length === 0) return toast.error("Select at least one signer.");
    setIsEnvelopeBusy(true);
    try {
      let envelopeId = createdEnvelopeId;
      if (!envelopeId) {
        const created = await createEnvelope({
          documentId: envelopeDoc._id,
          title: envelopeTitle.trim() || envelopeDoc.title,
          routing: envelopeRouting,
          expiresAt: envelopeExpires ? new Date(envelopeExpires).toISOString() : undefined,
          recipientUserIds: selectedSignerIds as any,
        });
        envelopeId = created.envelopeId;
        setCreatedEnvelopeId(envelopeId);
      }
      await sendEnvelope({ envelopeId });
      toast.success("Envelope sent to signers.");
      setEnvelopeDoc(null);
      setCreatedEnvelopeId(null);
    } catch (err: any) {
      toast.error(err?.message || "Could not create envelope.");
    } finally {
      setIsEnvelopeBusy(false);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedDocs.length === 0) return;
    setIsBulkDownloading(true);
    try {
      const result = await downloadDocumentArchive(selectedDocs);
      toast.success(`Downloaded ${selectedDocs.length} documents as ${result.fileName}.`);
      setSelectedDocs([]);
    } catch (err: any) {
      toast.error(err?.message || "Could not create the document archive.");
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const handleDocumentDownload = async (doc: any) => {
    setDownloadingId(doc._id);
    try {
      const url = await downloadDocument(doc._id);
      window.open(String(url), "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err?.message || "Could not download this document.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleVersionRestore = async (version: any) => {
    if (!activeSidebarDoc) return;
    if (
      !window.confirm(
        `Restore version ${version.version}? The existing history will remain unchanged and a new version will be created.`,
      )
    )
      return;
    setRestoringVersionId(version._id);
    try {
      const restored = await restoreDocumentVersion({
        documentId: activeSidebarDoc._id,
        versionId: version._id,
      });
      setActiveSidebarDoc(restored);
      toast.success(`Version ${version.version} restored as new version ${restored.version}.`);
    } catch (err: any) {
      toast.error(err?.message || "Could not restore this version.");
    } finally {
      setRestoringVersionId(null);
    }
  };

  const handleOCR = async (doc: any) => {
    try {
      await extractDocumentText(doc._id);
      toast.success("Text extraction queued. Searchable text appears once the job finishes.");
    } catch (err: any) {
      toast.error(err.message, { id: "ocr" });
    }
  };

  const handleArchive = async (docIds: string[]) => {
    try {
      for (const id of docIds) await softDeleteDoc(id);
      toast.success(`Archived ${docIds.length} document(s)`);
      setSelectedDocs([]);
      if (activeSidebarDoc && docIds.includes(activeSidebarDoc._id)) setActiveSidebarDoc(null);
    } catch (err: any) {
      toast.error("Failed to archive documents");
    }
  };

  const handleRestore = async (docIds: string[]) => {
    try {
      for (const id of docIds) await restoreDoc(id);
      toast.success(`Restored ${docIds.length} document(s)`);
      setSelectedDocs([]);
      if (activeSidebarDoc && docIds.includes(activeSidebarDoc._id)) setActiveSidebarDoc(null);
    } catch (err: any) {
      toast.error("Failed to restore documents");
    }
  };

  const handleHardDelete = async (docIds: string[]) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete ${docIds.length} document(s)? This cannot be undone.`,
      )
    )
      return;
    try {
      for (const id of docIds) await hardDeleteDoc(id);
      toast.success(`Permanently deleted ${docIds.length} document(s)`);
      setSelectedDocs([]);
      if (activeSidebarDoc && docIds.includes(activeSidebarDoc._id)) setActiveSidebarDoc(null);
    } catch (err: any) {
      toast.error("Failed to delete documents permanently");
    }
  };

  const handleLegalHold = async (doc: any) => {
    const enabled = !doc.isOnLegalHold;
    const reason = window.prompt(
      enabled
        ? "Reason for placing this document on legal hold:"
        : "Reason for releasing this legal hold:",
    );
    if (!reason?.trim()) return;
    try {
      if (enabled) {
        await setLegalHold({ documentId: doc._id, reason: reason.trim() });
      } else {
        await updateDocument({
          id: doc._id,
          updates: { isOnLegalHold: false, legalHoldReason: reason.trim() },
        });
      }
      toast.success(enabled ? "Legal hold applied." : "Legal hold released.");
    } catch (err: any) {
      toast.error(err?.message || "Could not update legal hold.");
    }
  };

  const handleRetention = (doc: any) => {
    setRetentionDoc(doc);
    setRetentionPolicy(doc.retentionPolicy || "Corporate legal record");
    setRetentionError("");
  };
  const saveRetentionPolicy = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!retentionDoc || !retentionPolicy.trim() || retentionLock.current) return;
    retentionLock.current = true;
    setRetentionBusy(true);
    setRetentionError("");
    try {
      await setRetention({
        documentId: retentionDoc._id,
        policy: retentionPolicy.trim(),
      });
      setRetentionDoc(null);
      toast.success("Retention policy applied.");
    } catch (err: any) {
      setRetentionError(err?.message || "Could not set retention.");
    } finally {
      retentionLock.current = false;
      setRetentionBusy(false);
    }
  };

  const toggleSigner = (userId: string) => {
    setSelectedSignerIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };
  const moveSigner = (userId: string, dir: -1 | 1) => {
    setSelectedSignerIds((prev) => {
      const idx = prev.indexOf(userId);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  // Stable close callbacks: the shared Dialog re-runs its focus/scroll-lock effect whenever
  // `onOpenChange` changes identity, so these must not be recreated on every render.
  const closeDetails = useCallback(() => setActiveSidebarDoc(null), []);
  const closeUpload = useCallback(() => setIsUploadOpen(false), []);
  const closePreview = useCallback(() => setIsPreviewOpen(false), []);
  const closeEnvelope = useCallback(() => {
    if (isEnvelopeBusy) return;
    setEnvelopeDoc(null);
    setCreatedEnvelopeId(null);
  }, [isEnvelopeBusy]);

  // Wide screens show details as an inline panel; narrower screens use an accessible dialog.
  const [isWide, setIsWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 80rem)");
    const sync = () => setIsWide(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Keep search/filter controls mounted while a new document query loads.
  if (cases === undefined) {
    return (
      <PortalPageShell
        portal="staff"
        loading
        loadingLabel="Loading documents…"
        title="Vault & documents"
      >
        {null}
      </PortalPageShell>
    );
  }

  const docList = allDocs as any[];
  const awaitingSignature = docList.filter(
    (d) => Boolean(d.requiresSignature) && d.signatureStatus === "pending",
  ).length;
  const onLegalHold = docList.filter((d) => Boolean(d.isOnLegalHold)).length;
  const pendingScan = docList.filter((d) => d.uploadStatus && d.uploadStatus !== "clean").length;
  const showLibrary = !(viewMode === "folders" && (!selectedFolder || !selectedSubFolder));
  const pageSelected =
    paginatedItems.length > 0 && paginatedItems.every((doc: any) => selectedDocs.includes(doc._id));
  const detailsDialogOpen =
    !isWide &&
    !!activeSidebarDoc &&
    !retentionDoc &&
    !isPreviewOpen &&
    !isShareModalOpen &&
    !envelopeDoc &&
    !isUploadOpen;

  const renderDetails = (doc: any, inDialog: boolean) => {
    const matchedCase = cases.find((c: any) => c._id === doc.caseId);
    const kind = fileKind(doc);
    const canExtractText =
      (doc.mimeType?.includes("pdf") || doc.mimeType?.includes("image")) && !doc.searchableText;
    return (
      <div className="staff-docs-details" data-in-dialog={inDialog ? "true" : undefined}>
        <header className="staff-docs-details-head">
          <span className="staff-docs-kind" data-kind={kind.kind} aria-hidden>
            {kind.label}
          </span>
          <div className="min-w-0">
            <h2 id="staff-docs-details-title" className="staff-docs-details-title">
              {doc.title}
            </h2>
            <div className="staff-docs-badges">
              <StatusBadge tone="neutral" className="capitalize text-[10px]">
                {doc.type}
              </StatusBadge>
              <StatusBadge tone="information" className="text-[10px] uppercase">
                Version {doc.version}
              </StatusBadge>
              {doc.isPrivileged && (
                <StatusBadge tone="danger" className="text-[10px]">
                  Internal Vault
                </StatusBadge>
              )}
              {doc.isOnLegalHold && (
                <StatusBadge tone="warning" className="text-[10px]">
                  Legal Hold
                </StatusBadge>
              )}
              {doc.retentionUntil && (
                <StatusBadge tone="neutral" className="text-[10px]">
                  Retain until <DualDateDisplay isoDate={doc.retentionUntil} />
                </StatusBadge>
              )}
            </div>
          </div>
          {!inDialog ? (
            <button
              type="button"
              className="staff-docs-close"
              aria-label="Close details"
              onClick={closeDetails}
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </header>

        <div className="staff-docs-details-body">
          <dl className="staff-docs-meta">
            <div>
              <dt>Uploaded on</dt>
              <dd>
                <DualDateDisplay isoDate={new Date(doc._creationTime).toISOString()} />
              </dd>
            </div>
            <div>
              <dt>File size</dt>
              <dd>{formatSize(doc.sizeBytes)}</dd>
            </div>
            <div>
              <dt>Visibility</dt>
              <dd>{doc.isPrivileged ? "Internal vault only" : "Client viewable"}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd className="capitalize">{doc.uploadStatus || "clean"}</dd>
            </div>
            <div className="staff-docs-meta-wide">
              <dt>Case link</dt>
              <dd>
                {matchedCase
                  ? `[${matchedCase.caseNumber}] ${matchedCase.title}`
                  : "Firm General File"}
              </dd>
            </div>
          </dl>

          <section className="staff-docs-action-group" aria-label="File actions">
            <Button type="button" onClick={() => setIsPreviewOpen(true)}>
              <Eye className="size-4" aria-hidden /> Open Previewer
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDocumentDownload(doc)}
              disabled={downloadingId === doc._id}
            >
              {downloadingId === doc._id ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Download className="size-4" aria-hidden />
              )}
              Download Document
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsShareModalOpen(true)}>
              <Link2 className="size-4" aria-hidden /> Share External Link
            </Button>
            {canExtractText && (
              <Button type="button" variant="outline" onClick={() => handleOCR(doc)}>
                <ScanText className="size-4" aria-hidden /> Extract Text (OCR)
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={() => openVersionUpload(doc)}>
              <Upload className="size-4" aria-hidden /> Upload New Version
            </Button>
          </section>

          <section className="staff-docs-action-pair" aria-label="Retention and legal hold">
            <Button type="button" variant="outline" onClick={() => handleLegalHold(doc)}>
              <Lock className="size-3.5" aria-hidden />{" "}
              {doc.isOnLegalHold ? "Release Hold" : "Legal Hold"}
            </Button>
            <Button type="button" variant="outline" onClick={() => handleRetention(doc)}>
              <Clock className="size-3.5" aria-hidden /> Retention
            </Button>
          </section>

          <section className="staff-docs-signature" aria-label="E-signature">
            <h3>
              <PenTool className="size-3.5" aria-hidden /> E-Signature Hub
            </h3>
            {doc.signatureStatus === "signed" ? (
              <DashboardStatusLabel
                label="Completed & secured"
                tone="success"
                className="w-full justify-center py-1.5"
              />
            ) : (
              <>
                <div className="staff-docs-action-pair">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleRequestSignature(doc)}
                    disabled={!!requestingId || doc.isPrivileged}
                  >
                    Quick Sign
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openEnvelopeModal(doc)}
                    disabled={doc.isPrivileged}
                  >
                    Create Envelope
                  </Button>
                </div>
                {doc.isPrivileged ? (
                  <p className="staff-docs-note">
                    Internal vault files cannot be sent for signature.
                  </p>
                ) : null}
              </>
            )}
          </section>

          <section className="staff-docs-versions" aria-label="Version history">
            <h3>
              <History className="size-3.5" aria-hidden /> Version History
            </h3>
            {versionsQuery.isLoading ? (
              <p className="staff-docs-note">Loading version history…</p>
            ) : versionsQuery.isError ? (
              <div role="alert">
                <p className="staff-docs-note">Version history could not be loaded.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void versionsQuery.refetch()}
                >
                  Retry versions
                </Button>
              </div>
            ) : versionHistory.length === 0 ? (
              <p className="staff-docs-note">No version history is available.</p>
            ) : (
              <ol className="staff-docs-version-list">
                {
                  <StaffPagedCollection
                    label="Document versions"
                    resetKey={String(activeSidebarDoc?._id ?? "")}
                    pageSize={6}
                    footerAs="li"
                  >
                    {versionHistory.map((version: any, index) => {
                      const isCurrent = index === 0;
                      const createdAt =
                        version.createdAt || new Date(version._creationTime).toISOString();
                      return (
                        <li key={version._id} data-current={isCurrent ? "true" : undefined}>
                          <div className="min-w-0">
                            <p className="staff-docs-version-name">
                              Version {version.version} {isCurrent ? "(Current)" : ""}
                            </p>
                            <p className="staff-docs-note">
                              <DualDateDisplay isoDate={createdAt} />
                            </p>
                          </div>
                          {!isCurrent && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleVersionRestore(version)}
                              disabled={
                                restoringVersionId !== null ||
                                version.isDeleted ||
                                version.uploadStatus !== "clean"
                              }
                              aria-label={`Restore version ${version.version}`}
                            >
                              {restoringVersionId === version._id ? (
                                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                              ) : (
                                "Restore"
                              )}
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </StaffPagedCollection>
                }
              </ol>
            )}
          </section>
        </div>
      </div>
    );
  };

  return (
    <PortalPageShell
      portal="staff"
      titleKey="portal.documents.title"
      descriptionKey="portal.documents.description"
      icon={FileText}
      className="staff-docs-workspace"
      heroClassName="staff-docs-hero"
      metricsClassName="staff-docs-metrics"
      metrics={[
        {
          label: viewMode === "trash" ? "In trash" : "Documents",
          value: String(docList.length),
          icon: FileText,
          tone: "information",
          helperText: searchFilters.query ? "Matching your search" : "In this view",
        },
        {
          label: "Awaiting signature",
          value: String(awaitingSignature),
          icon: PenTool,
          tone: "warning",
          helperText: "Signature pending",
        },
        {
          label: "On legal hold",
          value: String(onLegalHold),
          icon: Lock,
          tone: onLegalHold > 0 ? "danger" : "success",
          helperText: onLegalHold > 0 ? "Protected from deletion" : "No holds applied",
        },
        {
          label: "Pending scan",
          value: String(pendingScan),
          icon: ShieldAlert,
          tone: pendingScan > 0 ? "warning" : "success",
          helperText: pendingScan > 0 ? "Quarantined or scanning" : "All files clean",
        },
      ]}
      heroChildren={
        <div
          aria-hidden
          className="staff-docs-hero-art"
          style={
            heroImageUrl
              ? {
                  backgroundImage: `url(${JSON.stringify(heroImageUrl)}), url("/images/staff-home-nepal.jpg")`,
                }
              : undefined
          }
        />
      }
      actions={
        <>
          <DashboardButton size="sm" variant="primary" onClick={openNewUpload}>
            <Upload className="size-3.5" aria-hidden /> Upload file
          </DashboardButton>
          <DashboardButton
            size="sm"
            variant="outline"
            className={STAFF_HERO_OUTLINE_BUTTON_CLASS}
            onClick={() => setIsTemplateModalOpen(true)}
          >
            <LayoutTemplate className="size-3.5" aria-hidden /> Use template
          </DashboardButton>
        </>
      }
    >
      <div
        className="staff-docs-layout"
        data-details={isWide && activeSidebarDoc ? "open" : "closed"}
      >
        <div className="staff-docs-main">
          <CollectionContinuation query={documentQuery} noun="documents" />
          <div className="staff-docs-toolbar" role="region" aria-label="Document views and filters">
            <div className="staff-docs-toolbar-row">
              <div role="group" aria-label="Document view" className="staff-docs-view-toggle">
                <button
                  type="button"
                  aria-pressed={viewMode === "list"}
                  onClick={() => {
                    setViewMode("list");
                    setSelectedFolder(null);
                    setSelectedSubFolder(null);
                  }}
                >
                  <FileText className="size-4" aria-hidden /> List View
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === "folders"}
                  onClick={() => {
                    setViewMode("folders");
                    setSelectedSubFolder(null);
                  }}
                >
                  <Folder className="size-4" aria-hidden /> Folders
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === "trash"}
                  data-variant="trash"
                  onClick={() => {
                    setViewMode("trash");
                    setSelectedFolder(null);
                    setSelectedSubFolder(null);
                  }}
                >
                  <Trash2 className="size-4" aria-hidden /> Trash
                </button>
              </div>
              <DashboardButton
                size="sm"
                variant="secondary"
                className="staff-docs-tags-button"
                onClick={() => setIsTagsModalOpen(true)}
              >
                <Tags className="size-3.5" aria-hidden /> Tags
              </DashboardButton>
            </div>

            <div className="staff-docs-search">
              <AdvancedSearch cases={cases} onSearch={setSearchFilters} />
            </div>

            {viewMode === "folders" && !selectedFolder && (
              <div className="staff-docs-folders">
                <button type="button" onClick={() => setSelectedFolder("general")}>
                  <Folder aria-hidden />
                  <span className="min-w-0">
                    <strong>Firm General</strong>
                    <small>Internal Documents</small>
                  </span>
                </button>
                {cases.map((c: any) => (
                  <button key={c._id} type="button" onClick={() => setSelectedFolder(c._id)}>
                    <Folder aria-hidden />
                    <span className="min-w-0">
                      <strong title={c.title}>{c.caseNumber}</strong>
                      <small title={c.title}>{c.title}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {viewMode === "folders" && selectedFolder && !selectedSubFolder && (
              <div className="staff-docs-folders">
                {DOC_TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => setSelectedSubFolder(t)}>
                    <Folder aria-hidden />
                    <span className="min-w-0">
                      <strong className="capitalize">{t}</strong>
                      <small>Sub-Folder</small>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {(viewMode !== "folders" || selectedSubFolder) && (
              <div className="staff-docs-filter-row">
                {viewMode === "folders" && selectedFolder && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSubFolder(null)}
                  >
                    &larr; Back to {selectedFolder === "general" ? "Firm General" : "Case"}
                  </Button>
                )}
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="staff-docs-type-filter" aria-label="Filter by type">
                    <Filter className="size-3.5" aria-hidden />{" "}
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
              </div>
            )}
          </div>

          {selectedDocs.length > 0 && showLibrary && (
            <div
              className="staff-docs-bulk"
              data-trash={viewMode === "trash" ? "true" : undefined}
              role="region"
              aria-label="Bulk actions"
            >
              <span className="staff-docs-bulk-count">{selectedDocs.length} selected</span>
              {viewMode !== "trash" ? (
                <div className="staff-docs-bulk-actions">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDownload}
                    disabled={isBulkDownloading}
                  >
                    {isBulkDownloading ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Download className="size-3.5" aria-hidden />
                    )}
                    {isBulkDownloading ? "Preparing ZIP…" : "Download ZIP"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="staff-docs-danger"
                    onClick={() => handleArchive(selectedDocs)}
                  >
                    <Trash2 className="size-3.5" aria-hidden /> Archive
                  </Button>
                </div>
              ) : (
                <div className="staff-docs-bulk-actions">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="staff-docs-restore"
                    onClick={() => handleRestore(selectedDocs)}
                  >
                    Restore
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="staff-docs-danger"
                    onClick={() => handleHardDelete(selectedDocs)}
                  >
                    Delete Permanently
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="staff-docs-library">
            {viewMode === "folders" && !selectedFolder ? (
              <EmptyState
                title="Select a case folder"
                description="Choose a case folder above to view its document types."
                icon={Folder}
                className="py-12"
              />
            ) : viewMode === "folders" && selectedFolder && !selectedSubFolder ? (
              <EmptyState
                title="Select a sub-folder"
                description="Choose a document type sub-folder to view its files."
                icon={Folder}
                className="py-12"
              />
            ) : paginatedItems.length === 0 ? (
              <EmptyState
                title={
                  documentQuery.isError && documentQuery.data === undefined
                    ? "Documents unavailable"
                    : isLoading
                      ? "Loading documents…"
                      : "Vault is empty"
                }
                description={
                  documentQuery.isError && documentQuery.data === undefined
                    ? "Retry the document request above."
                    : isLoading
                      ? "Retrieving documents."
                      : "No loaded documents match your search or filter."
                }
                icon={FileText}
                className="py-12"
              />
            ) : (
              <>
                <div className="staff-docs-selectbar">
                  <label>
                    <input type="checkbox" checked={pageSelected} onChange={selectAll} />
                    <span>Select all on this page ({paginatedItems.length})</span>
                  </label>
                  <span className="staff-docs-count">
                    {filteredDocs.length} loaded document{filteredDocs.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="staff-docs-cols" aria-hidden>
                  <span />
                  <span>Document</span>
                  <span>Type</span>
                  <span>Case</span>
                  <span>Modified</span>
                  <span>Size</span>
                  <span />
                </div>
                <ul className="staff-docs-list" aria-label="Documents">
                  {paginatedItems.map((doc: any) => {
                    const matchedCase = cases.find((c: any) => c._id === doc.caseId);
                    const isSelected = selectedDocs.includes(doc._id);
                    const isActive = activeSidebarDoc?._id === doc._id;
                    const kind = fileKind(doc);
                    return (
                      <li
                        key={doc._id}
                        className="staff-docs-row"
                        data-active={isActive ? "true" : undefined}
                        data-selected={isSelected ? "true" : undefined}
                        onClick={() => setActiveSidebarDoc(doc)}
                      >
                        <label className="staff-docs-check" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Select ${doc.title}`}
                            checked={isSelected}
                            onChange={() => toggleDocSelection(doc._id)}
                          />
                        </label>
                        <div className="staff-docs-doc">
                          <span className="staff-docs-kind" data-kind={kind.kind} aria-hidden>
                            {kind.label}
                          </span>
                          <div className="min-w-0">
                            <button
                              type="button"
                              className="staff-docs-name"
                              aria-pressed={isActive}
                              title={doc.title}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSidebarDoc(doc);
                              }}
                            >
                              <span className="staff-docs-name-text">{doc.title}</span>
                            </button>
                            <div className="staff-docs-flags">
                              {doc.isPrivileged && (
                                <span className="staff-docs-flag" data-tone="danger">
                                  <Lock className="size-3" aria-hidden /> Internal
                                </span>
                              )}
                              {doc.isOnLegalHold && (
                                <span className="staff-docs-flag" data-tone="warning">
                                  Legal hold
                                </span>
                              )}
                              {doc.uploadStatus && doc.uploadStatus !== "clean" && (
                                <DashboardStatusLabel
                                  status={doc.uploadStatus}
                                  className="text-[9px] capitalize"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="staff-docs-meta-row">
                          <div className="staff-docs-cell staff-docs-cell-type">
                            <span className="staff-docs-label">Type</span>
                            <StatusBadge tone="neutral" className="capitalize text-[10px]">
                              {doc.type}
                            </StatusBadge>
                          </div>
                          <div className="staff-docs-cell staff-docs-cell-case">
                            <span className="staff-docs-label">Case</span>
                            <span className="staff-docs-case">
                              {matchedCase?.caseNumber || "Firm General"}
                            </span>
                          </div>
                          <div className="staff-docs-cell staff-docs-cell-date">
                            <span className="staff-docs-label">Modified</span>
                            <DualDateDisplay isoDate={new Date(doc._creationTime).toISOString()} />
                          </div>
                          <div className="staff-docs-cell staff-docs-cell-size">
                            <span className="staff-docs-label">Size</span>
                            {formatSize(doc.sizeBytes)}
                          </div>
                        </div>
                        <div className="staff-docs-actions" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label={`View details for ${doc.title}`}
                            onClick={() => setActiveSidebarDoc(doc)}
                          >
                            <Eye className="size-4" aria-hidden />
                            <span className="staff-docs-action-text">Details</span>
                          </Button>
                          {viewMode !== "trash" ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              aria-label={`Download ${doc.title}`}
                              onClick={() => handleDocumentDownload(doc)}
                              disabled={downloadingId === doc._id}
                            >
                              {downloadingId === doc._id ? (
                                <Loader2 className="size-4 animate-spin" aria-hidden />
                              ) : (
                                <Download className="size-4" aria-hidden />
                              )}
                              <span className="staff-docs-action-text">Download</span>
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            {totalPages > 1 && (
              <div className="staff-docs-pagination">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  onNextPage={nextPage}
                  onPrevPage={prevPage}
                  className="mt-6"
                />
              </div>
            )}
          </div>
        </div>

        {isWide ? (
          <aside className="staff-docs-aside" aria-label="Document details and recent files">
            {activeSidebarDoc ? (
              renderDetails(activeSidebarDoc, false)
            ) : (
              <DashboardSection title="Recent documents" icon={Clock} className="staff-docs-recent">
                <div className="staff-docs-recent-list">
                  {recentDocs.length === 0 ? (
                    <p className="staff-docs-note staff-docs-empty">No recent documents.</p>
                  ) : (
                    recentDocs.map((doc: any) => {
                      const kind = fileKind(doc);
                      return (
                        <button
                          key={doc._id}
                          type="button"
                          onClick={() => {
                            setActiveSidebarDoc(doc);
                            setIsPreviewOpen(true);
                          }}
                        >
                          <span className="staff-docs-kind" data-kind={kind.kind} aria-hidden>
                            {kind.label}
                          </span>
                          <span className="min-w-0">
                            <strong title={doc.title}>{doc.title}</strong>
                            <small>
                              <DualDateDisplay
                                isoDate={new Date(doc._creationTime).toISOString()}
                              />
                            </small>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </DashboardSection>
            )}
          </aside>
        ) : null}
      </div>

      <Dialog
        open={!!retentionDoc}
        onOpenChange={(open: boolean) => {
          if (!open && !retentionBusy) setRetentionDoc(null);
        }}
      >
        <DialogContent
          className="staff-docs-dialog max-w-lg"
          aria-labelledby="staff-docs-retention-title"
          aria-describedby="staff-docs-retention-description"
        >
          <DialogHeader>
            <DialogTitle id="staff-docs-retention-title">Document retention</DialogTitle>
            <DialogDescription id="staff-docs-retention-description">
              This form updates the policy name. The recorded retention date is read-only.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveRetentionPolicy} className="staff-docs-dialog-body">
            <div className="space-y-1">
              <label htmlFor="staff-docs-retention-policy">Policy name</label>
              <Input
                id="staff-docs-retention-policy"
                value={retentionPolicy}
                onChange={(event) => setRetentionPolicy(event.target.value)}
                required
                maxLength={200}
                disabled={retentionBusy}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="staff-docs-retention-date">Recorded retention date (read-only)</label>
              {retentionDoc?.retentionUntil ? (
                <>
                  <BsDateField
                    id="staff-docs-retention-date"
                    value={retentionDoc.retentionUntil}
                    readOnly
                    onDateChange={() => {}}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatNepalTimestamp(retentionDoc.retentionUntil, language)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No retention date was returned.</p>
              )}
            </div>
            {retentionError ? (
              <p role="alert" className="text-sm text-destructive">
                {retentionError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={retentionBusy}
                onClick={() => setRetentionDoc(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={retentionBusy}>
                {retentionBusy ? "Saving…" : "Save policy"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details dialog (narrower than 1280px) */}
      <Dialog open={detailsDialogOpen} onOpenChange={closeDetails}>
        <DialogContent
          className="staff-docs-dialog staff-docs-details-dialog"
          aria-labelledby="staff-docs-details-title"
        >
          {activeSidebarDoc ? renderDetails(activeSidebarDoc, true) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen && !!activeSidebarDoc} onOpenChange={closePreview}>
        <DialogContent
          className="staff-docs-dialog staff-docs-preview-dialog !bg-background"
          aria-labelledby="staff-docs-preview-title"
          aria-describedby="staff-docs-preview-description"
        >
          <DialogHeader>
            <h2 id="staff-docs-preview-title">{activeSidebarDoc?.title}</h2>
            <DialogDescription id="staff-docs-preview-description">
              {activeSidebarDoc
                ? previewKindLabel(classifyDocumentPreview(activeSidebarDoc))
                : "File"}{" "}
              · Version {activeSidebarDoc?.version}
            </DialogDescription>
          </DialogHeader>
          {activeSidebarDoc ? (
            <StaffDocumentViewer
              document={activeSidebarDoc}
              open={isPreviewOpen}
              onDownload={() => handleDocumentDownload(activeSidebarDoc)}
              downloading={downloadingId === activeSidebarDoc._id}
            />
          ) : null}
          <div className="staff-docs-dialog-actions">
            <Button type="button" variant="outline" onClick={closePreview}>
              Close
            </Button>
            <Button
              type="button"
              onClick={() => activeSidebarDoc && handleDocumentDownload(activeSidebarDoc)}
              disabled={!activeSidebarDoc || downloadingId === activeSidebarDoc._id}
            >
              {activeSidebarDoc && downloadingId === activeSidebarDoc._id ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Download className="size-4" aria-hidden />
              )}
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload / new version */}
      <Dialog open={isUploadOpen} onOpenChange={closeUpload}>
        <DialogContent
          className="staff-docs-dialog staff-docs-upload-dialog"
          aria-labelledby="staff-docs-upload-title"
          aria-describedby="staff-docs-upload-description"
        >
          <DialogHeader>
            <h2 id="staff-docs-upload-title">
              {parentDocumentId ? "Upload New Version" : "Upload Document"}
            </h2>
            <DialogDescription id="staff-docs-upload-description">
              Files up to 50 MB. New uploads are scanned before they are put on file.
            </DialogDescription>
          </DialogHeader>
          <div className="staff-docs-dialog-body">
            <div className="staff-docs-field">
              <label htmlFor="staff-docs-upload-file-button">Select File</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.tif,.tiff,.txt"
                ref={fileInputRef}
                className="hidden"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <Button
                id="staff-docs-upload-file-button"
                type="button"
                variant="outline"
                className="staff-docs-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" aria-hidden />
                <span className="truncate">
                  {selectedFile ? selectedFile.name : "Click to browse files..."}
                </span>
              </Button>
            </div>

            <div className="staff-docs-field">
              <label htmlFor="staff-docs-upload-case">Link to Case</label>
              <Select
                value={uploadCaseId}
                onValueChange={setUploadCaseId}
                disabled={!!parentDocumentId}
              >
                <SelectTrigger id="staff-docs-upload-case">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">No Case (General Firm File)</SelectItem>
                  {cases.map((c: any) => (
                    <SelectItem key={c._id} value={c._id}>
                      [{c.caseNumber}] {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="staff-docs-field-row">
              <div className="staff-docs-field">
                <label htmlFor="staff-docs-upload-type">Document Type</label>
                <Select
                  value={uploadType}
                  onValueChange={setUploadType}
                  disabled={!!parentDocumentId}
                >
                  <SelectTrigger id="staff-docs-upload-type" className="capitalize">
                    <SelectValue />
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
              <div className="staff-docs-field">
                <label htmlFor="staff-docs-upload-visibility">Visibility Status</label>
                <Select
                  value={isPrivileged ? "private" : "shared"}
                  onValueChange={(v) => setIsPrivileged(v === "private")}
                  disabled={!!parentDocumentId}
                >
                  <SelectTrigger id="staff-docs-upload-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shared">Client Viewable</SelectItem>
                    <SelectItem value="private">Internal Vault Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="staff-docs-dialog-actions">
            <Button type="button" variant="outline" onClick={closeUpload}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUploadSubmit}
              disabled={isUploading || !selectedFile}
            >
              {isUploading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-4" aria-hidden />
              )}
              {isUploading ? "Uploading..." : "Save Document"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature envelope */}
      <Dialog open={!!envelopeDoc} onOpenChange={closeEnvelope}>
        <DialogContent
          className="staff-docs-dialog staff-docs-envelope-dialog"
          aria-labelledby="staff-docs-envelope-title"
        >
          <DialogHeader>
            <DialogTitle id="staff-docs-envelope-title">Secure Signature Envelope</DialogTitle>
          </DialogHeader>
          <div className="staff-docs-dialog-body">
            <div className="staff-docs-target">
              <FileText className="size-7" aria-hidden />
              <div className="min-w-0">
                <p>Target Document</p>
                <strong>{envelopeDoc?.title}</strong>
              </div>
            </div>

            <div className="staff-docs-field">
              <label htmlFor="staff-docs-envelope-title-input">Envelope Title</label>
              {createdEnvelopeId && (
                <p className="staff-docs-note" role="status">
                  Draft created. Retrying sends this same envelope.
                </p>
              )}
              <Input
                id="staff-docs-envelope-title-input"
                disabled={isEnvelopeBusy || Boolean(createdEnvelopeId)}
                value={envelopeTitle}
                onChange={(e) => setEnvelopeTitle(e.target.value)}
              />
            </div>

            <div className="staff-docs-field-row">
              <div className="staff-docs-field">
                <label htmlFor="staff-docs-envelope-routing">Routing Rule</label>
                <Select
                  value={envelopeRouting}
                  disabled={isEnvelopeBusy || Boolean(createdEnvelopeId)}
                  onValueChange={(v) => setEnvelopeRouting(v as "sequential" | "parallel")}
                >
                  <SelectTrigger id="staff-docs-envelope-routing">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">Sequential (In Order)</SelectItem>
                    <SelectItem value="parallel">Parallel (All at Once)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="staff-docs-field locale-date-full-row">
                <label htmlFor="staff-docs-envelope-expires">Expiration Date</label>
                <BsDateField
                  id="staff-docs-envelope-expires"
                  disabled={isEnvelopeBusy || Boolean(createdEnvelopeId)}
                  value={envelopeExpires}
                  onDateChange={(e) => setEnvelopeExpires(e)}
                />
              </div>
            </div>

            <fieldset
              className="staff-docs-signers"
              disabled={isEnvelopeBusy || Boolean(createdEnvelopeId)}
            >
              <legend>Select Signers (Order matters for Sequential)</legend>
              {signers.length === 0 && <p className="staff-docs-note">No portal clients found.</p>}
              {signers.map((s: any) => {
                const selected = selectedSignerIds.includes(s._id);
                const order = selectedSignerIds.indexOf(s._id);
                return (
                  <div
                    key={s._id}
                    className="staff-docs-signer"
                    data-selected={selected || undefined}
                  >
                    <label>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSigner(s._id)}
                      />
                      <span className="min-w-0">
                        <strong>{s.name}</strong>
                        <small>
                          {s.role} · {s.email}
                        </small>
                      </span>
                    </label>
                    {selected && (
                      <div className="staff-docs-signer-order">
                        <span>#{order + 1}</span>
                        <button
                          type="button"
                          aria-label={`Move ${s.name} earlier`}
                          onClick={() => moveSigner(s._id, -1)}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${s.name} later`}
                          onClick={() => moveSigner(s._id, 1)}
                        >
                          ▼
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </fieldset>
          </div>
          <div className="staff-docs-dialog-actions">
            <Button
              type="button"
              variant="outline"
              onClick={closeEnvelope}
              disabled={isEnvelopeBusy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateAndSendEnvelope}
              disabled={isEnvelopeBusy || selectedSignerIds.length === 0}
            >
              {isEnvelopeBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              {createdEnvelopeId ? "Retry Send Envelope" : "Send Envelope"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isTagsModalOpen ? (
        <TagManagementModal isOpen onClose={() => setIsTagsModalOpen(false)} />
      ) : null}
      {isTemplateModalOpen ? (
        <TemplateGeneratorModal isOpen onClose={() => setIsTemplateModalOpen(false)} />
      ) : null}
      {isShareModalOpen ? (
        <DocumentShareModal
          isOpen
          onClose={() => setIsShareModalOpen(false)}
          document={activeSidebarDoc}
        />
      ) : null}
    </PortalPageShell>
  );
}
