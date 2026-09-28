import { describe, expect, it } from "vitest";
import type { HearingDto } from "@/shared/contracts/domains";
import {
  filterClientNotifications,
  groupClientNotifications,
  kathmanduDay,
  mondayOfKathmanduWeek,
  nearestConfirmedAppointment,
  nearestUpcomingHearing,
  notificationGroup,
  type ClientNotification,
} from "@/views/client/client-notifications-model";

const now = new Date("2026-09-18T05:30:00.000Z");
const feed: ClientNotification[] = [
  {
    id: "hearing",
    title: "Hearing",
    body: "A hearing",
    type: "hearing_reminder",
    isRead: false,
    createdAt: "2026-09-18T02:45:00.000Z",
  },
  {
    id: "message",
    title: "Message",
    body: "A message",
    type: "message",
    isRead: false,
    createdAt: "2026-09-18T03:30:00.000Z",
  },
  {
    id: "document",
    title: "Document",
    body: "A document",
    type: "document_request",
    isRead: true,
    createdAt: "2026-09-14T07:15:00.000Z",
  },
  {
    id: "signature",
    title: "Signature",
    body: "A signature",
    type: "document_request",
    isRead: false,
    createdAt: "2026-09-17T10:15:00.000Z",
  },
  {
    id: "task",
    title: "Task",
    body: "A task",
    type: "task_due",
    isRead: true,
    createdAt: "2026-08-28T05:15:00.000Z",
  },
  {
    id: "system",
    title: "System",
    body: "A status",
    type: "system",
    isRead: true,
    createdAt: "2026-08-27T05:15:00.000Z",
  },
];

describe("CUI-15 notification view model", () => {
  it("filters the returned feed without inventing a signature category", () => {
    expect(filterClientNotifications(feed, "all")).toHaveLength(6);
    expect(filterClientNotifications(feed, "unread").map((item) => item.id)).toEqual([
      "hearing",
      "message",
      "signature",
    ]);
    expect(filterClientNotifications(feed, "documents").map((item) => item.id)).toEqual([
      "document",
      "signature",
    ]);
    expect(filterClientNotifications(feed, "messages").map((item) => item.id)).toEqual(["message"]);
    expect(filterClientNotifications(feed, "hearings").map((item) => item.id)).toEqual(["hearing"]);
    expect(filterClientNotifications(feed, "all").map((item) => item.id)).toContain("task");
    expect(filterClientNotifications(feed, "all").map((item) => item.id)).toContain("system");
  });

  it("uses Kathmandu calendar days and a Monday-start week", () => {
    expect(kathmanduDay(new Date("2026-09-17T18:20:00.000Z"))).toBe("2026-09-18");
    expect(mondayOfKathmanduWeek(now)).toBe("2026-09-14");
    expect(mondayOfKathmanduWeek(new Date("2026-09-20T05:30:00.000Z"))).toBe("2026-09-14");
    expect(notificationGroup("2026-09-17T18:20:00.000Z", now)).toBe("Today");
    expect(notificationGroup("2026-09-14T00:00:00.000Z", now)).toBe("This Week");
    expect(notificationGroup("2026-09-13T18:14:59.000Z", now)).toBe("Earlier");
    expect(groupClientNotifications(feed, now).map((group) => group.heading)).toEqual([
      "Today",
      "This Week",
      "Earlier",
    ]);
    expect(
      groupClientNotifications(filterClientNotifications(feed, "messages"), now).map(
        (group) => group.heading,
      ),
    ).toEqual(["Today"]);
  });

  it("selects only the nearest scheduled hearing and confirmed appointment", () => {
    const hearings = [
      { status: "completed", dateGregorian: "2026-09-18", time: "08:00" },
      { status: "scheduled", dateGregorian: "2026-09-22", time: "10:30" },
      { status: "scheduled", dateGregorian: "2026-09-19", time: "11:00" },
      { status: "scheduled", dateGregorian: "2026-09-01", time: "09:00" },
    ] as HearingDto[];
    expect(nearestUpcomingHearing(hearings, now)?.dateGregorian).toBe("2026-09-19");
    const appointments = [
      {
        status: "pending",
        date: "2026-09-19",
        timeSlot: "09:00 AM",
        practiceArea: "Virtual Consultation",
      },
      {
        status: "confirmed",
        date: "2026-10-12",
        timeSlot: "11:00 AM",
        practiceArea: "Virtual Consultation",
      },
      {
        status: "confirmed",
        date: "2026-09-17",
        timeSlot: "01:00 PM",
        practiceArea: "Phone Consultation",
      },
    ];
    expect(nearestConfirmedAppointment(appointments, now)?.date).toBe("2026-10-12");
  });
});
