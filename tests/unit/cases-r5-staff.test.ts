/**
 * R5 Staff Cases workspace.
 *
 * Gate: no primary Staff Case control without a handler; Internal Case
 * Description and Client-visible Summary stay independent; parties default
 * hidden from the client; Responsible Lawyer stays on the Case Team.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { caseCreateSchema, casePartyCreateSchema } from "@/shared/contracts/matters";
import { syncCaseTeamMembers } from "@/shared/contracts/case-team-sync";
import { toClientCaseDto, toClientPartyDto } from "@/shared/contracts/client-allowlists";

const repoRoot = path.resolve(".");

function readSrc(...segments: string[]): string {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

describe("R5 Staff Cases workspace", () => {
  it("C-STAFF-001: detail and create keep Internal Case Description vs Client-visible Summary", () => {
    const detail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    const create = readSrc("src/components/cases/case-create-dialog.tsx");
    for (const source of [detail, create]) {
      expect(source).toMatch(/Internal Case Description/);
      expect(source).toMatch(/Client-visible Summary/);
      expect(source).not.toMatch(/Notes \/ Description/);
      expect(source).not.toMatch(/Description \/ Notes/);
    }
    expect(detail).toMatch(/description:\s*description/);
    expect(detail).toMatch(/clientSummary:\s*clientSummary/);
    expect(detail).not.toMatch(/description:\s*notes/);
  });

  it("C-STAFF-012 / C-STAFF-008: overview is the default tab and Hearings is present", () => {
    const detail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    expect(detail).toMatch(/value="overview"/);
    expect(detail).toMatch(/value="hearings"/);
    expect(detail).toMatch(/: "overview"/);
    expect(detail).not.toMatch(/tabFromQuery === "messages" \? "messages" : "tasks"/);
    expect(detail).toMatch(/Next hearing/);
    expect(detail).toMatch(/Next task date/);
    expect(detail).toMatch(/CaseHearingDialog/);
    expect(detail).not.toMatch(/href="\/staff\/hearings"/);
  });

  it("C-STAFF-013: Client is not labelled Retainer", () => {
    const detail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    expect(detail).toMatch(/label: "Client"/);
    expect(detail).not.toMatch(/Client \/ Retainer/);
  });

  it("C-STAFF-003: status board is labelled By status, not a drag-drop Kanban product", () => {
    const workspace = readSrc("src/components/cases/cases-workspace.tsx");
    expect(workspace).toMatch(/>\s*By status\s*</);
    expect(workspace).not.toMatch(/Kanban Board/);
    expect(workspace).not.toMatch(/onDragStart/);
    expect(workspace).not.toMatch(/dnd-kit/);
  });

  it("C-STAFF-016: create accepts optional status and defaults to active in the repository", () => {
    const withoutStatus = caseCreateSchema.safeParse({
      caseNumber: "CASE-1",
      title: "Matter",
      practiceArea: "Civil",
      clientId: "20000000-0000-4000-8000-000000000001",
      assignedLawyerId: "10000000-0000-4000-8000-000000000001",
      teamMemberIds: [],
    });
    expect(withoutStatus.success).toBe(true);
    const inquiry = caseCreateSchema.safeParse({
      caseNumber: "CASE-1",
      title: "Matter",
      practiceArea: "Civil",
      clientId: "20000000-0000-4000-8000-000000000001",
      assignedLawyerId: "10000000-0000-4000-8000-000000000001",
      teamMemberIds: [],
      status: "inquiry",
    });
    expect(inquiry.success).toBe(true);
    const create = readSrc("src/components/cases/case-create-dialog.tsx");
    expect(create).toMatch(/caseStatusWritePayload\(form\.status\)/);
    expect(create).toMatch(/status: statusWrite\.status/);
    expect(create).toMatch(/status: "active"/);
    const repository = readSrc("src/server/repositories/matters-repository.ts");
    expect(repository).toMatch(/status \?\? "active"/);
    expect(repository).not.toMatch(/status: "active" \)/);
  });

  it("C-STAFF-009 / C-TEAM-001: Responsible Lawyer vs Case Team; lead change keeps previous lead", () => {
    const create = readSrc("src/components/cases/case-create-dialog.tsx");
    const detail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    const team = readSrc("src/components/cases/case-team-fields.tsx");
    expect(create).toMatch(/CaseTeamFields/);
    expect(detail).toMatch(/CaseTeamFields/);
    expect(team).toMatch(/Responsible Lawyer/);
    expect(team).toMatch(/Case Team/);
    expect(team).toMatch(/Reassign the Responsible Lawyer before removing them from the Case Team/);
    const kept = syncCaseTeamMembers({
      currentLeadId: "lead-1",
      nextLeadId: "lead-2",
      existingTeamIds: ["lead-1"],
    });
    expect(kept).toEqual({
      ok: true,
      teamMemberIds: expect.arrayContaining(["lead-1", "lead-2"]),
    });
  });

  it("C-STAFF-006 / C-PARTY-VIS-001: parties editor with visibility default false, no CRM auto-insert", () => {
    const editor = readSrc("src/components/cases/case-parties-editor.tsx");
    const detail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    const queries = readSrc("src/client/queries/cases.ts");
    expect(detail).toMatch(/CasePartiesEditor/);
    expect(detail).not.toMatch(/Edit Opposing/);
    expect(editor).toMatch(/Visible to client/);
    expect(editor).toMatch(/clientVisible:\s*false/);
    expect(editor).toMatch(/useCasePartyCommands/);
    expect(queries).toMatch(/\/api\/v1\/cases\/\$\{caseId\}\/parties/);
    expect(casePartyCreateSchema.shape.clientVisible.isOptional()).toBe(true);
    const hidden = toClientPartyDto({
      id: "p-1",
      name: "Opposing Ltd",
      side: "opposing",
      partyType: "organisation",
      clientVisible: false,
    });
    expect(hidden).not.toHaveProperty("clientVisible");
    expect(readSrc("src/server/repositories/matters-repository.ts")).toMatch(
      /eq\(caseParties\.clientVisible, true\)/,
    );
    const clientCase = toClientCaseDto(
      { id: "case-1", title: "Matter", caseNumber: "C-1", status: "active", practiceArea: "Civil" },
      null,
      [],
    );
    expect(clientCase.parties).toEqual([]);
  });

  it("C-STAFF-007: Misl groups by documents.type and View/Upload have handlers", () => {
    const detail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    expect(detail).toMatch(/mislBinderForType/);
    expect(detail).toMatch(/CaseMislUploadDialog/);
    expect(detail).toMatch(/downloadDocument/);
    expect(detail).not.toMatch(/href="\/staff\/documents"/);
    expect(detail).not.toMatch(/d\.type\?\.includes\("PDF"\)/);
  });

  it("keeps the Client vs Case Team message split and does not add admin to STAFF_ROLES", () => {
    const detail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    expect(detail).toMatch(/setMessageStream\("client"\)/);
    expect(detail).toMatch(/setMessageStream\("team"\)/);
    expect(detail).toMatch(/Case Team/);
    const roles = readSrc("src/hooks/use-current-user.ts");
    expect(roles).not.toMatch(/STAFF_ROLES: UserRole\[] = \[[^\]]*admin/);
  });
});
