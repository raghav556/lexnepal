import { useState, useEffect } from "react";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { User, AlertTriangle, Check, X, Search, Ban, Activity, Mail, Phone, CalendarDays, UserPlus, FileText, Key, Clock, ShieldCheck, MailWarning, History, Briefcase, Download, Trash2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/lex-constants.ts";
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
  "partner", "senior_associate", "associate", "paralegal", "intern", "admin", "client",
];

function exportUsersCsv(users: any[]) {
  const headers = ["Name", "Email", "Role", "Phone", "Bar Council", "Status", "Last Login"];
  const rows = users.map((u) => [
    u.name ?? "",
    u.email ?? "",
    u.role ?? "",
    u.phone ?? "",
    u.barCouncilNumber ?? "",
    u.isPending ? "Pending" : u.isActive ? "Active" : "Suspended",
    u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "",
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminUsersPage() {
  const users = useQuery(api.users.listUsers, {});
  const updateUser = useMutation(api.users.updateUser);
  const createUser = useMutation(api.users.createUser);
  const resendInvitation = useMutation(api.users.resendInvitation);
  const sendPasswordReset = useMutation(api.users.sendPasswordReset);
  const archiveUser = useMutation(api.users.archiveUser);
  const bulkUpdateUsers = useMutation(api.users.bulkUpdateUsers);
  const revokeAllSessions = useMutation(api.users.revokeAllSessions);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftRole, setDraftRole] = useState<UserRole>("client");
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "pending">("all");
  const [activeTab, setActiveTab] = useState("staff");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", role: "client" as UserRole, phone: "", barCouncilNumber: "" });

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", email: "", phone: "", barCouncilNumber: "", barCouncilExpiry: "", practiceAreas: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const userActivity = useQuery(
    api.users.getUserActivity,
    selectedUser ? { userId: selectedUser._id as Id<"users"> } : "skip",
  );
  const userSessions = useQuery(
    api.users.listSessions,
    selectedUser ? { userId: selectedUser._id as Id<"users"> } : "skip",
  );

  useEffect(() => {
    if (selectedUser) {
      setEditForm({
        name: selectedUser.name || "",
        email: selectedUser.email || "",
        phone: selectedUser.phone || "",
        barCouncilNumber: selectedUser.barCouncilNumber || "",
        barCouncilExpiry: selectedUser.barCouncilExpiry ? selectedUser.barCouncilExpiry.slice(0, 10) : "",
        practiceAreas: (selectedUser.practiceAreas || []).join(", "),
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

  const saveRole = async (e: React.MouseEvent, userId: Id<"users">) => {
    e.stopPropagation();
    setSaving(true);
    try {
      await updateUser({ userId, role: draftRole });
      toast.success("Role updated successfully");
      setEditingId(null);
    } catch {
      toast.error("Failed to update role");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!createForm.name || !createForm.email) {
      toast.error("Name and Email are required");
      return;
    }
    try {
      const result = await createUser({
        name: createForm.name,
        email: createForm.email,
        role: createForm.role,
        phone: createForm.phone || undefined,
        barCouncilNumber: createForm.barCouncilNumber || undefined,
      });
      if (result.activationToken) {
        const setupUrl = `${window.location.origin}/setup-account?token=${result.activationToken}`;
        toast.success("User invited successfully!", {
          duration: 10000,
          description: `Setup link (expires ${result.inviteExpiresAt ? new Date(result.inviteExpiresAt).toLocaleDateString() : "in 7 days"}): ${setupUrl}`,
        });
      } else {
        toast.success("User created successfully");
      }
      setIsCreateOpen(false);
      setCreateForm({ name: "", email: "", role: "client", phone: "", barCouncilNumber: "" });
    } catch {
      toast.error("Failed to invite user");
    }
  };

  const handleResendInvitation = async (user: any) => {
    try {
      const result = await resendInvitation({ userId: user._id });
      const setupUrl = `${window.location.origin}/setup-account?token=${result.activationToken}`;
      toast.success(`Invitation resent to ${user.email}`, {
        duration: 10000,
        description: `Setup link: ${setupUrl}`,
      });
    } catch {
      toast.error("Failed to resend invitation");
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedUser) return;
    setSavingProfile(true);
    try {
      const practiceAreas = editForm.practiceAreas
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await updateUser({
        userId: selectedUser._id,
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone || undefined,
        barCouncilNumber: editForm.barCouncilNumber || undefined,
        barCouncilExpiry: editForm.barCouncilExpiry || undefined,
        practiceAreas,
      });
      setSelectedUser({
        ...selectedUser,
        ...editForm,
        practiceAreas,
      });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleUserStatus = async (user: any) => {
    try {
      await updateUser({ userId: user._id, isActive: !user.isActive });
      toast.success(`User ${!user.isActive ? "reactivated" : "suspended"} successfully`);
      if (selectedUser && selectedUser._id === user._id) {
        setSelectedUser({ ...selectedUser, isActive: !user.isActive });
      }
    } catch {
      toast.error("Failed to update user status");
    }
  };

  const handleSendPasswordReset = async (user: any) => {
    try {
      await sendPasswordReset({ userId: user._id });
      toast.success(`Password reset link sent to ${user.email}`);
    } catch {
      toast.error("Failed to send password reset");
    }
  };

  const handleArchiveUser = async () => {
    if (!selectedUser) return;
    if (!window.confirm(`Archive ${selectedUser.name}? They will lose access.`)) return;
    try {
      await archiveUser({ userId: selectedUser._id });
      toast.success("User archived");
      setSelectedUser(null);
    } catch {
      toast.error("Failed to archive user");
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!selectedUser) return;
    try {
      const result = await revokeAllSessions({ userId: selectedUser._id });
      toast.success(`Revoked ${result.count} session(s)`);
    } catch {
      toast.error("Failed to revoke sessions");
    }
  };

  const handleBulkAction = async (action: "suspend" | "resend_invite") => {
    const userIds = Array.from(selectedIds) as Id<"users">[];
    if (userIds.length === 0) return;
    try {
      const result = await bulkUpdateUsers({ userIds, action });
      toast.success(`Updated ${result.count} user(s)`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Bulk action failed");
    }
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredUsers = users?.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.barCouncilNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all"
      ? true
      : statusFilter === "pending"
        ? u.isPending
        : statusFilter === "active"
          ? (u.isActive && !u.isPending)
          : !u.isActive;

    const matchesTab = activeTab === "staff" ? ['partner', 'senior_associate', 'associate', 'paralegal', 'intern'].includes(u.role)
      : activeTab === "clients" ? u.role === 'client'
      : activeTab === "admins" ? u.role === 'admin'
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
    resetPagination
  } = usePagination(filteredUsers, 10);

  useEffect(() => {
    resetPagination();
    setSelectedIds(new Set());
  }, [searchQuery, statusFilter, activeTab]);

  const totalUsers = users?.length || 0;
  const pendingUsers = users?.filter(u => u.isPending).length || 0;
  const totalClients = users?.filter(u => u.role === 'client').length || 0;
  const totalStaff = users?.filter(u => ['partner', 'senior_associate', 'associate', 'paralegal'].includes(u.role)).length || 0;

  const kpiCards = [
    { label: "Total Users", value: totalUsers, icon: User, iconClass: "bg-primary/10 text-primary" },
    { label: "Active Staff", value: totalStaff, icon: Briefcase, iconClass: "bg-blue-500/10 text-blue-500" },
    { label: "Pending Invites", value: pendingUsers, icon: Clock, iconClass: "bg-amber-500/10 text-amber-500" },
    { label: "Clients", value: totalClients, icon: UserPlus, iconClass: "bg-green-500/10 text-green-500" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-foreground">Users & Roles</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage staff, clients, and administrators.</p>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto shrink-0">
          <UserPlus className="w-4 h-4 mr-2" /> Invite User
        </Button>
      </div>

      {/* KPI: label+number left, icon top-right — avoids cramped wrapping next to icon on narrow phones */}
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
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg shrink-0 flex items-center justify-center ${iconClass}`}>
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
            title="Search by name, email, or bar council number"
            className="pl-9 h-9 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48 shrink-0">
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="pending">Pending Only</SelectItem>
              <SelectItem value="suspended">Suspended Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" className="h-9 w-full sm:w-auto shrink-0" onClick={() => exportUsersCsv(filteredUsers)}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-muted/50 p-3 rounded-xl border border-border">
          <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
          <Button variant="outline" size="sm" onClick={() => handleBulkAction("suspend")}>
            <Ban className="w-4 h-4 mr-1" /> Suspend
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleBulkAction("resend_invite")}>
            <MailWarning className="w-4 h-4 mr-1" /> Resend Invite
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}

      {users === undefined && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      )}

      {filteredUsers !== undefined && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 h-auto w-full grid grid-cols-3 gap-1">
            <TabsTrigger value="staff" className="text-xs sm:text-sm px-1 sm:px-3">Staff</TabsTrigger>
            <TabsTrigger value="clients" className="text-xs sm:text-sm px-1 sm:px-3">Clients</TabsTrigger>
            <TabsTrigger value="admins" className="text-xs sm:text-sm px-1 sm:px-3">Admins</TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 gap-3">
            {paginatedItems.map(renderUserCard)}
            {paginatedItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">No users found in this category.</div>
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            onNextPage={nextPage}
            onPrevPage={prevPage}
            className="mt-6"
          />
        </Tabs>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Full Name</Label>
              <Input value={createForm.name} onChange={(e) => setCreateForm({...createForm, name: e.target.value})} placeholder="Jane Doe" />
            </div>
            <div className="grid gap-2">
              <Label>Email Address</Label>
              <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({...createForm, email: e.target.value})} placeholder="jane@example.com" />
            </div>
            <div className="grid gap-2">
              <Label>Phone Number</Label>
              <Input value={createForm.phone} onChange={(e) => setCreateForm({...createForm, phone: e.target.value})} placeholder="+977..." />
            </div>
            <div className="grid gap-2">
              <Label>System Role</Label>
              <Select value={createForm.role} onValueChange={(v: any) => setCreateForm({...createForm, role: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {['partner', 'senior_associate', 'associate', 'paralegal'].includes(createForm.role) && (
              <div className="grid gap-2">
                <Label>Bar Council Number</Label>
                <Input value={createForm.barCouncilNumber} onChange={(e) => setCreateForm({...createForm, barCouncilNumber: e.target.value})} placeholder="Optional" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateUser}>Send Invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xl">{selectedUser.name}</div>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <Badge className={`text-xs ${ROLE_COLORS[selectedUser.role]}`}>{ROLE_LABELS[selectedUser.role]}</Badge>
                      {selectedUser.isPending && <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10"><Clock className="w-3 h-3 mr-1"/>Pending</Badge>}
                      {!selectedUser.isActive && <Badge variant="destructive" className="text-xs">Suspended</Badge>}
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="py-4 space-y-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Edit Profile</h4>
                  <div className="grid gap-3">
                    <div className="grid gap-1">
                      <Label className="text-xs">Name</Label>
                      <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Email</Label>
                      <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Phone</Label>
                      <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                    </div>
                    {selectedUser.role !== 'client' && selectedUser.role !== 'admin' && (
                      <>
                        <div className="grid gap-1">
                          <Label className="text-xs">Bar Council Number</Label>
                          <Input value={editForm.barCouncilNumber} onChange={(e) => setEditForm({ ...editForm, barCouncilNumber: e.target.value })} />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Bar Council Expiry</Label>
                          <Input type="date" value={editForm.barCouncilExpiry} onChange={(e) => setEditForm({ ...editForm, barCouncilExpiry: e.target.value })} />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Practice Areas (comma-separated)</Label>
                          <Input value={editForm.practiceAreas} onChange={(e) => setEditForm({ ...editForm, practiceAreas: e.target.value })} placeholder="Corporate Law, Litigation" />
                        </div>
                      </>
                    )}
                    <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}>Save Profile</Button>
                  </div>
                </div>

                {selectedUser.lastLoginAt && (
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Last login: {new Date(selectedUser.lastLoginAt).toLocaleString()}
                  </div>
                )}

                {selectedUser.role !== 'client' && selectedUser.role !== 'admin' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Professional Info</h4>
                    <div className="flex items-center gap-3 text-sm text-foreground">
                      <Briefcase className="w-4 h-4 text-muted-foreground" /> Practice Area: {selectedUser.practiceAreas?.join(", ") || "—"}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Security</h4>
                  <div className="flex items-center justify-between text-sm text-foreground">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className={`w-4 h-4 ${selectedUser.twoFactorEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                      Two-Factor Auth
                    </div>
                    {selectedUser.twoFactorEnabled ? (
                      <Badge variant="outline" className="text-[10px] text-green-600 border-green-600 bg-green-50">Enabled</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Disabled</Badge>
                    )}
                  </div>
                  {(userSessions?.length ?? 0) > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">{userSessions!.length} active session(s)</p>
                      <Button variant="outline" size="sm" onClick={handleRevokeAllSessions}>
                        <LogOut className="w-4 h-4 mr-2" /> Revoke All Sessions
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</h4>
                  {userActivity === undefined ? (
                    <Skeleton className="h-12 w-full" />
                  ) : userActivity.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity recorded.</p>
                  ) : (
                    userActivity.slice(0, 5).map((log: any) => (
                      <div key={log._id} className="flex items-start gap-3 text-sm">
                        <History className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <span className="text-muted-foreground">{new Date(log._creationTime).toLocaleString()}:</span>{" "}
                          {log.action}{log.details ? ` — ${log.details}` : ""}
                        </div>
                      </div>
                    ))
                  )}
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Account Status:</span> {selectedUser.isActive ? "Active (Can Login)" : "Suspended (No Access)"}
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-foreground"
                      onClick={() => {
                        if (selectedUser.isPending) {
                          handleResendInvitation(selectedUser);
                        } else {
                          handleSendPasswordReset(selectedUser);
                        }
                      }}
                    >
                      {selectedUser.isPending ? <MailWarning className="w-4 h-4 mr-2 text-amber-500" /> : <Key className="w-4 h-4 mr-2 text-muted-foreground" />}
                      {selectedUser.isPending ? "Resend Invitation Email" : "Send Password Reset Link"}
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex justify-between sm:justify-between items-center border-t border-border pt-4 mt-2 flex-wrap gap-2">
                <div className="flex gap-2">
                  <Button
                    variant={selectedUser.isActive ? "destructive" : "default"}
                    onClick={() => toggleUserStatus(selectedUser)}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    {selectedUser.isActive ? "Suspend Account" : "Reactivate Account"}
                  </Button>
                  <Button variant="outline" className="text-destructive" onClick={handleArchiveUser}>
                    <Trash2 className="w-4 h-4 mr-2" /> Archive
                  </Button>
                </div>
                <Button variant="outline" onClick={() => setSelectedUser(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderUserCard(u: any) {
    const barExpiryDate = u.barCouncilExpiry ? new Date(u.barCouncilExpiry) : null;
    const isExpiringSoon = barExpiryDate && barExpiryDate < new Date(Date.now() + 90 * 86400000);
    const isEditing = editingId === u._id;
    const isSelected = selectedIds.has(u._id);

    return (
      <Card
        key={u._id}
        className={`hover:shadow-md transition-all cursor-pointer ${!u.isActive ? "opacity-60 grayscale-[0.5]" : ""} ${isSelected ? "ring-2 ring-primary" : ""}`}
        onClick={() => setSelectedUser(u)}
      >
        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0 w-full">
            <input
              type="checkbox"
              checked={isSelected}
              onClick={(e) => toggleSelect(e, u._id)}
              onChange={() => {}}
              className="h-4 w-4 rounded border-border shrink-0"
            />
            <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className={`text-sm font-semibold truncate max-w-full ${!u.isActive ? "line-through text-muted-foreground" : u.isPending ? "text-amber-600 dark:text-amber-500" : "text-foreground"}`}>
                  {u.name ?? "Unnamed"}
                </p>
                {u.isPending && <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10"><Clock className="w-3 h-3 mr-1"/>Pending</Badge>}
                {!u.isActive && <Badge variant="destructive" className="text-[10px] h-4 px-1">Suspended</Badge>}
                <Badge className={`text-[10px] sm:text-xs ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{u.email ?? "\u2014"}</p>
              {u.barCouncilNumber && (
                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                  <p className="text-xs text-muted-foreground">Bar: {u.barCouncilNumber}</p>
                  {isExpiringSoon && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-500">
                      <AlertTriangle className="w-3 h-3" /> Expires soon
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto pl-7 sm:pl-0">
            {isEditing ? (
              <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={draftRole} onValueChange={(v) => setDraftRole(v as UserRole)}>
                  <SelectTrigger className="h-8 text-xs flex-1 sm:flex-none sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:text-green-600 shrink-0" disabled={saving} onClick={(e) => saveRole(e, u._id)}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground shrink-0" onClick={(e) => cancelEdit(e)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 w-full sm:w-auto"
                onClick={(e) => startEdit(e, u._id, u.role)}
              >
                Edit Role
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
}
