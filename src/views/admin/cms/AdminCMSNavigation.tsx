import React, { useState, useEffect } from "react";
import { useCmsCommands, useCmsSettings, useNavigation } from "@/client/queries/cms";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog.tsx";
import {
  DashboardButton,
  DashboardListSkeleton,
  DashboardSection,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Link as LinkIcon,
  Navigation,
  LayoutTemplate,
  Layers,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { PUBLIC_INTERNAL_PATHS } from "@/shared/public-routes";

type LinkLocation = "header" | "footer_col_1" | "footer_col_2";

type NavForm = {
  label: string;
  url: string;
  location: LinkLocation;
  order: number;
  isActive: boolean;
  parentId?: string;
  openInNewTab: boolean;
};

const emptyForm = (location: LinkLocation = "header", order = 0, parentId?: string): NavForm => ({
  label: "",
  url: "",
  location,
  order,
  isActive: true,
  parentId,
  openInNewTab: false,
});

export default function AdminCMSNavigation() {
  const links = useNavigation({}, "admin");
  const settings = useCmsSettings("admin");
  const cms = useCmsCommands();
  const createLink = (body: NavForm) => cms.create("navigation", body);
  const updateLink = ({ id, ...body }: NavForm & { id: string }) =>
    cms.update("navigation", id, body);
  const deleteLink = ({ id }: { id: string }) => cms.remove("navigation", id);
  const reorderLinks = (body: { id1: string; order1: number; id2: string; order2: number }) =>
    cms.reorder(body);
  const updateSettings = (body: { settings: Array<{ key: string; value: string }> }) =>
    cms.updateSettings(body);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NavForm>(emptyForm());
  const [confirm, setConfirm] = useState<ConfirmDialogState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [footerTitle1, setFooterTitle1] = useState("Footer Column 1");
  const [footerTitle2, setFooterTitle2] = useState("Footer Column 2");

  useEffect(() => {
    if (settings) {
      if (settings.footerCol1Title) setFooterTitle1(String(settings.footerCol1Title));
      if (settings.footerCol2Title) setFooterTitle2(String(settings.footerCol2Title));
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

  const nextSiblingOrder = (location: LinkLocation, parentId?: string | null) => {
    const siblings = (links || []).filter(
      (l) => l.location === location && (parentId ? l.parentId === parentId : !l.parentId),
    );
    return siblings.length;
  };

  const handleOpenModal = (
    location: LinkLocation = "header",
    link?: {
      _id: string;
      label: string;
      url: string;
      location: LinkLocation;
      order: number;
      isActive: boolean;
      parentId?: string;
      openInNewTab?: boolean;
    },
  ) => {
    if (link) {
      setEditingId(link._id);
      setFormData({
        label: link.label,
        url: link.url,
        location: link.location,
        order: link.order,
        isActive: link.isActive,
        parentId: link.parentId,
        openInNewTab: link.openInNewTab || false,
      });
    } else {
      setEditingId(null);
      setFormData(emptyForm(location, nextSiblingOrder(location), undefined));
    }
    setIsModalOpen(true);
  };

  const handleOpenChildModal = (parentId: string) => {
    setEditingId(null);
    setFormData(emptyForm("header", nextSiblingOrder("header", parentId), parentId));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        parentId: formData.parentId || undefined,
      };
      if (editingId) {
        await updateLink({ id: editingId, ...payload });
        toast.success("Link updated successfully");
      } else {
        await createLink(payload);
        toast.success("Link added successfully");
      }
      setIsModalOpen(false);
    } catch {
      toast.error("Failed to save link");
    }
  };

  const handleDelete = (id: string) => {
    setConfirm({
      title: "Delete navigation link?",
      description:
        "Child dropdown links will also be deleted. This cannot be undone from the admin UI.",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await deleteLink({ id });
          toast.success("Link deleted");
        } catch {
          toast.error("Failed to delete link");
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const handleToggleVisibility = async (link: { _id: string; isActive: boolean }) => {
    try {
      await cms.update("navigation", link._id, { isActive: !link.isActive });
      toast.success(link.isActive ? "Link hidden" : "Link is now visible");
    } catch {
      toast.error("Failed to toggle visibility");
    }
  };

  const handleReorder = async (
    currentIndex: number,
    direction: "up" | "down",
    list: Array<{ _id: string; order: number }>,
  ) => {
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === list.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const currentLink = list[currentIndex];
    const targetLink = list[targetIndex];

    try {
      await reorderLinks({
        id1: currentLink._id,
        order1: targetLink.order,
        id2: targetLink._id,
        order2: currentLink.order,
      });
    } catch {
      toast.error("Failed to reorder links");
    }
  };

  const headerLinks = (links || [])
    .filter((l) => l.location === "header" && !l.parentId)
    .sort((a, b) => a.order - b.order);
  const footer1Links = (links || [])
    .filter((l) => l.location === "footer_col_1" && !l.parentId)
    .sort((a, b) => a.order - b.order);
  const footer2Links = (links || [])
    .filter((l) => l.location === "footer_col_2" && !l.parentId)
    .sort((a, b) => a.order - b.order);

  const getChildLinks = (parentId: string) =>
    (links || []).filter((l) => l.parentId === parentId).sort((a, b) => a.order - b.order);

  const LinkRow = ({
    link,
    index,
    list,
    depth = 0,
  }: {
    link: {
      _id: string;
      label: string;
      url: string;
      location: LinkLocation;
      order: number;
      isActive: boolean;
      parentId?: string;
      openInNewTab?: boolean;
    };
    index: number;
    list: Array<{ _id: string; order: number }>;
    depth?: number;
  }) => (
    <div
      className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 p-3 bg-dashboard-neutral-soft/30 border border-dashboard-border rounded-lg group min-w-0 ${
        depth > 0 ? "ml-3 sm:ml-6 border-l-2 border-l-primary/30 relative" : ""
      } ${!link.isActive ? "opacity-50" : ""}`}
    >
      <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div className="flex flex-col shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => handleReorder(index, "up", list)}
            className="p-1.5 hover:bg-dashboard-neutral-soft rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={index === list.length - 1}
            onClick={() => handleReorder(index, "down", list)}
            className="p-1.5 hover:bg-dashboard-neutral-soft rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="break-words">{link.label}</span>
            {link.openInNewTab && (
              <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
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
    <PortalPageShell
      portal="admin"
      decorated
      showTodayDate
      loading={!links}
      loadingLabel="Loading navigation…"
      eyebrow="Content management"
      title="Navigation & Menus"
      description="Build and organize your public website header and footer menus. Header links may include dropdown children; footer columns are flat lists."
      icon={Navigation}
      contentClassName="max-w-6xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 min-w-0"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 min-w-0">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
          <DashboardSection
            className="min-w-0"
            title="Header Menu"
            description="Main top navigation bar with optional dropdowns."
            icon={Navigation}
            actions={
              <DashboardButton onClick={() => handleOpenModal("header")} size="sm">
                <Plus className="w-4 h-4" /> Add Link
              </DashboardButton>
            }
          >
            {!links ? (
              <DashboardListSkeleton rows={3} />
            ) : headerLinks.length === 0 ? (
              <EmptyState
                title="No header links"
                description="Add links to build your public header menu."
                icon={Navigation}
                action={
                  <DashboardButton onClick={() => handleOpenModal("header")} size="sm">
                    <Plus className="w-4 h-4" /> Add Link
                  </DashboardButton>
                }
              />
            ) : (
              headerLinks.map((link, idx) => {
                const children = getChildLinks(link._id);
                return (
                  <div key={link._id} className="space-y-2 min-w-0">
                    <LinkRow link={link} index={idx} list={headerLinks} />
                    {children.map((child, cIdx) => (
                      <LinkRow
                        key={child._id}
                        link={child}
                        index={cIdx}
                        list={children}
                        depth={1}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => handleOpenChildModal(link._id)}
                      className="ml-3 sm:ml-6 w-[calc(100%-0.75rem)] sm:w-auto text-xs font-medium inline-flex items-center justify-center sm:justify-start gap-1.5 text-muted-foreground hover:text-primary transition-colors py-2 px-2 rounded-md border border-dashed border-dashboard-border hover:border-primary/40"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Dropdown Item
                    </button>
                  </div>
                );
              })
            )}
          </DashboardSection>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6 min-w-0">
          <DashboardSection
            className="min-w-0 h-full"
            title="Footer Column 1"
            icon={LayoutTemplate}
            actions={
              <Button
                onClick={() => handleOpenModal("footer_col_1")}
                size="sm"
                variant="outline"
                className="h-9 w-9 p-0 shrink-0"
                title="Add link"
              >
                <Plus className="w-4 h-4" />
              </Button>
            }
          >
            <Input
              value={footerTitle1}
              onChange={(e) => setFooterTitle1(e.target.value)}
              onBlur={() => handleSaveFooterTitle("footerCol1Title", footerTitle1)}
              className="font-bold text-base sm:text-lg bg-transparent border-transparent hover:border-input focus:border-input px-2 h-auto py-1 -ml-2 transition-colors mb-4"
              placeholder="Column Title (e.g. Quick Links)"
            />
            <div className="space-y-2">
              {footer1Links.map((link, idx) => (
                <LinkRow key={link._id} link={link} index={idx} list={footer1Links} />
              ))}
              {footer1Links.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Empty column</p>
              )}
            </div>
          </DashboardSection>

          <DashboardSection
            className="min-w-0 h-full"
            title="Footer Column 2"
            icon={Layers}
            actions={
              <Button
                onClick={() => handleOpenModal("footer_col_2")}
                size="sm"
                variant="outline"
                className="h-9 w-9 p-0 shrink-0"
                title="Add link"
              >
                <Plus className="w-4 h-4" />
              </Button>
            }
          >
            <Input
              value={footerTitle2}
              onChange={(e) => setFooterTitle2(e.target.value)}
              onBlur={() => handleSaveFooterTitle("footerCol2Title", footerTitle2)}
              className="font-bold text-base sm:text-lg bg-transparent border-transparent hover:border-input focus:border-input px-2 h-auto py-1 -ml-2 transition-colors mb-4"
              placeholder="Column Title (e.g. Our Services)"
            />
            <div className="space-y-2">
              {footer2Links.map((link, idx) => (
                <LinkRow key={link._id} link={link} index={idx} list={footer2Links} />
              ))}
              {footer2Links.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Empty column</p>
              )}
            </div>
          </DashboardSection>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Link" : "Add Link"}</DialogTitle>
              <DialogDescription>
                {formData.parentId
                  ? "Dropdown item under a header parent. Nesting is header-only."
                  : "Configure the navigation link properties."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Label</label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g. About Us"
                  required
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Destination URL</label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="e.g. /about-us or # for dropdown parent"
                  list="cms-nav-known-paths"
                  required
                />
                <datalist id="cms-nav-known-paths">
                  {PUBLIC_INTERNAL_PATHS.map((path) => (
                    <option key={path} value={path} />
                  ))}
                  <option value="#" />
                </datalist>
                <p className="text-xs text-muted-foreground">
                  Use relative paths for internal pages, https:// for external sites, or # for a
                  dropdown parent without its own page.
                </p>
              </div>

              {!formData.parentId && (
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Location</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value as LinkLocation })
                    }
                  >
                    <option value="header">Header Menu</option>
                    <option value="footer_col_1">Footer Column 1</option>
                    <option value="footer_col_2">Footer Column 2</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 border border-dashboard-border p-3 rounded-lg bg-dashboard-neutral-soft/20">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Visible</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <div className="w-9 h-5 bg-dashboard-neutral-soft peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>
                <div className="flex items-center gap-3 border border-dashboard-border p-3 rounded-lg bg-dashboard-neutral-soft/20">
                  <div className="flex-1">
                    <p className="text-sm font-medium">New Tab</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.openInNewTab}
                      onChange={(e) => setFormData({ ...formData, openInNewTab: e.target.checked })}
                    />
                    <div className="w-9 h-5 bg-dashboard-neutral-soft peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                Save Link
              </Button>
            </DialogFooter>
          </form>
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
