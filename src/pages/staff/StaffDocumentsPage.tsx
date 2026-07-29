import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { FileText, Upload, Search, Filter, Download, Loader2, Plus, X, Lock } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";

const TYPE_COLORS: Record<string, string> = {
  pleading:       "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  evidence:       "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  contract:       "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  affidavit:      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  correspondence: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  other:          "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const DOC_TYPES = ["pleading", "affidavit", "contract", "poa", "correspondence", "evidence", "other"];

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
      title="Download file"
    >
      <Download className="w-4 h-4" />
    </Button>
  );
}

export default function StaffDocumentsPage() {
  const allDocs = useQuery(api.documents.listDocuments, { isTemplate: false }) || [];
  const cases = useQuery(api.cases.listCases, {}) || [];
  
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.createDocument);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Upload Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCaseId, setUploadCaseId] = useState<string>("general");
  const [uploadType, setUploadType] = useState<string>("other");
  const [isPrivileged, setIsPrivileged] = useState<boolean>(false);
  const [parentDocumentId, setParentDocumentId] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const isLoading = allDocs === undefined || cases === undefined;

  const openNewUpload = () => {
    setSelectedFile(null);
    setUploadCaseId("general");
    setUploadType("other");
    setIsPrivileged(false);
    setParentDocumentId(null);
    setIsModalOpen(true);
  };

  const openVersionUpload = (parentDoc: any) => {
    setSelectedFile(null);
    setUploadCaseId(parentDoc.caseId || "general");
    setUploadType(parentDoc.type);
    setIsPrivileged(parentDoc.isPrivileged);
    setParentDocumentId(parentDoc._id);
    setIsModalOpen(true);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      toast.error("Please select a file.");
      return;
    }
    
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
        const json = await result.json();
        storageId = json.storageId;
      }

      await createDocument({
        caseId: uploadCaseId === "general" ? undefined : uploadCaseId as any,
        title: selectedFile.name,
        type: uploadType as any,
        storageId,
        mimeType: selectedFile.type || "application/octet-stream",
        sizeBytes: selectedFile.size,
        tags: [],
        isTemplate: false,
        isPrivileged,
        ...(parentDocumentId ? { parentDocumentId: parentDocumentId as any } : {})
      });

      toast.success(parentDocumentId ? "New version uploaded." : "Document uploaded successfully.");
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document.");
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Only show the LATEST version of each document tree in the main view
  // (A document is the latest if no other document points to it as a parent)
  // Since we don't have a strict tree in the mock beyond 1 level easily queryable,
  // let's just group by title/case for simplicity, or just show all of them but sorted.
  // Actually, standard is to show all docs, and sort by _creationTime desc.

  const filteredDocs = allDocs.filter((d: any) => 
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 font-sans">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Firm Documents</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => toast.info("Document templates are managed by Admins.")}>
            Templates
          </Button>
          <Button size="sm" onClick={openNewUpload}>
            <Upload className="w-4 h-4 mr-1" /> Upload
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            className="pl-9" 
            placeholder="Search documents by title..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="secondary" size="sm">
          <Filter className="w-4 h-4 mr-1" /> Filter
        </Button>
      </div>

      <div className="space-y-2">
        {filteredDocs.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No Documents Found</EmptyTitle>
              <EmptyDescription>Try adjusting your search or upload a new file.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          filteredDocs.map((doc: any) => {
            const matchedCase = cases.find((c: any) => c._id === doc.caseId);
            const sizeStr = (doc.sizeBytes / 1024).toFixed(0) + " KB";
            const dateStr = new Date(doc._creationTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            
            return (
              <Card key={doc._id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                      {doc.isPrivileged && (
                        <Badge className="text-[10px] h-4 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 flex-shrink-0 gap-1 px-1.5">
                          <Lock className="w-2.5 h-2.5" /> Internal
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className={`text-[10px] uppercase font-semibold ${TYPE_COLORS[doc.type] || TYPE_COLORS.other}`}>
                        {doc.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">{matchedCase?.caseNumber || "General"}</span>
                      <span className="text-xs font-semibold text-primary">v{doc.version}</span>
                      <span className="text-xs text-muted-foreground">{sizeStr}</span>
                      <span className="text-xs text-muted-foreground">{dateStr}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => openVersionUpload(doc)} title="Upload new version">
                      <Plus className="w-4 h-4" /> v{doc.version + 1}
                    </Button>
                    <DownloadButton storageId={doc.storageId} />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-foreground">
                {parentDocumentId ? "Upload New Version" : "Upload Document"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              {/* File Select */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Select File</label>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-muted-foreground font-normal" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {selectedFile ? selectedFile.name : "Click to browse..."}
                </Button>
              </div>

              {/* Case Binding */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Link to Case</label>
                <Select value={uploadCaseId} onValueChange={setUploadCaseId} disabled={!!parentDocumentId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">No Case (General Firm File)</SelectItem>
                    {cases.map((c: any) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.caseNumber} - {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Document Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Document Type</label>
                  <Select value={uploadType} onValueChange={setUploadType} disabled={!!parentDocumentId}>
                    <SelectTrigger>
                      <SelectValue className="capitalize" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Visibility</label>
                  <Select value={isPrivileged ? "private" : "shared"} onValueChange={(v) => setIsPrivileged(v === "private")} disabled={!!parentDocumentId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shared">Client Viewable</SelectItem>
                      <SelectItem value="private">Internal Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleUploadSubmit} disabled={isUploading || !selectedFile}>
                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {isUploading ? "Uploading..." : "Save Document"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
