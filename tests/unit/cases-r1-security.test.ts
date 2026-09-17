import { describe, expect, it } from "vitest";
import {
  staffMayAccessHearing,
  staffMayAccessTask,
} from "@/shared/contracts/case-collection-scope";
import {
  CLIENT_CASE_FORBIDDEN_KEYS,
  CLIENT_CASE_KEYS,
  CLIENT_CRM_FORBIDDEN_KEYS,
  CLIENT_CRM_KEYS,
  toClientCaseDto,
  toClientCrmDto,
} from "@/shared/contracts/client-allowlists";
import { caseUpdateSchema, mapCaseUpdateNotes } from "@/shared/contracts/matters";

const staffCase = {
  id: "case-1",
  _id: "case-1",
  caseNumber: "E2E-PORTAL-001",
  title: "E2E Portal Matter",
  description: "INTERNAL staff notes — must never reach the client",
  notes: "CRM-style notes",
  practiceArea: "Corporate",
  status: "active",
  clientId: "client-1",
  assignedLawyerId: "lawyer-1",
  teamMemberIds: ["lawyer-1", "intern-2"],
  court: null,
  judge: "Hon. Secret",
  opposingCounsel: "Opposing LLP",
  filingDate: "2026-01-01",
  closedDate: null,
  client: { notes: "CRM notes leak" },
  lawyer: { id: "lawyer-1", name: "E2E Staff", email: "staff@example.invalid", salary: 1 },
};

const staffCrm = {
  id: "client-1",
  fullName: "E2E Client",
  type: "individual",
  email: "e2e-client@example.invalid",
  phone: "9800000000",
  address: "Kathmandu",
  companyName: null,
  registrationNumber: "REG-SECRET",
  kycStatus: "pending",
  kycIdNumber: "NID-SECRET",
  kycConsentVersion: "v1",
  kycRejectionReason: "Please resubmit a clearer ID photo",
  notes: "High-value client — do not show in portal",
  userId: "user-client",
  isActive: true,
};

describe("R1 Client Case allowlist DTO", () => {
  it("C-SEC-001: Client Case DTO is an allowlist without description or team roster", () => {
    const dto = toClientCaseDto(staffCase, {
      id: "lawyer-1",
      name: "E2E Staff",
      email: "staff@example.invalid",
    });
    expect(Object.keys(dto).sort()).toEqual([...CLIENT_CASE_KEYS].sort());
    expect(dto.clientSummary).toBeNull();
    expect(dto.court).toBeNull();
    expect(dto.advocate).toEqual({
      id: "lawyer-1",
      name: "E2E Staff",
      email: "staff@example.invalid",
    });
    for (const key of CLIENT_CASE_FORBIDDEN_KEYS) {
      expect(dto).not.toHaveProperty(key);
    }
    expect(JSON.stringify(dto)).not.toContain("INTERNAL");
    expect(JSON.stringify(dto)).not.toContain("Opposing LLP");
    expect(JSON.stringify(dto)).not.toContain("intern-2");
  });

  it("C-PARTY-VIS-001: Client Case DTO only includes allowlisted visible parties", () => {
    const leaked = toClientCaseDto({
      ...staffCase,
      parties: [{ name: "Hidden litigant", clientId: "other-client" }],
    });
    expect(leaked.parties).toEqual([]);
    expect(JSON.stringify(leaked)).not.toContain("Hidden litigant");
    expect(JSON.stringify(leaked)).not.toContain("other-client");
    const visible = toClientCaseDto(staffCase, null, [
      {
        id: "party-1",
        name: "Named litigant",
        side: "our_side",
        roleLabel: "Plaintiff",
        partyType: "person",
      },
    ]);
    expect(visible.parties).toEqual([
      {
        id: "party-1",
        name: "Named litigant",
        side: "our_side",
        roleLabel: "Plaintiff",
        partyType: "person",
      },
    ]);
    expect(JSON.stringify(visible.parties)).not.toContain("clientId");
  });
});

describe("R1 Client CRM allowlist DTO", () => {
  it("C-PERM-004: Client CRM DTO excludes notes, KYC id, and consent internals", () => {
    const dto = toClientCrmDto(staffCrm);
    expect(Object.keys(dto).sort()).toEqual([...CLIENT_CRM_KEYS].sort());
    expect(dto.kycStatus).toBe("pending");
    expect(dto.kycRejectionReason).toBe("Please resubmit a clearer ID photo");
    for (const key of CLIENT_CRM_FORBIDDEN_KEYS) {
      expect(dto).not.toHaveProperty(key);
    }
    expect(JSON.stringify(dto)).not.toContain("High-value");
    expect(JSON.stringify(dto)).not.toContain("NID-SECRET");
    expect(JSON.stringify(dto)).not.toContain("REG-SECRET");
  });
});

describe("R1 staff description save", () => {
  it("C-STAFF-001: notes-only PATCH maps onto description and drops notes", () => {
    expect(mapCaseUpdateNotes({ notes: "internal staff note" })).toEqual({
      description: "internal staff note",
    });
    const parsed = caseUpdateSchema.safeParse({ notes: "persisted via notes alias" });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).not.toHaveProperty("notes");
    expect(parsed.data.description).toBe("persisted via notes alias");
  });

  it("does not overwrite an explicit description with notes", () => {
    const parsed = caseUpdateSchema.safeParse({
      notes: "should be ignored",
      description: "staff description",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.description).toBe("staff description");
  });
});

describe("R1 hearing and task collection scope", () => {
  const accessible = new Set(["case-mine"]);

  it("C-PERM-001: intern without view_all cannot see another case's hearings", () => {
    expect(staffMayAccessHearing({ caseId: "case-mine" }, accessible)).toBe(true);
    expect(staffMayAccessHearing({ caseId: "case-other" }, accessible)).toBe(false);
  });

  it("C-PERM-002: case-team / lead sees case tasks; outsider does not", () => {
    expect(
      staffMayAccessTask(
        { assignedTo: "other", watchers: [], caseId: "case-mine" },
        "intern-1",
        accessible,
      ),
    ).toBe(true);
    expect(
      staffMayAccessTask(
        { assignedTo: "intern-1", watchers: [], caseId: "case-other" },
        "intern-1",
        accessible,
      ),
    ).toBe(true);
    expect(
      staffMayAccessTask(
        { assignedTo: "other", watchers: ["intern-1"], caseId: null },
        "intern-1",
        accessible,
      ),
    ).toBe(true);
    expect(
      staffMayAccessTask(
        { assignedTo: "other", watchers: [], caseId: "case-other" },
        "intern-1",
        accessible,
      ),
    ).toBe(false);
  });
});
