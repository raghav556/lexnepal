import { useState, useEffect, useRef } from "react";

import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  FileText,
  Upload,
  Search,
  Filter,
  Download,
  Loader2,
  Plus,
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
import { MultiFileUploadModal } from "@/components/documents/MultiFileUploadModal.tsx";
import { AdvancedSearch } from "@/components/documents/AdvancedSearch.tsx";
import { TagManagementModal } from "@/components/documents/TagManagementModal.tsx";
import { TemplateGeneratorModal } from "@/components/documents/TemplateGeneratorModal.tsx";
import { DocumentShareModal } from "@/components/documents/DocumentShareModal.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useMutation } from "@/client/data/convex-bridge.ts";
import { api } from "@/convex/_generated/api.js";
import { useCases } from "@/client/queries/cases";
import {
  useDocuments,
  useDocumentSearch,
  useRecentDocuments,
  useUploadDocument,
  useTrashDocument,
  useRestoreDocument,
  useHardDeleteDocument,
  useSetLegalHold,
  useUpdateDocument,
} from "@/client/queries/documents";
import {
  usePortalSigners,
  useCreateEnvelope,
  useSendEnvelope,
  useRequestSignature,
} from "@/client/queries/envelopes";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { format } from "date-fns";

const TYPE_COLORS: Record<string, string> = {
  pleading:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  evidence:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  contract:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  affidavit:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  correspondence:
    "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  other:
    "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

const DOC_TYPES = [
  "pleading",
  "affidavit",
  "contract",
  "poa",
  "correspondence",
  "evidence",
  "other",
];

export default function StaffDocumentsPage() {
  const [searchFilters, setSearchFilters] = useState<{
    query: string;
    caseId?: string;
    type?: string;
    tag?: string;
    generalOnly?: boolean;
  }>({ query: "" });
  const [viewMode, setViewMode] = useState<"list" | "folders" | "trash">("list");

  const searchResults = useDocumentSearch(searchFilters.query ? searchFilters : null) || [];
  const listResults = useDocuments({ isTemplate: false, inTrash: viewMode === "trash" }) || [];
  const cases = useCases({}) || [];

  const allDocs = searchFilters.query ? searchResults : listResults;
  const recentDocs = useRecentDocuments(5) || [];
  const signers = usePortalSigners();

  const uploadDocument = useUploadDocument();
  const requestSignature = useRequestSignature();
  const createEnvelope = useCreateEnvelope();
  const sendEnvelope = useSendEnvelope();
  const triggerOCR = useMutation(api.documents.triggerOCR);
  const softDeleteDoc = useTrashDocument();
  const restoreDoc = useRestoreDocument();
  const hardDeleteDoc = useHardDeleteDocument();
  const setLegalHold = useSetLegalHold();
  const updateDocument = useUpdateDocument();
  const setRetention = async (args: any) =>
    updateDocument({ id: args.documentId, updates: { retentionPolicy: args.policy } });

  // States
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedSubFolder, setSelectedSubFolder] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [activeSidebarDoc, setActiveSidebarDoc] = useState<any | null>(null);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [envelopeDoc, setEnvelopeDoc] = useState<any>(null);

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

  const isLoading = allDocs === undefined || cases === undefined;

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
      if (selectedFolder !== null && d.caseId !== selectedFolder) return false;
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
    if (selectedDocs.length === paginatedItems.length) setSelectedDocs([]);
    else setSelectedDocs(paginatedItems.map((d: any) => d._id));
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
      await uploadDocument({
        file: selectedFile,
        caseId: uploadCaseId === "general" ? undefined : uploadCaseId,
        title: selectedFile.name,
        type: uploadType,
        tags: ["new"],
        isTemplate: false,
        isPrivileged,
        parentDocumentId: parentDocumentId || undefined,
      });
      toast.success(
        parentDocumentId
          ? "New version uploaded and quarantined for scanning."
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
      toast.success("Sent for signature — client notified.");
    } catch (err: any) {
      toast.error(err?.message || "Could not request signature.");
    } finally {
      setRequestingId(null);
    }
  };

  const openEnvelopeModal = (doc: any) => {
    setEnvelopeDoc(doc);
    setEnvelopeTitle(doc.title);
    setEnvelopeRouting("sequential");
    setEnvelopeExpires("");
    const matchedCase = cases.find((c: any) => c._id === doc.caseId);
    const clientSigner = signers.find((s: any) => s.role === "client");
    setSelectedSignerIds(matchedCase && clientSigner ? [clientSigner._id] : []);
  };

  const handleCreateAndSendEnvelope = async () => {
    if (!envelopeDoc) return;
    if (selectedSignerIds.length === 0) return toast.error("Select at least one signer.");
    setIsEnvelopeBusy(true);
    try {
      const { envelopeId } = await createEnvelope({
        documentId: envelopeDoc._id,
        title: envelopeTitle.trim() || envelopeDoc.title,
        routing: envelopeRouting,
        expiresAt: envelopeExpires ? new Date(envelopeExpires).toISOString() : undefined,
        recipientUserIds: selectedSignerIds as any,
      });
      await sendEnvelope({ envelopeId });
      toast.success("Envelope sent to signers.");
      setEnvelopeDoc(null);
    } catch (err: any) {
      toast.error(err?.message || "Could not create envelope.");
    } finally {
      setIsEnvelopeBusy(false);
    }
  };

  const handleBulkDownload = () => {
    if (selectedDocs.length === 0) return;
    toast.success(`Zipping and downloading ${selectedDocs.length} files... (Simulated)`);
    setSelectedDocs([]);
  };

  const handleOCR = async (doc: any) => {
    try {
      toast.loading("Extracting text...", { id: "ocr" });
      await triggerOCR({ documentId: doc._id });
      toast.success("Text extracted for global search!", { id: "ocr" });
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

  const handleRetention = async (doc: any) => {
    const policy = window.prompt(
      "Retention policy name:",
      doc.retentionPolicy || "Corporate legal record",
    );
    if (!policy?.trim()) return;
    const retentionUntil = window.prompt(
      "Retain until (YYYY-MM-DD):",
      doc.retentionUntil?.slice(0, 10) || "",
    );
    if (!retentionUntil) return;
    try {
      await setRetention({
        documentId: doc._id,
        policy: policy.trim(),
        retentionUntil: new Date(retentionUntil).toISOString(),
      });
      toast.success("Retention policy applied.");
    } catch (err: any) {
      toast.error(err?.message || "Could not set retention.");
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

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden font-sans bg-background/50 relative">
      <div
        className={`flex-1 flex flex-col transition-all duration-300 w-full ${activeSidebarDoc ? "mr-[350px] pr-[350px]" : ""}`}
      >
        <div className="p-4 sm:p-6 border-b border-border bg-card shadow-xs z-10 flex flex-col gap-4 sticky top-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">Vault & Documents</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Advanced paperless document management.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsTagsModalOpen(true)}
                className="shadow-xs bg-secondary/50 hover:bg-secondary"
              >
                <Tags className="w-4 h-4 mr-2" /> Tags
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsTemplateModalOpen(true)}
                className="shadow-xs bg-secondary/50 hover:bg-secondary"
              >
                <LayoutTemplate className="w-4 h-4 mr-2" /> Use Template
              </Button>
              <Button size="sm" onClick={openNewUpload} className="shadow-xs hover:shadow-sm">
                <Upload className="w-4 h-4 mr-2" /> Upload File
              </Button>
            </div>
          </div>

          <div className="flex bg-secondary/50 p-1 rounded-lg w-fit">
            <button
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === "list" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => {
                setViewMode("list");
                setSelectedFolder(null);
                setSelectedSubFolder(null);
              }}
            >
              List View
            </button>
            <button
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === "folders" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => {
                setViewMode("folders");
                setSelectedSubFolder(null);
              }}
            >
              Folders
            </button>
            <button
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === "trash" ? "bg-destructive/10 text-destructive shadow-xs" : "text-muted-foreground hover:text-destructive"}`}
              onClick={() => {
                setViewMode("trash");
                setSelectedFolder(null);
                setSelectedSubFolder(null);
              }}
            >
              Trash
            </button>
          </div>

          <AdvancedSearch cases={cases} onSearch={setSearchFilters} />

          {viewMode === "folders" && !selectedFolder && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
              <button
                onClick={() => setSelectedFolder("general")}
                className="p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 hover:border-primary/50 transition-all text-left flex items-start gap-3 group"
              >
                <Folder className="w-8 h-8 text-primary/70 group-hover:text-primary transition-colors shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm">Firm General</h3>
                  <p className="text-xs text-muted-foreground">Internal Documents</p>
                </div>
              </button>
              {cases.map((c: any) => (
                <button
                  key={c._id}
                  onClick={() => setSelectedFolder(c._id)}
                  className="p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 hover:border-primary/50 transition-all text-left flex items-start gap-3 group"
                >
                  <Folder className="w-8 h-8 text-primary/70 group-hover:text-primary transition-colors shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate" title={c.title}>
                      {c.caseNumber}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate" title={c.title}>
                      {c.title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {viewMode === "folders" && selectedFolder && !selectedSubFolder && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-right-2">
              {DOC_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedSubFolder(t)}
                  className="p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 hover:border-primary/50 transition-all text-left flex items-start gap-3 group"
                >
                  <Folder
                    className={`w-8 h-8 group-hover:scale-110 transition-transform shrink-0 ${TYPE_COLORS[t]?.split(" ")[0]?.replace("bg-", "text-").replace("-100", "-500") || "text-primary"}`}
                  />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm capitalize">{t}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                      Sub-Folder
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {(viewMode !== "folders" || selectedSubFolder) && (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {viewMode === "folders" && selectedFolder && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSubFolder(null)}
                  className="shrink-0 h-9 bg-secondary/50"
                >
                  &larr; Back to {selectedFolder === "general" ? "Firm General" : "Case"}
                </Button>
              )}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[160px] h-9 text-sm bg-secondary/50">
                  <Filter className="w-3.5 h-3.5 mr-2" /> <SelectValue placeholder="All Types" />
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

              {selectedDocs.length > 0 && viewMode !== "trash" && (
                <div className="flex items-center gap-2 ml-auto animate-in fade-in zoom-in-95">
                  <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-md">
                    {selectedDocs.length} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 bg-secondary/50"
                    onClick={handleBulkDownload}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Download Zip
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => handleArchive(selectedDocs)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Archive
                  </Button>
                </div>
              )}

              {selectedDocs.length > 0 && viewMode === "trash" && (
                <div className="flex items-center gap-2 ml-auto animate-in fade-in zoom-in-95">
                  <span className="text-xs font-semibold px-2 py-1 bg-destructive/10 text-destructive rounded-md">
                    {selectedDocs.length} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-emerald-600 border-emerald-600/30 hover:bg-emerald-600/10"
                    onClick={() => handleRestore(selectedDocs)}
                  >
                    Restore
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => handleHardDelete(selectedDocs)}
                  >
                    Delete Permanently
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6 pb-24 flex gap-6">
          <div className="flex-1 min-w-0">
            {viewMode === "folders" && !selectedFolder ? (
              <Empty className="bg-card shadow-xs rounded-xl border border-border py-12">
                <EmptyHeader>
                  <Folder className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <EmptyTitle>Select a Case Folder</EmptyTitle>
                  <EmptyDescription>
                    Choose a case folder above to view its document types.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : viewMode === "folders" && selectedFolder && !selectedSubFolder ? (
              <Empty className="bg-card shadow-xs rounded-xl border border-border py-12">
                <EmptyHeader>
                  <Folder className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <EmptyTitle>Select a Sub-Folder</EmptyTitle>
                  <EmptyDescription>
                    Choose a document type sub-folder to view its files.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : paginatedItems.length === 0 ? (
              <Empty className="bg-card shadow-xs rounded-xl border border-border py-12">
                <EmptyHeader>
                  <Folder className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <EmptyTitle>Vault is Empty</EmptyTitle>
                  <EmptyDescription>No documents match your search or filter.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-[11px] font-semibold text-muted-foreground uppercase bg-secondary/80 border-b border-border tracking-wider">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          className="accent-primary w-3.5 h-3.5"
                          checked={
                            selectedDocs.length > 0 && selectedDocs.length === paginatedItems.length
                          }
                          onChange={selectAll}
                        />
                      </th>
                      <th className="p-3">Document Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Case Reference</th>
                      <th className="p-3">Date Modified</th>
                      <th className="p-3 text-right">Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {paginatedItems.map((doc: any) => {
                      const matchedCase = cases.find((c: any) => c._id === doc.caseId);
                      const isSelected = selectedDocs.includes(doc._id);
                      return (
                        <tr
                          key={doc._id}
                          className={`hover:bg-secondary/40 transition-colors cursor-pointer group ${activeSidebarDoc?._id === doc._id ? "bg-primary/5 hover:bg-primary/10" : ""} ${isSelected ? "bg-secondary" : ""}`}
                          onClick={() => setActiveSidebarDoc(doc)}
                        >
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="accent-primary w-3.5 h-3.5"
                              checked={isSelected}
                              onChange={() => toggleDocSelection(doc._id)}
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="font-medium text-foreground max-w-[200px] sm:max-w-[300px] lg:max-w-[400px] truncate flex items-center gap-2">
                                {doc.title}
                                {doc.isPrivileged && (
                                  <Lock className="w-3 h-3 text-red-500 shrink-0" />
                                )}
                                {doc.uploadStatus && doc.uploadStatus !== "clean" && (
                                  <Badge variant="outline" className="text-[9px] capitalize">
                                    {doc.uploadStatus}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`capitalize text-[10px] font-semibold border ${TYPE_COLORS[doc.type] || TYPE_COLORS.other}`}
                            >
                              {doc.type}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground text-xs font-mono">
                            {matchedCase?.caseNumber || "Firm General"}
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {format(new Date(doc._creationTime), "MMM d, yyyy")}
                          </td>
                          <td className="p-3 text-muted-foreground text-xs text-right">
                            {(doc.sizeBytes / 1024).toFixed(0)} KB
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                onNextPage={nextPage}
                onPrevPage={prevPage}
                className="mt-6"
              />
            )}
          </div>

          <div className="hidden xl:flex flex-col w-72 shrink-0 gap-4 mt-6">
            <div className="border rounded-xl bg-background overflow-hidden shadow-xs h-fit sticky top-4">
              <div className="bg-secondary/50 p-3 border-b border-border/50">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Recently Viewed / Modified
                </h3>
              </div>
              <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                {recentDocs.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-4 text-center">
                    No recent documents.
                  </p>
                ) : (
                  recentDocs.map((doc: any) => (
                    <button
                      key={doc._id}
                      onClick={() => {
                        setActiveSidebarDoc(doc);
                        setIsPreviewOpen(true);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-secondary/80 transition-colors group flex gap-3 items-start"
                    >
                      <div
                        className={`p-1.5 rounded bg-background shadow-xs border shrink-0 ${TYPE_COLORS[doc.type] || TYPE_COLORS.other}`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                          {doc.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {format(new Date(doc._creationTime), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`fixed top-0 right-0 h-full w-[350px] bg-card border-l border-border shadow-2xl transition-transform duration-300 ease-out z-20 overflow-y-auto ${activeSidebarDoc ? "translate-x-0" : "translate-x-full"}`}
      >
        {activeSidebarDoc &&
          (() => {
            const doc = activeSidebarDoc;
            const matchedCase = cases.find((c: any) => c._id === doc.caseId);
            const sizeStr = (doc.sizeBytes / 1024).toFixed(0) + " KB";
            return (
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-xs border border-primary/20">
                    <FileText className="w-6 h-6" />
                  </div>
                  <button
                    onClick={() => setActiveSidebarDoc(null)}
                    className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-foreground break-words leading-tight">
                    {doc.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge
                      variant="outline"
                      className={`capitalize text-[10px] ${TYPE_COLORS[doc.type] || TYPE_COLORS.other}`}
                    >
                      {doc.type}
                    </Badge>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary text-muted-foreground uppercase tracking-wide">
                      Version {doc.version}
                    </span>
                    {doc.isPrivileged && (
                      <Badge className="bg-red-100 text-red-800 text-[10px] border border-red-200">
                        Internal Vault
                      </Badge>
                    )}
                    {doc.isOnLegalHold && (
                      <Badge className="bg-amber-100 text-amber-800 text-[10px] border border-amber-200">
                        Legal Hold
                      </Badge>
                    )}
                    {doc.retentionUntil && (
                      <Badge variant="outline" className="text-[10px]">
                        Retain until {doc.retentionUntil.slice(0, 10)}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm bg-secondary/30 p-4 rounded-xl border border-border/50">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Uploaded On
                    </p>
                    <p className="font-medium text-foreground text-xs">
                      {format(new Date(doc._creationTime), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      File Size
                    </p>
                    <p className="font-medium text-foreground text-xs">{sizeStr}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Case Link
                    </p>
                    <p className="font-medium text-primary text-xs hover:underline cursor-pointer">
                      {matchedCase
                        ? `[${matchedCase.caseNumber}] ${matchedCase.title}`
                        : "Firm General File"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button className="w-full shadow-xs" onClick={() => setIsPreviewOpen(true)}>
                    <Eye className="w-4 h-4 mr-2" /> Open Previewer
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full bg-card"
                    onClick={() => setIsShareModalOpen(true)}
                  >
                    <Link2 className="w-4 h-4 mr-2" /> Share External Link
                  </Button>
                  {(doc.mimeType?.includes("pdf") || doc.mimeType?.includes("image")) &&
                    !doc.searchableText && (
                      <Button
                        variant="outline"
                        className="w-full bg-card"
                        onClick={() => handleOCR(doc)}
                      >
                        <ScanText className="w-4 h-4 mr-2" /> Extract Text (OCR)
                      </Button>
                    )}
                  <Button
                    variant="outline"
                    className="w-full bg-card"
                    onClick={() => toast.success("Downloading...")}
                  >
                    <Download className="w-4 h-4 mr-2" /> Download Document
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => openVersionUpload(doc)}
                  >
                    <Upload className="w-4 h-4 mr-2" /> Upload New Version
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="bg-card text-xs"
                      onClick={() => handleLegalHold(doc)}
                    >
                      <Lock className="w-3.5 h-3.5 mr-1.5" />{" "}
                      {doc.isOnLegalHold ? "Release Hold" : "Legal Hold"}
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-card text-xs"
                      onClick={() => handleRetention(doc)}
                    >
                      <Clock className="w-3.5 h-3.5 mr-1.5" /> Retention
                    </Button>
                  </div>
                </div>

                <div className="bg-secondary/20 rounded-xl p-4 border border-border space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <PenTool className="w-3.5 h-3.5" /> E-Signature Hub
                  </h4>
                  {doc.signatureStatus === "signed" ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 w-full justify-center py-1.5 shadow-xs">
                      Completed & Secured
                    </Badge>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs bg-card"
                        onClick={() => handleRequestSignature(doc)}
                        disabled={!!requestingId || doc.isPrivileged}
                      >
                        Quick Sign
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs bg-card"
                        onClick={() => openEnvelopeModal(doc)}
                        disabled={doc.isPrivileged}
                      >
                        Create Envelope
                      </Button>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2 mb-4">
                    <History className="w-3.5 h-3.5 text-primary" /> Version History
                  </h4>
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-1.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[2px] before:bg-border">
                    <div className="relative flex items-start justify-between pl-6 before:absolute before:left-0 before:top-1.5 before:w-3.5 before:h-3.5 before:bg-primary before:rounded-full before:border-2 before:border-background">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Version {doc.version} (Current)
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {format(new Date(doc._creationTime), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                    </div>
                    {doc.version > 1 && (
                      <div className="relative flex items-center justify-between pl-6 before:absolute before:left-0 before:top-1.5 before:w-3.5 before:h-3.5 before:bg-secondary before:border-2 before:border-border before:rounded-full">
                        <div>
                          <p className="text-sm font-medium text-foreground/70">
                            Version {doc.version - 1}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Previous upload
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs border border-border bg-card"
                          onClick={() =>
                            toast.success(`Restoring Version ${doc.version - 1}... (Simulated)`)
                          }
                        >
                          Restore
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
      </div>

      {isPreviewOpen && activeSidebarDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 sm:p-10 animate-in fade-in-20 backdrop-blur-sm">
          <div className="bg-card w-full h-full max-w-6xl rounded-xl shadow-2xl flex flex-col overflow-hidden border border-border scale-in-95">
            <div className="flex items-center justify-between p-4 bg-secondary/30 border-b border-border shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">{activeSidebarDoc.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    Previewing active version {activeSidebarDoc.version}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card"
                  onClick={() => toast.success("Downloading...")}
                >
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-muted/40 flex items-center justify-center relative overflow-hidden p-6">
              <div className="w-full max-w-[800px] h-full max-h-[1100px] bg-background shadow-xl border border-border p-12 overflow-y-auto rounded-lg">
                <div className="w-1/3 h-8 bg-secondary/50 rounded-md mb-8"></div>
                <div className="w-full h-4 bg-secondary/30 rounded-md mb-4"></div>
                <div className="w-full h-4 bg-secondary/30 rounded-md mb-4"></div>
                <div className="w-5/6 h-4 bg-secondary/30 rounded-md mb-10"></div>
                <div className="w-4/6 h-4 bg-secondary/30 rounded-md mb-4"></div>
                <div className="w-full h-4 bg-secondary/30 rounded-md mb-4"></div>
                <div className="w-full h-4 bg-secondary/30 rounded-md mb-4"></div>
                <div className="w-3/4 h-4 bg-secondary/30 rounded-md mb-10"></div>

                <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-md">
                  <div className="bg-card p-8 rounded-2xl shadow-2xl border border-border/60 text-center max-w-sm">
                    <div className="w-20 h-20 bg-primary/10 text-primary flex items-center justify-center rounded-full mx-auto mb-4 border border-primary/20">
                      <Eye className="w-8 h-8" />
                    </div>
                    <h4 className="font-serif font-bold text-2xl text-foreground">
                      Document Viewer
                    </h4>
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                      In a production environment, this frame natively renders PDFs, Word Docs, and
                      images without requiring a download.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in-20">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 scale-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-xl font-bold text-foreground">
                {parentDocumentId ? "Upload New Version" : "Upload Document"}
              </h3>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Select File
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.tif,.tiff,.txt"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <Button
                  variant="outline"
                  className="w-full justify-start text-muted-foreground font-normal bg-secondary/30 h-12 border-dashed border-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-3 text-primary" />
                  <span className="truncate">
                    {selectedFile ? selectedFile.name : "Click to browse files..."}
                  </span>
                </Button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Link to Case
                </label>
                <Select
                  value={uploadCaseId}
                  onValueChange={setUploadCaseId}
                  disabled={!!parentDocumentId}
                >
                  <SelectTrigger className="h-10 bg-secondary/20">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Document Type
                  </label>
                  <Select
                    value={uploadType}
                    onValueChange={setUploadType}
                    disabled={!!parentDocumentId}
                  >
                    <SelectTrigger className="capitalize h-10 bg-secondary/20">
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
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Visibility Status
                  </label>
                  <Select
                    value={isPrivileged ? "private" : "shared"}
                    onValueChange={(v) => setIsPrivileged(v === "private")}
                    disabled={!!parentDocumentId}
                  >
                    <SelectTrigger className="h-10 bg-secondary/20">
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

            <div className="flex gap-3 pt-4 border-t border-border mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 shadow-md shadow-primary/20"
                onClick={handleUploadSubmit}
                disabled={isUploading || !selectedFile}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {isUploading ? "Uploading..." : "Save Document"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!envelopeDoc} onOpenChange={() => setEnvelopeDoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Secure Signature Envelope</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-secondary/30 p-3 rounded-lg flex items-center gap-3 border border-border/50">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                  Target Document
                </p>
                <p className="text-sm font-semibold">{envelopeDoc?.title}</p>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Envelope Title
              </label>
              <Input
                className="h-10 bg-secondary/20"
                value={envelopeTitle}
                onChange={(e) => setEnvelopeTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Routing Rule
                </label>
                <Select
                  value={envelopeRouting}
                  onValueChange={(v) => setEnvelopeRouting(v as "sequential" | "parallel")}
                >
                  <SelectTrigger className="h-10 bg-secondary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">Sequential (In Order)</SelectItem>
                    <SelectItem value="parallel">Parallel (All at Once)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Expiration Date
                </label>
                <Input
                  type="date"
                  className="h-10 bg-secondary/20"
                  value={envelopeExpires}
                  onChange={(e) => setEnvelopeExpires(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                Select Signers (Order matters for Sequential)
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border/50 rounded-lg p-2 bg-secondary/10">
                {signers.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">No portal clients found.</p>
                )}
                {signers.map((s: any) => {
                  const selected = selectedSignerIds.includes(s._id);
                  const order = selectedSignerIds.indexOf(s._id);
                  return (
                    <div
                      key={s._id}
                      className={`flex items-center gap-3 text-sm py-2 px-3 rounded-md transition-colors ${selected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/40 border border-transparent"}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSigner(s._id)}
                        className="accent-primary w-4 h-4 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {s.role} · {s.email}
                        </p>
                      </div>
                      {selected && (
                        <div className="flex items-center gap-1 bg-background rounded-md px-1 py-0.5 shadow-xs border border-border">
                          <span className="text-[10px] font-bold text-primary px-1">
                            #{order + 1}
                          </span>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              className="text-[10px] text-muted-foreground hover:text-foreground leading-none px-1"
                              onClick={() => moveSigner(s._id, -1)}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              className="text-[10px] text-muted-foreground hover:text-foreground leading-none px-1"
                              onClick={() => moveSigner(s._id, 1)}
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEnvelopeDoc(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 shadow-md shadow-primary/20"
                onClick={handleCreateAndSendEnvelope}
                disabled={isEnvelopeBusy || selectedSignerIds.length === 0}
              >
                {isEnvelopeBusy ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Envelope
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <TagManagementModal isOpen={isTagsModalOpen} onClose={() => setIsTagsModalOpen(false)} />
      <TemplateGeneratorModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />
      <DocumentShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        document={activeSidebarDoc}
      />
    </div>
  );
}
