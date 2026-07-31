import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { Plus, GripVertical, Edit, Trash2, Link as LinkIcon, Navigation, LayoutTemplate, Layers, ChevronUp, ChevronDown, Eye, EyeOff, ExternalLink } from "lucide-react";
import { FadeInUp } from "@/components/ui/animations.tsx";

type LinkLocation = "header" | "footer_col_1" | "footer_col_2";

export default function AdminCMSNavigation() {
  const links = useQuery(api.cms.listNavigationLinks, {});
  const settings = useQuery(api.cms.getSettings);
  
  const createLink = useMutation(api.cms.createNavigationLink);
  const updateLink = useMutation(api.cms.updateNavigationLink);
  const deleteLink = useMutation(api.cms.deleteNavigationLink);
  const reorderLinks = useMutation(api.cms.reorderNavigationLinks);
  const updateSettings = useMutation(api.cms.updateSettings);

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
    <div className={`flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg group ${depth > 0 ? 'ml-8 relative before:absolute before:-left-4 before:top-1/2 before:w-4 before:h-px before:bg-border' : ''} ${!link.isActive ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
          <button disabled={index === 0} onClick={() => handleReorder(index, 'up', list)} className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
          <button disabled={index === list.length - 1} onClick={() => handleReorder(index, 'down', list)} className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
        </div>
        <div>
          <p className="font-semibold text-sm flex items-center gap-2">
            {link.label} 
            {link.openInNewTab && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
            {!link.isActive && <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Hidden</span>}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><LinkIcon className="w-3 h-3" /> {link.url}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 md:gap-2">
        <Button variant="ghost" size="sm" onClick={() => handleToggleVisibility(link)} className="text-muted-foreground hover:text-foreground">
          {link.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(link.location, link)}>
          <Edit className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(link._id)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Navigation & Menus</h1>
          <p className="text-muted-foreground mt-1 text-sm">Build and organize your public website header and footer menus.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* HEADER BUILDER */}
        <div className="lg:col-span-2 space-y-6">
          <FadeInUp>
            <Card className="border-border shadow-sm">
              <CardHeader className="bg-muted/30 border-b pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2"><Navigation className="w-5 h-5 text-primary" /> Header Menu</CardTitle>
                  <CardDescription>Main top navigation bar.</CardDescription>
                </div>
                <Button onClick={() => handleOpenModal("header")} size="sm" className="gap-2"><Plus className="w-4 h-4"/> Add Link</Button>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                {!links ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/50 rounded-lg"></div>)}
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
                      <div key={link._id} className="space-y-2">
                        <LinkRow link={link} index={idx} list={headerLinks} />
                        {/* Sub-links */}
                        {children.map((child, cIdx) => (
                          <LinkRow key={child._id} link={child} index={cIdx} list={children} depth={1} />
                        ))}
                        {/* Add Sub-link button */}
                        <button 
                          onClick={() => {
                            setEditingId(null);
                            setFormData({ label: "", url: "", location: "header", order: children.length, isActive: true, parentId: link._id, openInNewTab: false });
                            setIsModalOpen(true);
                          }}
                          className="ml-8 text-xs font-medium flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors py-1"
                        >
                          <Plus className="w-3 h-3" /> Add Dropdown Item
                        </button>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </FadeInUp>
        </div>

        {/* FOOTER BUILDER */}
        <div className="space-y-6">
          <FadeInUp delay={100}>
            <Card className="border-border shadow-sm">
              <CardHeader className="bg-muted/30 border-b pb-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider"><LayoutTemplate className="w-4 h-4" /> Footer Column 1</CardTitle>
                  <Button onClick={() => handleOpenModal("footer_col_1")} size="sm" variant="outline" className="h-8 w-8 p-0"><Plus className="w-4 h-4"/></Button>
                </div>
                <Input 
                  value={footerTitle1} 
                  onChange={e => setFooterTitle1(e.target.value)} 
                  onBlur={() => handleSaveFooterTitle('footerCol1Title', footerTitle1)}
                  className="font-bold text-lg bg-transparent border-transparent hover:border-input focus:border-input px-2 h-auto py-1 -ml-2 transition-colors"
                  placeholder="Column Title (e.g. Quick Links)"
                />
              </CardHeader>
              <CardContent className="pt-6 space-y-2">
                {footer1Links.map((link, idx) => <LinkRow key={link._id} link={link} index={idx} list={footer1Links} />)}
                {footer1Links.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Empty column</p>}
              </CardContent>
            </Card>
          </FadeInUp>

          <FadeInUp delay={200}>
            <Card className="border-border shadow-sm">
              <CardHeader className="bg-muted/30 border-b pb-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider"><Layers className="w-4 h-4" /> Footer Column 2</CardTitle>
                  <Button onClick={() => handleOpenModal("footer_col_2")} size="sm" variant="outline" className="h-8 w-8 p-0"><Plus className="w-4 h-4"/></Button>
                </div>
                <Input 
                  value={footerTitle2} 
                  onChange={e => setFooterTitle2(e.target.value)} 
                  onBlur={() => handleSaveFooterTitle('footerCol2Title', footerTitle2)}
                  className="font-bold text-lg bg-transparent border-transparent hover:border-input focus:border-input px-2 h-auto py-1 -ml-2 transition-colors"
                  placeholder="Column Title (e.g. Our Services)"
                />
              </CardHeader>
              <CardContent className="pt-6 space-y-2">
                {footer2Links.map((link, idx) => <LinkRow key={link._id} link={link} index={idx} list={footer2Links} />)}
                {footer2Links.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Empty column</p>}
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

              <div className="grid grid-cols-2 gap-4">
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Link</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
