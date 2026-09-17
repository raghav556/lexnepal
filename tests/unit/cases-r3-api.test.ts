import { describe, expect, it } from "vitest";
import {
  applyCaseStatusAliases,
  isLifecycleClosed,
  LIFECYCLE_CLOSED_STATUSES,
  normalizeClientCaseStatus,
} from "@/shared/contracts/case-status";
import {
  CLIENT_CASE_FORBIDDEN_KEYS,
  CLIENT_CASE_KEYS,
  toClientCaseDto,
  toClientPartyDto,
} from "@/shared/contracts/client-allowlists";
import { casePartyCreateSchema, caseUpdateSchema } from "@/shared/contracts/matters";
import { requireCaseAccess, type AuthorizationDataSource } from "@/server/policies/authorization";
import { resolveCapabilities } from "@/server/auth/capabilities";
import type { AuthPrincipal, AuthUser } from "@/server/auth/types";
import { toStaffCaseDto, toStaffPartyDto } from "@/shared/contracts/staff-case";

function principal(role: AuthUser["role"], userId: string): AuthPrincipal {
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

function caseSource(): AuthorizationDataSource {
  return {
    getCase: async () => ({
      id: "case-1",
      firmId: "firm-1",
      clientId: "client-1",
      assignedLawyerId: "lawyer-1",
      teamMemberIds: ["teammate-1"],
    }),
    getClient: async () => ({ id: "client-1", firmId: "firm-1", userId: "client-user" }),
    getClientByUser: async () => ({ id: "client-1", firmId: "firm-1", userId: "client-user" }),
    getDocument: async () => null,
  };
}

describe("R3 Case APIs and permissions", () => {
  it("Stage C: writes accept closed_won/closed_lost as aliases of closed + outcome", () => {
    expect(applyCaseStatusAliases({ status: "closed_won" })).toEqual({
      status: "closed",
      closureOutcome: "won",
    });
    expect(applyCaseStatusAliases({ status: "closed_lost", closureOutcome: "settled" })).toEqual({
      status: "closed",
      closureOutcome: "settled",
    });
    const parsed = caseUpdateSchema.safeParse({ status: "closed_won" });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.status).toBe("closed");
    expect(parsed.data.closureOutcome).toBe("won");
    expect(LIFECYCLE_CLOSED_STATUSES).toEqual(["closed", "closed_won", "closed_lost"]);
    expect(isLifecycleClosed("closed_won")).toBe(true);
  });

  it("maps Client status aliases to closed without leaking Staff fields", () => {
    const dto = toClientCaseDto({
      id: "case-1",
      title: "Matter",
      caseNumber: "C-1",
      description: "INTERNAL",
      status: "closed_won",
      closureOutcome: "won",
      practiceArea: "Corporate",
      assignedLawyerId: "lawyer-1",
      teamMemberIds: ["lawyer-1", "intern-2"],
    });
    expect(dto.status).toBe("closed");
    expect(normalizeClientCaseStatus("closed_lost")).toBe("closed");
    expect(Object.keys(dto).sort()).toEqual([...CLIENT_CASE_KEYS].sort());
    for (const key of CLIENT_CASE_FORBIDDEN_KEYS) {
      expect(dto).not.toHaveProperty(key);
    }
    expect(dto.parties).toEqual([]);
  });

  it("Staff Case DTO keeps description, team, hidden parties, and next dates", () => {
    const hidden = toStaffPartyDto({
      id: "party-hidden",
      caseId: "case-1",
      name: "Opposing litigant",
      side: "opposing",
      roleLabel: "Defendant",
      partyType: "person",
      clientId: "crm-2",
      sortOrder: 1,
      clientVisible: false,
    });
    const dto = toStaffCaseDto(
      {
        id: "case-1",
        caseNumber: "C-1",
        title: "Matter",
        description: "INTERNAL staff notes",
        clientSummary: "Client-safe summary",
        practiceArea: "Corporate",
        status: "closed",
        closureOutcome: "won",
        clientId: "client-1",
        assignedLawyerId: "lawyer-1",
        court: "Patan High Court",
        kycIdNumber: "must-not-copy",
      },
      {
        teamMemberIds: ["lawyer-1", "teammate-1"],
        parties: [hidden],
        nextHearing: "2026-10-01",
        nextTaskDue: "2026-09-20T00:00:00.000Z",
      },
    );
    expect(dto.description).toBe("INTERNAL staff notes");
    expect(dto.teamMemberIds).toEqual(["lawyer-1", "teammate-1"]);
    expect(dto.parties).toEqual([hidden]);
    expect(dto.nextHearing).toBe("2026-10-01");
    expect(dto.nextTaskDue).toBe("2026-09-20T00:00:00.000Z");
    expect(dto).not.toHaveProperty("kycIdNumber");
    expect(hidden.clientVisible).toBe(false);
  });

  it("Client party allowlist omits clientId and clientVisible", () => {
    const dto = toClientPartyDto({
      id: "party-1",
      name: "Visible party",
      side: "our_side",
      roleLabel: "Plaintiff",
      partyType: "organisation",
      clientId: "crm-1",
      clientVisible: true,
      sortOrder: 2,
    });
    expect(dto).toEqual({
      id: "party-1",
      name: "Visible party",
      side: "our_side",
      roleLabel: "Plaintiff",
      partyType: "organisation",
    });
    expect(casePartyCreateSchema.parse({ name: "A", side: "other", partyType: "person" })).toEqual(
      expect.objectContaining({ name: "A" }),
    );
    expect(
      casePartyCreateSchema.parse({ name: "A", side: "other", partyType: "person" }).clientVisible,
    ).toBeUndefined();
  });

  it("lead or team can access a case; intern outsider cannot", async () => {
    const source = caseSource();
    await expect(
      requireCaseAccess(principal("associate", "lawyer-1"), "case-1", source),
    ).resolves.toMatchObject({ id: "case-1" });
    await expect(
      requireCaseAccess(principal("intern", "teammate-1"), "case-1", source),
    ).resolves.toMatchObject({ id: "case-1" });
    await expect(
      requireCaseAccess(principal("intern", "stranger-1"), "case-1", source),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(principal("intern", "teammate-1").capabilities.has("cases.manage")).toBe(false);
    expect(principal("associate", "lawyer-1").capabilities.has("cases.manage")).toBe(true);
  });
});
