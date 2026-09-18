import { describe, expect, it } from "vitest";
import {
  UI_PREVIEW_CASES,
  UI_PREVIEW_DOCUMENTS,
  UI_PREVIEW_EXPECTED_COUNTS,
  UI_PREVIEW_LEGACY,
  UI_PREVIEW_NOW,
  UI_PREVIEW_SMOKE_CASE_NUMBER,
} from "../../scripts/e2e/client-ui-preview-contract";
import { E2E_USERS, UI_PREVIEW_CLIENT, e2ePasswordFor } from "../../scripts/e2e/fixtures";

describe("CUI-01 client UI-preview fixture contract", () => {
  it("keeps the preview identity out of the smoke E2E_USERS map", () => {
    const smokeEmails = Object.values(E2E_USERS).map((user) => user.email);
    expect(smokeEmails).toContain(E2E_USERS.client.email);
    expect(smokeEmails).not.toContain(UI_PREVIEW_CLIENT.email);
    expect(UI_PREVIEW_CLIENT.email).toMatch(/@example\.invalid$/);
    expect(E2E_USERS.client.name).toBe("Sarita Ray");
    expect(UI_PREVIEW_CLIENT.name).toBe("Ravi Sharma");
  });

  it("does not reuse smoke matter or document numbers", () => {
    const caseNumbers = Object.values(UI_PREVIEW_CASES).map((item) => item.caseNumber);
    const documentNumbers = Object.values(UI_PREVIEW_DOCUMENTS).map((item) => item.documentNumber);
    expect(caseNumbers).not.toContain(UI_PREVIEW_SMOKE_CASE_NUMBER);
    expect(caseNumbers.every((value) => value.startsWith("CUI1-"))).toBe(true);
    expect(documentNumbers.every((value) => value.startsWith("CUI1-"))).toBe(true);
    expect(new Set(caseNumbers).size).toBe(caseNumbers.length);
    expect(new Set(documentNumbers).size).toBe(documentNumbers.length);
  });

  it("uses unique legacy keys and a frozen preview clock", () => {
    const keys = Object.values(UI_PREVIEW_LEGACY);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every((value) => value.startsWith("cui1:"))).toBe(true);
    expect(UI_PREVIEW_NOW.toISOString()).toBe("2026-09-18T05:30:00.000Z");
  });

  it("covers the required preview entity counts", () => {
    expect(UI_PREVIEW_EXPECTED_COUNTS).toEqual({
      clients: 1,
      cases: 4,
      teamLinks: 4,
      hearings: 5,
      tasks: 4,
      documents: 6,
      messages: 4,
      appointments: 4,
      kycFiles: 2,
      envelopes: 2,
      notifications: 6,
    });
  });

  it("resolves the preview password without changing smoke lookup", () => {
    expect(e2ePasswordFor(E2E_USERS.client.email)).toBe(E2E_USERS.client.password);
    expect(e2ePasswordFor(UI_PREVIEW_CLIENT.email)).toBe(UI_PREVIEW_CLIENT.password);
  });
});
