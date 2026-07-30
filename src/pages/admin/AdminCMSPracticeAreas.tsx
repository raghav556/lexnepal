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
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Practice Areas</h1>
          <p className="text-muted-foreground mt-1">Manage the legal services displayed on the public website.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-4 h-4" /> Add Practice Area
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {practiceAreas.map((pa: any) => (
          <Card key={pa._id} className={!pa.isActive ? "opacity-60 grayscale" : ""}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {iconMap[pa.iconName || pa.icon] || <Briefcase className="w-5 h-5" />}
                </div>
                <div>
                  <CardTitle className="text-lg font-serif">{pa.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{pa.description}</CardDescription>
                </div>
              </div>
              <Badge variant={pa.isActive ? "default" : "secondary"}>
                {pa.isActive ? <span className="flex items-center gap-1"><Eye className="w-3 h-3"/> Active</span> : <span className="flex items-center gap-1"><EyeOff className="w-3 h-3"/> Hidden</span>}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => handleOpenModal(pa)} className="gap-2">
                  <Edit className="w-4 h-4" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(pa._id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Practice Area" : "New Practice Area"}</DialogTitle>
            <DialogDescription>Configure how this service appears on the public website.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
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
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="iconName">Icon Name</Label>
              <Select value={formData.iconName} onValueChange={(v) => setFormData({ ...formData, iconName: v })}>
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
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Visibility</label>
                <p className="text-xs text-muted-foreground">Publish to the public website</p>
              </div>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Practice Area</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
