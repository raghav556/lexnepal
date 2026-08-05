import { describe, expect, it } from "vitest";
import {
  documentListSchema,
  documentRecentSchema,
  documentSearchSchema,
  documentShareCreateSchema,
  documentUpdateSchema,
  documentUploadIntentSchema,
  publicDocumentShareSchema,
} from "../../src/shared/contracts/documents";

const caseId = "123e4567-e89b-12d3-a456-426614174000";
const sha256 = "a".repeat(64);

describe("Documents input contracts", () => {
  it("validates list filters and boolean string transforms", () => {
    const parsed = documentListSchema.safeParse({
      caseId,
      isTemplate: "true",
      inTrash: "false",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isTemplate).toBe(true);
      expect(parsed.data.inTrash).toBe(false);
    }
    expect(documentListSchema.safeParse({ caseId: "not-a-uuid" }).success).toBe(false);
    expect(documentListSchema.safeParse({ isTemplate: "yes" }).success).toBe(false);
  });

  it("validates search query bounds and type enum", () => {
    expect(
      documentSearchSchema.safeParse({
        query: "petition",
        type: "pleading",
        caseId,
      }).success,
    ).toBe(true);
    expect(documentSearchSchema.safeParse({ query: "" }).success).toBe(false);
    expect(
      documentSearchSchema.safeParse({ query: "x", type: "not-a-type" }).success,
    ).toBe(false);
  });

  it("validates recent limit max and default", () => {
    const withDefault = documentRecentSchema.safeParse({});
    expect(withDefault.success).toBe(true);
    if (withDefault.success) expect(withDefault.data.limit).toBe(5);

    expect(documentRecentSchema.safeParse({ limit: "10" }).success).toBe(true);
    expect(documentRecentSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(documentRecentSchema.safeParse({ limit: 51 }).success).toBe(false);
  });

  it("validates update enums and deletedAt datetime", () => {
    expect(
      documentUpdateSchema.safeParse({
        title: "Amended pleading",
        type: "court_filing",
        confidentialityLevel: "confidential",
        deletedAt: "2026-08-05T12:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(documentUpdateSchema.safeParse({ deletedAt: null }).success).toBe(true);
    expect(documentUpdateSchema.safeParse({ type: "bogus" }).success).toBe(false);
    expect(documentUpdateSchema.safeParse({ deletedAt: "2026-08-05" }).success).toBe(false);
  });

  it("validates share create and public token access", () => {
    expect(
      documentShareCreateSchema.safeParse({
        allowDownload: true,
        maxDownloads: 5,
        expiresAt: "2026-09-01T00:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(documentShareCreateSchema.safeParse({ maxDownloads: 0 }).success).toBe(false);

    expect(
      publicDocumentShareSchema.safeParse({ token: "abcdefgh", password: "secret" }).success,
    ).toBe(true);
    expect(publicDocumentShareSchema.safeParse({ token: "short" }).success).toBe(false);
  });

  it("validates upload intent size and sha256", () => {
    expect(
      documentUploadIntentSchema.safeParse({
        fileName: "brief.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        sha256,
        caseId,
      }).success,
    ).toBe(true);
    expect(
      documentUploadIntentSchema.safeParse({
        fileName: "brief.pdf",
        mimeType: "application/pdf",
        sizeBytes: 0,
      }).success,
    ).toBe(false);
    expect(
      documentUploadIntentSchema.safeParse({
        fileName: "brief.pdf",
        mimeType: "application/pdf",
        sizeBytes: 50 * 1024 * 1024 + 1,
      }).success,
    ).toBe(false);
    expect(
      documentUploadIntentSchema.safeParse({
        fileName: "brief.pdf",
        mimeType: "application/pdf",
        sizeBytes: 10,
        sha256: "not-a-hash",
      }).success,
    ).toBe(false);
  });
});
