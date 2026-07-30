import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Plus, Edit, Trash2, Eye, EyeOff, Quote } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

export default function AdminCMSTestimonials() {
  const testimonials = useQuery(api.cms.listTestimonials, {}) || [];
  const createTestimonial = useMutation(api.cms.createTestimonial);
  const updateTestimonial = useMutation(api.cms.updateTestimonial);
  const deleteTestimonial = useMutation(api.cms.deleteTestimonial);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    text: "",
    rating: 5,
    isApproved: true,
  });

  const handleOpenModal = (t?: any) => {
    if (t) {
      setEditingId(t._id);
      setFormData({
        name: t.name,
        company: t.company || "",
        text: t.text,
        rating: t.rating || 5,
        isApproved: t.isApproved,
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", company: "", text: "", rating: 5, isApproved: true });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateTestimonial({ id: editingId as any, ...formData });
        toast.success("Testimonial updated.");
      } else {
        await createTestimonial(formData);
        toast.success("Testimonial created.");
      }
      setIsModalOpen(false);
    } catch (e) {
      toast.error("Failed to save.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this testimonial?")) {
      try {
        await deleteTestimonial({ id: id as any });
        toast.success("Testimonial deleted.");
      } catch (e) {
        toast.error("Failed to delete.");
      }
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Client Stories</h1>
          <p className="text-muted-foreground mt-1">Manage reviews and testimonials shown on the public landing page.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-4 h-4" /> Add Story
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testimonials.map((t: any) => (
          <Card key={t._id} className={!t.isApproved ? "opacity-60 grayscale" : ""}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Quote className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">{t.name}</CardTitle>
                    <CardDescription className="text-xs">{t.company}</CardDescription>
                  </div>
                </div>
                <Badge variant={t.isApproved ? "default" : "secondary"}>
                  {t.isApproved ? <span className="flex items-center gap-1"><Eye className="w-3 h-3"/> Public</span> : <span className="flex items-center gap-1"><EyeOff className="w-3 h-3"/> Hidden</span>}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < t.rating ? "text-accent text-sm" : "text-muted text-sm"}>★</span>
                ))}
              </div>
              <p className="text-sm italic text-muted-foreground line-clamp-3 mb-4">"{t.text}"</p>
              
              <div className="flex items-center gap-2 pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => handleOpenModal(t)} className="gap-2">
                  <Edit className="w-4 h-4" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(t._id)} className="text-destructive hover:bg-destructive/10">
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
            <DialogTitle>{editingId ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle>
            <DialogDescription>Configure how this review appears on the homepage.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Client Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. Rajesh Shrestha"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Company (Optional)</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. Shrestha Group of Companies"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rating">Rating (1-5)</Label>
              <select
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value={5}>5 Stars</option>
                <option value={4}>4 Stars</option>
                <option value={3}>3 Stars</option>
                <option value={2}>2 Stars</option>
                <option value={1}>1 Star</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="text">Testimonial Text</Label>
              <Textarea 
                id="text" 
                value={formData.text} 
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="The actual review or quote..."
                rows={4}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Visibility</label>
                <p className="text-xs text-muted-foreground">Approve and publish to the public website</p>
              </div>
              <input
                type="checkbox"
                checked={formData.isApproved}
                onChange={(e) => setFormData({ ...formData, isApproved: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Story</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
