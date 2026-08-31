"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { isValidMeetingUrl, meetingPlatformHint } from "@/shared/crm/appointment-dates.ts";
import { useSystemSettings } from "@/client/queries/identity";
import { toast } from "sonner";

export type MeetingLinkDialogTarget = {
  id: string;
  status: "pending" | "confirmed";
  clientName?: string;
} | null;

type MeetingLinkDialogProps = {
  target: MeetingLinkDialogTarget;
  onOpenChange: (open: boolean) => void;
  onSave: (args: {
    appointmentId: string;
    status: "pending" | "confirmed";
    meetingLink?: string;
  }) => Promise<void>;
};

export function MeetingLinkDialog({ target, onOpenChange, onSave }: MeetingLinkDialogProps) {
  const settings = useSystemSettings();
  const hint = meetingPlatformHint(settings?.defaultMeetingPlatform);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (target) setValue("");
  }, [target?.id]);

  const handleOpenChange = (open: boolean) => {
    if (!open) setValue("");
    onOpenChange(open);
  };

  const save = async () => {
    if (!target) return;
    if (!isValidMeetingUrl(value)) {
      toast.error("Enter a valid http(s) URL, or leave blank.");
      return;
    }
    setBusy(true);
    try {
      const link = value.trim();
      await onSave({
        appointmentId: target.id,
        status: target.status,
        meetingLink: link || undefined,
      });
      toast.success(link ? "Meeting link saved." : "Updated without a meeting link.");
      setValue("");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save meeting link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm bg-background border-border">
        <DialogHeader>
          <DialogTitle>Add meeting link</DialogTitle>
          <DialogDescription>
            {target?.clientName
              ? `Optional ${hint.label} URL for ${target.clientName}. Leave blank to confirm without a link.`
              : hint.description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="shared-meeting-link">{hint.label} URL</Label>
          <Input
            id="shared-meeting-link"
            type="url"
            placeholder={hint.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
          />
          <p className="text-[11px] text-muted-foreground">{hint.description}</p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
