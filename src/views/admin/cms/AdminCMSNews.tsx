import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useCmsCommands, useNews } from "@/client/queries/cms";
import { Plus, Edit, Trash2, Search, CheckCircle2, Newspaper } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";

type NewsType = "award" | "press_release" | "firm_news";

export default function AdminCMSNews() {
  const news = useNews({}, "admin") || [];
  const cms = useCmsCommands();
  const createNews = (body: any) => cms.create("news", body);
  const updateNews = ({ id, ...body }: any) => cms.update("news", id, body);
  const deleteNews = ({ id }: any) => cms.remove("news", id);

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    date: new Date().toISOString().slice(0, 10),
    type: "firm_news" as NewsType,
    linkUrl: "",
    imageUrl: "",
  });

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return news.filter(
      (n: any) =>
        n.title.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        (n.excerpt || "").toLowerCase().includes(q),
    );
  }, [news, searchTerm]);

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingId(item._id);
      setFormData({
        title: item.title || "",
        excerpt: item.excerpt || "",
        content: item.content || "",
        date: item.date?.slice?.(0, 10) || item.date || new Date().toISOString().slice(0, 10),
        type: item.type || "firm_news",
        linkUrl: item.linkUrl || "",
        imageUrl: item.imageUrl || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        title: "",
        excerpt: "",
        content: "",
        date: new Date().toISOString().slice(0, 10),
        type: "firm_news",
        linkUrl: "",
        imageUrl: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.excerpt.trim() || !formData.content.trim()) {
      toast.error("Title, excerpt, and content are required.");
      return;
    }
    try {
      const payload = {
        title: formData.title,
        excerpt: formData.excerpt,
        content: formData.content,
        date: formData.date,
        type: formData.type,
        linkUrl: formData.linkUrl || undefined,
        imageUrl: formData.imageUrl || undefined,
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

  const typeLabel = (type: string) => {
    if (type === "award") return "Award";
    if (type === "press_release") return "Press Release";
    return "Firm News";
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-foreground">News & Awards</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage press releases, awards, and firm announcements.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2 shrink-0 w-full sm:w-auto">
          <Plus className="w-4 h-4" /> New Item
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
                  <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                    {item.excerpt}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <Badge variant="outline" className="whitespace-nowrap text-[10px]">
                      {typeLabel(item.type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground tabular-nums">{item.date}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => handleOpenModal(item)} className="gap-1.5">
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

        {/* Desktop / tablet table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 lg:px-6 py-4">Title</th>
                <th className="px-4 lg:px-6 py-4">Type</th>
                <th className="px-4 lg:px-6 py-4">Date</th>
                <th className="px-4 lg:px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    No news items found.
                  </td>
                </tr>
              ) : (
                filtered.map((item: any) => (
                  <tr key={item._id} className="bg-background hover:bg-muted/30 transition-colors group">
                    <td className="px-4 lg:px-6 py-4 min-w-0">
                      <div className="font-semibold text-foreground text-base mb-1 break-words max-w-lg">
                        {item.title}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-md">{item.excerpt}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <Badge variant="outline" className="whitespace-nowrap">
                        {typeLabel(item.type)}
                      </Badge>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-muted-foreground whitespace-nowrap tabular-nums">
                      {item.date}
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
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
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl w-[calc(100%-1rem)] sm:w-full bg-background border-border">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit News Item" : "Create News Item"}</DialogTitle>
            <DialogDescription>Publish awards, press releases, and firm news.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 min-w-0">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Headline"
                className="min-w-0"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <label className="text-sm font-semibold">Date</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="min-w-0"
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
              <label className="text-sm font-semibold">Content</label>
              <textarea
                className="flex min-h-[120px] sm:min-h-[140px] w-full min-w-0 rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Full article body"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <label className="text-sm font-semibold">Image URL</label>
                <Input
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="min-w-0"
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
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleSave} className="gap-2 w-full sm:w-auto">
                <CheckCircle2 className="w-4 h-4" /> Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
