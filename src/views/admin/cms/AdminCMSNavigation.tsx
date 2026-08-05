import React, { useState, useEffect } from "react";
import { useCmsCommands, useCmsSettings, useNavigation } from "@/client/queries/cms";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Link as LinkIcon, Navigation, LayoutTemplate, Layers, ChevronUp, ChevronDown, Eye, EyeOff, ExternalLink } from "lucide-react";
import { FadeInUp } from "@/components/ui/animations.tsx";

type LinkLocation = "header" | "footer_col_1" | "footer_col_2";

export default function AdminCMSNavigation() {
  const links = useNavigation({}, "admin");
  const settings = useCmsSettings("admin");
  const cms = useCmsCommands();
  const createLink = (body: any) => cms.create("navigation", body);
  const updateLink = ({ id, ...body }: any) => cms.update("navigation", id, body);
  const deleteLink = ({ id }: any) => cms.remove("navigation", id);
  const reorderLinks = (body: any) => cms.reorder(body);
  const updateSettings = (body: any) => cms.updateSettings(body);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    label: string; url: string; location: LinkLocation; order: number; isActive: boolean; parentId?: string; openInNewTab: boolean;
  }>({
    label: "", url: "", location: "header", order: 0, isActive: true, parentId: undefined, openInNewTab: false
  });

  const [footerTitle1, setFooterTitle1] = useState("Footer Column 1");
  const [footerTitle2, setFooterTitle2] = useState("Footer Column 2");

  useEffect(() => {
    if (settings) {
      if (settings.footerCol1Title) setFooterTitle1(settings.footerCol1Title);
      if (settings.footerCol2Title) setFooterTitle2(settings.footerCol2Title);
    }
  }, [settings]);

  const handleSaveFooterTitle = async (key: string, value: string) => {
    try {
      await updateSettings({ settings: [{ key, value }] });
      toast.success("Title updated");
    } catch {
      toast.error("Failed to update title");
    }
  };

  const handleOpenModal = (location: LinkLocation = "header", link?: any) => {
    if (link) {
      setEditingId(link._id);
      setFormData({
        label: link.label, url: link.url, location: link.location, order: link.order, isActive: link.isActive, parentId: link.parentId, openInNewTab: link.openInNewTab || false
      });
    } else {
      setEditingId(null);
      const existing = (links || []).filter(l => l.location === location && l.parentId === formData.parentId);
      setFormData({
        label: "", url: "", location, order: existing.length, isActive: true, parentId: undefined, openInNewTab: false
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateLink({ id: editingId as any, ...formData, parentId: formData.parentId as any || undefined });
        toast.success("Link updated successfully");
      } else {
        await createLink({ ...formData, parentId: formData.parentId as any || undefined });
        toast.success("Link added successfully");
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Failed to save link");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this link? Child links will also be deleted.")) {
      try {
        await deleteLink({ id: id as any });
        toast.success("Link deleted");
      } catch (error) {
        toast.error("Failed to delete link");
      }
    }
  };

  const handleToggleVisibility = async (link: any) => {
    try {
      await updateLink({ id: link._id, isActive: !link.isActive });
      toast.success(link.isActive ? "Link hidden" : "Link is now visible");
    } catch {
      toast.error("Failed to toggle visibility");
    }
  };

  const handleReorder = async (currentIndex: number, direction: 'up' | 'down', list: any[]) => {
    if ((direction === 'up' && currentIndex === 0) || (direction === 'down' && currentIndex === list.length - 1)) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentLink = list[currentIndex];
    const targetLink = list[targetIndex];

    try {
      await reorderLinks({
        id1: currentLink._id,
        order1: targetLink.order,
        id2: targetLink._id,
        order2: currentLink.order
      });
    } catch (error) {
      toast.error("Failed to reorder links");
    }
  };

  const headerLinks = (links || []).filter(l => l.location === "header" && !l.parentId).sort((a, b) => a.order - b.order);
  const footer1Links = (links || []).filter(l => l.location === "footer_col_1").sort((a, b) => a.order - b.order);
  const footer2Links = (links || []).filter(l => l.location === "footer_col_2").sort((a, b) => a.order - b.order);

  const getChildLinks = (parentId: string) => {
    return (links || []).filter(l => l.parentId === parentId).sort((a, b) => a.order - b.order);
  };

  const LinkRow = ({ link, index, list, depth = 0 }: { link: any; index: number; list: any[]; depth?: number }) => (
    <div
      className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 p-3 bg-muted/30 border border-border rounded-lg group min-w-0 ${
        depth > 0
          ? "ml-3 sm:ml-6 border-l-2 border-l-primary/30 relative"
          : ""
      } ${!link.isActive ? "opacity-50" : ""}`}
    >
      <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div className="flex flex-col shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => handleReorder(index, "up", list)}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={index === list.length - 1}
            onClick={() => handleReorder(index, "down", list)}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="break-words">{link.label}</span>
            {link.openInNewTab && <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />}
            {!link.isActive && (
              <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                Hidden
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 min-w-0">
            <LinkIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">{link.url}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-0.5 sm:gap-1 pl-9 sm:pl-0 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleToggleVisibility(link)}
          className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
          title={link.isActive ? "Hide" : "Show"}
        >
          {link.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleOpenModal(link.location, link)}
          className="h-9 w-9 p-0"
          title="Edit"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => handleDelete(link._id)}
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-24 w-full min-w-0 overflow-x-hidden">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-3xl font-serif font-bold text-foreground">Navigation & Menus</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Build and organize your public website header and footer menus.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 min-w-0">
        {/* HEADER BUILDER */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
          <FadeInUp>
            <Card className="border-border shadow-sm min-w-0 overflow-hidden">
              <CardHeader className="bg-muted/30 border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 sm:px-6">
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-primary shrink-0" /> Header Menu
                  </CardTitle>
                  <CardDescription>Main top navigation bar.</CardDescription>
                </div>
                <Button onClick={() => handleOpenModal("header")} size="sm" className="gap-2 w-full sm:w-auto shrink-0">
                  <Plus className="w-4 h-4" /> Add Link
                </Button>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 space-y-3 px-3 sm:px-6">
                {!links ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted/50 rounded-lg" />
                    ))}
                  </div>
                ) : headerLinks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                    <Navigation className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p>No header links defined.</p>
                  </div>
                ) : (
                  headerLinks.map((link, idx) => {
                    const children = getChildLinks(link._id);
                    return (
                      <div key={link._id} className="space-y-2 min-w-0">
                        <LinkRow link={link} index={idx} list={headerLinks} />
                        {children.map((child, cIdx) => (
                          <LinkRow key={child._id} link={child} index={cIdx} list={children} depth={1} />
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setFormData({
                              label: "",
                              url: "",
                              location: "header",
                              order: children.length,
                              isActive: true,
                              parentId: link._id,
                              openInNewTab: false,
                            });
                            setIsModalOpen(true);
                          }}
                          className="ml-3 sm:ml-6 w-[calc(100%-0.75rem)] sm:w-auto text-xs font-medium inline-flex items-center justify-center sm:justify-start gap-1.5 text-muted-foreground hover:text-primary transition-colors py-2 px-2 rounded-md border border-dashed border-border hover:border-primary/40"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Dropdown Item
                        </button>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </FadeInUp>
        </div>

        {/* FOOTER BUILDER — side-by-side from md until lg stacks under header as one col */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6 min-w-0">
          <FadeInUp delay={100}>
            <Card className="border-border shadow-sm min-w-0 overflow-hidden h-full">
              <CardHeader className="bg-muted/30 border-b pb-4 flex flex-col gap-3 px-3 sm:px-6">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider min-w-0">
                    <LayoutTemplate className="w-4 h-4 shrink-0" />
                    <span className="truncate">Footer Column 1</span>
                  </CardTitle>
                  <Button
                    onClick={() => handleOpenModal("footer_col_1")}
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 p-0 shrink-0"
                    title="Add link"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  value={footerTitle1}
                  onChange={(e) => setFooterTitle1(e.target.value)}
                  onBlur={() => handleSaveFooterTitle("footerCol1Title", footerTitle1)}
                  className="font-bold text-base sm:text-lg bg-transparent border-transparent hover:border-input focus:border-input px-2 h-auto py-1 -ml-2 transition-colors"
                  placeholder="Column Title (e.g. Quick Links)"
                />
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 space-y-2 px-3 sm:px-6">
                {footer1Links.map((link, idx) => (
                  <LinkRow key={link._id} link={link} index={idx} list={footer1Links} />
                ))}
                {footer1Links.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Empty column</p>
                )}
              </CardContent>
            </Card>
          </FadeInUp>

          <FadeInUp delay={200}>
            <Card className="border-border shadow-sm min-w-0 overflow-hidden h-full">
              <CardHeader className="bg-muted/30 border-b pb-4 flex flex-col gap-3 px-3 sm:px-6">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider min-w-0">
                    <Layers className="w-4 h-4 shrink-0" />
                    <span className="truncate">Footer Column 2</span>
                  </CardTitle>
                  <Button
                    onClick={() => handleOpenModal("footer_col_2")}
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 p-0 shrink-0"
                    title="Add link"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  value={footerTitle2}
                  onChange={(e) => setFooterTitle2(e.target.value)}
                  onBlur={() => handleSaveFooterTitle("footerCol2Title", footerTitle2)}
                  className="font-bold text-base sm:text-lg bg-transparent border-transparent hover:border-input focus:border-input px-2 h-auto py-1 -ml-2 transition-colors"
                  placeholder="Column Title (e.g. Our Services)"
                />
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 space-y-2 px-3 sm:px-6">
                {footer2Links.map((link, idx) => (
                  <LinkRow key={link._id} link={link} index={idx} list={footer2Links} />
                ))}
                {footer2Links.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Empty column</p>
                )}
              </CardContent>
            </Card>
          </FadeInUp>
        </div>
      </div>

      {/* MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Link" : "Add Link"}</DialogTitle>
              <DialogDescription>
                Configure the navigation link properties.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              
              <div className="grid gap-2">
                <label className="text-sm font-medium">Label</label>
                <Input value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} placeholder="e.g. About Us" required />
              </div>
              
              <div className="grid gap-2">
                <label className="text-sm font-medium">Destination URL</label>
                <Input value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="e.g. /about" required />
                <p className="text-xs text-muted-foreground">Use relative paths (e.g. /contact) for internal pages, and absolute paths (https://...) for external sites.</p>
              </div>

              {!formData.parentId && (
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Location</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
                    value={formData.location} 
                    onChange={e => setFormData({...formData, location: e.target.value as any})}
                  >
                    <option value="header">Header Menu</option>
                    <option value="footer_col_1">Footer Column 1</option>
                    <option value="footer_col_2">Footer Column 2</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 border border-border p-3 rounded-lg bg-muted/20">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Visible</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="flex items-center gap-3 border border-border p-3 rounded-lg bg-muted/20">
                  <div className="flex-1">
                    <p className="text-sm font-medium">New Tab</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={formData.openInNewTab} onChange={(e) => setFormData({ ...formData, openInNewTab: e.target.checked })} />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>

            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button type="submit" className="w-full sm:w-auto">Save Link</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
