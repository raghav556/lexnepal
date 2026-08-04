import { describe, expect, it } from "vitest";
import { requireFirmContext, requireSameFirm } from "../../src/server/policies/authorization";
import { AppError } from "../../src/shared/errors/api-error";
import type { AuthPrincipal } from "../../src/server/auth/types";

describe("Cross-firm security policies", () => {
  it("enforces that principal firm matches context firm", () => {
    const validPrincipal: AuthPrincipal = {
      user: { id: "user-1", firmId: "firm-A", role: "associate" } as any,
      firmId: "firm-A",
      sessionId: "session-1",
      capabilities: new Set(),
    };

    expect(() => requireFirmContext(validPrincipal)).not.toThrow();

    const crossFirmPrincipal: AuthPrincipal = {
      user: { id: "user-1", firmId: "firm-A", role: "associate" } as any,
      firmId: "firm-B", // Malicious or mixed up context
      sessionId: "session-1",
      capabilities: new Set(),
    };

    expect(() => requireFirmContext(crossFirmPrincipal)).toThrow(AppError);
    expect(() => requireFirmContext(crossFirmPrincipal)).toThrow("A valid firm context is required");
  });

  it("prevents access to resources owned by another firm", () => {
    const principal: AuthPrincipal = {
      user: { id: "user-1", firmId: "firm-A", role: "associate" } as any,
      firmId: "firm-A",
      sessionId: "session-1",
      capabilities: new Set(),
    };

    expect(() => requireSameFirm(principal, "firm-A")).not.toThrow();

    expect(() => requireSameFirm(principal, "firm-B")).toThrow(AppError);
    expect(() => requireSameFirm(principal, "firm-B")).toThrow("Cross-firm access is denied");
  });
});
