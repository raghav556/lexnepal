import { describe, expect, it } from "vitest";
import {
  appointmentCreateSchema,
  appointmentSlotsSchema,
  intakeSubmitSchema,
  leadConvertSchema,
  leadCreateSchema,
  leadUpdateSchema,
} from "../../src/shared/contracts/crm";

describe("CRM input contracts", () => {
  it("validates lead create and update", () => {
    expect(
      leadCreateSchema.safeParse({
        fullName: "Ada Client",
        email: "ada@example.com",
        source: "website",
      }).success,
    ).toBe(true);
    expect(leadCreateSchema.safeParse({ fullName: "" }).success).toBe(false);
    expect(leadUpdateSchema.safeParse({ status: "contacted" }).success).toBe(true);
    expect(leadUpdateSchema.safeParse({ status: "bogus" }).success).toBe(false);
  });

  it("validates convert and intake", () => {
    expect(
      leadConvertSchema.safeParse({ type: "corporate", companyName: "Acme Pvt Ltd" }).success,
    ).toBe(true);
    expect(
      intakeSubmitSchema.safeParse({
        fullName: "Ada Client",
        phone: "+977-9800000000",
        practiceArea: "Corporate",
        caseDescription: "Company formation",
      }).success,
    ).toBe(true);
    expect(intakeSubmitSchema.safeParse({ fullName: "Ada", phone: "" }).success).toBe(false);
  });

  it("validates appointment create and slots", () => {
    expect(
      appointmentCreateSchema.safeParse({
        clientName: "Ada",
        clientPhone: "+977-9800000000",
        practiceArea: "Corporate",
        date: "2026-08-10",
        timeSlot: "10:00 AM",
      }).success,
    ).toBe(true);
    expect(appointmentSlotsSchema.safeParse({ date: "2026-08-10" }).success).toBe(true);
    expect(appointmentSlotsSchema.safeParse({ date: "08-10-2026" }).success).toBe(false);
  });
});
