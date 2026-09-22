/**
 * CUI-08 Client Hearings & Court Diary composition contract.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/views/client/ClientHearingsPage.tsx", "utf8");
const css = readFileSync("src/index.css", "utf8");
const nav = readFileSync("src/lib/client-shell-nav.ts", "utf8");
const home = readFileSync("src/views/client/ClientDashboard.tsx", "utf8");
const matters = readFileSync("src/views/client/ClientCasesPage.tsx", "utf8");
const detail = readFileSync("src/views/client/ClientCaseDetailPage.tsx", "utf8");
const staffHearings = readFileSync("src/views/staff/StaffHearingsPage.tsx", "utf8");

describe("CUI-08 client hearings contract", () => {
  it("uses Hearing Schedule vocabulary and My Matters navigation context", () => {
    expect(page).toContain('title: "Hearing Schedule"');
    expect(page).toContain("Upcoming");
    expect(page).toContain("Past");
    expect(page).toContain("All");
    expect(page).toContain("Filter by Matter");
    expect(page).toContain("Search hearings");
    expect(page).toContain("Next Hearing");
    expect(page).toContain('className: "client-hearings"');
    expect(page).toContain("`/client/cases/${");
    expect(page).toContain("`/client/messages?caseId=");
    expect(page).toContain('href="/client/checklist"');
    expect(nav).toContain('if (matchesPath(path, "/client/hearings")) return "my-matters"');
    expect(nav).not.toMatch(/hearings\"\) return \"appointments/);
    expect(page).toContain("Past Hearings");
    expect(css).toContain("client-hearings-toolbar");
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toContain("client-hearings-next-actions");
    expect(css).toContain("client-hearings-msg-short");
  });

  it("keeps real hearing queries and Client-safe calendar helper", () => {
    expect(page).toContain("useHearings");
    expect(page).toContain("useClientCases");
    expect(page).toContain("useTasks");
    expect(page).toContain("downloadHearingIcs");
    expect(page).toContain('status === "scheduled"');
    expect(page).toContain("clientVisible");
    expect(page).not.toContain("useCases(");
    expect(page).not.toContain("useHearingCommands");
    expect(page).not.toContain("Create Hearing");
    expect(page).not.toContain("Edit Hearing");
  });

  it("does not invent room, judge, or fake preparation guidance", () => {
    expect(page).not.toContain("Room No");
    expect(page).not.toContain("court room");
    expect(page).not.toContain("Bring original");
    expect(page).not.toContain("arrive 30");
    expect(page).not.toContain("opposingCounsel");
    expect(page).not.toMatch(/\bjudge\b/);
    expect(page).not.toContain("Tentative");
    expect(css).toContain(
      '.dashboard-theme.dashboard-client.client-hearings[data-slot="portal-page-shell"]',
    );
  });

  it("keeps CUI-05/06/07 and Staff hearings sources untouched by this phase", () => {
    expect(home).toContain('className: "client-home"');
    expect(matters).toContain('title: "My Matters"');
    expect(detail).toContain('className="client-matter-detail"');
    expect(page).not.toContain("client-home");
    expect(page).not.toContain("client-matters");
    expect(page).not.toContain("client-matter-detail");
    expect(staffHearings).toContain("useHearingCommands");
    expect(css).toContain(
      '.dashboard-theme.dashboard-client.client-home[data-slot="portal-page-shell"]',
    );
    expect(css).toContain(
      '.dashboard-theme.dashboard-client.client-matters[data-slot="portal-page-shell"]',
    );
    expect(css).toContain(
      '.dashboard-theme.dashboard-client.client-matter-detail[data-slot="portal-page-shell"]',
    );
  });
});
