import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useCmsCommands, useTestimonials } from "@/client/queries/cms";
import { Plus, Edit, Trash2, Eye, EyeOff, Quote } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

export default function AdminCMSTestimonials() {
  const testimonials = useTestimonials({}, "admin") || [];
  const cms = useCmsCommands();
  const createTestimonial = (body: any) => cms.create("testimonials", body);
  const updateTestimonial = ({ id, ...body }: any) => cms.update("testimonials", id, body);
  const deleteTestimonial = ({ id }: any) => cms.remove("testimonials", id);

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
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-foreground">Client Stories</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage reviews and testimonials shown on the public landing page.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2 w-full sm:w-auto shrink-0">
          <Plus className="w-4 h-4" /> Add Story
        </Button>
      </div>

      {testimonials.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <Quote className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No client stories yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 min-w-0">
          {testimonials.map((t: any) => (
            <Card
              key={t._id}
              className={`min-w-0 overflow-hidden ${!t.isApproved ? "opacity-60 grayscale" : ""}`}
            >
              <CardHeader className="space-y-3 pb-2 px-3 sm:px-6">
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Quote className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-sm sm:text-base font-semibold break-words leading-snug">
                        {t.name}
                      </CardTitle>
                      <Badge
                        variant={t.isApproved ? "default" : "secondary"}
                        className="shrink-0 whitespace-nowrap gap-1"
                      >
                        {t.isApproved ? (
                          <>
                            <Eye className="w-3 h-3" /> Public
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Hidden
                          </>
                        )}
                      </Badge>
                    </div>
                    {t.company ? (
                      <CardDescription className="text-xs break-words">{t.company}</CardDescription>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="flex gap-0.5 mb-2" aria-label={`${t.rating} of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={i < t.rating ? "text-accent text-sm" : "text-muted-foreground/40 text-sm"}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-sm italic text-muted-foreground line-clamp-3 break-words mb-4">
                  &ldquo;{t.text}&rdquo;
                </p>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenModal(t)}
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(t._id)}
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
                className="flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. Rajesh Shrestha"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Company (Optional)</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. Shrestha Group of Companies"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rating">Rating (1-5)</Label>
              <select
                id="rating"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border">
              <div className="space-y-0.5 min-w-0">
                <label className="text-sm font-medium">Visibility</label>
                <p className="text-xs text-muted-foreground">Approve and publish to the public website</p>
              </div>
              <input
                type="checkbox"
                checked={formData.isApproved}
                onChange={(e) => setFormData({ ...formData, isApproved: e.target.checked })}
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
              Save Story
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
