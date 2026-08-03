import { describe, expect, it } from "vitest";
import { resolveCapabilities } from "@/server/auth/capabilities";
import type { AuthPrincipal, AuthUser } from "@/server/auth/types";
import {
  requireCapability,
  requireCaseAccess,
  requireClientOwnership,
  requireDocumentAccess,
  requireSameFirm,
  type AuthorizationDataSource,
} from "@/server/policies/authorization";

function principal(role: AuthUser["role"] = "associate", userId = "user-1"): AuthPrincipal {
  const user: AuthUser = {
    id: userId,
    firmId: "firm-1",
    tokenIdentifier: `issuer|${userId}`,
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
    firmId: user.firmId,
    capabilities: resolveCapabilities(role, undefined),
    sessionId: "session-1",
    authenticationMethod: "session_cookie",
  };
}

function source(overrides: Partial<AuthorizationDataSource> = {}): AuthorizationDataSource {
  return {
    getCase: async () => ({
      id: "case-1",
      firmId: "firm-1",
      clientId: "client-1",
      assignedLawyerId: "lawyer-1",
      teamMemberIds: ["user-1"],
    }),
    getClient: async () => ({ id: "client-1", firmId: "firm-1", userId: "client-user" }),
    getClientByUser: async () => null,
    getDocument: async () => ({
      id: "document-1",
      firmId: "firm-1",
      caseId: "case-1",
      uploadedBy: "user-1",
      intendedSignerUserId: null,
      isTemplate: false,
      isPrivileged: false,
      confidentialityLevel: "confidential",
      deletedAt: null,
    }),
    ...overrides,
  };
}

describe("central authorization policies", () => {
  it("ports the role/capability matrix and honors a valid firm override", () => {
    expect(() => requireCapability(principal("intern"), "documents.upload")).toThrowError(
      /missing permission/,
    );
    expect(() => requireCapability(principal("partner"), "legalHold.manage")).not.toThrow();
    const overridden = principal("associate");
    overridden.capabilities = resolveCapabilities("associate", { associate: ["documents.read"] });
    expect(() => requireCapability(overridden, "documents.share")).toThrowError(
      /missing permission/,
    );
  });

  it("rejects cross-firm resources without disclosing their existence", async () => {
    const actor = principal();
    expect(() => requireSameFirm(actor, "firm-2")).toThrowError(/Cross-firm/);
    await expect(
      requireCaseAccess(
        actor,
        "case-2",
        source({
          getCase: async () => ({
            id: "case-2",
            firmId: "firm-2",
            clientId: "client-2",
            assignedLawyerId: "user-1",
            teamMemberIds: [],
          }),
        }),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      requireClientOwnership(
        actor,
        "client-2",
        source({ getClient: async () => ({ id: "client-2", firmId: "firm-2", userId: "user-1" }) }),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      requireDocumentAccess(
        actor,
        "document-2",
        source({
          getDocument: async () => ({
            id: "document-2",
            firmId: "firm-2",
            caseId: null,
            uploadedBy: "user-1",
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

  it("allows assigned staff, case-team members and the owning client", async () => {
    await expect(requireCaseAccess(principal(), "case-1", source())).resolves.toMatchObject({
      id: "case-1",
    });
    const clientActor = principal("client", "client-user");
    const clientSource = source({
      getClientByUser: async () => ({ id: "client-1", firmId: "firm-1", userId: "client-user" }),
    });
    await expect(requireCaseAccess(clientActor, "case-1", clientSource)).resolves.toMatchObject({
      id: "case-1",
    });
    await expect(
      requireDocumentAccess(clientActor, "document-1", clientSource),
    ).resolves.toMatchObject({ id: "document-1" });
  });

  it("restricts privileged documents to partners and administrators", async () => {
    const privilegedSource = source({
      getDocument: async () => ({
        id: "document-1",
        firmId: "firm-1",
        caseId: null,
        uploadedBy: "user-1",
        intendedSignerUserId: null,
        isTemplate: false,
        isPrivileged: true,
        confidentialityLevel: "privileged",
        deletedAt: null,
      }),
    });
    await expect(
      requireDocumentAccess(principal("associate"), "document-1", privilegedSource),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      requireDocumentAccess(principal("partner"), "document-1", privilegedSource),
    ).resolves.toMatchObject({ id: "document-1" });
  });
});
