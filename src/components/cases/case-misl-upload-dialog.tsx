"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useUploadDocument, type DocumentUploadIntentStatus } from "@/client/queries/documents";
import { CASE_MISL_DOCUMENT_TYPES } from "@/shared/contracts/case-ui";

export { CASE_MISL_DOCUMENT_TYPES };

export type CaseMislUploadedFile = DocumentUploadIntentStatus & {
  title: string;
  type: (typeof CASE_MISL_DOCUMENT_TYPES)[number]["value"];
};

type CaseMislUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onUploaded?: (file: CaseMislUploadedFile) => void;
};

export function CaseMislUploadDialog({
  open,
  onOpenChange,
  caseId,
  onUploaded,
}: CaseMislUploadDialogProps) {
  const uploadDocument = useUploadDocument();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<(typeof CASE_MISL_DOCUMENT_TYPES)[number]["value"]>("pleading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setTitle("");
    setType("pleading");
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast.error("Choose a file to upload.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Files cannot exceed 50 MB.");
      return;
    }
    setBusy(true);
    try {
      const uploadedTitle = title.trim() || file.name;
      const result = await uploadDocument({
        file,
        caseId,
        title: uploadedTitle,
        type,
        isTemplate: false,
      });
      onUploaded?.({ ...result, title: uploadedTitle, type });
      if (result.status === "promoted") {
        toast.success("Document uploaded to this case Misl.");
      } else {
        toast.message("File is being scanned. It will appear in this Misl when scanning finishes.");
      }
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to upload document.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-labelledby="case-misl-upload-title">
        <DialogHeader>
          <DialogTitle id="case-misl-upload-title">Upload to Digital Misl</DialogTitle>
          <DialogDescription>
            Files are stored on this case after scanning and grouped by document type. View stays on
            this file.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="case-misl-file" className="text-xs font-medium">
              File
            </label>
            <Input
              id="case-misl-file"
              type="file"
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null;
                setFile(next);
                if (next && !title.trim()) setTitle(next.name.replace(/\.[^.]+$/, ""));
              }}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="case-misl-title" className="text-xs font-medium">
              Title
            </label>
            <Input
              id="case-misl-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="case-misl-type" className="text-xs font-medium">
              Document type
            </label>
            <select
              id="case-misl-type"
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={type}
              onChange={(event) =>
                setType(event.target.value as (typeof CASE_MISL_DOCUMENT_TYPES)[number]["value"])
              }
            >
              {CASE_MISL_DOCUMENT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !file}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
