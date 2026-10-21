import { describe, expect, it } from "vitest";
import {
  appointmentKpis,
  calendarDays,
  filterAppointments,
  navigateCalendar,
  slotMinutes,
  sortAppointments,
  visibleAppointmentSelection,
  type StaffAppointment,
} from "@/views/staff/staff-appointments-model";
import { todayIsoInFirmTz } from "@/shared/crm/appointment-dates";

const today = "2026-10-20";
const rows: StaffAppointment[] = [
  {
    id: "a",
    clientName: "Sunita Maharjan",
    date: today,
    timeSlot: "01:30 PM",
    status: "confirmed",
    notes: "Review deed",
  },
  { id: "b", clientName: "Ramesh Karki", date: today, timeSlot: "10:00 AM", status: "pending" },
  { id: "c", date: today, status: "cancelled" },
  { id: "d", date: "2026-10-21", status: "pending" },
  { id: "e", date: "2026-10-21", status: "cancelled" },
  { id: "f", date: "2026-10-02", status: "completed" },
  { id: "g", date: "2026-09-30", status: "completed" },
  { id: "h", date: "2026-10-01", status: "pending" },
  { id: "i", date: "2026-11-01", status: "completed" },
];
const filters = { today, date: today, tab: "today" as const, search: "", status: "all" };

describe("staff appointment model", () => {
  it("counts only active today/upcoming, all pending and this month's completed appointment dates", () => {
    expect(appointmentKpis(rows, today)).toEqual({
      today: 2,
      upcoming: 1,
      pending: 3,
      completed: 1,
    });
  });
  it("uses the Kathmandu day at the UTC boundary", () => {
    expect(todayIsoInFirmTz(new Date("2026-10-19T18:20:00Z"))).toBe(today);
    expect(todayIsoInFirmTz(new Date("2026-10-19T18:10:00Z"))).toBe("2026-10-19");
  });
  it("searches case-insensitively across real contact, practice and note fields", () => {
    expect(filterAppointments(rows, { ...filters, search: "  DEED " }).map((a) => a.id)).toEqual([
      "a",
    ]);
    expect(filterAppointments(rows, { ...filters, search: "KARKI" }).map((a) => a.id)).toEqual([
      "b",
    ]);
  });
  it("combines status and day filters", () => {
    expect(filterAppointments(rows, { ...filters, status: "cancelled" }).map((a) => a.id)).toEqual([
      "c",
    ]);
    expect(filterAppointments(rows, { ...filters, date: "2026-10-21" }).map((a) => a.id)).toEqual([
      "d",
      "e",
    ]);
  });
  it("upcoming omits terminal records and completed includes history", () => {
    expect(filterAppointments(rows, { ...filters, tab: "upcoming" }).map((a) => a.id)).toEqual([
      "d",
    ]);
    expect(filterAppointments(rows, { ...filters, tab: "completed" }).map((a) => a.id)).toEqual([
      "g",
      "f",
      "i",
    ]);
    expect(filterAppointments(rows, { ...filters, tab: "all" })).toHaveLength(rows.length);
  });
  it("sorts actual start slots without inventing duration and leaves its input untouched", () => {
    expect(sortAppointments(rows.filter((a) => a.date === today)).map((a) => a.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(rows[0].id).toBe("a");
    expect(slotMinutes("12:00 AM")).toBe(0);
    expect(slotMinutes("12:00 PM")).toBe(720);
    expect(slotMinutes("01:30 PM")).toBe(810);
    expect(slotMinutes()).toBe(Number.MAX_SAFE_INTEGER);
  });
  it("handles empty and missing optional fields", () => {
    expect(appointmentKpis([], today)).toEqual({ today: 0, upcoming: 0, pending: 0, completed: 0 });
    expect(filterAppointments([{}], { ...filters, tab: "all", search: "sunita" })).toEqual([]);
  });
  it("builds Monday-based week and complete six-week month grids across years", () => {
    expect(calendarDays(today, "day")).toEqual([today]);
    expect(calendarDays(today, "week")).toEqual([
      "2026-10-19",
      today,
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
    const month = calendarDays("2027-01-15", "month", "ne");
    expect(month).toHaveLength(42);
    // Magh 2083 begins 15 January (official Embassy holiday fixture).
    expect(month[0]).toBe("2027-01-11");
    expect(month.at(-1)).toBe("2027-02-21");
    expect(calendarDays("2026-06-15", "month", "ne")[0]).toBe("2026-06-15");
    expect(calendarDays("2027-01-15", "month", "en")[0]).toBe("2026-12-28");
  });
  it("moves by the active calendar's months while preserving day/week navigation", () => {
    expect(navigateCalendar("2026-01-31", "month", 1, "ne")).toBe("2026-03-01");
    expect(navigateCalendar("2026-01-31", "month", 1, "en")).toBe("2026-02-28");
    expect(navigateCalendar("2028-01-31", "month", 1)).toBe("2028-02-29");
    expect(navigateCalendar("2027-01-01", "day", -1)).toBe("2026-12-31");
    expect(navigateCalendar(today, "week", 1)).toBe("2026-10-27");
  });

  it("replaces a selection when switching to another date and clears it for an empty day", () => {
    const nextDay = filterAppointments(rows, { ...filters, date: "2026-10-21" });
    expect(visibleAppointmentSelection(nextDay, "b")?.id).toBe("d");
    expect(
      visibleAppointmentSelection(
        filterAppointments(rows, { ...filters, date: "2026-10-22" }),
        "b",
      ),
    ).toBeUndefined();
  });
  it("keeps a valid current selection across calendar view changes", () => {
    const visible = filterAppointments(rows, filters);
    for (const view of ["day", "week", "month"] as const) {
      expect(calendarDays(today, view)).toContain(today);
      expect(visibleAppointmentSelection(visible, "a")?.id).toBe("a");
    }
  });
  it("never resolves hidden records after search, status or tab changes", () => {
    expect(
      visibleAppointmentSelection(filterAppointments(rows, { ...filters, search: "sunita" }), "b")
        ?.id,
    ).toBe("a");
    expect(
      visibleAppointmentSelection(
        filterAppointments(rows, { ...filters, status: "confirmed" }),
        "b",
      )?.id,
    ).toBe("a");
    expect(
      visibleAppointmentSelection(filterAppointments(rows, { ...filters, tab: "completed" }), "b")
        ?.id,
    ).toBe("g");
    expect(
      visibleAppointmentSelection(filterAppointments(rows, { ...filters, search: "missing" }), "b"),
    ).toBeUndefined();
  });
  it("keeps a deep-linked authorized appointment on its actual day, including terminal records", () => {
    for (const id of ["d", "e", "f"]) {
      const linked = rows.find((a) => a.id === id)!;
      const visible = filterAppointments(rows, { ...filters, date: linked.date! });
      expect(visibleAppointmentSelection(visible, id)?.id).toBe(id);
    }
    expect(
      visibleAppointmentSelection(filterAppointments(rows, filters), "not-authorized")?.id,
    ).not.toBe("not-authorized");
  });
});
