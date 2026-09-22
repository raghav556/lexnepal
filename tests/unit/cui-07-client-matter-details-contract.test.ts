/**
 * CUI-07 Client Matter Details composition contract.
 * Protects Reference 03 body decisions without brittle pixel asserts.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/views/client/ClientCaseDetailPage.tsx", "utf8");
const css = readFileSync("src/index.css", "utf8");
const home = readFileSync("src/views/client/ClientDashboard.tsx", "utf8");
const matters = readFileSync("src/views/client/ClientCasesPage.tsx", "utf8");
const caseUi = readFileSync("src/shared/contracts/case-ui.ts", "utf8");
const a11y = readFileSync("tests/unit/cases-r9-a11y.test.ts", "utf8");
const staffDetail = readFileSync("src/views/staff/StaffCaseDetailPage.tsx", "utf8");
const workspace = readFileSync("src/components/cases/cases-workspace.tsx", "utf8");

describe("CUI-07 client matter details contract", () => {
  it("uses Matter Details vocabulary and My Matters navigation context", () => {
    expect(page).toContain('aria-label="Breadcrumb"');
    expect(page).toContain('href="/client/cases"');
    expect(page).toContain("My Matters");
    expect(page).toContain("Back to My Matters");
    expect(page).toContain("Message Legal Team");
    expect(page).toContain("About This Matter");
    expect(page).toContain("Your Legal Team");
    expect(page).toContain("Recent Matter Activity");
    expect(page).toContain("Client Action Checklist");
    expect(page).toContain('className="client-matter-detail"');
    expect(page).toContain("CASE_DETAIL_HERO_CLASS");
    expect(page).toContain("CASE_DETAIL_TABS_LIST_CLASS");
    expect(page).not.toContain("CASE_CLIENT_HERO_CLASS");
    expect(caseUi).not.toContain("CASE_CLIENT_HERO_CLASS");
    expect(a11y).not.toContain("CASE_CLIENT_HERO_CLASS");
  });

  it("keeps real Client queries and Client-safe filtering", () => {
    expect(page).toContain("useClientCaseQuery");
    expect(page).toContain("useHearings");
    expect(page).toContain("useDocuments");
    expect(page).toContain("useTasks");
    expect(page).toContain("useMessages");
    expect(page).toContain("useMyTeam");
    expect(page).toContain("useNotifications");
    expect(page).toContain("t.clientVisible && !t.archivedAt && !t.parentTaskId");
    expect(page).toContain("`/client/messages?caseId=${caseId}`");
    expect(page).toContain("`/client/documents?caseId=${caseId}`");
    expect(page).toContain('href="/client/signatures"');
    expect(page).toContain('href="/client/checklist"');
    expect(page).toContain('party.side === "opposing"');
    expect(page).toContain("relatedId");
    expect(page).toContain("/client/cases/${matterId}");
    expect(page).not.toMatch(/\buseCases\b/);
    expect(page).not.toContain("CasesWorkspace");
    expect(page).not.toContain("CaseCreateDialog");
  });

  it("uses four reference-like quick facts without Practice Area or Court cards", () => {
    expect(page).toContain(">Matter Number</span>");
    expect(page).toContain(">Current Status</span>");
    expect(page).toContain(">Next Hearing</span>");
    expect(page).toContain(">Open Actions</span>");
    expect(page).not.toContain('className="client-matter-detail-fact-label">Practice Area');
    expect(page).not.toContain('className="client-matter-detail-fact-label">Court');
    expect(page).not.toMatch(/Pending Signature<\/span>/);
    expect(css).toContain("grid-template-columns: repeat(4, minmax(0, 1fr))");
  });

  it("does not invent statuses, timelines, or staff controls", () => {
    expect(page).not.toContain("under_review");
    expect(page).not.toContain("in_progress");
    expect(page).not.toContain("Under Review");
    expect(page).not.toContain("Court Timeline");
    expect(page).not.toContain("Matter Timeline");
    expect(page).not.toContain("Procedural Timeline");
    expect(page).not.toContain("Edit Matter");
    expect(page).not.toContain("Close Matter");
    expect(page).not.toContain("Assign Lawyer");
    expect(page).not.toContain("Create Hearing");
    expect(page).not.toContain("opposingCounsel");
    expect(page).not.toContain("filingDate");
    expect(page).not.toContain("teamMemberIds");
    expect(page).not.toContain("caseData.description");
    expect(page).toContain("No recent matter activity");
    expect(page).toContain("downloadHearingIcs");
  });

  it("keeps CUI-05/CUI-06 and Staff/Admin sources untouched by this phase", () => {
    expect(home).toContain('className: "client-home"');
    expect(home).toContain('title="Your Matters"');
    expect(matters).toContain('title: "My Matters"');
    expect(matters).toContain("CASE_LIST_HERO_CLASS");
    expect(css).toContain(
      '.dashboard-theme.dashboard-client.client-home[data-slot="portal-page-shell"]',
    );
    expect(css).toContain(
      '.dashboard-theme.dashboard-client.client-matters[data-slot="portal-page-shell"]',
    );
    expect(css).toContain(
      '.dashboard-theme.dashboard-client.client-matter-detail[data-slot="portal-page-shell"]',
    );
    expect(staffDetail).toContain("CASE_DETAIL_HERO_CLASS");
    expect(workspace).toContain("CASE_LIST_HERO_CLASS");
    expect(page).not.toContain("client-home");
    expect(page).not.toContain("client-matters");
  });
});
