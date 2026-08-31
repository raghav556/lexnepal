import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog.tsx";
import { toast } from "sonner";
import {
  useAppointments,
  useAppointmentCommands,
  useAvailableSlots,
  useLeads,
  useLeadCommands,
} from "@/client/queries/crm";
import { usePracticeAreas } from "@/client/queries/cms";
import { apiClient } from "@/client/api/client";
import { queryKeys } from "@/client/queries/query-keys";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  Loader2,
  UserPlus,
  Phone,
  Mail,
  Tag,
  X,
  Link as LinkIcon,
  CheckCircle2,
  KanbanSquare,
  AlignJustify,
  Search,
  ExternalLink,
  Download,
  Plus,
  Calendar,
  BookOpen,
} from "lucide-react";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import { useStaffDirectory } from "@/client/queries/identity";
import type { LeadCreateInput } from "@/shared/contracts/crm";
import { contactFormLeadLabel, isContactFormLead } from "@/shared/contact-visibility";
import {
  DashboardButton,
  DashboardFilterBar,
  DashboardListRow,
  DashboardSection,
  DashboardStatusLabel,
  DualDateDisplay,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  consultation_scheduled: "Consult Scheduled",
  converted: "Converted",
  lost: "Lost",
};

const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  referral: "Referral",
  walk_in: "Walk-in",
  phone: "Phone",
  social: "Social",
  newsletter: "Newsletter",
};

const LEAD_SOURCES = Object.keys(SOURCE_LABELS) as LeadCreateInput["source"][];

interface ConvertModalState {
  leadId: string;
  leadName: string;
  email?: string;
  phone?: string;
}

type LeadRow = {
  id?: string;
  _id?: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  source?: string;
  status: string;
  practiceAreaInterest?: string | null;
  resourceId?: string | null;
  message?: string | null;
  notes?: string | null;
  assignedTo?: string | null;
  intakeToken?: string | null;
  intakeSubmitted?: boolean;
  convertedClientId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function leadKey(l: LeadRow) {
  return String(l.id ?? l._id ?? "");
}

function stageAgeDays(lead: LeadRow): number {
  const raw = lead.updatedAt || lead.createdAt;
  if (!raw) return 0;
  const then = new Date(raw).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

function exportLeadsCsv(list: LeadRow[], staffName: (id?: string | null) => string) {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Status",
    "Source",
    "Practice area",
    "Assignee",
    "Days in stage",
    "Intake",
    "Converted client",
  ];
  const rows = list.map((l) => [
    l.fullName ?? "",
    l.email ?? "",
    l.phone ?? "",
    l.status ?? "",
    l.source ?? "",
    l.practiceAreaInterest ?? "",
    l.resourceId ?? "",
    staffName(l.assignedTo),
    String(stageAgeDays(l)),
    l.intakeSubmitted ? "submitted" : l.intakeToken ? "link" : "",
    l.convertedClientId ?? "",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `crm-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export type CrmLeadsPageProps = {
  /** Admin console vs staff workspace — same CRM implementation, different deep-links / scoping UX. */
  portal?: "admin" | "staff";
};

export default function AdminCRMPage({ portal = "admin" }: CrmLeadsPageProps) {
  const router = useRouter();
  const me = useCurrentUser();
  const meId = me?.id ?? me?._id ?? "";
  const { data: sessionCaps } = useQuery({
    queryKey: queryKeys.identity.sessionCapabilities,
    queryFn: async ({ signal }) => {
      const data = await apiClient.request<{ capabilities: string[] }>("/api/v1/auth/session", {
        signal,
      });
      return data.capabilities ?? [];
    },
    staleTime: 60_000,
  });
  const canManageCrm = (sessionCaps ?? []).includes("clients.manage");
  const selfScoped = portal === "staff" && !canManageCrm;
  const clientsPath = portal === "staff" ? "/staff/clients" : "/admin/clients";
  const appointmentsPath = portal === "staff" ? "/staff/appointments" : "/admin/appointments";

  const staffDirectory = useStaffDirectory();
  const users = staffDirectory ?? [];
  const cmsPracticeAreas = usePracticeAreas({}, "admin") || [];
  const practiceAreaTitles = cmsPracticeAreas
    .filter((a: { isActive?: boolean }) => a.isActive !== false)
    .map((a: { title?: string }) => String(a.title ?? "").trim())
    .filter(Boolean);
  const { createLead, updateLead, convertToClient, generateIntakeLink } = useLeadCommands();
  const { createAppointment } = useAppointmentCommands();

  const [view, setView] = useState<"kanban" | "list">(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches
      ? "kanban"
      : "list",
  );
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const [detailsModal, setDetailsModal] = useState<LeadRow | null>(null);
  const [convertModal, setConvertModal] = useState<ConvertModalState | null>(null);
  const [convertType, setConvertType] = useState<"individual" | "corporate">("individual");
  const [convertCompany, setConvertCompany] = useState("");
  const [converting, setConverting] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmDialogState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    source: "walk_in" as LeadCreateInput["source"],
    practiceAreaInterest: "",
    assignedTo: "unassigned",
    notes: "",
    message: "",
  });

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    date: "",
    timeSlot: "",
    practiceArea: "Consultation",
    assignedLawyerId: "unassigned",
    notes: "",
    clientPhone: "",
  });

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const effectiveAssigneeFilter = selfScoped && meId ? meId : assigneeFilter;

  const listFilters = useMemo(
    () => ({
      status: statusFilter !== "all" ? statusFilter : undefined,
      source: sourceFilter !== "all" ? sourceFilter : undefined,
      assignedTo:
        selfScoped && meId
          ? meId
          : effectiveAssigneeFilter !== "all" && effectiveAssigneeFilter !== "unassigned"
            ? effectiveAssigneeFilter
            : undefined,
      q: searchDebounced || undefined,
    }),
    [statusFilter, sourceFilter, effectiveAssigneeFilter, searchDebounced, selfScoped, meId],
  );

  const { data: leads = [], isLoading: leadsLoading } = useLeads(listFilters);
  // KPI totals ignore status filter so chips stay meaningful while filtering.
  const kpiFilters = useMemo(
    () => ({
      source: sourceFilter !== "all" ? sourceFilter : undefined,
      assignedTo:
        selfScoped && meId
          ? meId
          : effectiveAssigneeFilter !== "all" && effectiveAssigneeFilter !== "unassigned"
            ? effectiveAssigneeFilter
            : undefined,
      q: searchDebounced || undefined,
    }),
    [sourceFilter, effectiveAssigneeFilter, searchDebounced, selfScoped, meId],
  );
  const { data: kpiLeads = [] } = useLeads(kpiFilters);

  const detailsLeadId = detailsModal ? leadKey(detailsModal) : null;
  const { data: relatedAppointments = [] } = useAppointments(
    detailsLeadId ? { leadId: detailsLeadId } : undefined,
  );
  const scheduleLawyerId =
    scheduleForm.assignedLawyerId !== "unassigned" ? scheduleForm.assignedLawyerId : undefined;
  const { data: availableSlots = [] } = useAvailableSlots(
    scheduleOpen && scheduleForm.date ? scheduleForm.date : undefined,
    scheduleLawyerId,
  );

  const isLoading = leadsLoading;
  const staffUsers = users.filter((u) => u.role !== "client");

  const staffName = (id?: string | null) => {
    if (!id) return "";
    const u = staffUsers.find((s) => (s.id || s._id) === id);
    return u?.name || "Assigned";
  };

  const filteredLeads = useMemo(() => {
    if (assigneeFilter !== "unassigned") return leads as LeadRow[];
    return (leads as LeadRow[]).filter((l) => !l.assignedTo);
  }, [leads, assigneeFilter]);

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, prevPage, resetPagination } =
    usePagination(filteredLeads, 10);

  useEffect(() => {
    resetPagination();
  }, [searchDebounced, view, statusFilter, sourceFilter, assigneeFilter]);

  const applyStatusChange = async (leadId: string, status: string) => {
    try {
      await updateLead.mutateAsync({ leadId, status });
      toast.success("Pipeline status updated.");
      if (detailsModal && leadKey(detailsModal) === leadId) {
        setDetailsModal((prev) => (prev ? { ...prev, status } : prev));
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    }
  };

  const handleStatusChange = async (leadId: string, status: string) => {
    if (status === "lost") {
      const lead = (leads as LeadRow[]).find((l) => leadKey(l) === leadId);
      setConfirm({
        title: "Mark lead as lost?",
        description: `Mark "${lead?.fullName ?? "this lead"}" as lost? You can still find them in the Lost column.`,
        confirmLabel: "Mark lost",
        destructive: true,
        onConfirm: async () => {
          setConfirmBusy(true);
          try {
            await applyStatusChange(leadId, "lost");
          } finally {
            setConfirmBusy(false);
            setConfirm(null);
          }
        },
      });
      return;
    }
    await applyStatusChange(leadId, status);
  };

  const handleAssigneeChange = async (leadId: string, assigneeId: string) => {
    try {
      await updateLead.mutateAsync({
        leadId,
        assignedTo: assigneeId === "unassigned" ? null : assigneeId,
      });
      toast.success("Lead assignment updated.");
      if (detailsModal && leadKey(detailsModal) === leadId) {
        setDetailsModal((prev) =>
          prev ? { ...prev, assignedTo: assigneeId === "unassigned" ? null : assigneeId } : prev,
        );
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update assignment.");
    }
  };

  const handleSaveNotes = async () => {
    if (!detailsModal) return;
    setSavingDetails(true);
    try {
      await updateLead.mutateAsync({
        leadId: leadKey(detailsModal),
        notes: detailsModal.notes ?? "",
      });
      toast.success("Notes saved.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save notes.");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleGenerateLink = async (leadId: string) => {
    try {
      const token = await generateIntakeLink.mutateAsync({ leadId });
      const url = `${window.location.origin}/intake/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Intake link generated and copied to clipboard!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate link.");
    }
  };

  const runConvert = async () => {
    if (!convertModal) return;
    setConverting(true);
    try {
      const clientArgs: {
        leadId: string;
        type: "individual" | "corporate";
        companyName?: string;
      } = {
        leadId: convertModal.leadId,
        type: convertType,
      };
      if (convertType === "corporate" && convertCompany.trim()) {
        clientArgs.companyName = convertCompany.trim();
      }
      const result = (await convertToClient.mutateAsync(clientArgs)) as {
        clientId?: string;
        _id?: string;
      };
      const clientId = result.clientId ?? result._id;
      toast.success(`"${convertModal.leadName}" has been converted to a client record.`);
      setConvertModal(null);
      setDetailsModal(null);
      setConvertCompany("");
      setConvertType("individual");
      if (clientId) {
        router.push(`${clientsPath}?client=${encodeURIComponent(clientId)}`);
      } else {
        router.push(clientsPath);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setConverting(false);
    }
  };

  const handleConvertSubmit = () => {
    if (!convertModal) return;
    if (convertType === "corporate" && !convertCompany.trim()) {
      toast.error("Company name is required for corporate clients.");
      return;
    }
    setConfirm({
      title: "Convert to client?",
      description: `Create a ${convertType} client record for "${convertModal.leadName}" and mark this lead converted. You will be taken to the Clients directory.`,
      confirmLabel: "Confirm convert",
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await runConvert();
        } finally {
          setConfirmBusy(false);
          setConfirm(null);
        }
      },
    });
  };

  const openSchedule = (lead: LeadRow) => {
    setScheduleForm({
      date: "",
      timeSlot: "",
      practiceArea: lead.practiceAreaInterest?.trim() || "Consultation",
      assignedLawyerId: lead.assignedTo || "unassigned",
      notes: "",
      clientPhone: lead.phone?.trim() || "",
    });
    setScheduleOpen(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailsModal) return;
    const phone = scheduleForm.clientPhone.trim();
    if (!phone) {
      toast.error("Phone is required to book an appointment.");
      return;
    }
    if (!scheduleForm.date || !scheduleForm.timeSlot) {
      toast.error("Pick a date and time slot.");
      return;
    }
    setScheduling(true);
    try {
      const created = (await createAppointment.mutateAsync({
        clientName: detailsModal.fullName,
        clientEmail: detailsModal.email || undefined,
        clientPhone: phone,
        leadId: leadKey(detailsModal),
        practiceArea: scheduleForm.practiceArea.trim() || "Consultation",
        date: scheduleForm.date,
        timeSlot: scheduleForm.timeSlot,
        notes: scheduleForm.notes.trim() || undefined,
        assignedLawyerId:
          scheduleForm.assignedLawyerId === "unassigned"
            ? undefined
            : scheduleForm.assignedLawyerId,
      })) as { id?: string; _id?: string } | undefined;
      toast.success("Consultation scheduled.");
      setScheduleOpen(false);
      setDetailsModal((prev) => (prev ? { ...prev, status: "consultation_scheduled" } : prev));
      const appointmentId = created?.id ?? created?._id;
      router.push(
        appointmentId
          ? `${appointmentsPath}?appointment=${encodeURIComponent(appointmentId)}`
          : appointmentsPath,
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule consultation.");
    } finally {
      setScheduling(false);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.fullName.trim()) {
      toast.error("Full name is required.");
      return;
    }
    setAdding(true);
    try {
      await createLead.mutateAsync({
        fullName: addForm.fullName.trim(),
        email: addForm.email.trim() || undefined,
        phone: addForm.phone.trim() || undefined,
        source: addForm.source,
        practiceAreaInterest: addForm.practiceAreaInterest.trim() || undefined,
        assignedTo: selfScoped
          ? meId || undefined
          : addForm.assignedTo === "unassigned"
            ? undefined
            : addForm.assignedTo,
        notes: addForm.notes.trim() || undefined,
        message: addForm.message.trim() || undefined,
      });
      toast.success("Lead created.");
      setAddOpen(false);
      setAddForm({
        fullName: "",
        email: "",
        phone: "",
        source: "walk_in",
        practiceAreaInterest: "",
        assignedTo: "unassigned",
        notes: "",
        message: "",
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create lead.");
    } finally {
      setAdding(false);
    }
  };

  const toggleStatusChip = (key: string) => {
    setStatusFilter((prev) => (prev === key ? "all" : key));
  };

  if (isLoading) {
    return (
      <PortalPageShell
        portal={portal}
        loading
        loadingLabel="Loading leads…"
        title={selfScoped ? "My leads" : "CRM — lead pipeline"}
        icon={KanbanSquare}
      >
        {null}
      </PortalPageShell>
    );
  }

  const LeadCard = ({ lead, isKanban = false }: { lead: LeadRow; isKanban?: boolean }) => {
    const age = stageAgeDays(lead);
    return (
      <DashboardListRow
        className={`cursor-pointer ${isKanban ? "p-3" : ""}`}
        onClick={(e) => {
          if (
            (e.target as HTMLElement).closest("button") ||
            (e.target as HTMLElement).closest(".select-trigger")
          )
            return;
          setDetailsModal(lead);
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{lead.fullName}</p>
            {isKanban && lead.source ? (
              <DashboardStatusLabel
                tone="neutral"
                label={lead.source.replace("_", " ")}
                className="text-[9px] capitalize shrink-0"
              />
            ) : null}
          </div>

          <div
            className={`flex flex-wrap items-center gap-2 mt-1 ${isKanban ? "flex-col items-start gap-1" : ""}`}
          >
            {lead.phone && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="w-3 h-3" />
                {lead.phone}
              </span>
            )}
            {lead.email && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground truncate w-full">
                <Mail className="w-3 h-3 flex-shrink-0" />{" "}
                <span className="truncate">{lead.email}</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {lead.practiceAreaInterest && (
              <DashboardStatusLabel
                tone="information"
                label={lead.practiceAreaInterest}
                icon={Tag}
                className="text-[10px] gap-1"
              />
            )}
            {lead.resourceId && (
              <DashboardStatusLabel
                tone="neutral"
                label="Resource lead"
                icon={BookOpen}
                className="text-[10px] gap-1"
              />
            )}
            {isContactFormLead(lead) && (
              <DashboardStatusLabel
                tone="neutral"
                label={contactFormLeadLabel()}
                icon={Mail}
                className="text-[10px] gap-1"
              />
            )}
            {!isKanban && lead.source && (
              <DashboardStatusLabel
                tone="neutral"
                label={lead.source.replace("_", " ")}
                className="text-[10px] capitalize"
              />
            )}
            <DashboardStatusLabel
              tone="neutral"
              label={age === 0 ? "Today" : `${age}d in stage`}
              className="text-[10px] tabular-nums"
            />
            {lead.intakeSubmitted && (
              <DashboardStatusLabel
                tone="success"
                label="Intake submitted"
                icon={CheckCircle2}
                className="text-[10px] gap-1"
              />
            )}
            {lead.assignedTo && (
              <span className="text-[10px] text-muted-foreground ml-auto bg-muted px-1.5 py-0.5 rounded-sm">
                {staffName(lead.assignedTo) || "Assigned"}
              </span>
            )}
            {lead.createdAt && !isKanban ? (
              <span className="text-[10px] text-muted-foreground">
                <DualDateDisplay isoDate={lead.createdAt} />
              </span>
            ) : null}
          </div>
        </div>

        {!isKanban && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0 w-full sm:w-auto min-w-0">
            <DashboardStatusLabel
              status={lead.status}
              label={STATUS_LABELS[lead.status]}
              className="text-xs whitespace-nowrap w-fit"
            />
            {lead.status !== "converted" && (
              <Select
                value={lead.status}
                onValueChange={(val) => handleStatusChange(leadKey(lead), val)}
              >
                <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS)
                    .filter(([k]) => k !== "converted")
                    .map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
            {canManageCrm && lead.status !== "converted" && lead.status !== "lost" && (
              <Button
                size="sm"
                className="text-xs h-8 gap-1 w-full sm:w-auto"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setConvertModal({
                    leadId: leadKey(lead),
                    leadName: lead.fullName,
                    email: lead.email ?? undefined,
                    phone: lead.phone ?? undefined,
                  });
                }}
              >
                <UserPlus className="w-3 h-3" /> Convert
              </Button>
            )}
          </div>
        )}
      </DashboardListRow>
    );
  };

  return (
    <PortalPageShell
      portal={portal}
      decorated
      showTodayDate
      eyebrow="Client intake"
      title={selfScoped ? "My leads" : undefined}
      titleKey={selfScoped ? undefined : "portal.crm.title"}
      description={
        selfScoped
          ? "Work intake leads assigned to you. Appointments stay on Appointments."
          : undefined
      }
      descriptionKey={selfScoped ? undefined : "portal.crm.description"}
      icon={KanbanSquare}
      actions={
        <div className="flex flex-wrap gap-2 w-full sm:w-auto min-w-0">
          <DashboardButton
            type="button"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-4 h-4" /> Add lead
          </DashboardButton>
          <DashboardButton
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() => {
              exportLeadsCsv(filteredLeads, staffName);
              toast.success(`Exported ${filteredLeads.length} lead(s).`);
            }}
            disabled={filteredLeads.length === 0}
          >
            <Download className="w-4 h-4" /> Export CSV
          </DashboardButton>
          <div className="flex bg-muted rounded-md p-1 shrink-0">
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={`p-1.5 rounded-sm transition-colors ${view === "kanban" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="Kanban view"
            >
              <KanbanSquare className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`p-1.5 rounded-sm transition-colors ${view === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="List view"
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>
        </div>
      }
      contentClassName="h-full flex flex-col font-sans"
    >
      <DashboardFilterBar className="flex-shrink-0 min-w-0">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 h-9 text-sm w-full"
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="h-9 w-full sm:w-[140px] text-xs">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {LEAD_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {SOURCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!selfScoped ? (
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="h-9 w-full sm:w-[160px] text-xs">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {staffUsers.map((u) => (
                <SelectItem key={u.id || u._id} value={String(u.id || u._id)}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-full sm:w-[160px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </DashboardFilterBar>

      <div className="flex-shrink-0 min-w-0 -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="flex lg:grid lg:grid-cols-5 gap-2 sm:gap-3 overflow-x-auto lg:overflow-visible pb-1 snap-x snap-mandatory lg:snap-none">
          {Object.entries(STATUS_LABELS).map(([key, label]) => {
            const count = (kpiLeads as LeadRow[]).filter((l) => l.status === key).length;
            const active = statusFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleStatusChip(key)}
                className={`min-w-[140px] sm:min-w-[160px] lg:min-w-0 snap-start shrink-0 lg:shrink text-left rounded-xl border bg-card transition-colors ${
                  active
                    ? "border-dashboard-primary ring-1 ring-dashboard-primary/30"
                    : key === "converted"
                      ? "border-dashboard-success/35"
                      : "border-border"
                }`}
              >
                <div className="p-3 text-center">
                  <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                    {count}
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-snug px-0.5">
                    {label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {view === "kanban" ? (
        <DashboardSection
          className="flex-1 min-w-0 mt-1"
          title="Pipeline board"
          icon={KanbanSquare}
          description="Swipe sideways on mobile to browse stages."
        >
          <div className="flex-1 min-w-0 overflow-x-auto overscroll-x-contain pb-4 -mx-1 px-1">
            <div className="flex gap-3 sm:gap-4 w-max max-w-none h-full min-h-[420px]">
              {Object.keys(STATUS_LABELS)
                .filter((statusKey) => statusFilter === "all" || statusFilter === statusKey)
                .map((statusKey) => {
                  const colLeads = filteredLeads.filter((l) => l.status === statusKey);
                  return (
                    <div
                      key={statusKey}
                      className="w-[min(280px,85vw)] sm:w-72 md:w-80 flex flex-col bg-dashboard-neutral-soft/40 rounded-xl border border-dashboard-border min-h-[420px] max-h-[min(750px,70vh)] shrink-0"
                    >
                      <div className="p-3 border-b border-dashboard-border flex items-center justify-between gap-2 bg-dashboard-panel/80 rounded-t-xl sticky top-0 z-10">
                        <h3 className="font-semibold text-sm text-foreground truncate">
                          {STATUS_LABELS[statusKey]}
                        </h3>
                        <DashboardStatusLabel
                          tone="neutral"
                          label={String(colLeads.length)}
                          className="text-xs shrink-0"
                        />
                      </div>
                      <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-0">
                        {colLeads.length === 0 ? (
                          <EmptyState
                            title="No leads"
                            description="No leads in this stage."
                            icon={KanbanSquare}
                          />
                        ) : (
                          colLeads.map((lead) => (
                            <LeadCard key={leadKey(lead)} lead={lead} isKanban />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </DashboardSection>
      ) : (
        <DashboardSection
          className="flex-1 mt-2"
          title="List view"
          icon={AlignJustify}
          actions={
            <span className="text-sm font-normal text-muted-foreground">
              {filteredLeads.length} total
            </span>
          }
        >
          <div className="space-y-3">
            {paginatedItems.length === 0 ? (
              <EmptyState
                title="No leads found"
                description="Adjust filters or add a new lead."
                icon={KanbanSquare}
              />
            ) : (
              paginatedItems.map((lead) => (
                <LeadCard key={leadKey(lead)} lead={lead} isKanban={false} />
              ))
            )}
          </div>
          {paginatedItems.length > 0 && (
            <div className="p-4 border-t border-border">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                onNextPage={nextPage}
                onPrevPage={prevPage}
              />
            </div>
          )}
        </DashboardSection>
      )}

      {detailsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-end animate-in fade-in-20">
          <div className="bg-card w-full max-w-md h-full shadow-2xl flex flex-col border-l border-border animate-in slide-in-from-right-10">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <h3 className="font-serif text-xl font-bold text-foreground">Lead Details</h3>
              <button
                type="button"
                onClick={() => setDetailsModal(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <h2 className="text-2xl font-bold text-foreground">{detailsModal.fullName}</h2>
                  <DashboardStatusLabel
                    status={detailsModal.status}
                    label={STATUS_LABELS[detailsModal.status]}
                    className="capitalize shrink-0"
                  />
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {stageAgeDays(detailsModal) === 0
                    ? "In this stage since today"
                    : `${stageAgeDays(detailsModal)} day(s) in this stage`}
                </p>
                <div className="space-y-1.5 mt-4">
                  {detailsModal.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" /> {detailsModal.phone}
                    </div>
                  )}
                  {detailsModal.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" /> {detailsModal.email}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Source
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <DashboardStatusLabel
                      tone="neutral"
                      label={detailsModal.source?.replace("_", " ") ?? ""}
                      className="capitalize"
                    />
                    {isContactFormLead(detailsModal) && (
                      <DashboardStatusLabel
                        tone="neutral"
                        label={contactFormLeadLabel()}
                        icon={Mail}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Practice Area
                  </p>
                  {detailsModal.practiceAreaInterest ? (
                    <span className="text-sm font-medium">{detailsModal.practiceAreaInterest}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unspecified</span>
                  )}
                </div>
              </div>

              {detailsModal.resourceId && (
                <div className="pt-4 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Resource download
                  </p>
                  <p className="text-sm font-mono break-all">{detailsModal.resourceId}</p>
                </div>
              )}

              {detailsModal.message && (
                <div className="pt-4 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Initial Inquiry Message
                  </p>
                  <div className="bg-muted/50 p-3 rounded-md text-sm text-foreground whitespace-pre-wrap">
                    &quot;{detailsModal.message}&quot;
                  </div>
                </div>
              )}

              {detailsModal.convertedClientId ? (
                <div className="pt-4 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Converted client
                  </p>
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <Link
                      href={`${clientsPath}?client=${encodeURIComponent(detailsModal.convertedClientId)}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in Clients
                    </Link>
                  </Button>
                </div>
              ) : null}

              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Consultations
                  </p>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                    <Link href={appointmentsPath}>Open appointments</Link>
                  </Button>
                </div>
                {relatedAppointments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No linked appointments yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {relatedAppointments.map(
                      (a: {
                        id?: string;
                        _id?: string;
                        date?: string;
                        timeSlot?: string;
                        status?: string;
                        practiceArea?: string;
                      }) => (
                        <li
                          key={a.id || a._id}
                          className="rounded-md border border-border px-3 py-2 text-xs space-y-0.5"
                        >
                          <p className="font-medium text-foreground tabular-nums">
                            <DualDateDisplay isoDate={a.date ?? ""} /> · {a.timeSlot}
                          </p>
                          <p className="text-muted-foreground capitalize">
                            {a.status}
                            {a.practiceArea ? ` · ${a.practiceArea}` : ""}
                          </p>
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </div>

              <div className="pt-4 border-t border-border space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Pipeline Status
                  </p>
                  <Select
                    value={detailsModal.status}
                    onValueChange={(val) => handleStatusChange(leadKey(detailsModal), val)}
                    disabled={detailsModal.status === "converted"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key} disabled={key === "converted"}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!selfScoped ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Assigned Staff
                    </p>
                    <Select
                      value={detailsModal.assignedTo || "unassigned"}
                      onValueChange={(val) => handleAssigneeChange(leadKey(detailsModal), val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {staffUsers.map((u) => (
                          <SelectItem key={u.id || u._id} value={String(u.id || u._id)}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Internal Notes
                  </p>
                  <Textarea
                    placeholder="Add internal notes about this lead..."
                    className="resize-none h-24"
                    value={detailsModal.notes || ""}
                    onChange={(e) =>
                      setDetailsModal((prev) => (prev ? { ...prev, notes: e.target.value } : prev))
                    }
                  />
                  <div className="flex justify-end mt-2">
                    <Button size="sm" onClick={handleSaveNotes} disabled={savingDetails}>
                      {savingDetails ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      Save Notes
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/10 space-y-2">
              {detailsModal.status !== "converted" && detailsModal.status !== "lost" && (
                <>
                  <Button
                    className="w-full gap-2"
                    variant="secondary"
                    onClick={() => openSchedule(detailsModal)}
                  >
                    <Calendar className="w-4 h-4" />
                    Schedule consultation
                  </Button>
                  <Button
                    className="w-full gap-2"
                    variant="outline"
                    onClick={() => handleGenerateLink(leadKey(detailsModal))}
                  >
                    <LinkIcon className="w-4 h-4" />
                    {detailsModal.intakeToken
                      ? "Copy Existing Intake Link"
                      : "Generate Client Intake Link"}
                  </Button>
                  {canManageCrm ? (
                    <Button
                      className="w-full gap-2"
                      onClick={() =>
                        setConvertModal({
                          leadId: leadKey(detailsModal),
                          leadName: detailsModal.fullName,
                          email: detailsModal.email ?? undefined,
                          phone: detailsModal.phone ?? undefined,
                        })
                      }
                    >
                      <UserPlus className="w-4 h-4" /> Convert to Client Record
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {scheduleOpen && detailsModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleScheduleSubmit}
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-foreground">
                Schedule consultation
              </h3>
              <button
                type="button"
                onClick={() => setScheduleOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Book for{" "}
              <span className="font-semibold text-foreground">{detailsModal.fullName}</span>. Lead
              status becomes consult scheduled. Calendar stays on Appointments.
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="crm-sched-phone">Phone</Label>
                <Input
                  id="crm-sched-phone"
                  className="mt-1"
                  required
                  value={scheduleForm.clientPhone}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, clientPhone: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="crm-sched-pa">Practice area</Label>
                <Input
                  id="crm-sched-pa"
                  className="mt-1"
                  value={scheduleForm.practiceArea}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, practiceArea: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="crm-sched-date">Date</Label>
                  <Input
                    id="crm-sched-date"
                    type="date"
                    className="mt-1"
                    required
                    value={scheduleForm.date}
                    onChange={(e) =>
                      setScheduleForm((f) => ({ ...f, date: e.target.value, timeSlot: "" }))
                    }
                  />
                </div>
                <div>
                  <Label>Time slot</Label>
                  <Select
                    value={scheduleForm.timeSlot || undefined}
                    onValueChange={(v) => setScheduleForm((f) => ({ ...f, timeSlot: v }))}
                    disabled={!scheduleForm.date}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue
                        placeholder={scheduleForm.date ? "Select slot" : "Pick date first"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(availableSlots.length > 0 ? availableSlots : []).map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {scheduleForm.date && availableSlots.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      No free slots this day.
                    </p>
                  ) : null}
                </div>
              </div>
              <div>
                <Label>Lawyer</Label>
                <Select
                  value={scheduleForm.assignedLawyerId}
                  onValueChange={(v) =>
                    setScheduleForm((f) => ({ ...f, assignedLawyerId: v, timeSlot: "" }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {staffUsers.map((u) => (
                      <SelectItem key={u.id || u._id} value={String(u.id || u._id)}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="crm-sched-notes">Notes</Label>
                <Textarea
                  id="crm-sched-notes"
                  className="mt-1 resize-none h-16"
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setScheduleOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 gap-1" disabled={scheduling}>
                {scheduling ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Calendar className="w-3 h-3" />
                )}
                Book &amp; open calendar
              </Button>
            </div>
          </form>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddLead}
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-foreground">Add lead</h3>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="crm-add-name">Full name</Label>
                <Input
                  id="crm-add-name"
                  className="mt-1"
                  required
                  value={addForm.fullName}
                  onChange={(e) => setAddForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="crm-add-phone">Phone</Label>
                  <Input
                    id="crm-add-phone"
                    className="mt-1"
                    value={addForm.phone}
                    onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="crm-add-email">Email</Label>
                  <Input
                    id="crm-add-email"
                    type="email"
                    className="mt-1"
                    value={addForm.email}
                    onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Source</Label>
                  <Select
                    value={addForm.source}
                    onValueChange={(v) =>
                      setAddForm((f) => ({ ...f, source: v as LeadCreateInput["source"] }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {SOURCE_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!selfScoped ? (
                  <div>
                    <Label>Assignee</Label>
                    <Select
                      value={addForm.assignedTo}
                      onValueChange={(v) => setAddForm((f) => ({ ...f, assignedTo: v }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {staffUsers.map((u) => (
                          <SelectItem key={u.id || u._id} value={String(u.id || u._id)}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
              <div>
                <Label htmlFor="crm-add-pa">Practice area</Label>
                <Select
                  value={addForm.practiceAreaInterest || "__none__"}
                  onValueChange={(value) =>
                    setAddForm((f) => ({
                      ...f,
                      practiceAreaInterest: value === "__none__" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger id="crm-add-pa" className="mt-1">
                    <SelectValue placeholder="Select practice area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {practiceAreaTitles.map((title) => (
                      <SelectItem key={title} value={title}>
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="crm-add-msg">Inquiry / message</Label>
                <Textarea
                  id="crm-add-msg"
                  className="mt-1 resize-none h-20"
                  value={addForm.message}
                  onChange={(e) => setAddForm((f) => ({ ...f, message: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="crm-add-notes">Internal notes</Label>
                <Textarea
                  id="crm-add-notes"
                  className="mt-1 resize-none h-16"
                  value={addForm.notes}
                  onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 gap-1" disabled={adding}>
                {adding ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                Create lead
              </Button>
            </div>
          </form>
        </div>
      )}

      {convertModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-foreground">Convert to Client</h3>
              <button
                type="button"
                onClick={() => setConvertModal(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Creating a client record for{" "}
              <span className="font-semibold text-foreground">
                &quot;{convertModal.leadName}&quot;
              </span>
              .
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Client Type
                </label>
                <Select
                  value={convertType}
                  onValueChange={(v) => setConvertType(v as "individual" | "corporate")}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {convertType === "corporate" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Company Name
                  </label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. Himalaya Trading Pvt. Ltd."
                    value={convertCompany}
                    onChange={(e) => setConvertCompany(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setConvertModal(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 gap-1"
                onClick={handleConvertSubmit}
                disabled={converting || confirmBusy}
              >
                {converting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <UserPlus className="w-3 h-3" />
                )}
                Confirm Convert
              </Button>
            </div>
          </div>
        </div>
      )}

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
