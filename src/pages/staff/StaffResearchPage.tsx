import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import {
  BookOpen, Plus, Search, Edit2, Trash2, Loader2, Scale, Tag, X,
  ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth.ts";

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  supreme_court:    { label: "Supreme Court",    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  high_court:       { label: "High Court",        color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  district_court:   { label: "District Court",    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  commentary:       { label: "Legal Commentary",  color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  procedure:        { label: "Procedure",          color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  template_research:{ label: "Template Research", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" },
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-NP", { year: "numeric", month: "short", day: "numeric" });
}

export default function StaffResearchPage() {
  const { user } = useAuth();
  const notes = (useQuery(api.research.listNotes as any, {}) || []) as any[];
  const users = (useQuery(api.users.listUsers as any, {}) || []) as any[];

  const createNote = useMutation(api.research.createNote as any);
  const updateNote = useMutation(api.research.updateNote as any);
  const deleteNote = useMutation(api.research.deleteNote as any);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<string>("procedure");
  const [formTags, setFormTags] = useState("");
  const [formContent, setFormContent] = useState("");

  const openCreate = () => {
    setEditingNote(null);
    setFormTitle("");
    setFormCategory("procedure");
    setFormTags("");
    setFormContent("");
    setShowModal(true);
  };

  const openEdit = (note: any) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormCategory(note.category);
    setFormTags(note.tags.join(", "));
    setFormContent(note.content);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error("Title and Content are required.");
      return;
    }
    setIsSaving(true);
    const tags = formTags.split(",").map((t) => t.trim()).filter(Boolean);
    try {
      if (editingNote) {
        await updateNote({ id: editingNote._id, title: formTitle, category: formCategory, tags, content: formContent });
        toast.success("Research note updated");
      } else {
        const authorId = user?.profile?._id || "u1";
        await createNote({ title: formTitle, category: formCategory, tags, content: formContent, authorId });
        toast.success("Research note saved to vault");
      }
      setShowModal(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this research note? This cannot be undone.")) return;
    try {
      await deleteNote({ id });
      toast.success("Note deleted");
      if (expandedId === id) setExpandedId(null);
    } catch (err: any) {
      toast.error("Failed to delete note");
    }
  };

  // Filter notes
  const filtered = notes.filter((n) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      n.title.toLowerCase().includes(q) ||
      n.tags.some((t: string) => t.toLowerCase().includes(q)) ||
      n.content.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === "all" || n.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getUserName = (id: string) => users.find((u: any) => u._id === id)?.name || "Staff";

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-primary flex items-center gap-2">
            <BookOpen className="w-6 h-6" /> Legal Research Vault
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Centralized precedents, rulings, and procedure notes for the firm's knowledge base.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0 gap-2">
          <Plus className="w-4 h-4" /> New Note
        </Button>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by title, tag, or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_META).map(([val, meta]) => (
              <SelectItem key={val} value={val}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-4 text-sm">
        <span className="text-muted-foreground">{filtered.length} of {notes.length} notes</span>
        {search && (
          <button onClick={() => setSearch("")} className="text-primary hover:underline flex items-center gap-1 text-xs">
            <X className="w-3 h-3" /> Clear search
          </button>
        )}
      </div>

      {/* Notes Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
          <Scale className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-base font-medium">No research notes found</p>
          <p className="text-sm mt-1">Create your first note to start building the firm's knowledge base.</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Add First Note
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((note) => {
              const isExpanded = expandedId === note._id;
              const catMeta = CATEGORY_META[note.category] || { label: note.category, color: "bg-gray-100 text-gray-700" };

              return (
                <motion.div
                  key={note._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-colors"
                >
                  {/* Card Header */}
                  <div
                    className="flex items-start justify-between gap-4 p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : note._id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge className={`text-xs shrink-0 ${catMeta.color}`}>{catMeta.label}</Badge>
                        {note.tags.map((tag: string) => (
                          <span key={tag} className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                            <Tag className="w-3 h-3" />{tag}
                          </span>
                        ))}
                      </div>
                      <h3 className="font-semibold text-foreground truncate">{note.title}</h3>
                      {!isExpanded && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{note.content}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        By {getUserName(note.authorId)} · {formatDate(note._creationTime)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(note); }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(note._id); }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-border pt-3">
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{note.content}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingNote ? "Edit Research Note" : "New Research Note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Title <span className="text-destructive">*</span></label>
              <Input
                placeholder="e.g. Supreme Court ruling on adverse possession..."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Category</label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_META).map(([val, meta]) => (
                      <SelectItem key={val} value={val}>{meta.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Tags <span className="text-muted-foreground">(comma-separated)</span></label>
                <Input
                  placeholder="e.g. property, injunction, Civil Code"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Content / Notes <span className="text-destructive">*</span></label>
              <textarea
                className="w-full rounded-md border border-input bg-input text-foreground px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden min-h-[200px] resize-y"
                placeholder="Write detailed research notes, precedent summaries, procedure steps, or legal commentary..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingNote ? "Save Changes" : "Save to Vault"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
