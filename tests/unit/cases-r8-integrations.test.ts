/**
 * R8 Case file integrations.
 *
 * Gate: hearings, task dates, Misl upload/view, messages, team, and parties
 * all work on the Case file; no new deadlines table; no off-file Staff-only
 * dead ends from Admin.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  earliestIncompleteTaskDueIso,
  nextRequiredAction,
  nextScheduledHearingIso,
} from "@/shared/contracts/case-ui";
import { STAFF_ROLES } from "@/hooks/use-current-user";

const repoRoot = path.resolve(".");

function readSrc(...segments: string[]): string {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

describe("R8 Case integrations", () => {
  it("C-STAFF-008: hearings are scheduled on the Case file, not /staff/hearings", () => {
    const detail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    const dialog = readSrc("src/components/cases/case-hearing-dialog.tsx");
    expect(detail).toMatch(/CaseHearingDialog/);
    expect(detail).toMatch(/setHearingDialogOpen\(true\)/);
    expect(detail).not.toMatch(/href="\/staff\/hearings"/);
    expect(dialog).toMatch(/createHearing/);
    expect(dialog).toMatch(/aria-labelledby="case-hearing-title"/);
    expect(dialog).toMatch(/dateGregorian/);
    expect(dialog).toMatch(/dateBs/);
  });

  it("C-STAFF-007: Misl upload and view stay on the Case file and group by documents.type", () => {
    const detail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    const upload = readSrc("src/components/cases/case-misl-upload-dialog.tsx");
    const types = readSrc("src/shared/contracts/case-ui.ts");
    expect(detail).toMatch(/CaseMislUploadDialog/);
    expect(detail).toMatch(/mislBinderForType/);
    expect(detail).toMatch(/downloadDocument/);
    expect(detail).not.toMatch(/href="\/staff\/documents"/);
    expect(detail).not.toMatch(/d\.type\?\.includes\("PDF"\)/);
    expect(upload).toMatch(/useUploadDocument/);
    expect(upload).toMatch(/caseId/);
    expect(types).toMatch(/court_filing/);
    expect(upload).toMatch(/CASE_MISL_DOCUMENT_TYPES/);
    expect(upload).toMatch(/aria-labelledby="case-misl-upload-title"/);
  });

  it("C-DATE-001: next required action is hearing or incomplete task due; no deadlines table", () => {
    expect(nextRequiredAction("2026-10-02", "2026-10-01T00:00:00.000Z")).toEqual({
      kind: "task",
      iso: "2026-10-01T00:00:00.000Z",
    });
    expect(nextRequiredAction("2026-09-20", "2026-10-01T00:00:00.000Z")).toEqual({
      kind: "hearing",
      iso: "2026-09-20",
    });
    expect(
      nextScheduledHearingIso(
        [
          { status: "completed", dateGregorian: "2099-12-01" },
          { status: "scheduled", dateGregorian: "2099-10-02" },
        ],
        null,
      ),
    ).toBe("2099-10-02");
    expect(
      earliestIncompleteTaskDueIso([
        { status: "done", dueDate: "2026-09-01T00:00:00.000Z" },
        { status: "todo", dueDate: "2026-10-05T00:00:00.000Z" },
        { status: "in_progress", dueDate: "2026-10-03T00:00:00.000Z" },
      ]),
    ).toBe("2026-10-03T00:00:00.000Z");
    const schema = readSrc("db/schema.ts");
    expect(schema).not.toMatch(/mysqlTable\(\s*"deadlines"/);
    const detail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    expect(detail).toMatch(/Next required action/);
    expect(detail).toMatch(/DueDateFields/);
    expect(detail).toMatch(/dueDate: newTaskDueDate/);
    expect(detail).toMatch(/Task: \$\{task\.title\}/);
  });

  it("C-STAFF-006 remainder: parties stay on the file without CRM auto-insert", () => {
    const detail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    expect(detail).toMatch(/CasePartiesEditor/);
    expect(detail).toMatch(/The CRM instructing client is not added automatically/);
    expect(detail).not.toMatch(/Edit Opposing/);
  });

  it("keeps messages, team, and STAFF_ROLES contract", () => {
    const detail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    expect(detail).toMatch(/setMessageStream\("client"\)/);
    expect(detail).toMatch(/setMessageStream\("team"\)/);
    expect(detail).toMatch(/Case Team/);
    expect(detail).toMatch(/CaseTeamFields/);
    expect(STAFF_ROLES).not.toContain("admin");
  });

  it("hearing and task writes refresh Case next-action fields", () => {
    const hearings = readSrc("src/client/queries/hearings.ts");
    const tasks = readSrc("src/client/queries/tasks.ts");
    expect(hearings).toMatch(/queryKeys\.cases\.all/);
    expect(tasks).toMatch(/queryKeys\.cases\.all/);
  });
});
