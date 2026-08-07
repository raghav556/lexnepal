"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import { useAuditEvents, useIdentityCommands, useSessions, useUsers } from "@/client/queries/identity";
import { useClients } from "@/client/queries/clients";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Sheet, SheetContent } from "@/components/ui/sheet.tsx";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog.tsx";
import {
  User,
  AlertTriangle,
  Check,
  X,
  Search,
  Ban,
  UserPlus,
  Key,
  Clock,
  ShieldCheck,
  MailWarning,
  History,
  Briefcase,
  Download,
  LogOut,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/lex-constants.ts";
import { inviteEmailQueuedMessage } from "@/lib/invite-copy.ts";
import type { UserRole } from "@/hooks/use-current-user.ts";

const ROLE_COLORS: Record<string, string> = {
  partner: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  senior_associate: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  associate: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  paralegal: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  intern: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  admin: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  client: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
};

const ALL_ROLES: UserRole[] = [
  "partner",
  "senior_associate",
  "associate",
  "paralegal",
  "intern",
  "admin",
  "client",
];

const STAFF_ROLES = ["partner", "senior_associate", "associate", "paralegal", "intern"] as const;
const PUBLIC_ROLES = ["partner", "senior_associate", "associate", "paralegal"] as const;

function exportUsersCsv(list: any[]) {
  const headers = ["Name", "Email", "Role", "Phone", "Bar Council", "Status", "Last Login"];
  const rows = list.map((u) => [
    u.name ?? "",
    u.email ?? "",
    u.role ?? "",
    u.phone ?? "",
    u.barCouncilNumber ?? "",
    u.isPending ? "Pending" : u.isActive ? "Active" : "Suspended",
    u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function statusLabel(u: any) {
  if (u.isPending) return "Pending";
  if (!u.isActive) return "Suspended";
  return "Active";
}

function userKey(u: { _id?: string; id?: string }) {
  return String(u._id ?? u.id ?? "");
}

export default function AdminUsersPage() {
  const users = useUsers();
  const crmClients = useClients();
  const { updateUser, createUser, resendInvitation, sendPasswordReset, revokeAllSessions, resetMfa } =
    useIdentityCommands();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftRole, setDraftRole] = useState<UserRole>("client");
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "pending">("all");
  const [activeTab, setActiveTab] = useState("staff");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    role: "associate" as UserRole,
    phone: "",
    barCouncilNumber: "",
  });

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    barCouncilNumber: "",
    barCouncilExpiry: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmDialogState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const userActivity = useAuditEvents(selectedUser ? { userId: userKey(selectedUser) } : {});
  const userSessions = useSessions(selectedUser ? userKey(selectedUser) : undefined);

  const linkedCrmClient = useMemo(() => {
    if (!selectedUser || selectedUser.role !== "client" || !crmClients) return null;
    const id = userKey(selectedUser);
    return crmClients.find((c) => c.userId === id) ?? null;
  }, [selectedUser, crmClients]);

  const isPublicTeamEligible =
    selectedUser && PUBLIC_ROLES.includes(selectedUser.role as (typeof PUBLIC_ROLES)[number]);
  const isHrEligible =
    selectedUser &&
    selectedUser.role !== "client" &&
    selectedUser.role !== "admin";

  useEffect(() => {
    if (selectedUser) {
      setEditForm({
        name: selectedUser.name || "",
        email: selectedUser.email || "",
        phone: selectedUser.phone || "",
        barCouncilNumber: selectedUser.barCouncilNumber || "",
        barCouncilExpiry: selectedUser.barCouncilExpiry
          ? selectedUser.barCouncilExpiry.slice(0, 10)
          : "",
      });
    }
  }, [selectedUser]);

  const startEdit = (e: React.MouseEvent, userId: string, currentRole: UserRole) => {
    e.stopPropagation();
    setEditingId(userId);
    setDraftRole(currentRole);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const saveRole = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    setSaving(true);
    try {
      await updateUser(userId, { role: draftRole });
      toast.success("Role updated");
      setEditingId(null);
      if (selectedUser && userKey(selectedUser) === userId)
        setSelectedUser({ ...selectedUser, role: draftRole });
    } catch {
      toast.error("Failed to update role");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!createForm.name || !createForm.email) {
      toast.error("Name and email are required");
      return;
    }
    try {
      await createUser({
        name: createForm.name,
        email: createForm.email,
        role: createForm.role,
        isPublicFacing: false,
        invite: true,
        phone: createForm.phone || undefined,
        barCouncilNumber: createForm.barCouncilNumber || undefined,
      });
      toast.success(inviteEmailQueuedMessage("setup"));
      setIsCreateOpen(false);
      setCreateForm({ name: "", email: "", role: "associate", phone: "", barCouncilNumber: "" });
    } catch {
      toast.error("Failed to invite user");
    }
  };

  const handleResendInvitation = async (user: any) => {
    try {
      await resendInvitation(userKey(user));
      toast.success(
        user.isPending ? inviteEmailQueuedMessage("resent") : inviteEmailQueuedMessage("reset"),
      );
    } catch {
      toast.error("Failed to resend email");
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedUser) return;
    setSavingProfile(true);
    try {
      await updateUser(userKey(selectedUser), {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone || undefined,
        barCouncilNumber: editForm.barCouncilNumber || undefined,
        barCouncilExpiry: editForm.barCouncilExpiry || undefined,
      });
      setSelectedUser({ ...selectedUser, ...editForm });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const applyStatus = async (user: any, isActive: boolean) => {
    try {
      await updateUser(userKey(user), { isActive });
      toast.success(isActive ? "Account reactivated" : "Account suspended");
      if (selectedUser && userKey(selectedUser) === userKey(user)) {
        setSelectedUser({ ...selectedUser, isActive });
      }
    } catch {
      toast.error("Failed to update account status");
    }
  };

  const askToggleStatus = (user: any) => {
    const suspending = user.isActive;
    setConfirm({
      title: suspending ? `Suspend ${user.name}?` : `Reactivate ${user.name}?`,
      description: suspending
        ? "They will lose portal access immediately and active sessions will be revoked."
        : "They will regain portal access with their current role.",
      confirmLabel: suspending ? "Suspend" : "Reactivate",
      destructive: suspending,
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await applyStatus(user, !user.isActive);
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const handleSendPasswordReset = async (user: any) => {
    try {
      await sendPasswordReset(userKey(user));
      toast.success(inviteEmailQueuedMessage("reset"));
    } catch {
      toast.error("Failed to send password reset");
    }
  };

  const askRevokeSessions = () => {
    if (!selectedUser) return;
    setConfirm({
      title: "Revoke all sessions?",
      description: `${selectedUser.name} will be signed out on every device.`,
      confirmLabel: "Revoke sessions",
      destructive: true,
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          const result = (await revokeAllSessions(userKey(selectedUser))) as {
            revoked?: number;
            count?: number;
          };
          toast.success(`Revoked ${result.revoked ?? result.count ?? 0} session(s)`);
        } catch {
          toast.error("Failed to revoke sessions");
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const askResetMfa = () => {
    if (!selectedUser) return;
    setConfirm({
      title: `Reset MFA for ${selectedUser.name}?`,
      description: "All sessions will be revoked. They must enroll MFA again at next sign-in.",
      confirmLabel: "Reset MFA",
      destructive: true,
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await resetMfa(userKey(selectedUser));
          toast.success("MFA reset");
          setSelectedUser({ ...selectedUser, twoFactorEnabled: false });
        } catch {
          toast.error("Failed to reset MFA");
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const askBulk = (action: "suspend" | "reactivate" | "resend_invite") => {
    const userIds = Array.from(selectedIds);
    if (userIds.length === 0) return;
    const labels = {
      suspend: {
        title: `Suspend ${userIds.length} user(s)?`,
        description: "Selected accounts lose portal access and active sessions are revoked.",
        confirmLabel: "Suspend",
        destructive: true,
      },
      reactivate: {
        title: `Reactivate ${userIds.length} user(s)?`,
        description: "Selected accounts regain portal access.",
        confirmLabel: "Reactivate",
        destructive: false,
      },
      resend_invite: {
        title: `Resend setup email to ${userIds.length} user(s)?`,
        description: "Each selected account receives a setup or password-reset email.",
        confirmLabel: "Send emails",
        destructive: false,
      },
    }[action];

    setConfirm({
      ...labels,
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await Promise.all(
            userIds.map((userId) =>
              action === "suspend"
                ? updateUser(userId, { isActive: false })
                : action === "reactivate"
                  ? updateUser(userId, { isActive: true })
                  : resendInvitation(userId),
            ),
          );
          toast.success(`Updated ${userIds.length} user(s)`);
          setSelectedIds(new Set());
        } catch {
          toast.error("Bulk action failed");
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const toggleSelect = (e: React.MouseEvent | React.ChangeEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredUsers =
    users?.filter((u) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.barCouncilNumber?.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "pending"
            ? u.isPending
            : statusFilter === "active"
              ? u.isActive && !u.isPending
              : !u.isActive;
      const matchesTab =
        activeTab === "staff"
          ? STAFF_ROLES.includes(u.role as (typeof STAFF_ROLES)[number])
          : activeTab === "clients"
            ? u.role === "client"
            : activeTab === "admins"
              ? u.role === "admin"
              : true;
      return matchesSearch && matchesStatus && matchesTab;
    }) || [];

  const {
    paginatedItems,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    resetPagination,
  } = usePagination(filteredUsers, 15);

  useEffect(() => {
    resetPagination();
    setSelectedIds(new Set());
  }, [searchQuery, statusFilter, activeTab]);

  const totalUsers = users?.length || 0;
  const pendingUsers = users?.filter((u) => u.isPending).length || 0;
  const totalClients = users?.filter((u) => u.role === "client").length || 0;
  const totalStaff =
    users?.filter(
      (u) =>
        STAFF_ROLES.includes(u.role as (typeof STAFF_ROLES)[number]) && u.isActive && !u.isPending,
    ).length || 0;

  const kpiCards = [
    { label: "Total Users", value: totalUsers, icon: User, iconClass: "bg-primary/10 text-primary" },
    {
      label: "Active Staff",
      value: totalStaff,
      icon: Briefcase,
      iconClass: "bg-blue-500/10 text-blue-500",
    },
    {
      label: "Pending Invites",
      value: pendingUsers,
      icon: Clock,
      iconClass: "bg-amber-500/10 text-amber-500",
    },
    {
      label: "Clients",
      value: totalClients,
      icon: UserPlus,
      iconClass: "bg-green-500/10 text-green-500",
    },
  ];

  const pageIds = paginatedItems.map((u) => userKey(u)).filter(Boolean);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const toggleSelectAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
            Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Firm identity console — invite, roles, access, and linked records.
          </p>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto shrink-0">
          <UserPlus className="w-4 h-4 mr-2" /> Invite user
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
                    {value}
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

      <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 rounded-xl border border-border min-w-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search name, email, bar…"
            className="pl-9 h-9 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48 shrink-0">
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-full sm:w-auto shrink-0"
          onClick={() => exportUsersCsv(filteredUsers)}
        >
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-muted/50 p-3 rounded-xl border border-border">
          <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
          <Button variant="outline" size="sm" onClick={() => askBulk("suspend")}>
            <Ban className="w-4 h-4 mr-1" /> Suspend
          </Button>
          <Button variant="outline" size="sm" onClick={() => askBulk("reactivate")}>
            <RotateCcw className="w-4 h-4 mr-1" /> Reactivate
          </Button>
          <Button variant="outline" size="sm" onClick={() => askBulk("resend_invite")}>
            <MailWarning className="w-4 h-4 mr-1" /> Resend email
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {users === undefined && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {users !== undefined && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 h-auto w-full grid grid-cols-3 gap-1">
            <TabsTrigger value="staff" className="text-xs sm:text-sm px-1 sm:px-3">
              Staff
            </TabsTrigger>
            <TabsTrigger value="clients" className="text-xs sm:text-sm px-1 sm:px-3">
              Clients
            </TabsTrigger>
            <TabsTrigger value="admins" className="text-xs sm:text-sm px-1 sm:px-3">
              Admins
            </TabsTrigger>
          </TabsList>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[720px]">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                  <tr>
                    <th scope="col" className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleSelectAllPage}
                        className="h-4 w-4 rounded border-border"
                        aria-label="Select page"
                      />
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">Person</th>
                    <th scope="col" className="px-3 py-3 font-medium">Role</th>
                    <th scope="col" className="px-3 py-3 font-medium">Status</th>
                    <th scope="col" className="px-3 py-3 font-medium">Last login</th>
                    <th scope="col" className="px-3 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                        No users match these filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((u) => {
                      const barExpiryDate = u.barCouncilExpiry
                        ? new Date(u.barCouncilExpiry)
                        : null;
                      const isExpiringSoon =
                        barExpiryDate &&
                        barExpiryDate < new Date(Date.now() + 90 * 86400000);
                      const rowId = userKey(u);
                      const isEditing = editingId === rowId;
                      const isSelected = selectedIds.has(rowId);
                      const isRowOpen = selectedUser ? userKey(selectedUser) === rowId : false;

                      return (
                        <tr
                          key={rowId}
                          className={`cursor-pointer transition-colors hover:bg-muted/30 ${
                            !u.isActive ? "opacity-70" : ""
                          } ${isRowOpen ? "bg-primary/5" : ""} ${isSelected ? "bg-muted/40" : ""}`}
                          onClick={() => setSelectedUser(u)}
                        >
                          <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => toggleSelect(e, rowId)}
                              className="h-4 w-4 rounded border-border"
                              aria-label={`Select ${u.name}`}
                            />
                          </td>
                          <td className="px-3 py-3 min-w-0">
                            <div className="font-medium text-foreground truncate max-w-[220px]">
                              {u.name ?? "Unnamed"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[240px]">
                              {u.email ?? "—"}
                            </div>
                            {u.barCouncilNumber && (
                              <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                Bar {u.barCouncilNumber}
                                {isExpiringSoon && (
                                  <span className="inline-flex items-center gap-0.5 text-amber-600">
                                    <AlertTriangle className="w-3 h-3" /> soon
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <Select
                                  value={draftRole}
                                  onValueChange={(v) => setDraftRole(v as UserRole)}
                                >
                                  <SelectTrigger className="h-8 text-xs w-36">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ALL_ROLES.map((r) => (
                                      <SelectItem key={r} value={r}>
                                        {ROLE_LABELS[r]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-green-600"
                                  disabled={saving}
                                  onClick={(e) => saveRole(e, rowId)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={cancelEdit}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="text-left"
                                onClick={(e) => startEdit(e, rowId, u.role)}
                              >
                                <Badge className={`text-xs ${ROLE_COLORS[u.role]}`}>
                                  {ROLE_LABELS[u.role]}
                                </Badge>
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {u.isPending ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-amber-500 text-amber-700 dark:text-amber-400"
                              >
                                Pending
                              </Badge>
                            ) : !u.isActive ? (
                              <Badge variant="destructive" className="text-[10px]">
                                Suspended
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-green-600/40 text-green-700 dark:text-green-400"
                              >
                                Active
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {u.lastLoginAt
                              ? new Date(u.lastLoginAt).toLocaleString()
                              : "—"}
                          </td>
                          <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => setSelectedUser(u)}
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
            className="mt-4"
          />
        </Tabs>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Full name</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Jane Doe"
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="jane@firm.example"
              />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="+977…"
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(v: any) => setCreateForm({ ...createForm, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {PUBLIC_ROLES.includes(createForm.role as (typeof PUBLIC_ROLES)[number]) && (
              <div className="grid gap-2">
                <Label>Bar council number</Label>
                <Input
                  value={createForm.barCouncilNumber}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, barCouncilNumber: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser}>Send invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(selectedUser)} onOpenChange={(open) => !open && setSelectedUser(null)}>
        {selectedUser && (
          <SheetContent
            onClose={() => setSelectedUser(null)}
            title={
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="font-serif text-lg font-bold text-foreground truncate">
                    {selectedUser.name}
                  </div>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    <Badge className={`text-xs ${ROLE_COLORS[selectedUser.role]}`}>
                      {ROLE_LABELS[selectedUser.role]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {statusLabel(selectedUser)}
                    </Badge>
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
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>
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
                  {selectedUser.role !== "client" && selectedUser.role !== "admin" && (
                    <>
                      <div className="grid gap-1">
                        <Label className="text-xs">Bar council number</Label>
                        <Input
                          value={editForm.barCouncilNumber}
                          onChange={(e) =>
                            setEditForm({ ...editForm, barCouncilNumber: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Bar council expiry</Label>
                        <Input
                          type="date"
                          value={editForm.barCouncilExpiry}
                          onChange={(e) =>
                            setEditForm({ ...editForm, barCouncilExpiry: e.target.value })
                          }
                        />
                      </div>
                    </>
                  )}
                  <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
                    Save profile
                  </Button>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Linked records
                </h4>
                <div className="flex flex-col gap-2">
                  {isPublicTeamEligible && (
                    <Button variant="outline" size="sm" className="justify-start" asChild>
                      <Link href="/admin/cms/team">
                        <ExternalLink className="w-4 h-4 mr-2" /> Public website profile
                      </Link>
                    </Button>
                  )}
                  {selectedUser.role === "client" && (
                    <Button variant="outline" size="sm" className="justify-start" asChild>
                      <Link href="/admin/clients">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {linkedCrmClient
                          ? `CRM client: ${linkedCrmClient.fullName}`
                          : "CRM clients (grant portal)"}
                      </Link>
                    </Button>
                  )}
                  {isHrEligible && (
                    <Button variant="outline" size="sm" className="justify-start" asChild>
                      <Link href="/admin/hr">
                        <ExternalLink className="w-4 h-4 mr-2" /> HR / payroll
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="justify-start" asChild>
                    <Link href="/admin/audit">
                      <ExternalLink className="w-4 h-4 mr-2" /> Firm audit log
                    </Link>
                  </Button>
                </div>
              </section>

              {selectedUser.lastLoginAt && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Last login {new Date(selectedUser.lastLoginAt).toLocaleString()}
                </p>
              )}

              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Security & sessions
                </h4>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <ShieldCheck
                      className={`w-4 h-4 ${selectedUser.twoFactorEnabled ? "text-green-500" : "text-muted-foreground"}`}
                    />
                    Two-factor auth
                  </span>
                  {selectedUser.twoFactorEnabled ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-green-700 border-green-600/50"
                    >
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Disabled
                    </Badge>
                  )}
                </div>
                {selectedUser.twoFactorEnabled && (
                  <Button variant="outline" size="sm" onClick={askResetMfa}>
                    <ShieldCheck className="w-4 h-4 mr-2" /> Reset MFA & sessions
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  {userSessions?.length ?? 0} active session(s)
                </p>
                {(userSessions?.length ?? 0) > 0 && (
                  <Button variant="outline" size="sm" onClick={askRevokeSessions}>
                    <LogOut className="w-4 h-4 mr-2" /> Revoke all sessions
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() =>
                    selectedUser.isPending
                      ? handleResendInvitation(selectedUser)
                      : handleSendPasswordReset(selectedUser)
                  }
                >
                  {selectedUser.isPending ? (
                    <MailWarning className="w-4 h-4 mr-2 text-amber-500" />
                  ) : (
                    <Key className="w-4 h-4 mr-2" />
                  )}
                  {selectedUser.isPending ? "Resend setup email" : "Send password reset"}
                </Button>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent activity
                </h4>
                {userActivity === undefined ? (
                  <Skeleton className="h-12 w-full" />
                ) : userActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity recorded.</p>
                ) : (
                  userActivity.slice(0, 5).map((log: any) => (
                    <div key={log._id} className="flex items-start gap-2 text-sm">
                      <History className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <span className="text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}:
                        </span>{" "}
                        {log.action}
                        {log.details ? ` — ${log.details}` : ""}
                      </div>
                    </div>
                  ))
                )}
              </section>

              <div className="pt-2 border-t border-border flex flex-wrap gap-2">
                <Button
                  variant={selectedUser.isActive ? "destructive" : "default"}
                  onClick={() => askToggleStatus(selectedUser)}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  {selectedUser.isActive ? "Suspend account" : "Reactivate account"}
                </Button>
                <Button variant="outline" onClick={() => setSelectedUser(null)}>
                  Close
                </Button>
              </div>
            </div>
          </SheetContent>
        )}
      </Sheet>

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
