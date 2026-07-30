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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { User, AlertTriangle, Check, X, Search, Ban, Activity, Mail, Phone, CalendarDays, UserPlus, FileText, Key, Clock, ShieldCheck, MailWarning, History, Briefcase, RefreshCw } from "lucide-react";
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

export default function AdminUsersPage() {
  const users = useQuery(api.users.listUsers, {});
  const updateUser = useMutation(api.users.updateUser);
  const createUser = useMutation(api.users.createUser);
  const sendPasswordReset = useMutation(api.users.sendPasswordReset);

  // States for Edit Role inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftRole, setDraftRole] = useState<UserRole>("client");
  const [saving, setSaving] = useState(false);

  // States for Advanced Features
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "pending">("all");
  const [activeTab, setActiveTab] = useState("staff");
  
  // State for Create User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", role: "client" as UserRole, phone: "", barCouncilNumber: "" });
  
  // State for Profile Deep-Dive Modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const startEdit = (e: React.MouseEvent, userId: string, currentRole: UserRole) => {
    e.stopPropagation(); // Prevent opening profile modal
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
      await createUser({
        name: createForm.name,
        email: createForm.email,
        role: createForm.role,
        phone: createForm.phone,
        barCouncilNumber: createForm.barCouncilNumber || undefined
      });
      toast.success("User invited successfully!");
      setIsCreateOpen(false);
      setCreateForm({ name: "", email: "", role: "client", phone: "", barCouncilNumber: "" });
    } catch {
      toast.error("Failed to invite user");
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
  }, [searchQuery, statusFilter, activeTab]);

  const totalUsers = users?.length || 0;
  const pendingUsers = users?.filter(u => u.isPending).length || 0;
  const totalClients = users?.filter(u => u.role === 'client').length || 0;
  const totalStaff = users?.filter(u => ['partner', 'senior_associate', 'associate', 'paralegal'].includes(u.role)).length || 0;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Users & Roles</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage staff, clients, and administrators.</p>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Invite User
        </Button>
      </div>

      {/* MINI DASHBOARD */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Users</p>
              <h3 className="text-2xl font-bold">{totalUsers}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Active Staff</p>
              <h3 className="text-2xl font-bold">{totalStaff}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Pending Invites</p>
              <h3 className="text-2xl font-bold">{pendingUsers}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Clients</p>
              <h3 className="text-2xl font-bold">{totalClients}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, email, or bar council..." 
            className="pl-9 h-9" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="h-9">
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
      </div>

      {users === undefined && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      )}

      {filteredUsers !== undefined && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="staff">Staff / Advocates</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
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

      {/* CREATE USER MODAL */}
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

      {/* PROFILE DETAILS MODAL */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xl">{selectedUser.name}</div>
                    <div className="flex gap-2 mt-1">
                      <Badge className={`text-xs ${ROLE_COLORS[selectedUser.role]}`}>{ROLE_LABELS[selectedUser.role]}</Badge>
                      {selectedUser.isPending && <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10"><Clock className="w-3 h-3 mr-1"/>Pending</Badge>}
                      {!selectedUser.isActive && <Badge variant="destructive" className="text-xs">Suspended</Badge>}
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="py-4 space-y-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contact Info</h4>
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <Mail className="w-4 h-4 text-muted-foreground" /> {selectedUser.email || "\u2014"}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <Phone className="w-4 h-4 text-muted-foreground" /> {selectedUser.phone || "\u2014"}
                  </div>
                </div>

                {selectedUser.role !== 'client' && selectedUser.role !== 'admin' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                      Professional Info
                    </h4>
                    {selectedUser.barCouncilNumber && (
                      <div className="flex items-center gap-3 text-sm text-foreground">
                        <FileText className="w-4 h-4 text-muted-foreground" /> Bar No: {selectedUser.barCouncilNumber}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm text-foreground">
                      <Briefcase className="w-4 h-4 text-muted-foreground" /> Practice Area: Corporate Law
                    </div>
                    {selectedUser.barCouncilExpiry && (
                      <div className="flex items-center gap-3 text-sm text-foreground">
                        <CalendarDays className="w-4 h-4 text-muted-foreground" /> Expiry: {new Date(selectedUser.barCouncilExpiry).toLocaleDateString()}
                      </div>
                    )}
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
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</h4>
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <History className="w-4 h-4 text-muted-foreground" /> 
                    <span className="text-muted-foreground">Today, 10:45 AM:</span> {selectedUser.isPending ? "Invitation Email Sent" : "Logged in successfully"}
                  </div>
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
                        if(selectedUser.isPending) {
                          toast.info(`📧 Resending invitation to ${selectedUser.email}`);
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

              <DialogFooter className="flex justify-between sm:justify-between items-center border-t border-border pt-4 mt-2">
                <Button 
                  variant={selectedUser.isActive ? "destructive" : "default"} 
                  onClick={() => toggleUserStatus(selectedUser)}
                >
                  <Ban className="w-4 h-4 mr-2" /> 
                  {selectedUser.isActive ? "Suspend Account" : "Reactivate Account"}
                </Button>
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

    return (
      <Card 
        key={u._id} 
        className={`hover:shadow-md transition-all cursor-pointer ${!u.isActive ? "opacity-60 grayscale-[0.5]" : ""}`}
        onClick={() => setSelectedUser(u)}
      >
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-semibold truncate ${!u.isActive ? "line-through text-muted-foreground" : u.isPending ? "text-amber-600 dark:text-amber-500" : "text-foreground"}`}>
                  {u.name ?? "Unnamed"}
                </p>
                {u.isPending && <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10"><Clock className="w-3 h-3 mr-1"/>Pending</Badge>}
                {!u.isActive && <Badge variant="destructive" className="text-[10px] h-4 px-1">Suspended</Badge>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{u.email ?? "\u2014"}</p>
              {u.barCouncilNumber && (
                <div className="flex items-center gap-1 mt-0.5">
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

          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditing ? (
              <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                <Select value={draftRole} onValueChange={(v) => setDraftRole(v as UserRole)}>
                  <SelectTrigger className="h-7 text-xs w-32 sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500 hover:text-green-600" disabled={saving} onClick={(e) => saveRole(e, u._id)}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={(e) => cancelEdit(e)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge className={`text-xs hidden sm:inline-flex ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs h-7" 
                  onClick={(e) => startEdit(e, u._id, u.role)}
                >
                  Edit Role
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
}
