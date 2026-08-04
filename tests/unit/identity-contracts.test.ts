import { describe, expect, it } from "vitest";
import {
  createUserSchema,
  updateUserSchema,
  updateSystemSettingsSchema,
  auditQuerySchema,
} from "../../src/shared/contracts/identity";

describe("Identity input contracts", () => {
  it("validates basic user creation", () => {
    const validUser = {
      name: "John Doe",
      email: "john@example.com",
      role: "associate",
      isPublicFacing: true,
      invite: true,
    };
    
    expect(createUserSchema.safeParse(validUser).success).toBe(true);
    
    // Invalid email
    expect(createUserSchema.safeParse({ ...validUser, email: "not-an-email" }).success).toBe(false);
    
    // Invalid role
    expect(createUserSchema.safeParse({ ...validUser, role: "invalid-role" }).success).toBe(false);
  });

  it("requires at least one field for update user", () => {
    expect(updateUserSchema.safeParse({}).success).toBe(false);
    expect(updateUserSchema.safeParse({ name: "Jane Doe" }).success).toBe(true);
  });

  it("validates system settings formats", () => {
    const validSettings = {
      defaultHourlyRate: "150.00",
      vatRate: "13.0",
      invoicePaymentTerms: "30",
      defaultLanguage: "en",
      clientPortalEnabled: true,
      onlineBookingEnabled: false,
    };
    
    expect(updateSystemSettingsSchema.safeParse(validSettings).success).toBe(true);
    
    // Invalid numeric formats
    expect(updateSystemSettingsSchema.safeParse({ defaultHourlyRate: "abc" }).success).toBe(false);
    expect(updateSystemSettingsSchema.safeParse({ invoicePaymentTerms: "30 days" }).success).toBe(false);
  });

  it("validates audit query limits", () => {
    expect(auditQuerySchema.safeParse({ limit: 100 }).success).toBe(true);
    expect(auditQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(auditQuerySchema.safeParse({ limit: 500 }).success).toBe(false);
  });
});
