import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Loader2, FileText, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user.ts";

interface Props {
  caseId: string;
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateGeneratorModal({ caseId, clientId, open, onOpenChange }: Props) {
  const currentUser = useCurrentUser();
  const templates = useQuery(api.templates.listTemplates as any, {}) || [];
  const client = useQuery(api.clients.listClients as any, {})?.find((c: any) => c._id === clientId);
  const caseData = useQuery(api.cases.getCase as any, { caseId: caseId as any });
  
  const createDocument = useMutation(api.documents.createDocument as any);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [generatedText, setGeneratedText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find((t: any) => t._id === id);
    if (!tmpl || !client || !caseData) return;

    let text = tmpl.content;
    
    // Replace variables
    text = text.replace(/{{CLIENT_NAME}}/g, client.fullName);
    text = text.replace(/{{CLIENT_PHONE}}/g, client.phone || "[No Phone]");
    text = text.replace(/{{CASE_NUMBER}}/g, caseData.caseNumber);
    text = text.replace(/{{CASE_TITLE}}/g, caseData.title);
    text = text.replace(/{{COURT_NAME}}/g, caseData.court || "[Court]");
    text = text.replace(/{{JUDGE_NAME}}/g, caseData.judge || "[Judge]");
    text = text.replace(/{{TODAY_DATE}}/g, new Date().toISOString().split("T")[0]);

    setGeneratedText(text);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedText);
    toast.success("Copied to clipboard!");
  };

  const handleSaveToCase = async () => {
    if (!generatedText) return;
    setIsSaving(true);
    try {
      // In a real app, we would generate a PDF or Word doc, upload to storage, and save the storageId.
      // Here we mock the save process.
      await createDocument({
        caseId: caseId,
        title: `Generated: ${templates.find((t: any) => t._id === selectedTemplateId)?.title}`,
        type: "contract",
        storageId: "mock_generated_" + Date.now(),
        mimeType: "text/plain",
        sizeBytes: generatedText.length,
        tags: ["generated", "template"],
        isTemplate: false,
        isPrivileged: false,
      });
      toast.success("Document saved to case file!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to save document");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Generate Document from Template</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4 flex-1 flex flex-col min-h-0">
          <div className="space-y-2 shrink-0">
            <label className="text-sm font-medium">Select Template</label>
            <Select value={selectedTemplateId} onValueChange={handleSelectTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a standard template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t: any) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.title} <span className="text-muted-foreground text-xs ml-2">({t.type})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {generatedText && (
            <div className="flex-1 flex flex-col min-h-[300px] border rounded-md overflow-hidden bg-muted/30">
              <div className="bg-muted px-3 py-2 flex items-center justify-between border-b shrink-0">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCopyToClipboard}>
                  <Copy className="w-3 h-3 mr-1" /> Copy Text
                </Button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 font-mono text-sm whitespace-pre-wrap">
                {generatedText}
              </div>
            </div>
          )}
          {!generatedText && (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] border border-dashed rounded-md text-muted-foreground">
              <FileText className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Select a template to generate a document.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 shrink-0 pt-4 border-t mt-auto">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSaveToCase} disabled={!generatedText || isSaving} className="gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save to Case
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
