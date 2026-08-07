"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { queryKeys } from "@/client/queries/query-keys";
import { useCurrentUser } from "@/hooks/use-current-user";
import { slugifyBlogTitle, staffCanEditBlogStatus } from "@/shared/blog-visibility";
import { slugifyNewsTitle } from "@/shared/news-visibility";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CmsImageUploadField } from "@/components/cms/CmsImageUploadField";
import { PenTool, Plus, Edit, Send, Clock, CheckCircle2, XCircle, FileText, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type BlogStatus = "draft" | "pending_review" | "published" | "rejected";
type NewsType = "firm_news" | "award" | "press_release";

type BlogPost = {
  _id: string;
  title: string;
  slug: string;
  category?: string;
  excerpt?: string;
  content?: string;
  coverImageUrl?: string;
  status: BlogStatus;
  publishDate?: string;
  seoTitle?: string;
  seoDescription?: string;
  author?: string;
  reviewNotes?: string | null;
};

type NewsItem = {
  _id: string;
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  type: NewsType;
  date: string;
  imageUrl?: string;
  status: BlogStatus;
  linkUrl?: string;
  reviewNotes?: string | null;
};

const emptyBlogForm = () => ({
  title: "",
  slug: "",
  category: "General",
  excerpt: "",
  content: "",
  coverImageUrl: "",
  seoTitle: "",
  seoDescription: "",
});

const emptyNewsForm = () => ({
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  type: "firm_news" as NewsType,
  date: new Date().toISOString().slice(0, 10),
  imageUrl: "",
});

function StatusBadge({ status }: { status: string }) {
  if (status === "published") {
    return (
      <Badge variant="default" className="uppercase tracking-wider text-[10px] gap-1">
        <CheckCircle2 className="w-3 h-3" />
        published
      </Badge>
    );
  }
  if (status === "pending_review") {
    return (
      <Badge variant="secondary" className="uppercase tracking-wider text-[10px] gap-1">
        <Clock className="w-3 h-3" />
        pending review
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="destructive" className="uppercase tracking-wider text-[10px] gap-1">
        <XCircle className="w-3 h-3" />
        rejected
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="uppercase tracking-wider text-[10px] gap-1">
      <FileText className="w-3 h-3" />
      draft
    </Badge>
  );
}

export default function StaffContentPage() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [mainTab, setMainTab] = useState("blog");

  const postsQuery = useQuery({
    queryKey: [...queryKeys.cms.all, "staff", "blog-posts"],
    queryFn: ({ signal }) =>
      apiClient.request<BlogPost[]>("/api/v1/staff/content/blog-posts", { signal }),
  });
  const newsQuery = useQuery({
    queryKey: [...queryKeys.cms.all, "staff", "news"],
    queryFn: ({ signal }) =>
      apiClient.request<NewsItem[]>("/api/v1/staff/content/news", { signal }),
  });

  const posts = postsQuery.data || [];
  const news = newsQuery.data || [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.cms.all });

  // Blog dialog
  const [blogOpen, setBlogOpen] = useState(false);
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [blogForm, setBlogForm] = useState(emptyBlogForm);
  const [blogReadOnly, setBlogReadOnly] = useState(false);
  const [savingBlog, setSavingBlog] = useState(false);

  // News dialog
  const [newsOpen, setNewsOpen] = useState(false);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [newsForm, setNewsForm] = useState(emptyNewsForm);
  const [newsSlugTouched, setNewsSlugTouched] = useState(false);
  const [newsReadOnly, setNewsReadOnly] = useState(false);
  const [savingNews, setSavingNews] = useState(false);

  const authorName = user?.name || user?.email || "Staff";

  const openBlogCreate = () => {
    setEditingBlogId(null);
    setSlugTouched(false);
    setBlogForm(emptyBlogForm());
    setBlogReadOnly(false);
    setBlogOpen(true);
  };

  const openBlogEdit = (post: BlogPost) => {
    setEditingBlogId(post._id);
    setSlugTouched(true);
    setBlogForm({
      title: post.title || "",
      slug: post.slug || "",
      category: post.category || "General",
      excerpt: post.excerpt || "",
      content: post.content || "",
      coverImageUrl: post.coverImageUrl || "",
      seoTitle: post.seoTitle || "",
      seoDescription: post.seoDescription || "",
    });
    setBlogReadOnly(!staffCanEditBlogStatus(post.status) || post.status === "published");
    setBlogOpen(true);
  };

  const handleBlogTitleChange = (title: string) => {
    setBlogForm((prev) => ({
      ...prev,
      title,
      slug: slugTouched ? prev.slug : slugifyBlogTitle(title),
    }));
  };

  const buildBlogPayload = () => {
    const slug = (blogForm.slug.trim() || slugifyBlogTitle(blogForm.title)).toLowerCase();
    return {
      title: blogForm.title.trim(),
      slug,
      category: blogForm.category || "General",
      excerpt: blogForm.excerpt.trim(),
      content: blogForm.content,
      coverImageUrl: blogForm.coverImageUrl || null,
      author: authorName,
      status: "draft" as const,
      publishDate: "",
      seoTitle: blogForm.seoTitle.trim() || undefined,
      seoDescription: blogForm.seoDescription.trim() || undefined,
    };
  };

  const saveBlogDraft = async (opts?: { close?: boolean; submitAfter?: boolean }) => {
    if (!blogForm.title.trim() || !blogForm.excerpt.trim() || !blogForm.content.trim()) {
      toast.error("Title, excerpt, and content are required.");
      return null;
    }
    setSavingBlog(true);
    try {
      const payload = buildBlogPayload();
      let id = editingBlogId;
      if (id) {
        await apiClient.request(`/api/v1/staff/content/blog-posts/${id}`, {
          method: "PATCH",
          body: payload,
        });
      } else {
        const created = await apiClient.request<BlogPost>("/api/v1/staff/content/blog-posts", {
          method: "POST",
          body: payload,
        });
        id = created._id;
        setEditingBlogId(id);
      }
      if (opts?.submitAfter && id) {
        await apiClient.request(`/api/v1/staff/content/blog-posts/${id}/submit`, {
          method: "POST",
        });
        toast.success("Submitted for review.");
      } else {
        toast.success(editingBlogId ? "Draft saved." : "Draft created.");
      }
      await invalidate();
      if (opts?.close !== false) setBlogOpen(false);
      return id;
    } catch (e) {
      console.error(e);
      toast.error(opts?.submitAfter ? "Failed to submit." : "Failed to save draft.");
      return null;
    } finally {
      setSavingBlog(false);
    }
  };

  const submitBlog = async (id: string) => {
    try {
      await apiClient.request(`/api/v1/staff/content/blog-posts/${id}/submit`, { method: "POST" });
      toast.success("Submitted for review.");
      await invalidate();
      setBlogOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit for review.");
    }
  };

  const openNewsCreate = () => {
    setEditingNewsId(null);
    setNewsForm(emptyNewsForm());
    setNewsSlugTouched(false);
    setNewsReadOnly(false);
    setNewsOpen(true);
  };

  const openNewsEdit = (item: NewsItem) => {
    setEditingNewsId(item._id);
    setNewsForm({
      title: item.title || "",
      slug: item.slug || "",
      excerpt: item.excerpt || "",
      content: item.content || "",
      type: item.type || "firm_news",
      date: item.date?.slice?.(0, 10) || item.date || new Date().toISOString().slice(0, 10),
      imageUrl: item.imageUrl || "",
    });
    setNewsSlugTouched(true);
    setNewsReadOnly(!staffCanEditBlogStatus(item.status) || item.status === "published");
    setNewsOpen(true);
  };

  const saveNewsDraft = async (opts?: { close?: boolean; submitAfter?: boolean }) => {
    if (!newsForm.title.trim() || !newsForm.excerpt.trim() || !newsForm.content.trim()) {
      toast.error("Title, excerpt, and content are required.");
      return null;
    }
    setSavingNews(true);
    try {
      const slug = (newsForm.slug.trim() || slugifyNewsTitle(newsForm.title)).toLowerCase();
      const payload = {
        title: newsForm.title.trim(),
        slug,
        excerpt: newsForm.excerpt.trim(),
        content: newsForm.content,
        type: newsForm.type,
        date: newsForm.date,
        imageUrl: newsForm.imageUrl || null,
        status: "draft" as const,
        displayOrder: 0,
        isFeatured: false,
      };
      let id = editingNewsId;
      if (id) {
        await apiClient.request(`/api/v1/staff/content/news/${id}`, {
          method: "PATCH",
          body: payload,
        });
      } else {
        const created = await apiClient.request<NewsItem>("/api/v1/staff/content/news", {
          method: "POST",
          body: payload,
        });
        id = created._id;
        setEditingNewsId(id);
      }
      if (opts?.submitAfter && id) {
        await apiClient.request(`/api/v1/staff/content/news/${id}/submit`, { method: "POST" });
        toast.success("Submitted for review.");
      } else {
        toast.success(editingNewsId ? "Draft saved." : "Draft created.");
      }
      await invalidate();
      if (opts?.close !== false) setNewsOpen(false);
      return id;
    } catch (e) {
      console.error(e);
      toast.error(opts?.submitAfter ? "Failed to submit." : "Failed to save draft.");
      return null;
    } finally {
      setSavingNews(false);
    }
  };

  const submitNews = async (id: string) => {
    try {
      await apiClient.request(`/api/v1/staff/content/news/${id}/submit`, { method: "POST" });
      toast.success("Submitted for review.");
      await invalidate();
      setNewsOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit for review.");
    }
  };

  const typeLabel = (type: string) => {
    if (type === "award") return "Award";
    if (type === "press_release") return "Press Release";
    return "Firm News";
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-foreground flex items-center gap-2">
            <PenTool className="w-6 h-6 text-accent shrink-0" />
            Content
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Draft blog articles and news for admin review. You cannot publish directly.
          </p>
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full min-w-0">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-auto">
          <TabsTrigger value="blog" className="gap-1.5">
            <FileText className="w-4 h-4" /> Blog
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-1.5">
            <Newspaper className="w-4 h-4" /> News
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blog" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={openBlogCreate} className="gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" /> New article
            </Button>
          </div>

          <Card className="border-border overflow-hidden min-w-0">
            {postsQuery.isLoading ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : posts.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No articles yet. Create a draft to get started.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {posts.map((post) => {
                  const canEdit = staffCanEditBlogStatus(post.status);
                  const canSubmit = canEdit;
                  return (
                    <div key={post._id} className="p-3 sm:p-4 space-y-2 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1.5">
                          <p className="font-semibold text-foreground text-sm sm:text-base break-words">
                            {post.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{post.slug}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={post.status} />
                            {post.category ? (
                              <Badge variant="outline" className="text-[10px]">
                                {post.category}
                              </Badge>
                            ) : null}
                          </div>
                          {post.status === "rejected" && post.reviewNotes ? (
                            <p className="text-xs text-destructive mt-1 break-words">
                              Review notes: {post.reviewNotes}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {(canEdit || post.status === "published" || post.status === "pending_review") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openBlogEdit(post)}
                              className="gap-1.5"
                            >
                              <Edit className="w-4 h-4" />
                              {canEdit ? "Edit" : "View"}
                            </Button>
                          )}
                          {canSubmit && (
                            <Button
                              size="sm"
                              onClick={() => submitBlog(post._id)}
                              className="gap-1.5"
                            >
                              <Send className="w-4 h-4" /> Submit
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="news" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={openNewsCreate} className="gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" /> New news item
            </Button>
          </div>

          <Card className="border-border overflow-hidden min-w-0">
            {newsQuery.isLoading ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : news.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No news drafts yet.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {news.map((item) => {
                  const canEdit = staffCanEditBlogStatus(item.status);
                  return (
                    <div key={item._id} className="p-3 sm:p-4 space-y-2 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1.5">
                          <p className="font-semibold text-foreground text-sm sm:text-base break-words">
                            {item.title}
                          </p>
                          {item.slug ? (
                            <p className="text-xs text-muted-foreground truncate">{item.slug}</p>
                          ) : null}
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.excerpt}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={item.status} />
                            <Badge variant="outline" className="text-[10px]">
                              {typeLabel(item.type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {item.date}
                            </span>
                          </div>
                          {item.status === "rejected" && item.reviewNotes ? (
                            <p className="text-xs text-destructive mt-1 break-words">
                              Review notes: {item.reviewNotes}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openNewsEdit(item)}
                            className="gap-1.5"
                          >
                            <Edit className="w-4 h-4" />
                            {canEdit ? "Edit" : "View"}
                          </Button>
                          {canEdit && (
                            <Button
                              size="sm"
                              onClick={() => submitNews(item._id)}
                              className="gap-1.5"
                            >
                              <Send className="w-4 h-4" /> Submit
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Blog dialog */}
      <Dialog open={blogOpen} onOpenChange={setBlogOpen}>
        <DialogContent className="max-w-2xl w-[calc(100%-1rem)] sm:w-full max-h-[90vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle>
              {blogReadOnly
                ? "View article"
                : editingBlogId
                  ? "Edit draft"
                  : "New article draft"}
            </DialogTitle>
            <DialogDescription>
              Save as draft, then submit for admin review. Publishing is admin-only.
            </DialogDescription>
          </DialogHeader>
          <div className={cn("space-y-4 py-2", blogReadOnly && "pointer-events-none opacity-90")}>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={blogForm.title}
                onChange={(e) => handleBlogTitleChange(e.target.value)}
                placeholder="Article title"
                disabled={blogReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={blogForm.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setBlogForm({ ...blogForm, slug: e.target.value });
                }}
                placeholder="url-slug"
                disabled={blogReadOnly}
                className="text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm"
                value={blogForm.category}
                onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })}
                disabled={blogReadOnly}
              >
                <option value="General">General</option>
                <option value="Corporate Law">Corporate Law</option>
                <option value="Civil Law">Civil Law</option>
                <option value="Criminal Defense">Criminal Defense</option>
                <option value="Firm News">Firm News</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Excerpt</Label>
              <textarea
                className="flex min-h-[70px] w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm"
                value={blogForm.excerpt}
                onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                disabled={blogReadOnly}
                placeholder="Short summary"
              />
            </div>
            <div className="space-y-2">
              <Label>Content (markdown)</Label>
              <textarea
                className="flex min-h-[160px] w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm font-mono"
                value={blogForm.content}
                onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                disabled={blogReadOnly}
                placeholder="# Write your article..."
              />
            </div>
            <CmsImageUploadField
              label="Cover image"
              purpose="blog_cover"
              value={blogForm.coverImageUrl || undefined}
              onChange={(url) => setBlogForm({ ...blogForm, coverImageUrl: url ?? "" })}
              previewClassName="mt-2 w-full h-24 object-cover rounded-md border border-border"
              hint="Upload a JPEG/PNG or paste a public HTTPS / CMS asset URL."
            />
            <div className="pt-2 border-t border-border space-y-3">
              <p className="text-sm font-semibold text-muted-foreground">SEO (optional)</p>
              <div className="space-y-2">
                <Label>SEO title</Label>
                <Input
                  value={blogForm.seoTitle}
                  onChange={(e) => setBlogForm({ ...blogForm, seoTitle: e.target.value })}
                  disabled={blogReadOnly}
                  placeholder="Leave blank to use main title"
                />
              </div>
              <div className="space-y-2">
                <Label>SEO description</Label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm"
                  value={blogForm.seoDescription}
                  onChange={(e) => setBlogForm({ ...blogForm, seoDescription: e.target.value })}
                  disabled={blogReadOnly}
                />
              </div>
            </div>
          </div>
          {!blogReadOnly && (
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="ghost" onClick={() => setBlogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => saveBlogDraft()}
                disabled={savingBlog}
                className="w-full sm:w-auto gap-1.5"
              >
                Save as draft
              </Button>
              <Button
                onClick={() => saveBlogDraft({ submitAfter: true })}
                disabled={savingBlog}
                className="w-full sm:w-auto gap-1.5"
              >
                <Send className="w-4 h-4" /> Submit for review
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* News dialog */}
      <Dialog open={newsOpen} onOpenChange={setNewsOpen}>
        <DialogContent className="max-w-2xl w-[calc(100%-1rem)] sm:w-full max-h-[90vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle>
              {newsReadOnly
                ? "View news"
                : editingNewsId
                  ? "Edit news draft"
                  : "New news draft"}
            </DialogTitle>
            <DialogDescription>
              Staff can only save drafts and submit for review.
            </DialogDescription>
          </DialogHeader>
          <div className={cn("space-y-4 py-2", newsReadOnly && "pointer-events-none opacity-90")}>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newsForm.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setNewsForm((prev) => ({
                    ...prev,
                    title,
                    slug: newsSlugTouched ? prev.slug : slugifyNewsTitle(title),
                  }));
                }}
                disabled={newsReadOnly}
                placeholder="Headline"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">URL Slug</Label>
              <Input
                value={newsForm.slug}
                onChange={(e) => {
                  setNewsSlugTouched(true);
                  setNewsForm({ ...newsForm, slug: e.target.value });
                }}
                disabled={newsReadOnly}
                placeholder="url-slug"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm"
                  value={newsForm.type}
                  onChange={(e) =>
                    setNewsForm({ ...newsForm, type: e.target.value as NewsType })
                  }
                  disabled={newsReadOnly}
                >
                  <option value="firm_news">Firm News</option>
                  <option value="award">Award</option>
                  <option value="press_release">Press Release</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newsForm.date}
                  onChange={(e) => setNewsForm({ ...newsForm, date: e.target.value })}
                  disabled={newsReadOnly}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Excerpt</Label>
              <textarea
                className="flex min-h-[70px] w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm"
                value={newsForm.excerpt}
                onChange={(e) => setNewsForm({ ...newsForm, excerpt: e.target.value })}
                disabled={newsReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Content (Markdown)</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm"
                value={newsForm.content}
                onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                disabled={newsReadOnly}
              />
            </div>
            <CmsImageUploadField
              label="Image"
              purpose="news_image"
              value={newsForm.imageUrl || undefined}
              onChange={(url) => setNewsForm({ ...newsForm, imageUrl: url ?? "" })}
              previewClassName="mt-2 h-20 w-full max-w-xs rounded-md object-cover border"
              hint="Upload JPEG/PNG or paste HTTPS / CMS asset URL."
            />
          </div>
          {!newsReadOnly && (
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="ghost" onClick={() => setNewsOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => saveNewsDraft()}
                disabled={savingNews}
                className="w-full sm:w-auto"
              >
                Save as draft
              </Button>
              <Button
                onClick={() => saveNewsDraft({ submitAfter: true })}
                disabled={savingNews}
                className="w-full sm:w-auto gap-1.5"
              >
                <Send className="w-4 h-4" /> Submit for review
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
