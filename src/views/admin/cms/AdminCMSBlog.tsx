import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useBlogPosts, useCmsCommands } from "@/client/queries/cms";
import { Plus, Edit, Trash2, Search, CheckCircle2, Clock, Globe, Eye, Code, FileText, Settings, Layout } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { FadeInUp } from "@/components/ui/animations.tsx";
import ReactMarkdown from 'react-markdown';
import { CmsImageUploadField } from "@/components/cms/CmsImageUploadField";

export default function AdminCMSBlog() {
  const posts = useBlogPosts({}, "admin") || [];
  const cms = useCmsCommands();
  const createPost = (body: any) => cms.create("blog-posts", body);
  const updatePost = ({ id, ...body }: any) => cms.update("blog-posts", id, body);
  const deletePost = ({ id }: any) => cms.remove("blog-posts", id);
  const user = useCurrentUser();

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Editor State
  const [editorTab, setEditorTab] = useState("write");
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    category: "General",
    excerpt: "",
    content: "",
    coverImageUrl: "",
    status: "draft" as "draft" | "published",
    publishDate: "",
    seoTitle: "",
    seoDescription: "",
  });

  const filteredPosts = useMemo(() => {
    return posts.filter((p: any) => 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [posts, searchTerm]);

  const handleOpenModal = (post?: any) => {
    if (post) {
      setEditingId(post._id);
      setFormData({
        title: post.title,
        slug: post.slug,
        category: post.category || "General",
        excerpt: post.excerpt,
        content: post.content,
        coverImageUrl: post.coverImageUrl || "",
        status: post.status || "draft",
        publishDate: post.publishDate || "",
        seoTitle: post.seoTitle || "",
        seoDescription: post.seoDescription || "",
      });
    } else {
      setEditingId(null);
      setFormData({ 
        title: "", slug: "", category: "General", excerpt: "", 
        content: "", coverImageUrl: "", status: "draft", publishDate: "", seoTitle: "", seoDescription: "" 
      });
    }
    setEditorTab("write");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      const publishDate =
        formData.status === "published"
          ? formData.publishDate || new Date().toISOString()
          : "";
      const payload = {
        title: formData.title,
        slug: formData.slug,
        category: formData.category,
        excerpt: formData.excerpt,
        content: formData.content,
        coverImageUrl: formData.coverImageUrl || undefined,
        status: formData.status,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        author: user.name || user.email || "Admin",
        publishDate,
      };

      if (editingId) {
        await updatePost({ id: editingId as any, ...payload });
        toast.success("Blog post updated.");
      } else {
        await createPost(payload);
        toast.success("Blog post created.");
      }
      setIsModalOpen(false);
    } catch (e) {
      toast.error("Failed to save article.");
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to permanently delete this post?")) {
      try {
        await deletePost({ id: id as any });
        toast.success("Post deleted.");
      } catch (e) {
        toast.error("Failed to delete.");
      }
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not Published";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch {
      return "Invalid Date";
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-foreground">Blog Articles</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage and publish articles to the public knowledge base.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2 shrink-0 w-full sm:w-auto">
          <Plus className="w-4 h-4" /> New Article
        </Button>
      </div>

      <Card className="border-border overflow-hidden min-w-0">
        <div className="p-3 sm:p-4 border-b border-border bg-muted/30 flex items-center gap-2 min-w-0">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            type="text"
            placeholder="Search title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 h-8 min-w-0 w-full"
          />
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border">
          {filteredPosts.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No articles found matching your criteria.
            </p>
          ) : (
            filteredPosts.map((post: any) => (
              <div key={post._id} className="p-3 space-y-3 min-w-0">
                <div className="min-w-0 space-y-1.5">
                  <p className="font-semibold text-foreground text-sm sm:text-base break-words leading-snug">
                    {post.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{post.slug}</p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Badge
                      variant={post.status === "published" ? "default" : "secondary"}
                      className="uppercase tracking-wider text-[10px] gap-1 whitespace-nowrap"
                    >
                      {post.status === "published" ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {post.status}
                    </Badge>
                    <Badge variant="outline" className="bg-background text-[10px]">
                      {post.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {post.author}
                    {post.status === "published" ? ` · ${formatDate(post.publishDate)}` : ""}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => handleOpenModal(post)} className="gap-1.5">
                    <Edit className="w-4 h-4" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(post._id)}
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

        {/* Desktop / tablet table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 lg:px-6 py-4">Title & Details</th>
                <th className="px-4 lg:px-6 py-4">Status</th>
                <th className="px-4 lg:px-6 py-4">Category</th>
                <th className="px-4 lg:px-6 py-4">Author</th>
                <th className="px-4 lg:px-6 py-4">Published Date</th>
                <th className="px-4 lg:px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No articles found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post: any) => (
                  <tr key={post._id} className="bg-background hover:bg-muted/30 transition-colors group">
                    <td className="px-4 lg:px-6 py-4 min-w-0">
                      <div className="font-semibold text-foreground text-base mb-1 break-words max-w-md">
                        {post.title}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-xs">{post.slug}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <Badge
                        variant={post.status === "published" ? "default" : "secondary"}
                        className="uppercase tracking-wider text-[10px] whitespace-nowrap"
                      >
                        {post.status === "published" ? (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                        ) : (
                          <Clock className="w-3 h-3 mr-1" />
                        )}
                        {post.status}
                      </Badge>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <Badge variant="outline" className="bg-background whitespace-nowrap">
                        {post.category}
                      </Badge>
                    </td>
                    <td className="px-4 lg:px-6 py-4 font-medium text-muted-foreground whitespace-nowrap">
                      {post.author}
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {post.status === "published" ? formatDate(post.publishDate) : "—"}
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(post)}>
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(post._id)}
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
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="!max-w-6xl w-[calc(100%-1rem)] sm:w-[95vw] max-w-[95vw] h-[92vh] sm:h-[90vh] flex flex-col bg-background border-border p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-3 sm:p-6 border-b border-border bg-muted/10 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl">
                  {editingId ? "Edit Article" : "Create New Article"}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Use the markdown editor to craft premium blog content.
                </DialogDescription>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0">
                <div className="flex items-center gap-1 sm:gap-2 bg-muted/50 p-1 sm:p-1.5 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: "draft" })}
                    className={`flex-1 sm:flex-none px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${formData.status === "draft" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: "published" })}
                    className={`flex-1 sm:flex-none px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${formData.status === "published" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Published
                  </button>
                </div>
                <Button onClick={handleSave} className="gap-2 w-full sm:w-auto">
                  <CheckCircle2 className="w-4 h-4" /> Save Article
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
            {/* Left Sidebar - Meta & SEO */}
            <div className="w-full md:w-80 md:border-r border-b md:border-b-0 border-border bg-muted/10 text-foreground overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 shrink-0 max-h-[38vh] md:max-h-none">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Title</label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Article Title" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">URL Slug</label>
                <Input value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} placeholder="e.g. new-civil-code-nepal" className="bg-background text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Category</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="General">General</option>
                  <option value="Corporate Law">Corporate Law</option>
                  <option value="Civil Law">Civil Law</option>
                  <option value="Criminal Defense">Criminal Defense</option>
                  <option value="Firm News">Firm News</option>
                </select>
              </div>
              <div className="space-y-2">
                <CmsImageUploadField
                  label="Cover image"
                  purpose="blog_cover"
                  value={formData.coverImageUrl || undefined}
                  onChange={(url) => setFormData({ ...formData, coverImageUrl: url ?? "" })}
                  previewClassName="mt-2 w-full h-24 object-cover rounded-md border border-border"
                  hint="Upload a JPEG/PNG or paste a public HTTPS / CMS asset URL."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Short Excerpt</label>
                <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.excerpt} onChange={e => setFormData({...formData, excerpt: e.target.value})} placeholder="Appears on the blog index cards..." />
              </div>

              {/* SEO SECTION */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-4 text-primary">
                  <Globe className="w-4 h-4" />
                  <span className="font-semibold">SEO Metadata</span>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">SEO Title</label>
                    <Input value={formData.seoTitle} onChange={e => setFormData({...formData, seoTitle: e.target.value})} placeholder="Leave blank to use main title" className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">SEO Description</label>
                    <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.seoDescription} onChange={e => setFormData({...formData, seoDescription: e.target.value})} placeholder="Meta description for search engines" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Markdown Editor */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-background overflow-hidden">
              <div className="border-b border-border p-2 bg-muted/30 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 shrink-0">
                <Tabs value={editorTab} onValueChange={setEditorTab} className="w-full sm:max-w-sm">
                  <TabsList className="grid w-full grid-cols-2 h-auto">
                    <TabsTrigger value="write" className="gap-1.5 text-xs sm:text-sm px-2 py-2">
                      <Code className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="sm:hidden">Write</span>
                      <span className="hidden sm:inline">Write Markdown</span>
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="gap-1.5 text-xs sm:text-sm px-2 py-2">
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="sm:hidden">Preview</span>
                      <span className="hidden sm:inline">Live Preview</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <a
                  href="https://www.markdownguide.org/basic-syntax/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary sm:mr-2 flex items-center justify-center sm:justify-start gap-1"
                >
                  <FileText className="w-3 h-3" /> Markdown Guide
                </a>
              </div>

              <div className="flex-1 overflow-hidden relative min-h-[220px]">
                {editorTab === "write" ? (
                  <textarea
                    className="absolute inset-0 w-full h-full p-4 sm:p-6 bg-background text-foreground font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-0 border-0"
                    placeholder="# Write your article here..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full p-4 sm:p-8 overflow-y-auto bg-background prose prose-neutral dark:prose-invert max-w-none prose-sm sm:prose-base">
                    {formData.content ? (
                      <ReactMarkdown>{formData.content}</ReactMarkdown>
                    ) : (
                      <div className="text-muted-foreground italic h-full flex items-center justify-center">
                        Nothing to preview...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
