import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Plus, Edit, Trash2, PenTool, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user.ts";

export default function AdminCMSBlog() {
  const posts = useQuery(api.cms.listBlogPosts, {}) || [];
  const createPost = useMutation(api.cms.createBlogPost);
  const updatePost = useMutation(api.cms.updateBlogPost);
  const deletePost = useMutation(api.cms.deleteBlogPost);
  const user = useCurrentUser();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "General",
    coverImageUrl: "",
    status: "draft" as "draft" | "published",
  });

  const handleOpenModal = (post?: any) => {
    if (post) {
      setEditingId(post._id);
      setFormData({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category || "General",
        coverImageUrl: post.coverImageUrl || "",
        status: post.status,
      });
    } else {
      setEditingId(null);
      setFormData({ title: "", slug: "", excerpt: "", content: "", category: "General", coverImageUrl: "", status: "draft" });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      if (editingId) {
        await updatePost({ 
          id: editingId as any, 
          ...formData,
          publishDate: formData.status === "published" ? new Date().toISOString() : "",
          author: user.name || user.email || "Admin",
        });
        toast.success("Blog post updated.");
      } else {
        await createPost({ 
          ...formData, 
          author: user.name || user.email || "Admin",
          publishDate: formData.status === "published" ? new Date().toISOString() : ""
        });
        toast.success("Blog post created.");
      }
      setIsModalOpen(false);
    } catch (e) {
      toast.error("Failed to save.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this post?")) {
      try {
        await deletePost({ id: id as any });
        toast.success("Post deleted.");
      } catch (e) {
        toast.error("Failed to delete.");
      }
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Blog Articles</h1>
          <p className="text-muted-foreground mt-1">Write and publish legal articles to the public website.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-4 h-4" /> New Article
        </Button>
      </div>

      <div className="grid gap-4">
        {posts.map((post: any) => (
          <Card key={post._id} className="overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-serif text-lg font-semibold">{post.title}</h3>
                  <Badge variant={post.status === "published" ? "default" : "secondary"}>
                    {post.status === "published" ? "Published" : "Draft"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{post.excerpt}</p>
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(post._creationTime).toLocaleDateString()}
                  {post.status === "published" && ` • Published: ${new Date(post.publishedAt).toLocaleDateString()}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenModal(post)} className="gap-2">
                  <PenTool className="w-4 h-4" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(post._id)} className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {posts.length === 0 && (
          <div className="text-center p-12 border border-dashed border-border rounded-lg text-muted-foreground">
            No articles found. Start writing your first blog post.
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Article" : "New Article"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Article title"
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
              <label className="text-sm font-medium">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="General">General</option>
                <option value="Corporate Law">Corporate Law</option>
                <option value="Civil Law">Civil Law</option>
                <option value="Criminal Law">Criminal Law</option>
                <option value="Property Law">Property Law</option>
                <option value="Family Law">Family Law</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Cover Image URL</label>
              <input
                type="url"
                value={formData.coverImageUrl}
                onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Excerpt</label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Short summary for the blog listing page."
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Content (Markdown/HTML supported)</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="flex min-h-[250px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                placeholder="Write your article content here..."
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as "draft" | "published" })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="draft">Draft (Hidden)</option>
                <option value="published">Published (Public)</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="gap-2">
              <CheckCircle2 className="w-4 h-4" /> Save Article
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
