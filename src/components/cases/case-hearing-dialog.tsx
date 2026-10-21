"use client";

import { useEffect, useState } from "react";
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
import { BsDateField } from "@/components/ui/bs-date-field";
import { useHearingCommands } from "@/client/queries/hearings";
import { COURTS } from "@/lib/lex-constants.ts";
import { formatBs, gregorianToBs } from "@/lib/nepali-calendar.ts";

type CaseHearingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  defaultCourt?: string | null;
  defaultJudge?: string | null;
  description?: string;
};

export function CaseHearingDialog({
  open,
  onOpenChange,
  caseId,
  defaultCourt,
  defaultJudge,
  description,
}: CaseHearingDialogProps) {
  const { createHearing } = useHearingCommands();
  const [court, setCourt] = useState("");
  const [judge, setJudge] = useState("");
  const [dateGregorian, setDateGregorian] = useState("");
  const [dateBs, setDateBs] = useState("");
  const [time, setTime] = useState("10:00");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);

  const courtOptions =
    defaultCourt && !COURTS.includes(defaultCourt) ? [defaultCourt, ...COURTS] : COURTS;

  useEffect(() => {
    if (!open) return;
    setCourt(defaultCourt?.trim() || "");
    setJudge(defaultJudge?.trim() || "");
    setDateGregorian("");
    setDateBs("");
    setTime("10:00");
    setPurpose("");
  }, [open, defaultCourt, defaultJudge]);

  const handleGregorianChange = (value: string) => {
    setDateGregorian(value);
    if (!value) {
      setDateBs("");
      return;
    }
    try {
      setDateBs(formatBs(gregorianToBs(value)));
    } catch {
      setDateBs("");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!court.trim() || !dateGregorian || !dateBs) {
      toast.error("Court and hearing date are required.");
      return;
    }
    setBusy(true);
    try {
      await createHearing({
        caseId,
        court: court.trim(),
        judge: judge.trim() || undefined,
        dateGregorian,
        dateBs,
        time: time ? time.slice(0, 5) : undefined,
        purpose: purpose.trim() || undefined,
      });
      toast.success("Hearing scheduled.");
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to schedule hearing.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-labelledby="case-hearing-title">
        <DialogHeader>
          <DialogTitle id="case-hearing-title">Schedule hearing</DialogTitle>
          <DialogDescription>
            {description ??
              "Adds a hearing on this case file using the existing hearings API. No separate deadlines table."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="case-hearing-court" className="text-xs font-medium">
              Court
            </label>
            <select
              id="case-hearing-court"
              required
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={court}
              onChange={(event) => setCourt(event.target.value)}
            >
              <option value="">Select court</option>
              {courtOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
              <label htmlFor="case-hearing-bs" className="text-xs font-medium">
                Hearing date
              </label>
              <BsDateField
                id="case-hearing-bs"
                required
                value={dateGregorian}
                onDateChange={handleGregorianChange}
              />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="case-hearing-time" className="text-xs font-medium">
                Time
              </label>
              <Input
                id="case-hearing-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="case-hearing-judge" className="text-xs font-medium">
                Judge
              </label>
              <Input
                id="case-hearing-judge"
                value={judge}
                onChange={(event) => setJudge(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="case-hearing-purpose" className="text-xs font-medium">
              Purpose
            </label>
            <Input
              id="case-hearing-purpose"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Schedule hearing"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
