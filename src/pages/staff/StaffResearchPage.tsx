import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@/client/data/convex-bridge.ts";
import { api } from "@/convex/_generated/api.js";
import { useCases } from "@/client/queries/cases";
import { useResearchNotes, useResearchCommands } from "@/client/queries/research";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  BookOpen, Plus, Search, Edit2, Trash2, Loader2, Scale, X,
  Bot, Sparkles, MessageSquare, Save, FolderOpen, ChevronRight, Gavel, FileText
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils.ts";

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  supreme_court:    { label: "Supreme Court",    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  high_court:       { label: "High Court",        color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  district_court:   { label: "District Court",    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  commentary:       { label: "Legal Commentary",  color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  procedure:        { label: "Procedure",          color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  template_research:{ label: "Template Research", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" },
};

// Simulated AI Precedents
const MOCK_AI_RESPONSES = [
  {
    keywords: ["partition", "property", "ansha"],
    response: "Under the Muluki Civil Code, 2074, property partition (Ansha Banda) claims can be filed at any time if the property has not been partitioned. However, if a deed exists but was not executed, the limitation is 3 months.",
    citation: { nkpNo: "NKP 2076", decisionNo: "10234", bench: "Full Bench" },
    category: "supreme_court"
  },
  {
    keywords: ["divorce", "alimony", "maintenance"],
    response: "The Supreme Court has established that if a husband fails to provide maintenance, the wife can claim divorce and alimony simultaneously. Maintenance must be proportional to the husband's income.",
    citation: { nkpNo: "NKP 2078", decisionNo: "10567", bench: "Joint Bench" },
    category: "supreme_court"
  }
];

export default function StaffResearchPage() {
  const notes = useResearchNotes() || [];
  const cases = useCases({}) || [];
  
  const { createNote, updateNote, deleteNote } = useResearchCommands();

  // Vault States
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
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

  // AI Assistant States
  const [aiQuery, setAiQuery] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<Array<{role: "user" | "assistant", content: string, citation?: any, category?: string}>>([
    { role: "assistant", content: "Welcome to LexAI Legal Research. How can I assist you with precedents or case law today?" }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // --- Handlers ---
  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    
    const query = aiQuery.trim();
    setMessages(prev => [...prev, { role: "user", content: query }]);
    setAiQuery("");
    setIsThinking(true);

    setTimeout(() => {
      const lowerQ = query.toLowerCase();
      const match = MOCK_AI_RESPONSES.find(r => r.keywords.some(k => lowerQ.includes(k)));
      
      if (match) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: match.response,
          citation: match.citation,
          category: match.category
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: "Based on the firm's current database and indexed Nepal Kanoon Patrika (NKP) records, I couldn't find a direct precedent for this specific query. I recommend consulting the physical commentary or expanding your search terms." 
        }]);
      }
      setIsThinking(false);
    }, 1500);
  };

  const handleSaveToVault = (msg: any) => {
    setFormTitle(`AI Research: ${msg.citation ? msg.citation.nkpNo : "General Info"}`);
    setFormCategory(msg.category || "procedure");
    setFormContent(msg.content);
    setFormTags("");
    setFormCaseId("none");
    if (msg.citation) {
      setFormNkp(msg.citation.nkpNo);
      setFormDecision(msg.citation.decisionNo);
      setFormBench(msg.citation.bench);
    } else {
      setFormNkp(""); setFormDecision(""); setFormBench("");
    }
    setEditingNote(null);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingNote(null);
    setFormTitle(""); setFormCategory("procedure"); setFormContent(""); setFormTags("");
    setFormCaseId("none"); setFormNkp(""); setFormDecision(""); setFormBench("");
    setShowModal(true);
  };

  const openEdit = (note: any) => {
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
      tags: formTags.split(",").map(t => t.trim()).filter(Boolean),
      caseId: formCaseId === "none" ? undefined : formCaseId,
      citation: (formNkp || formDecision || formBench) ? {
        nkpNo: formNkp, decisionNo: formDecision, bench: formBench
      } : undefined
    };

    try {
      if (editingNote) {
        await updateNote(editingNote._id, payload);
        toast.success("Note updated");
        if (selectedNote?._id === editingNote._id) setSelectedNote({ ...selectedNote, ...payload });
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
    const matchSearch = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || (n.citation?.nkpNo || "").toLowerCase().includes(q);
    const matchCat = categoryFilter === "all" || n.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 sm:p-6 bg-zinc-50/50 dark:bg-background overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold font-serif text-primary flex items-center gap-2">
            <BookOpen className="w-6 h-6" /> Legal Research & Vault
          </h1>
          <p className="text-sm text-muted-foreground mt-1">AI-assisted precedent search and firm knowledge base.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Add to Vault
        </Button>
      </div>

      {/* Split Pane Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* Left Pane: AI Assistant */}
        <div className="w-full lg:w-[45%] flex flex-col bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border bg-primary/5 flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-md text-primary"><Sparkles className="w-4 h-4" /></div>
            <h2 className="font-bold text-sm">LexAI Assistant</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] rounded-2xl p-4 shadow-sm text-sm", 
                  msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted border border-border rounded-bl-sm"
                )}>
                  {msg.role === "assistant" && <div className="flex items-center gap-1.5 mb-2 text-primary font-bold text-xs uppercase tracking-wider"><Bot className="w-3.5 h-3.5" /> AI Response</div>}
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  
                  {msg.citation && (
                    <div className="mt-4 p-3 bg-background border border-border rounded-lg text-foreground">
                      <div className="flex items-center gap-2 mb-1">
                        <Scale className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">Precedent Found</span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5 ml-6 font-mono">
                        <p>NKP No: {msg.citation.nkpNo}</p>
                        <p>Decision No: {msg.citation.decisionNo}</p>
                        <p>Bench: {msg.citation.bench}</p>
                      </div>
                    </div>
                  )}

                  {msg.role === "assistant" && idx > 0 && (
                    <div className="mt-3 flex justify-end">
                      <Button variant="outline" size="sm" className="h-7 text-xs bg-background hover:bg-primary hover:text-primary-foreground transition-colors" onClick={() => handleSaveToVault(msg)}>
                        <Save className="w-3 h-3 mr-1.5" /> Save to Vault
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex w-full justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted border border-border p-4 shadow-sm flex items-center gap-3">
                   <Loader2 className="w-4 h-4 text-primary animate-spin" />
                   <span className="text-sm text-muted-foreground animate-pulse">Searching Supreme Court database...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-background border-t border-border">
            <form onSubmit={handleAskAI} className="relative flex items-center">
              <Input 
                className="pr-12 bg-muted/50 focus-visible:ring-primary h-12 rounded-xl"
                placeholder="Ask about a law or precedent..."
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                disabled={isThinking}
              />
              <Button type="submit" size="icon" className="absolute right-1.5 h-9 w-9 rounded-lg" disabled={!aiQuery.trim() || isThinking}>
                <MessageSquare className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Right Pane: Firm Vault */}
        <div className="flex-1 flex flex-col bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex flex-col sm:flex-row gap-3">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9 h-9 text-sm bg-background" placeholder="Search firm vault..." value={search} onChange={(e) => setSearch(e.target.value)} />
             </div>
             <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px] h-9 text-sm bg-background"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_META).map(([val, meta]) => <SelectItem key={val} value={val}>{meta.label}</SelectItem>)}
                </SelectContent>
             </Select>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* List View */}
            <div className={cn("w-full lg:w-[40%] border-r border-border overflow-y-auto p-3 space-y-2", selectedNote ? "hidden lg:block" : "block")}>
              {filteredNotes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No notes found.</p>
                </div>
              ) : (
                filteredNotes.map(note => {
                  const catMeta = CATEGORY_META[note.category] || { label: note.category, color: "bg-gray-100 text-gray-700" };
                  return (
                    <div 
                      key={note._id} 
                      onClick={() => setSelectedNote(note)}
                      className={cn("p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50 text-left", selectedNote?._id === note._id ? "bg-primary/5 border-primary shadow-sm" : "bg-background border-border")}
                    >
                      <h3 className="font-semibold text-sm line-clamp-1 mb-1">{note.title}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <Badge className={cn("text-[10px] px-1.5 py-0", catMeta.color)}>{catMeta.label}</Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">{format(new Date(note._creationTime), "MMM d, yy")}</span>
                      </div>
                      {note.caseId && <div className="mt-2 text-[10px] font-bold text-primary flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Bound to Case</div>}
                    </div>
                  )
                })
              )}
            </div>

            {/* Detail View */}
            <div className={cn("flex-1 overflow-y-auto bg-zinc-50/30 dark:bg-zinc-950/30 relative", !selectedNote ? "hidden lg:flex" : "block w-full lg:w-auto lg:block")}>
              {!selectedNote ? (
                 <div className="absolute inset-0 flex items-center justify-center text-muted-foreground flex-col">
                   <FileText className="w-12 h-12 mb-4 opacity-10" />
                   <p className="text-sm">Select a note to read</p>
                 </div>
              ) : (
                 <div className="p-6">
                   <div className="flex items-start justify-between gap-4 mb-6">
                     <div>
                       <h2 className="text-xl font-serif font-bold text-foreground leading-tight mb-2">{selectedNote.title}</h2>
                       <div className="flex items-center gap-3 flex-wrap">
                         <Badge variant="outline" className="text-xs">{CATEGORY_META[selectedNote.category]?.label || selectedNote.category}</Badge>
                         <span className="text-xs text-muted-foreground">{format(new Date(selectedNote._creationTime), "PPP")}</span>
                         {selectedNote.caseId && (
                            <Badge variant="secondary" className="text-xs font-mono bg-primary/10 text-primary hover:bg-primary/20">
                              Linked Case: {cases.find(c => c._id === selectedNote.caseId)?.caseNumber || selectedNote.caseId}
                            </Badge>
                         )}
                       </div>
                     </div>
                     <div className="flex items-center gap-2 shrink-0">
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => openEdit(selectedNote)}><Edit2 className="w-4 h-4" /></Button>
                        <Button size="icon" variant="outline" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(selectedNote._id)}><Trash2 className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 lg:hidden" onClick={() => setSelectedNote(null)}><X className="w-4 h-4" /></Button>
                     </div>
                   </div>

                   {selectedNote.citation && (selectedNote.citation.nkpNo || selectedNote.citation.decisionNo) && (
                     <div className="mb-6 p-4 bg-muted border border-border rounded-lg grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">NKP Number</p>
                          <p className="font-mono text-sm font-semibold">{selectedNote.citation.nkpNo || "-"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Decision No</p>
                          <p className="font-mono text-sm font-semibold">{selectedNote.citation.decisionNo || "-"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Bench</p>
                          <p className="text-sm font-semibold">{selectedNote.citation.bench || "-"}</p>
                        </div>
                     </div>
                   )}

                   <div className="prose prose-sm dark:prose-invert max-w-none font-serif text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
                     {selectedNote.content}
                   </div>
                   
                   {selectedNote.tags?.length > 0 && (
                     <div className="mt-8 pt-6 border-t border-border flex flex-wrap gap-2">
                       {selectedNote.tags.map((t: string) => <Badge key={t} variant="secondary" className="text-[10px] bg-muted">#{t}</Badge>)}
                     </div>
                   )}
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
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
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g., Precedent on Property Partition" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_META).map(([val, meta]) => <SelectItem key={val} value={val}>{meta.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Link to Case</label>
                <Select value={formCaseId} onValueChange={setFormCaseId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- General Firm Vault --</SelectItem>
                    {cases.map(c => <SelectItem key={c._id} value={c._id}>{c.caseNumber} - {c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg border border-border space-y-3">
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                <Scale className="w-3.5 h-3.5" /> Citation Metadata (Optional)
              </label>
              <div className="grid grid-cols-3 gap-3">
                <Input className="h-8 text-xs bg-background" placeholder="NKP No (e.g. 2078)" value={formNkp} onChange={e => setFormNkp(e.target.value)} />
                <Input className="h-8 text-xs bg-background" placeholder="Decision No" value={formDecision} onChange={e => setFormDecision(e.target.value)} />
                <Input className="h-8 text-xs bg-background" placeholder="Bench (e.g. Full Bench)" value={formBench} onChange={e => setFormBench(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Content / Precedent Details</label>
              <Textarea 
                value={formContent} 
                onChange={e => setFormContent(e.target.value)} 
                placeholder="Paste or write the legal research here..." 
                className="min-h-[200px] font-serif resize-y" 
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="e.g., partition, family law, limitation" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save to Vault"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
