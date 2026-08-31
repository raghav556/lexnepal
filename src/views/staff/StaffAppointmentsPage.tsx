"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAppointments, useAppointmentCommands } from "@/client/queries/crm";
import { Button } from "@/components/ui/button.tsx";
import {
  DashboardButton,
  DashboardSection,
  DashboardStatusLabel,
  EmptyState,
  PortalPageShell,
  StatusBadge,
} from "@/components/dashboard";
import { DASHBOARD_TONE_PANEL_CLASSES } from "@/lib/dashboard-semantics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog.tsx";
import {
  MeetingLinkDialog,
  type MeetingLinkDialogTarget,
} from "@/components/crm/MeetingLinkDialog.tsx";
import {
  Calendar,
  Clock,
  Video,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { formatAppointmentDate, todayIsoInFirmTz } from "@/shared/crm/appointment-dates.ts";

type AptRow = {
  id?: string;
  _id?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  practiceArea?: string;
  date?: string;
  timeSlot?: string;
  notes?: string;
  status?: string;
  meetingLink?: string | null;
};

function aptKey(a: AptRow) {
  return String(a.id || a._id || "");
}

export default function StaffAppointmentsPage() {
  const user = useCurrentUser();
  const meId = user?.id ?? user?._id;
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("appointment")?.trim() || null;

  const {
    data: appointments = [],
    isLoading,
    isError,
  } = useAppointments(meId ? { assignedLawyerId: String(meId) } : undefined);
  const { updateStatus } = useAppointmentCommands();

  const [statusFilter, setStatusFilter] = useState("all");
  const [confirm, setConfirm] = useState<ConfirmDialogState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [meetingLinkTarget, setMeetingLinkTarget] = useState<MeetingLinkDialogTarget>(null);
  const highlightScrolled = useRef<string | null>(null);
  const today = todayIsoInFirmTz();

  const filteredAppointments = useMemo(() => {
    const list = appointments as AptRow[];
    if (statusFilter === "all") return list;
    return list.filter((a) => a.status === statusFilter);
  }, [appointments, statusFilter]);

  useEffect(() => {
    if (!highlightId || isLoading) return;
    if (highlightScrolled.current === highlightId) return;
    const el = document.getElementById(`appointment-${highlightId}`);
    if (!el) return;
    highlightScrolled.current = highlightId;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, isLoading, filteredAppointments]);

  const requestCancel = (apt: AptRow) => {
    const id = aptKey(apt);
    setConfirm({
      title: "Cancel appointment?",
      description: `Cancel booking for ${apt.clientName || "this client"} on ${apt.date} at ${apt.timeSlot}?`,
      confirmLabel: "Cancel appointment",
      destructive: true,
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await updateStatus.mutateAsync({ appointmentId: id, status: "cancelled" });
          toast.success("Appointment cancelled.");
        } catch {
          toast.error("Failed to cancel appointment.");
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const handleStatusUpdate = async (id: string, status: "confirmed" | "completed") => {
    try {
      await updateStatus.mutateAsync({ appointmentId: id, status });
      toast.success(`Appointment marked as ${status}.`);
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Meeting link copied.");
  };

  return (
    <PortalPageShell
      portal="staff"
      loading={isLoading || !meId}
      loadingLabel="Loading appointments…"
      eyebrow="Consultations"
      title="My appointments"
      description="Consultations assigned to you. Times are firm calendar (Asia/Kathmandu)."
      icon={Calendar}
      actions={
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-full md:w-[160px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="grid grid-cols-1 gap-4 max-w-5xl">
        {isError ? (
          <EmptyState
            title="Failed to load"
            description="Failed to load appointments. Refresh and try again."
            tone="danger"
          />
        ) : filteredAppointments.length === 0 ? (
          <EmptyState
            title="No appointments"
            description="You have no appointments for this filter."
            icon={Calendar}
          />
        ) : (
          filteredAppointments.map((apt) => {
            const id = aptKey(apt);
            const highlighted = highlightId === id;
            const isPast = (apt.date ?? "") < today && apt.status !== "cancelled";
            return (
              <DashboardSection
                key={id}
                id={`appointment-${id}`}
                className={`overflow-hidden transition-colors ${
                  apt.status === "cancelled" ? "opacity-70 border-dashed" : ""
                } ${highlighted ? "ring-2 ring-dashboard-primary border-dashboard-primary" : ""}`}
              >
                <div className="flex flex-col md:flex-row">
                  <div className="bg-dashboard-neutral-soft p-6 md:w-56 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-dashboard-border">
                    <Calendar className="w-8 h-8 text-dashboard-primary mb-2" aria-hidden />
                    <span className="font-semibold text-lg">{apt.date}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {apt.date ? formatAppointmentDate(apt.date) : ""}
                    </p>
                    <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
                      <Clock className="w-4 h-4" />
                      <span>{apt.timeSlot}</span>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2 gap-3">
                        <div>
                          <h3 className="text-xl font-serif font-bold">{apt.clientName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {apt.clientPhone}
                            {apt.clientEmail && ` • ${apt.clientEmail}`}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <DashboardStatusLabel
                            status={apt.status}
                            className="uppercase tracking-wider"
                          />
                          {apt.status === "pending" && (
                            <span className="text-[11px] text-muted-foreground">
                              Awaiting your confirmation
                            </span>
                          )}
                          {isPast && apt.status === "confirmed" && (
                            <span className="text-[11px] text-dashboard-warning-foreground">
                              Past date — mark completed?
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mb-4">
                        <StatusBadge tone="information" className="mb-2">
                          {apt.practiceArea}
                        </StatusBadge>
                        {apt.notes && (
                          <p className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-md">
                            {apt.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {apt.meetingLink && apt.status !== "cancelled" && (
                      <div
                        className={`mb-4 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${DASHBOARD_TONE_PANEL_CLASSES.information}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Video
                            className="w-4 h-4 text-dashboard-information shrink-0"
                            aria-hidden
                          />
                          <p className="text-xs truncate text-dashboard-information-foreground">
                            {apt.meetingLink}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <DashboardButton
                            variant="secondary"
                            size="sm"
                            onClick={() => copyToClipboard(apt.meetingLink!)}
                          >
                            <Copy className="w-4 h-4 mr-1" aria-hidden /> Copy
                          </DashboardButton>
                          <DashboardButton
                            size="sm"
                            onClick={() => window.open(apt.meetingLink!, "_blank")}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" aria-hidden /> Join
                          </DashboardButton>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border mt-2">
                      {apt.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => requestCancel(apt)}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => handleStatusUpdate(id, "confirmed")}
                          >
                            <CheckCircle className="w-4 h-4" /> Confirm
                          </Button>
                          <Button
                            size="sm"
                            className="gap-2"
                            onClick={() =>
                              setMeetingLinkTarget({
                                id,
                                status: "confirmed",
                                clientName: apt.clientName,
                              })
                            }
                          >
                            <Video className="w-4 h-4" /> Add Meeting Link
                          </Button>
                        </>
                      )}

                      {apt.status === "confirmed" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => requestCancel(apt)}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Cancel
                          </Button>
                          {!apt.meetingLink && (
                            <Button
                              size="sm"
                              className="gap-2"
                              onClick={() =>
                                setMeetingLinkTarget({
                                  id,
                                  status: "confirmed",
                                  clientName: apt.clientName,
                                })
                              }
                            >
                              <Video className="w-4 h-4" /> Add Meeting Link
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleStatusUpdate(id, "completed")}
                          >
                            Mark Completed
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </DashboardSection>
            );
          })
        )}
      </div>

      <MeetingLinkDialog
        target={meetingLinkTarget}
        onOpenChange={(open) => {
          if (!open) setMeetingLinkTarget(null);
        }}
        onSave={async (args) => {
          await updateStatus.mutateAsync(args);
        }}
      />

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
