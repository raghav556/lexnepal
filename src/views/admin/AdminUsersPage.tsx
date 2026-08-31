"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import {
  useAuditEvents,
  useIdentityCommands,
  useSessions,
  useUsers,
} from "@/client/queries/identity";
import { useClients } from "@/client/queries/clients";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
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
import {
  DashboardButton,
  DashboardFilterBar,
  DashboardListSkeleton,
  DashboardStatusLabel,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  EmptyState,
  PortalPageShell,
  getDashboardRoleTone,
} from "@/components/dashboard";
import { DASHBOARD_METRIC_TONES } from "@/lib/dashboard-semantics";

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
  const {
    updateUser,
    createUser,
    resendInvitation,
    sendPasswordReset,
    revokeAllSessions,
    resetMfa,
  } = useIdentityCommands();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftRole, setDraftRole] = useState<UserRole>("client");
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "pending">(
    "all",
  );
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
    selectedUser && selectedUser.role !== "client" && selectedUser.role !== "admin";

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

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, prevPage, resetPagination } =
    usePagination(filteredUsers, 15);

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
    <PortalPageShell
      portal="admin"
      loading={users === undefined}
      loadingLabel="Loading directory…"
      decorated
      showTodayDate
      eyebrow="Identity & access"
      titleKey="portal.users.title"
      descriptionKey="portal.users.description"
      icon={User}
      actions={
        <DashboardButton
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          className="w-full sm:w-auto shrink-0"
        >
          <UserPlus className="w-4 h-4 mr-2" /> Invite user
        </DashboardButton>
      }
      metrics={[
        {
          label: "Total users",
          value: totalUsers,
          icon: User,
          tone: DASHBOARD_METRIC_TONES.people,
        },
        {
          label: "Active staff",
          value: totalStaff,
          icon: Briefcase,
          tone: DASHBOARD_METRIC_TONES.cases,
        },
        { label: "Pending invites", value: pendingUsers, icon: Clock, tone: "warning" },
        { label: "Clients", value: totalClients, icon: UserPlus, tone: "success" },
      ]}
    >
      <DashboardFilterBar className="bg-card p-3 rounded-xl border border-border min-w-0">
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
      </DashboardFilterBar>

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

      {users === undefined && <DashboardListSkeleton rows={5} />}

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

          {paginatedItems.length === 0 ? (
            <EmptyState
              title="No users found"
              description="No users match these filters."
              icon={User}
            />
          ) : (
            <DashboardTable>
              <DashboardTableHead>
                <tr>
                  <DashboardTableHeaderCell className="w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAllPage}
                      className="h-4 w-4 rounded border-border"
                      aria-label="Select page"
                    />
                  </DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Person</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Role</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Status</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Last login</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell className="text-right">
                    Actions
                  </DashboardTableHeaderCell>
                </tr>
              </DashboardTableHead>
              <DashboardTableBody>
                {paginatedItems.map((u) => {
                  const barExpiryDate = u.barCouncilExpiry ? new Date(u.barCouncilExpiry) : null;
                  const isExpiringSoon =
                    barExpiryDate && barExpiryDate < new Date(Date.now() + 90 * 86400000);
                  const rowId = userKey(u);
                  const isEditing = editingId === rowId;
                  const isSelected = selectedIds.has(rowId);
                  const isRowOpen = selectedUser ? userKey(selectedUser) === rowId : false;

                  return (
                    <DashboardTableRow
                      key={rowId}
                      striped
                      className={`cursor-pointer ${!u.isActive ? "opacity-70" : ""} ${
                        isRowOpen ? "bg-dashboard-primary-soft/40" : ""
                      } ${isSelected ? "bg-dashboard-neutral-soft/60" : ""}`}
                      onClick={() => setSelectedUser(u)}
                    >
                      <DashboardTableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelect(e, rowId)}
                          className="h-4 w-4 rounded border-border"
                          aria-label={`Select ${u.name}`}
                        />
                      </DashboardTableCell>
                      <DashboardTableCell className="min-w-0">
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
                      </DashboardTableCell>
                      <DashboardTableCell onClick={(e) => e.stopPropagation()}>
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
                            <DashboardStatusLabel
                              tone={getDashboardRoleTone(u.role)}
                              label={ROLE_LABELS[u.role]}
                              className="text-xs"
                            />
                          </button>
                        )}
                      </DashboardTableCell>
                      <DashboardTableCell>
                        {u.isPending ? (
                          <DashboardStatusLabel status="pending" className="text-[10px]" />
                        ) : !u.isActive ? (
                          <DashboardStatusLabel status="suspended" className="text-[10px]" />
                        ) : (
                          <DashboardStatusLabel status="active" className="text-[10px]" />
                        )}
                      </DashboardTableCell>
                      <DashboardTableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}
                      </DashboardTableCell>
                      <DashboardTableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setSelectedUser(u)}
                        >
                          Open
                        </Button>
                      </DashboardTableCell>
                    </DashboardTableRow>
                  );
                })}
              </DashboardTableBody>
            </DashboardTable>
          )}

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
                    <DashboardStatusLabel
                      tone={getDashboardRoleTone(selectedUser.role)}
                      label={ROLE_LABELS[selectedUser.role]}
                      className="text-xs"
                    />
                    <DashboardStatusLabel
                      label={statusLabel(selectedUser)}
                      status={
                        selectedUser.isPending
                          ? "pending"
                          : !selectedUser.isActive
                            ? "suspended"
                            : "active"
                      }
                      className="text-xs"
                    />
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
                    <DashboardStatusLabel tone="success" label="Enabled" className="text-[10px]" />
                  ) : (
                    <DashboardStatusLabel tone="neutral" label="Disabled" className="text-[10px]" />
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
    </PortalPageShell>
  );
}
