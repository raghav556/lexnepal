import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useCases } from "@/client/queries/cases";
import { useUploadDocument } from "@/client/queries/documents";
import { computeSHA256, extractTextFromFile } from "@/lib/document-utils.ts";

interface MultiFileUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCaseId?: string;
}

type UploadStatus = "pending" | "hashing" | "uploading" | "saving" | "success" | "error";

interface UploadTask {
  id: string;
  file: File;
  title: string;
  type: string;
  description: string;
  status: UploadStatus;
  progress: number;
  error?: string;
  hash?: string;
}

const ALLOWED_TYPES = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/tiff": [".tif", ".tiff"],
  "text/plain": [".txt"],
};

export default function MultiFileUploadModal({
  open,
  onOpenChange,
  defaultCaseId,
}: MultiFileUploadModalProps) {
  const cases = useCases({}) || [];
  const uploadDocument = useUploadDocument();

  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadCaseId, setUploadCaseId] = useState(defaultCaseId || "general");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newTasks: UploadTask[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      title: file.name.replace(/\.[^/.]+$/, ""),
      type: "other",
      description: "",
      status: "pending",
      progress: 0,
    }));
    setTasks((prev) => [...prev, ...newTasks]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_TYPES,
    maxSize: 50 * 1024 * 1024,
  });

  const removeTask = (id: string) => {
    if (isProcessing) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTaskMeta = (id: string, updates: Partial<UploadTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const processQueue = async () => {
    if (tasks.length === 0) return toast.error("No files to upload.");
    setIsProcessing(true);

    let successCount = 0;
    for (const task of tasks) {
      if (task.status === "success") {
        successCount += 1;
        continue;
      }

      try {
        updateTaskMeta(task.id, { status: "hashing", progress: 10 });
        const hash = await computeSHA256(task.file);
        try {
          await extractTextFromFile(task.file);
        } catch (e) {
          console.warn("Text extraction failed for", task.file.name, e);
        }

        updateTaskMeta(task.id, { status: "uploading", progress: 40, hash });
        await uploadDocument({
          file: task.file,
          caseId: uploadCaseId === "general" ? undefined : uploadCaseId,
          title: task.title,
          description: task.description || undefined,
          type: task.type as any,
          isPrivileged: false,
        });

        updateTaskMeta(task.id, { status: "success", progress: 100 });
        successCount += 1;
      } catch (err: any) {
        console.error(err);
        updateTaskMeta(task.id, {
          status: "error",
          error: err.message || "Upload failed",
          progress: 0,
        });
      }
    }

    setIsProcessing(false);
    if (successCount > 0) toast.success(`Successfully uploaded ${successCount} files.`);
  };

  const allDone = tasks.length > 0 && tasks.every((t) => t.status === "success");

  return (
    <Dialog
      open={open}
      onOpenChange={(val: boolean) => {
        if (!isProcessing) {
          onOpenChange(val);
          if (!val) setTasks([]);
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Document Upload</DialogTitle>
          <DialogDescription>
            Drag and drop multiple files. Files are quarantined and scanned before download.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Target Case</Label>
            <Select value={uploadCaseId} onValueChange={setUploadCaseId} disabled={isProcessing}>
              <SelectTrigger>
                <SelectValue placeholder="Select a case" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General / Unassigned</SelectItem>
                {cases.map((c: any) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.title} ({c.caseNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isProcessing && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="w-10 h-10 opacity-50" />
                <p className="text-sm font-medium">
                  {isDragActive
                    ? "Drop the files here..."
                    : "Drag & drop files here, or click to select"}
                </p>
                <p className="text-xs">PDF, DOCX, XLSX, PPTX, Images, TXT (Max 50MB each)</p>
              </div>
            </div>
          )}

          {tasks.length > 0 && (
            <div className="space-y-3 mt-4">
              {tasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-3 bg-card space-y-3 relative">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {task.status === "success" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : task.status === "error" ? (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      ) : task.status === "pending" ? (
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium truncate max-w-[300px]">
                            {task.file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(task.file.size / 1024 / 1024).toFixed(2)} MB
                            {task.hash && (
                              <span className="ml-2 font-mono text-[10px] opacity-70">
                                SHA: {task.hash.substring(0, 8)}...
                              </span>
                            )}
                          </p>
                        </div>
                        {!isProcessing && task.status !== "success" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 -mt-1 -mr-1"
                            onClick={() => removeTask(task.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      {task.status === "pending" && (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={task.title}
                            onChange={(e) => updateTaskMeta(task.id, { title: e.target.value })}
                            placeholder="Document Title"
                            className="h-8 text-xs"
                          />
                          <Select
                            value={task.type}
                            onValueChange={(v) => updateTaskMeta(task.id, { type: v })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pleading">Pleading</SelectItem>
                              <SelectItem value="evidence">Evidence</SelectItem>
                              <SelectItem value="contract">Contract</SelectItem>
                              <SelectItem value="affidavit">Affidavit</SelectItem>
                              <SelectItem value="correspondence">Correspondence</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {task.status !== "pending" &&
                        task.status !== "success" &&
                        task.status !== "error" && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                              <span>{task.status}...</span>
                              <span>{Math.round(task.progress)}%</span>
                            </div>
                            <Progress value={task.progress} className="h-1.5" />
                          </div>
                        )}

                      {task.status === "error" && (
                        <p className="text-xs text-destructive font-medium">{task.error}</p>
                      )}

                      {task.status === "success" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-green-50 text-green-700 border-green-200"
                        >
                          Quarantined for Scan
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setTasks([]);
            }}
            disabled={isProcessing}
          >
            {allDone ? "Close" : "Cancel"}
          </Button>
          {!allDone && (
            <Button onClick={processQueue} disabled={isProcessing || tasks.length === 0}>
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
                </>
              ) : (
                `Upload ${tasks.length} Files`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
