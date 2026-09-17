/**
 * R10 Case dead-UI / status-map cleanup.
 *
 * Gate: no /admin/cases/new product href; Case UI writes only `closed`;
 * one lifecycle label map; Misl groups by documents.type. Do NOT drop
 * closed_won/closed_lost from DB/Zod.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getDashboardStatusTone } from "@/lib/dashboard-semantics";
import { STAFF_ROLES } from "@/hooks/use-current-user";
import { caseStatusSchema } from "@/shared/contracts/matters";
import {
  CASE_LIFECYCLE_LABELS,
  CASE_MISL_BINDERS,
  caseStatusWritePayload,
  isCaseStatusValue,
  mislBinderForType,
  toLifecycleStatus,
} from "@/shared/contracts/case-ui";

const repoRoot = path.resolve(".");

function readSrc(...segments: string[]): string {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

describe("R10 Case dead UI and status-map cleanup", () => {
  it("C-ADM-001 remainder: Admin New case opens the list dialog, not /admin/cases/new", () => {
    const dashboard = readSrc("src/views/admin/AdminDashboard.tsx");
    const redirect = readSrc("src/app/(admin)/admin/cases/new/page.tsx");
    expect(dashboard).toContain('href: "/admin/cases?create=1"');
    expect(dashboard).not.toContain('href: "/admin/cases/new"');
    expect(redirect).toMatch(/redirect\("\/admin\/cases\?create=1"\)/);
    expect(readSrc("src/components/dashboard/global-search-palette.tsx")).not.toMatch(
      /\/admin\/cases\/new/,
    );
  });

  it("C-DUP-001 UI: Case chips and filters use lifecycle labels, not closed_won/lost maps", () => {
    expect(toLifecycleStatus("closed_won")).toBe("closed");
    expect(CASE_LIFECYCLE_LABELS.closed).toBe("Closed");
    expect(isCaseStatusValue("closed_won")).toBe(true);
    expect(getDashboardStatusTone("closed_won")).toBe(getDashboardStatusTone("closed"));
    expect(getDashboardStatusTone("closed_lost")).toBe(getDashboardStatusTone("closed"));

    const label = readSrc("src/components/dashboard/dashboard-status-label.tsx");
    expect(label).toMatch(/toLifecycleStatus/);
    expect(label).toMatch(/CASE_LIFECYCLE_LABELS/);

    const semantics = readSrc("src/lib/dashboard-semantics.ts");
    expect(semantics).not.toMatch(/closed_won:\s*"success"/);
    expect(semantics).not.toMatch(/closed_lost:\s*"danger"/);

    const clientList = readSrc("src/views/client/ClientCasesPage.tsx");
    expect(clientList).toMatch(/CASE_LIFECYCLE_LABELS\[status\]/);
    expect(clientList).not.toMatch(/On Hold/);

    const search = readSrc("src/components/dashboard/global-search-palette.tsx");
    expect(search).toMatch(/CASE_LIFECYCLE_LABELS\[toLifecycleStatus/);
    expect(search).not.toMatch(/c\.status === "closed"/);
  });

  it("UI writes only closed; create and detail go through caseStatusWritePayload", () => {
    expect(caseStatusWritePayload("closed_won")).toEqual({
      status: "closed",
      closureOutcome: "won",
    });
    expect(caseStatusWritePayload("closed", "settled")).toEqual({
      status: "closed",
      closureOutcome: "settled",
    });
    const create = readSrc("src/components/cases/case-create-dialog.tsx");
    const detail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    expect(create).toMatch(/caseStatusWritePayload\(form\.status\)/);
    expect(create).toMatch(/status: statusWrite\.status/);
    expect(detail).toMatch(/caseStatusWritePayload\(status, closureOutcome\)/);
    expect(create).not.toMatch(/<option value="closed_won">/);
    expect(detail).not.toMatch(/<option value="closed_won">/);
    expect(create).not.toMatch(/status:\s*"closed_won"/);
    expect(detail).not.toMatch(/status:\s*"closed_won"/);
  });

  it("C-STAFF-007 remainder: Misl binders live in case-ui and key off documents.type", () => {
    expect(mislBinderForType("pleading")).toBe("pleadings");
    expect(mislBinderForType("court_filing")).toBe("orders");
    expect(mislBinderForType("template")).toBe("misc");
    expect(CASE_MISL_BINDERS.map((binder) => binder.id)).toEqual([
      "pleadings",
      "evidence",
      "orders",
      "annexure",
      "misc",
    ]);
    const detail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    const upload = readSrc("src/components/cases/case-misl-upload-dialog.tsx");
    expect(detail).toMatch(/CASE_MISL_BINDERS/);
    expect(detail).toMatch(/mislBinderForType\(d\.type\)/);
    expect(detail).not.toMatch(/const MISL_CATEGORIES/);
    expect(detail).not.toMatch(/d\.type\?\.includes\("PDF"\)/);
    expect(detail).not.toMatch(/d\.name\?\.includes/);
    expect(upload).toMatch(/CASE_MISL_DOCUMENT_TYPES/);
    expect(upload).toMatch(/from "@\/shared\/contracts\/case-ui"/);
  });

  it("does not drop closed_won/lost, merge Client UI, or add admin to STAFF_ROLES", () => {
    expect([...caseStatusSchema.options]).toEqual(
      expect.arrayContaining(["closed", "closed_won", "closed_lost"]),
    );
    expect([...STAFF_ROLES]).not.toContain("admin");
    const clientList = readSrc("src/views/client/ClientCasesPage.tsx");
    expect(clientList).not.toMatch(/CasesWorkspace/);
    expect(clientList).not.toMatch(/CaseCreateDialog/);
  });
});
