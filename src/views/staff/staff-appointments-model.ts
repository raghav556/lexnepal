import type { AppointmentCreateInput } from "@/shared/contracts/crm";
import { addCalendarDaysIso } from "@/shared/crm/appointment-dates";

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type StaffAppointment = Partial<AppointmentCreateInput> & {
  id?: string;
  _id?: string;
  status?: AppointmentStatus;
  meetingLink?: string | null;
};
export type CalendarView = "day" | "week" | "month";
export type AppointmentTab = "today" | "upcoming" | "completed" | "all";
export const appointmentKey = (appointment: StaffAppointment) =>
  appointment.id || appointment._id || "";
export const isActiveAppointment = (appointment: StaffAppointment) =>
  appointment.status === "pending" || appointment.status === "confirmed";

/** Resolve only inside visible results; a hidden record must never supply detail actions. */
export function visibleAppointmentSelection(visible: StaffAppointment[], selectedId: string) {
  return (
    visible.find((a) => appointmentKey(a) === selectedId) ||
    visible.find(isActiveAppointment) ||
    visible[0]
  );
}

export function slotMinutes(slot = ""): number {
  const match = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return (
    ((Number(match[1]) % 12) + (match[3].toUpperCase() === "PM" ? 12 : 0)) * 60 + Number(match[2])
  );
}

export function sortAppointments(records: StaffAppointment[]) {
  return [...records].sort(
    (a, b) =>
      (a.date ?? "").localeCompare(b.date ?? "") ||
      slotMinutes(a.timeSlot) - slotMinutes(b.timeSlot) ||
      (a.clientName ?? "").localeCompare(b.clientName ?? ""),
  );
}

export function appointmentKpis(records: StaffAppointment[], today: string) {
  return {
    today: records.filter((a) => a.date === today && isActiveAppointment(a)).length,
    upcoming: records.filter((a) => (a.date ?? "") > today && isActiveAppointment(a)).length,
    pending: records.filter((a) => a.status === "pending").length,
    completed: records.filter(
      (a) => a.status === "completed" && a.date?.slice(0, 7) === today.slice(0, 7),
    ).length,
  };
}

export function filterAppointments(
  records: StaffAppointment[],
  filters: {
    tab: AppointmentTab;
    today: string;
    date: string;
    search: string;
    status: string;
  },
) {
  const q = filters.search.trim().toLocaleLowerCase();
  return sortAppointments(
    records.filter((a) => {
      if (filters.status !== "all" && a.status !== filters.status) return false;
      if (filters.tab === "today" && a.date !== filters.date) return false;
      if (
        filters.tab === "upcoming" &&
        (!isActiveAppointment(a) || (a.date ?? "") <= filters.today)
      )
        return false;
      if (filters.tab === "completed" && a.status !== "completed") return false;
      return (
        !q ||
        [a.clientName, a.clientEmail, a.clientPhone, a.practiceArea, a.notes].some((v) =>
          v?.toLocaleLowerCase().includes(q),
        )
      );
    }),
  );
}

export function calendarDays(date: string, view: CalendarView): string[] {
  if (view === "day") return [date];
  const first = view === "month" ? `${date.slice(0, 7)}-01` : date;
  const weekday = new Date(`${first}T12:00:00Z`).getUTCDay();
  const monday = addCalendarDaysIso(first, -(weekday + 6) % 7);
  return Array.from({ length: view === "month" ? 42 : 7 }, (_, i) => addCalendarDaysIso(monday, i));
}

export function navigateCalendar(date: string, view: CalendarView, direction: number) {
  if (view !== "month") return addCalendarDaysIso(date, direction * (view === "week" ? 7 : 1));
  const current = new Date(`${date}T12:00:00Z`);
  const day = current.getUTCDate();
  current.setUTCDate(1);
  current.setUTCMonth(current.getUTCMonth() + direction);
  const last = new Date(
    Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0),
  ).getUTCDate();
  current.setUTCDate(Math.min(day, last));
  return current.toISOString().slice(0, 10);
}

export function appointmentInitials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0])
      .join("")
      .toUpperCase() || "?"
  );
}
