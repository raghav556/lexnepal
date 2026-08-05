import { describe, expect, it } from "vitest";
import {
  financialIdempotencyKeySchema,
  initiateGatewaySchema,
  payInvoiceSchema,
  trustCreateSchema,
} from "../../src/shared/contracts/financial";

describe("Financial idempotency contracts (R4.4)", () => {
  it("accepts stable idempotency keys on pay, gateway, and trust", () => {
    expect(financialIdempotencyKeySchema.safeParse("pay-abc-01").success).toBe(true);
    expect(financialIdempotencyKeySchema.safeParse("short").success).toBe(false);
    expect(financialIdempotencyKeySchema.safeParse("bad key!").success).toBe(false);

    expect(
      payInvoiceSchema.safeParse({
        gateway: "bank_transfer",
        idempotencyKey: "invoice-pay-key-1",
      }).success,
    ).toBe(true);
    expect(
      initiateGatewaySchema.safeParse({
        gateway: "esewa",
        idempotencyKey: "gateway-key-01",
      }).success,
    ).toBe(true);
    expect(
      trustCreateSchema.safeParse({
        clientId: "123e4567-e89b-12d3-a456-426614174000",
        type: "receipt",
        amount: 1000,
        description: "Retainer",
        date: "2026-08-01",
        balance: 1000,
        idempotencyKey: "trust-key-01",
      }).success,
    ).toBe(true);
  });
});
