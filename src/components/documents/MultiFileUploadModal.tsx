import { useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useDropzone } from "react-dropzone";
import { Loader2, UploadCloud, X, File, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import { useMutation, useQuery } from "convex/react";
import { extractTextFromFile } from "@/utils/textExtractor.ts";

const ALLOWED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/tiff": [".tiff"],
  "text/plain": [".txt"]
};

const DOC_TYPES = ["pleading", "affidavit", "contract", "poa", "correspondence", "evidence", "template", "court_filing", "notice", "memo", "other"];
const CONFIDENTIALITY_LEVELS = ["public", "internal", "confidential", "privileged"];

async function computeSHA256(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

interface UploadTask {
  id: string;
  file: File;
  status: "pending" | "uploading" | "hashing" | "saving" | "success" | "error";
  progress: number;
  hash?: string;
  error?: string;
  // Metadata specific to this file (initialized with defaults from the form)
  title: string;
  type: string;
  description: string;
  tags: string[];
  isPrivileged: boolean;
  confidentialityLevel: string;
  physicalLocation: string;
  dateBs: string;
}

export function MultiFileUploadModal({ 
  isOpen, 
  onClose, 
  parentDocumentId = null,
  initialCaseId = "general"
}: { 
  isOpen: boolean; 
  onClose: () => void;
  parentDocumentId?: string | null;
  initialCaseId?: string;
}) {
  const cases = useQuery(api.cases.listCases, {}) || [];
  
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.createDocument);

  // Global Metadata Defaults
  const [uploadCaseId, setUploadCaseId] = useState<string>(initialCaseId);
  const [defaultType, setDefaultType] = useState<string>("other");
  const [defaultConfidentiality, setDefaultConfidentiality] = useState<string>("internal");
  
  // File Queue
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newTasks = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: "pending" as const,
      progress: 0,
      title: file.name,
      type: defaultType,
      description: "",
      tags: [],
      isPrivileged: defaultConfidentiality === "privileged",
      confidentialityLevel: defaultConfidentiality,
      physicalLocation: "",
      dateBs: ""
    }));
    setTasks(prev => [...prev, ...newTasks]);
  }, [defaultType, defaultConfidentiality]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ALLOWED_TYPES,
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  const removeTask = (id: string) => {
    if (isProcessing) return;
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const updateTaskMeta = (id: string, updates: Partial<UploadTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const processQueue = async () => {
    if (tasks.length === 0) return toast.error("No files to upload.");
    setIsProcessing(true);
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (task.status === "success") continue;
      
      try {
        // Step 1: Hashing & Text Extraction
        updateTaskMeta(task.id, { status: "hashing", progress: 10 });
        const hash = await computeSHA256(task.file);
        
        let extractedText = "";
        try {
          extractedText = await extractTextFromFile(task.file);
        } catch (e) {
          console.warn("Text extraction failed for", task.file.name, e);
        }
        
        // Step 2: Upload Url
        updateTaskMeta(task.id, { status: "uploading", progress: 20 });
        const postUrl = await generateUploadUrl();
        
        let storageId = "";
        if (postUrl === "mock-upload-url") {
           storageId = URL.createObjectURL(task.file);
           updateTaskMeta(task.id, { progress: 80 });
        } else {
           // Step 3: Real Upload
           const xhr = new XMLHttpRequest();
           storageId = await new Promise((resolve, reject) => {
             xhr.upload.onprogress = (e) => {
               if (e.lengthComputable) {
                 const percentComplete = (e.loaded / e.total) * 60 + 20; // Scale 20 to 80
                 updateTaskMeta(task.id, { progress: percentComplete });
               }
             };
             xhr.onload = () => {
               if (xhr.status >= 200 && xhr.status < 300) {
                 try {
                   const response = JSON.parse(xhr.responseText);
                   resolve(response.storageId);
                 } catch (e) {
                   reject(new Error("Invalid response from storage"));
                 }
               } else {
                 reject(new Error(`Upload failed with status ${xhr.status}`));
               }
             };
             xhr.onerror = () => reject(new Error("Upload network error"));
             xhr.open("POST", postUrl);
             xhr.setRequestHeader("Content-Type", task.file.type || "application/octet-stream");
             xhr.send(task.file);
           });
        }
        
        // Step 4: Save metadata to Convex
        updateTaskMeta(task.id, { status: "saving", progress: 90, hash });
        
        await createDocument({
          caseId: uploadCaseId === "general" ? undefined : (uploadCaseId as any),
          title: task.title,
          description: task.description || undefined,
          type: task.type as any,
          storageId,
          mimeType: task.file.type || "application/octet-stream",
          sizeBytes: task.file.size,
          sha256: hash,
          searchableText: extractedText || undefined,
          tags: task.tags,
          isTemplate: false,
          isPrivileged: task.isPrivileged,
          confidentialityLevel: task.confidentialityLevel as any,
          physicalLocation: task.physicalLocation || undefined,
          dateBs: task.dateBs || undefined,
          parentDocumentId: parentDocumentId ? (parentDocumentId as any) : undefined
        });
        
        updateTaskMeta(task.id, { status: "success", progress: 100 });
      } catch (err: any) {
        updateTaskMeta(task.id, { status: "error", error: err.message || "Upload failed" });
      }
    }
    
    setIsProcessing(false);
    
    const successfulCount = tasks.filter(t => t.status === "success").length;
    
    if (successfulCount > 0) {
      toast.success(`Successfully uploaded ${successfulCount} document(s).`);
      if (successfulCount === tasks.length) {
         setTimeout(handleClose, 1000);
      }
    }
  };

  const handleClose = () => {
    if (isProcessing) return;
    setTasks([]);
    setUploadCaseId("general");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{parentDocumentId ? "Upload New Version" : "Industrial Intake - Multi-file Upload"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Global Defaults Section */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border">
             <div className="space-y-2">
                <Label>Destination Case</Label>
                <Select value={uploadCaseId} onValueChange={setUploadCaseId} disabled={isProcessing || !!parentDocumentId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Firm General (No Case)</SelectItem>
                    {cases.map((c: any) => <SelectItem key={c._id} value={c._id}>{c.caseNumber} - {c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label>Default Type</Label>
                <Select value={defaultType} onValueChange={setDefaultType} disabled={isProcessing}>
                  <SelectTrigger className="capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label>Confidentiality Level</Label>
                <Select value={defaultConfidentiality} onValueChange={setDefaultConfidentiality} disabled={isProcessing}>
                  <SelectTrigger className="capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONFIDENTIALITY_LEVELS.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
             </div>
          </div>

          {/* Drag and Drop Zone */}
          {!isProcessing && (
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
                ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
                ${isDragReject ? "border-destructive bg-destructive/5" : ""}
              `}
            >
              <input {...getInputProps()} />
              <UploadCloud className={`w-12 h-12 mb-4 ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
              <p className="text-sm font-medium mb-1">Drag & drop files here, or click to select files</p>
              <p className="text-xs text-muted-foreground">Supported: PDF, DOCX, XLSX, JPG, PNG, TXT (Max 50MB)</p>
            </div>
          )}

          {/* File Queue */}
          {tasks.length > 0 && (
            <div className="space-y-3">
               <h3 className="text-sm font-semibold border-b pb-2">Upload Queue ({tasks.length})</h3>
               {tasks.map(task => (
                 <div key={task.id} className="bg-card border rounded-lg p-3 space-y-3">
                   <div className="flex items-start justify-between">
                     <div className="flex items-center gap-3">
                       <File className="w-8 h-8 text-blue-500" />
                       <div>
                         <p className="font-medium text-sm truncate max-w-sm">{task.file.name}</p>
                         <p className="text-xs text-muted-foreground">{(task.file.size / 1024 / 1024).toFixed(2)} MB</p>
                       </div>
                     </div>
                     {!isProcessing && (
                       <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => removeTask(task.id)}>
                         <X className="w-4 h-4" />
                       </Button>
                     )}
                     {task.status === "success" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                     {task.status === "error" && <AlertCircle className="w-5 h-5 text-destructive" />}
                   </div>

                   {/* Per-file Metadata Form */}
                   {!isProcessing && (
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
                        <div className="col-span-2 space-y-1.5">
                           <Label className="text-[10px] uppercase">Title</Label>
                           <Input className="h-8 text-xs" value={task.title} onChange={e => updateTaskMeta(task.id, { title: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                           <Label className="text-[10px] uppercase">Type</Label>
                           <Select value={task.type} onValueChange={v => updateTaskMeta(task.id, { type: v })}>
                             <SelectTrigger className="h-8 text-xs capitalize"><SelectValue /></SelectTrigger>
                             <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize text-xs">{t}</SelectItem>)}</SelectContent>
                           </Select>
                        </div>
                        <div className="space-y-1.5">
                           <Label className="text-[10px] uppercase">Original Location</Label>
                           <Input className="h-8 text-xs" placeholder="e.g. Cab 3, Drw 2" value={task.physicalLocation} onChange={e => updateTaskMeta(task.id, { physicalLocation: e.target.value })} />
                        </div>
                     </div>
                   )}

                   {/* Progress Indicators */}
                   {isProcessing && task.status !== "pending" && (
                     <div className="space-y-1.5 pt-2">
                       <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                         <span>{task.status}</span>
                         <span>{Math.round(task.progress)}%</span>
                       </div>
                       <div className="h-1.5 w-full bg-secondary overflow-hidden rounded-full">
                         <div className="h-full bg-primary transition-all duration-300" style={{ width: `${task.progress}%` }} />
                       </div>
                       {task.status === "error" && <p className="text-xs text-destructive">{task.error}</p>}
                       {task.hash && <p className="text-[9px] text-muted-foreground font-mono truncate">SHA256: {task.hash}</p>}
                     </div>
                   )}
                 </div>
               ))}
            </div>
          )}
        </div>

        <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>Cancel</Button>
          <Button onClick={processQueue} disabled={isProcessing || tasks.length === 0} className="w-32">
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : `Upload ${tasks.length} Files`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
