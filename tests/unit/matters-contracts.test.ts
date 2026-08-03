import { describe, expect, it } from "vitest";
import {
  caseCreateSchema,
  clientCreateSchema,
  conflictSearchSchema,
  kycReviewSchema,
  kycSubmitSchema,
  kycUploadIntentSchema,
} from "../../src/shared/contracts/matters";

describe("matters contracts", () => {
  it("requires corporate identity details", () => {
    expect(
      clientCreateSchema.safeParse({ type: "corporate", fullName: "Acme", companyName: "" })
        .success,
    ).toBe(false);
    expect(
      clientCreateSchema.safeParse({
        type: "corporate",
        fullName: "Acme",
        companyName: "Acme Pvt Ltd",
      }).success,
    ).toBe(true);
  });
  it("restricts KYC upload formats and sizes", () => {
    const base = {
      fileName: "id.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      documentType: "government_id",
    } as const;
    expect(kycUploadIntentSchema.safeParse(base).success).toBe(true);
    expect(kycUploadIntentSchema.safeParse({ ...base, mimeType: "text/html" }).success).toBe(false);
    expect(kycUploadIntentSchema.safeParse({ ...base, sizeBytes: 30 * 1024 * 1024 }).success).toBe(
      false,
    );
  });
  it("requires both a real consent value and at least two scanned intent references", () => {
    const ids = ["10000000-0000-4000-8000-000000000001", "10000000-0000-4000-8000-000000000002"];
    expect(
      kycSubmitSchema.safeParse({
        uploadIntentIds: ids,
        address: "Kathmandu",
        idNumber: "ID-1",
        consentAccepted: true,
      }).success,
    ).toBe(true);
    expect(
      kycSubmitSchema.safeParse({
        uploadIntentIds: ids.slice(0, 1),
        address: "Kathmandu",
        idNumber: "ID-1",
        consentAccepted: true,
      }).success,
    ).toBe(false);
  });
  it("requires a KYC rejection reason", () => {
    expect(kycReviewSchema.safeParse({ decision: "rejected" }).success).toBe(false);
    expect(
      kycReviewSchema.safeParse({ decision: "rejected", rejectionReason: "Unreadable ID" }).success,
    ).toBe(true);
  });
  it("validates complete case relationships and bounded conflict queries", () => {
    expect(
      caseCreateSchema.safeParse({
        caseNumber: "CASE-1",
        title: "Matter",
        practiceArea: "Civil",
        clientId: "20000000-0000-4000-8000-000000000001",
        assignedLawyerId: "10000000-0000-4000-8000-000000000001",
        teamMemberIds: [],
      }).success,
    ).toBe(true);
    expect(conflictSearchSchema.safeParse({ query: "a" }).success).toBe(false);
  });
});
