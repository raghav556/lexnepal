"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Video,
} from "lucide-react";
import { useAvailableSlots, useAppointmentCommands, useAppointments } from "@/client/queries/crm";
import { useMyClient } from "@/client/queries/clients";
import {
  addCalendarDaysIso,
  formatAppointmentDate,
  todayIsoInFirmTz,
} from "@/shared/crm/appointment-dates";
import {
  DashboardButton,
  DashboardListSkeleton,
  DashboardSection,
  DashboardStatusLabel,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";

type ConsultationMode = "virtual" | "in_person" | "phone";
type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

type ClientAppointment = {
  _id: string;
  date: string;
  timeSlot: string;
  practiceArea: string;
  status: AppointmentStatus;
  meetingLink?: string | null;
  notes?: string | null;
};

const consultationModes: Record<
  ConsultationMode,
  { label: string; practiceArea: string; description: string; icon: typeof Video }
> = {
  virtual: {
    label: "Virtual",
    practiceArea: "Virtual Consultation",
    description: "Meet remotely when a meeting link is provided.",
    icon: Video,
  },
  in_person: {
    label: "In-Person",
    practiceArea: "In-Person Consultation",
    description: "Arrange an in-person consultation with the legal team.",
    icon: MapPin,
  },
  phone: {
    label: "Phone",
    practiceArea: "Phone Consultation",
    description: "Arrange a consultation by telephone.",
    icon: Phone,
  },
};

function sortAppointments(appointments: ClientAppointment[], direction: "asc" | "desc") {
  return [...appointments].sort((left, right) => {
    const compared = `${left.date} ${left.timeSlot}`.localeCompare(
      `${right.date} ${right.timeSlot}`,
    );
    return direction === "asc" ? compared : -compared;
  });
}

function appointmentModeLabel(practiceArea: string) {
  if (practiceArea === "Virtual Consultation") return "Virtual";
  if (practiceArea === "In-Person Consultation") return "In-Person";
  if (practiceArea === "Phone Consultation") return "Phone";
  return practiceArea;
}

function AppointmentRow({ appointment }: { appointment: ClientAppointment }) {
  return (
    <article className="client-appointments-row flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {formatAppointmentDate(appointment.date)}
          </h3>
          <DashboardStatusLabel
            status={appointment.status}
            className="text-[10px]"
            aria-label={`Status: ${appointment.status}`}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {appointment.timeSlot} <span aria-hidden>·</span>{" "}
          {appointmentModeLabel(appointment.practiceArea)}
        </p>
      </div>
      {appointment.meetingLink ? (
        <DashboardButton asChild variant="outline" size="sm" className="shrink-0">
          <a
            href={appointment.meetingLink}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open meeting for ${formatAppointmentDate(appointment.date)}`}
          >
            Open meeting <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </DashboardButton>
      ) : null}
    </article>
  );
}

export default function ClientBookingPage() {
  const clientRecord = useMyClient();
  const today = todayIsoInFirmTz();
  const [selectedDateIso, setSelectedDateIso] = useState(today);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<ConsultationMode>("virtual");
  const [notes, setNotes] = useState("");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [successAppointment, setSuccessAppointment] = useState<ClientAppointment | null>(null);

  // No lawyer argument: client appointments are pending requests and lawyer
  // assignment remains a server-side staff responsibility.
  const slotsQuery = useAvailableSlots(selectedDateIso);
  const appointmentsQuery = useAppointments({});
  const { bookConsultation } = useAppointmentCommands();
  const appointments = appointmentsQuery.data as ClientAppointment[];

  const { upcomingAppointments, historyAppointments } = useMemo(() => {
    const upcoming = appointments.filter(
      (appointment) =>
        appointment.date >= today &&
        (appointment.status === "pending" || appointment.status === "confirmed"),
    );
    return {
      upcomingAppointments: sortAppointments(upcoming, "asc"),
      historyAppointments: sortAppointments(
        appointments.filter((appointment) => !upcoming.includes(appointment)),
        "desc",
      ),
    };
  }, [appointments, today]);

  const selectDate = (nextDate: string) => {
    if (nextDate < today) return;
    setSelectedDateIso(nextDate);
    setSelectedTime(null);
    setBookingError(null);
  };

  const handleBook = async () => {
    if (!selectedTime || !clientRecord) return;
    setBookingError(null);
    try {
      const created = (await bookConsultation.mutateAsync({
        // Required by the existing request schema. The published service derives
        // these values again from the authenticated user's linked Client record.
        clientId: clientRecord._id as string,
        clientName: clientRecord.fullName,
        clientEmail: clientRecord.email,
        clientPhone: clientRecord.phone || "N/A",
        practiceArea: consultationModes[selectedMode].practiceArea,
        date: selectedDateIso,
        timeSlot: selectedTime,
        notes: notes || undefined,
      })) as ClientAppointment;
      setSuccessAppointment(created);
      setSelectedTime(null);
    } catch (error: unknown) {
      setBookingError(
        error instanceof Error ? error.message : "Unable to submit the appointment request.",
      );
    }
  };

  if (clientRecord === undefined) {
    return (
      <PortalPageShell
        portal="client"
        loading
        loadingLabel="Loading appointments…"
        title="Appointments"
        className="client-appointments"
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
        eyebrow="Client Portal"
        title="Appointments"
        description="View consultations and request a new appointment."
        icon={CalendarDays}
        className="client-appointments"
      >
        <EmptyState
          title="No client profile linked"
          description="This portal account is not linked to a client profile. Please message the legal team for scheduling help."
          icon={CalendarDays}
          action={
            <DashboardButton asChild variant="outline" size="sm">
              <Link href="/client/messages">Message Legal Team</Link>
            </DashboardButton>
          }
        />
      </PortalPageShell>
    );
  }

  if (successAppointment) {
    return (
      <PortalPageShell
        portal="client"
        decorated
        showTodayDate
        eyebrow="Client Portal"
        title="Appointments"
        description="View consultations and request a new appointment."
        icon={CalendarDays}
        className="client-appointments"
      >
        <DashboardSection
          title="Request submitted"
          description="Awaiting confirmation from the legal team."
          icon={CheckCircle2}
        >
          <div className="mx-auto max-w-xl space-y-5 py-2 text-center">
            <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
              Your request for {formatAppointmentDate(successAppointment.date)} at{" "}
              {successAppointment.timeSlot} is
              <strong className="ml-1 text-foreground">{successAppointment.status}</strong>.
            </p>
            {notes ? (
              <div className="rounded-lg border border-dashboard-border bg-dashboard-neutral-soft px-4 py-3 text-left">
                <p className="text-xs font-semibold text-foreground">Notes included</p>
                <p className="mt-1 text-xs text-muted-foreground">{notes}</p>
              </div>
            ) : null}
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <DashboardButton
                onClick={() => {
                  setSuccessAppointment(null);
                  setNotes("");
                }}
              >
                Request another appointment
              </DashboardButton>
              <DashboardButton asChild variant="outline">
                <Link href="/client/messages">Message Legal Team</Link>
              </DashboardButton>
            </div>
          </div>
        </DashboardSection>
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell
      portal="client"
      decorated
      showTodayDate
      eyebrow="Client Portal"
      title="Appointments"
      description="View consultations and request a new appointment."
      icon={CalendarDays}
      className="client-appointments"
      actions={
        <DashboardButton asChild size="sm" variant="secondary">
          <a href="#request-appointment">Request appointment</a>
        </DashboardButton>
      }
    >
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.9fr)]">
        <div className="contents min-w-0 xl:block xl:space-y-4">
          <DashboardSection
            title="Upcoming appointments"
            description="Pending requests and confirmed consultations."
            icon={CalendarDays}
            density="compact"
            className="order-1 xl:order-none"
          >
            {appointmentsQuery.isLoading ? (
              <DashboardListSkeleton rows={3} />
            ) : appointmentsQuery.isError ? (
              <EmptyState
                title="Appointments are unavailable"
                description="Please try again later or message the legal team for scheduling help."
                icon={CalendarDays}
                action={
                  <DashboardButton asChild variant="outline" size="sm">
                    <Link href="/client/messages">Message Legal Team</Link>
                  </DashboardButton>
                }
              />
            ) : upcomingAppointments.length === 0 ? (
              <EmptyState
                title={
                  appointments.length === 0 ? "No appointments yet" : "No upcoming appointments"
                }
                description="Choose a consultation mode and an available time to submit a request."
                icon={CalendarDays}
              />
            ) : (
              <div className="divide-y divide-dashboard-border">
                {upcomingAppointments.map((appointment) => (
                  <AppointmentRow key={appointment._id} appointment={appointment} />
                ))}
              </div>
            )}
          </DashboardSection>

          <DashboardSection
            title="Appointment history"
            description="Previous, completed, or cancelled appointments."
            icon={Clock3}
            density="compact"
            className="order-3 xl:order-none"
          >
            {appointmentsQuery.isLoading ? (
              <DashboardListSkeleton rows={2} />
            ) : appointmentsQuery.isError ? (
              <p className="text-xs text-muted-foreground">History could not be loaded.</p>
            ) : historyAppointments.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">
                No appointment history yet.
              </p>
            ) : (
              <div className="divide-y divide-dashboard-border">
                {historyAppointments.map((appointment) => (
                  <AppointmentRow key={appointment._id} appointment={appointment} />
                ))}
              </div>
            )}
          </DashboardSection>
        </div>

        <div className="order-2 min-w-0 space-y-4 xl:order-none">
          <DashboardSection
            title="Request appointment"
            description="Select a mode, date, and available time. Requests await confirmation."
            icon={CalendarDays}
            density="compact"
            className="scroll-mt-4"
          >
            <form
              id="request-appointment"
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void handleBook();
              }}
            >
              <fieldset>
                <legend className="text-xs font-semibold text-foreground">Consultation mode</legend>
                <div
                  className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1"
                  role="radiogroup"
                  aria-label="Consultation mode"
                >
                  {(Object.keys(consultationModes) as ConsultationMode[]).map((mode) => {
                    const modeDetails = consultationModes[mode];
                    const Icon = modeDetails.icon;
                    const selected = selectedMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setSelectedMode(mode)}
                        className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-dashboard-focus focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-canvas ${
                          selected
                            ? "border-dashboard-primary bg-dashboard-primary-soft text-foreground"
                            : "border-dashboard-border bg-dashboard-panel text-foreground hover:bg-dashboard-panel-hover"
                        }`}
                      >
                        <Icon className="size-4 shrink-0 text-dashboard-primary" aria-hidden />
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold">{modeDetails.label}</span>
                          <span className="block text-[11px] leading-4 text-muted-foreground">
                            {modeDetails.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-xs font-semibold text-foreground">
                  Date &amp; available time
                </legend>
                <p className="mt-1 text-[11px] text-muted-foreground">Asia/Kathmandu (NPT)</p>
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-dashboard-border bg-dashboard-neutral-soft p-2">
                  <DashboardButton
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => selectDate(addCalendarDaysIso(selectedDateIso, -1))}
                    disabled={selectedDateIso <= today}
                    aria-label="Show previous available date"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </DashboardButton>
                  <div className="min-w-0 text-center">
                    <p className="text-xs font-semibold text-foreground">
                      {formatAppointmentDate(selectedDateIso)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{selectedDateIso}</p>
                  </div>
                  <DashboardButton
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => selectDate(addCalendarDaysIso(selectedDateIso, 1))}
                    aria-label="Show next available date"
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </DashboardButton>
                </div>

                <div className="mt-3" aria-live="polite">
                  {slotsQuery.isLoading ? (
                    <DashboardListSkeleton rows={2} />
                  ) : slotsQuery.data.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-dashboard-border bg-dashboard-neutral-soft px-4 py-5 text-center">
                      <p className="text-xs font-medium text-foreground">
                        No available times on this date.
                      </p>
                      <DashboardButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => selectDate(addCalendarDaysIso(selectedDateIso, 1))}
                      >
                        Try the next date
                      </DashboardButton>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {slotsQuery.data.map((time) => {
                        const selected = selectedTime === time;
                        return (
                          <button
                            key={time}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => {
                              setSelectedTime(time);
                              setBookingError(null);
                            }}
                            className={`min-h-10 rounded-lg border px-2 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-dashboard-focus focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-canvas ${
                              selected
                                ? "border-dashboard-primary bg-dashboard-primary text-white"
                                : "border-dashboard-border bg-dashboard-panel text-foreground hover:bg-dashboard-panel-hover"
                            }`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </fieldset>

              <div>
                <label
                  htmlFor="appointment-notes"
                  className="text-xs font-semibold text-foreground"
                >
                  Optional notes
                </label>
                <textarea
                  id="appointment-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  maxLength={10000}
                  placeholder="Add a short note for the legal team."
                  className="mt-2 w-full resize-y rounded-lg border border-dashboard-border bg-dashboard-panel px-3 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-dashboard-focus focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-canvas"
                />
              </div>

              {bookingError ? (
                <p
                  role="alert"
                  className="rounded-lg border border-dashboard-danger/30 bg-dashboard-danger-soft px-3 py-2 text-xs text-dashboard-danger-foreground"
                >
                  {bookingError}
                </p>
              ) : null}

              <DashboardButton
                type="submit"
                className="w-full"
                disabled={!selectedTime || bookConsultation.isPending}
              >
                {bookConsultation.isPending ? (
                  <>
                    <Loader2 className="size-4 motion-reduce:animate-none" aria-hidden /> Submitting
                    request…
                  </>
                ) : (
                  "Submit request"
                )}
              </DashboardButton>
            </form>
          </DashboardSection>

          <aside className="rounded-xl border border-dashboard-border bg-dashboard-neutral-soft/70 px-4 py-4">
            <div className="flex gap-3">
              <MessageCircle
                className="mt-0.5 size-4 shrink-0 text-dashboard-primary"
                aria-hidden
              />
              <div>
                <h2 className="text-sm font-semibold text-foreground">Scheduling help</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Need help selecting a time or have a scheduling question?
                </p>
                <Link
                  href="/client/messages"
                  className="mt-2 inline-flex text-xs font-semibold text-dashboard-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus"
                >
                  Message Legal Team
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </PortalPageShell>
  );
}
