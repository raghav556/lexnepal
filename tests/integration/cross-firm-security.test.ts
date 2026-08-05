import { describe, expect, it } from "vitest";
import { resolveCapabilities } from "../../src/server/auth/capabilities";
import {
  assertResourceInFirm,
  requireFirmContext,
  requireSameFirm,
} from "../../src/server/policies/authorization";
import { AppError } from "../../src/shared/errors/api-error";
import type { AuthPrincipal, AuthUser } from "../../src/server/auth/types";

function makePrincipal(firmId: string, role: AuthUser["role"] = "associate"): AuthPrincipal {
  const user: AuthUser = {
    id: `user-${firmId}`,
    firmId,
    tokenIdentifier: `issuer|${firmId}`,
    name: null,
    email: null,
    role,
    isActive: true,
    isPending: false,
    avatar: null,
    phone: null,
  };
  return {
    user,
    firmId,
    capabilities: resolveCapabilities(role, undefined),
    sessionId: `session-${firmId}`,
    authenticationMethod: "session_cookie",
  };
}

describe("Cross-firm security policies", () => {
  it("enforces that principal firm matches context firm", () => {
    const valid = makePrincipal("firm-A");
    expect(() => requireFirmContext(valid)).not.toThrow();

    const spoofed: AuthPrincipal = { ...makePrincipal("firm-A"), firmId: "firm-B" };
    expect(() => requireFirmContext(spoofed)).toThrow(AppError);
    expect(() => requireFirmContext(spoofed)).toThrow("A valid firm context is required");
  });

  it("prevents access to resources owned by another firm", () => {
    const principal = makePrincipal("firm-A");
    expect(() => requireSameFirm(principal, "firm-A")).not.toThrow();
    expect(() => requireSameFirm(principal, "firm-B")).toThrow(AppError);
    expect(() => requireSameFirm(principal, "firm-B")).toThrow("Cross-firm access is denied");
  });

  it("uses NOT_FOUND for foreign inventory probes across domains", () => {
    const principal = makePrincipal("firm-A");
    for (const message of [
      "Invoice was not found",
      "Lead was not found",
      "Envelope was not found",
      "Attendance was not found",
      "Message was not found",
    ]) {
      expect(() => assertResourceInFirm(principal, "firm-B", message)).toThrowError(
        expect.objectContaining({ code: "NOT_FOUND", message }),
      );
    }
    expect(() => assertResourceInFirm(principal, "firm-A", "Invoice was not found")).not.toThrow();
  });
});
