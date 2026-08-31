"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label";
import { useCmsCommands, useCmsSettings, useNews } from "@/client/queries/cms";
import { queryKeys } from "@/client/queries/query-keys";
import { apiClient } from "@/client/api/client";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle2,
  Newspaper,
  Check,
  X,
  XCircle,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { CmsImageUploadField } from "@/components/cms/CmsImageUploadField";
import {
  DashboardButton,
  DashboardFilterBar,
  DashboardSection,
  DashboardStatusLabel,
  PortalPageShell,
} from "@/components/dashboard";
import { slugifyNewsTitle } from "@/shared/news-visibility";

type NewsType = "award" | "press_release" | "firm_news";
type NewsStatus = "draft" | "pending_review" | "published" | "rejected";
type StatusFilter = "all" | "pending_review" | "published" | "draft" | "rejected";

export default function AdminCMSNews() {
  const news = useNews({}, "admin") || [];
  const settings = useCmsSettings("admin") || {};
  const cms = useCmsCommands();
  const queryClient = useQueryClient();
  const createNews = (body: any) => cms.create("news", body);
  const updateNews = ({ id, ...body }: any) => cms.update("news", id, body);
  const deleteNews = ({ id }: any) => cms.remove("news", id);

  const [heroTitle, setHeroTitle] = useState("News & Awards");
  const [heroSubtitle, setHeroSubtitle] = useState(
    "Firm announcements, press coverage, and recognition from Srimar Law advocates.",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    date: new Date().toISOString().slice(0, 10),
    type: "firm_news" as NewsType,
    status: "draft" as NewsStatus,
    linkUrl: "",
    imageUrl: "",
    seoTitle: "",
    seoDescription: "",
    displayOrder: 0,
    isFeatured: false,
  });

  useEffect(() => {
    if (settings.newsHeroTitle) setHeroTitle(String(settings.newsHeroTitle));
    if (settings.newsHeroSubtitle) setHeroSubtitle(String(settings.newsHeroSubtitle));
  }, [settings.newsHeroTitle, settings.newsHeroSubtitle]);

  const saveHeroSetting = async (key: string, value: string) => {
    try {
      await cms.updateSettings({ [key]: value });
      toast.success("Hero updated");
    } catch {
      toast.error("Failed to save hero");
    }
  };

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return news.filter((n: any) => {
      const matchesSearch =
        n.title.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        (n.excerpt || "").toLowerCase().includes(q) ||
        (n.slug || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || n.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [news, searchTerm, statusFilter]);

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingId(item._id);
      setSlugTouched(true);
      setFormData({
        title: item.title || "",
        slug: item.slug || "",
        excerpt: item.excerpt || "",
        content: item.content || "",
        date: item.date?.slice?.(0, 10) || item.date || new Date().toISOString().slice(0, 10),
        type: item.type || "firm_news",
        status: item.status || "published",
        linkUrl: item.linkUrl || "",
        imageUrl: item.imageUrl || "",
        seoTitle: item.seoTitle || "",
        seoDescription: item.seoDescription || "",
        displayOrder: Number(item.displayOrder ?? 0),
        isFeatured: Boolean(item.isFeatured),
      });
    } else {
      setEditingId(null);
      setSlugTouched(false);
      setFormData({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        date: new Date().toISOString().slice(0, 10),
        type: "firm_news",
        status: "draft",
        linkUrl: "",
        imageUrl: "",
        seoTitle: "",
        seoDescription: "",
        displayOrder: 0,
        isFeatured: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: slugTouched ? prev.slug : slugifyNewsTitle(title),
    }));
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.excerpt.trim() || !formData.content.trim()) {
      toast.error("Title, excerpt, and content are required.");
      return;
    }
    const slug = (formData.slug.trim() || slugifyNewsTitle(formData.title)).toLowerCase();
    try {
      const payload = {
        title: formData.title,
        slug,
        excerpt: formData.excerpt,
        content: formData.content,
        date: formData.date,
        type: formData.type,
        status: formData.status,
        linkUrl: formData.linkUrl || undefined,
        imageUrl: formData.imageUrl || undefined,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        displayOrder: Number(formData.displayOrder) || 0,
        isFeatured: formData.isFeatured,
      };
      if (editingId) {
        await updateNews({ id: editingId as any, ...payload });
        toast.success("News item updated.");
      } else {
        await createNews(payload);
        toast.success("News item created.");
      }
      setIsModalOpen(false);
    } catch (e) {
      toast.error("Failed to save news item.");
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this news item permanently?")) return;
    try {
      await deleteNews({ id: id as any });
      toast.success("News item deleted.");
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const handleReview = async (id: string, action: "approve" | "reject") => {
    let reviewNotes: string | undefined;
    if (action === "reject") {
      const notes = window.prompt("Rejection notes (shared with the author):");
      if (notes === null) return;
      reviewNotes = notes.trim() || undefined;
    }
    try {
      await apiClient.request(`/api/v1/cms/news/${id}/review`, {
        method: "POST",
        body: { action, reviewNotes },
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.cms.all });
      toast.success(action === "approve" ? "News approved and published." : "News rejected.");
    } catch (e) {
      console.error(e);
      toast.error("Review action failed.");
    }
  };

  const typeLabel = (type: string) => {
    if (type === "award") return "Award";
    if (type === "press_release") return "Press Release";
    return "Firm News";
  };

  const statusBadge = (status: string) => {
    if (status === "published") {
      return (
        <DashboardStatusLabel
          status="published"
          label="Published"
          icon={CheckCircle2}
          className="whitespace-nowrap text-[10px]"
        />
      );
    }
    if (status === "pending_review") {
      return (
        <DashboardStatusLabel
          status="pending_review"
          label="Pending"
          icon={Clock}
          className="whitespace-nowrap text-[10px]"
        />
      );
    }
    if (status === "rejected") {
      return (
        <DashboardStatusLabel
          status="rejected"
          label="Rejected"
          icon={XCircle}
          className="whitespace-nowrap text-[10px]"
        />
      );
    }
    return (
      <DashboardStatusLabel
        status="draft"
        label="Draft"
        className="whitespace-nowrap text-[10px]"
      />
    );
  };

  const statusLocked = formData.status === "pending_review" || formData.status === "rejected";

  return (
    <PortalPageShell
      portal="admin"
      decorated
      showTodayDate
      eyebrow="Content management"
      title="News & Awards"
      description="Manage press releases, awards, and firm announcements."
      icon={Newspaper}
      actions={
        <DashboardButton onClick={() => handleOpenModal()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4" /> New Item
        </DashboardButton>
      }
      contentClassName="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 min-w-0"
    >
      <DashboardSection title="Public page chrome" description="Hero copy for /news">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="news-hero-title">Hero title</Label>
            <Input
              id="news-hero-title"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              onBlur={() => saveHeroSetting("newsHeroTitle", heroTitle)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="news-hero-subtitle">Hero subtitle</Label>
            <Input
              id="news-hero-subtitle"
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              onBlur={() => saveHeroSetting("newsHeroSubtitle", heroSubtitle)}
            />
          </div>
        </div>
      </DashboardSection>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["pending_review", "Pending"],
            ["published", "Published"],
            ["draft", "Draft"],
            ["rejected", "Rejected"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={statusFilter === value ? "default" : "outline"}
            onClick={() => setStatusFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      <DashboardSection
        title="News & awards"
        className="border-dashboard-border overflow-hidden min-w-0"
      >
        <DashboardFilterBar className="mb-4 border-b border-dashboard-border pb-4">
          <div className="relative flex-1 min-w-0 flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              type="text"
              placeholder="Search title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 min-w-0 w-full"
            />
          </div>
        </DashboardFilterBar>

        <div className="md:hidden divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-muted-foreground">
              <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No news items found.</p>
            </div>
          ) : (
            filtered.map((item: any) => (
              <div key={item._id} className="p-3 space-y-3 min-w-0">
                <div className="min-w-0 space-y-1.5">
                  <p className="font-semibold text-foreground text-sm break-words leading-snug">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{item.slug}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                    {item.excerpt}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <DashboardStatusLabel
                      tone="neutral"
                      label={typeLabel(item.type)}
                      className="whitespace-nowrap text-[10px]"
                    />
                    {statusBadge(item.status)}
                    {item.isFeatured ? (
                      <DashboardStatusLabel
                        tone="primary"
                        label="Featured"
                        className="text-[10px]"
                      />
                    ) : null}
                    <span className="text-xs text-muted-foreground tabular-nums">{item.date}</span>
                  </div>
                  {item.status === "rejected" && item.reviewNotes ? (
                    <p className="text-xs text-destructive break-words">
                      Review notes: {item.reviewNotes}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-dashboard-border">
                  {item.status === "pending_review" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleReview(item._id, "approve")}
                        className="gap-1.5"
                      >
                        <Check className="w-4 h-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReview(item._id, "reject")}
                        className="gap-1.5"
                      >
                        <X className="w-4 h-4" /> Reject
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenModal(item)}
                    className="gap-1.5"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item._id)}
                    className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-dashboard-neutral-soft/50 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 lg:px-6 py-4">Title</th>
                <th className="px-4 lg:px-6 py-4">Type</th>
                <th className="px-4 lg:px-6 py-4">Date</th>
                <th className="px-4 lg:px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashboard-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    No news items found.
                  </td>
                </tr>
              ) : (
                filtered.map((item: any) => (
                  <tr
                    key={item._id}
                    className="bg-dashboard-panel hover:bg-dashboard-panel-hover transition-colors group"
                  >
                    <td className="px-4 lg:px-6 py-4 min-w-0">
                      <div className="font-semibold text-foreground text-base mb-1 break-words max-w-lg">
                        {item.title}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-xs">
                        {item.slug}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-md">
                        {item.excerpt}
                      </div>
                      {item.status === "rejected" && item.reviewNotes ? (
                        <p className="text-xs text-destructive mt-1 line-clamp-2">
                          Review notes: {item.reviewNotes}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <DashboardStatusLabel
                          tone="neutral"
                          label={typeLabel(item.type)}
                          className="whitespace-nowrap w-fit"
                        />
                        {statusBadge(item.status)}
                        {item.isFeatured ? (
                          <DashboardStatusLabel
                            tone="primary"
                            label="Featured"
                            className="w-fit text-[10px]"
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-muted-foreground whitespace-nowrap tabular-nums">
                      {item.date}
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        {item.status === "pending_review" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReview(item._id, "approve")}
                            >
                              <Check className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleReview(item._id, "reject")}
                            >
                              <X className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(item)}>
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item._id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DashboardSection>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl w-[calc(100%-1rem)] sm:w-full bg-background border-dashboard-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit News Item" : "Create News Item"}</DialogTitle>
            <DialogDescription>Publish awards, press releases, and firm news.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 min-w-0">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Headline"
                className="min-w-0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">URL Slug</label>
              <Input
                value={formData.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setFormData({ ...formData, slug: e.target.value });
                }}
                placeholder="e.g. top-corporate-firm-2026"
                className="min-w-0"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2 min-w-0">
                <label className="text-sm font-semibold">Type</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as NewsType })}
                >
                  <option value="firm_news">Firm News</option>
                  <option value="award">Award</option>
                  <option value="press_release">Press Release</option>
                </select>
              </div>
              <div className="space-y-2 min-w-0">
                <label className="text-sm font-semibold">Status</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm"
                  value={formData.status}
                  disabled={statusLocked}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as NewsStatus,
                    })
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  {formData.status === "pending_review" && (
                    <option value="pending_review">Pending review</option>
                  )}
                  {formData.status === "rejected" && <option value="rejected">Rejected</option>}
                </select>
              </div>
              <div className="space-y-2 min-w-0">
                <label className="text-sm font-semibold">Date</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="min-w-0"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  id="news-featured"
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                />
                <Label htmlFor="news-featured">Featured</Label>
              </div>
              <div className="space-y-2 min-w-0">
                <Label htmlFor="news-display-order">Display order</Label>
                <Input
                  id="news-display-order"
                  type="number"
                  min={0}
                  value={formData.displayOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      displayOrder: Number.parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Excerpt</label>
              <textarea
                className="flex min-h-[70px] w-full min-w-0 rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Short summary shown on the news page"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Content (Markdown)</label>
              <textarea
                className="flex min-h-[120px] sm:min-h-[140px] w-full min-w-0 rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Full article body (Markdown supported)"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <label className="text-sm font-semibold">SEO title</label>
                <Input
                  value={formData.seoTitle}
                  onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                  placeholder="Optional page title"
                />
              </div>
              <div className="space-y-2 min-w-0">
                <label className="text-sm font-semibold">SEO description</label>
                <Input
                  value={formData.seoDescription}
                  onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                  placeholder="Optional meta description"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <CmsImageUploadField
                  label="Image"
                  purpose="news_image"
                  value={formData.imageUrl || undefined}
                  onChange={(url) => setFormData({ ...formData, imageUrl: url ?? "" })}
                  previewClassName="mt-2 h-20 w-full max-w-xs rounded-md object-cover border"
                  hint="Upload JPEG/PNG or paste HTTPS / CMS asset URL."
                />
              </div>
              <div className="space-y-2 min-w-0">
                <label className="text-sm font-semibold">External Link</label>
                <Input
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="https://..."
                  className="min-w-0"
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button onClick={handleSave} className="gap-2 w-full sm:w-auto">
                <CheckCircle2 className="w-4 h-4" /> Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
