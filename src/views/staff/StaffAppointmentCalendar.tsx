"use client";

import { useI18n } from "@/lib/i18n-context";
import { toNepaliDigits } from "@/lib/nepali-calendar";

import { useRef } from "react";
import { calendarMonthBounds, calendarMonthLabel, calendarDayLabel, calendarDateLabel, calendarWeekdays, supportsBsConversion, canShiftCalendarMonth } from "@/lib/nepali-calendar";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardButton, DashboardSection } from "@/components/dashboard";
import { DEFAULT_APPOINTMENT_SLOTS } from "@/shared/crm/appointment-slots";
import { addCalendarDaysIso } from "@/shared/crm/appointment-dates";
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
  const { language } = useI18n();
  const grid = useRef<HTMLDivElement>(null);
  const days = calendarDays(date, view, language);
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
            disabled={view === "month" && !canShiftCalendarMonth(date, -1, language)}
            onClick={() => onDate(navigateCalendar(date, view, -1, language))}
          >
            <ChevronLeft size={16} />
          </DashboardButton>
          <DashboardButton
            variant="ghost"
            size="icon"
            aria-label={`Next ${view}`}
            disabled={view === "month" && !canShiftCalendarMonth(date, 1, language)}
            onClick={() => onDate(navigateCalendar(date, view, 1, language))}
          >
            <ChevronRight size={16} />
          </DashboardButton>
        </div>
        <strong aria-live="polite">
          {calendarMonthLabel(date, language)}
        </strong>
        <div className="staff-appointments-segments" role="group" aria-label="Calendar view">
          {(["day", "week", "month"] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              aria-pressed={mode === view}
              onClick={() => onView(mode)}
            >
              {language === "ne" ? { day: "दिन", week: "हप्ता", month: "महिना" }[mode] : mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="staff-appointments-calendar-caption">
        <CalendarDays size={15} aria-hidden />
        <span>
          {view === "month" ? calendarMonthLabel(date, language) : view === "day"
            ? calendarDateLabel(date, language)
            : days.length ? `${calendarDateLabel(days[0], language)} – ${calendarDateLabel(days.at(-1)!, language)}` : calendarDateLabel(date, language)}
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
              if (!supportsBsConversion(next)) return;
              onDate(next);
              requestAnimationFrame(() =>
                grid.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus(),
              );
            }}
          >
            {calendarWeekdays(language, true).map((d, i) => (
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
                  aria-label={`${calendarDateLabel(day, language)}, ${count} appointments`}
                  aria-pressed={day === date}
                  aria-current={day === today ? "date" : undefined}
                  className={
                    calendarMonthBounds(day, language).start !== calendarMonthBounds(date, language).start ? "staff-appointments-outside" : ""
                  }
                  disabled={language === "ne" && !supportsBsConversion(day)}
                  onClick={() => onDate(day)}
                >
                  <span className="staff-appointments-date-number">{supportsBsConversion(day) || language === "en" ? calendarDayLabel(day, language) : "—"}</span>
                  {count > 0 && (
                    <small>
                      {language === "ne" ? toNepaliDigits(count) : count}
                      <span className="staff-appointments-date-count">
                        {" "}
                        {language === "ne" ? "भेट" : `appt${count > 1 ? "s" : ""}`}
                      </span>
                    </small>
                  )}
                </button>
              );
            })}
          </div>
          <div className="staff-appointments-calendar-caption">
            {calendarDateLabel(date, language)} · {daily.length} {language === "ne" ? "भेट" : "appointments"}
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
                <section key={day} aria-label={calendarDateLabel(day, language)}>
                  <h3>
                    {calendarDateLabel(day, language)}{" "}
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
