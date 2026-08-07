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
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import {
  addCalendarDaysIso,
  formatAppointmentDate,
  todayIsoInFirmTz,
} from "@/shared/crm/appointment-dates.ts";

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
  // API scopes clients to their linked clientId (APT-1); no firm-wide list.
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
    virtual: { icon: Video, label: "Virtual / Zoom", desc: "A video link will be provided after confirmation" },
    in_person: { icon: Users, label: "In-Person", desc: "At Srimar Law HQ, Kathmandu" },
    phone: { icon: Phone, label: "Phone Call", desc: "Lawyer will call your registered number" },
  };

  if (clientRecord === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (clientRecord === null) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No client profile is linked to this account. Contact the firm to book consultations.
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="p-4 sm:p-8 space-y-6 max-w-4xl mx-auto">
        <div className="bg-card border border-border rounded-xl p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-2">Request received</h2>
          <p className="text-muted-foreground mb-2 max-w-md">
            Your {typeDetails[selectedType].label} request for{" "}
            <strong className="text-foreground">{formatAppointmentDate(selectedDateIso)}</strong> at{" "}
            <strong className="text-foreground">{selectedTime}</strong> is{" "}
            <strong className="text-foreground">pending</strong> firm confirmation.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            You will see it as confirmed here once the firm accepts the slot
            {selectedType === "virtual" ? ", and any video link will appear on the booking." : "."}
          </p>
          <Button
            onClick={() => {
              setShowSuccess(false);
              setSelectedTime(null);
              setNotes("");
            }}
          >
            Book Another Appointment
          </Button>
        </div>
      </div>
    );
  }

  const upcomingAppointments = (appointments as Array<{
    _id?: string;
    id?: string;
    status?: string;
    date?: string;
    timeSlot?: string;
    time?: string;
    practiceArea?: string;
    meetingLink?: string | null;
  }>).filter(
    (a) =>
      a.status !== "cancelled" &&
      a.status !== "completed" &&
      (a.date ?? "") >= today,
  );

  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold font-serif text-primary flex items-center gap-2">
          <CalendarIcon className="w-6 h-6" /> Book Consultation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Schedule a meeting with your assigned legal team. Dates use Nepal time (Asia/Kathmandu).
          New bookings stay pending until the firm confirms.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="border-b border-border p-4 bg-muted/30">
              <h2 className="font-medium text-foreground">1. Select Appointment Type</h2>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(["virtual", "in_person", "phone"] as const).map((type) => {
                const { icon: Icon, label, desc } = typeDetails[type];
                const isSelected = selectedType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 text-center transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 mb-2 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                    />
                    <span
                      className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}
                    >
                      {label}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">{desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="border-b border-border p-4 bg-muted/30 flex items-center justify-between">
              <h2 className="font-medium text-foreground">2. Select Date & Time</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevDay}
                  disabled={selectedDateIso <= today}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-semibold min-w-[140px] text-center">
                  {formatAppointmentDate(selectedDateIso)}
                </span>
                <Button variant="outline" size="sm" onClick={nextDay} className="h-8 w-8 p-0">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              {availableSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No available slots for this date. Try another day.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {availableSlots.map((time: string) => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`py-2 px-3 rounded-md text-sm font-medium border transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:border-primary/50"
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

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="border-b border-border p-4 bg-muted/30">
              <h2 className="font-medium text-foreground">3. Additional Notes</h2>
            </div>
            <div className="p-4">
              <textarea
                className="w-full rounded-md border border-input bg-input text-foreground px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden min-h-[100px] resize-y"
                placeholder="Briefly describe what you'd like to discuss (optional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Submitting requests a slot — it is not confirmed until the firm accepts it.
            </p>
            <Button
              size="lg"
              onClick={handleBook}
              disabled={!selectedTime || isSubmitting}
              className="px-8 gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Request Booking
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Your Upcoming Appointments
            </h3>

            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming appointments.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((apt) => {
                  const status = apt.status ?? "pending";
                  return (
                    <div
                      key={apt._id || apt.id}
                      className="p-3 rounded-lg border border-border bg-muted/30 text-sm space-y-2"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-semibold text-foreground">
                          {apt.date ? formatAppointmentDate(apt.date) : "—"}
                        </span>
                        <Badge
                          variant={
                            status === "confirmed"
                              ? "default"
                              : status === "pending"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-xs uppercase"
                        >
                          {status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-muted-foreground text-xs">
                          {apt.practiceArea || "Consultation"}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {apt.timeSlot || apt.time}
                        </Badge>
                      </div>
                      {status === "pending" && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                          Waiting for the firm to confirm this slot.
                        </p>
                      )}
                      {status === "confirmed" && apt.meetingLink && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              navigator.clipboard.writeText(apt.meetingLink!);
                              toast.success("Meeting link copied.");
                            }}
                          >
                            <Copy className="w-3 h-3 mr-1" /> Copy link
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => window.open(apt.meetingLink!, "_blank")}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Join
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              const day = (apt.date || "").replace(/-/g, "");
                              const lines = [
                                "BEGIN:VCALENDAR",
                                "VERSION:2.0",
                                "BEGIN:VEVENT",
                                `UID:${apt._id || apt.id}@srimar.law`,
                                `DTSTART;VALUE=DATE:${day}`,
                                `SUMMARY:Consultation — ${apt.practiceArea || "Srimar Law"}`,
                                apt.meetingLink ? `URL:${apt.meetingLink}` : "",
                                "END:VEVENT",
                                "END:VCALENDAR",
                              ].filter(Boolean);
                              const blob = new Blob([lines.join("\r\n")], {
                                type: "text/calendar",
                              });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = "consultation.ics";
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                          >
                            ICS
                          </Button>
                        </div>
                      )}
                      {status === "confirmed" && !apt.meetingLink && (
                        <p className="text-[11px] text-muted-foreground">
                          Confirmed — the firm will share a meeting link if this is virtual.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Need Immediate Help?
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-400 mb-4">
              If you have an urgent legal matter that requires immediate attention, contact the firm
              through Messages or the public contact page.
            </p>
            <Button asChild variant="outline" size="sm" className="border-blue-300">
              <a href="/contact">Contact the firm</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
