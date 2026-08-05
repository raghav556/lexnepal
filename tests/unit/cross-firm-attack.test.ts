import { describe, expect, it } from "vitest";
import { resolveCapabilities } from "@/server/auth/capabilities";
import type { AuthPrincipal, AuthUser } from "@/server/auth/types";
import {
  assertResourceInFirm,
  requireCaseAccess,
  requireClientOwnership,
  requireDocumentAccess,
  requireFirmContext,
  requireSameFirm,
  type AuthorizationDataSource,
} from "@/server/policies/authorization";
import { AppError } from "@/shared/errors/api-error";

const FIRM_A = "firm-A";
const FIRM_B = "firm-B";

function principal(overrides: Partial<AuthUser> & { firmId?: string } = {}): AuthPrincipal {
  const firmId = overrides.firmId ?? FIRM_A;
  const user: AuthUser = {
    id: overrides.id ?? "user-a",
    firmId,
    tokenIdentifier: "issuer|user-a",
    name: null,
    email: null,
    role: overrides.role ?? "associate",
    isActive: true,
    isPending: false,
    avatar: null,
    phone: null,
  };
  return {
    user,
    firmId,
    capabilities: resolveCapabilities(user.role, undefined),
    sessionId: "session-a",
    authenticationMethod: "session_cookie",
  };
}

function source(overrides: Partial<AuthorizationDataSource> = {}): AuthorizationDataSource {
  return {
    getCase: async () => ({
      id: "case-a",
      firmId: FIRM_A,
      clientId: "client-a",
      assignedLawyerId: "user-a",
      teamMemberIds: ["user-a"],
    }),
    getClient: async () => ({ id: "client-a", firmId: FIRM_A, userId: "client-user" }),
    getClientByUser: async () => null,
    getDocument: async () => ({
      id: "doc-a",
      firmId: FIRM_A,
      caseId: "case-a",
      uploadedBy: "user-a",
      intendedSignerUserId: null,
      isTemplate: false,
      isPrivileged: false,
      confidentialityLevel: "confidential",
      deletedAt: null,
    }),
    ...overrides,
  };
}

/** Mirrors repository firm-scoped lookup used by finance/HR/envelopes. */
function firmScopedFind<T extends { id: string; firmId: string }>(
  firmId: string,
  rows: T[],
  id: string,
): T | null {
  return rows.find((row) => row.id === id && row.firmId === firmId) ?? null;
}

describe("R4.3 cross-firm attack tests", () => {
  it("rejects spoofed firm context on the principal", () => {
    const spoofed: AuthPrincipal = {
      ...principal(),
      firmId: FIRM_B,
    };
    expect(() => requireFirmContext(spoofed)).toThrow(AppError);
    expect(() => requireFirmContext(spoofed)).toThrow(/valid firm context/i);
  });

  it("denies same-firm helper when resource belongs to another firm", () => {
    const actor = principal();
    expect(() => requireSameFirm(actor, FIRM_A)).not.toThrow();
    expect(() => requireSameFirm(actor, FIRM_B)).toThrow(/Cross-firm access is denied/);
  });

  it("hides foreign cases/clients/documents as NOT_FOUND (no existence leak)", async () => {
    const actor = principal();
    await expect(
      requireCaseAccess(
        actor,
        "case-b",
        source({
          getCase: async () => ({
            id: "case-b",
            firmId: FIRM_B,
            clientId: "client-b",
            assignedLawyerId: "user-a",
            teamMemberIds: [],
          }),
        }),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      requireClientOwnership(
        actor,
        "client-b",
        source({
          getClient: async () => ({ id: "client-b", firmId: FIRM_B, userId: "user-a" }),
        }),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      requireDocumentAccess(
        actor,
        "doc-b",
        source({
          getDocument: async () => ({
            id: "doc-b",
            firmId: FIRM_B,
            caseId: null,
            uploadedBy: "user-a",
            intendedSignerUserId: null,
            isTemplate: false,
            isPrivileged: false,
            confidentialityLevel: "confidential",
            deletedAt: null,
          }),
        }),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("treats foreign finance/HR/envelope resources as missing via firm-scoped lookup", () => {
    const invoices = [
      { id: "inv-a", firmId: FIRM_A, total: "100.00" },
      { id: "inv-b", firmId: FIRM_B, total: "999.00" },
    ];
    const attendance = [
      { id: "att-a", firmId: FIRM_A, userId: "user-a" },
      { id: "att-b", firmId: FIRM_B, userId: "user-b" },
    ];
    const envelopes = [
      { id: "env-a", firmId: FIRM_A, documentId: "doc-a" },
      { id: "env-b", firmId: FIRM_B, documentId: "doc-b" },
    ];

    expect(firmScopedFind(FIRM_A, invoices, "inv-b")).toBeNull();
    expect(firmScopedFind(FIRM_A, invoices, "inv-a")?.total).toBe("100.00");
    expect(firmScopedFind(FIRM_A, attendance, "att-b")).toBeNull();
    expect(firmScopedFind(FIRM_A, envelopes, "env-b")).toBeNull();

    const actor = principal();
    expect(() =>
      assertResourceInFirm(actor, firmScopedFind(FIRM_A, invoices, "inv-b")?.firmId, "Invoice was not found"),
    ).toThrowError(/Invoice was not found/);
    expect(() =>
      assertResourceInFirm(actor, firmScopedFind(FIRM_A, invoices, "inv-a")?.firmId, "Invoice was not found"),
    ).not.toThrow();
  });

  it("blocks CRM/communication case-bound reads when the case is foreign", async () => {
    const actor = principal();
    await expect(
      requireCaseAccess(
        actor,
        "foreign-case",
        source({
          getCase: async () => ({
            id: "foreign-case",
            firmId: FIRM_B,
            clientId: "client-b",
            assignedLawyerId: "outsider",
            teamMemberIds: [],
          }),
        }),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: expect.stringMatching(/Case was not found/) });
  });

  it("rejects foreign firm ids through assertResourceInFirm without disclosing ownership", () => {
    const actor = principal();
    try {
      assertResourceInFirm(actor, FIRM_B, "Lead was not found");
      throw new Error("expected assertResourceInFirm to throw");
    } catch (error) {
      if (error instanceof Error && error.message === "expected assertResourceInFirm to throw") throw error;
      expect(error).toBeInstanceOf(AppError);
      expect(error).toMatchObject({ code: "NOT_FOUND", message: "Lead was not found" });
      expect(String((error as AppError).message)).not.toMatch(/firm-B|Cross-firm/i);
    }
  });
});
