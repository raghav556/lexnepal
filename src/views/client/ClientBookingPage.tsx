"use client";

import { useMemo, useState } from "react";
import { useAvailableSlots, useAppointmentCommands, useAppointments } from "@/client/queries/crm";
import { useMyClient } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Phone,
  Users,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Copy,
  HelpCircle,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import {
  addCalendarDaysIso,
  formatAppointmentDate,
  todayIsoInFirmTz,
} from "@/shared/crm/appointment-dates.ts";
import {
  DashboardButton,
  DashboardListRow,
  DashboardListSkeleton,
  DashboardSection,
  DashboardStatusLabel,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { DASHBOARD_METRIC_TONES } from "@/lib/dashboard-semantics";

export default function ClientBookingPage() {
  const clientRecord = useMyClient();
  const clientId = clientRecord?._id;
  const cases = useCases(clientId ? { clientId } : {}) || [];

  const assignedLawyerId = useMemo(() => {
    const active = cases.find((c: { status?: string }) => c.status === "active") || cases[0];
    return (active as { assignedLawyerId?: string } | undefined)?.assignedLawyerId;
  }, [cases]);

  const [selectedDateIso, setSelectedDateIso] = useState(() => todayIsoInFirmTz());
  const today = todayIsoInFirmTz();

  const { data: availableSlots = [] } = useAvailableSlots(selectedDateIso);
  const { bookConsultation } = useAppointmentCommands();
  const { data: appointments = [] } = useAppointments({});
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"in_person" | "virtual" | "phone">("virtual");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const nextDay = () => {
    setSelectedDateIso((prev) => addCalendarDaysIso(prev, 1));
    setSelectedTime(null);
  };

  const prevDay = () => {
    const prev = addCalendarDaysIso(selectedDateIso, -1);
    if (prev >= today) {
      setSelectedDateIso(prev);
      setSelectedTime(null);
    }
  };

  const handleBook = async () => {
    if (!selectedTime) {
      toast.error("Please select a time slot");
      return;
    }
    if (!clientRecord) {
      toast.error("No client profile linked to this account.");
      return;
    }
    setIsSubmitting(true);
    try {
      const practiceArea =
        selectedType === "virtual"
          ? "Virtual Consultation"
          : selectedType === "phone"
            ? "Phone Consultation"
            : "In-Person Consultation";
      await bookConsultation.mutateAsync({
        clientName: clientRecord.fullName,
        clientEmail: clientRecord.email,
        clientPhone: clientRecord.phone || "N/A",
        clientId: clientRecord._id as string,
        practiceArea,
        date: selectedDateIso,
        timeSlot: selectedTime,
        notes: notes || undefined,
        assignedLawyerId: assignedLawyerId,
      });
      setShowSuccess(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to book appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeDetails = {
    virtual: {
      icon: Video,
      label: "Virtual / Video",
      desc: "Secure video conference link provided upon confirmation",
    },
    in_person: {
      icon: Users,
      label: "In-Person Office",
      desc: "At Srimar Law Chambers, Kathmandu",
    },
    phone: {
      icon: Phone,
      label: "Phone Call",
      desc: "Assigned lawyer will call your registered contact number",
    },
  };

  if (clientRecord === undefined) {
    return (
      <PortalPageShell
        portal="client"
        loading
        loadingLabel="Loading appointment scheduling…"
        title="Book Consultation"
      >
        <div />
      </PortalPageShell>
    );
  }

  if (clientRecord === null) {
    return (
      <PortalPageShell
        portal="client"
        decorated
        showTodayDate
        eyebrow="Consultation Desk"
        title="Book Legal Consultation"
        description="Schedule a discussion with our advocates."
        icon={CalendarIcon}
      >
        <EmptyState
          title="No client profile linked"
          description="Your portal account is not linked to a client profile yet. Contact the firm to book consultations."
          icon={CalendarIcon}
        />
      </PortalPageShell>
    );
  }

  const upcomingAppointments = appointments.filter(
    (a: any) => a.status === "scheduled" || a.status === "confirmed",
  );

  const metrics = [
    {
      label: "Consultation Modes",
      value: "3 Options",
      icon: Video,
      tone: "primary" as const,
      helperText: "Virtual, In-Person, Phone",
    },
    {
      label: "Firm Timezone",
      value: "Asia/Kathmandu",
      icon: Clock,
      tone: "information" as const,
      helperText: "Nepal Standard Time (NPT)",
    },
    {
      label: "Upcoming Appointments",
      value: String(upcomingAppointments.length),
      icon: CalendarDays,
      tone: upcomingAppointments.length > 0 ? ("warning" as const) : ("success" as const),
      helperText: "Scheduled consultations",
    },
  ];

  if (showSuccess) {
    return (
      <PortalPageShell
        portal="client"
        decorated
        showTodayDate
        eyebrow="Consultation Desk"
        title="Booking Request Submitted"
        description="Your consultation booking has been recorded."
        icon={CalendarIcon}
      >
        <div className="max-w-2xl mx-auto">
          <DashboardSection title="Booking Request Submitted">
            <div className="p-6 sm:p-8 text-center flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-dashboard-success-soft border border-dashboard-success/30 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-dashboard-success" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground">
                Request Received by Firm
              </h2>
              <p className="text-dashboard-neutral text-sm max-w-md">
                Your {typeDetails[selectedType].label} request for{" "}
                <strong className="text-foreground">
                  {formatAppointmentDate(selectedDateIso)}
                </strong>{" "}
                at <strong className="text-foreground">{selectedTime}</strong> is currently pending
                confirmation from our scheduling desk.
              </p>
              <div className="p-4 bg-dashboard-neutral-soft rounded-xl border border-dashboard-border text-xs text-left w-full space-y-2">
                <div className="flex justify-between">
                  <span className="text-dashboard-neutral">Client:</span>
                  <span className="font-semibold text-foreground">{clientRecord.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dashboard-neutral">Timezone:</span>
                  <span className="font-semibold text-foreground">Asia/Kathmandu (NPT)</span>
                </div>
                {notes && (
                  <div className="pt-2 border-t border-dashboard-border">
                    <span className="text-dashboard-neutral block mb-1">Notes:</span>
                    <p className="italic text-foreground">{notes}</p>
                  </div>
                )}
              </div>
              <DashboardButton
                className="w-full sm:w-auto"
                onClick={() => {
                  setShowSuccess(false);
                  setSelectedTime(null);
                  setNotes("");
                }}
              >
                Book another appointment
              </DashboardButton>
            </div>
          </DashboardSection>
        </div>
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell
      portal="client"
      decorated
      showTodayDate
      eyebrow="Consultation Desk"
      title="Book Legal Consultation"
      description="Schedule a confidential in-person or video consultation with our legal advocates in Kathmandu."
      icon={CalendarIcon}
      metrics={metrics}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DashboardSection title="1. Select Consultation Mode">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["virtual", "in_person", "phone"] as const).map((type) => {
                const Icon = typeDetails[type].icon;
                const isSelected = selectedType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-dashboard-primary bg-dashboard-primary-soft"
                        : "border-dashboard-border bg-dashboard-panel hover:bg-dashboard-panel-hover"
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 mb-2 ${isSelected ? "text-dashboard-primary" : "text-dashboard-neutral"}`}
                    />
                    <span className="font-bold text-sm text-foreground">
                      {typeDetails[type].label}
                    </span>
                    <span className="text-[11px] text-dashboard-neutral mt-1 leading-snug">
                      {typeDetails[type].desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </DashboardSection>

          <DashboardSection
            title="2. Choose Date & Time Slot"
            actions={
              <span className="text-xs text-dashboard-neutral font-medium">
                Timezone: Asia/Kathmandu (NPT)
              </span>
            }
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-dashboard-neutral-soft rounded-xl border border-dashboard-border">
                <DashboardButton
                  variant="outline"
                  size="sm"
                  onClick={prevDay}
                  disabled={selectedDateIso <= today}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous Day
                </DashboardButton>
                <div className="text-center">
                  <p className="text-sm font-bold text-foreground">
                    {formatAppointmentDate(selectedDateIso)}
                  </p>
                  <span className="text-xs text-dashboard-neutral font-mono">
                    {selectedDateIso}
                  </span>
                </div>
                <DashboardButton variant="outline" size="sm" onClick={nextDay}>
                  Next Day <ChevronRight className="w-4 h-4 ml-1" />
                </DashboardButton>
              </div>

              <div>
                <p className="text-xs font-semibold text-dashboard-neutral mb-2">
                  Available Time Slots
                </p>
                {availableSlots === undefined ? (
                  <DashboardListSkeleton rows={2} />
                ) : availableSlots.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-dashboard-border rounded-xl bg-dashboard-neutral-soft/50">
                    <p className="text-xs text-dashboard-neutral font-medium">
                      No consultation slots available on this date.
                    </p>
                    <DashboardButton
                      variant="ghost"
                      size="sm"
                      onClick={nextDay}
                      className="mt-2 text-xs"
                    >
                      Try next day →
                    </DashboardButton>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {availableSlots.map((time: string) => {
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setSelectedTime(time)}
                          className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-dashboard-primary text-dashboard-primary-foreground border-dashboard-primary shadow-xs"
                              : "bg-dashboard-panel text-foreground border-dashboard-border hover:border-dashboard-primary/50"
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </DashboardSection>

          <DashboardSection title="3. Additional Notes (Optional)">
            <textarea
              className="w-full min-h-[90px] p-3 text-xs rounded-xl border border-dashboard-border bg-dashboard-panel focus:outline-none focus:ring-2 focus:ring-dashboard-primary"
              placeholder="Briefly state your matter summary, urgent questions, or reference case number..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </DashboardSection>
        </div>

        <div className="space-y-6">
          <DashboardSection title="Booking Summary" icon={CheckCircle2}>
            <div className="space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-dashboard-border">
                  <span className="text-dashboard-neutral">Client:</span>
                  <span className="font-semibold text-foreground">{clientRecord.fullName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-dashboard-border">
                  <span className="text-dashboard-neutral">Format:</span>
                  <span className="font-semibold text-foreground">
                    {typeDetails[selectedType].label}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-dashboard-border">
                  <span className="text-dashboard-neutral">Date:</span>
                  <span className="font-semibold text-foreground">
                    {formatAppointmentDate(selectedDateIso)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-dashboard-border">
                  <span className="text-dashboard-neutral">Time:</span>
                  <span className="font-semibold text-foreground">
                    {selectedTime || "Select a slot"}
                  </span>
                </div>
              </div>

              <DashboardButton
                className="w-full bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-foreground font-semibold"
                disabled={!selectedTime || isSubmitting}
                onClick={handleBook}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirming...
                  </>
                ) : (
                  "Confirm Booking Request"
                )}
              </DashboardButton>
            </div>
          </DashboardSection>

          <DashboardSection title="Your Appointments" icon={CalendarDays}>
            {appointments === undefined ? (
              <DashboardListSkeleton rows={3} />
            ) : appointments.length === 0 ? (
              <p className="text-xs text-dashboard-neutral text-center py-4">
                No appointments scheduled.
              </p>
            ) : (
              <div className="space-y-2">
                {appointments.slice(0, 5).map((apt: any) => (
                  <DashboardListRow key={apt._id} className="p-3 text-xs flex flex-col gap-1">
                    <div className="flex justify-between items-center w-full">
                      <span className="font-semibold text-foreground">{apt.date}</span>
                      <DashboardStatusLabel status={apt.status} className="text-[10px]" />
                    </div>
                    <p className="text-dashboard-neutral text-[11px] w-full">
                      {apt.timeSlot} · {apt.practiceArea}
                    </p>
                  </DashboardListRow>
                ))}
              </div>
            )}
          </DashboardSection>
        </div>
      </div>
    </PortalPageShell>
  );
}
