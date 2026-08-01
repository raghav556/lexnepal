import { useState, useEffect, useRef } from "react";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { 
  FileText, Upload, Search, Filter, Download, Loader2, Plus, X, 
  Lock, PenTool, Send, Eye, Folder, History, Trash2
} from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { format } from "date-fns";

const TYPE_COLORS: Record<string, string> = {
  pleading:       "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  evidence:       "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  contract:       "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  affidavit:      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  correspondence: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  other:          "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

const DOC_TYPES = ["pleading", "affidavit", "contract", "poa", "correspondence", "evidence", "other"];

export default function StaffDocumentsPage() {
  const allDocs = useQuery(api.documents.listDocuments, { isTemplate: false }) || [];
  const cases = useQuery(api.cases.listCases, {}) || [];
  const signers = useQuery(api.envelopes.listPortalSigners, {}) || [];
  const envelopes = useQuery(api.envelopes.listEnvelopes, {}) || [];

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.createDocument);
  const requestSignature = useMutation(api.documents.requestSignature);
  const createEnvelope = useMutation(api.envelopes.createEnvelope);
  const sendEnvelope = useMutation(api.envelopes.sendEnvelope);

  // States
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [activeSidebarDoc, setActiveSidebarDoc] = useState<any | null>(null);
  
  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
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
  const filteredDocs = allDocs.filter((d: any) => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== "all" && d.type !== filterType) return false;
    return true;
  });

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, prevPage, resetPagination } = usePagination(filteredDocs, 12);

  useEffect(() => { resetPagination(); }, [search, filterType]);

  const toggleDocSelection = (id: string) => {
    setSelectedDocs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
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
    setIsUploading(true);
    try {
      const postUrl = await generateUploadUrl();
      let storageId = "";
      if (postUrl === "mock-upload-url") {
        storageId = URL.createObjectURL(selectedFile); 
      } else {
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type || "application/octet-stream" },
          body: selectedFile,
        });
        if (!result.ok) throw new Error("Upload failed");
        storageId = (await result.json()).storageId;
      }
      await createDocument({
        caseId: uploadCaseId === "general" ? undefined : uploadCaseId as any,
        title: selectedFile.name,
        type: uploadType as any,
        storageId,
        mimeType: selectedFile.type || "application/octet-stream",
        sizeBytes: selectedFile.size,
        tags: ["new"],
        isTemplate: false,
        isPrivileged,
        ...(parentDocumentId ? { parentDocumentId: parentDocumentId as any } : {})
      });
      toast.success(parentDocumentId ? "New version uploaded." : "Document uploaded successfully.");
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
    setEnvelopeDoc(doc); setEnvelopeTitle(doc.title); setEnvelopeRouting("sequential"); setEnvelopeExpires("");
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
    if(selectedDocs.length === 0) return;
    toast.success(`Zipping and downloading ${selectedDocs.length} files... (Simulated)`);
    setSelectedDocs([]);
  };
  
  const toggleSigner = (userId: string) => {
    setSelectedSignerIds((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
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
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden font-sans bg-background/50 relative">
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 w-full ${activeSidebarDoc ? 'mr-[350px] pr-[350px]' : ''}`}>
        
        {/* Header & Toolbar */}
        <div className="p-4 sm:p-6 border-b border-border bg-card shadow-xs z-10 flex flex-col gap-4 sticky top-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">Vault & Documents</h1>
              <p className="text-sm text-muted-foreground mt-1">Advanced paperless document management.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={openNewUpload} className="shadow-xs hover:shadow-sm">
                <Upload className="w-4 h-4 mr-2" /> Upload File
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
             <div className="relative flex-1 w-full max-w-md">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
               <Input className="pl-9 h-9 text-sm" placeholder="Search across documents..." value={search} onChange={(e) => setSearch(e.target.value)} />
             </div>
             <Select value={filterType} onValueChange={setFilterType}>
               <SelectTrigger className="w-[160px] h-9 text-sm bg-secondary/50">
                 <Filter className="w-3.5 h-3.5 mr-2" /> <SelectValue placeholder="All Types" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Types</SelectItem>
                 {DOC_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
               </SelectContent>
             </Select>
             
             {selectedDocs.length > 0 && (
               <div className="flex items-center gap-2 ml-auto animate-in fade-in zoom-in-95">
                 <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-md">{selectedDocs.length} selected</span>
                 <Button variant="outline" size="sm" className="h-9 px-3 bg-secondary/50" onClick={handleBulkDownload}>
                   <Download className="w-3.5 h-3.5 mr-1.5" /> Download Zip
                 </Button>
                 <Button variant="outline" size="sm" className="h-9 px-3 text-destructive border-destructive/30 hover:bg-destructive/10">
                   <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Archive
                 </Button>
               </div>
             )}
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 pb-24">
          {paginatedItems.length === 0 ? (
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
                      <input type="checkbox" className="accent-primary w-3.5 h-3.5" checked={selectedDocs.length > 0 && selectedDocs.length === paginatedItems.length} onChange={selectAll} />
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
                        className={`hover:bg-secondary/40 transition-colors cursor-pointer group ${activeSidebarDoc?._id === doc._id ? 'bg-primary/5 hover:bg-primary/10' : ''} ${isSelected ? 'bg-secondary' : ''}`}
                        onClick={() => setActiveSidebarDoc(doc)}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="accent-primary w-3.5 h-3.5" checked={isSelected} onChange={() => toggleDocSelection(doc._id)} />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="font-medium text-foreground max-w-[200px] sm:max-w-[300px] lg:max-w-[400px] truncate flex items-center gap-2">
                              {doc.title}
                              {doc.isPrivileged && <Lock className="w-3 h-3 text-red-500 shrink-0" />}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={`capitalize text-[10px] font-semibold border ${TYPE_COLORS[doc.type] || TYPE_COLORS.other}`}>
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
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} onNextPage={nextPage} onPrevPage={prevPage} className="mt-6" />
          )}
        </div>
      </div>

      {/* Right Sidebar - Document Details */}
      <div 
        className={`fixed top-0 right-0 h-full w-[350px] bg-card border-l border-border shadow-2xl transition-transform duration-300 ease-out z-20 overflow-y-auto ${activeSidebarDoc ? "translate-x-0" : "translate-x-full"}`}
      >
        {activeSidebarDoc && (() => {
           const doc = activeSidebarDoc;
           const matchedCase = cases.find((c: any) => c._id === doc.caseId);
           const sizeStr = (doc.sizeBytes / 1024).toFixed(0) + " KB";
           return (
             <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-xs border border-primary/20">
                    <FileText className="w-6 h-6" />
                  </div>
                  <button onClick={() => setActiveSidebarDoc(null)} className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div>
                  <h3 className="font-bold text-lg text-foreground break-words leading-tight">{doc.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge variant="outline" className={`capitalize text-[10px] ${TYPE_COLORS[doc.type] || TYPE_COLORS.other}`}>{doc.type}</Badge>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary text-muted-foreground uppercase tracking-wide">Version {doc.version}</span>
                    {doc.isPrivileged && <Badge className="bg-red-100 text-red-800 text-[10px] border border-red-200">Internal Vault</Badge>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm bg-secondary/30 p-4 rounded-xl border border-border/50">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Uploaded On</p>
                    <p className="font-medium text-foreground text-xs">{format(new Date(doc._creationTime), "MMM d, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">File Size</p>
                    <p className="font-medium text-foreground text-xs">{sizeStr}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Case Link</p>
                    <p className="font-medium text-primary text-xs hover:underline cursor-pointer">{matchedCase ? `[${matchedCase.caseNumber}] ${matchedCase.title}` : "Firm General File"}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Button className="w-full shadow-xs" onClick={() => setIsPreviewOpen(true)}>
                    <Eye className="w-4 h-4 mr-2" /> Open Previewer
                  </Button>
                  <Button variant="outline" className="w-full bg-card" onClick={() => toast.success("Downloading...")}>
                    <Download className="w-4 h-4 mr-2" /> Download Document
                  </Button>
                  <Button variant="secondary" className="w-full" onClick={() => openVersionUpload(doc)}>
                    <Upload className="w-4 h-4 mr-2" /> Upload New Version
                  </Button>
                </div>

                {/* Signature Block */}
                <div className="bg-secondary/20 rounded-xl p-4 border border-border space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <PenTool className="w-3.5 h-3.5" /> E-Signature Hub
                  </h4>
                  {doc.signatureStatus === "signed" ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 w-full justify-center py-1.5 shadow-xs">Completed & Secured</Badge>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs bg-card" onClick={() => handleRequestSignature(doc)} disabled={!!requestingId || doc.isPrivileged}>
                         Quick Sign
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 text-xs bg-card" onClick={() => openEnvelopeModal(doc)} disabled={doc.isPrivileged}>
                         Create Envelope
                      </Button>
                    </div>
                  )}
                </div>

                {/* Version History Timeline */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2 mb-4">
                    <History className="w-3.5 h-3.5 text-primary" /> Version History
                  </h4>
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-1.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[2px] before:bg-border">
                    <div className="relative flex items-start justify-between pl-6 before:absolute before:left-0 before:top-1.5 before:w-3.5 before:h-3.5 before:bg-primary before:rounded-full before:border-2 before:border-background">
                       <div>
                         <p className="text-sm font-semibold text-foreground">Version {doc.version} (Current)</p>
                         <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{format(new Date(doc._creationTime), "MMM d, yyyy h:mm a")}</p>
                       </div>
                    </div>
                    {doc.version > 1 && (
                      <div className="relative flex items-center justify-between pl-6 before:absolute before:left-0 before:top-1.5 before:w-3.5 before:h-3.5 before:bg-secondary before:border-2 before:border-border before:rounded-full">
                         <div>
                           <p className="text-sm font-medium text-foreground/70">Version {doc.version - 1}</p>
                           <p className="text-[11px] text-muted-foreground mt-0.5">Previous upload</p>
                         </div>
                         <Button variant="ghost" size="sm" className="h-7 px-2 text-xs border border-border bg-card">Restore</Button>
                      </div>
                    )}
                  </div>
                </div>

             </div>
           );
        })()}
      </div>

      {/* In-App Preview Modal */}
      {isPreviewOpen && activeSidebarDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 sm:p-10 animate-in fade-in-20 backdrop-blur-sm">
           <div className="bg-card w-full h-full max-w-6xl rounded-xl shadow-2xl flex flex-col overflow-hidden border border-border scale-in-95">
             <div className="flex items-center justify-between p-4 bg-secondary/30 border-b border-border shadow-xs">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary border border-primary/20"><FileText className="w-5 h-5"/></div>
                 <div>
                   <h3 className="font-bold text-sm text-foreground">{activeSidebarDoc.title}</h3>
                   <p className="text-xs text-muted-foreground">Previewing active version {activeSidebarDoc.version}</p>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 <Button variant="outline" size="sm" className="bg-card" onClick={() => toast.success("Downloading...")}><Download className="w-4 h-4 mr-2"/> Download</Button>
                 <button onClick={() => setIsPreviewOpen(false)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5"/></button>
               </div>
             </div>
             <div className="flex-1 bg-muted/40 flex items-center justify-center relative overflow-hidden p-6">
                {/* Simulated Viewer Canvas */}
                <div className="w-full max-w-[800px] h-full max-h-[1100px] bg-background shadow-xl border border-border p-12 overflow-y-auto rounded-lg">
                   {/* Dummy Document Content */}
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
                        <h4 className="font-serif font-bold text-2xl text-foreground">Document Viewer</h4>
                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">In a production environment, this frame natively renders PDFs, Word Docs, and images without requiring a download.</p>
                      </div>
                   </div>
                </div>
             </div>
           </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in-20">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 scale-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-xl font-bold text-foreground">
                {parentDocumentId ? "Upload New Version" : "Upload Document"}
              </h3>
              <button onClick={() => setIsUploadOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Select File</label>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                <Button variant="outline" className="w-full justify-start text-muted-foreground font-normal bg-secondary/30 h-12 border-dashed border-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-3 text-primary" />
                  <span className="truncate">{selectedFile ? selectedFile.name : "Click to browse files..."}</span>
                </Button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Link to Case</label>
                <Select value={uploadCaseId} onValueChange={setUploadCaseId} disabled={!!parentDocumentId}>
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
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Document Type</label>
                  <Select value={uploadType} onValueChange={setUploadType} disabled={!!parentDocumentId}>
                    <SelectTrigger className="capitalize h-10 bg-secondary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Visibility Status</label>
                  <Select value={isPrivileged ? "private" : "shared"} onValueChange={(v) => setIsPrivileged(v === "private")} disabled={!!parentDocumentId}>
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
              <Button variant="outline" className="flex-1" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
              <Button className="flex-1 shadow-md shadow-primary/20" onClick={handleUploadSubmit} disabled={isUploading || !selectedFile}>
                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {isUploading ? "Uploading..." : "Save Document"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Envelope Modal */}
      {envelopeDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in-20">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90dvh] overflow-y-auto scale-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-xl font-bold">Secure Signature Envelope</h3>
              <button onClick={() => setEnvelopeDoc(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-secondary/30 p-3 rounded-lg flex items-center gap-3 border border-border/50">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Target Document</p>
                <p className="text-sm font-semibold">{envelopeDoc.title}</p>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Envelope Title</label>
              <Input className="h-10 bg-secondary/20" value={envelopeTitle} onChange={(e) => setEnvelopeTitle(e.target.value)} />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Routing Rule</label>
                <Select value={envelopeRouting} onValueChange={(v) => setEnvelopeRouting(v as "sequential" | "parallel")}>
                  <SelectTrigger className="h-10 bg-secondary/20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">Sequential (In Order)</SelectItem>
                    <SelectItem value="parallel">Parallel (All at Once)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Expiration Date</label>
                <Input type="date" className="h-10 bg-secondary/20" value={envelopeExpires} onChange={(e) => setEnvelopeExpires(e.target.value)} />
              </div>
            </div>
            
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Select Signers (Order matters for Sequential)</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border/50 rounded-lg p-2 bg-secondary/10">
                {signers.length === 0 && <p className="text-xs text-muted-foreground p-2">No portal clients found.</p>}
                {signers.map((s: any) => {
                  const selected = selectedSignerIds.includes(s._id);
                  const order = selectedSignerIds.indexOf(s._id);
                  return (
                    <div key={s._id} className={`flex items-center gap-3 text-sm py-2 px-3 rounded-md transition-colors ${selected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/40 border border-transparent'}`}>
                      <input type="checkbox" checked={selected} onChange={() => toggleSigner(s._id)} className="accent-primary w-4 h-4 cursor-pointer" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{s.role} · {s.email}</p>
                      </div>
                      {selected && (
                        <div className="flex items-center gap-1 bg-background rounded-md px-1 py-0.5 shadow-xs border border-border">
                          <span className="text-[10px] font-bold text-primary px-1">#{order + 1}</span>
                          <div className="flex flex-col">
                            <button type="button" className="text-[10px] text-muted-foreground hover:text-foreground leading-none px-1" onClick={() => moveSigner(s._id, -1)}>▲</button>
                            <button type="button" className="text-[10px] text-muted-foreground hover:text-foreground leading-none px-1" onClick={() => moveSigner(s._id, 1)}>▼</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-border mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEnvelopeDoc(null)}>Cancel</Button>
              <Button className="flex-1 shadow-md shadow-primary/20" onClick={handleCreateAndSendEnvelope} disabled={isEnvelopeBusy || selectedSignerIds.length === 0}>
                {isEnvelopeBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send Envelope
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
