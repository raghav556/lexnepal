import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
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
import { useCmsCommands, useCmsSettings, usePracticeAreas } from "@/client/queries/cms";
import {
  PRACTICE_AREA_ICON_OPTIONS,
  PracticeAreaIcon,
  resolvePracticeAreaIconName,
} from "@/shared/practice-area-icons";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Briefcase,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Home,
} from "lucide-react";

type FaqRow = { question: string; answer: string };

type FormState = {
  title: string;
  slug: string;
  icon: string;
  description: string;
  longDescription: string;
  faqs: FaqRow[];
  coverImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  displayOrder: number;
  showOnHome: boolean;
  isActive: boolean;
};

const emptyForm = (order = 0): FormState => ({
  title: "",
  slug: "",
  icon: "Scale",
  description: "",
  longDescription: "",
  faqs: [],
  coverImageUrl: "",
  seoTitle: "",
  seoDescription: "",
  displayOrder: order,
  showOnHome: true,
  isActive: true,
});

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

export default function AdminCMSPracticeAreas() {
  const practiceAreas = usePracticeAreas({}, "admin");
  const settings = useCmsSettings("admin");
  const cms = useCmsCommands();

  const sorted = useMemo(
    () =>
      [...(practiceAreas || [])].sort(
        (
          a: { displayOrder?: number; title?: string },
          b: { displayOrder?: number; title?: string },
        ) =>
          (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
          String(a.title ?? "").localeCompare(String(b.title ?? "")),
      ),
    [practiceAreas],
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slugLocked, setSlugLocked] = useState(false);
  const [formData, setFormData] = useState<FormState>(emptyForm());
  const [confirm, setConfirm] = useState<ConfirmDialogState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [heroTitle, setHeroTitle] = useState("Practice Areas");
  const [heroSubtitle, setHeroSubtitle] = useState(
    "Our advocates bring deep specialization across major areas of Nepal law.",
  );

  useEffect(() => {
    if (!settings) return;
    if (settings.practiceAreasHeroTitle) setHeroTitle(String(settings.practiceAreasHeroTitle));
    if (settings.practiceAreasHeroSubtitle)
      setHeroSubtitle(String(settings.practiceAreasHeroSubtitle));
  }, [settings]);

  const saveHeroSetting = async (key: string, value: string) => {
    try {
      await cms.updateSettings({ settings: [{ key, value }] });
      toast.success("Page chrome updated");
    } catch {
      toast.error("Failed to update page chrome");
    }
  };

  const handleOpenModal = (pa?: Record<string, unknown>) => {
    if (pa) {
      setEditingId(String(pa._id || pa.id));
      setSlugLocked(true);
      const faqs = Array.isArray(pa.faqs)
        ? (pa.faqs as FaqRow[]).map((f) => ({
            question: String(f.question ?? ""),
            answer: String(f.answer ?? ""),
          }))
        : [];
      setFormData({
        title: String(pa.title ?? ""),
        slug: String(pa.slug ?? ""),
        icon: resolvePracticeAreaIconName(pa as { icon?: string; iconName?: string }),
        description: String(pa.description ?? ""),
        longDescription: String(pa.longDescription ?? ""),
        faqs,
        coverImageUrl: String(pa.coverImageUrl ?? ""),
        seoTitle: String(pa.seoTitle ?? ""),
        seoDescription: String(pa.seoDescription ?? ""),
        displayOrder: Number(pa.displayOrder ?? 0),
        showOnHome: pa.showOnHome !== false,
        isActive: pa.isActive !== false,
      });
    } else {
      setEditingId(null);
      setSlugLocked(false);
      setFormData(emptyForm(sorted.length));
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.slug.trim() || !formData.description.trim()) {
      toast.error("Title, slug, and short description are required.");
      return;
    }
    const payload = {
      title: formData.title.trim(),
      slug: formData.slug.trim(),
      icon: formData.icon,
      description: formData.description.trim(),
      longDescription: formData.longDescription.trim() || null,
      faqs: formData.faqs.filter((f) => f.question.trim() && f.answer.trim()),
      coverImageUrl: formData.coverImageUrl.trim() || null,
      seoTitle: formData.seoTitle.trim() || null,
      seoDescription: formData.seoDescription.trim() || null,
      displayOrder: formData.displayOrder,
      showOnHome: formData.showOnHome,
      isActive: formData.isActive,
    };
    try {
      if (editingId) {
        await cms.update("practice-areas", editingId, payload);
        toast.success("Practice area updated.");
      } else {
        await cms.create("practice-areas", payload);
        toast.success("Practice area created.");
      }
      setIsModalOpen(false);
    } catch {
      toast.error("Failed to save practice area.");
    }
  };

  const handleDelete = (id: string) => {
    setConfirm({
      title: "Delete practice area?",
      description: "This removes it from the public site. You can recreate it later.",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await cms.remove("practice-areas", id);
          toast.success("Practice area deleted.");
        } catch {
          toast.error("Failed to delete.");
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const handleToggleVisibility = async (pa: { _id: string; isActive: boolean }) => {
    try {
      await cms.update("practice-areas", pa._id, { isActive: !pa.isActive });
      toast.success(pa.isActive ? "Hidden from public site" : "Published to public site");
    } catch {
      toast.error("Failed to toggle visibility");
    }
  };

  const handleReorder = async (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === sorted.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const current = sorted[index];
    const target = sorted[targetIndex];
    const currentOrder = Number(current.displayOrder ?? index);
    const targetOrder = Number(target.displayOrder ?? targetIndex);
    try {
      await cms.update("practice-areas", current._id, { displayOrder: targetOrder });
      await cms.update("practice-areas", target._id, { displayOrder: currentOrder });
    } catch {
      toast.error("Failed to reorder");
    }
  };

  return (
    <PortalPageShell
      portal="admin"
      decorated
      showTodayDate
      loading={!practiceAreas}
      loadingLabel="Loading practice areas…"
      eyebrow="Content management"
      title="Practice Areas"
      description="Manage legal services shown on the homepage, listing page, and detail pages."
      icon={Briefcase}
      actions={
        <DashboardButton onClick={() => handleOpenModal()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Add Practice Area
        </DashboardButton>
      }
      contentClassName="max-w-5xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 min-w-0"
    >
      <DashboardSection title="Public page chrome" description="Hero copy for /practice-areas">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Hero title</Label>
            <Input
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              onBlur={() => saveHeroSetting("practiceAreasHeroTitle", heroTitle)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Hero subtitle</Label>
            <Input
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              onBlur={() => saveHeroSetting("practiceAreasHeroSubtitle", heroSubtitle)}
            />
          </div>
        </div>
      </DashboardSection>

      {sorted.length === 0 ? (
        <EmptyState
          title="No practice areas yet"
          description="Add your first practice area to show on the public site."
          icon={Briefcase}
          action={
            <DashboardButton onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4" /> Add Practice Area
            </DashboardButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 min-w-0">
          {sorted.map((pa: Record<string, unknown>, index: number) => {
            const id = String(pa._id || pa.id);
            const iconName = resolvePracticeAreaIconName(
              pa as { icon?: string; iconName?: string },
            );
            return (
              <DashboardSection
                key={id}
                className={`min-w-0 overflow-hidden [&>div]:px-3 [&>div]:sm:px-6 ${!pa.isActive ? "opacity-60 grayscale" : ""}`}
              >
                <div className="space-y-3 pb-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex flex-col shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleReorder(index, "up")}
                        className="p-1 hover:bg-muted rounded disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={index === sorted.length - 1}
                        onClick={() => handleReorder(index, "down")}
                        className="p-1 hover:bg-muted rounded disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                    {pa.coverImageUrl ? (
                      <img
                        src={String(pa.coverImageUrl)}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover shrink-0 border"
                      />
                    ) : (
                      <div className="w-10 h-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <PracticeAreaIcon name={iconName} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base sm:text-lg font-serif break-words leading-snug">
                          {String(pa.title)}
                        </h3>
                        <DashboardStatusLabel
                          tone={pa.isActive ? "success" : "neutral"}
                          label={pa.isActive ? "Active" : "Hidden"}
                          icon={pa.isActive ? Eye : EyeOff}
                        />
                        {pa.showOnHome !== false && (
                          <DashboardStatusLabel tone="primary" label="Home" icon={Home} />
                        )}
                      </div>
                      <p className="line-clamp-2 text-xs sm:text-sm text-muted-foreground">
                        {String(pa.description)}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">
                        /practice-areas/{String(pa.slug)}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mt-2 pt-3 border-t border-dashboard-border">
                    <div className="flex items-center gap-1">
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
                        asChild
                        className="h-9 w-9 p-0"
                        title="View on site"
                      >
                        <Link href={`/practice-areas/${String(pa.slug)}`} target="_blank">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() =>
                          handleToggleVisibility({ _id: id, isActive: Boolean(pa.isActive) })
                        }
                        title={pa.isActive ? "Hide" : "Show"}
                      >
                        {pa.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(id)}
                        className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
            <DialogTitle>{editingId ? "Edit Practice Area" : "New Practice Area"}</DialogTitle>
            <DialogDescription>
              Content appears on the public listing, detail page, homepage, and booking forms.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    title,
                    slug: !slugLocked || !prev.slug ? slugify(title) : prev.slug,
                  }));
                }}
                placeholder="e.g. Corporate Law"
              />
            </div>
            <div className="grid gap-2">
              <Label>URL Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) => {
                  setSlugLocked(true);
                  setFormData({ ...formData, slug: e.target.value });
                }}
                className="font-mono text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label>Icon</Label>
              <Select
                value={formData.icon}
                onValueChange={(v) => setFormData({ ...formData, icon: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRACTICE_AREA_ICON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Short description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Card summary for homepage and listing"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Long description</Label>
              <Textarea
                value={formData.longDescription}
                onChange={(e) => setFormData({ ...formData, longDescription: e.target.value })}
                placeholder="Full detail page body"
                rows={5}
              />
            </div>
            <CmsImageUploadField
              label="Cover image"
              purpose="practice_area_cover"
              value={formData.coverImageUrl || undefined}
              onChange={(url) => setFormData({ ...formData, coverImageUrl: url ?? "" })}
              previewClassName="mt-2 h-28 w-full max-w-xs rounded-lg object-cover border"
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>FAQs</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      faqs: [...formData.faqs, { question: "", answer: "" }],
                    })
                  }
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add FAQ
                </Button>
              </div>
              {formData.faqs.length === 0 && (
                <p className="text-xs text-muted-foreground">No FAQs yet.</p>
              )}
              {formData.faqs.map((faq, idx) => (
                <div key={idx} className="border border-dashboard-border rounded-lg p-3 space-y-2">
                  <Input
                    value={faq.question}
                    placeholder="Question"
                    onChange={(e) => {
                      const faqs = [...formData.faqs];
                      faqs[idx] = { ...faqs[idx], question: e.target.value };
                      setFormData({ ...formData, faqs });
                    }}
                  />
                  <Textarea
                    value={faq.answer}
                    placeholder="Answer"
                    rows={2}
                    onChange={(e) => {
                      const faqs = [...formData.faqs];
                      faqs[idx] = { ...faqs[idx], answer: e.target.value };
                      setFormData({ ...formData, faqs });
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        faqs: formData.faqs.filter((_, i) => i !== idx),
                      })
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>SEO title</Label>
                <Input
                  value={formData.seoTitle}
                  onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Display order</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.displayOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, displayOrder: Number(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>SEO description</Label>
              <Textarea
                value={formData.seoDescription}
                onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-dashboard-border">
                <span className="text-sm font-medium">Visible on site</span>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="accent-primary"
                />
              </label>
              <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-dashboard-border">
                <span className="text-sm font-medium">Show on homepage</span>
                <input
                  type="checkbox"
                  checked={formData.showOnHome}
                  onChange={(e) => setFormData({ ...formData, showOnHome: e.target.checked })}
                  className="accent-primary"
                />
              </label>
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

      <ConfirmDialog
        state={confirm}
        busy={confirmBusy}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      />
    </PortalPageShell>
  );
}
