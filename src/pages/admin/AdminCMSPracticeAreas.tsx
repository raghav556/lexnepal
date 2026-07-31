import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Plus, Edit, Trash2, Shield, Scale, Briefcase, Building2, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";

// Mapping for dynamic icons
const iconMap: Record<string, React.ReactNode> = {
  Scale: <Scale className="w-5 h-5" />,
  Shield: <Shield className="w-5 h-5" />,
  Briefcase: <Briefcase className="w-5 h-5" />,
  Building2: <Building2 className="w-5 h-5" />
};

export default function AdminCMSPracticeAreas() {
  const practiceAreas = useQuery(api.cms.listPracticeAreas, {}) || [];
  const createPA = useMutation(api.cms.createPracticeArea);
  const updatePA = useMutation(api.cms.updatePracticeArea);
  const deletePA = useMutation(api.cms.deletePracticeArea);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    iconName: "Scale",
    description: "",
    isActive: true,
  });

  const handleOpenModal = (pa?: any) => {
    if (pa) {
      setEditingId(pa._id);
      setFormData({
        title: pa.title,
        slug: pa.slug,
        iconName: pa.iconName || pa.icon || "Scale",
        description: pa.description,
        isActive: pa.isActive,
      });
    } else {
      setEditingId(null);
      setFormData({ title: "", slug: "", iconName: "Scale", description: "", isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await updatePA({ id: editingId as any, ...formData });
        toast.success("Practice area updated.");
      } else {
        await createPA(formData);
        toast.success("Practice area created.");
      }
      setIsModalOpen(false);
    } catch (e) {
      toast.error("Failed to save.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this practice area?")) {
      try {
        await deletePA({ id: id as any });
        toast.success("Practice area deleted.");
      } catch (e) {
        toast.error("Failed to delete.");
      }
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-foreground">Practice Areas</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage the legal services displayed on the public website.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2 w-full sm:w-auto shrink-0">
          <Plus className="w-4 h-4" /> Add Practice Area
        </Button>
      </div>

      {practiceAreas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No practice areas yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 min-w-0">
          {practiceAreas.map((pa: any) => (
            <Card
              key={pa._id}
              className={`min-w-0 overflow-hidden ${!pa.isActive ? "opacity-60 grayscale" : ""}`}
            >
              <CardHeader className="space-y-3 pb-2 px-3 sm:px-6">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {iconMap[pa.iconName || pa.icon] || <Briefcase className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base sm:text-lg font-serif break-words leading-snug">
                        {pa.title}
                      </CardTitle>
                      <Badge
                        variant={pa.isActive ? "default" : "secondary"}
                        className="shrink-0 whitespace-nowrap gap-1"
                      >
                        {pa.isActive ? (
                          <>
                            <Eye className="w-3 h-3" /> Active
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Hidden
                          </>
                        )}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2 text-xs sm:text-sm">
                      {pa.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="flex items-center justify-between gap-2 mt-2 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenModal(pa)}
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(pa._id)}
                    className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Practice Area" : "New Practice Area"}</DialogTitle>
            <DialogDescription>
              Configure how this service appears on the public website.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    title: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. Corporate Law"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">URL Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="iconName">Icon Name</Label>
              <Select
                value={formData.iconName}
                onValueChange={(v) => setFormData({ ...formData, iconName: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an icon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scale">Scale (Justice)</SelectItem>
                  <SelectItem value="Shield">Shield (Defense/Cyber)</SelectItem>
                  <SelectItem value="Briefcase">Briefcase (General/Business)</SelectItem>
                  <SelectItem value="Building2">Building (Corporate/Real Estate)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Short Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief summary for the cards on the homepage."
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border">
              <div className="space-y-0.5 min-w-0">
                <label className="text-sm font-medium">Visibility</label>
                <p className="text-xs text-muted-foreground">Publish to the public website</p>
              </div>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 accent-primary shrink-0"
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} className="w-full sm:w-auto">
              Save Practice Area
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
