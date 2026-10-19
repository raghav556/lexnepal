"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type Ref } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { ApiClientError } from "@/client/api/errors";
import { useClientCommands, useKycFiles } from "@/client/queries/clients";
import { useCasesQuery } from "@/client/queries/cases";
import { queryKeys } from "@/client/queries/query-keys";
import {
  DashboardButton,
  EmptyState,
  MetricCard,
  PortalPageShell,
  StatusBadge,
  usePortalBranding,
} from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { usePagination } from "@/hooks/use-pagination";
import { downloadCsv } from "@/lib/csv-download";
import { inviteEmailQueuedMessage } from "@/lib/invite-copy";
import {
  CLIENT_CSV_HEADERS,
  CLIENT_KYC_OPTIONS,
  CLIENT_STATUS_CHIPS,
  activeMatterCounts,
  buildStaffClientCreatePayload,
  buildStaffClientUpdatePayload,
  clientCsvRows,
  clientInitials,
  clientIsActive,
  clientKey,
  clientKpis,
  clientKycLabel,
  clientPracticeAreas,
  emptyStaffClientForm,
  filterStaffClients,
  matterKey,
  mattersForClient,
  nextClientAppointment,
  staffClientForm,
  type StaffClient,
  type StaffClientAppointment,
  type StaffClientForm,
  type StaffClientMatter,
} from "@/views/staff/staff-clients-model";
import { Download, FolderOpen, Plus, Search, ShieldCheck, UserRound, Users, X } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 10;

const FIELD_LABELS: Record<string, string> = {
  fullName: "Full name",
  email: "Email",
  phone: "Phone",
  address: "Address",
  companyName: "Company name",
  registrationNumber: "Registration number",
  notes: "Internal notes",
  type: "Client type",
};

type FieldError = { field: string; message: string } | null;

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError && error.status === 401) return "Your session expired. Sign in again.";
  if (error instanceof ApiClientError && error.status === 403) return "You do not have permission for that client action.";
  if (error instanceof ApiClientError && error.details && typeof error.details === "object") {
    const fieldErrors = (error.details as { fieldErrors?: Record<string, string[]> }).fieldErrors;
    const match = fieldErrors
      ? Object.entries(fieldErrors).find(([, messages]) => Array.isArray(messages) && messages.length > 0)
      : undefined;
    if (match) return `${FIELD_LABELS[match[0]] ?? match[0]}: ${match[1][0]}`;
  }
  return error instanceof Error ? error.message : fallback;
}

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatAdded(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function StaffClientsWorkspace() {
  const searchParams = useSearchParams();
  const { heroImageUrl } = usePortalBranding();
  const capabilitiesQuery = useQuery({
    queryKey: queryKeys.identity.sessionCapabilities,
    queryFn: async ({ signal }) => {
      const data = await apiClient.request<{ capabilities: string[] }>("/api/v1/auth/session", { signal });
      return data.capabilities ?? [];
    },
    staleTime: 60_000,
  });
  const canManage = (capabilitiesQuery.data ?? []).includes("clients.manage");
  const canReviewKyc = (capabilitiesQuery.data ?? []).includes("kyc.review");
  const clientsQuery = useQuery({
    queryKey: queryKeys.clients.list,
    queryFn: ({ signal }) => apiClient.request<StaffClient[]>("/api/v1/clients", { signal }),
  });
  const casesQuery = useCasesQuery({});
  const clients = clientsQuery.data ?? [];
  const matters = (casesQuery.data ?? []) as StaffClientMatter[];
  const commands = useClientCommands();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof CLIENT_STATUS_CHIPS)[number]["value"]>("all");
  const [type, setType] = useState<"all" | "individual" | "corporate">("all");
  const [kyc, setKyc] = useState<"all" | StaffClient["kycStatus"]>("all");
  const [portal, setPortal] = useState<"all" | "linked" | "none">("all");
  const [practiceArea, setPracticeArea] = useState("all");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [profileTab, setProfileTab] = useState("overview");
  const [editForm, setEditForm] = useState<StaffClientForm>(emptyStaffClientForm);
  const [editBaseline, setEditBaseline] = useState("");
  const [editError, setEditError] = useState<FieldError>(null);
  const [saving, setSaving] = useState(false);
  const savingLock = useRef(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<StaffClientForm>(emptyStaffClientForm);
  const [createError, setCreateError] = useState<FieldError>(null);
  const [adding, setAdding] = useState(false);
  const addingLock = useRef(false);
  const [reviewClientId, setReviewClientId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmDialogState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [appliedLink, setAppliedLink] = useState<string | null>(null);
  const profileHeadingRef = useRef<HTMLHeadingElement>(null);
  const editNameRef = useRef<HTMLInputElement>(null);

  const filters = useMemo(
    () => ({ query: search, type, status, kyc, portal, practiceArea }),
    [search, type, status, kyc, portal, practiceArea],
  );
  const visible = useMemo(() => filterStaffClients(clients, matters, filters), [clients, matters, filters]);
  const kpis = clientKpis(clients, casesQuery.isSuccess ? matters : []);
  const practiceAreas = clientPracticeAreas(matters);
  const matterCounts = activeMatterCounts(casesQuery.isSuccess ? matters : []);
  const { paginatedItems, currentPage, totalPages, totalItems, goToPage, nextPage, prevPage, resetPagination } =
    usePagination(visible, PAGE_SIZE);
  const filterKey = `${search}|${type}|${status}|${kyc}|${portal}|${practiceArea}`;
  const [seenFilter, setSeenFilter] = useState(filterKey);
  if (seenFilter !== filterKey) {
    setSeenFilter(filterKey);
    resetPagination();
  }

  const profile = clients.find((client) => clientKey(client) === profileId) ?? null;
  const profileMatters = profile ? mattersForClient(matters, clientKey(profile)) : [];
  const dirty = mode === "edit" && JSON.stringify(editForm) !== editBaseline;
  const createDirty =
    createForm.type !== "individual" ||
    [createForm.fullName, createForm.email, createForm.phone, createForm.address, createForm.companyName, createForm.registrationNumber, createForm.notes].some(
      (value) => value.trim() !== "",
    );
  const appointmentsQuery = useQuery({
    queryKey: queryKeys.crm.appointments({ clientId: profileId }),
    queryFn: ({ signal }) =>
      apiClient.request<StaffClientAppointment[]>("/api/v1/appointments", {
        query: { clientId: profileId ?? undefined },
        signal,
      }),
    enabled: Boolean(profileId),
  });
  const upcoming = nextClientAppointment(appointmentsQuery.data ?? [], todayIso());
  const reviewClient = clients.find((client) => clientKey(client) === reviewClientId) ?? null;
  const kycFiles = useKycFiles(canReviewKyc ? reviewClientId : null);

  useEffect(() => {
    const linked = searchParams.get("client");
    if (!linked || appliedLink === linked || !clientsQuery.data) return;
    if (!clientsQuery.data.some((client) => clientKey(client) === linked)) return;
    setProfileId(linked);
    setMode("view");
    setAppliedLink(linked);
  }, [searchParams, clientsQuery.data, appliedLink]);

  useEffect(() => {
    if (!dirty && !(createOpen && createDirty)) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, createOpen, createDirty]);

  useEffect(() => {
    if (!profileId || mode !== "view") return;
    profileHeadingRef.current?.focus();
  }, [profileId, mode]);

  useEffect(() => {
    if (!profileId || mode !== "edit") return;
    editNameRef.current?.focus();
  }, [profileId, mode]);

  const guardDirty = () => !dirty || window.confirm("Discard unsaved client edits?");

  const openProfile = (client: StaffClient, nextMode: "view" | "edit") => {
    const id = clientKey(client);
    if (nextMode === "edit" && !canManage) return;
    if (id === profileId && nextMode === mode) return;
    if ((id !== profileId || (mode === "edit" && nextMode === "view")) && !guardDirty()) return;
    setProfileId(id);
    setProfileTab("overview");
    setEditError(null);
    if (nextMode === "edit") {
      const form = staffClientForm(client);
      setEditForm(form);
      setEditBaseline(JSON.stringify(form));
      setMode("edit");
      return;
    }
    setMode("view");
  };

  const closeProfile = () => {
    if (!guardDirty()) return;
    setProfileId(null);
    setMode("view");
    setEditError(null);
  };

  useEffect(() => {
    if (!profileId || createOpen || reviewClientId || confirm) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (!dirty || window.confirm("Discard unsaved client edits?")) {
        setProfileId(null);
        setMode("view");
        setEditError(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profileId, createOpen, reviewClientId, confirm, dirty]);

  const closeCreate = () => {
    if (createDirty && !window.confirm("Discard this new client?")) return;
    setCreateOpen(false);
    setCreateForm(emptyStaffClientForm());
    setCreateError(null);
  };

  const exportVisible = () => {
    downloadCsv(
      `staff-clients-${new Date().toISOString().slice(0, 10)}.csv`,
      [...CLIENT_CSV_HEADERS],
      clientCsvRows(visible, casesQuery.isSuccess ? matters : []),
    );
    toast.success(`Exported ${visible.length} client${visible.length === 1 ? "" : "s"}.`);
  };

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || addingLock.current) return;
    const built = buildStaffClientCreatePayload(createForm);
    if (!built.ok) {
      setCreateError(built);
      document.getElementById(`create-${built.field}`)?.focus();
      return;
    }
    addingLock.current = true;
    setAdding(true);
    setCreateError(null);
    try {
      await commands.create(built.payload);
      toast.success("Client added.");
      setCreateForm(emptyStaffClientForm());
      setCreateOpen(false);
    } catch (error) {
      setCreateError({ field: "form", message: errorMessage(error, "Failed to add the client.") });
    } finally {
      addingLock.current = false;
      setAdding(false);
    }
  };

  const submitEdit = async () => {
    if (!profile || !canManage || savingLock.current) return;
    const built = buildStaffClientUpdatePayload(editForm);
    if (!built.ok) {
      setEditError(built);
      document.getElementById(`edit-${built.field}`)?.focus();
      return;
    }
    savingLock.current = true;
    setSaving(true);
    setEditError(null);
    try {
      await commands.update(clientKey(profile), built.payload);
      toast.success("Client profile saved.");
      setEditBaseline(JSON.stringify(editForm));
      setMode("view");
    } catch (error) {
      setEditError({ field: "form", message: errorMessage(error, "Failed to save the client.") });
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  };

  const askToggleActive = (client: StaffClient) => {
    if (!canManage) return;
    const deactivating = clientIsActive(client);
    setConfirm({
      title: deactivating ? `Deactivate ${client.fullName}?` : `Reactivate ${client.fullName}?`,
      description: deactivating
        ? "They remain in the directory but cannot be assigned to new matters until reactivated."
        : "They can be assigned to matters again.",
      confirmLabel: deactivating ? "Deactivate" : "Reactivate",
      destructive: deactivating,
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await commands.update(clientKey(client), { isActive: !deactivating });
          toast.success(deactivating ? "Client deactivated." : "Client reactivated.");
        } catch (error) {
          toast.error(errorMessage(error, "Failed to update client status."));
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const askPortal = (client: StaffClient) => {
    if (!canManage) return;
    if (!client.email) {
      toast.error("Add an email on this client before granting portal access.");
      return;
    }
    setConfirm({
      title: client.userId ? `Resend portal email to ${client.email}?` : `Grant portal access to ${client.fullName}?`,
      description: client.userId
        ? "They will receive a setup or password-reset email for the client portal."
        : `Invite ${client.email} to the client portal. They will receive a setup email.`,
      confirmLabel: client.userId ? "Resend email" : "Grant access",
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          const result = await commands.grantPortalAccess(clientKey(client));
          if (result.alreadyLinked && !result.inviteSent) toast.success("Portal access already active for this client.");
          else if (result.alreadyLinked) toast.success(inviteEmailQueuedMessage("resent"));
          else toast.success(result.inviteSent ? inviteEmailQueuedMessage("setup") : "Portal access linked.");
        } catch (error) {
          toast.error(errorMessage(error, "Failed to grant portal access."));
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const submitReview = async (decision: "verified" | "rejected") => {
    if (!canReviewKyc || !reviewClientId || reviewing) return;
    if (decision === "rejected" && !rejectReason.trim()) {
      setReviewError("Enter a rejection reason.");
      return;
    }
    setReviewing(true);
    setReviewError("");
    try {
      await commands.reviewKyc(reviewClientId, decision, decision === "rejected" ? rejectReason.trim() : undefined);
      toast.success(decision === "verified" ? "KYC verified." : "KYC rejected; client notified.");
      setReviewClientId(null);
      setRejectReason("");
    } catch (error) {
      setReviewError(errorMessage(error, "Failed to review KYC."));
    } finally {
      setReviewing(false);
    }
  };

  const loading = clientsQuery.isLoading && !clientsQuery.data;
  const start = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, totalItems);
  const matterLabel = (id: string) => (casesQuery.isSuccess ? String(matterCounts.get(id) ?? 0) : "—");

  return (
    <PortalPageShell
      portal="staff"
      title="Clients"
      description="Client records for this firm, with contact details, KYC status, portal access, and linked matters."
      icon={Users}
      className="staff-clients-workspace"
      heroClassName="staff-clients-hero"
      loading={loading}
      loadingLabel="Loading clients…"
      heroChildren={
        <div
          aria-hidden
          className="staff-clients-hero-art"
          style={
            heroImageUrl
              ? { backgroundImage: `url(${JSON.stringify(heroImageUrl)}), url("/images/staff-home-nepal.jpg")` }
              : undefined
          }
        />
      }
    >
      <div className="staff-clients-stage" data-profile={profile ? "open" : "closed"}>
        <div className="staff-clients-main">
        <div className="staff-clients-metrics">
          <MetricCard label="Total clients" value={String(kpis.total)} icon={Users} tone="information" helperText="Records in this firm" />
          <MetricCard label="Active matters" value={casesQuery.isSuccess ? String(kpis.activeMatters) : "—"} icon={FolderOpen} tone="success" helperText="Visible matters with active status" />
          <MetricCard label="KYC pending" value={String(kpis.kycPending)} icon={ShieldCheck} tone="warning" helperText="Status is pending" />
          <MetricCard label="New this month" value={String(kpis.createdThisMonth)} icon={UserRound} tone="neutral" helperText="Created this calendar month" />
        </div>
        <section className="staff-clients-library" aria-busy={clientsQuery.isFetching}>
          <div className="staff-clients-toolbar">
            <div className="staff-clients-chips" role="group" aria-label="Client status">
              {CLIENT_STATUS_CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  aria-pressed={status === chip.value}
                  onClick={() => setStatus(chip.value)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <div className="staff-clients-toolbar-actions">
              {canManage ? (
                <DashboardButton size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" aria-hidden /> Add client
                </DashboardButton>
              ) : null}
              <DashboardButton size="sm" variant="outline" onClick={exportVisible} disabled={visible.length === 0}>
                <Download className="size-3.5" aria-hidden /> Export CSV
              </DashboardButton>
            </div>
          </div>
          <div className="staff-clients-filters">
            <div className="staff-clients-search">
              <Search aria-hidden />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, phone, or company…"
                aria-label="Search clients"
              />
            </div>
            <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
              <SelectTrigger aria-label="Filter by client type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="corporate">Corporate</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kyc} onValueChange={(value) => setKyc(value as typeof kyc)}>
              <SelectTrigger aria-label="Filter by KYC status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All KYC statuses</SelectItem>
                {CLIENT_KYC_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={portal} onValueChange={(value) => setPortal(value as typeof portal)}>
              <SelectTrigger aria-label="Filter by portal access">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All portal access</SelectItem>
                <SelectItem value="linked">Portal linked</SelectItem>
                <SelectItem value="none">No portal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={practiceArea} onValueChange={setPracticeArea}>
              <SelectTrigger aria-label="Filter by matter practice area">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All matter practice areas</SelectItem>
                {practiceAreas.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {clientsQuery.isError ? (
            <div className="staff-clients-message">
              <p>{errorMessage(clientsQuery.error, "Clients could not be loaded.")}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void clientsQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              title={clients.length === 0 ? "No clients yet" : "No clients match"}
              description={
                clients.length === 0
                  ? canManage
                    ? "Add a client to start the directory."
                    : "No client records are available."
                  : "Try a different search or status."
              }
              icon={Users}
              className="border-0"
            />
          ) : (
            <div className="staff-clients-table">
              <div className="staff-clients-table-head" aria-hidden>
                <span>Client</span>
                <span>Type</span>
                <span>KYC</span>
                <span>Portal</span>
                <span>Matters</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              <ul className="staff-clients-rows">
                {paginatedItems.map((client) => {
                  const id = clientKey(client);
                  return (
                    <li key={id}>
                      <article className="staff-clients-row" data-selected={profileId === id}>
                        <button type="button" className="staff-clients-person" onClick={() => openProfile(client, "view")}>
                          <span aria-hidden>{clientInitials(client.fullName)}</span>
                          <strong>{client.fullName}</strong>
                          <small>
                            {client.email || "No email"}
                            {client.phone ? ` · ${client.phone}` : ""}
                          </small>
                        </button>
                        <div className="staff-clients-cell">
                          <span className="staff-clients-field-label">Type</span>
                          <StatusBadge tone="neutral">{client.type === "corporate" ? "Corporate" : "Individual"}</StatusBadge>
                        </div>
                        <div className="staff-clients-cell">
                          <span className="staff-clients-field-label">KYC</span>
                          <StatusBadge
                            tone={
                              client.kycStatus === "verified"
                                ? "success"
                                : client.kycStatus === "rejected"
                                  ? "danger"
                                  : client.kycStatus === "submitted"
                                    ? "warning"
                                    : "neutral"
                            }
                          >
                            {clientKycLabel(client.kycStatus)}
                          </StatusBadge>
                        </div>
                        <div className="staff-clients-cell">
                          <span className="staff-clients-field-label">Portal</span>
                          <StatusBadge tone={client.userId ? "information" : "neutral"}>
                            {client.userId ? "Linked" : "No portal"}
                          </StatusBadge>
                        </div>
                        <div className="staff-clients-cell">
                          <span className="staff-clients-field-label">Active matters</span>
                          <span className="staff-clients-count">{matterLabel(id)}</span>
                        </div>
                        <div className="staff-clients-cell">
                          <span className="staff-clients-field-label">Status</span>
                          <StatusBadge tone={clientIsActive(client) ? "success" : "warning"}>
                            {clientIsActive(client) ? "Active" : "Inactive"}
                          </StatusBadge>
                        </div>
                        <div className="staff-clients-actions">
                          <Button type="button" variant="outline" size="sm" onClick={() => openProfile(client, "view")}>
                            View
                          </Button>
                          {canManage ? (
                            <Button type="button" variant="outline" size="sm" onClick={() => openProfile(client, "edit")}>
                              Edit
                            </Button>
                          ) : null}
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {casesQuery.isError ? <p className="staff-clients-message">Linked matters could not be loaded.</p> : null}
          <div className="staff-clients-pagination">
            <p className="staff-clients-page-status">
              {totalItems === 0 ? "Showing 0 clients" : `Showing ${start}–${end} of ${totalItems} clients`}
            </p>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              onNextPage={nextPage}
              onPrevPage={prevPage}
              ariaLabel="Client pages"
            />
          </div>
        </section>
        </div>

        {profile ? (
          <>
            <button type="button" className="staff-clients-backdrop" aria-label="Close client profile" onClick={closeProfile} />
            <aside className="staff-clients-profile" aria-label="Client profile">
              <div className="staff-clients-profile-head">
                <span aria-hidden>{clientInitials(profile.fullName)}</span>
                <div>
                  <h2 ref={profileHeadingRef} tabIndex={-1}>
                    {profile.fullName}
                  </h2>
                  <p>
                    {profile.type === "corporate" ? "Corporate" : "Individual"}
                    {profile.companyName ? ` · ${profile.companyName}` : ""}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Close client profile" onClick={closeProfile}>
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
              <div className="staff-clients-profile-meta">
                <StatusBadge tone={clientIsActive(profile) ? "success" : "warning"}>
                  {clientIsActive(profile) ? "Active" : "Inactive"}
                </StatusBadge>
                <StatusBadge tone={profile.kycStatus === "verified" ? "success" : "neutral"}>
                  KYC {clientKycLabel(profile.kycStatus)}
                </StatusBadge>
                <StatusBadge tone={profile.userId ? "information" : "neutral"}>
                  {profile.userId ? "Portal linked" : "No portal access"}
                </StatusBadge>
              </div>
              <Tabs value={profileTab} onValueChange={setProfileTab}>
                <TabsList aria-label="Client profile sections">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="matters">Matters</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                  {mode === "edit" && canManage ? (
                    <div className="staff-clients-form">
                      <ClientFields
                        idPrefix="edit"
                        form={editForm}
                        error={editError}
                        nameRef={editNameRef}
                        onChange={(form) => {
                          setEditForm(form);
                          if (editError && editError.field !== "form") setEditError(null);
                        }}
                      />
                      {editError?.field === "form" ? <p className="staff-clients-field-error">{editError.message}</p> : null}
                      <div className="staff-clients-actions">
                        <Button type="button" onClick={() => void submitEdit()} disabled={saving}>
                          {saving ? "Saving…" : "Save profile"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => openProfile(profile, "view")}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <dl className="staff-clients-facts">
                      <div>
                        <dt>Email</dt>
                        <dd>{profile.email || "—"}</dd>
                      </div>
                      <div>
                        <dt>Phone</dt>
                        <dd>{profile.phone || "—"}</dd>
                      </div>
                      <div>
                        <dt>Address</dt>
                        <dd>{profile.address || "—"}</dd>
                      </div>
                      {profile.type === "corporate" ? (
                        <div>
                          <dt>Registration</dt>
                          <dd>{profile.registrationNumber || "—"}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt>Record added</dt>
                        <dd>{formatAdded(profile.createdAt)}</dd>
                      </div>
                      <div>
                        <dt>Active matters</dt>
                        <dd>{matterLabel(clientKey(profile))}</dd>
                      </div>
                      <div>
                        <dt>Upcoming appointment</dt>
                        <dd>
                          {appointmentsQuery.isLoading
                            ? "Loading appointments…"
                            : appointmentsQuery.isError
                              ? "Appointments could not be loaded."
                              : upcoming
                                ? `${upcoming.date} ${upcoming.timeSlot ?? ""}`.trim()
                                : "No upcoming appointment."}
                        </dd>
                      </div>
                      <div>
                        <dt>Internal notes</dt>
                        <dd>{profile.notes?.trim() || "No internal notes."}</dd>
                      </div>
                      {profile.kycRejectionReason ? (
                        <div>
                          <dt>KYC rejection</dt>
                          <dd>{profile.kycRejectionReason}</dd>
                        </div>
                      ) : null}
                    </dl>
                  )}
                  <div className="staff-clients-actions">
                    {canManage && mode === "view" ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => openProfile(profile, "edit")}>
                        Edit
                      </Button>
                    ) : null}
                    {canManage ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => askToggleActive(profile)}>
                        {clientIsActive(profile) ? "Deactivate" : "Reactivate"}
                      </Button>
                    ) : null}
                    {canManage ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => askPortal(profile)}>
                        {profile.userId ? "Resend portal invite" : "Grant portal access"}
                      </Button>
                    ) : null}
                    {canReviewKyc && profile.kycStatus !== "pending" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRejectReason("");
                          setReviewError("");
                          setReviewClientId(clientKey(profile));
                        }}
                      >
                        {profile.kycStatus === "submitted" ? "Review KYC" : "View KYC files"}
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/staff/appointments">Open appointments</Link>
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="matters">
                  {casesQuery.isError ? (
                    <p className="staff-clients-message">Linked matters could not be loaded.</p>
                  ) : profileMatters.length === 0 ? (
                    <p className="staff-clients-message">No matters linked to this client.</p>
                  ) : (
                    <ul className="staff-clients-matters">
                      {profileMatters.map((matter) => {
                        const id = matterKey(matter);
                        return (
                          <li key={id || matter.title}>
                            <strong>{matter.title || "Untitled matter"}</strong>
                            <small>
                              {matter.caseNumber || "No number"} · {String(matter.status ?? "unknown").replaceAll("_", " ")}
                              {matter.practiceArea ? ` · ${matter.practiceArea}` : ""}
                            </small>
                            {id ? (
                              <Link href={`/staff/cases/${id}`}>Open matter</Link>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/staff/cases">Staff cases</Link>
                  </Button>
                </TabsContent>
              </Tabs>
            </aside>
          </>
        ) : null}
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open: boolean) => {
          if (!open) closeCreate();
        }}
      >
        <DialogContent className="staff-clients-dialog" aria-label="Add client">
          <DialogHeader>
            <DialogTitle>Add client</DialogTitle>
          </DialogHeader>
          <form className="staff-clients-form" onSubmit={(event) => void submitCreate(event)}>
            <ClientFields
              idPrefix="create"
              form={createForm}
              error={createError}
              autoFocusName
              onChange={(form) => {
                setCreateForm(form);
                if (createError && createError.field !== "form") setCreateError(null);
              }}
            />
            {createError?.field === "form" ? (
              <p className="staff-clients-field-error" role="alert">
                {createError.message}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreate}>
                Cancel
              </Button>
              <Button type="submit" disabled={adding}>
                {adding ? "Adding…" : "Add client"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reviewClientId && canReviewKyc)}
        onOpenChange={(open: boolean) => {
          if (!open) setReviewClientId(null);
        }}
      >
        <DialogContent className="staff-clients-dialog" aria-label="KYC review">
          <DialogHeader>
            <DialogTitle>KYC — {reviewClient?.fullName ?? "Client"}</DialogTitle>
          </DialogHeader>
          <p className="staff-clients-hint">Status: {reviewClient ? clientKycLabel(reviewClient.kycStatus) : "—"}</p>
          {kycFiles === undefined ? (
            <p className="staff-clients-hint">Loading KYC files…</p>
          ) : kycFiles.length === 0 ? (
            <p className="staff-clients-hint">No KYC files on record.</p>
          ) : (
            <ul className="staff-clients-matters">
              {kycFiles.map((file: { _id?: string; docType?: string; fileName?: string; url?: string }) => (
                <li key={file._id ?? file.fileName}>
                  <strong>{String(file.docType ?? "file").replaceAll("_", " ")}</strong>
                  <small>{file.fileName || "Unnamed file"}</small>
                  {file.url ? (
                    <a href={file.url} target="_blank" rel="noreferrer">
                      Open file
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {reviewClient?.kycStatus === "submitted" ? (
            <>
              <div className="staff-clients-field">
                <Label htmlFor="kyc-reject-reason">Rejection reason</Label>
                <Textarea
                  id="kyc-reject-reason"
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder="Required only when rejecting"
                />
              </div>
              {reviewError ? <p className="staff-clients-field-error">{reviewError}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" disabled={reviewing} onClick={() => void submitReview("rejected")}>
                  Reject
                </Button>
                <Button type="button" disabled={reviewing} onClick={() => void submitReview("verified")}>
                  {reviewing ? "Saving…" : "Approve and verify"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <p className="staff-clients-hint">Only submitted KYC can be reviewed.</p>
          )}
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

function ClientFields({
  idPrefix,
  form,
  error,
  onChange,
  autoFocusName = false,
  nameRef,
}: {
  idPrefix: string;
  form: StaffClientForm;
  error: FieldError;
  onChange: (form: StaffClientForm) => void;
  autoFocusName?: boolean;
  nameRef?: Ref<HTMLInputElement>;
}) {
  const fieldError = (field: string) => (error?.field === field ? error.message : "");
  return (
    <>
      <div className="staff-clients-field">
        <Label id={`${idPrefix}-type-label`}>Client type</Label>
        <div className="staff-clients-type" role="group" aria-labelledby={`${idPrefix}-type-label`}>
          {(["individual", "corporate"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={form.type === value}
              onClick={() => onChange({ ...form, type: value })}
            >
              {value === "individual" ? "Individual" : "Corporate"}
            </button>
          ))}
        </div>
      </div>
      <Field id={`${idPrefix}-fullName`} label="Full name" message={fieldError("fullName")}>
        <Input
          id={`${idPrefix}-fullName`}
          ref={nameRef}
          value={form.fullName}
          data-autofocus={autoFocusName ? "" : undefined}
          aria-invalid={Boolean(fieldError("fullName"))}
          onChange={(event) => onChange({ ...form, fullName: event.target.value })}
        />
      </Field>
      {form.type === "corporate" ? (
        <>
          <Field id={`${idPrefix}-companyName`} label="Company name" message={fieldError("companyName")}>
            <Input
              id={`${idPrefix}-companyName`}
              value={form.companyName}
              aria-invalid={Boolean(fieldError("companyName"))}
              onChange={(event) => onChange({ ...form, companyName: event.target.value })}
            />
          </Field>
          <Field id={`${idPrefix}-registrationNumber`} label="Registration number" message={fieldError("registrationNumber")}>
            <Input
              id={`${idPrefix}-registrationNumber`}
              value={form.registrationNumber}
              aria-invalid={Boolean(fieldError("registrationNumber"))}
              onChange={(event) => onChange({ ...form, registrationNumber: event.target.value })}
            />
          </Field>
        </>
      ) : null}
      <Field id={`${idPrefix}-email`} label="Email" message={fieldError("email")}>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          value={form.email}
          aria-invalid={Boolean(fieldError("email"))}
          onChange={(event) => onChange({ ...form, email: event.target.value })}
        />
      </Field>
      <Field id={`${idPrefix}-phone`} label="Phone" message={fieldError("phone")}>
        <Input
          id={`${idPrefix}-phone`}
          value={form.phone}
          aria-invalid={Boolean(fieldError("phone"))}
          onChange={(event) => onChange({ ...form, phone: event.target.value })}
        />
      </Field>
      <Field id={`${idPrefix}-address`} label="Address" message={fieldError("address")}>
        <Input
          id={`${idPrefix}-address`}
          value={form.address}
          aria-invalid={Boolean(fieldError("address"))}
          onChange={(event) => onChange({ ...form, address: event.target.value })}
        />
      </Field>
      <Field id={`${idPrefix}-notes`} label="Internal notes" message={fieldError("notes")}>
        <Textarea
          id={`${idPrefix}-notes`}
          value={form.notes}
          aria-invalid={Boolean(fieldError("notes"))}
          onChange={(event) => onChange({ ...form, notes: event.target.value })}
        />
      </Field>
    </>
  );
}

function Field({
  id,
  label,
  message,
  children,
}: {
  id: string;
  label: string;
  message: string;
  children: ReactNode;
}) {
  return (
    <div className="staff-clients-field">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {message ? (
        <p id={`${id}-error`} className="staff-clients-field-error" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
