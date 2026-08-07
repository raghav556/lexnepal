"use client";

/**
 * Shared CRM clients directory — used by `/admin/clients` and `/staff/clients`.
 * Ops pattern mirrors `/admin/users` (KPIs, filters, table, drawer) without a second page.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Sheet, SheetContent } from "@/components/ui/sheet.tsx";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog.tsx";
import {
  Search,
  Plus,
  User,
  Building2,
  X,
  Loader2,
  Check,
  Clock as ClockIcon,
  XCircle,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  Download,
  FolderOpen,
  Users,
  Ban,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useClientCommands, useClients, useKycFiles } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";
import { cn } from "@/lib/utils.ts";
import { inviteEmailQueuedMessage } from "@/lib/invite-copy.ts";
import type { ClientDto } from "@/shared/contracts/domains";

const KYC_BADGE: Record<string, string> = {
  verified: "bg-green-500/10 text-green-700 border-green-500/20",
  submitted: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  pending: "bg-muted text-muted-foreground border-border",
  rejected: "bg-red-500/10 text-red-700 border-red-500/20",
};

function clientKey(c: { _id?: string; id?: string }) {
  return String(c._id ?? c.id ?? "");
}

function exportClientsCsv(list: ClientDto[], caseCounts: Map<string, number>) {
  const headers = [
    "Name",
    "Type",
    "Email",
    "Phone",
    "KYC",
    "Portal",
    "Active cases",
    "Status",
    "Company",
  ];
  const rows = list.map((c) => [
    c.fullName ?? "",
    c.type ?? "",
    c.email ?? "",
    c.phone ?? "",
    c.kycStatus ?? "",
    c.userId ? "linked" : "none",
    String(caseCounts.get(clientKey(c)) ?? 0),
    c.isActive === false ? "inactive" : "active",
    c.companyName ?? "",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `clients-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function StaffClientsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAdminSurface = pathname?.startsWith("/admin") ?? false;

  const clientsData = useClients();
  const clients = clientsData ?? [];
  const cases = useCases({}) || [];
  const clientCommands = useClientCommands();

  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState<"all" | ClientDto["kycStatus"]>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "individual" | "corporate">("all");
  const [portalFilter, setPortalFilter] = useState<"all" | "linked" | "none">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientDto | null>(null);
  const [reviewClientId, setReviewClientId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [grantingPortalId, setGrantingPortalId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmDialogState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [fullName, setFullName] = useState("");
  const [type, setType] = useState<"individual" | "corporate">("individual");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    companyName: "",
    registrationNumber: "",
    notes: "",
    type: "individual" as "individual" | "corporate",
  });

  const kycFiles = useKycFiles(reviewClientId);
  const reviewClient =
    clients.find((c) => clientKey(c) === reviewClientId) ??
    (selectedClient && clientKey(selectedClient) === reviewClientId ? selectedClient : null);

  const activeCaseCountByClient = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of cases) {
      if (row.status !== "active") continue;
      const id = String(row.clientId ?? "");
      if (!id) continue;
      map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [cases]);

  const casesForSelected = useMemo(() => {
    if (!selectedClient) return [];
    const id = clientKey(selectedClient);
    return cases.filter((c) => String(c.clientId) === id).slice(0, 8);
  }, [cases, selectedClient]);

  useEffect(() => {
    if (!selectedClient) return;
    setEditForm({
      fullName: selectedClient.fullName || "",
      email: selectedClient.email || "",
      phone: selectedClient.phone || "",
      address: selectedClient.address || "",
      companyName: selectedClient.companyName || "",
      registrationNumber: selectedClient.registrationNumber || "",
      notes: selectedClient.notes || "",
      type: selectedClient.type || "individual",
    });
  }, [selectedClient]);

  // Deep-link from CRM convert (and similar): /admin/clients?client=<uuid>
  useEffect(() => {
    const id = searchParams.get("client");
    if (!id || clients.length === 0) return;
    const match = clients.find((c) => clientKey(c) === id);
    if (match) setSelectedClient(match);
  }, [searchParams, clients]);

  const filteredClients = useMemo(() => {
    const q = search.toLowerCase().trim();
    return clients.filter((c) => {
      const matchesSearch =
        !q ||
        c.fullName?.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.companyName && c.companyName.toLowerCase().includes(q));
      const matchesKyc = kycFilter === "all" || c.kycStatus === kycFilter;
      const matchesType = typeFilter === "all" || c.type === typeFilter;
      const matchesPortal =
        portalFilter === "all"
          ? true
          : portalFilter === "linked"
            ? Boolean(c.userId)
            : !c.userId;
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? c.isActive !== false
            : c.isActive === false;
      return matchesSearch && matchesKyc && matchesType && matchesPortal && matchesStatus;
    });
  }, [clients, search, kycFilter, typeFilter, portalFilter, statusFilter]);

  const {
    paginatedItems,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    resetPagination,
  } = usePagination(filteredClients, 15);

  useEffect(() => {
    resetPagination();
  }, [search, kycFilter, typeFilter, portalFilter, statusFilter]);

  const kpi = useMemo(() => {
    const total = clients.length;
    const kycQueue = clients.filter((c) => c.kycStatus === "submitted").length;
    const portalLinked = clients.filter((c) => Boolean(c.userId)).length;
    const activeMatters = clients.reduce(
      (sum, c) => sum + (activeCaseCountByClient.get(clientKey(c)) ?? 0),
      0,
    );
    return { total, kycQueue, portalLinked, activeMatters };
  }, [clients, activeCaseCountByClient]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) {
      toast.error("Please enter a client name.");
      return;
    }
    setIsSubmitting(true);
    try {
      await clientCommands.create({
        fullName,
        type,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        companyName: type === "corporate" ? companyName || undefined : undefined,
        registrationNumber: type === "corporate" ? registrationNumber || undefined : undefined,
        notes: notes || undefined,
      });
      toast.success("Client added.");
      setShowCreateModal(false);
      setFullName("");
      setType("individual");
      setEmail("");
      setPhone("");
      setAddress("");
      setCompanyName("");
      setRegistrationNumber("");
      setNotes("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create client.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedClient) return;
    setSavingProfile(true);
    try {
      const updated = (await clientCommands.update(clientKey(selectedClient), {
        fullName: editForm.fullName,
        email: editForm.email || null,
        phone: editForm.phone || null,
        address: editForm.address || null,
        type: editForm.type,
        companyName:
          editForm.type === "corporate" ? editForm.companyName || null : null,
        registrationNumber:
          editForm.type === "corporate" ? editForm.registrationNumber || null : null,
        notes: editForm.notes || null,
      })) as ClientDto;
      setSelectedClient({ ...selectedClient, ...updated, ...editForm });
      toast.success("Client profile saved.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save client.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleReview = async (decision: "verified" | "rejected") => {
    if (!reviewClientId) return;
    if (decision === "rejected" && !rejectReason.trim()) {
      toast.error("Enter a rejection reason.");
      return;
    }
    setIsReviewing(true);
    try {
      await clientCommands.reviewKyc(
        reviewClientId,
        decision,
        decision === "rejected" ? rejectReason.trim() : undefined,
      );
      toast.success(decision === "verified" ? "KYC verified." : "KYC rejected; client notified.");
      setReviewClientId(null);
      setRejectReason("");
      if (selectedClient && clientKey(selectedClient) === reviewClientId) {
        setSelectedClient({
          ...selectedClient,
          kycStatus: decision === "verified" ? "verified" : "rejected",
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to review KYC.");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleGrantPortal = (client: ClientDto) => {
    if (!client.email) {
      toast.error("Add an email on this client before granting portal access.");
      return;
    }
    setConfirm({
      title: client.userId
        ? `Resend portal email to ${client.email}?`
        : `Grant portal access to ${client.fullName}?`,
      description: client.userId
        ? "They will receive a setup or password-reset email for the client portal."
        : `Invite ${client.email} to the client portal. They will receive a setup email.`,
      confirmLabel: client.userId ? "Resend email" : "Grant access",
      onConfirm: async () => {
        setConfirmBusy(true);
        setGrantingPortalId(clientKey(client));
        try {
          const result = await clientCommands.grantPortalAccess(clientKey(client));
          if (result.created || result.linked) {
            toast.success(
              result.inviteSent ? inviteEmailQueuedMessage("setup") : "Portal access linked.",
            );
          } else if (result.alreadyLinked && result.inviteSent) {
            toast.success(inviteEmailQueuedMessage("resent"));
          } else if (result.alreadyLinked) {
            toast.success("Portal access already active for this client.");
          } else {
            toast.success("Portal access updated.");
          }
          const nextUserId = result.client?.userId ?? result.user?.id ?? client.userId;
          if (selectedClient && clientKey(selectedClient) === clientKey(client)) {
            setSelectedClient({ ...selectedClient, userId: nextUserId });
          }
        } catch (err: any) {
          toast.error(err?.message || "Failed to grant portal access.");
        } finally {
          setGrantingPortalId(null);
          setConfirmBusy(false);
        }
      },
    });
  };

  const askToggleActive = (client: ClientDto) => {
    const deactivating = client.isActive !== false;
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
          await clientCommands.update(clientKey(client), { isActive: !deactivating });
          toast.success(deactivating ? "Client deactivated." : "Client reactivated.");
          if (selectedClient && clientKey(selectedClient) === clientKey(client)) {
            setSelectedClient({ ...selectedClient, isActive: !deactivating });
          }
        } catch (err: any) {
          toast.error(err?.message || "Failed to update client status.");
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const kpiCards = [
    {
      label: "Total clients",
      value: kpi.total,
      icon: Users,
      iconClass: "bg-primary/10 text-primary",
    },
    {
      label: "KYC awaiting",
      value: kpi.kycQueue,
      icon: ShieldCheck,
      iconClass: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "Portal linked",
      value: kpi.portalLinked,
      icon: KeyRound,
      iconClass: "bg-sky-500/10 text-sky-600",
    },
    {
      label: "Active matters",
      value: kpi.activeMatters,
      icon: FolderOpen,
      iconClass: "bg-green-500/10 text-green-600",
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 min-w-0 w-full overflow-x-clip">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            CRM records, KYC review, and client portal access — one directory for admin and staff.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto shrink-0">
          <Plus className="w-4 h-4 mr-1" /> New client
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map(({ label, value, icon: Icon, iconClass }) => (
          <Card key={label} className="bg-card min-w-0 overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-medium leading-snug">
                    {label}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 tabular-nums leading-none">
                    {clientsData === undefined ? "—" : value}
                  </p>
                </div>
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg shrink-0 flex items-center justify-center ${iconClass}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 bg-card p-3 rounded-xl border border-border min-w-0">
        <div className="flex flex-col lg:flex-row gap-3 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 h-9 w-full"
              placeholder="Search name, email, phone, company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-full lg:w-auto shrink-0"
            onClick={() => exportClientsCsv(filteredClients, activeCaseCountByClient)}
            disabled={filteredClients.length === 0}
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <Select value={kycFilter} onValueChange={(v: any) => setKycFilter(v)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="KYC" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All KYC</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
            </SelectContent>
          </Select>
          <Select value={portalFilter} onValueChange={(v: any) => setPortalFilter(v)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Portal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All portal</SelectItem>
              <SelectItem value="linked">Portal linked</SelectItem>
              <SelectItem value="none">No portal</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {clientsData === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[780px]">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                  <tr>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Client
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Type
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      KYC
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Portal
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Matters
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                        No clients match these filters.{" "}
                        {clients.length === 0 ? "Click “New client” to add one." : null}
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((c) => {
                      const id = clientKey(c);
                      const matterCount = activeCaseCountByClient.get(id) ?? 0;
                      const isOpen = selectedClient ? clientKey(selectedClient) === id : false;
                      return (
                        <tr
                          key={id}
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-muted/30",
                            c.isActive === false && "opacity-70",
                            isOpen && "bg-primary/5",
                          )}
                          onClick={() => setSelectedClient(c)}
                        >
                          <td className="px-3 py-3 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                                {c.type === "corporate" ? (
                                  <Building2 className="w-4 h-4 text-accent" />
                                ) : (
                                  <User className="w-4 h-4 text-accent" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-foreground truncate max-w-[220px]">
                                  {c.fullName}
                                </div>
                                <div className="text-xs text-muted-foreground truncate max-w-[240px]">
                                  {c.email || "No email"}
                                  {c.phone ? ` · ${c.phone}` : ""}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant="secondary" className="text-xs capitalize">
                              {c.type}
                            </Badge>
                            {c.isActive === false && (
                              <Badge variant="outline" className="text-[10px] ml-1">
                                Inactive
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 border",
                                KYC_BADGE[c.kycStatus] || KYC_BADGE.pending,
                              )}
                            >
                              {c.kycStatus === "verified" && <Check className="w-2.5 h-2.5" />}
                              {c.kycStatus === "submitted" && <ClockIcon className="w-2.5 h-2.5" />}
                              {c.kycStatus === "rejected" && <XCircle className="w-2.5 h-2.5" />}
                              {c.kycStatus}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full border",
                                c.userId
                                  ? "bg-sky-500/10 text-sky-800 border-sky-500/20"
                                  : "bg-muted text-muted-foreground border-border",
                              )}
                            >
                              {c.userId ? "Linked" : "None"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground tabular-nums">
                            {matterCount}
                          </td>
                          <td
                            className="px-3 py-3 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => setSelectedClient(c)}
                            >
                              Open
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            onNextPage={nextPage}
            onPrevPage={prevPage}
            className="mt-2"
          />
        </>
      )}

      <Sheet
        open={Boolean(selectedClient)}
        onOpenChange={(open) => !open && setSelectedClient(null)}
      >
        {selectedClient && (
          <SheetContent
            onClose={() => setSelectedClient(null)}
            title={
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  {selectedClient.type === "corporate" ? (
                    <Building2 className="w-5 h-5 text-accent" />
                  ) : (
                    <User className="w-5 h-5 text-accent" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-serif text-lg font-bold text-foreground truncate">
                    {selectedClient.fullName}
                  </div>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {selectedClient.type}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn("text-xs capitalize", KYC_BADGE[selectedClient.kycStatus])}
                    >
                      KYC {selectedClient.kycStatus}
                    </Badge>
                    {selectedClient.isActive === false && (
                      <Badge variant="destructive" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            }
          >
            <div className="space-y-6 pb-8">
              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Profile
                </h4>
                <div className="grid gap-3">
                  <div className="grid gap-1">
                    <Label className="text-xs">Full name</Label>
                    <Input
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={editForm.type}
                      onValueChange={(v: any) => setEditForm({ ...editForm, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editForm.type === "corporate" && (
                    <>
                      <div className="grid gap-1">
                        <Label className="text-xs">Company name</Label>
                        <Input
                          value={editForm.companyName}
                          onChange={(e) =>
                            setEditForm({ ...editForm, companyName: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Registration number</Label>
                        <Input
                          value={editForm.registrationNumber}
                          onChange={(e) =>
                            setEditForm({ ...editForm, registrationNumber: e.target.value })
                          }
                        />
                      </div>
                    </>
                  )}
                  <div className="grid gap-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Phone</Label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Address</Label>
                    <Input
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Internal notes</Label>
                    <Textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      className="min-h-[72px] text-sm"
                    />
                  </div>
                  <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? "Saving…" : "Save profile"}
                  </Button>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Portal & KYC
                </h4>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    disabled={grantingPortalId === clientKey(selectedClient) || !selectedClient.email}
                    onClick={() => handleGrantPortal(selectedClient)}
                  >
                    {grantingPortalId === clientKey(selectedClient) ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <KeyRound className="w-4 h-4 mr-2" />
                    )}
                    {selectedClient.userId ? "Resend portal invite" : "Grant portal access"}
                  </Button>
                  {(selectedClient.kycStatus === "submitted" ||
                    selectedClient.kycStatus === "verified" ||
                    selectedClient.kycStatus === "rejected") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => {
                        setRejectReason("");
                        setReviewClientId(clientKey(selectedClient));
                      }}
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      {selectedClient.kycStatus === "submitted" ? "Review KYC" : "View KYC"}
                    </Button>
                  )}
                  {isAdminSurface && selectedClient.userId && (
                    <Button variant="outline" size="sm" className="justify-start" asChild>
                      <Link href="/admin/users">
                        <ExternalLink className="w-4 h-4 mr-2" /> Open Users directory
                      </Link>
                    </Button>
                  )}
                  {isAdminSurface && (
                    <Button variant="outline" size="sm" className="justify-start" asChild>
                      <Link href="/admin/crm">
                        <ExternalLink className="w-4 h-4 mr-2" /> CRM pipeline
                      </Link>
                    </Button>
                  )}
                  {!isAdminSurface && (
                    <Button variant="outline" size="sm" className="justify-start" asChild>
                      <Link href="/staff/cases">
                        <ExternalLink className="w-4 h-4 mr-2" /> Staff cases
                      </Link>
                    </Button>
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Matters ({casesForSelected.length}
                  {casesForSelected.length === 8 ? "+" : ""})
                </h4>
                {casesForSelected.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No matters linked yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {casesForSelected.map((matter) => (
                      <li
                        key={String(matter._id ?? matter.id)}
                        className="text-sm border border-border rounded-md px-3 py-2"
                      >
                        <div className="font-medium truncate">{matter.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {matter.caseNumber} · {String(matter.status).replace(/_/g, " ")}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="pt-2 border-t border-border flex flex-wrap gap-2">
                <Button
                  variant={selectedClient.isActive === false ? "default" : "destructive"}
                  onClick={() => askToggleActive(selectedClient)}
                >
                  {selectedClient.isActive === false ? (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2" /> Reactivate
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-2" /> Deactivate
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setSelectedClient(null)}>
                  Close
                </Button>
              </div>
            </div>
          </SheetContent>
        )}
      </Sheet>

      {/* KYC Review Modal */}
      {reviewClientId && reviewClient && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-auto flex flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sticky top-0 bg-card z-10">
              <div className="min-w-0">
                <h3 className="font-serif font-bold text-lg text-primary truncate">
                  KYC — {reviewClient.fullName}
                </h3>
                <p className="text-xs text-muted-foreground capitalize">
                  Status: {reviewClient.kycStatus}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewClientId(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 gap-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Address:</span>{" "}
                  <span className="break-words">{reviewClient.address || "—"}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">ID number:</span>{" "}
                  <span className="break-words">{reviewClient.kycIdNumber || "—"}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Consent:</span>{" "}
                  {reviewClient.kycConsentVersion
                    ? `${reviewClient.kycConsentVersion} at ${
                        reviewClient.kycConsentAt
                          ? new Date(String(reviewClient.kycConsentAt)).toLocaleString()
                          : "—"
                      }`
                    : "—"}
                </p>
                {reviewClient.kycRejectionReason && (
                  <p className="text-destructive break-words">
                    Last rejection: {reviewClient.kycRejectionReason}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Documents</h4>
                {kycFiles === undefined ? (
                  <p className="text-xs text-muted-foreground">Loading files…</p>
                ) : kycFiles.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No KYC files on record.</p>
                ) : (
                  <ul className="space-y-2">
                    {kycFiles.map((f: any) => (
                      <li
                        key={f.storageId}
                        className="flex items-center justify-between gap-2 border rounded-lg p-3 text-sm min-w-0"
                      >
                        <div className="min-w-0">
                          <p className="font-medium capitalize truncate">
                            {String(f.docType).replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{f.fileName}</p>
                        </div>
                        {f.url ? (
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-accent shrink-0 hover:underline"
                          >
                            Open <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground shrink-0">No URL</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {reviewClient.kycStatus === "submitted" && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">
                      Rejection reason (required to reject)
                    </label>
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. ID photo is blurry — please re-upload a clear scan"
                      className="min-h-[80px] text-sm"
                    />
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                    <Button
                      variant="outline"
                      disabled={isReviewing}
                      onClick={() => handleReview("rejected")}
                      className="border-destructive/40 text-destructive"
                    >
                      {isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
                    </Button>
                    <Button
                      disabled={isReviewing}
                      onClick={() => handleReview("verified")}
                      className="bg-accent hover:bg-accent/90"
                    >
                      {isReviewing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Approve & verify"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add new client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateClient} className="space-y-4">
            <div className="space-y-1">
              <Label>
                Client type <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType("individual")}
                  className={`flex-1 h-9 rounded-md border text-xs font-semibold cursor-pointer ${
                    type === "individual"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-input text-foreground border-input"
                  }`}
                >
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setType("corporate")}
                  className={`flex-1 h-9 rounded-md border text-xs font-semibold cursor-pointer ${
                    type === "corporate"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-input text-foreground border-input"
                  }`}
                >
                  Corporate
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label>
                {type === "corporate" ? "Authorized person's full name" : "Full name"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                placeholder="Ram Prasad Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            {type === "corporate" && (
              <>
                <div className="space-y-1">
                  <Label>Company name</Label>
                  <Input
                    placeholder="TechVenture Pvt. Ltd."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Company registration number</Label>
                  <Input
                    placeholder="REG-1092-2081"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="ram@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  placeholder="+977 98510XXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Address</Label>
              <Input
                placeholder="Thapathali, Kathmandu"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Internal notes</Label>
              <Textarea
                className="min-h-[60px] text-sm"
                placeholder="Special instructions, KYC remarks, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add client"}
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
    </div>
  );
}
