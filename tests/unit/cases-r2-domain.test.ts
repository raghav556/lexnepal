import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { toClientCaseDto } from "@/shared/contracts/client-allowlists";
import { syncCaseTeamMembers } from "@/shared/contracts/case-team-sync";
import {
  caseStatusSchema,
  caseUpdateSchema,
  closureOutcomeSchema,
} from "@/shared/contracts/matters";

const repoRoot = path.resolve(".");
const migrationSql = fs.readFileSync(
  path.join(repoRoot, "drizzle/0005_cases_domain_foundations.sql"),
  "utf8",
);
const schemaSource = fs.readFileSync(path.join(repoRoot, "db/schema.ts"), "utf8");
const repositorySource = fs.readFileSync(
  path.join(repoRoot, "src/server/repositories/matters-repository.ts"),
  "utf8",
);

describe("R2 Cases domain foundations", () => {
  it("keeps closed_won and closed_lost while adding closed + closureOutcome", () => {
    expect([...caseStatusSchema.options]).toEqual(
      expect.arrayContaining(["closed", "closed_won", "closed_lost"]),
    );
    expect([...closureOutcomeSchema.options]).toEqual([
      "won",
      "lost",
      "settled",
      "withdrawn",
      "other",
    ]);
    expect(
      caseUpdateSchema.safeParse({ status: "closed", closureOutcome: "settled" }).success,
    ).toBe(true);
    expect(caseUpdateSchema.safeParse({ status: "closed_won" }).success).toBe(true);
  });

  it("does not copy description into clientSummary in the Client DTO or migration SQL", () => {
    const dto = toClientCaseDto({
      id: "case-1",
      title: "Matter",
      caseNumber: "C-1",
      description: "INTERNAL staff notes",
      status: "active",
      practiceArea: "Corporate",
      assignedLawyerId: "lawyer-1",
    });
    expect(dto.clientSummary).toBeNull();
    expect(JSON.stringify(dto)).not.toContain("INTERNAL");
    expect(migrationSql).not.toMatch(/client_summary[^\n]*=[^\n]*description/i);
    expect(migrationSql).not.toMatch(/INSERT\s+INTO\s+`case_parties`/i);
  });

  it("expands status enum in SQL without dropping closed_won or closed_lost", () => {
    expect(migrationSql).toMatch(
      /MODIFY `status` enum\('inquiry','active','on_hold','closed_won','closed_lost','closed'\)/,
    );
    expect(migrationSql).toMatch(
      /SET `status` = 'closed', `closure_outcome` = 'won' WHERE `status` = 'closed_won'/,
    );
    expect(migrationSql).toMatch(
      /SET `status` = 'closed', `closure_outcome` = 'lost' WHERE `status` = 'closed_lost'/,
    );
    expect(migrationSql).not.toMatch(/closed_date\s*=/i);
  });

  it("C-DATE-001: next required action stays hearing or incomplete task date; no deadlines table", () => {
    expect(schemaSource).not.toMatch(/mysqlTable\(\s*"deadlines"/);
    expect(schemaSource).toMatch(/export const hearings = mysqlTable/);
    expect(schemaSource).toMatch(/export const tasks = mysqlTable/);
    expect(
      fs.readFileSync(path.join(repoRoot, "doc/migration/R2_CASES_SAFETY_GATE.md"), "utf8"),
    ).toMatch(/next scheduled hearing/i);
  });

  it("always keeps the Responsible Lawyer on the Case Team", () => {
    const created = syncCaseTeamMembers({
      currentLeadId: "lead-1",
      nextLeadId: "lead-1",
      existingTeamIds: [],
      requestedTeamIds: [],
    });
    expect(created).toEqual({ ok: true, teamMemberIds: ["lead-1"] });
    const withTeammates = syncCaseTeamMembers({
      currentLeadId: "lead-1",
      nextLeadId: "lead-1",
      existingTeamIds: [],
      requestedTeamIds: ["intern-1"],
    });
    expect(withTeammates).toEqual({ ok: true, teamMemberIds: ["intern-1", "lead-1"] });
    expect(repositorySource).toMatch(/syncCaseTeamMembers/);
  });

  it("rejects removing the current Responsible Lawyer without reassignment", () => {
    const result = syncCaseTeamMembers({
      currentLeadId: "lead-1",
      nextLeadId: "lead-1",
      existingTeamIds: ["lead-1", "intern-1"],
      requestedTeamIds: ["intern-1"],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/Reassign the Responsible Lawyer/);
  });

  it("keeps the previous Responsible Lawyer when the lead changes unless the team list omits them", () => {
    const implicit = syncCaseTeamMembers({
      currentLeadId: "lead-1",
      nextLeadId: "lead-2",
      existingTeamIds: ["lead-1", "intern-1"],
    });
    expect(implicit).toEqual({
      ok: true,
      teamMemberIds: expect.arrayContaining(["lead-1", "lead-2", "intern-1"]),
    });
    const explicitRemove = syncCaseTeamMembers({
      currentLeadId: "lead-1",
      nextLeadId: "lead-2",
      existingTeamIds: ["lead-1", "intern-1"],
      requestedTeamIds: ["intern-1"],
    });
    expect(explicitRemove).toEqual({ ok: true, teamMemberIds: ["intern-1", "lead-2"] });
  });
});
