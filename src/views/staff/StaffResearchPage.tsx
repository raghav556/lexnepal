import { useState } from "react";
import { useCases } from "@/client/queries/cases";
import { useResearchNotes, useResearchCommands } from "@/client/queries/research";
import type { ResearchDto } from "@/shared/contracts/domains";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Scale,
  X,
  FolderOpen,
  Gavel,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import {
  DashboardButton,
  DashboardFilterBar,
  DashboardSection,
  DashboardStatusLabel,
  DualDateDisplay,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";

const CATEGORY_LABELS: Record<string, string> = {
  supreme_court: "Supreme Court",
  high_court: "High Court",
  district_court: "District Court",
  commentary: "Legal Commentary",
  procedure: "Procedure",
  template_research: "Template Research",
};

export default function StaffResearchPage() {
  const notes = useResearchNotes() || [];
  const cases = useCases({}) || [];

  const { createNote, updateNote, deleteNote } = useResearchCommands();

  // Vault States
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedNote, setSelectedNote] = useState<ResearchDto | null>(null);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<ResearchDto | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form States
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<string>("supreme_court");
  const [formContent, setFormContent] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formCaseId, setFormCaseId] = useState<string>("none");
  const [formNkp, setFormNkp] = useState("");
  const [formDecision, setFormDecision] = useState("");
  const [formBench, setFormBench] = useState("");

  const openCreate = () => {
    setEditingNote(null);
    setFormTitle("");
    setFormCategory("procedure");
    setFormContent("");
    setFormTags("");
    setFormCaseId("none");
    setFormNkp("");
    setFormDecision("");
    setFormBench("");
    setShowModal(true);
  };

  const openEdit = (note: ResearchDto) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormCategory(note.category);
    setFormContent(note.content);
    setFormTags(note.tags?.join(", ") || "");
    setFormCaseId(note.caseId || "none");
    setFormNkp(note.citation?.nkpNo || "");
    setFormDecision(note.citation?.decisionNo || "");
    setFormBench(note.citation?.bench || "");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) return toast.error("Title and Content required");
    setIsSaving(true);
    const payload = {
      title: formTitle,
      category: formCategory,
      content: formContent,
      tags: formTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      caseId: formCaseId === "none" ? null : formCaseId,
      citation:
        formNkp || formDecision || formBench
          ? {
              nkpNo: formNkp,
              decisionNo: formDecision,
              bench: formBench,
            }
          : null,
    };

    try {
      if (editingNote) {
        const updated = (await updateNote(editingNote._id, payload)) as ResearchDto;
        toast.success("Note updated");
        if (selectedNote?._id === editingNote._id) setSelectedNote(updated);
      } else {
        await createNote(payload);
        toast.success("Saved to vault");
      }
      setShowModal(false);
    } catch (err) {
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      await deleteNote(id);
      toast.success("Note deleted");
      if (selectedNote?._id === id) setSelectedNote(null);
    } catch {
      toast.error("Failed to delete note");
    }
  };

  // Filter Vault
  const filteredNotes = notes.filter((n) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      (n.citation?.nkpNo || "").toLowerCase().includes(q);
    const matchCat = categoryFilter === "all" || n.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <PortalPageShell
      portal="staff"
      eyebrow="Knowledge base"
      title="Legal research & vault"
      description="Firm knowledge base of precedents, commentary and procedure."
      icon={BookOpen}
      className="h-[calc(100vh-4rem)] overflow-hidden"
      contentClassName="flex flex-col min-h-0 flex-1"
      actions={
        <DashboardButton onClick={openCreate} className="gap-2">
          <Plus className="size-4" aria-hidden /> Add to vault
        </DashboardButton>
      }
    >
      <DashboardSection className="flex-1 flex flex-col min-h-0 overflow-hidden !p-0">
        <DashboardFilterBar className="p-4 border-b border-dashboard-border bg-dashboard-neutral-soft/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9 text-sm bg-dashboard-panel"
              placeholder="Search firm vault..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] h-9 text-sm bg-dashboard-panel">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DashboardFilterBar>

        <div className="flex-1 flex overflow-hidden">
          {/* List View */}
          <div
            className={cn(
              "w-full lg:w-[40%] border-r border-border overflow-y-auto p-3 space-y-2",
              selectedNote ? "hidden lg:block" : "block",
            )}
          >
            {filteredNotes.length === 0 ? (
              <EmptyState
                title="No notes found"
                description="Try a different search or category."
                icon={FolderOpen}
                className="py-12"
              />
            ) : (
              filteredNotes.map((note) => {
                const categoryLabel = CATEGORY_LABELS[note.category] || note.category;
                return (
                  <div
                    key={note._id}
                    onClick={() => setSelectedNote(note)}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50 text-left",
                      selectedNote?._id === note._id
                        ? "bg-primary/5 border-primary shadow-sm"
                        : "bg-background border-border",
                    )}
                  >
                    <h3 className="font-semibold text-sm line-clamp-1 mb-1">{note.title}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <DashboardStatusLabel
                        label={categoryLabel}
                        tone="information"
                        className="text-[10px] px-1.5 py-0"
                      />
                      <span className="text-[10px] text-muted-foreground font-mono">
                        <DualDateDisplay isoDate={note.createdAt} />
                      </span>
                    </div>
                    {note.caseId && (
                      <div className="mt-2 text-[10px] font-bold text-primary flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" /> Bound to Case
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Detail View */}
          <div
            className={cn(
              "flex-1 overflow-y-auto bg-zinc-50/30 dark:bg-zinc-950/30 relative",
              !selectedNote ? "hidden lg:flex" : "block w-full lg:w-auto lg:block",
            )}
          >
            {!selectedNote ? (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground flex-col">
                <FileText className="w-12 h-12 mb-4 opacity-10" />
                <p className="text-sm">Select a note to read</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-foreground leading-tight mb-2">
                      {selectedNote.title}
                    </h2>
                    <div className="flex items-center gap-3 flex-wrap">
                      <DashboardStatusLabel
                        label={CATEGORY_LABELS[selectedNote.category] || selectedNote.category}
                        tone="information"
                        className="text-xs"
                      />
                      <span className="text-xs text-muted-foreground">
                        <DualDateDisplay isoDate={selectedNote.createdAt} />
                      </span>
                      {selectedNote.caseId && (
                        <DashboardStatusLabel
                          label={`Linked: ${cases.find((c) => c._id === selectedNote.caseId)?.caseNumber || selectedNote.caseId}`}
                          tone="primary"
                          className="text-xs font-mono"
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => openEdit(selectedNote)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(selectedNote._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 lg:hidden"
                      onClick={() => setSelectedNote(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {selectedNote.citation &&
                  (selectedNote.citation.nkpNo || selectedNote.citation.decisionNo) && (
                    <div className="mb-6 p-4 bg-muted border border-border rounded-lg grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                          NKP Number
                        </p>
                        <p className="font-mono text-sm font-semibold">
                          {selectedNote.citation.nkpNo || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                          Decision No
                        </p>
                        <p className="font-mono text-sm font-semibold">
                          {selectedNote.citation.decisionNo || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                          Bench
                        </p>
                        <p className="text-sm font-semibold">
                          {selectedNote.citation.bench || "-"}
                        </p>
                      </div>
                    </div>
                  )}

                <div className="prose prose-sm dark:prose-invert max-w-none font-serif text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {selectedNote.content}
                </div>

                {selectedNote.tags?.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-border flex flex-wrap gap-2">
                    {selectedNote.tags.map((t: string) => (
                      <DashboardStatusLabel
                        key={t}
                        label={`#${t}`}
                        tone="neutral"
                        className="text-[10px]"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DashboardSection>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-primary" />
              {editingNote ? "Edit Research Note" : "Save to Firm Vault"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Precedent on Property Partition"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Link to Case</label>
                <Select value={formCaseId} onValueChange={setFormCaseId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- General Firm Vault --</SelectItem>
                    {cases.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.caseNumber} - {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg border border-border space-y-3">
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                <Scale className="w-3.5 h-3.5" /> Citation Metadata (Optional)
              </label>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  className="h-8 text-xs bg-background"
                  placeholder="NKP No (e.g. 2078)"
                  value={formNkp}
                  onChange={(e) => setFormNkp(e.target.value)}
                />
                <Input
                  className="h-8 text-xs bg-background"
                  placeholder="Decision No"
                  value={formDecision}
                  onChange={(e) => setFormDecision(e.target.value)}
                />
                <Input
                  className="h-8 text-xs bg-background"
                  placeholder="Bench (e.g. Full Bench)"
                  value={formBench}
                  onChange={(e) => setFormBench(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Content / Precedent Details</label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Paste or write the legal research here..."
                className="min-h-[200px] font-serif resize-y"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="e.g., partition, family law, limitation"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save to Vault"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
