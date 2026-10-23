import { useEffect, useMemo, useRef, useState } from "react";
import { useCases } from "@/client/queries/cases";
import { useResearchNotes, useResearchCommands } from "@/client/queries/research";
import type { ResearchDto } from "@/shared/contracts/domains";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Pagination } from "@/components/ui/pagination.tsx";
import { usePagination } from "@/hooks/use-pagination.ts";
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Loader2,
  Scale,
  FolderOpen,
  FileText,
  Pencil,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  DashboardButton,
  DualDateDisplay,
  EmptyState,
  PortalPageShell,
  usePortalBranding,
} from "@/components/dashboard";

const NOTES_PER_PAGE = 10;

const CATEGORY_LABELS: Record<string, string> = {
  supreme_court: "Supreme Court",
  high_court: "High Court",
  district_court: "District Court",
  commentary: "Legal Commentary",
  procedure: "Procedure",
  template_research: "Template Research",
};

type FormState = {
  title: string;
  category: string;
  content: string;
  tags: string;
  caseId: string;
  nkp: string;
  decision: string;
  bench: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  category: "procedure",
  content: "",
  tags: "",
  caseId: "none",
  nkp: "",
  decision: "",
  bench: "",
};

function formFromNote(note: ResearchDto): FormState {
  return {
    title: note.title,
    category: note.category,
    content: note.content,
    tags: note.tags?.join(", ") || "",
    caseId: note.caseId || "none",
    nkp: note.citation?.nkpNo || "",
    decision: note.citation?.decisionNo || "",
    bench: note.citation?.bench || "",
  };
}

function snapshot(form: FormState): string {
  return JSON.stringify(form);
}

function wordCount(value: string): number {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function alignInCanvas(element: HTMLElement | null, clearance = 16) {
  const canvas = document.getElementById("staff-main-canvas");
  if (!element || !canvas) return;
  const delta =
    element.getBoundingClientRect().top - (canvas.getBoundingClientRect().top + clearance);
  if (Math.abs(delta) < 4) return;
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
  canvas.scrollTo({ top: Math.max(0, canvas.scrollTop + delta), behavior });
}

function revealInCanvas(element: HTMLElement | null, clearance = 16) {
  const canvas = document.getElementById("staff-main-canvas");
  if (!element || !canvas) return;
  const canvasBox = canvas.getBoundingClientRect();
  const box = element.getBoundingClientRect();
  if (box.top >= canvasBox.top + clearance && box.bottom <= canvasBox.bottom - 8) return;
  alignInCanvas(element, clearance);
}

export default function StaffResearchPage() {
  const { heroImageUrl } = usePortalBranding();
  const notesResult = useResearchNotes();
  const casesResult = useCases({});
  const notes = notesResult ?? [];
  const cases = casesResult ?? [];
  const { createNote, updateNote, deleteNote } = useResearchCommands();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [baseline, setBaseline] = useState(snapshot(EMPTY_FORM));
  const [isSaving, setIsSaving] = useState(false);

  const selectedNote = notes.find((note) => note._id === selectedId) ?? null;
  const dirty = editorMode !== null && snapshot(form) !== baseline;
  const workspaceOpen = editorMode !== null || Boolean(selectedNote);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const confirmDiscard = () => {
    if (!dirty) return true;
    return window.confirm("You have unsaved changes. Discard them?");
  };

  const openCreate = () => {
    if (!confirmDiscard()) return;
    setForm(EMPTY_FORM);
    setBaseline(snapshot(EMPTY_FORM));
    setEditorMode("create");
  };

  const openEdit = (note: ResearchDto) => {
    if (editorMode === "edit" && selectedId === note._id) return;
    if (!confirmDiscard()) return;
    const next = formFromNote(note);
    setSelectedId(note._id);
    setForm(next);
    setBaseline(snapshot(next));
    setEditorMode("edit");
  };

  const openRead = (note: ResearchDto) => {
    if (selectedId === note._id && editorMode === null) return;
    if (!confirmDiscard()) return;
    setEditorMode(null);
    setSelectedId(note._id);
  };

  const cancelEditor = () => {
    if (!confirmDiscard()) return;
    setEditorMode(null);
    setForm(EMPTY_FORM);
    setBaseline(snapshot(EMPTY_FORM));
  };

  const backToLibrary = () => {
    if (!confirmDiscard()) return;
    setEditorMode(null);
    setSelectedId(null);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required.");
      return;
    }
    if (form.title.trim().length > 300) {
      toast.error("Title must be 300 characters or fewer.");
      return;
    }
    setIsSaving(true);
    const payload = {
      title: form.title.trim(),
      category: form.category,
      content: form.content.trim(),
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      caseId: form.caseId === "none" ? null : form.caseId,
      citation:
        form.nkp || form.decision || form.bench
          ? { nkpNo: form.nkp, decisionNo: form.decision, bench: form.bench }
          : null,
    };
    try {
      if (editorMode === "edit" && selectedId) {
        const updated = (await updateNote(selectedId, payload)) as ResearchDto;
        toast.success("Note updated");
        if (updated?._id) setSelectedId(updated._id);
      } else {
        const created = (await createNote(payload)) as ResearchDto;
        toast.success("Saved to vault");
        if (created?._id) setSelectedId(created._id);
      }
      setEditorMode(null);
      setBaseline(snapshot(form));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (note: ResearchDto) => {
    if (!window.confirm("Delete this note?")) return;
    if (editorMode && selectedId === note._id && !confirmDiscard()) return;
    try {
      await deleteNote(note._id);
      toast.success("Note deleted");
      if (selectedId === note._id) {
        setSelectedId(null);
        setEditorMode(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete note");
    }
  };

  const filteredNotes = useMemo(() => {
    const query = search.toLowerCase();
    return notes.filter((note) => {
      const matchSearch =
        !query ||
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        (note.citation?.nkpNo || "").toLowerCase().includes(query);
      const matchCategory = categoryFilter === "all" || note.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [notes, search, categoryFilter]);

  const {
    paginatedItems: visibleNotes,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    goToPage,
    nextPage,
    prevPage,
    resetPagination,
  } = usePagination(filteredNotes, NOTES_PER_PAGE);
  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(currentPage * itemsPerPage, totalItems);
  const filterKey = `${search}\0${categoryFilter}`;
  const filterKeyRef = useRef(filterKey);
  const noteCountRef = useRef(filteredNotes.length);
  const libraryRef = useRef<HTMLElement>(null);
  const seenPageRef = useRef<number | null>(null);

  useEffect(() => {
    if (seenPageRef.current === null) {
      seenPageRef.current = currentPage;
      return;
    }
    if (seenPageRef.current === currentPage) return;
    seenPageRef.current = currentPage;
    alignInCanvas(libraryRef.current);
  }, [currentPage]);

  useEffect(() => {
    if (!selectedNote || editorMode) return;
    if (!window.matchMedia("(min-width: 64rem)").matches) return;
    const heading = document.querySelector(".staff-research-reader h2");
    revealInCanvas(heading instanceof HTMLElement ? heading : null);
  }, [selectedId, editorMode, selectedNote]);

  useEffect(() => {
    if (filterKeyRef.current !== filterKey) {
      filterKeyRef.current = filterKey;
      noteCountRef.current = filteredNotes.length;
      resetPagination();
      return;
    }
    if (filteredNotes.length < noteCountRef.current) goToPage(currentPage);
    noteCountRef.current = filteredNotes.length;
  }, [filterKey, filteredNotes.length, currentPage, goToPage, resetPagination]);

  const linkedMatters = new Set(notes.map((note) => note.caseId).filter(Boolean)).size;
  const recentAdditions = notes.filter((note) => {
    const created = Date.parse(note.createdAt);
    return Number.isFinite(created) && Date.now() - created <= 30 * 24 * 60 * 60 * 1000;
  }).length;

  if (notesResult === undefined || casesResult === undefined) {
    return (
      <PortalPageShell
        portal="staff"
        loading
        loadingLabel="Loading research vault…"
        title="Research Vault"
      >
        {null}
      </PortalPageShell>
    );
  }

  const updateForm = (patch: Partial<FormState>) =>
    setForm((current) => ({ ...current, ...patch }));

  return (
    <PortalPageShell
      portal="staff"
      eyebrow="Legal practice · Knowledge base"
      title="Research Vault"
      description="Firm precedents, research notes and legal references."
      icon={BookOpen}
      className="staff-research-workspace"
      heroClassName="staff-research-hero"
      metricsClassName="staff-research-metrics"
      metrics={[
        {
          label: "Research notes",
          value: String(notes.length),
          icon: BookOpen,
          tone: "information",
          helperText: "All notes",
        },
        {
          label: "Linked matters",
          value: String(linkedMatters),
          icon: Scale,
          tone: "warning",
          helperText: "Connected cases",
        },
        {
          label: "Research categories",
          value: String(new Set(notes.map((note) => note.category)).size),
          icon: FolderOpen,
          tone: "success",
          helperText: "In this vault",
        },
        {
          label: "Recent additions",
          value: String(recentAdditions),
          icon: Clock,
          tone: "information",
          helperText: "In the last 30 days",
        },
      ]}
      heroChildren={
        <div
          aria-hidden
          className="staff-research-hero-art"
          style={
            heroImageUrl
              ? {
                  backgroundImage: `url(${JSON.stringify(heroImageUrl)}), url("/images/staff-home-nepal.jpg")`,
                }
              : undefined
          }
        />
      }
    >
      <div className="staff-research-layout" data-pane={workspaceOpen ? "workspace" : "library"}>
        <section ref={libraryRef} className="staff-research-library" aria-label="Research library">
          <div className="staff-research-library-head">
            <h2>Research notes</h2>
            <DashboardButton size="sm" variant="primary" onClick={openCreate}>
              <Plus className="size-3.5" aria-hidden /> New Research Note
            </DashboardButton>
          </div>
          <div className="staff-research-filters">
            <div className="staff-research-search">
              <Search aria-hidden />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search notes…"
                aria-label="Search research notes"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger aria-label="Filter by category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filteredNotes.length === 0 ? (
            <EmptyState
              title="No notes found"
              description="Try a different search or category."
              icon={FolderOpen}
              className="py-10"
            />
          ) : (
            <>
              <ul className="staff-research-list">
                {visibleNotes.map((note) => {
                  const linked = cases.find((item) => item._id === note.caseId);
                  const active = selectedId === note._id;
                  return (
                    <li key={note._id}>
                      <button
                        type="button"
                        className="staff-research-note"
                        aria-pressed={active}
                        onClick={() => openRead(note)}
                      >
                        <strong>{note.title}</strong>
                        <span className="staff-research-note-meta">
                          <span>{CATEGORY_LABELS[note.category] || note.category}</span>
                          {note.citation?.nkpNo ? <span>NKP {note.citation.nkpNo}</span> : null}
                          <DualDateDisplay isoDate={note.createdAt} />
                        </span>
                        {note.caseId ? (
                          <span className="staff-research-link">
                            <FolderOpen className="size-3.5" aria-hidden />
                            {linked ? linked.caseNumber : "Linked case"}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="staff-research-pagination">
                <p className="staff-research-page-status" aria-live="polite">
                  Showing {rangeStart}–{rangeEnd} of {totalItems} research notes
                </p>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  onNextPage={nextPage}
                  onPrevPage={prevPage}
                  ariaLabel="Research notes pages"
                  className="py-1"
                />
              </div>
            </>
          )}
        </section>

        <section className="staff-research-stage" aria-label="Research workspace">
          <button type="button" className="staff-research-back" onClick={backToLibrary}>
            <ArrowLeft className="size-4" aria-hidden /> Back to library
          </button>

          {editorMode ? (
            <form
              className="staff-research-editor"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSave();
              }}
            >
              <header className="staff-research-editor-head">
                <div>
                  <p>{editorMode === "edit" ? "Edit research note" : "New research note"}</p>
                  <h2>{editorMode === "edit" ? form.title || "Untitled note" : "Write a note"}</h2>
                </div>
                {dirty ? <span className="staff-research-dirty">Unsaved changes</span> : null}
              </header>
              <div className="staff-research-fields">
                <label>
                  Title
                  <Input
                    value={form.title}
                    onChange={(event) => updateForm({ title: event.target.value })}
                    maxLength={300}
                    required
                  />
                </label>
                <div className="staff-research-field-row">
                  <label>
                    Category
                    <Select
                      value={form.category}
                      onValueChange={(category) => updateForm({ category })}
                    >
                      <SelectTrigger aria-label="Category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label>
                    Linked case
                    <Select value={form.caseId} onValueChange={(caseId) => updateForm({ caseId })}>
                      <SelectTrigger aria-label="Linked case">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">General firm vault</SelectItem>
                        {cases.map((item) => (
                          <SelectItem key={item._id} value={item._id}>
                            {item.caseNumber} — {item.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                </div>
                <div className="staff-research-field-row staff-research-citation-fields">
                  <label>
                    NKP No.
                    <Input
                      value={form.nkp}
                      onChange={(event) => updateForm({ nkp: event.target.value })}
                    />
                  </label>
                  <label>
                    Decision No.
                    <Input
                      value={form.decision}
                      onChange={(event) => updateForm({ decision: event.target.value })}
                    />
                  </label>
                  <label>
                    Bench
                    <Input
                      value={form.bench}
                      onChange={(event) => updateForm({ bench: event.target.value })}
                    />
                  </label>
                </div>
                <label>
                  Tags
                  <Input
                    value={form.tags}
                    onChange={(event) => updateForm({ tags: event.target.value })}
                    placeholder="Comma-separated tags"
                  />
                </label>
                <label className="staff-research-content-label">
                  Research content
                  <Textarea
                    value={form.content}
                    onChange={(event) => updateForm({ content: event.target.value })}
                    className="staff-research-canvas"
                    required
                    aria-label="Research content"
                  />
                </label>
              </div>
              <div className="staff-research-editor-actions">
                <span>{wordCount(form.content)} words</span>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEditor}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                    Save to Vault
                  </Button>
                </div>
              </div>
            </form>
          ) : selectedNote ? (
            <article className="staff-research-reader">
              <header>
                <div>
                  <p className="staff-research-badge">
                    {CATEGORY_LABELS[selectedNote.category] || selectedNote.category}
                  </p>
                  <h2>{selectedNote.title}</h2>
                  <p className="staff-research-reader-date">
                    <DualDateDisplay isoDate={selectedNote.createdAt} />
                  </p>
                </div>
                <div className="staff-research-reader-actions">
                  <Button type="button" variant="outline" onClick={() => openEdit(selectedNote)}>
                    <Pencil className="size-4" aria-hidden /> Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDelete(selectedNote)}
                  >
                    <Trash2 className="size-4" aria-hidden /> Delete
                  </Button>
                </div>
              </header>
              {selectedNote.caseId ? (
                <p className="staff-research-link">
                  <FolderOpen className="size-3.5" aria-hidden />
                  Linked case:{" "}
                  {cases.find((item) => item._id === selectedNote.caseId)?.caseNumber ||
                    "Linked case"}
                </p>
              ) : null}
              {selectedNote.citation &&
              (selectedNote.citation.nkpNo ||
                selectedNote.citation.decisionNo ||
                selectedNote.citation.bench) ? (
                <dl className="staff-research-citation">
                  <div>
                    <dt>NKP No.</dt>
                    <dd>{selectedNote.citation.nkpNo || "—"}</dd>
                  </div>
                  <div>
                    <dt>Decision No.</dt>
                    <dd>{selectedNote.citation.decisionNo || "—"}</dd>
                  </div>
                  <div>
                    <dt>Bench</dt>
                    <dd>{selectedNote.citation.bench || "—"}</dd>
                  </div>
                </dl>
              ) : null}
              <div className="staff-research-body">{selectedNote.content}</div>
              {selectedNote.tags?.length ? (
                <ul className="staff-research-tags" aria-label="Tags">
                  {selectedNote.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ) : (
            <EmptyState
              title="Select a research note"
              description="Choose a note from the library, or start a new one."
              icon={FileText}
              className="staff-research-empty"
            />
          )}
        </section>
      </div>
    </PortalPageShell>
  );
}
