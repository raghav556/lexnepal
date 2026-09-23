/**
 * CUI-09 Client Action Checklist composition contract.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/views/client/ClientChecklistPage.tsx", "utf8");
const css = readFileSync("src/index.css", "utf8");
const nav = readFileSync("src/lib/client-shell-nav.ts", "utf8");
const home = readFileSync("src/views/client/ClientDashboard.tsx", "utf8");
const matters = readFileSync("src/views/client/ClientCasesPage.tsx", "utf8");
const detail = readFileSync("src/views/client/ClientCaseDetailPage.tsx", "utf8");
const hearings = readFileSync("src/views/client/ClientHearingsPage.tsx", "utf8");
const taskConstants = readFileSync("src/lib/task-constants.ts", "utf8");

describe("CUI-09 client checklist contract", () => {
  it("keeps Action Checklist vocabulary and My Matters navigation context", () => {
    expect(page).toContain('title: "Action Checklist"');
    expect(page).toContain("All");
    expect(page).toContain("Overdue");
    expect(page).toContain("Due Soon");
    expect(page).toContain("Upcoming");
    expect(page).toContain("Completed");
    expect(page).toContain('className: "client-checklist"');
    expect(page).toContain("`/client/cases/${");
    expect(page).toContain("`/client/messages?caseId=");
    expect(page).toContain('href="/client/cases"');
    expect(page).toContain('href="/client/messages"');
    expect(nav).toContain('if (matchesPath(path, "/client/checklist")) return "my-matters"');
    expect(nav).not.toMatch(/checklist\"\) return \"appointments/);
    expect(css).toContain("client-checklist-progress-fill");
    expect(css).toContain("client-checklist-toolbar");
  });

  it("preserves clientVisible filtering and read-only architecture", () => {
    expect(page).toContain("useTasks");
    expect(page).toContain("useClientCases");
    expect(page).toContain("task.clientVisible");
    expect(page).toContain("!task.archivedAt");
    expect(page).toContain("!task.parentTaskId");
    expect(page).toContain("caseIds.has(task.caseId)");
    expect(page).toContain("Clients cannot mutate tasks");
    expect(page).not.toContain("useTaskCommands");
    expect(page).not.toMatch(/Mark Complete|onCheckedChange|type=\"checkbox\"/);
    expect(page).not.toMatch(/Upload Document|Book Appointment|Review & Sign/);
  });

  it("derives presentation buckets without inventing persisted statuses", () => {
    expect(page).toContain("isTaskOverdue");
    expect(page).toContain("presentationBucket");
    expect(page).toContain('task.status === "done"');
    expect(page).toContain("addDaysIso(today, 7)");
    expect(page).toContain("No due date");
    expect(taskConstants).toContain('todo: "To Do"');
    expect(taskConstants).toContain('done: "Done"');
    expect(taskConstants).toContain('cancelled: "Cancelled"');
    expect(page).not.toMatch(/status:\s*[\"']overdue[\"']/);
    expect(page).not.toMatch(/status:\s*[\"']due_soon[\"']/);
  });

  it("keeps My Matters discoverability without permanent Checklist nav", () => {
    const mattersPage = readFileSync("src/views/client/ClientCasesPage.tsx", "utf8");
    expect(mattersPage).toContain('href="/client/checklist"');
    expect(mattersPage).toContain("Action Checklist");
    expect(mattersPage).toContain("View Checklist");
    expect(mattersPage).toContain("clientVisible");
    expect(mattersPage).toContain("!task.archivedAt");
    expect(mattersPage).toContain("!task.parentTaskId");
    expect(nav).toContain('if (matchesPath(path, "/client/checklist")) return "my-matters"');
    expect(nav).not.toContain('| "checklist"');
    expect(nav).not.toContain('id: "checklist"');
    expect(nav).toContain(
      'export type ClientMobileNavId = "home" | "matters" | "documents" | "messages" | "more"',
    );
  });

  it("uses solid progress fill and freezes prior Client phases", () => {
    expect(page).toContain("client-checklist-progress-fill");
    expect(page).not.toContain("bg-gradient-to-r");
    expect(css).toContain(".client-checklist-progress-fill");
    expect(css).not.toMatch(/\.client-checklist[\s\S]*gradient/);
    expect(home).toContain("ClientDashboard");
    expect(matters).toContain("ClientCasesPage");
    expect(detail).toContain("ClientCaseDetailPage");
    expect(hearings).toContain("Hearing Schedule");
    expect(css).toContain(".client-hearings");
    expect(css).toContain(".client-matter-detail");
  });
});
