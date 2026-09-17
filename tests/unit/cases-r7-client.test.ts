/**
 * R7 Client Case portal.
 *
 * Gate: Client UI consumes allowlist DTOs only; parties only if returned;
 * Closed = lifecycle closed; no fake court; no description/team/SOP/internal
 * messages; other clients denied; booking/KYC/shell unchanged.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveCapabilities } from "@/server/auth/capabilities";
import type { AuthPrincipal, AuthUser } from "@/server/auth/types";
import { requireCaseAccess, type AuthorizationDataSource } from "@/server/policies/authorization";
import { STAFF_ROLES } from "@/hooks/use-current-user";
import {
  CLIENT_CASE_FORBIDDEN_KEYS,
  CLIENT_CASE_KEYS,
  CLIENT_CRM_FORBIDDEN_KEYS,
  toClientCaseDto,
  toClientCrmDto,
  toClientPartyDto,
} from "@/shared/contracts/client-allowlists";
import { matchesCaseStatusFilter } from "@/shared/contracts/case-ui";

const repoRoot = path.resolve(".");

function readSrc(...segments: string[]): string {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

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

describe("R7 Client Case portal", () => {
  it("C-CLIENT-001: Closed counts and filters use lifecycle closed", () => {
    expect(matchesCaseStatusFilter("closed", "closed")).toBe(true);
    expect(matchesCaseStatusFilter("closed_won", "closed")).toBe(true);
    expect(matchesCaseStatusFilter("closed_lost", "closed")).toBe(true);
    expect(matchesCaseStatusFilter("active", "closed")).toBe(false);
    const list = readSrc("src/views/client/ClientCasesPage.tsx");
    expect(list).toMatch(/matchesCaseStatusFilter\(c\.status, statusFilter\)/);
    expect(list).toMatch(/isLifecycleClosed\(c\.status\)/);
  });

  it("C-CLIENT-002 / C-CLIENT-004: no District Court invention; identity uses case number", () => {
    const list = readSrc("src/views/client/ClientCasesPage.tsx");
    const detail = readSrc("src/views/client/ClientCaseDetailPage.tsx");
    const topbar = readSrc("src/components/dashboard/portal-topbar.tsx");
    expect(list).not.toMatch(/District Court/);
    expect(detail).not.toMatch(/District Court/);
    expect(detail).toMatch(/Matter #\$\{caseData\.caseNumber\}/);
    expect(topbar).toMatch(/portal === "client" && previous === "cases" && looksLikeRecordId/);
  });

  it("consumes useClientCases / useClientCase, not Staff CaseDto hooks", () => {
    const list = readSrc("src/views/client/ClientCasesPage.tsx");
    const detail = readSrc("src/views/client/ClientCaseDetailPage.tsx");
    const dashboard = readSrc("src/views/client/ClientDashboard.tsx");
    const queries = readSrc("src/client/queries/cases.ts");
    expect(queries).toMatch(/export function useClientCase/);
    expect(list).toMatch(/useClientCases/);
    expect(list).not.toMatch(/\buseCases\b/);
    expect(detail).toMatch(/useClientCase/);
    expect(detail).not.toMatch(/\buseCase\b/);
    expect(dashboard).toMatch(/useClientCases/);
    expect(dashboard).not.toMatch(/\buseCases\b/);
    expect(dashboard).not.toMatch(/closed_won/);
    for (const file of [
      "src/views/client/ClientChecklistPage.tsx",
      "src/views/client/ClientDocumentsPage.tsx",
      "src/views/client/ClientHearingsPage.tsx",
      "src/views/client/ClientMessagesPage.tsx",
      "src/views/client/ClientSignaturesPage.tsx",
    ]) {
      expect(readSrc(file)).toMatch(/useClientCases/);
      expect(readSrc(file)).not.toMatch(/\buseCases\b/);
    }
  });

  it("C-CLIENT-003 / C-SEC-001 / C-PARTY-VIS-001: allowlist only; parties from DTO; no internal stream", () => {
    const detail = readSrc("src/views/client/ClientCaseDetailPage.tsx");
    const service = readSrc("src/server/services/matters-service.ts");
    expect(detail).toMatch(/clientSummary/);
    expect(detail).not.toMatch(/caseData\.description/);
    expect(detail).not.toMatch(/teamMemberIds/);
    expect(detail).not.toMatch(/SOP/);
    expect(detail).toMatch(/visibleParties\.length > 0/);
    expect(detail).toMatch(/caseData\.parties/);
    expect(detail).toMatch(/useMessages\(caseId \|\| "", false\)/);
    expect(service).toMatch(/listVisiblePartiesForCases/);
    expect(service).toMatch(/listParties\(firmId, caseId, principal\.user\.role === "client"\)/);
    const dto = toClientCaseDto(
      {
        id: "case-1",
        title: "Matter",
        caseNumber: "C-1",
        description: "INTERNAL",
        notes: "staff notes",
        status: "closed_won",
        teamMemberIds: ["a", "b"],
        opposingCounsel: "hidden",
        judge: "hidden",
        clientId: "client-1",
        assignedLawyerId: "lawyer-1",
        court: "",
      },
      { id: "lawyer-1", name: "Advocate", email: "a@example.invalid" },
      [
        toClientPartyDto({
          id: "party-visible",
          name: "Visible party",
          side: "our_side",
          roleLabel: "Plaintiff",
          partyType: "person",
          clientVisible: true,
        }),
      ],
    );
    expect(Object.keys(dto).sort()).toEqual([...CLIENT_CASE_KEYS].sort());
    for (const key of CLIENT_CASE_FORBIDDEN_KEYS) {
      expect(dto).not.toHaveProperty(key);
    }
    expect(dto.status).toBe("closed");
    expect(dto.parties).toEqual([
      {
        id: "party-visible",
        name: "Visible party",
        side: "our_side",
        roleLabel: "Plaintiff",
        partyType: "person",
      },
    ]);
    expect(dto.parties[0]).not.toHaveProperty("clientVisible");
    const crm = toClientCrmDto({
      id: "client-1",
      fullName: "Client",
      type: "individual",
      notes: "internal CRM",
      kycIdNumber: "secret",
      userId: "user-1",
      kycStatus: "verified",
    });
    for (const key of CLIENT_CRM_FORBIDDEN_KEYS) {
      expect(crm).not.toHaveProperty(key);
    }
  });

  it("denies another client's case and keeps owner access", async () => {
    const ownerSource: AuthorizationDataSource = {
      getCase: async () => ({
        id: "case-1",
        firmId: "firm-1",
        clientId: "client-1",
        assignedLawyerId: "lawyer-1",
        teamMemberIds: [],
      }),
      getClient: async () => ({ id: "client-1", firmId: "firm-1", userId: "owner-user" }),
      getClientByUser: async (userId: string) =>
        userId === "owner-user"
          ? { id: "client-1", firmId: "firm-1", userId: "owner-user" }
          : { id: "client-2", firmId: "firm-1", userId },
      getDocument: async () => null,
    };
    await expect(
      requireCaseAccess(principal("client", "owner-user"), "case-1", ownerSource),
    ).resolves.toMatchObject({
      id: "case-1",
    });
    await expect(
      requireCaseAccess(principal("client", "other-user"), "case-1", ownerSource),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("does not change Client shell, KYC, booking, or STAFF_ROLES", () => {
    const list = readSrc("src/views/client/ClientCasesPage.tsx");
    const detail = readSrc("src/views/client/ClientCaseDetailPage.tsx");
    const layout = readSrc("src/app/(client)/layout.tsx");
    expect(list).toMatch(/portal="client"/);
    expect(detail).toMatch(/portal="client"/);
    expect(list).not.toMatch(/CasesWorkspace/);
    expect(detail).not.toMatch(/CasesWorkspace/);
    expect(readSrc("src/views/client/ClientBookingPage.tsx")).toMatch(/\buseCases\b/);
    expect(layout).toMatch(/PortalRoleGuard/);
    expect(STAFF_ROLES).not.toContain("admin");
  });
});
