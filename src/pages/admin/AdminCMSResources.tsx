import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, BookOpen, Download, Edit, Trash2 } from "lucide-react";
import { FadeInUp } from "@/components/ui/animations";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AdminCMSResources() {
  const resources = useQuery(api.cms.listResources, {}) || [];
  const createResource = useMutation(api.cms.createResource);
  const updateResource = useMutation(api.cms.updateResource);
  const deleteResource = useMutation(api.cms.deleteResource);

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
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Resources CMS</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage whitepapers, legal guides, and downloadable resources.</p>
        </div>
        <Button className="bg-accent hover:bg-accent/90" onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" /> Upload Resource
        </Button>
      </div>

      <FadeInUp>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="bg-secondary/20 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" /> Resource Library
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {resources.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <BookOpen className="w-12 h-12 mb-4 opacity-20" />
                <p>No resources published yet. Click "Upload Resource" to add a whitepaper.</p>
              </div>
            ) : (
              <div className="divide-y">
                {resources.map((res: any) => (
                  <div key={res._id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                        <BookOpen className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold truncate">{res.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span className="uppercase tracking-wider">{res.category}</span>
                          <span>•</span>
                          <span>Published: {res.publishedDate ? format(new Date(res.publishedDate), "MMM d, yyyy") : "—"}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {res.downloads ?? 0} downloads</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {res.isGated ? (
                        <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-200 font-medium">Lead Magnet</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 border border-green-200 font-medium">Public</span>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleOpenModal(res)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(res._id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeInUp>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg bg-background border-border">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Resource" : "Upload Resource"}</DialogTitle>
            <DialogDescription>Provide a downloadable file URL and metadata for the public resources page.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Resource title" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Guide, Whitepaper, Report..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Short description"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">File URL</label>
              <Input value={formData.fileUrl} onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })} placeholder="https://.../file.pdf" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cover Image URL (optional)</label>
              <Input value={formData.coverImageUrl} onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })} placeholder="https://..." />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.isGated}
                onChange={(e) => setFormData({ ...formData, isGated: e.target.checked })}
              />
              Gated (require email before download)
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? "Save Changes" : "Create Resource"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
