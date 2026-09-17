/**
 * R11 Stage D: cross-role + migration verification.
 *
 * Gate: Client allowlists hold; parties stay Staff-authored; lead/team auth;
 * app no longer persists closed_won/lost; leftover enum values stay until a
 * dedicated later cleanup. This release does not drop the enum.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveCapabilities } from "@/server/auth/capabilities";
import type { AuthPrincipal, AuthUser } from "@/server/auth/types";
import { requireCaseAccess, type AuthorizationDataSource } from "@/server/policies/authorization";
import { STAFF_ROLES } from "@/hooks/use-current-user";
import { syncCaseTeamMembers } from "@/shared/contracts/case-team-sync";
import {
  applyCaseStatusAliases,
  isLifecycleClosed,
  normalizeClientCaseStatus,
} from "@/shared/contracts/case-status";
import {
  caseStatusWritePayload,
  matchesCaseStatusFilter,
  toLifecycleStatus,
} from "@/shared/contracts/case-ui";
import {
  CLIENT_CASE_FORBIDDEN_KEYS,
  CLIENT_CASE_KEYS,
  CLIENT_CRM_FORBIDDEN_KEYS,
  CLIENT_CRM_KEYS,
  toClientCaseDto,
  toClientCrmDto,
} from "@/shared/contracts/client-allowlists";
import {
  caseCreateSchema,
  caseListSchema,
  caseStatusSchema,
  caseUpdateSchema,
} from "@/shared/contracts/matters";
import { toStaffPartyDto } from "@/shared/contracts/staff-case";

const repoRoot = path.resolve(".");

function readSrc(...segments: string[]): string {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".local")
      continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, acc);
    else if (/\.(ts|tsx|mjs|sql)$/.test(entry.name)) acc.push(full);
  }
  return acc;
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
    getClientByUser: async (userId: string) =>
      userId === "client-user" ? { id: "client-1", firmId: "firm-1", userId: "client-user" } : null,
    getDocument: async () => null,
  };
}

const staffCase = {
  id: "case-1",
  caseNumber: "E2E-PORTAL-001",
  title: "E2E Portal Matter",
  description: "INTERNAL staff notes",
  clientSummary: "Client-safe summary",
  practiceArea: "Corporate",
  status: "closed_won",
  closureOutcome: "won",
  clientId: "client-1",
  assignedLawyerId: "lawyer-1",
  teamMemberIds: ["lawyer-1", "intern-2"],
  opposingCounsel: "Opposing LLP",
};

describe("R11 Client allowlists", () => {
  it("Client Case and CRM DTOs stay allowlists without description or CRM notes", () => {
    const caseDto = toClientCaseDto(staffCase, {
      id: "lawyer-1",
      name: "E2E Staff",
      email: "staff@example.invalid",
    });
    const crmDto = toClientCrmDto({
      id: "client-1",
      fullName: "E2E Client",
      type: "individual",
      notes: "High-value — staff only",
      kycIdNumber: "NID-SECRET",
      kycConsentVersion: "v1",
      kycStatus: "pending",
    });
    expect(Object.keys(caseDto).sort()).toEqual([...CLIENT_CASE_KEYS].sort());
    expect(Object.keys(crmDto).sort()).toEqual([...CLIENT_CRM_KEYS].sort());
    expect(caseDto.status).toBe("closed");
    expect(caseDto.clientSummary).toBe("Client-safe summary");
    for (const key of CLIENT_CASE_FORBIDDEN_KEYS) expect(caseDto).not.toHaveProperty(key);
    for (const key of CLIENT_CRM_FORBIDDEN_KEYS) expect(crmDto).not.toHaveProperty(key);
    expect(JSON.stringify(caseDto)).not.toContain("INTERNAL");
    expect(JSON.stringify(crmDto)).not.toContain("High-value");
    expect(JSON.stringify(crmDto)).not.toContain("NID-SECRET");
  });

  it("Staff parties include hidden rows; Client parties do not", () => {
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
    expect(hidden.clientVisible).toBe(false);
    const clientDto = toClientCaseDto(staffCase, null, []);
    expect(clientDto.parties).toEqual([]);
    expect(readSrc("src/server/services/matters-service.ts")).toMatch(
      /listParties\(firmId, caseId, principal\.user\.role === "client"\)/,
    );
    expect(readSrc("src/server/repositories/matters-repository.ts")).toMatch(
      /if \(clientVisibleOnly\) predicates.push\(eq\(caseParties\.clientVisible, true\)\)/,
    );
  });

  it("does not auto-create parties from the CRM Client", () => {
    expect(readSrc("drizzle/0005_cases_domain_foundations.sql")).not.toMatch(
      /INSERT\s+INTO\s+`case_parties`/i,
    );
    const repository = readSrc("src/server/repositories/matters-repository.ts");
    const createCaseFn = repository.slice(repository.indexOf("async createCase"));
    expect(createCaseFn.slice(0, createCaseFn.indexOf("async updateCase"))).not.toMatch(
      /insert\(caseParties\)/,
    );
    expect(repository).toMatch(/clientVisible: input.clientVisible \?\? false/);
  });
});

describe("R11 lead / team / unauthorized", () => {
  it("Responsible Lawyer, Case Team, and matching client can access; outsider cannot", async () => {
    const source = caseSource();
    await expect(
      requireCaseAccess(principal("associate", "lawyer-1"), "case-1", source),
    ).resolves.toMatchObject({ id: "case-1" });
    await expect(
      requireCaseAccess(principal("intern", "teammate-1"), "case-1", source),
    ).resolves.toMatchObject({ id: "case-1" });
    await expect(
      requireCaseAccess(principal("client", "client-user"), "case-1", source),
    ).resolves.toMatchObject({ id: "case-1" });
    await expect(
      requireCaseAccess(principal("intern", "stranger-1"), "case-1", source),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      requireCaseAccess(principal("client", "other-client"), "case-1", source),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("changing Responsible Lawyer keeps the previous lead on the team", () => {
    const changed = syncCaseTeamMembers({
      currentLeadId: "lead-1",
      nextLeadId: "lead-2",
      existingTeamIds: ["lead-1", "intern-1"],
    });
    expect(changed).toEqual({
      ok: true,
      teamMemberIds: expect.arrayContaining(["lead-1", "lead-2", "intern-1"]),
    });
    expect([...STAFF_ROLES]).not.toContain("admin");
    expect(readSrc("src/app/(admin)/admin/cases/page.tsx")).toMatch(/portal="admin"/);
  });
});

describe("R11 Stage D status mapping", () => {
  it("writes persist closed + outcome; closed_won/lost are aliases only", () => {
    expect(caseStatusWritePayload("closed_won")).toEqual({
      status: "closed",
      closureOutcome: "won",
    });
    expect(applyCaseStatusAliases({ status: "closed_lost" })).toEqual({
      status: "closed",
      closureOutcome: "lost",
    });
    const created = caseCreateSchema.parse({
      caseNumber: "C-1",
      title: "Matter",
      practiceArea: "Corporate",
      clientId: "11111111-1111-4111-8111-111111111111",
      assignedLawyerId: "22222222-2222-4222-8222-222222222222",
      status: "closed_won",
    });
    expect(created.status).toBe("closed");
    expect(created.closureOutcome).toBe("won");
    const updated = caseUpdateSchema.parse({ status: "closed_won" });
    expect(updated.status).toBe("closed");
    expect(updated.closureOutcome).toBe("won");
    const listed = caseListSchema.parse({ status: "closed_lost" });
    expect(listed.status).toBe("closed");
    expect(matchesCaseStatusFilter("closed_won", "closed")).toBe(true);
    expect(toLifecycleStatus("closed_lost")).toBe("closed");
    expect(normalizeClientCaseStatus("closed_won")).toBe("closed");
    expect(isLifecycleClosed("closed")).toBe(true);
  });

  it("Convex import and analytics no longer persist or bucket leftover closed_won/lost", () => {
    const importer = readSrc("src/server/services/matters-migration.ts");
    expect(importer).toMatch(/applyCaseStatusAliases/);
    expect(importer).toMatch(/function migratedCaseStatus/);
    expect(importer).not.toMatch(
      /status:\s*enumValue\(\s*record\.status,\s*\["inquiry", "active", "on_hold", "closed_won", "closed_lost"\]/,
    );
    expect(readSrc("src/server/repositories/analytics-repository.ts")).toMatch(
      /isLifecycleClosed\(row\.status\) \? "closed"/,
    );
    expect(readSrc("src/server/repositories/matters-repository.ts")).toMatch(
      /isLifecycleClosed\(filters\.status\)/,
    );
    expect(readSrc("src/server/repositories/matters-repository.ts")).toMatch(
      /toPersistedCaseStatus/,
    );
  });

  it("no product path assigns status to closed_won or closed_lost", () => {
    const allow = new Set([
      path.join(repoRoot, "src/shared/contracts/case-status.ts"),
      path.join(repoRoot, "src/shared/contracts/case-ui.ts"),
      path.join(repoRoot, "src/shared/contracts/client-allowlists.ts"),
      path.join(repoRoot, "src/shared/contracts/matters.ts"),
      path.join(repoRoot, "src/lib/dashboard-semantics.ts"),
      path.join(repoRoot, "src/lib/i18n-context.tsx"),
      path.join(repoRoot, "src/server/services/matters-migration.ts"),
    ]);
    const assign = /status\s*[:=]\s*["']closed_won["']|status\s*[:=]\s*["']closed_lost["']/;
    const offenders: string[] = [];
    for (const file of walkFiles(path.join(repoRoot, "src"))) {
      if (allow.has(file)) continue;
      const source = fs.readFileSync(file, "utf8");
      if (assign.test(source)) offenders.push(path.relative(repoRoot, file).replaceAll("\\", "/"));
    }
    expect(offenders).toEqual([]);
    expect([...caseStatusSchema.options]).toEqual(
      expect.arrayContaining(["closed", "closed_won", "closed_lost"]),
    );
  }, 20_000);
});
