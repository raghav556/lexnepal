import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { User, AlertTriangle, Check, X } from "lucide-react";
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftRole, setDraftRole] = useState<UserRole>("client");
  const [saving, setSaving] = useState(false);

  const startEdit = (userId: string, currentRole: UserRole) => {
    setEditingId(userId);
    setDraftRole(currentRole);
  };

  const cancelEdit = () => { setEditingId(null); };

  const saveRole = async (userId: Id<"users">) => {
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

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Users & Roles</h1>
        <Button size="sm" onClick={() => toast.info("User invitation coming in a future milestone!")}>Invite User</Button>
      </div>

      {users === undefined && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      )}

      {users !== undefined && (
        <div className="grid grid-cols-1 gap-3">
          {users.map((u) => {
            const barExpiryDate = u.barCouncilExpiry ? new Date(u.barCouncilExpiry) : null;
            const isExpiringSoon = barExpiryDate && barExpiryDate < new Date(Date.now() + 90 * 86400000);
            const isEditing = editingId === u._id;

            return (
              <Card key={u._id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{u.name ?? "Unnamed"}</p>
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
                      <>
                        <Select value={draftRole} onValueChange={(v) => setDraftRole(v as UserRole)}>
                          <SelectTrigger className="h-7 text-xs w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_ROLES.map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500 hover:text-green-600" disabled={saving} onClick={() => saveRole(u._id)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={cancelEdit}>
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge className={`text-xs ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</Badge>
                        <Badge className={`text-xs ${u.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-800"}`}>
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="ghost" size="sm" className="text-xs cursor-pointer" onClick={() => startEdit(u._id, u.role)}>Edit Role</Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
