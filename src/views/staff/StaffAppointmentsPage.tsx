"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/client/navigation";
import { useAppointments, useAppointmentCommands } from "@/client/queries/crm";
import {
  DashboardButton,
  DashboardSection,
  EmptyState,
  PortalPageShell,
  StatusBadge,
} from "@/components/dashboard";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MeetingLinkDialog,
  type MeetingLinkDialogTarget,
} from "@/components/crm/MeetingLinkDialog";
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  Mail,
  Phone,
  Plus,
  Search,
  UserRound,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getDashboardStatusTone } from "@/lib/dashboard-semantics";
import {
  addCalendarDaysIso,
  formatAppointmentDate,
  isValidMeetingUrl,
  todayIsoInFirmTz,
} from "@/shared/crm/appointment-dates";
import {
  appointmentInitials,
  appointmentKey,
  appointmentKpis,
  filterAppointments,
  isActiveAppointment,
  visibleAppointmentSelection,
  type AppointmentStatus,
  type AppointmentTab,
  type CalendarView,
  type StaffAppointment,
} from "./staff-appointments-model";
import { StaffAppointmentCalendar } from "./StaffAppointmentCalendar";
import { StaffAppointmentBookingDialog, appointmentError } from "./StaffAppointmentBookingDialog";

function subscribeCompact(callback: () => void) {
  const media = window.matchMedia("(max-width: 1199px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const compactSnapshot = () => window.matchMedia("(max-width: 1199px)").matches;
const serverSnapshot = () => false;

export default function StaffAppointmentsPage() {
  const user = useCurrentUser();
  const staffId = String(user?.id || user?._id || "");
  const highlight = useSearchParams().get("appointment")?.trim() || "";
  const query = useAppointments({ assignedLawyerId: staffId }, { enabled: Boolean(staffId) });
  const { updateStatus } = useAppointmentCommands();
  const records = query.data as StaffAppointment[];
  const today = todayIsoInFirmTz();
  const [date, setDate] = useState(today);
  const [tab, setTab] = useState<AppointmentTab>("today");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<CalendarView>("day");
  const [mobileView, setMobileView] = useState("list");
  const [selectedId, setSelectedId] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [booking, setBooking] = useState<"create" | StaffAppointment | null>(null);
  const [meeting, setMeeting] = useState<MeetingLinkDialogTarget>(null);
  const [cancel, setCancel] = useState<StaffAppointment | null>(null);
  const [actionError, setActionError] = useState("");
  const seenHighlight = useRef("");
  const compact = useSyncExternalStore(subscribeCompact, compactSnapshot, serverSnapshot);
  const visible = useMemo(
    () => filterAppointments(records, { tab, today, date, search, status }),
    [records, tab, today, date, search, status],
  );
  const selected = visibleAppointmentSelection(visible, selectedId);
  const calendarRecords = useMemo(
    () =>
      filterAppointments(records, {
        tab: tab === "today" ? "all" : tab,
        today,
        date,
        search,
        status,
      }),
    [records, tab, today, date, search, status],
  );
  const kpis = appointmentKpis(records, today);

  // Keep the stored ID aligned too, so removing a filter cannot resurrect an old selection.
  // Deep-link navigation runs afterward and supplies its own date/filter/selection together.
  useEffect(() => {
    const id = selected ? appointmentKey(selected) : "";
    if (selectedId !== id) {
      setSelectedId(id);
      setActionError("");
    }
    if (selected?.date && selected.date !== date) setDate(selected.date);
    if (!selected) setDrawer(false);
  }, [selected, selectedId, date]);

  useEffect(() => {
    if (!highlight) {
      seenHighlight.current = "";
      return;
    }
    if (seenHighlight.current === highlight || !query.hasData) return;
    const found = records.find((a) => appointmentKey(a) === highlight);
    if (!found) return;
    seenHighlight.current = highlight;
    setSelectedId(highlight);
    if (found.date) setDate(found.date);
    setTab("today");
    setSearch("");
    setStatus("all");
    if (window.matchMedia("(max-width: 1199px)").matches) setDrawer(true);
  }, [highlight, records, query.hasData]);

  function select(appointment: StaffAppointment) {
    if (appointment.date) setDate(appointment.date);
    setSelectedId(appointmentKey(appointment));
    setActionError("");
    if (compact) setDrawer(true);
  }
  function selectDate(next: string) {
    setDate(next);
    setTab("today");
  }
  async function changeStatus(appointment: StaffAppointment, next: AppointmentStatus) {
    setActionError("");
    try {
      await updateStatus.mutateAsync({ appointmentId: appointmentKey(appointment), status: next });
      toast.success(`Appointment ${next}.`);
      setCancel(null);
      if (compact && next === "cancelled") recoverSelectionFocus();
    } catch (error) {
      const message = appointmentError(error, "Unable to update appointment.");
      setActionError(message);
      toast.error(message);
    }
  }
  function openBooking(value: "create" | StaffAppointment) {
    setDrawer(false);
    setBooking(value);
  }

  function recoverSelectionFocus(id = selected ? appointmentKey(selected) : "") {
    requestAnimationFrame(() => {
      const target =
        document.getElementById(`appointment-${id}`) ||
        document.querySelector<HTMLButtonElement>(".staff-appointments-view-details") ||
        document.querySelector<HTMLButtonElement>(".staff-appointments-panel-head button");
      target?.focus();
    });
  }

  function details(appointment: StaffAppointment) {
    const active = isActiveAppointment(appointment);
    const validLink = Boolean(
      appointment.meetingLink?.trim() && isValidMeetingUrl(appointment.meetingLink),
    );
    return (
      <div className="staff-appointments-details-body">
        <div className="staff-appointments-client-heading">
          <span className="staff-appointments-avatar">
            {appointmentInitials(appointment.clientName)}
          </span>
          <div>
            <h3>{appointment.clientName || "Client name not recorded"}</h3>
            <StatusBadge tone={getDashboardStatusTone(appointment.status)}>
              {appointment.status || "Status not recorded"}
            </StatusBadge>
            <p>{appointment.practiceArea || "Practice area not recorded"}</p>
          </div>
        </div>
        <div className="staff-appointments-detail-label">Consultation details</div>
        <dl className="staff-appointments-facts">
          <div>
            <dt>
              <Calendar size={15} aria-hidden />
              Date
            </dt>
            <dd>{appointment.date ? formatAppointmentDate(appointment.date) : "Not recorded"}</dd>
          </div>
          <div>
            <dt>
              <Clock3 size={15} aria-hidden />
              Start slot
            </dt>
            <dd>
              {appointment.timeSlot || "Not recorded"}
              <small>Asia/Kathmandu</small>
            </dd>
          </div>
          <div>
            <dt>
              <UserRound size={15} aria-hidden />
              Practice area
            </dt>
            <dd>{appointment.practiceArea || "Not recorded"}</dd>
          </div>
          <div>
            <dt>
              <Phone size={15} aria-hidden />
              Phone
            </dt>
            <dd>{appointment.clientPhone || "Not recorded"}</dd>
          </div>
          <div>
            <dt>
              <Mail size={15} aria-hidden />
              Email
            </dt>
            <dd>{appointment.clientEmail || "Not recorded"}</dd>
          </div>
          <div>
            <dt>
              <UserRound size={15} aria-hidden />
              Assigned to
            </dt>
            <dd>{user?.name || "You"}</dd>
          </div>
        </dl>
        {appointment.notes && (
          <div className="staff-appointments-notes">
            <h4>Notes</h4>
            <p>{appointment.notes}</p>
          </div>
        )}
        {active && validLink && (
          <div className="staff-appointments-meeting">
            <span>
              <Video size={16} aria-hidden /> Meeting link
            </span>
            <p>{appointment.meetingLink}</p>
            <div>
              <DashboardButton
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(appointment.meetingLink!);
                    toast.success("Meeting link copied.");
                  } catch {
                    toast.error("Could not copy. Select and copy the displayed link.");
                  }
                }}
              >
                <Copy size={14} aria-hidden />
                Copy Link
              </DashboardButton>
              <DashboardButton asChild size="sm">
                <a href={appointment.meetingLink!} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} aria-hidden />
                  Join
                </a>
              </DashboardButton>
            </div>
          </div>
        )}
        {appointment.clientId && (
          <DashboardButton asChild variant="outline" size="sm">
            <Link href={`/staff/clients?client=${encodeURIComponent(appointment.clientId)}`}>
              Open Client
              <ChevronRight size={14} aria-hidden />
            </Link>
          </DashboardButton>
        )}
        {active && (
          <div className="staff-appointments-actions">
            {appointment.status === "pending" && (
              <DashboardButton
                size="sm"
                disabled={updateStatus.isPending}
                onClick={() => void changeStatus(appointment, "confirmed")}
              >
                <CheckCircle2 size={15} aria-hidden />
                Confirm
              </DashboardButton>
            )}
            {appointment.status === "confirmed" && (
              <DashboardButton
                size="sm"
                disabled={updateStatus.isPending}
                onClick={() => void changeStatus(appointment, "completed")}
              >
                <CheckCircle2 size={15} aria-hidden />
                Mark Completed
              </DashboardButton>
            )}
            <DashboardButton
              variant="outline"
              size="sm"
              disabled={updateStatus.isPending}
              onClick={() => openBooking(appointment)}
            >
              <CalendarClock size={15} aria-hidden />
              Reschedule
            </DashboardButton>
            {!validLink && (
              <DashboardButton
                variant="outline"
                size="sm"
                disabled={updateStatus.isPending}
                onClick={() => {
                  setDrawer(false);
                  setMeeting({
                    id: appointmentKey(appointment),
                    status: "confirmed",
                    clientName: appointment.clientName,
                  });
                }}
              >
                <Video size={15} aria-hidden />
                Add Meeting Link
              </DashboardButton>
            )}
            <DashboardButton
              variant="outline"
              size="sm"
              disabled={updateStatus.isPending}
              onClick={() => {
                setActionError("");
                setDrawer(false);
                setCancel(appointment);
              }}
            >
              Cancel
            </DashboardButton>
          </div>
        )}
        {actionError && (
          <p role="alert" className="staff-appointments-error">
            {actionError}
          </p>
        )}
      </div>
    );
  }

  return (
    <PortalPageShell
      portal="staff"
      title="Appointments"
      className="staff-appointments-workspace"
      heroClassName="staff-appointments-hero"
      metricsClassName="staff-appointments-metrics"
      description="Manage your assigned consultations and follow-ups. All times Asia/Kathmandu."
      heroChildren={<div className="staff-appointments-hero-art" aria-hidden />}
      loading={query.isLoading || !staffId}
      loadingLabel="Loading your appointments…"
      actions={
        <DashboardButton asChild size="sm" variant="outline">
          <Link href="/staff/crm">Open CRM</Link>
        </DashboardButton>
      }
      metrics={[
        {
          label: "Today",
          value: query.isError ? "—" : kpis.today,
          icon: Calendar,
          tone: "information",
          helperText: "Active appointments",
        },
        {
          label: "Upcoming",
          value: query.isError ? "—" : kpis.upcoming,
          icon: Clock3,
          tone: "warning",
          helperText: "After today",
        },
        {
          label: "Pending confirmation",
          value: query.isError ? "—" : kpis.pending,
          icon: UserRound,
          tone: "danger",
          helperText: "Awaiting your confirmation",
        },
        {
          label: "Completed this month",
          value: query.isError ? "—" : kpis.completed,
          icon: CheckCircle2,
          tone: "success",
          helperText: "By appointment date",
        },
      ]}
    >
      {query.isError ? (
        <EmptyState
          title="Unable to load appointments"
          description={appointmentError(query.error, "Please try again.")}
          tone="danger"
          action={
            <DashboardButton onClick={() => void query.refetch()}>
              Retry appointments
            </DashboardButton>
          }
        />
      ) : (
        <>
          {highlight && query.hasData && !records.some((a) => appointmentKey(a) === highlight) && (
            <p role="status" className="staff-appointments-hint">
              This appointment is unavailable or is not assigned to you.
            </p>
          )}
          <div
            className="staff-appointments-mobile-switch"
            role="group"
            aria-label="Appointments workspace view"
          >
            <DashboardButton
              size="sm"
              variant={mobileView === "list" ? "primary" : "outline"}
              onClick={() => setMobileView("list")}
            >
              Appointment list
            </DashboardButton>
            <DashboardButton
              size="sm"
              variant={mobileView === "calendar" ? "primary" : "outline"}
              onClick={() => setMobileView("calendar")}
            >
              Calendar
            </DashboardButton>
          </div>
          <div className={`staff-appointments-grid staff-appointments-mobile-${mobileView}`}>
            <DashboardSection className="staff-appointments-list" aria-label="Appointment list">
              <div className="staff-appointments-panel-head">
                <h2>Appointments</h2>
                <DashboardButton size="sm" onClick={() => openBooking("create")}>
                  <Plus size={15} aria-hidden />
                  New Appointment
                </DashboardButton>
              </div>
              <div
                className="staff-appointments-list-tabs"
                role="group"
                aria-label="Appointment filters"
              >
                {(
                  [
                    ["today", date === today ? "Today" : "Selected day"],
                    ["upcoming", "Upcoming"],
                    ["completed", "Completed"],
                    ["all", "All"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={tab === key}
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="staff-appointments-list-filters">
                <div className="staff-appointments-search">
                  <Search size={15} aria-hidden />
                  <Input
                    aria-label="Search appointments"
                    placeholder="Search client, practice area or notes…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger aria-label="Filter by status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["all", "pending", "confirmed", "completed", "cancelled"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "all" ? "All statuses" : s[0].toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="staff-appointments-list-date">
                <label className="staff-appointments-sr-only" htmlFor="appointment-list-date">
                  Choose calendar date
                </label>
                <Input
                  type="date"
                  id="appointment-list-date"
                  value={date}
                  onChange={(e) => {
                    if (e.target.value) selectDate(e.target.value);
                  }}
                />
                <DashboardButton
                  variant="outline"
                  size="icon"
                  aria-label="Previous date"
                  onClick={() => selectDate(addCalendarDaysIso(date, -1))}
                >
                  <ChevronLeft size={15} />
                </DashboardButton>
                <DashboardButton
                  variant="outline"
                  size="icon"
                  aria-label="Next date"
                  onClick={() => selectDate(addCalendarDaysIso(date, 1))}
                >
                  <ChevronRight size={15} />
                </DashboardButton>
              </div>
              <div className="staff-appointments-list-summary" role="status">
                {visible.length} appointment{visible.length !== 1 ? "s" : ""} · assigned to you
              </div>
              <div
                className="staff-appointments-list-scroll"
                tabIndex={0}
                aria-label="Appointment results"
              >
                {visible.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="No appointments"
                    description={
                      search || status !== "all"
                        ? "Try another search or status filter."
                        : "No appointments for this view. Choose another date or create a booking."
                    }
                  />
                ) : (
                  visible.map((a) => (
                    <button
                      type="button"
                      key={appointmentKey(a)}
                      id={`appointment-${appointmentKey(a)}`}
                      className="staff-appointments-row"
                      aria-pressed={appointmentKey(selected || {}) === appointmentKey(a)}
                      onClick={() => select(a)}
                    >
                      <span className="staff-appointments-row-time">
                        {a.timeSlot || "No time"}
                        <small>
                          {a.date
                            ? formatAppointmentDate(a.date, { weekday: undefined, year: undefined })
                            : "No date"}
                        </small>
                      </span>
                      <span className="staff-appointments-avatar">
                        {appointmentInitials(a.clientName)}
                      </span>
                      <span className="staff-appointments-row-copy">
                        <strong>{a.clientName || "Client name not recorded"}</strong>
                        <span>{a.practiceArea || "Practice area not recorded"}</span>
                        <StatusBadge tone={getDashboardStatusTone(a.status)}>
                          {a.status || "Not recorded"}
                        </StatusBadge>
                        {a.meetingLink && (
                          <small>
                            <Video size={12} aria-hidden />
                            Meeting link added
                          </small>
                        )}
                      </span>
                      <ChevronRight size={15} aria-hidden />
                    </button>
                  ))
                )}
              </div>
            </DashboardSection>
            <div className="staff-appointments-calendar-wrap">
              <StaffAppointmentCalendar
                records={calendarRecords}
                date={date}
                today={today}
                view={view}
                selectedId={appointmentKey(selected || {})}
                onDate={selectDate}
                onView={setView}
                onSelect={(appointment) => {
                  setTab("today");
                  select(appointment);
                }}
              />
            </div>
            {!compact && (
              <DashboardSection
                className="staff-appointments-details"
                aria-label="Appointment details"
              >
                <div className="staff-appointments-panel-head">
                  <h2>Appointment details</h2>
                </div>
                <div className="staff-appointments-details-scroll">
                  {selected ? (
                    details(selected)
                  ) : (
                    <EmptyState
                      title="Your day, in focus"
                      description="Select an appointment to view its details and available actions."
                      icon={CalendarClock}
                    />
                  )}
                </div>
              </DashboardSection>
            )}
          </div>
          {compact && selected && (
            <DashboardButton
              className="staff-appointments-view-details"
              variant="outline"
              onClick={() => setDrawer(true)}
            >
              View selected appointment
              <ChevronRight size={15} aria-hidden />
            </DashboardButton>
          )}
          <Dialog open={compact && drawer && Boolean(selected)} onOpenChange={setDrawer}>
            <DialogContent
              className="staff-appointments-details-dialog"
              aria-labelledby="appointment-details-title"
            >
              <DashboardButton variant="ghost" size="sm" onClick={() => setDrawer(false)}>
                <ChevronLeft size={15} aria-hidden />
                Back to appointments
              </DashboardButton>
              <DialogTitle id="appointment-details-title">Appointment details</DialogTitle>
              {selected && details(selected)}
            </DialogContent>
          </Dialog>
        </>
      )}
      {booking && (
        <StaffAppointmentBookingDialog
          appointment={booking === "create" ? undefined : booking}
          staffId={staffId}
          staffName={user?.name || "you"}
          initialDate={date}
          onClose={() => {
            setBooking(null);
            if (compact && booking !== "create") recoverSelectionFocus();
          }}
          onSaved={(id, nextDate) => {
            setBooking(null);
            setSelectedId(id);
            selectDate(nextDate);
            setSearch("");
            setStatus("all");
            recoverSelectionFocus(id);
          }}
        />
      )}
      <MeetingLinkDialog
        target={meeting}
        onOpenChange={(open) => {
          if (!open) {
            setMeeting(null);
            if (compact) recoverSelectionFocus();
          }
        }}
        onSave={async (args) => {
          await updateStatus.mutateAsync(args);
        }}
      />
      <Dialog
        open={Boolean(cancel)}
        onOpenChange={(open: boolean) => {
          if (!open && !updateStatus.isPending) {
            setCancel(null);
            if (compact) recoverSelectionFocus();
          }
        }}
      >
        <DialogContent aria-labelledby="appointment-cancel-title">
          <DialogTitle id="appointment-cancel-title">Cancel appointment?</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cancel the booking for {cancel?.clientName} on {cancel?.date} at {cancel?.timeSlot}?
          </p>
          {actionError && (
            <p role="alert" className="staff-appointments-error">
              {actionError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <DashboardButton
              variant="outline"
              disabled={updateStatus.isPending}
              onClick={() => {
                setCancel(null);
                if (compact) recoverSelectionFocus();
              }}
            >
              Keep appointment
            </DashboardButton>
            <DashboardButton
              variant="destructive"
              disabled={updateStatus.isPending}
              onClick={() => cancel && void changeStatus(cancel, "cancelled")}
            >
              {updateStatus.isPending ? "Cancelling…" : "Cancel appointment"}
            </DashboardButton>
          </div>
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
