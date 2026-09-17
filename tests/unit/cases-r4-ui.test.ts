/**
 * R4 shared Case UI primitives.
 *
 * Gate: Case views do not duplicate lifecycle status arrays; Staff and Admin
 * mount the same list module on two basePaths; create uses Dialog, not a
 * Description / Notes combo overlay.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CASE_CLOSURE_OUTCOMES,
  CASE_LIFECYCLE_LABELS,
  CASE_LIFECYCLE_STATUSES,
  CASE_STATUS_FILTERS,
  CASE_WORKSPACE_BASE_PATHS,
  caseDetailPath,
  caseStatusWritePayload,
  inferredClosureOutcome,
  matchesCaseStatusFilter,
  toLifecycleStatus,
} from "@/shared/contracts/case-ui";

const repoRoot = path.resolve(".");

function readSrc(...segments: string[]): string {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

const CASE_VIEW_FILES = [
  "src/views/staff/StaffCasesPage.tsx",
  "src/views/staff/StaffCaseDetailPage.tsx",
  "src/components/cases/cases-workspace.tsx",
  "src/components/cases/case-create-dialog.tsx",
  "src/components/cases/case-identity.tsx",
  "src/components/cases/case-status-filters.tsx",
];

describe("R4 shared Case UI", () => {
  it("exposes one lifecycle + outcome label source", () => {
    expect([...CASE_LIFECYCLE_STATUSES]).toEqual(["inquiry", "active", "on_hold", "closed"]);
    expect([...CASE_CLOSURE_OUTCOMES]).toEqual(["won", "lost", "settled", "withdrawn", "other"]);
    expect([...CASE_STATUS_FILTERS]).toEqual(["all", "inquiry", "active", "on_hold", "closed"]);
    expect(CASE_LIFECYCLE_LABELS.closed).toBe("Closed");
    expect([...CASE_WORKSPACE_BASE_PATHS]).toEqual(["/staff/cases", "/admin/cases"]);
    expect(caseDetailPath("/admin/cases", "abc")).toBe("/admin/cases/abc");
  });

  it("maps legacy closed_won/lost to closed + outcome without writing those statuses", () => {
    expect(toLifecycleStatus("closed_won")).toBe("closed");
    expect(toLifecycleStatus("closed_lost")).toBe("closed");
    expect(inferredClosureOutcome("closed_won", null)).toBe("won");
    expect(inferredClosureOutcome("closed", "settled")).toBe("settled");
    expect(caseStatusWritePayload("closed_won")).toEqual({
      status: "closed",
      closureOutcome: "won",
    });
    expect(caseStatusWritePayload("closed", "lost")).toEqual({
      status: "closed",
      closureOutcome: "lost",
    });
    expect(caseStatusWritePayload("active", "won")).toEqual({
      status: "active",
      closureOutcome: null,
    });
    expect(matchesCaseStatusFilter("closed_won", "closed")).toBe(true);
    expect(matchesCaseStatusFilter("active", "closed")).toBe(false);
  });

  it("C-DUP-001: Case views import shared status arrays instead of duplicating them", () => {
    for (const file of CASE_VIEW_FILES) {
      const source = readSrc(file);
      expect(source).not.toMatch(/\["inquiry",\s*"active",\s*"on_hold",\s*"closed_won"/);
      expect(source).not.toMatch(/<option value="closed_won">/);
      expect(source).not.toMatch(/<option value="closed_lost">/);
    }
    const workspace = readSrc("src/components/cases/cases-workspace.tsx");
    const filters = readSrc("src/components/cases/case-status-filters.tsx");
    const detail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    expect(workspace).toMatch(/CASE_LIFECYCLE_STATUSES/);
    expect(filters).toMatch(/CASE_LIFECYCLE_STATUSES/);
    expect(filters).toMatch(/CASE_CLOSURE_OUTCOMES/);
    expect(detail).toMatch(/CaseStatusEditorFields/);
    expect(detail).toMatch(/caseStatusWritePayload/);
  });

  it("C-ADM-003: the same list module mounts on /staff/cases and /admin/cases", () => {
    const staff = readSrc("src/views/staff/StaffCasesPage.tsx");
    const admin = readSrc("src/app/(admin)/admin/cases/page.tsx");
    expect(staff).toMatch(/CasesWorkspace/);
    expect(staff).toMatch(/basePath="\/staff\/cases"/);
    expect(admin).toMatch(/CasesWorkspace/);
    expect(admin).toMatch(/basePath="\/admin\/cases"/);
    expect(admin).toMatch(/portal="admin"/);
  });

  it("C-A11Y-001: Case create uses Dialog with labeled close and split description fields", () => {
    const dialog = readSrc("src/components/cases/case-create-dialog.tsx");
    const uiDialog = readSrc("src/components/ui/dialog.tsx");
    expect(dialog).toMatch(/from "@\/components\/ui\/dialog/);
    expect(dialog).toMatch(/Internal Case Description/);
    expect(dialog).toMatch(/Client-visible Summary/);
    expect(dialog).not.toMatch(/Description \/ Notes/);
    expect(dialog).toMatch(/Responsible Lawyer/);
    expect(dialog).toMatch(/aria-labelledby="case-create-title"/);
    expect(uiDialog).toMatch(/role="dialog"/);
    expect(uiDialog).toMatch(/aria-label="Close dialog"/);
  });

  it("does not merge Client Case pages into the Staff/Admin workspace", () => {
    const clientList = readSrc("src/views/client/ClientCasesPage.tsx");
    const clientDetail = readSrc("src/views/client/ClientCaseDetailPage.tsx");
    expect(clientList).not.toMatch(/CasesWorkspace/);
    expect(clientDetail).not.toMatch(/CasesWorkspace/);
    expect(clientList).not.toMatch(/CaseCreateDialog/);
  });

  it("C-STAFF-004 / C-STAFF-005 / C-VIS-001: one view control, chips or metrics not both, compact hero", () => {
    const workspace = readSrc("src/components/cases/cases-workspace.tsx");
    expect(workspace).not.toMatch(/metrics=\{/);
    expect(workspace).toMatch(/CASE_LIST_HERO_CLASS/);
    expect(workspace).toMatch(/StaffHeroChipRow/);
    expect(workspace).not.toMatch(/viewMode === "list" \? "Board view"/);
    expect(workspace).toMatch(/aria-label="Case view"/);
    expect(workspace).toMatch(/<Plus[\s\S]*New case/);
    const heroNewCaseCount = workspace.match(/New case/g) ?? [];
    expect(heroNewCaseCount.length).toBe(1);
  });

  it("C-STAFF-004 identity: list and detail consume CaseIdentity", () => {
    const workspace = readSrc("src/components/cases/cases-workspace.tsx");
    const detail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    expect(workspace).toMatch(/<CaseIdentity/);
    expect(detail).toMatch(/<CaseIdentity/);
    expect(detail).toMatch(/aria-label="Back to cases"/);
  });

  it("does not add admin to STAFF_ROLES", () => {
    const source = readSrc("src/hooks/use-current-user.ts");
    expect(source).toMatch(/export const STAFF_ROLES/);
    expect(source).not.toMatch(/STAFF_ROLES: UserRole\[] = \[[^\]]*admin/);
  });
});
