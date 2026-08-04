import { describe, expect, it } from "vitest";
import {
  expenseCreateSchema,
  invoiceFromTimeSchema,
  payInvoiceSchema,
  timeEntryCreateSchema,
  trustCreateSchema,
} from "../../src/shared/contracts/financial";

describe("Financial input contracts", () => {
  it("validates invoice-from-time rules", () => {
    const parsed = invoiceFromTimeSchema.safeParse({
      caseId: "123e4567-e89b-12d3-a456-426614174000",
      clientId: "123e4567-e89b-12d3-a456-426614174001",
      dueDate: "2026-09-01",
    });
    expect(parsed.success).toBe(true);
    expect(
      invoiceFromTimeSchema.safeParse({
        caseId: "bad",
        clientId: "123e4567-e89b-12d3-a456-426614174001",
        dueDate: "2026-09-01",
      }).success,
    ).toBe(false);
  });

  it("validates time entry date and minutes", () => {
    const parsed = timeEntryCreateSchema.safeParse({
      caseId: "123e4567-e89b-12d3-a456-426614174000",
      description: "Draft petition",
      minutes: 45,
      isBillable: true,
      date: "2026-08-04",
      ratePerHour: 5000,
    });
    expect(parsed.success).toBe(true);
    expect(
      timeEntryCreateSchema.safeParse({
        caseId: "123e4567-e89b-12d3-a456-426614174000",
        description: "Draft petition",
        minutes: 0,
        date: "2026-08-04",
        ratePerHour: 5000,
      }).success,
    ).toBe(false);
  });

  it("validates trust and expense payloads", () => {
    expect(
      trustCreateSchema.safeParse({
        clientId: "123e4567-e89b-12d3-a456-426614174000",
        type: "receipt",
        amount: 1000,
        description: "Retainer",
        date: "2026-08-01",
        balance: 1000,
      }).success,
    ).toBe(true);
    expect(
      expenseCreateSchema.safeParse({
        description: "Courier",
        category: "courier",
        amount: 500,
        date: "2026-08-01",
      }).success,
    ).toBe(true);
    expect(payInvoiceSchema.safeParse({ gateway: "esewa", amount: 100 }).success).toBe(true);
  });
});
