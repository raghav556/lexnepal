import { describe, expect, it } from "vitest";
import { leadCreateSchema } from "@/shared/contracts/crm";
import {
  buildStaffLeadCreatePayload,
  filterStaffLeads,
  leadCsvRows,
  leadInitials,
  leadKpis,
  type StaffLead,
} from "@/views/staff/staff-crm-model";

const leads: StaffLead[] = [
  { _id: "1", fullName: "Sunita Maharjan", email: "sunita@example.com", status: "new", practiceAreaInterest: "Property", assignedTo: null },
  { _id: "2", fullName: "Dipen Shah", status: "consultation_scheduled", practiceAreaInterest: "Trade", assignedTo: "user-1" },
  { _id: "3", fullName: "Roja Basnet", status: "converted", assignedTo: "user-2" },
  { _id: "4", fullName: "Lost Lead", status: "lost", practiceAreaInterest: "Property", assignedTo: "user-1" },
];

describe("staff CRM list model", () => {
  it("counts only real lead stages", () => {
    expect(leadKpis(leads)).toEqual({ total: 4, fresh: 1, consultations: 1, converted: 1 });
  });

  it("filters by stage, practice area, and unassigned leads", () => {
    expect(filterStaffLeads(leads, { tab: "consultation_scheduled", practiceArea: "all", unassignedOnly: false })).toHaveLength(1);
    expect(filterStaffLeads(leads, { tab: "all", practiceArea: "Property", unassignedOnly: false }).map((lead) => lead.fullName)).toEqual([
      "Sunita Maharjan",
      "Lost Lead",
    ]);
    expect(filterStaffLeads(leads, { tab: "all", practiceArea: "all", unassignedOnly: true })).toHaveLength(1);
  });

  it("builds initials and a CSV without invented company or follow-up columns", () => {
    expect(leadInitials("Sunita Maharjan")).toBe("SM");
    expect(leadInitials("")).toBe("—");
    const [row] = leadCsvRows(leads, () => "Prabin Shrestha");
    expect(row).toContain("Sunita Maharjan");
    expect(row?.join(",")).not.toMatch(/company|follow-up|%/i);
  });

  it("builds a schema-valid lead and rejects the unassigned sentinel", () => {
    const built = buildStaffLeadCreatePayload(
      {
        fullName: "  Sunita Maharjan  ",
        email: "sunita@example.com\n",
        phone: " 9801234567 ",
        source: "walk_in",
        practiceAreaInterest: "Property",
        assignedTo: "unassigned",
        notes: "Call back.\nBring the deed.",
        message: "First line.\nSecond line.",
      },
      { canAssign: true },
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.payload.assignedTo).toBeNull();
    expect(built.payload.source).toBe("walk_in");
    expect(built.payload.notes).toBe("Call back.\nBring the deed.");
    expect(leadCreateSchema.safeParse(built.payload).success).toBe(true);
    const scoped = buildStaffLeadCreatePayload(
      {
        fullName: "Sunita Maharjan",
        email: "",
        phone: "",
        source: "walk_in",
        practiceAreaInterest: "",
        assignedTo: "11111111-1111-4111-8111-111111111111",
        notes: "",
        message: "",
      },
      { canAssign: false },
    );
    expect(scoped.ok && scoped.payload.assignedTo).toBeUndefined();
    expect(
      leadCreateSchema.safeParse({ ...built.payload, assignedTo: "unassigned" }).success,
    ).toBe(false);
    const unnamed = buildStaffLeadCreatePayload(
      {
        fullName: "   ",
        email: "",
        phone: "",
        source: "walk_in",
        practiceAreaInterest: "",
        assignedTo: "unassigned",
        notes: "",
        message: "",
      },
      { canAssign: false },
    );
    expect(unnamed.ok).toBe(false);
    if (!unnamed.ok) expect(unnamed.message).toMatch(/Full name/);
    const longPhone = buildStaffLeadCreatePayload(
      {
        fullName: "Sunita Maharjan",
        email: "",
        phone: "9".repeat(41),
        source: "walk_in",
        practiceAreaInterest: "",
        assignedTo: "unassigned",
        notes: "",
        message: "",
      },
      { canAssign: true },
    );
    expect(longPhone.ok).toBe(false);
    if (!longPhone.ok) expect(longPhone.message).toMatch(/Phone/);
    const labeledSource = buildStaffLeadCreatePayload(
      {
        fullName: "Sunita Maharjan",
        email: "",
        phone: "",
        source: "Walk-in",
        practiceAreaInterest: "",
        assignedTo: "unassigned",
        notes: "",
        message: "",
      },
      { canAssign: true },
    );
    expect(labeledSource.ok).toBe(false);
    if (!labeledSource.ok) expect(labeledSource.message).toMatch(/source/);
  });
});
