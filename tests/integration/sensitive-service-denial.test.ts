import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "@/server/auth/types";
import { resolveCapabilities } from "@/server/auth/capabilities";

const state = vi.hoisted(() => ({ io: 0 }));
vi.mock("@/server/db/client", () => ({
  getDatabase: () =>
    new Proxy(
      {},
      {
        get: () => () => {
          state.io++;
          throw new Error("Permission gate refuses database I/O");
        },
      },
    ),
}));
import { IdentityService } from "@/server/services/identity-service";
import { MattersService } from "@/server/services/matters-service";
import { DocumentService } from "@/server/services/document-service";
import { CmsAssetService } from "@/server/services/cms-asset-service";
import { HrService } from "@/server/services/hr-service";
import { EnvelopeService } from "@/server/services/envelope-service";
import { MySqlSecurityRepository } from "@/server/repositories/security-repository";
import { requireDocumentAccess } from "@/server/policies/authorization";

const principal: AuthPrincipal = {
  firmId: "10000000-0000-4000-8000-000000000001",
  sessionId: "fixture",
  authenticationMethod: "session_cookie",
  capabilities: resolveCapabilities("client", undefined),
  user: {
    id: "20000000-0000-4000-8000-000000000001",
    firmId: "10000000-0000-4000-8000-000000000001",
    tokenIdentifier: "fixture",
    name: null,
    email: null,
    role: "client",
    isActive: true,
    isPending: false,
    avatar: null,
    phone: null,
  },
};
const groups = [
  [
    new IdentityService(),
    [
      "getRolePermissions",
      "updateRolePermissions",
      "listUsers",
      "getUser",
      "createUser",
      "updateUser",
      "resetMfa",
      "archiveUser",
      "updateSettings",
      "listSessions",
      "revokeSessions",
      "listAudit",
    ],
  ],
  [
    new MattersService(),
    [
      "listClients",
      "createClient",
      "updateClient",
      "grantPortalAccess",
      "createCase",
      "updateCase",
      "createParty",
      "updateParty",
      "deleteParty",
    ],
  ],
  [
    new DocumentService(),
    [
      "restoreVersion",
      "update",
      "hardDelete",
      "requestTextExtraction",
      "createShare",
      "listShares",
      "revokeShare",
    ],
  ],
  [new CmsAssetService(), ["createIntent", "completeIntent", "getIntentStatus"]],
  [
    new HrService(),
    [
      "reviewLeaveRequest",
      "upsertLeaveBalance",
      "generatePayroll",
      "listPayrollRuns",
      "createPayrollRun",
      "finalizePayrollRun",
      "setBaseSalary",
    ],
  ],
  [
    new EnvelopeService(),
    ["listSigners", "list", "create", "send", "void", "expire", "remind", "requestSignature"],
  ],
] as const;
const checks = groups.flatMap(([service, methods]) =>
  methods.map((method) => ({ service, method, name: `${service.constructor.name}.${method}` })),
);

describe("real sensitive services deny Client management before I/O", () => {
  it.each(checks)("$name", async ({ service, method }) => {
    state.io = 0;
    const call = (service as unknown as Record<string, (...args: unknown[]) => unknown>)[method];
    expect(typeof call).toBe("function");
    if (
      service instanceof DocumentService &&
      ["restoreVersion", "update", "requestTextExtraction"].includes(method)
    ) {
      const document = {
        id: "foreign-document",
        firmId: principal.firmId,
        caseId: null,
        uploadedBy: "another-client",
        intendedSignerUserId: null,
        isTemplate: false,
        isPrivileged: false,
        confidentialityLevel: "public" as const,
        deletedAt: null,
      };
      const lookup = vi
        .spyOn(MySqlSecurityRepository.prototype, "getDocument")
        .mockResolvedValue(document);
      vi.spyOn(MySqlSecurityRepository.prototype, "hasEnvelopeSignerAccess").mockResolvedValue(
        false,
      );
      await expect(
        Promise.resolve().then(() => call.call(service, principal, document.id, {}, {}, {})),
      ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
      lookup.mockResolvedValue({ ...document, firmId: "foreign-firm" });
      await expect(
        Promise.resolve().then(() => call.call(service, principal, document.id, {}, {}, {})),
      ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
      lookup.mockResolvedValue({ ...document, uploadedBy: principal.user.id });
      await expect(
        requireDocumentAccess(principal, document.id, new MySqlSecurityRepository()),
      ).resolves.toMatchObject({ uploadedBy: principal.user.id });
      expect(state.io).toBe(0);
      return;
    }
    await expect(
      Promise.resolve().then(() => call.call(service, principal, {}, {}, {}, {})),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(state.io).toBe(0);
  });
});
