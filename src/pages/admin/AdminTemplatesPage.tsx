import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Loader2, Plus, Edit2, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AdminTemplatesPage() {
  const templates = useQuery(api.templates.listTemplates as any, {}) || [];
  const createTemplate = useMutation(api.templates.createTemplate as any);
  const updateTemplate = useMutation(api.templates.updateTemplate as any);
  const deleteTemplate = useMutation(api.templates.deleteTemplate as any);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  
  const [title, setTitle] = useState("");
  const [type, setType] = useState("general");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenModal = (template?: any) => {
    if (template) {
      setEditingTemplate(template);
      setTitle(template.title);
      setType(template.type);
      setContent(template.content);
    } else {
      setEditingTemplate(null);
      setTitle("");
      setType("general");
      setContent("");
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!title || !content) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSaving(true);
    try {
      if (editingTemplate) {
        await updateTemplate({ id: editingTemplate._id, title, type, content });
        toast.success("Template updated successfully");
      } else {
        await createTemplate({ title, type, content });
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
      await deleteTemplate({ id });
      toast.success("Template deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete template");
    }
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
        <Button onClick={() => handleOpenModal()} className="shrink-0 gap-2">
          <Plus className="w-4 h-4" /> New Template
        </Button>
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
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-4">{template.type}</div>
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md line-clamp-4 mt-auto font-mono text-xs">
                  {template.content}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] h-[90vh] sm:h-auto max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 flex-1 overflow-y-auto pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Template Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Standard Retainer Agreement" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Template Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="retainer">Retainer</SelectItem>
                    <SelectItem value="petition">Petition</SelectItem>
                    <SelectItem value="nda">NDA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2 flex-1 flex flex-col min-h-[300px]">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
                <label className="text-sm font-medium text-foreground">Content</label>
                <span className="text-xs text-muted-foreground break-all">Available Variables: {'{{CLIENT_NAME}}, {{CLIENT_PHONE}}, {{CASE_NUMBER}}, {{CASE_TITLE}}, {{COURT_NAME}}, {{JUDGE_NAME}}, {{TODAY_DATE}}'}</span>
              </div>
              <Textarea 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
                className="flex-1 font-mono text-sm min-h-[300px] resize-none" 
                placeholder="Write your template here..."
              />
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
