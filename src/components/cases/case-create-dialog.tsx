import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { useCreateCase } from "@/client/queries/cases";
import { CaseLifecycleSelect } from "@/components/cases/case-status-filters";
import { CaseTeamFields } from "@/components/cases/case-team-fields";
import { COURTS, PRACTICE_AREAS } from "@/lib/lex-constants.ts";
import { caseStatusWritePayload, type CaseLifecycleStatus } from "@/shared/contracts/case-ui";

export interface CaseCreateLawyer {
  _id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface CaseCreateClient {
  _id: string;
  fullName: string;
}

export interface CaseCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: CaseCreateClient[];
  lawyers: CaseCreateLawyer[];
  onCreated?: (created: { id?: string; _id?: string }) => void;
}

const emptyForm = {
  caseNumber: "",
  title: "",
  description: "",
  clientSummary: "",
  practiceArea: PRACTICE_AREAS[0],
  clientId: "",
  assignedLawyerId: "",
  teamMemberIds: [] as string[],
  status: "active" as CaseLifecycleStatus,
  court: COURTS[0],
  opposingCounsel: "",
};

export function CaseCreateDialog({
  open,
  onOpenChange,
  clients,
  lawyers,
  onCreated,
}: CaseCreateDialogProps) {
  const createCase = useCreateCase();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const reset = () => setForm(emptyForm);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.caseNumber || !form.title || !form.clientId || !form.assignedLawyerId) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      const statusWrite = caseStatusWritePayload(form.status);
      const created = (await createCase({
        caseNumber: form.caseNumber,
        title: form.title,
        description: form.description || undefined,
        clientSummary: form.clientSummary || undefined,
        practiceArea: form.practiceArea,
        clientId: form.clientId,
        assignedLawyerId: form.assignedLawyerId,
        teamMemberIds: [...new Set([form.assignedLawyerId, ...form.teamMemberIds])],
        status: statusWrite.status,
        closureOutcome: statusWrite.closureOutcome,
        court: form.court || undefined,
        opposingCounsel: form.opposingCounsel || undefined,
        filingDate: new Date().toISOString().split("T")[0],
      })) as { id?: string; _id?: string };
      toast.success("Case created successfully!");
      handleOpenChange(false);
      onCreated?.(created);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create case.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const staffLawyers = lawyers.filter((user) => user.role !== "client");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-lg"
        aria-labelledby="case-create-title"
        aria-describedby="case-create-description"
      >
        <DialogHeader>
          <DialogTitle id="case-create-title">Create New Case</DialogTitle>
          <DialogDescription id="case-create-description">
            Internal description stays on the file. Client-visible summary is optional and separate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="case-number">
              Case Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="case-number"
              ref={firstFieldRef}
              required
              placeholder="KTM/2083/123"
              value={form.caseNumber}
              onChange={(event) =>
                setForm((current) => ({ ...current, caseNumber: event.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="case-title">
              Case Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="case-title"
              required
              placeholder="Sharma Land Dispute Case"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="case-client">
                Client <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.clientId || undefined}
                onValueChange={(clientId) => setForm((current) => ({ ...current, clientId }))}
              >
                <SelectTrigger id="case-client" className="h-9 text-xs">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="case-lawyer">
                Responsible Lawyer <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.assignedLawyerId || undefined}
                onValueChange={(assignedLawyerId) =>
                  setForm((current) => {
                    const teamMemberIds = new Set(current.teamMemberIds);
                    if (current.assignedLawyerId) teamMemberIds.add(current.assignedLawyerId);
                    teamMemberIds.add(assignedLawyerId);
                    return { ...current, assignedLawyerId, teamMemberIds: [...teamMemberIds] };
                  })
                }
              >
                <SelectTrigger id="case-lawyer" className="h-9 text-xs">
                  <SelectValue placeholder="Select lawyer" />
                </SelectTrigger>
                <SelectContent>
                  {staffLawyers.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.assignedLawyerId ? (
            <CaseTeamFields
              lawyers={lawyers}
              assignedLawyerId={form.assignedLawyerId}
              teamMemberIds={form.teamMemberIds}
              showLeadSelect={false}
              onLeadChange={(assignedLawyerId) =>
                setForm((current) => {
                  const teamMemberIds = new Set(current.teamMemberIds);
                  if (current.assignedLawyerId) teamMemberIds.add(current.assignedLawyerId);
                  teamMemberIds.add(assignedLawyerId);
                  return { ...current, assignedLawyerId, teamMemberIds: [...teamMemberIds] };
                })
              }
              onTeamChange={(teamMemberIds) =>
                setForm((current) => ({ ...current, teamMemberIds }))
              }
            />
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="case-status">Status</Label>
            <CaseLifecycleSelect
              id="case-status"
              value={form.status}
              onChange={(status) => setForm((current) => ({ ...current, status }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="case-practice-area">Practice Area</Label>
              <Select
                value={form.practiceArea}
                onValueChange={(practiceArea) =>
                  setForm((current) => ({ ...current, practiceArea }))
                }
              >
                <SelectTrigger id="case-practice-area" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRACTICE_AREAS.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="case-court">Court Name</Label>
              <Select
                value={form.court}
                onValueChange={(court) => setForm((current) => ({ ...current, court }))}
              >
                <SelectTrigger id="case-court" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COURTS.map((court) => (
                    <SelectItem key={court} value={court}>
                      {court}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="case-opposing">Opposing Counsel</Label>
            <Input
              id="case-opposing"
              placeholder="Adv. Krishna Bhandari"
              value={form.opposingCounsel}
              onChange={(event) =>
                setForm((current) => ({ ...current, opposingCounsel: event.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="case-description">Internal Case Description</Label>
            <Textarea
              id="case-description"
              className="min-h-[60px] text-xs"
              placeholder="Internal notes, key concerns, property numbers…"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="case-client-summary">Client-visible Summary</Label>
            <Textarea
              id="case-client-summary"
              className="min-h-[60px] text-xs"
              placeholder="Optional summary the client may see. Leave blank to hide."
              value={form.clientSummary}
              onChange={(event) =>
                setForm((current) => ({ ...current, clientSummary: event.target.value }))
              }
            />
          </div>

          <DialogFooter className="pt-3 border-t border-border gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Case"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
