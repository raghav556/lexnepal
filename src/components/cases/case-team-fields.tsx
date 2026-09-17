"use client";

import { toast } from "sonner";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

export interface CaseTeamLawyer {
  _id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export function CaseTeamFields({
  lawyers,
  assignedLawyerId,
  teamMemberIds,
  onLeadChange,
  onTeamChange,
  showLeadSelect = true,
}: {
  lawyers: CaseTeamLawyer[];
  assignedLawyerId: string;
  teamMemberIds: string[];
  onLeadChange: (id: string) => void;
  onTeamChange: (ids: string[]) => void;
  showLeadSelect?: boolean;
}) {
  const staff = lawyers.filter((user) => user.role !== "client");

  const handleLeadChange = (nextLeadId: string) => {
    const nextTeam = new Set(teamMemberIds);
    if (assignedLawyerId) nextTeam.add(assignedLawyerId);
    nextTeam.add(nextLeadId);
    onLeadChange(nextLeadId);
    onTeamChange([...nextTeam]);
  };

  const toggleTeamMember = (userId: string, checked: boolean) => {
    if (!checked && userId === assignedLawyerId) {
      toast.error("Reassign the Responsible Lawyer before removing them from the Case Team");
      return;
    }
    const next = new Set(teamMemberIds);
    if (checked) next.add(userId);
    else next.delete(userId);
    if (assignedLawyerId) next.add(assignedLawyerId);
    onTeamChange([...next]);
  };

  return (
    <div className="space-y-3">
      {showLeadSelect ? (
        <div className="space-y-1">
          <Label htmlFor="case-responsible-lawyer">Responsible Lawyer</Label>
          <Select value={assignedLawyerId || undefined} onValueChange={handleLeadChange}>
            <SelectTrigger id="case-responsible-lawyer" className="h-9 text-xs bg-background">
              <SelectValue placeholder="Select lawyer" />
            </SelectTrigger>
            <SelectContent>
              {staff.map((user) => (
                <SelectItem key={user._id} value={user._id}>
                  {user.name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium">Case Team</legend>
        <p className="text-[11px] text-muted-foreground">
          The Responsible Lawyer stays on the team. Changing lead keeps the previous lawyer unless
          you remove them after reassignment.
        </p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {staff.map((user) => {
            const checked = teamMemberIds.includes(user._id) || user._id === assignedLawyerId;
            const isLead = user._id === assignedLawyerId;
            return (
              <label
                key={user._id}
                className="flex items-center gap-2 rounded-md border border-dashboard-border bg-dashboard-panel px-2.5 py-1.5 text-xs"
              >
                <input
                  type="checkbox"
                  className="size-3.5 accent-primary"
                  checked={checked}
                  disabled={isLead}
                  onChange={(event) => toggleTeamMember(user._id, event.target.checked)}
                />
                <span className="truncate">{user.name || user.email}</span>
                {isLead ? (
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                    Lead
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
