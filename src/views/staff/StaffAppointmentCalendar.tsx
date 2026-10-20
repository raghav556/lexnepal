"use client";

import { useRef } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardButton, DashboardSection } from "@/components/dashboard";
import { DEFAULT_APPOINTMENT_SLOTS } from "@/shared/crm/appointment-slots";
import { addCalendarDaysIso, formatAppointmentDate } from "@/shared/crm/appointment-dates";
import {
  appointmentKey,
  calendarDays,
  navigateCalendar,
  slotMinutes,
  sortAppointments,
  type CalendarView,
  type StaffAppointment,
} from "./staff-appointments-model";

interface Props {
  records: StaffAppointment[];
  date: string;
  today: string;
  view: CalendarView;
  selectedId: string;
  onDate: (date: string) => void;
  onView: (view: CalendarView) => void;
  onSelect: (appointment: StaffAppointment) => void;
}

export function StaffAppointmentCalendar({
  records,
  date,
  today,
  view,
  selectedId,
  onDate,
  onView,
  onSelect,
}: Props) {
  const grid = useRef<HTMLDivElement>(null);
  const days = calendarDays(date, view);
  const daily = sortAppointments(records.filter((a) => a.date === date));
  const slots = [
    ...new Set<string>([
      ...DEFAULT_APPOINTMENT_SLOTS,
      ...daily.map((a) => a.timeSlot || "Time not recorded"),
    ]),
  ].sort((a, b) => slotMinutes(a) - slotMinutes(b));

  function eventButton(appointment: StaffAppointment) {
    return (
      <button
        key={appointmentKey(appointment)}
        type="button"
        className={`staff-appointments-event staff-appointments-event-${appointment.status}`}
        aria-pressed={appointmentKey(appointment) === selectedId}
        onClick={() => onSelect(appointment)}
      >
        <span>
          {appointment.timeSlot || "Time not recorded"}{" "}
          <span className="staff-appointments-start">· start</span>
        </span>
        <strong>{appointment.clientName || "Client name not recorded"}</strong>
        <small>
          {appointment.practiceArea || "Practice area not recorded"} · {appointment.status}
        </small>
      </button>
    );
  }

  return (
    <DashboardSection className="staff-appointments-calendar" aria-label="Appointment calendar">
      <div className="staff-appointments-calendar-toolbar">
        <DashboardButton variant="outline" size="sm" onClick={() => onDate(today)}>
          Today
        </DashboardButton>
        <div className="staff-appointments-nav">
          <DashboardButton
            variant="ghost"
            size="icon"
            aria-label={`Previous ${view}`}
            onClick={() => onDate(navigateCalendar(date, view, -1))}
          >
            <ChevronLeft size={16} />
          </DashboardButton>
          <DashboardButton
            variant="ghost"
            size="icon"
            aria-label={`Next ${view}`}
            onClick={() => onDate(navigateCalendar(date, view, 1))}
          >
            <ChevronRight size={16} />
          </DashboardButton>
        </div>
        <strong aria-live="polite">
          {formatAppointmentDate(date, {
            weekday: undefined,
            day: undefined,
            month: "long",
            year: "numeric",
          })}
        </strong>
        <div className="staff-appointments-segments" role="group" aria-label="Calendar view">
          {(["day", "week", "month"] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              aria-pressed={mode === view}
              onClick={() => onView(mode)}
            >
              {mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="staff-appointments-calendar-caption">
        <CalendarDays size={15} aria-hidden />
        <span>
          {view === "day"
            ? formatAppointmentDate(date)
            : `${formatAppointmentDate(days[0], { year: undefined })} – ${formatAppointmentDate(days.at(-1)!, { year: undefined })}`}
        </span>
      </div>
      <p className="staff-appointments-timezone">Asia/Kathmandu · start slots only</p>
      {view !== "day" && (
        <>
          <p className="staff-appointments-sr-only" id="appointment-calendar-help">
            Use arrow keys to change dates, Home or End for the week, Enter to select. Appointment
            counts reflect the current filters.
          </p>
          <div
            ref={grid}
            className={`staff-appointments-date-grid staff-appointments-date-grid-${view}`}
            role="group"
            aria-label={`${view} dates`}
            aria-describedby="appointment-calendar-help"
            onKeyDown={(event) => {
              const target = event.target as HTMLButtonElement;
              const active = target.dataset.date;
              if (!active) return;
              const weekday = (new Date(`${active}T12:00:00Z`).getUTCDay() + 6) % 7;
              const delta = {
                ArrowLeft: -1,
                ArrowRight: 1,
                ArrowUp: -7,
                ArrowDown: 7,
                Home: -weekday,
                End: 6 - weekday,
              }[event.key];
              if (delta === undefined) return;
              event.preventDefault();
              const next = addCalendarDaysIso(active, delta);
              onDate(next);
              requestAnimationFrame(() =>
                grid.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus(),
              );
            }}
          >
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i} aria-hidden className="staff-appointments-weekday">
                {d}
              </span>
            ))}
            {days.map((day) => {
              const count = records.filter((a) => a.date === day).length;
              return (
                <button
                  type="button"
                  key={day}
                  data-date={day}
                  tabIndex={day === date ? 0 : -1}
                  aria-label={`${formatAppointmentDate(day)}, ${count} appointments`}
                  aria-pressed={day === date}
                  aria-current={day === today ? "date" : undefined}
                  className={
                    day.slice(0, 7) !== date.slice(0, 7) ? "staff-appointments-outside" : ""
                  }
                  onClick={() => onDate(day)}
                >
                  <span>{Number(day.slice(-2))}</span>
                  {count > 0 && (
                    <small>
                      {count}
                      <span className="staff-appointments-date-count">
                        {" "}
                        appt{count > 1 ? "s" : ""}
                      </span>
                    </small>
                  )}
                </button>
              );
            })}
          </div>
          <div className="staff-appointments-calendar-caption">
            {formatAppointmentDate(date)} · {daily.length} appointments
          </div>
        </>
      )}
      <div
        className="staff-appointments-calendar-scroll"
        tabIndex={0}
        aria-label="Calendar appointments"
      >
        {view === "day" ? (
          slots.map((slot) => (
            <div className="staff-appointments-slot" key={slot}>
              <time>{slot}</time>
              <div>
                {daily.filter((a) => (a.timeSlot || "Time not recorded") === slot).map(eventButton)}
              </div>
            </div>
          ))
        ) : view === "week" ? (
          <div className="staff-appointments-week-agenda">
            {days.map((day) => {
              const appointments = sortAppointments(records.filter((a) => a.date === day));
              return (
                <section key={day} aria-label={formatAppointmentDate(day)}>
                  <h3>
                    {formatAppointmentDate(day, { year: undefined })}{" "}
                    <span>· {appointments.length}</span>
                  </h3>
                  {appointments.map(eventButton)}
                  {appointments.length === 0 && <p>No appointments</p>}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="staff-appointments-day-agenda">{daily.map(eventButton)}</div>
        )}
        {daily.length === 0 && view !== "week" && (
          <p className="staff-appointments-hint">No appointments on this date.</p>
        )}
      </div>
    </DashboardSection>
  );
}
