import { describe, expect, it } from "vitest";
import {
  EMPTY_STAFF_CASE_FILTERS,
  matchesStaffCaseFilters,
  staffCaseFilterOptions,
} from "@/components/cases/staff-case-filters";

const cases = [
  { assignedLawyerId: "a", clientId: "client-a", practiceArea: "Civil" },
  { assignedLawyerId: "b", clientId: "client-b", practiceArea: " Corporate " },
  { assignedLawyerId: "missing", clientId: "missing", practiceArea: "" },
  { assignedLawyerId: "", clientId: "client-a", practiceArea: "Civil" },
];
describe("Staff Cases local filter contract", () => {
  it("retains all records and their original order with no filters, including unavailable directories", () => {
    expect(
      cases.filter((matter) => matchesStaffCaseFilters(matter, EMPTY_STAFF_CASE_FILTERS)),
    ).toEqual(cases);
  });
  it("matches assigned IDs exactly even when people have identical names", () => {
    expect(
      cases.filter((matter) =>
        matchesStaffCaseFilters(matter, { ...EMPTY_STAFF_CASE_FILTERS, lawyerId: "b" }),
      ),
    ).toEqual([cases[1]]);
    expect(matchesStaffCaseFilters(cases[0], { ...EMPTY_STAFF_CASE_FILTERS, lawyerId: "A" })).toBe(
      false,
    );
  });
  it("distinguishes genuine unassigned cases from missing directory records", () => {
    expect(
      cases.filter((matter) =>
        matchesStaffCaseFilters(matter, { ...EMPTY_STAFF_CASE_FILTERS, lawyerId: "unassigned" }),
      ),
    ).toEqual([cases[3]]);
  });
  it("combines lawyer, client and practice selections using AND", () => {
    expect(
      matchesStaffCaseFilters(cases[0], {
        lawyerId: "a",
        clientId: "client-a",
        practiceArea: "Civil",
      }),
    ).toBe(true);
    expect(
      matchesStaffCaseFilters(cases[0], {
        lawyerId: "a",
        clientId: "client-b",
        practiceArea: "Civil",
      }),
    ).toBe(false);
    expect(
      matchesStaffCaseFilters(cases[1], { ...EMPTY_STAFF_CASE_FILTERS, practiceArea: "Corporate" }),
    ).toBe(true);
  });
  it("offers only named directories referenced by accessible cases, without merging equal names", () => {
    const options = staffCaseFilterOptions(
      cases,
      [
        { _id: "a", name: "Same Name" },
        { _id: "b", name: "Same Name" },
        { _id: "outside", name: "Out of scope" },
      ],
      [
        { _id: "client-a", fullName: "Client A" },
        { _id: "outside", fullName: "Other client" },
      ],
    );
    expect(options.lawyers.map((option) => option.id)).toEqual(["a", "b"]);
    expect(options.clients).toEqual([{ id: "client-a", label: "Client A" }]);
    expect(options.practiceAreas).toEqual(["Civil", "Corporate"]);
    expect(options.hasUnassigned).toBe(true);
  });
  it("does not invent options for inaccessible/unnamed records or an empty collection", () => {
    const options = staffCaseFilterOptions(cases, [{ _id: "a", name: "  " }], []);
    expect(options.lawyers).toEqual([]);
    expect(options.clients).toEqual([]);
    expect(staffCaseFilterOptions([], [], [])).toEqual({
      lawyers: [],
      clients: [],
      practiceAreas: [],
      hasUnassigned: false,
    });
  });
});
