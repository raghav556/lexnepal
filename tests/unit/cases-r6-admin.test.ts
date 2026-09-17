/**
 * R6 Admin Case entry.
 *
 * Gate: no 404 from Admin Case entry; one list/detail module; Admin chrome;
 * links stay /admin/cases/...; STAFF_ROLES does not include admin.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_ROLE_PERMISSIONS } from "@/server/auth/capabilities";
import { STAFF_ROLES } from "@/hooks/use-current-user";

const repoRoot = path.resolve(".");

function readSrc(...segments: string[]): string {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

describe("R6 Admin Case entry", () => {
  it("C-ADM-001 / C-ADM-002: Admin nav and dashboard enter /admin/cases in the Admin shell", () => {
    const layout = readSrc("src/app/(admin)/layout.tsx");
    const dashboard = readSrc("src/views/admin/AdminDashboard.tsx");
    const topbar = readSrc("src/components/dashboard/portal-topbar.tsx");
    expect(layout).toMatch(/href: "\/admin\/cases"/);
    expect(layout).toMatch(/i18nKey: "nav.cases"/);
    expect(layout).toMatch(/PortalRoleGuard/);
    expect(layout).toMatch(/allowed="admin"/);
    expect(layout).not.toMatch(/from "@\/app\/\(staff\)/);
    expect(dashboard).toContain('href: "/admin/cases?create=1"');
    expect(dashboard).not.toContain('href: "/admin/cases/new"');
    expect(dashboard).toContain('href="/admin/cases"');
    expect(dashboard).toMatch(/\/admin\/cases\/\$\{row\.caseId\}/);
    const adminCreate = topbar.slice(topbar.indexOf("Add Firm User"));
    expect(adminCreate).toMatch(/href="\/admin\/cases\?create=1"/);
    expect(adminCreate).not.toMatch(/href="\/staff\/cases"/);
  });

  it("C-ADM-003: Admin list/detail reuse the Staff Case workspace with portal=admin", () => {
    const list = readSrc("src/app/(admin)/admin/cases/page.tsx");
    const detail = readSrc("src/app/(admin)/admin/cases/[id]/page.tsx");
    const create = readSrc("src/app/(admin)/admin/cases/new/page.tsx");
    expect(list).toMatch(/CasesWorkspace/);
    expect(list).toMatch(/basePath="\/admin\/cases"/);
    expect(list).toMatch(/portal="admin"/);
    expect(detail).toMatch(/StaffCaseDetailPage/);
    expect(create).toMatch(/redirect\("\/admin\/cases\?create=1"\)/);
    expect(readSrc("src/views/staff/StaffCaseDetailPage.tsx")).toMatch(
      /basePath: CaseWorkspaceBasePath = isAdminSurface \? "\/admin\/cases" : "\/staff\/cases"/,
    );
  });

  it("gives admin cases.view_all without adding admin to STAFF_ROLES", () => {
    expect([...DEFAULT_ROLE_PERMISSIONS.admin]).toContain("cases.view_all");
    expect(STAFF_ROLES).not.toContain("admin");
    const roles = readSrc("src/hooks/use-current-user.ts");
    expect(roles).not.toMatch(/STAFF_ROLES: UserRole\[] = \[[^\]]*admin/);
  });

  it("Admin search opens cases under /admin/cases", () => {
    const search = readSrc("src/components/dashboard/global-search-palette.tsx");
    expect(search).toMatch(/portal === "admin" \? "\/admin\/cases" : "\/staff\/cases"/);
    expect(search).toMatch(/href: "\/admin\/cases"/);
    expect(search).toMatch(/\/admin\/cases\?create=1/);
  });
});
