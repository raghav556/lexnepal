import React, { useState } from "react";
import { useCmsCommands, useResources } from "@/client/queries/cms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, BookOpen, Download, Edit, Trash2 } from "lucide-react";
import { FadeInUp } from "@/components/ui/animations";
import { format } from "date-fns";
import { toast } from "sonner";
import { CmsImageUploadField } from "@/components/cms/CmsImageUploadField";

export default function AdminCMSResources() {
  const resources = useResources({}, "admin") || [];
  const cms = useCmsCommands();
  const createResource = (body: any) => cms.create("resources", body);
  const updateResource = ({ id, ...body }: any) => cms.update("resources", id, body);
  const deleteResource = ({ id }: any) => cms.remove("resources", id);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Guide",
    coverImageUrl: "",
    fileUrl: "",
    isGated: false,
  });

  const handleOpenModal = (res?: any) => {
    if (res) {
      setEditingId(res._id);
      setFormData({
        title: res.title || "",
        description: res.description || "",
        category: res.category || "Guide",
        coverImageUrl: res.coverImageUrl || "",
        fileUrl: res.fileUrl || "",
        isGated: !!res.isGated,
      });
    } else {
      setEditingId(null);
      setFormData({
        title: "",
        description: "",
        category: "Guide",
        coverImageUrl: "",
        fileUrl: "",
        isGated: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.fileUrl.trim()) {
      toast.error("Title, description, and file URL are required.");
      return;
    }
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        coverImageUrl: formData.coverImageUrl || undefined,
        fileUrl: formData.fileUrl,
        isGated: formData.isGated,
      };
      if (editingId) {
        await updateResource({ id: editingId as any, ...payload });
        toast.success("Resource updated.");
      } else {
        await createResource(payload);
        toast.success("Resource created.");
      }
      setIsModalOpen(false);
    } catch (e) {
      toast.error("Failed to save resource.");
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this resource permanently?")) return;
    try {
      await deleteResource({ id: id as any });
      toast.success("Resource deleted.");
    } catch {
      toast.error("Failed to delete resource.");
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="font-serif text-xl sm:text-3xl font-bold">Resources CMS</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage whitepapers, legal guides, and downloadable resources.
          </p>
        </div>
        <Button
          className="bg-accent hover:bg-accent/90 w-full sm:w-auto shrink-0"
          onClick={() => handleOpenModal()}
        >
          <Plus className="w-4 h-4 mr-2" /> Upload Resource
        </Button>
      </div>

      <FadeInUp>
        <Card className="border-border/50 shadow-sm min-w-0 overflow-hidden">
          <CardHeader className="bg-secondary/20 border-b px-3 sm:px-6 py-3 sm:py-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent shrink-0" /> Resource Library
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {resources.length === 0 ? (
              <div className="p-8 sm:p-12 text-center text-muted-foreground flex flex-col items-center">
                <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 mb-4 opacity-20" />
                <p className="text-sm">No resources published yet. Click &quot;Upload Resource&quot; to add a whitepaper.</p>
              </div>
            ) : (
              <div className="divide-y">
                {resources.map((res: any) => (
                  <div
                    key={res._id}
                    className="p-3 sm:p-4 flex flex-col gap-3 hover:bg-secondary/20 transition-colors min-w-0"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="font-bold text-sm sm:text-base break-words leading-snug">{res.title}</h4>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">{res.category}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            Published:{" "}
                            {res.publishedDate ? format(new Date(res.publishedDate), "MMM d, yyyy") : "—"}
                          </span>
                          <span className="hidden sm:inline">·</span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" /> {res.downloads ?? 0} downloads
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pl-0 sm:pl-[3.25rem]">
                      {res.isGated ? (
                        <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800 font-medium whitespace-nowrap">
                          Lead Magnet
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800 font-medium whitespace-nowrap">
                          Public
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleOpenModal(res)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(res._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeInUp>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg w-[calc(100%-1rem)] sm:w-full bg-background border-border">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Resource" : "Upload Resource"}</DialogTitle>
            <DialogDescription>
              Provide a downloadable file URL and metadata for the public resources page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 min-w-0">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Resource title"
                className="min-w-0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Guide, Whitepaper, Report..."
                className="min-w-0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="flex min-h-[80px] w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Short description"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">File URL</label>
              <Input
                value={formData.fileUrl}
                onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                placeholder="https://.../file.pdf"
                className="min-w-0"
              />
              <p className="text-xs text-muted-foreground">
                PDF/document download URL (HTTPS). Cover image below uses CMS upload.
              </p>
            </div>
            <CmsImageUploadField
              label="Cover image (optional)"
              purpose="resource_cover"
              value={formData.coverImageUrl || undefined}
              onChange={(url) => setFormData({ ...formData, coverImageUrl: url ?? "" })}
              previewClassName="mt-2 h-24 w-full max-w-xs rounded-md object-cover border"
            />
            <label className="flex items-start sm:items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.isGated}
                onChange={(e) => setFormData({ ...formData, isGated: e.target.checked })}
                className="mt-0.5 sm:mt-0 shrink-0"
              />
              Gated (require email before download)
            </label>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSave} className="w-full sm:w-auto">
              {editingId ? "Save Changes" : "Create Resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
