import React, { useEffect, useState } from "react";
import { useCmsCommands, useCmsSettings, useResources } from "@/client/queries/cms";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, BookOpen, Download, Edit, Trash2 } from "lucide-react";
import { FadeInUp } from "@/components/ui/animations";
import { format } from "date-fns";
import { toast } from "sonner";
import { CmsImageUploadField } from "@/components/cms/CmsImageUploadField";
import { DashboardButton, DashboardSection, PortalPageShell } from "@/components/dashboard";
import { slugifyResourceTitle } from "@/shared/resources-visibility";

type FormState = {
  title: string;
  slug: string;
  description: string;
  category: string;
  coverImageUrl: string;
  fileUrl: string;
  isGated: boolean;
  status: "draft" | "published";
  publishedDate: string;
  seoTitle: string;
  seoDescription: string;
  displayOrder: string;
};

const emptyForm = (): FormState => ({
  title: "",
  slug: "",
  description: "",
  category: "Guide",
  coverImageUrl: "",
  fileUrl: "",
  isGated: false,
  status: "draft",
  publishedDate: new Date().toISOString().slice(0, 10),
  seoTitle: "",
  seoDescription: "",
  displayOrder: "0",
});

export default function AdminCMSResources() {
  const resources = useResources({}, "admin") || [];
  const settings = useCmsSettings("admin") || {};
  const cms = useCmsCommands();
  const createResource = (body: Record<string, unknown>) => cms.create("resources", body);
  const updateResource = ({ id, ...body }: { id: string } & Record<string, unknown>) =>
    cms.update("resources", id, body);
  const deleteResource = ({ id }: { id: string }) => cms.remove("resources", id);

  const [heroTitle, setHeroTitle] = useState("Legal Resources");
  const [heroSubtitle, setHeroSubtitle] = useState(
    "Guides, whitepapers, and reports prepared by our advocates.",
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [formData, setFormData] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (settings.resourcesHeroTitle) setHeroTitle(String(settings.resourcesHeroTitle));
    if (settings.resourcesHeroSubtitle) setHeroSubtitle(String(settings.resourcesHeroSubtitle));
  }, [settings.resourcesHeroTitle, settings.resourcesHeroSubtitle]);

  const saveHeroSetting = async (key: string, value: string) => {
    try {
      await cms.updateSettings({ [key]: value });
      toast.success("Hero updated");
    } catch {
      toast.error("Failed to save hero");
    }
  };

  const handleOpenModal = (res?: Record<string, unknown>) => {
    if (res) {
      setEditingId(String(res._id));
      setSlugTouched(true);
      setFormData({
        title: String(res.title || ""),
        slug: String(res.slug || ""),
        description: String(res.description || ""),
        category: String(res.category || "Guide"),
        coverImageUrl: String(res.coverImageUrl || ""),
        fileUrl: String(res.fileUrl || ""),
        isGated: Boolean(res.isGated),
        status: res.status === "draft" ? "draft" : "published",
        publishedDate:
          String(res.publishedDate || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
        seoTitle: String(res.seoTitle || ""),
        seoDescription: String(res.seoDescription || ""),
        displayOrder: String(res.displayOrder ?? 0),
      });
    } else {
      setEditingId(null);
      setSlugTouched(false);
      setFormData(emptyForm());
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.fileUrl.trim()) {
      toast.error("Title, description, and file are required.");
      return;
    }
    const slug = (formData.slug.trim() || slugifyResourceTitle(formData.title)).toLowerCase();
    try {
      const payload = {
        title: formData.title.trim(),
        slug,
        description: formData.description.trim(),
        category: formData.category.trim() || "Guide",
        coverImageUrl: formData.coverImageUrl || undefined,
        fileUrl: formData.fileUrl.trim(),
        isGated: formData.isGated,
        status: formData.status,
        publishedDate: formData.publishedDate || undefined,
        seoTitle: formData.seoTitle.trim() || null,
        seoDescription: formData.seoDescription.trim() || null,
        displayOrder: Number.parseInt(formData.displayOrder, 10) || 0,
      };
      if (editingId) {
        await updateResource({ id: editingId, ...payload });
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
      await deleteResource({ id });
      toast.success("Resource deleted.");
    } catch {
      toast.error("Failed to delete resource.");
    }
  };

  return (
    <PortalPageShell
      portal="admin"
      decorated
      showTodayDate
      eyebrow="Content management"
      title="Resources CMS"
      description="Manage whitepapers, legal guides, and downloadable resources."
      icon={BookOpen}
      actions={
        <DashboardButton onClick={() => handleOpenModal()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Upload Resource
        </DashboardButton>
      }
      contentClassName="max-w-7xl mx-auto"
    >
      <DashboardSection title="Public page chrome" description="Hero copy for /resources">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="resources-hero-title">Hero title</Label>
            <Input
              id="resources-hero-title"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              onBlur={() => saveHeroSetting("resourcesHeroTitle", heroTitle)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="resources-hero-subtitle">Hero subtitle</Label>
            <Input
              id="resources-hero-subtitle"
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              onBlur={() => saveHeroSetting("resourcesHeroSubtitle", heroSubtitle)}
            />
          </div>
        </div>
      </DashboardSection>

      <FadeInUp>
        <DashboardSection
          title="Resource Library"
          icon={BookOpen}
          className="border-dashboard-border/50 shadow-sm min-w-0 overflow-hidden"
        >
          {resources.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-muted-foreground flex flex-col items-center">
              <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 mb-4 opacity-20" />
              <p className="text-sm">
                No resources yet. Click &quot;Upload Resource&quot; to add a guide.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {resources.map((res: Record<string, unknown>) => (
                <div
                  key={String(res._id)}
                  className="p-3 sm:p-4 flex flex-col gap-3 hover:bg-secondary/20 transition-colors min-w-0"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <h4 className="font-bold text-sm sm:text-base break-words leading-snug">
                        {String(res.title)}
                      </h4>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {String(res.category)} · /{String(res.slug || "")}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          Published:{" "}
                          {res.publishedDate
                            ? format(new Date(String(res.publishedDate)), "MMM d, yyyy")
                            : "—"}
                        </span>
                        <span className="hidden sm:inline">·</span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" /> {Number(res.downloads ?? 0)} downloads
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pl-0 sm:pl-[3.25rem]">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded border font-medium ${
                          res.status === "published"
                            ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-dashboard-neutral-soft text-muted-foreground border-dashboard-border"
                        }`}
                      >
                        {res.status === "published" ? "Published" : "Draft"}
                      </span>
                      {res.isGated ? (
                        <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800 font-medium">
                          Lead Magnet
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded bg-secondary text-foreground border border-dashboard-border font-medium">
                          Open download
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <DashboardButton
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handleOpenModal(res)}
                      >
                        <Edit className="w-4 h-4" />
                      </DashboardButton>
                      <DashboardButton
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(String(res._id))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </DashboardButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardSection>
      </FadeInUp>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg w-[calc(100%-1rem)] sm:w-full bg-background border-dashboard-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Resource" : "Upload Resource"}</DialogTitle>
            <DialogDescription>
              Upload a PDF or paste an HTTPS file URL. Drafts stay off the public library.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 min-w-0">
            <div className="space-y-2">
              <Label htmlFor="res-title">Title</Label>
              <Input
                id="res-title"
                value={formData.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    title,
                    slug: slugTouched ? prev.slug : slugifyResourceTitle(title),
                  }));
                }}
                placeholder="Resource title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-slug">Slug</Label>
              <Input
                id="res-slug"
                value={formData.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setFormData({ ...formData, slug: e.target.value });
                }}
                placeholder="company-registration-guide"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="res-category">Category</Label>
                <Input
                  id="res-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Guide, Whitepaper..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="res-status">Status</Label>
                <select
                  id="res-status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value === "published" ? "published" : "draft",
                    })
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-desc">Description</Label>
              <textarea
                id="res-desc"
                className="flex min-h-[80px] w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Short description"
              />
            </div>
            <CmsImageUploadField
              label="Cover image"
              purpose="resource_cover"
              value={formData.coverImageUrl || undefined}
              onChange={(url) => setFormData({ ...formData, coverImageUrl: url || "" })}
            />
            <CmsImageUploadField
              label="PDF file"
              purpose="resource_file"
              value={formData.fileUrl || undefined}
              onChange={(url) => setFormData({ ...formData, fileUrl: url || "" })}
              accept="application/pdf"
              hideInlinePreview
              hint="Upload a PDF (max 25 MB) or paste an external HTTPS URL below."
              placeholder="Upload PDF or paste https://…"
            />
            <div className="space-y-2">
              <Label htmlFor="res-file-url">External file URL (fallback)</Label>
              <Input
                id="res-file-url"
                value={formData.fileUrl}
                onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                placeholder="https://… or /api/v1/public/cms/assets/…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="res-date">Published date</Label>
                <Input
                  id="res-date"
                  type="date"
                  value={formData.publishedDate}
                  onChange={(e) => setFormData({ ...formData, publishedDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="res-order">Display order</Label>
                <Input
                  id="res-order"
                  type="number"
                  min={0}
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-seo-title">SEO title</Label>
              <Input
                id="res-seo-title"
                value={formData.seoTitle}
                onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-seo-desc">SEO description</Label>
              <Input
                id="res-seo-desc"
                value={formData.seoDescription}
                onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isGated}
                onChange={(e) => setFormData({ ...formData, isGated: e.target.checked })}
                className="rounded border-input"
              />
              Require email (lead magnet) before download
            </label>
          </div>
          <DialogFooter>
            <DashboardButton variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </DashboardButton>
            <DashboardButton className="bg-accent hover:bg-accent/90" onClick={handleSave}>
              Save
            </DashboardButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
