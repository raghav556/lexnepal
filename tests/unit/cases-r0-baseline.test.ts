/**
 * R0 Cases baseline.
 *
 * Passing tests freeze current contracts we must not break accidentally
 * (legacy closed statuses, lead/team access OR-model).
 *
 * Remaining `it.fails` examples are later-release bugs. R1–R7 converted the
 * original client closed-filter and District Court examples into passing tests.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveCapabilities } from "@/server/auth/capabilities";
import type { AuthPrincipal, AuthUser } from "@/server/auth/types";
import { requireCaseAccess, type AuthorizationDataSource } from "@/server/policies/authorization";
import { caseStatusSchema, caseUpdateSchema } from "@/shared/contracts/matters";

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

function caseSource(overrides: Partial<AuthorizationDataSource> = {}): AuthorizationDataSource {
  return {
    getCase: async () => ({
      id: "case-1",
      firmId: "firm-1",
      clientId: "client-1",
      assignedLawyerId: "lawyer-1",
      teamMemberIds: ["teammate-1"],
    }),
    getClient: async () => ({ id: "client-1", firmId: "firm-1", userId: "client-user" }),
    getClientByUser: async () => null,
    getDocument: async () => null,
    ...overrides,
  };
}

describe("R0 Cases baseline — current contracts (must keep)", () => {
  it("C-STATUS-001: caseStatusSchema still includes closed_won and closed_lost", () => {
    expect([...caseStatusSchema.options]).toEqual(
      expect.arrayContaining([
        "inquiry",
        "active",
        "on_hold",
        "closed",
        "closed_won",
        "closed_lost",
      ]),
    );
    expect([...caseStatusSchema.options]).toContain("closed_won");
    expect([...caseStatusSchema.options]).toContain("closed_lost");
    expect([...caseStatusSchema.options]).toContain("closed");
  });

  it("C-STAFF-001: caseUpdateSchema strips unknown notes and keeps description", () => {
    const parsed = caseUpdateSchema.safeParse({
      notes: "internal staff note",
      description: "staff description",
      status: "active",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).not.toHaveProperty("notes");
    expect(parsed.data.description).toBe("staff description");
  });

  it("C-TEAM-001: lead lawyer OR case-team member can access; outsider cannot", async () => {
    const source = caseSource();
    await expect(
      requireCaseAccess(principal("intern", "lawyer-1"), "case-1", source),
    ).resolves.toMatchObject({ id: "case-1" });
    await expect(
      requireCaseAccess(principal("intern", "teammate-1"), "case-1", source),
    ).resolves.toMatchObject({ id: "case-1" });
    await expect(
      requireCaseAccess(principal("intern", "stranger-1"), "case-1", source),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not treat admin as a staff role", () => {
    const source = readSrc("src/hooks/use-current-user.ts");
    expect(source).toMatch(/export const STAFF_ROLES/);
    expect(source).not.toMatch(/STAFF_ROLES: UserRole\[] = \[[^\]]*admin/);
  });

  it("C-ADM-001: /admin/cases App Router pages share the Staff Case workspace", () => {
    const list = readSrc("src/app/(admin)/admin/cases/page.tsx");
    const detail = readSrc("src/app/(admin)/admin/cases/[id]/page.tsx");
    const create = readSrc("src/app/(admin)/admin/cases/new/page.tsx");
    expect(list).toMatch(/CasesWorkspace/);
    expect(list).toMatch(/basePath="\/admin\/cases"/);
    expect(detail).toMatch(/StaffCaseDetailPage/);
    expect(create).toMatch(/redirect\("\/admin\/cases\?create=1"\)/);
    expect(readSrc("src/app/(admin)/layout.tsx")).toMatch(/href: "\/admin\/cases"/);
  });
});

describe("R0 Cases baseline — known product bugs (expected fail until later releases)", () => {
  it("C-STAFF-001: Staff case detail PATCH sends description and clientSummary separately", () => {
    const source = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    expect(source).toMatch(/Internal Case Description/);
    expect(source).toMatch(/Client-visible Summary/);
    expect(source).toMatch(/description:\s*description/);
    expect(source).toMatch(/clientSummary:\s*clientSummary/);
    expect(source).not.toMatch(/Notes \/ Description/);
    expect(source).not.toMatch(/description:\s*notes\s*\|\|\s*undefined/);
  });

  it("C-CLIENT-003 / C-SEC-001: Client case detail does not render case description", () => {
    const source = readSrc("src/views/client/ClientCaseDetailPage.tsx");
    expect(source).not.toMatch(/caseData\.description/);
    expect(source).toMatch(/clientSummary/);
  });

  it("C-SEC-001: Client case queries declare a Client Case allowlist contract", () => {
    const source = readSrc("src/client/queries/cases.ts");
    expect(source).toMatch(/ClientCaseDto/);
    expect(source).toMatch(/useClientCases/);
  });

  it("C-PERM-004: Client CRM DTO is built from the Client allowlist, not includeSensitive", () => {
    const service = readSrc("src/server/services/matters-service.ts");
    expect(service).toMatch(/toClientCrmDto/);
    expect(service).not.toMatch(/getClientByUser\(\s*firmId,\s*actorId,\s*true\s*\)/);
  });

  it("C-PERM-001: listHearings scopes staff without cases.view_all", () => {
    const source = readSrc("src/server/services/work-management-service.ts");
    const start = source.indexOf("async listHearings");
    const end = source.indexOf("async getHearing");
    const method = source.slice(start, end);
    expect(method).toMatch(/cases\.view_all/);
    expect(method).toMatch(/listCaseIdsForStaff/);
  });

  it("C-PERM-002: listTasks includes case-team / responsible-lawyer access, not only assignee", () => {
    const source = readSrc("src/server/services/work-management-service.ts");
    const start = source.indexOf("async listTasks");
    const end = source.indexOf("async getTask");
    const method = source.slice(start, end);
    expect(method).toMatch(/staffMayAccessTask/);
    expect(method).toMatch(/listCaseIdsForStaff/);
  });

  it("documents: client list excludes internal/privileged via clientUserId", () => {
    const source = readSrc("src/server/services/document-service.ts");
    const start = source.indexOf("async list(");
    const end = source.indexOf("async search(");
    const method = source.slice(start, end);
    expect(method).toMatch(/clientUserId: principal\.user\.id/);
    expect(method).toMatch(/listCaseIdsForClient/);
  });

  it("messages: client stream sets includeInternal false", () => {
    const source = readSrc("src/server/services/communication-service.ts");
    expect(source).toMatch(/includeInternal: principal\.user\.role !== "client"/);
  });

  it("C-CLIENT-001: Closed filter uses lifecycle closed, including closed_won/lost aliases", () => {
    const source = readSrc("src/views/client/ClientCasesPage.tsx");
    expect(source).toMatch(/matchesCaseStatusFilter/);
    expect(source).toMatch(/isLifecycleClosed/);
    expect(source).not.toMatch(/closed_won/);
    expect(source).not.toMatch(/closed_lost/);
  });

  it("C-CLIENT-002: Client case UI does not invent District Court when court is empty", () => {
    const list = readSrc("src/views/client/ClientCasesPage.tsx");
    const detail = readSrc("src/views/client/ClientCaseDetailPage.tsx");
    expect(list).not.toMatch(/court \|\| ["']District Court["']/);
    expect(detail).not.toMatch(/court \|\| ["']District Court["']/);
    expect(list).toMatch(/Not specified/);
    expect(detail).toMatch(/Not specified/);
  });

  it("C-ADM-001: Admin dashboard Case links target the Admin Case workspace", () => {
    const source = readSrc("src/views/admin/AdminDashboard.tsx");
    expect(source).toContain('href: "/admin/cases?create=1"');
    expect(source).not.toContain('href: "/admin/cases/new"');
    expect(source).toContain('href="/admin/cases"');
    expect(source).toMatch(/\/admin\/cases\/\$\{row\.caseId\}/);
  });
});
