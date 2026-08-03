import { useState } from "react";
import { useQuery, useMutation } from "@/client/data/convex-bridge.ts";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Loader2, Plus, Edit2, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { TipTapEditor } from "@/components/documents/TipTapEditor.tsx";

const AVAILABLE_VARIABLES = [
  "client.name", "client.phone", "client.address",
  "case.number", "case.title", "case.court", 
  "lawyer.name", "lawyer.barNumber", "today_bs", "today_gregorian"
];

export default function AdminTemplatesPage() {
  const templates = useQuery(api.templates.listTemplates, {}) || [];
  const createTemplate = useMutation(api.templates.createTemplate);
  const updateTemplate = useMutation(api.templates.updateTemplate);
  const deleteTemplate = useMutation(api.templates.deleteTemplate);
  const seedTemplates = useMutation(api.templates.seedTemplates);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<any>("other");
  const [description, setDescription] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleOpenModal = (template?: any) => {
    if (template) {
      setEditingTemplate(template);
      setTitle(template.title);
      setCategory(template.category);
      setDescription(template.description || "");
      setHtmlContent(template.htmlContent);
    } else {
      setEditingTemplate(null);
      setTitle("");
      setCategory("other");
      setDescription("");
      setHtmlContent("");
    }
    setIsModalOpen(true);
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedTemplates();
      toast.success("Default templates seeded successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to seed templates");
    } finally {
      setIsSeeding(false);
    }
  }

  const handleSave = async () => {
    if (!title || !htmlContent) {
      toast.error("Please fill in the title and content.");
      return;
    }
    setIsSaving(true);
    
    // Auto-detect variables used in content
    const usedVars = AVAILABLE_VARIABLES.filter(v => htmlContent.includes(`{{${v}}}`));

    try {
      if (editingTemplate) {
        await updateTemplate({ 
          id: editingTemplate._id, 
          title, 
          category, 
          description,
          htmlContent,
          variables: usedVars,
        });
        toast.success("Template updated successfully");
      } else {
        await createTemplate({ 
          title, 
          category, 
          description,
          htmlContent,
          variables: usedVars,
        });
        toast.success("Template created successfully");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await deleteTemplate({ id: id as any });
      toast.success("Template deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete template");
    }
  };

  const insertVariable = (variable: string) => {
    setHtmlContent((prev) => prev + `{{${variable}}}`);
  };

  if (templates === undefined) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-primary">Document Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage standard legal templates for document assembly.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
            {isSeeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Seed Default Templates
          </Button>
          <Button onClick={() => handleOpenModal()} className="shrink-0 gap-2">
            <Plus className="w-4 h-4" /> New Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template: any) => (
          <motion.div key={template._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="h-full flex flex-col hover:border-primary/50 transition-colors">
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenModal(template)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(template._id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-medium text-lg mb-1 truncate">{template.title}</h3>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{template.category.replace("_", " ")}</div>
                {template.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{template.description}</p>}
                
                <div className="mt-auto">
                  <p className="text-xs text-muted-foreground mb-1 font-semibold">Variables used:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map((v: string) => (
                      <span key={v} className="bg-secondary text-secondary-foreground text-[10px] px-1.5 py-0.5 rounded border">{v}</span>
                    ))}
                    {template.variables.length === 0 && <span className="text-[10px] text-muted-foreground">None</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {templates.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No templates found. Create one or seed default templates!
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[900px] h-[95vh] sm:h-auto max-h-[95vh] flex flex-col p-4">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Template Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Standard Retainer Agreement" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Template Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vakalatnama">Vakalatnama</SelectItem>
                    <SelectItem value="firad_patra">Firad Patra</SelectItem>
                    <SelectItem value="jawab">Jawab</SelectItem>
                    <SelectItem value="prastab_patra">Prastab Patra</SelectItem>
                    <SelectItem value="retainer">Retainer</SelectItem>
                    <SelectItem value="poa">Power of Attorney</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description..." />
            </div>
            
            <div className="space-y-2 flex-1 flex flex-col min-h-[400px]">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-sm font-medium text-foreground mr-2">Insert Variable:</span>
                {AVAILABLE_VARIABLES.map(v => (
                  <Button key={v} type="button" variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => insertVariable(v)}>
                    {v}
                  </Button>
                ))}
              </div>
              <div className="flex-1 border rounded-md">
                <TipTapEditor value={htmlContent} onChange={setHtmlContent} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
