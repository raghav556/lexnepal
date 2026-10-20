"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { ApiClientError } from "@/client/api/errors";
import { usePracticeAreas } from "@/client/queries/cms";
import { useStaffDirectory } from "@/client/queries/identity";
import { useStaffAppointmentCreate, useAvailableSlots, useLeadCommands } from "@/client/queries/crm";
import { queryKeys } from "@/client/queries/query-keys";
import {
  DashboardButton,
  DualDateDisplay,
  EmptyState,
  PortalPageShell,
  StatusBadge,
  usePortalBranding,
} from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePagination } from "@/hooks/use-pagination";
import { downloadCsv } from "@/lib/csv-download";
import { getDashboardStatusTone } from "@/lib/dashboard-semantics";
import type { LeadCreateInput } from "@/shared/contracts/crm";
import {
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  LEAD_TABS,
  type StaffAppointment,
  type StaffLead,
  buildStaffLeadCreatePayload,
  filterStaffLeads,
  leadCsvRows,
  leadInitials,
  leadKey,
  leadKpis,
  leadSourceLabel,
  leadStatusLabel,
} from "@/views/staff/staff-crm-model";
import { CalendarClock, Download, Plus, Search, UserRound, Users } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 8;

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError && error.status === 401) return "Your session expired. Sign in again.";
  if (error instanceof ApiClientError && error.details && typeof error.details === "object") {
    const fieldErrors = (error.details as { fieldErrors?: Record<string, string[]> }).fieldErrors;
    const match = fieldErrors
      ? Object.entries(fieldErrors).find(([, messages]) => Array.isArray(messages) && messages.length > 0)
      : undefined;
    if (match) {
      const labels: Record<string, string> = {
        fullName: "Full name",
        email: "Email",
        phone: "Phone",
        practiceAreaInterest: "Practice area",
        message: "Message",
        source: "Source",
        assignedTo: "Assignee",
        notes: "Internal notes",
      };
      return `${labels[match[0]] ?? match[0]}: ${match[1][0]}`;
    }
  }
  return error instanceof Error ? error.message : fallback;
}

export default function StaffCRMPage() {
  const router = useRouter();
  const me = useCurrentUser();
  const meId = me?.id ?? me?._id ?? "";
  const { heroImageUrl } = usePortalBranding();
  const capabilitiesQuery = useQuery({
    queryKey: queryKeys.identity.sessionCapabilities,
    queryFn: async ({ signal }) => {
      const data = await apiClient.request<{ capabilities: string[] }>("/api/v1/auth/session", { signal });
      return data.capabilities ?? [];
    },
    staleTime: 60_000,
  });
  const canManageCrm = (capabilitiesQuery.data ?? []).includes("clients.manage");
  const selfScoped = capabilitiesQuery.isSuccess && !canManageCrm;
  const directory = useStaffDirectory() ?? [];
  const staffUsers = directory.filter((user) => user.role !== "client");
  const practiceAreas = usePracticeAreas({}, "public") || [];
  const practiceTitles = practiceAreas
    .filter((area: { isActive?: boolean }) => area.isActive !== false)
    .map((area: { title?: string }) => String(area.title ?? "").trim())
    .filter(Boolean);

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [tab, setTab] = useState("all");
  const [source, setSource] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [practiceArea, setPracticeArea] = useState("all");
  const [details, setDetails] = useState<StaffLead | null>(null);
  const [detailsMode, setDetailsMode] = useState<"view" | "edit">("view");
  const [notesBaseline, setNotesBaseline] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const addingLock = useRef(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmDialogState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertType, setConvertType] = useState<"individual" | "corporate">("individual");
  const [convertCompany, setConvertCompany] = useState("");
  const [converting, setConverting] = useState(false);
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
  const [scheduleForm, setScheduleForm] = useState({
    date: "",
    timeSlot: "",
    practiceArea: "Consultation",
    assignedLawyerId: "unassigned",
    notes: "",
    clientPhone: "",
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchDebounced(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const listQuery = useMemo(
    () => ({
      q: searchDebounced || undefined,
      source: source !== "all" ? source : undefined,
      assignedTo:
        selfScoped && meId
          ? meId
          : assignee !== "all" && assignee !== "unassigned"
            ? assignee
            : undefined,
    }),
    [searchDebounced, source, assignee, selfScoped, meId],
  );
  const leadsQuery = useQuery({
    queryKey: queryKeys.crm.leads(listQuery),
    queryFn: ({ signal }) => apiClient.request<StaffLead[]>("/api/v1/leads", { query: listQuery, signal }),
    enabled: capabilitiesQuery.isSuccess,
  });
  const leads = leadsQuery.data ?? [];
  const visible = useMemo(
    () =>
      filterStaffLeads(leads, {
        tab,
        practiceArea,
        unassignedOnly: !selfScoped && assignee === "unassigned",
      }),
    [leads, tab, practiceArea, assignee, selfScoped],
  );
  const kpis = leadKpis(leads);
  const { paginatedItems, currentPage, totalPages, totalItems, goToPage, nextPage, prevPage, resetPagination } =
    usePagination(visible, PAGE_SIZE);
  const filterKey = `${tab}|${searchDebounced}|${source}|${assignee}|${practiceArea}`;
  const [seenFilter, setSeenFilter] = useState(filterKey);
  if (seenFilter !== filterKey) {
    setSeenFilter(filterKey);
    resetPagination();
  }

  const detailId = details ? leadKey(details) : "";
  const appointmentsQuery = useQuery({
    queryKey: queryKeys.crm.appointments({ leadId: detailId }),
    queryFn: ({ signal }) =>
      apiClient.request<StaffAppointment[]>("/api/v1/appointments", { query: { leadId: detailId }, signal }),
    enabled: Boolean(detailId),
  });
  const scheduleLawyerId =
    scheduleForm.assignedLawyerId !== "unassigned" ? scheduleForm.assignedLawyerId : undefined;
  const slotsQuery = useAvailableSlots(
    scheduleOpen && scheduleForm.date ? scheduleForm.date : undefined,
    scheduleLawyerId,
  );
  const { createLead, updateLead, convertToClient, generateIntakeLink } = useLeadCommands();
  const createAppointment = useStaffAppointmentCreate();

  const staffName = (id?: string | null) => {
    if (!id) return "Unassigned";
    return staffUsers.find((user) => (user.id || user._id) === id)?.name || "Assigned";
  };
  const notesDirty = Boolean(details && (details.notes ?? "") !== notesBaseline);

  useEffect(() => {
    if (!notesDirty && !addOpen) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [notesDirty, addOpen]);

  const openDetails = (lead: StaffLead, mode: "view" | "edit") => {
    setDetails(lead);
    setDetailsMode(mode);
    setNotesBaseline(lead.notes ?? "");
    setScheduleOpen(false);
    setConvertOpen(false);
  };
  const detailsReadOnly = detailsMode === "view";
  const closeDetails = () => {
    if (notesDirty && !window.confirm("Discard unsaved notes?")) return;
    setDetails(null);
    setScheduleOpen(false);
    setConvertOpen(false);
  };

  const saveNotes = async () => {
    if (!details) return;
    setSavingNotes(true);
    try {
      await updateLead.mutateAsync({ leadId: leadKey(details), notes: details.notes ?? "" });
      setNotesBaseline(details.notes ?? "");
      toast.success("Notes saved.");
    } catch (error) {
      toast.error(errorMessage(error, "Failed to save notes."));
    } finally {
      setSavingNotes(false);
    }
  };

  const changeStatus = async (lead: StaffLead, status: string) => {
    const apply = async () => {
      await updateLead.mutateAsync({ leadId: leadKey(lead), status });
      toast.success("Lead status updated.");
      setDetails((current) => (current && leadKey(current) === leadKey(lead) ? { ...current, status } : current));
    };
    if (status === "lost") {
      setConfirm({
        title: "Mark lead as lost?",
        description: `Mark "${lead.fullName}" as lost? The lead stays in the Lost tab.`,
        confirmLabel: "Mark lost",
        destructive: true,
        onConfirm: async () => {
          setConfirmBusy(true);
          try {
            await apply();
          } catch (error) {
            toast.error(errorMessage(error, "Failed to update status."));
          } finally {
            setConfirmBusy(false);
            setConfirm(null);
          }
        },
      });
      return;
    }
    try {
      await apply();
    } catch (error) {
      toast.error(errorMessage(error, "Failed to update status."));
    }
  };

  const changeAssignee = async (lead: StaffLead, assignedTo: string) => {
    try {
      const next = assignedTo === "unassigned" ? null : assignedTo;
      await updateLead.mutateAsync({ leadId: leadKey(lead), assignedTo: next });
      toast.success("Lead assignment updated.");
      setDetails((current) => (current && leadKey(current) === leadKey(lead) ? { ...current, assignedTo: next } : current));
    } catch (error) {
      toast.error(errorMessage(error, "Failed to update assignment."));
    }
  };

  const copyIntakeLink = async (lead: StaffLead) => {
    try {
      const token = await generateIntakeLink.mutateAsync({ leadId: leadKey(lead) });
      await navigator.clipboard.writeText(`${window.location.origin}/intake/${token}`);
      toast.success("Intake link copied.");
    } catch (error) {
      toast.error(errorMessage(error, "Failed to generate the intake link."));
    }
  };

  const submitLead = async (event: React.FormEvent) => {
    event.preventDefault();
    if (addingLock.current) return;
    const built = buildStaffLeadCreatePayload(addForm, { canAssign: canManageCrm });
    if (!built.ok) {
      toast.error(built.message);
      return;
    }
    if (addForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email.trim())) {
      toast.error("Enter a valid email address, or leave it blank.");
      return;
    }
    addingLock.current = true;
    setAdding(true);
    try {
      await createLead.mutateAsync(built.payload);
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
    } catch (error) {
      toast.error(errorMessage(error, "Failed to create lead."));
    } finally {
      addingLock.current = false;
      setAdding(false);
    }
  };

  const openSchedule = () => {
    if (!details) return;
    setScheduleForm({
      date: "",
      timeSlot: "",
      practiceArea: details.practiceAreaInterest?.trim() || "Consultation",
      assignedLawyerId: details.assignedTo || "unassigned",
      notes: "",
      clientPhone: details.phone?.trim() || "",
    });
    setScheduleOpen(true);
  };

  const submitSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!details) return;
    if (!scheduleForm.clientPhone.trim()) {
      toast.error("Phone is required to book a consultation.");
      return;
    }
    if (!scheduleForm.date || !scheduleForm.timeSlot) {
      toast.error("Choose a date and an available time.");
      return;
    }
    setScheduling(true);
    try {
      const created = (await createAppointment.mutateAsync({
        clientName: details.fullName,
        clientEmail: details.email || undefined,
        clientPhone: scheduleForm.clientPhone.trim(),
        leadId: leadKey(details),
        practiceArea: scheduleForm.practiceArea.trim() || "Consultation",
        date: scheduleForm.date,
        timeSlot: scheduleForm.timeSlot,
        notes: scheduleForm.notes.trim() || undefined,
        assignedLawyerId: scheduleForm.assignedLawyerId === "unassigned" ? undefined : scheduleForm.assignedLawyerId,
      })) as { id?: string; _id?: string } | undefined;
      toast.success("Consultation scheduled.");
      setScheduleOpen(false);
      setDetails((current) => (current ? { ...current, status: "consultation_scheduled" } : current));
      const appointmentId = created?.id ?? created?._id;
      router.push(
        appointmentId
          ? `/staff/appointments?appointment=${encodeURIComponent(appointmentId)}`
          : "/staff/appointments",
      );
    } catch (error) {
      toast.error(errorMessage(error, "Failed to schedule consultation."));
    } finally {
      setScheduling(false);
    }
  };

  const submitConvert = async () => {
    if (!details || !canManageCrm) return;
    if (convertType === "corporate" && !convertCompany.trim()) {
      toast.error("Company name is required for a corporate client.");
      return;
    }
    setConfirm({
      title: "Convert this lead to a client?",
      description: `Create a ${convertType} client for "${details.fullName}" and mark the lead converted.`,
      confirmLabel: "Convert",
      onConfirm: async () => {
        setConfirmBusy(true);
        setConverting(true);
        try {
          const result = (await convertToClient.mutateAsync({
            leadId: leadKey(details),
            type: convertType,
            companyName: convertType === "corporate" ? convertCompany.trim() : undefined,
          })) as { clientId?: string; _id?: string };
          toast.success("Lead converted to a client.");
          setConvertOpen(false);
          setDetails(null);
          const clientId = result.clientId ?? result._id;
          router.push(clientId ? `/staff/clients?client=${encodeURIComponent(clientId)}` : "/staff/clients");
        } catch (error) {
          toast.error(errorMessage(error, "Conversion failed."));
        } finally {
          setConverting(false);
          setConfirmBusy(false);
          setConfirm(null);
        }
      },
    });
  };

  const exportVisible = () => {
    downloadCsv(
      `staff-crm-leads-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Email", "Phone", "Status", "Source", "Practice area", "Assignee", "Updated", "Intake", "Converted client"],
      leadCsvRows(visible, staffName),
    );
    toast.success(`Exported ${visible.length} lead${visible.length === 1 ? "" : "s"}.`);
  };

  const loading = capabilitiesQuery.isLoading || (capabilitiesQuery.isSuccess && leadsQuery.isLoading && !leadsQuery.data);
  const start = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, totalItems);

  return (
    <PortalPageShell
      portal="staff"
      eyebrow="Client relations"
      title="Client Relationship Management"
      description={
        selfScoped
          ? "Leads assigned to you, with their stage, source, and consultations."
          : "Leads for this firm, with their stage, assignee, source, and consultations."
      }
      icon={Users}
      className="staff-crm-workspace"
      heroClassName="staff-crm-hero"
      metricsClassName="staff-crm-metrics"
      loading={loading}
      loadingLabel="Loading leads…"
      metrics={[
        { label: "Total leads", value: String(kpis.total), icon: Users, tone: "information", helperText: "Matching the current search" },
        { label: "New leads", value: String(kpis.fresh), icon: UserRound, tone: "neutral", helperText: "Status is new" },
        { label: "Consultations", value: String(kpis.consultations), icon: CalendarClock, tone: "warning", helperText: "Consultation scheduled" },
        { label: "Converted", value: String(kpis.converted), icon: Users, tone: "success", helperText: "Already a client record" },
      ]}
      heroChildren={
        <div
          aria-hidden
          className="staff-crm-hero-art"
          style={
            heroImageUrl
              ? { backgroundImage: `url(${JSON.stringify(heroImageUrl)}), url("/images/staff-home-nepal.jpg")` }
              : undefined
          }
        />
      }
    >
      <section className="staff-crm-library">
        <div className="staff-crm-library-head">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList aria-label="Lead stages">
              {LEAD_TABS.map((item) => (
                <TabsTrigger key={item.value} value={item.value}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <DashboardButton size="sm" variant="primary" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5" aria-hidden />
            New lead
          </DashboardButton>
        </div>
        <div className="staff-crm-filters">
          <div className="staff-crm-search">
            <Search aria-hidden />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, or phone…"
              aria-label="Search leads"
            />
          </div>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger aria-label="Filter by source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {LEAD_SOURCE_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selfScoped ? null : (
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger aria-label="Filter by assignee">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignees</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staffUsers.map((user) => (
                  <SelectItem key={user.id || user._id} value={user.id || user._id}>
                    {user.name || user.email || "Staff"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={practiceArea} onValueChange={setPracticeArea}>
            <SelectTrigger aria-label="Filter by practice area">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All practice areas</SelectItem>
              {practiceTitles.map((title: string) => (
                <SelectItem key={title} value={title}>
                  {title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={exportVisible} disabled={visible.length === 0}>
            <Download className="size-3.5" aria-hidden />
            Export CSV
          </Button>
        </div>
        {leadsQuery.isError ? (
          <p className="staff-crm-message" role="alert">
            {errorMessage(leadsQuery.error, "Leads could not be loaded.")}
          </p>
        ) : visible.length === 0 ? (
          <EmptyState title="No leads" description="No leads match these filters." icon={Users} />
        ) : (
          <div className="staff-crm-table" role="table" aria-label="Leads">
            <div className="staff-crm-table-head" role="row">
              <span>Lead</span>
              <span>Practice area</span>
              <span>Stage</span>
              <span>Assigned to</span>
              <span>Updated</span>
              <span>Source</span>
              <span>Actions</span>
            </div>
            <ul className="staff-crm-rows">
              {paginatedItems.map((lead) => (
                <li className="staff-crm-row" role="row" key={leadKey(lead)}>
                  <div className="staff-crm-person">
                    <span aria-hidden>{leadInitials(lead.fullName)}</span>
                    <div>
                      <strong>{lead.fullName}</strong>
                      <small>{[lead.email, lead.phone].filter(Boolean).join(" · ") || "No contact details"}</small>
                    </div>
                  </div>
                  <span>{lead.practiceAreaInterest || "—"}</span>
                  <StatusBadge tone={getDashboardStatusTone(lead.status)}>{leadStatusLabel(lead.status)}</StatusBadge>
                  <span>{staffName(lead.assignedTo)}</span>
                  <DualDateDisplay isoDate={lead.updatedAt || lead.createdAt || undefined} />
                  <span>{leadSourceLabel(lead.source)}</span>
                  <div className="staff-crm-actions">
                    <Button type="button" variant="outline" size="sm" onClick={() => openDetails(lead, "view")}>
                      View
                    </Button>
                    <Button type="button" size="sm" onClick={() => openDetails(lead, "edit")}>
                      Edit
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="staff-crm-pagination">
          <p className="staff-crm-page-status">
            Showing {start}–{end} of {totalItems} leads
          </p>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            onNextPage={nextPage}
            onPrevPage={prevPage}
            ariaLabel="Lead pages"
          />
        </div>
      </section>

      <Dialog open={Boolean(details) && !scheduleOpen} onOpenChange={(open) => { if (!open) closeDetails(); }}>
        <DialogContent className="staff-crm-dialog" aria-label="Lead details">
          {details ? (
            <>
              <DialogHeader>
                <DialogTitle>{details.fullName}</DialogTitle>
                <DialogDescription>
                  {detailsReadOnly
                    ? "Read-only lead details."
                    : "Update the stage, notes, and consultation for this lead."}
                </DialogDescription>
              </DialogHeader>
              <div className="staff-crm-detail-grid">
                <p><strong>Email</strong><span>{details.email || "—"}</span></p>
                <p><strong>Phone</strong><span>{details.phone || "—"}</span></p>
                <p><strong>Practice area</strong><span>{details.practiceAreaInterest || "—"}</span></p>
                <p><strong>Source</strong><span>{leadSourceLabel(details.source)}</span></p>
              </div>
              {details.message ? <p className="staff-crm-message-box">{details.message}</p> : null}
              <Label>Stage</Label>
              <Select value={details.status} onValueChange={(status) => void changeStatus(details, status)} disabled={detailsReadOnly}>
                <SelectTrigger aria-label="Lead stage" disabled={detailsReadOnly}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUS_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canManageCrm ? (
                <>
                  <Label>Assignee</Label>
                  <Select
                    value={details.assignedTo || "unassigned"}
                    onValueChange={(value) => void changeAssignee(details, value)}
                    disabled={detailsReadOnly}
                  >
                    <SelectTrigger aria-label="Assignee" disabled={detailsReadOnly}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {staffUsers.map((user) => (
                        <SelectItem key={user.id || user._id} value={user.id || user._id}>
                          {user.name || user.email || "Staff"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <p className="staff-crm-hint">Assigned to {staffName(details.assignedTo)}. Reassignment stays with a CRM manager.</p>
              )}
              <Label htmlFor="staff-crm-notes">Internal notes</Label>
              <Textarea
                id="staff-crm-notes"
                value={details.notes || ""}
                readOnly={detailsReadOnly}
                onChange={(event) => setDetails((current) => (current ? { ...current, notes: event.target.value } : current))}
              />
              {detailsReadOnly ? null : (
              <div className="staff-crm-actions">
                <Button type="button" onClick={() => void saveNotes()} disabled={savingNotes || !notesDirty}>
                  {savingNotes ? "Saving…" : "Save notes"}
                </Button>
                <Button type="button" variant="outline" onClick={openSchedule}>Schedule consultation</Button>
                <Button type="button" variant="outline" onClick={() => void copyIntakeLink(details)}>
                  {details.intakeToken ? "Copy new intake link" : "Copy intake link"}
                </Button>
                {details.intakeSubmitted ? <span className="staff-crm-hint">Intake submitted</span> : null}
              </div>
              )}
              <div>
                <strong>Consultations</strong>
                {appointmentsQuery.isLoading ? <p className="staff-crm-hint">Loading consultations…</p> : null}
                {appointmentsQuery.isError ? <p className="staff-crm-hint">Consultations could not be loaded.</p> : null}
                {(appointmentsQuery.data ?? []).length === 0 && appointmentsQuery.isSuccess ? (
                  <p className="staff-crm-hint">No consultation is linked to this lead.</p>
                ) : (
                  <ul className="staff-crm-appointments">
                    {(appointmentsQuery.data ?? []).map((appointment) => {
                      const id = appointment.id ?? appointment._id ?? appointment.date;
                      return (
                        <li key={String(id)}>
                          <span>{appointment.date} · {appointment.timeSlot}</span>
                          <StatusBadge tone={getDashboardStatusTone(appointment.status)}>{appointment.status || "Scheduled"}</StatusBadge>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/staff/appointments?appointment=${encodeURIComponent(String(appointment.id ?? appointment._id ?? ""))}`)}
                          >
                            Open
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {canManageCrm && !detailsReadOnly && details.status !== "converted" ? (
                <Button type="button" onClick={() => setConvertOpen(true)}>Convert to client</Button>
              ) : null}
              {details.convertedClientId ? (
                <Button type="button" variant="outline" onClick={() => router.push(`/staff/clients?client=${encodeURIComponent(details.convertedClientId!)}`)}>
                  Open client
                </Button>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent aria-label="Convert lead">
          <DialogHeader>
            <DialogTitle>Convert to client</DialogTitle>
            <DialogDescription>Uses the existing conversion permission. Staff without it cannot convert.</DialogDescription>
          </DialogHeader>
          <Label>Client type</Label>
          <Select value={convertType} onValueChange={(value) => setConvertType(value as "individual" | "corporate")}>
            <SelectTrigger aria-label="Client type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
            </SelectContent>
          </Select>
          {convertType === "corporate" ? (
            <>
              <Label htmlFor="staff-crm-company">Company name</Label>
              <Input id="staff-crm-company" value={convertCompany} onChange={(event) => setConvertCompany(event.target.value)} />
            </>
          ) : null}
          <div className="staff-crm-actions">
            <Button type="button" variant="outline" onClick={() => setConvertOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void submitConvert()} disabled={converting}>Convert</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent aria-label="Schedule consultation">
          <DialogHeader>
            <DialogTitle>Schedule consultation</DialogTitle>
            <DialogDescription>{details ? `Book a consultation for ${details.fullName}.` : "Book a consultation."}</DialogDescription>
          </DialogHeader>
          <form className="staff-crm-form" onSubmit={(event) => void submitSchedule(event)}>
            <Label htmlFor="staff-crm-phone">Phone</Label>
            <Input id="staff-crm-phone" required value={scheduleForm.clientPhone} onChange={(event) => setScheduleForm((form) => ({ ...form, clientPhone: event.target.value }))} />
            <Label htmlFor="staff-crm-area">Practice area</Label>
            <Input id="staff-crm-area" value={scheduleForm.practiceArea} onChange={(event) => setScheduleForm((form) => ({ ...form, practiceArea: event.target.value }))} />
            <Label htmlFor="staff-crm-date">Date</Label>
            <Input id="staff-crm-date" type="date" required value={scheduleForm.date} onChange={(event) => setScheduleForm((form) => ({ ...form, date: event.target.value, timeSlot: "" }))} />
            <Label>Time</Label>
            <Select value={scheduleForm.timeSlot || undefined} onValueChange={(timeSlot) => setScheduleForm((form) => ({ ...form, timeSlot }))} disabled={!scheduleForm.date || slotsQuery.isLoading}>
              <SelectTrigger aria-label="Available time"><SelectValue placeholder={slotsQuery.isLoading ? "Loading times…" : "Choose a time"} /></SelectTrigger>
              <SelectContent>
                {slotsQuery.data.map((slot) => (
                  <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {scheduleForm.date && !slotsQuery.isLoading && !slotsQuery.isError && slotsQuery.data.length === 0 ? (
              <p className="staff-crm-hint">No open times on this date.</p>
            ) : null}
            {canManageCrm ? (
              <>
                <Label>Lawyer</Label>
                <Select value={scheduleForm.assignedLawyerId} onValueChange={(assignedLawyerId) => setScheduleForm((form) => ({ ...form, assignedLawyerId, timeSlot: "" }))}>
                  <SelectTrigger aria-label="Consultation lawyer"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {staffUsers.map((user) => (
                      <SelectItem key={user.id || user._id} value={user.id || user._id}>{user.name || "Staff"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : null}
            <Label htmlFor="staff-crm-schedule-notes">Notes</Label>
            <Textarea id="staff-crm-schedule-notes" value={scheduleForm.notes} onChange={(event) => setScheduleForm((form) => ({ ...form, notes: event.target.value }))} />
            <div className="staff-crm-actions">
              <Button type="button" variant="outline" onClick={() => setScheduleOpen(false)} disabled={scheduling}>Cancel</Button>
              <Button type="submit" disabled={scheduling}>{scheduling ? "Scheduling…" : "Schedule"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={(open) => { if (!adding) setAddOpen(open); }}>
        <DialogContent aria-label="New lead">
          <DialogHeader>
            <DialogTitle>New lead</DialogTitle>
            <DialogDescription>Create a lead with the existing CRM fields.</DialogDescription>
          </DialogHeader>
          <form className="staff-crm-form" onSubmit={(event) => void submitLead(event)}>
            <Label htmlFor="staff-crm-name">Full name</Label>
            <Input id="staff-crm-name" data-autofocus required value={addForm.fullName} onChange={(event) => setAddForm((form) => ({ ...form, fullName: event.target.value }))} />
            <Label htmlFor="staff-crm-email">Email</Label>
            <Input id="staff-crm-email" type="email" value={addForm.email} onChange={(event) => setAddForm((form) => ({ ...form, email: event.target.value }))} />
            <Label htmlFor="staff-crm-lead-phone">Phone</Label>
            <Input id="staff-crm-lead-phone" value={addForm.phone} onChange={(event) => setAddForm((form) => ({ ...form, phone: event.target.value }))} />
            <Label>Source</Label>
            <Select value={addForm.source} onValueChange={(value) => setAddForm((form) => ({ ...form, source: value as LeadCreateInput["source"] }))}>
              <SelectTrigger aria-label="Lead source"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_SOURCE_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Practice area</Label>
            <Select value={addForm.practiceAreaInterest || "none"} onValueChange={(value) => setAddForm((form) => ({ ...form, practiceAreaInterest: value === "none" ? "" : value }))}>
              <SelectTrigger aria-label="Practice area interest"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {practiceTitles.map((title: string) => (
                  <SelectItem key={title} value={title}>{title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selfScoped ? null : (
              <>
                <Label>Assignee</Label>
                <Select value={addForm.assignedTo} onValueChange={(assignedTo) => setAddForm((form) => ({ ...form, assignedTo }))}>
                  <SelectTrigger aria-label="New lead assignee"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {staffUsers.map((user) => (
                      <SelectItem key={user.id || user._id} value={user.id || user._id}>{user.name || "Staff"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            <Label htmlFor="staff-crm-add-notes">Internal notes</Label>
            <Textarea id="staff-crm-add-notes" value={addForm.notes} onChange={(event) => setAddForm((form) => ({ ...form, notes: event.target.value }))} />
            <Label htmlFor="staff-crm-message">Message</Label>
            <Textarea id="staff-crm-message" value={addForm.message} onChange={(event) => setAddForm((form) => ({ ...form, message: event.target.value }))} />
            <div className="staff-crm-actions">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>Cancel</Button>
              <Button type="submit" disabled={adding}>{adding ? "Creating…" : "Create lead"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog state={confirm} busy={confirmBusy} onOpenChange={(open) => { if (!open && !confirmBusy) setConfirm(null); }} />
    </PortalPageShell>
  );
}
