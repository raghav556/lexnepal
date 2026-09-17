"use client";

import { useState } from "react";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCasePartyCommands } from "@/client/queries/cases";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { DashboardSection, DashboardStatusLabel, EmptyState } from "@/components/dashboard";
import {
  CASE_PARTY_SIDE_LABELS,
  CASE_PARTY_SIDES,
  CASE_PARTY_TYPE_LABELS,
  CASE_PARTY_TYPES,
  type CasePartySide,
  type CasePartyType,
} from "@/shared/contracts/case-ui";
import type { StaffCasePartyDto } from "@/shared/contracts/staff-case";

const NONE_CLIENT = "none";

interface PartyFormState {
  name: string;
  side: CasePartySide;
  roleLabel: string;
  partyType: CasePartyType;
  clientId: string;
  clientVisible: boolean;
}

const emptyForm = (): PartyFormState => ({
  name: "",
  side: "other",
  roleLabel: "",
  partyType: "person",
  clientId: "",
  clientVisible: false,
});

function toForm(party: StaffCasePartyDto): PartyFormState {
  return {
    name: party.name,
    side: party.side,
    roleLabel: party.roleLabel ?? "",
    partyType: party.partyType,
    clientId: party.clientId ?? "",
    clientVisible: party.clientVisible,
  };
}

export function CasePartiesEditor({
  caseId,
  parties,
  clients,
}: {
  caseId: string;
  parties: StaffCasePartyDto[];
  clients: Array<{ _id: string; fullName: string }>;
}) {
  const commands = useCasePartyCommands();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PartyFormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmDialogState>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (party: StaffCasePartyDto) => {
    setEditingId(party.id);
    setForm(toForm(party));
    setOpen(true);
  };

  const payload = () => ({
    name: form.name.trim(),
    side: form.side,
    roleLabel: form.roleLabel.trim() || null,
    partyType: form.partyType,
    clientId: form.clientId || null,
    clientVisible: form.clientVisible,
  });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Party name is required.");
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        await commands.update(caseId, editingId, payload());
        toast.success("Party updated");
      } else {
        await commands.create(caseId, { ...payload(), sortOrder: parties.length });
        toast.success("Party added");
      }
      setOpen(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to save party.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardSection
      title="Parties"
      description="People and organisations on the file. Not created from the CRM client automatically."
      actions={
        <Button size="sm" variant="outline" type="button" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Party
        </Button>
      }
    >
      {parties.length === 0 ? (
        <EmptyState
          title="No parties yet"
          description="Add opposing or other parties here. Visibility to the client is off unless you turn it on."
        />
      ) : (
        <div className="space-y-2">
          {parties.map((party) => (
            <div
              key={party.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashboard-border bg-dashboard-panel p-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-sm">{party.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <DashboardStatusLabel
                    status={party.side}
                    label={CASE_PARTY_SIDE_LABELS[party.side]}
                    className="text-[10px] uppercase tracking-wider"
                  />
                  <DashboardStatusLabel
                    status={party.partyType}
                    label={CASE_PARTY_TYPE_LABELS[party.partyType]}
                    className="text-[10px] uppercase tracking-wider"
                  />
                  {party.roleLabel ? (
                    <span className="text-[11px] text-muted-foreground">{party.roleLabel}</span>
                  ) : null}
                  <DashboardStatusLabel
                    status={party.clientVisible ? "verified" : "draft"}
                    label={party.clientVisible ? "Visible to client" : "Hidden from client"}
                    className="text-[10px] uppercase tracking-wider"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" type="button" onClick={() => openEdit(party)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() =>
                    setConfirm({
                      title: "Remove party",
                      description: `Remove ${party.name} from this case? This does not delete the CRM client.`,
                      confirmLabel: "Remove",
                      destructive: true,
                      onConfirm: async () => {
                        await commands.remove(caseId, party.id);
                        toast.success("Party removed");
                        setConfirm(null);
                      },
                    })
                  }
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" aria-labelledby="case-party-title">
          <DialogHeader>
            <DialogTitle id="case-party-title">
              {editingId ? "Edit party" : "Add party"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="party-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="party-name"
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="party-side">Side</Label>
                <Select
                  value={form.side}
                  onValueChange={(side) =>
                    setForm((current) => ({ ...current, side: side as CasePartySide }))
                  }
                >
                  <SelectTrigger id="party-side" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_PARTY_SIDES.map((side) => (
                      <SelectItem key={side} value={side}>
                        {CASE_PARTY_SIDE_LABELS[side]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="party-type">Type</Label>
                <Select
                  value={form.partyType}
                  onValueChange={(partyType) =>
                    setForm((current) => ({ ...current, partyType: partyType as CasePartyType }))
                  }
                >
                  <SelectTrigger id="party-type" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_PARTY_TYPES.map((partyType) => (
                      <SelectItem key={partyType} value={partyType}>
                        {CASE_PARTY_TYPE_LABELS[partyType]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="party-role">Role label</Label>
              <Input
                id="party-role"
                placeholder="Plaintiff, defendant, witness…"
                value={form.roleLabel}
                onChange={(event) =>
                  setForm((current) => ({ ...current, roleLabel: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="party-client">CRM client (optional)</Label>
              <Select
                value={form.clientId || NONE_CLIENT}
                onValueChange={(clientId) =>
                  setForm((current) => ({
                    ...current,
                    clientId: clientId === NONE_CLIENT ? "" : clientId,
                  }))
                }
              >
                <SelectTrigger id="party-client" className="h-9 text-xs">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_CLIENT}>None</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                className="size-3.5 accent-primary"
                checked={form.clientVisible}
                onChange={(event) =>
                  setForm((current) => ({ ...current, clientVisible: event.target.checked }))
                }
              />
              Visible to client
            </label>
            <DialogFooter className="gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog state={confirm} onOpenChange={(next) => !next && setConfirm(null)} />
    </DashboardSection>
  );
}
