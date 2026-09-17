/**
 * R12 Final QA contract: ship-ready Case management. Stage E is a dedicated
 * leftover-status cleanup; Zod still accepts closed_won/lost as aliases.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { STAFF_ROLES } from "@/hooks/use-current-user";
import { toPersistedCaseStatus } from "@/shared/contracts/case-status";
import { caseCreateSchema, caseStatusSchema, caseUpdateSchema } from "@/shared/contracts/matters";
import { caseStatusWritePayload } from "@/shared/contracts/case-ui";

const repoRoot = path.resolve(".");

function readSrc(...segments: string[]): string {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

describe("R12 Case QA and Stage E cleanup", () => {
  it("dedicated 0006 contracts the MySQL enum only; API aliases remain", () => {
    const cleanup = readSrc("drizzle/0006_cases_legacy_status_cleanup.sql");
    expect(cleanup).toMatch(
      /MODIFY `status` enum\('inquiry','active','on_hold','closed'\) NOT NULL/,
    );
    expect(cleanup).toMatch(/restore from mysqldump/i);
    const drizzleEnum = readSrc("db/schema.ts").slice(
      readSrc("db/schema.ts").indexOf('reusableMysqlEnum("case_status"'),
      readSrc("db/schema.ts").indexOf("export const caseClosureOutcomeEnum"),
    );
    expect(drizzleEnum).toContain('"closed"');
    expect(drizzleEnum).not.toContain("closed_won");
    expect(drizzleEnum).not.toContain("closed_lost");
    expect([...caseStatusSchema.options]).toEqual(
      expect.arrayContaining(["closed", "closed_won", "closed_lost"]),
    );
    expect(caseUpdateSchema.parse({ status: "closed_won" })).toEqual(
      expect.objectContaining({ status: "closed", closureOutcome: "won" }),
    );
    expect(
      caseCreateSchema.parse({
        caseNumber: "C-1",
        title: "Matter",
        practiceArea: "Corporate",
        clientId: "11111111-1111-4111-8111-111111111111",
        assignedLawyerId: "22222222-2222-4222-8222-222222222222",
        status: "closed_lost",
      }).status,
    ).toBe("closed");
    expect(toPersistedCaseStatus("closed_won")).toBe("closed");
    expect(toPersistedCaseStatus("closed_lost")).toBe("closed");
    expect(toPersistedCaseStatus("active")).toBe("active");
    expect(caseStatusWritePayload("closed")).toEqual({
      status: "closed",
      closureOutcome: null,
    });
  });

  it("does not merge Client UI, add admin to STAFF_ROLES, or reopen billing", () => {
    expect([...STAFF_ROLES]).not.toContain("admin");
    const clientList = readSrc("src/views/client/ClientCasesPage.tsx");
    expect(clientList).not.toMatch(/CasesWorkspace/);
    expect(clientList).not.toMatch(/CaseCreateDialog/);
    expect(readSrc("db/schema.ts")).not.toMatch(/mysqlTable\(\s*"payments"/);
    expect(readSrc("db/schema.ts")).not.toMatch(/mysqlTable\(\s*"deadlines"/);
    expect(fs.existsSync(path.join(repoRoot, "doc/migration/R12_LEGACY_STATUS_CLEANUP.md"))).toBe(
      true,
    );
  });

  it("Staff, Admin, and Client Case surfaces stay on their shells", () => {
    expect(readSrc("src/views/staff/StaffCasesPage.tsx")).toMatch(/CasesWorkspace/);
    expect(readSrc("src/app/(admin)/admin/cases/page.tsx")).toMatch(/portal="admin"/);
    expect(readSrc("src/app/(client)/client/cases/page.tsx")).toMatch(/ClientCasesPage/);
    expect(readSrc("src/views/client/ClientCaseDetailPage.tsx")).toMatch(/useClientCaseQuery/);
  });
});
