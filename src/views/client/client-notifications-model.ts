import type { HearingDto } from "@/shared/contracts/domains";
import { addCalendarDaysIso, todayIsoInFirmTz } from "@/shared/crm/appointment-dates";

export type NotificationCategory = "all" | "unread" | "documents" | "messages" | "hearings";
export type NotificationGroup = "Today" | "This Week" | "Earlier";

export interface ClientNotification {
  id: string;
  title: string;
  body: string;
  type: "hearing_reminder" | "task_due" | "document_request" | "message" | "system";
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ClientImportantAppointment {
  date: string;
  timeSlot: string;
  status: string;
  practiceArea: string;
}

const groupOrder: NotificationGroup[] = ["Today", "This Week", "Earlier"];

export function filterClientNotifications(
  notifications: ClientNotification[],
  category: NotificationCategory,
): ClientNotification[] {
  switch (category) {
    case "unread":
      return notifications.filter((item) => !item.isRead);
    case "documents":
      return notifications.filter((item) => item.type === "document_request");
    case "messages":
      return notifications.filter((item) => item.type === "message");
    case "hearings":
      return notifications.filter((item) => item.type === "hearing_reminder");
    default:
      return notifications;
  }
}

/** A calendar day in Nepal, independent of the viewer's browser timezone. */
export function kathmanduDay(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (kind: string) => parts.find((part) => part.type === kind)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function mondayOfKathmanduWeek(now: Date): string {
  const today = kathmanduDay(now);
  const [year, month, day] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addCalendarDaysIso(today, -((weekday + 6) % 7));
}

export function notificationGroup(createdAt: string, now: Date): NotificationGroup {
  const created = new Date(createdAt);
  if (Number.isNaN(created.valueOf())) return "Earlier";
  const day = kathmanduDay(created);
  if (day === kathmanduDay(now)) return "Today";
  return day >= mondayOfKathmanduWeek(now) ? "This Week" : "Earlier";
}

export function groupClientNotifications(notifications: ClientNotification[], now: Date) {
  const grouped: Record<NotificationGroup, ClientNotification[]> = {
    Today: [],
    "This Week": [],
    Earlier: [],
  };
  for (const item of notifications) grouped[notificationGroup(item.createdAt, now)].push(item);
  return groupOrder
    .filter((heading) => grouped[heading].length > 0)
    .map((heading) => ({
      heading,
      items: grouped[heading],
    }));
}

export function nearestUpcomingHearing(hearings: HearingDto[], now: Date): HearingDto | null {
  const today = todayIsoInFirmTz(now);
  return (
    hearings
      .filter(
        (hearing) =>
          hearing.status === "scheduled" &&
          Boolean(hearing.dateGregorian) &&
          String(hearing.dateGregorian).slice(0, 10) >= today,
      )
      .sort((left, right) =>
        `${left.dateGregorian} ${left.time ?? ""}`.localeCompare(
          `${right.dateGregorian} ${right.time ?? ""}`,
        ),
      )[0] ?? null
  );
}

export function nearestConfirmedAppointment(
  appointments: ClientImportantAppointment[],
  now: Date,
): ClientImportantAppointment | null {
  const today = todayIsoInFirmTz(now);
  return (
    appointments
      .filter((appointment) => appointment.status === "confirmed" && appointment.date >= today)
      .sort((left, right) =>
        `${left.date} ${left.timeSlot}`.localeCompare(`${right.date} ${right.timeSlot}`),
      )[0] ?? null
  );
}
