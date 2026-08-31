import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog.tsx";
import { CmsImageUploadField } from "@/components/cms/CmsImageUploadField";
import {
  DashboardButton,
  DashboardSection,
  DashboardStatusLabel,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { useCmsCommands, useTestimonials } from "@/client/queries/cms";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Quote, Eye, EyeOff, ChevronUp, ChevronDown, Home } from "lucide-react";

type FormState = {
  clientName: string;
  company: string;
  quote: string;
  rating: number;
  isApproved: boolean;
  showOnHome: boolean;
  displayOrder: number;
  avatarUrl: string;
};

type StatusFilter = "all" | "public" | "hidden";

const emptyForm = (order = 0): FormState => ({
  clientName: "",
  company: "",
  quote: "",
  rating: 5,
  isApproved: true,
  showOnHome: true,
  displayOrder: order,
  avatarUrl: "",
});

function apiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function AdminCMSTestimonials() {
  const testimonials = useTestimonials({}, "admin");
  const cms = useCmsCommands();

  const sorted = useMemo(
    () =>
      [...(testimonials || [])].sort(
        (
          a: { displayOrder?: number; clientName?: string; createdAt?: string },
          b: { displayOrder?: number; clientName?: string; createdAt?: string },
        ) =>
          (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
          String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")) ||
          String(a.clientName ?? "").localeCompare(String(b.clientName ?? "")),
      ),
    [testimonials],
  );

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const filtered = useMemo(() => {
    if (statusFilter === "public")
      return sorted.filter((t: { isApproved?: boolean }) => t.isApproved);
    if (statusFilter === "hidden")
      return sorted.filter((t: { isApproved?: boolean }) => !t.isApproved);
    return sorted;
  }, [sorted, statusFilter]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm());
  const [confirm, setConfirm] = useState<ConfirmDialogState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleOpenModal = (t?: Record<string, unknown>) => {
    if (t) {
      setEditingId(String(t._id || t.id));
      setFormData({
        clientName: String(t.clientName ?? t.name ?? ""),
        company: String(t.company ?? ""),
        quote: String(t.quote ?? t.text ?? ""),
        rating: Number(t.rating ?? 5),
        isApproved: t.isApproved !== false,
        showOnHome: t.showOnHome !== false,
        displayOrder: Number(t.displayOrder ?? 0),
        avatarUrl: String(t.avatarUrl ?? ""),
      });
    } else {
      setEditingId(null);
      setFormData(emptyForm(sorted.length));
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.clientName.trim() || !formData.quote.trim()) {
      toast.error("Client name and testimonial text are required.");
      return;
    }
    const payload = {
      clientName: formData.clientName.trim(),
      company: formData.company.trim() || null,
      quote: formData.quote.trim(),
      rating: formData.rating,
      isApproved: formData.isApproved,
      showOnHome: formData.showOnHome,
      displayOrder: formData.displayOrder,
      avatarUrl: formData.avatarUrl.trim() || null,
    };
    setSaving(true);
    try {
      if (editingId) {
        await cms.update("testimonials", editingId, payload);
        toast.success("Testimonial updated.");
      } else {
        await cms.create("testimonials", payload);
        toast.success("Testimonial created.");
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to save testimonial."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirm({
      title: "Delete testimonial?",
      description: `Remove “${name}” from the CMS. It will no longer appear on the homepage.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await cms.remove("testimonials", id);
          toast.success("Testimonial deleted.");
        } catch (error) {
          toast.error(apiErrorMessage(error, "Failed to delete."));
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const handleToggleApproved = async (t: { _id: string; isApproved: boolean }) => {
    try {
      await cms.update("testimonials", t._id, { isApproved: !t.isApproved });
      toast.success(t.isApproved ? "Hidden from public site" : "Approved for public site");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to toggle visibility"));
    }
  };

  const handleReorder = async (index: number, direction: "up" | "down") => {
    // Reorder against full sorted list so filters don't scramble order numbers.
    const fullIndex = sorted.findIndex(
      (item: { _id?: string; id?: string }) =>
        String(item._id || item.id) === String(filtered[index]._id || filtered[index].id),
    );
    if (fullIndex < 0) return;
    if (
      (direction === "up" && fullIndex === 0) ||
      (direction === "down" && fullIndex === sorted.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === "up" ? fullIndex - 1 : fullIndex + 1;
    const current = sorted[fullIndex];
    const target = sorted[targetIndex];
    const currentOrder = Number(current.displayOrder ?? fullIndex);
    const targetOrder = Number(target.displayOrder ?? targetIndex);
    try {
      await cms.update("testimonials", current._id, { displayOrder: targetOrder });
      await cms.update("testimonials", target._id, { displayOrder: currentOrder });
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to reorder"));
    }
  };

  return (
    <PortalPageShell
      portal="admin"
      decorated
      showTodayDate
      loading={testimonials === undefined}
      loadingLabel="Loading testimonials…"
      eyebrow="Content management"
      title="Client Stories"
      description="Manage reviews shown in the homepage Client Stories section."
      icon={Quote}
      actions={
        <DashboardButton onClick={() => handleOpenModal()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Add Story
        </DashboardButton>
      }
      contentClassName="max-w-5xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 min-w-0"
    >
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["public", "Public"],
            ["hidden", "Hidden"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={statusFilter === value ? "default" : "outline"}
            onClick={() => setStatusFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={sorted.length === 0 ? "No client stories yet" : "No stories match this filter"}
          description={
            sorted.length === 0
              ? "Add your first client story to feature on the homepage."
              : "Try a different filter to see more stories."
          }
          icon={Quote}
          action={
            sorted.length === 0 ? (
              <DashboardButton onClick={() => handleOpenModal()}>
                <Plus className="w-4 h-4" /> Add Story
              </DashboardButton>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 min-w-0">
          {filtered.map((t: any, index: number) => {
            const name = String(t.clientName ?? t.name ?? "Client");
            const quote = String(t.quote ?? t.text ?? "");
            const id = String(t._id ?? t.id);
            const rating = Math.min(5, Math.max(0, Number(t.rating ?? 0)));
            return (
              <DashboardSection
                key={id}
                className={`min-w-0 overflow-hidden [&>div]:px-3 [&>div]:sm:px-6 ${!t.isApproved ? "opacity-60 grayscale" : ""}`}
              >
                <div className="space-y-3 pb-2">
                  <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                    {t.avatarUrl ? (
                      <img
                        src={String(t.avatarUrl)}
                        alt=""
                        className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full object-cover border border-dashboard-border"
                      />
                    ) : (
                      <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-semibold break-words leading-snug">
                          {name}
                        </h3>
                        <DashboardStatusLabel
                          tone={t.isApproved ? "success" : "neutral"}
                          label={t.isApproved ? "Public" : "Hidden"}
                          icon={t.isApproved ? Eye : EyeOff}
                          className="shrink-0 whitespace-nowrap"
                        />
                        {t.showOnHome !== false && (
                          <DashboardStatusLabel
                            tone="primary"
                            label="Home"
                            icon={Home}
                            className="shrink-0"
                          />
                        )}
                      </div>
                      {t.company ? (
                        <p className="text-xs break-words text-muted-foreground">
                          {String(t.company)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => void handleReorder(index, "up")}
                        aria-label="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => void handleReorder(index, "down")}
                        aria-label="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex gap-0.5 mb-2" aria-label={`${rating} of 5 stars`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={
                          i < rating ? "text-accent text-sm" : "text-muted-foreground/40 text-sm"
                        }
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-sm italic text-muted-foreground line-clamp-3 break-words mb-4">
                    &ldquo;{quote}&rdquo;
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-dashboard-border">
                    <div className="flex gap-2">
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
                        onClick={() =>
                          void handleToggleApproved({ _id: id, isApproved: Boolean(t.isApproved) })
                        }
                        className="gap-1"
                        title={t.isApproved ? "Hide from public" : "Approve for public"}
                      >
                        {t.isApproved ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(id, name)}
                      className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </DashboardSection>
            );
          })}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle>
            <DialogDescription>
              Configure how this review appears on the homepage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="e.g. Rajesh Shrestha"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company">Company (optional)</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="e.g. Shrestha Group of Companies"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rating">Rating (1–5)</Label>
              <select
                id="rating"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value, 10) })}
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
              <Label htmlFor="quote">Testimonial Text</Label>
              <Textarea
                id="quote"
                value={formData.quote}
                onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                placeholder="The actual review or quote..."
                rows={4}
              />
            </div>
            <CmsImageUploadField
              label="Avatar"
              purpose="testimonial_avatar"
              value={formData.avatarUrl || undefined}
              onChange={(url) => setFormData({ ...formData, avatarUrl: url ?? "" })}
              previewClassName="mt-2 h-16 w-16 rounded-full object-cover border"
              hint="Upload a headshot or paste a public image URL / CMS asset path."
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="displayOrder">Display order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  min={0}
                  value={formData.displayOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, displayOrder: Number(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-dashboard-border">
              <div className="space-y-0.5 min-w-0">
                <label className="text-sm font-medium">Approved (public)</label>
                <p className="text-xs text-muted-foreground">Publish to the public website</p>
              </div>
              <input
                type="checkbox"
                checked={formData.isApproved}
                onChange={(e) => setFormData({ ...formData, isApproved: e.target.checked })}
                className="w-4 h-4 accent-primary shrink-0"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-dashboard-border">
              <div className="space-y-0.5 min-w-0">
                <label className="text-sm font-medium">Show on homepage</label>
                <p className="text-xs text-muted-foreground">Include in Client Stories carousel</p>
              </div>
              <input
                type="checkbox"
                checked={formData.showOnHome}
                onChange={(e) => setFormData({ ...formData, showOnHome: e.target.checked })}
                className="w-4 h-4 accent-primary shrink-0"
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="w-full sm:w-auto"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              className="w-full sm:w-auto"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Story"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        state={confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        busy={confirmBusy}
      />
    </PortalPageShell>
  );
}
