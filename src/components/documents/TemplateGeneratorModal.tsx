import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Loader2, FileSignature, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@/client/data/convex-bridge.ts";
import { api } from "@/convex/_generated/api.js";
import { useCase, useCases } from "@/client/queries/cases";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { generatePdfFromHtml } from "@/lib/pdfGenerator.ts";

export function TemplateGeneratorModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const cases = useCases({}) || [];
  const templates = useQuery(api.templates.listTemplates, {}) || [];
  
  const createDocument = useMutation(api.documents.createDocument);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [selectedCase, setSelectedCase] = useState<string>("general");
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedCaseData = useCase(selectedCase !== "general" ? selectedCase : null, true);

  const toggleTemplate = (id: string) => {
    const next = new Set(selectedTemplates);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTemplates(next);
  }

  const handleGenerate = async () => {
    if (selectedTemplates.size === 0) return toast.error("Please select at least one template.");
    setIsGenerating(true);
    
    try {
      const selected = templates.filter(t => selectedTemplates.has(t._id));
      
      for (const template of selected) {
        // 1. Map Variables
        let htmlContent = template.htmlContent;
        if (selectedCaseData) {
          htmlContent = htmlContent.replace(/{{client\.name}}/g, selectedCaseData.client?.fullName || "________________");
          htmlContent = htmlContent.replace(/{{client\.phone}}/g, selectedCaseData.client?.phone || "________________");
          htmlContent = htmlContent.replace(/{{client\.address}}/g, selectedCaseData.client?.address || "________________");
          htmlContent = htmlContent.replace(/{{case\.number}}/g, selectedCaseData.caseNumber || "________________");
          htmlContent = htmlContent.replace(/{{case\.title}}/g, selectedCaseData.title || "________________");
          htmlContent = htmlContent.replace(/{{case\.court}}/g, selectedCaseData.court || "________________");
          htmlContent = htmlContent.replace(/{{lawyer\.name}}/g, selectedCaseData.lawyer?.name || "________________");
        } else {
          // If no case is selected, replace variables with blanks for manual filling
          htmlContent = htmlContent.replace(/{{.*?}}/g, "________________");
        }
        
        // General Variables
        const d = new Date();
        htmlContent = htmlContent.replace(/{{today_gregorian}}/g, d.toLocaleDateString());
        htmlContent = htmlContent.replace(/{{today_bs}}/g, "२०८०-०१-०१"); // Mock BS date

        // 2. Generate PDF
        toast.info(`Generating ${template.title}...`);
        const file = await generatePdfFromHtml(htmlContent, `${template.title}.pdf`);
        
        // 3. Upload to Storage
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!result.ok) throw new Error(`Failed to upload ${template.title}`);
        const { storageId } = await result.json();

        // 4. Save Document
        await createDocument({
          title: `Generated: ${template.title}`,
          type: "other", // Could map to template category if we update the type enum
          storageId,
          mimeType: "application/pdf",
          sizeBytes: file.size,
          tags: ["auto-generated", template.category],
          caseId: selectedCase === "general" ? undefined : selectedCase as any,
          isTemplate: false,
          isPrivileged: false,
        });
      }

      toast.success(`${selectedTemplates.size} document(s) generated successfully!`);
      onClose();
      setSelectedTemplates(new Set());
      setSelectedCase("general");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate document.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] border-primary/20 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-xl text-primary">
            <FileSignature className="w-5 h-5" /> Document Assembly
          </DialogTitle>
          <DialogDescription>
            Select templates and a case to automatically merge client data and generate PDFs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Select Template(s)</label>
            <div className="grid gap-2">
              {templates.map((t: any) => {
                const isSelected = selectedTemplates.has(t._id);
                return (
                  <div 
                    key={t._id} 
                    onClick={() => toggleTemplate(t._id)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all flex items-start gap-3 ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'hover:border-primary/50'}`}
                  >
                    <FileText className={`w-5 h-5 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>{t.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                )
              })}
              {templates.length === 0 && (
                <div className="p-4 text-center text-muted-foreground border rounded-lg">No templates available. Create some in the Admin console.</div>
              )}
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <label className="text-sm font-semibold">Assign to Case (Optional)</label>
            <Select value={selectedCase} onValueChange={setSelectedCase}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a case" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">-- Firm General (No Case) --</SelectItem>
                {cases.map((c: any) => (
                  <SelectItem key={c._id} value={c._id}>{c.caseNumber} - {c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Variables like client name and case number will be auto-filled if a case is selected.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={isGenerating || selectedTemplates.size === 0}>
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : `Generate ${selectedTemplates.size > 0 ? selectedTemplates.size : ''} Document(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
