/**
 * R9 Case a11y / responsive / query states.
 *
 * Gate: Dialog keyboard (focus trap + restore + Escape + labeled close);
 * compact mobile Case heroes with scrollable tabs; empty/loading/error/
 * forbidden Case states. Do not change portal brand colors or STAFF_ROLES.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ApiClientError } from "@/client/api/errors";
import { caseQueryFailureKind } from "@/client/queries/case-query-error";
import { STAFF_ROLES } from "@/hooks/use-current-user";
import {
  CASE_DETAIL_HERO_CLASS,
  CASE_DETAIL_TABS_LIST_CLASS,
  CASE_LIST_HERO_CLASS,
} from "@/shared/contracts/case-ui";

const repoRoot = path.resolve(".");

function readSrc(...segments: string[]): string {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

describe("R9 Case a11y, compact hero, query states", () => {
  it("C-A11Y-001: Dialog traps Tab, restores focus, and keeps Escape + labeled close", () => {
    const dialog = readSrc("src/components/ui/dialog.tsx");
    expect(dialog).toMatch(/role="dialog"/);
    expect(dialog).toMatch(/aria-modal="true"/);
    expect(dialog).toMatch(/aria-label="Close dialog"/);
    expect(dialog).toMatch(/event\.key === "Escape"/);
    expect(dialog).toMatch(/event\.key !== "Tab"/);
    expect(dialog).toMatch(/previouslyFocused/);
    expect(dialog).toMatch(/getInitialFocus/);
    expect(dialog).toMatch(/last\.focus\(\)/);
    expect(dialog).toMatch(/first\.focus\(\)/);
    const create = readSrc("src/components/cases/case-create-dialog.tsx");
    const hearing = readSrc("src/components/cases/case-hearing-dialog.tsx");
    const misl = readSrc("src/components/cases/case-misl-upload-dialog.tsx");
    const parties = readSrc("src/components/cases/case-parties-editor.tsx");
    for (const source of [create, hearing, misl, parties]) {
      expect(source).toMatch(/from "@\/components\/ui\/dialog/);
    }
  });

  it("C-A11Y-002: compact mobile Case heroes hide chips; tabs scroll instead of wrap", () => {
    expect(CASE_LIST_HERO_CLASS).toMatch(/max-sm:\[&_\[data-hero-chips\]\]:hidden/);
    expect(CASE_DETAIL_HERO_CLASS).toMatch(/max-sm:\[&_\[data-hero-chips\]\]:hidden/);
    expect(CASE_DETAIL_TABS_LIST_CLASS).toMatch(/overflow-x-auto/);
    expect(CASE_DETAIL_TABS_LIST_CLASS).toMatch(/flex-nowrap/);
    const chips = readSrc("src/components/dashboard/hero-stat-chip.tsx");
    expect(chips).toMatch(/data-hero-chips/);
    const workspace = readSrc("src/components/cases/cases-workspace.tsx");
    const staffDetail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    const clientList = readSrc("src/views/client/ClientCasesPage.tsx");
    const clientDetail = readSrc("src/views/client/ClientCaseDetailPage.tsx");
    expect(workspace).toMatch(/CASE_LIST_HERO_CLASS/);
    expect(staffDetail).toMatch(/CASE_DETAIL_HERO_CLASS/);
    expect(staffDetail).toMatch(/CASE_DETAIL_TABS_LIST_CLASS/);
    expect(staffDetail).toMatch(/aria-label="Case sections"/);
    expect(staffDetail).toMatch(/Matter overview[\s\S]*max-sm:hidden/);
    expect(clientList).toMatch(/CASE_LIST_HERO_CLASS/);
    expect(clientList).toMatch(/metricsClassName="max-sm:hidden"/);
    expect(clientDetail).toMatch(/CASE_DETAIL_HERO_CLASS/);
    expect(clientDetail).toMatch(/CASE_DETAIL_TABS_LIST_CLASS/);
    expect(clientDetail).toMatch(/metricsClassName="max-sm:hidden"/);
    expect(clientDetail).not.toMatch(/flex flex-wrap h-auto gap-1/);
  });

  it("C-A11Y-003: empty, loading, error, and forbidden Case states", () => {
    expect(caseQueryFailureKind(new ApiClientError("FORBIDDEN", "no", 403))).toBe("forbidden");
    expect(caseQueryFailureKind(new ApiClientError("NOT_FOUND", "missing", 404))).toBe("not_found");
    expect(caseQueryFailureKind(new ApiClientError("INTERNAL_ERROR", "boom", 500))).toBe("error");
    expect(caseQueryFailureKind(new Error("network"))).toBe("error");

    const state = readSrc("src/components/cases/case-query-state.tsx");
    expect(state).toMatch(/Access denied/);
    expect(state).toMatch(/Could not load cases/);
    expect(state).toMatch(/Try again/);
    expect(state).toMatch(/EmptyState/);

    const workspace = readSrc("src/components/cases/cases-workspace.tsx");
    expect(workspace).toMatch(/useCasesQuery/);
    expect(workspace).toMatch(/casesQuery\.isError/);
    expect(workspace).toMatch(/No cases on file/);
    expect(workspace).toMatch(/No matching cases/);
    expect(workspace).toMatch(/Loading matters/);

    const staffDetail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    expect(staffDetail).toMatch(/useCaseQuery/);
    expect(staffDetail).toMatch(/caseQuery\.isError/);
    expect(staffDetail).toMatch(/Loading matter/);
    expect(staffDetail).toMatch(/CaseQueryState/);

    const clientList = readSrc("src/views/client/ClientCasesPage.tsx");
    const clientDetail = readSrc("src/views/client/ClientCaseDetailPage.tsx");
    expect(clientList).toMatch(/useClientCasesQuery/);
    expect(clientList).toMatch(/casesQuery\.isError/);
    expect(clientDetail).toMatch(/useClientCaseQuery/);
    expect(clientDetail).toMatch(/caseQuery\.isError/);
    expect(clientDetail).toMatch(/CaseQueryState/);
  });

  it("does not merge Client UI, change STAFF_ROLES, or drop closed_won/lost", () => {
    expect([...STAFF_ROLES]).not.toContain("admin");
    const clientList = readSrc("src/views/client/ClientCasesPage.tsx");
    const clientDetail = readSrc("src/views/client/ClientCaseDetailPage.tsx");
    expect(clientList).not.toMatch(/CasesWorkspace/);
    expect(clientDetail).not.toMatch(/CasesWorkspace/);
    expect(clientList).not.toMatch(/CaseCreateDialog/);
    const schema = readSrc("src/shared/contracts/matters.ts");
    expect(schema).toMatch(/closed_won/);
    expect(schema).toMatch(/closed_lost/);
  });
});
