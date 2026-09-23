/**
 * CUI-06 Client My Matters composition contract.
 * Proves vocabulary, real filters, and frozen Home/protected files.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/views/client/ClientCasesPage.tsx", "utf8");
const css = readFileSync("src/index.css", "utf8");
const home = readFileSync("src/views/client/ClientDashboard.tsx", "utf8");
const caseUi = readFileSync("src/shared/contracts/case-ui.ts", "utf8");
const a11y = readFileSync("tests/unit/cases-r9-a11y.test.ts", "utf8");

describe("CUI-06 client my matters contract", () => {
  it("uses My Matters vocabulary and keeps the committed hero class", () => {
    expect(page).toContain('title: "My Matters"');
    expect(page).toContain("Track your legal matters and upcoming important dates.");
    expect(page).toContain("All Matters");
    expect(page).toContain("In Progress");
    expect(page).toContain("Completed");
    expect(page).toContain("View Matter Details");
    expect(page).toContain("Message Legal Team");
    expect(page).toContain("Matter Number");
    expect(page).toContain("CASE_LIST_HERO_CLASS");
    expect(page).toContain('metricsClassName="max-sm:hidden"');
    expect(page).toContain("Clock");
    expect(page).toContain("Pause");
    expect(page).toContain("CheckCircle2");
    expect(page).not.toContain("Request new consultation");
    expect(page).not.toContain('href="/client/booking"');
    expect(page).not.toContain("My Cases");
    expect(page).not.toContain("CASE_CLIENT_HERO_CLASS");
    expect(caseUi).not.toContain("CASE_CLIENT_HERO_CLASS");
    expect(a11y).not.toContain("CASE_CLIENT_HERO_CLASS");
  });

  it("preserves real Client queries, filters, and view modes", () => {
    expect(page).toContain("useClientCasesQuery");
    expect(page).toContain("useMyClient");
    expect(page).toContain("useCurrentUser");
    expect(page).toContain("useHearings");
    expect(page).toContain("useNotifications");
    expect(page).toContain("useMyTeam");
    expect(page).toContain("matchesCaseStatusFilter(c.status, statusFilter)");
    expect(page).toContain("isLifecycleClosed(c.status)");
    expect(page).toContain("CASE_LIFECYCLE_LABELS[status]");
    expect(page).toContain("c.practiceArea");
    expect(page).toContain("All matter types");
    expect(page).toContain("itemsPerPage: 8");
    expect(page).toContain("resetPagination");
    expect(page).toContain("Cards");
    expect(page).toContain("Table");
    expect(page).toContain('viewMode === "table"');
    expect(page).toContain("casesQuery.isError");
    expect(page).toContain("casesQuery.refetch");
    expect(page).toContain("Loading your legal matters");
    expect(page).not.toMatch(/\buseCases\b/);
  });

  it("keeps authorization and Client-safe architecture", () => {
    expect(page).toContain('portal="client"');
    expect(page).toContain("ClientCaseDto");
    expect(page).toContain("Not specified");
    expect(page).toContain("`/client/cases/${c._id}`");
    expect(page).toContain("`/client/messages?caseId=${c._id}`");
    expect(page).toContain('href="/client/messages"');
    expect(page).toContain('href="/client/hearings"');
    expect(page).not.toContain("CasesWorkspace");
    expect(page).not.toContain("CaseCreateDialog");
    expect(page).not.toContain("District Court");
    expect(page).not.toContain("closed_won");
    expect(page).not.toContain("closed_lost");
    expect(page).not.toContain("opposingCounsel");
    expect(page).not.toContain("filingDate");
    expect(page).not.toContain("closureOutcome");
    expect(page).not.toContain("teamMemberIds");
    expect(page).not.toContain("caseData.description");
  });

  it("does not invent statuses, sort, or a legal timeline", () => {
    expect(page).not.toContain("under_review");
    expect(page).not.toContain("in_progress");
    expect(page).not.toMatch(/status:\s*"completed"/);
    expect(page).not.toContain("Under Review");
    expect(page).not.toContain("On Hold");
    expect(page).not.toContain("Latest Update");
    expect(page).not.toContain("Sort by");
    expect(page).not.toContain("Case filed");
    expect(page).not.toContain("Written statement submitted");
    expect(page).not.toContain("Evidence submission");
    expect(page).not.toContain("Final hearing");
    expect(page).toContain("Recent Matter Activity");
    expect(page).toContain("No recent matter activity");
    expect(page).toContain("relatedId");
    expect(page).toContain("/client/cases/${matterId}");
  });

  it("exposes Action Checklist from the My Matters rail without primary-nav changes", () => {
    expect(page).toContain("Action Checklist");
    expect(page).toContain('href="/client/checklist"');
    expect(page).toContain("View Checklist");
    expect(page).toContain("useTasks");
    expect(page).toContain("clientVisible");
    expect(page).toContain("!task.archivedAt");
    expect(page).toContain("!task.parentTaskId");
    expect(page).toContain("isTaskOverdue");
    expect(page).toContain("openChecklistActions");
    expect(page).toContain("No open actions");
    expect(page).not.toContain("useTaskCommands");
    expect(page).not.toMatch(/type=\"checkbox\"/);
    expect(css).toContain("client-matters-checklist");
  });

  it("keeps Home and CUI-06 CSS isolated", () => {
    expect(page).toContain('className: "client-matters"');
    expect(css).toContain(".dashboard-theme.dashboard-client.client-matters");
    expect(css).toContain('.client-home[data-slot="portal-page-shell"]');
    expect(home).toContain('className: "client-home"');
    expect(home).toContain('title="Your Matters"');
    expect(home).toContain("We&apos;re Here for You");
    expect(page).not.toContain("client-home");
  });
});
