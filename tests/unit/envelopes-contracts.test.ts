import { describe, expect, it } from "vitest";
import {
  documentSignSchema,
  envelopeCreateSchema,
  envelopeDeclineSchema,
  envelopeOtpIssueSchema,
  envelopeOtpVerifySchema,
  envelopeVoidSchema,
} from "../../src/shared/contracts/envelopes";

const documentId = "123e4567-e89b-12d3-a456-426614174000";
const recipientId = "123e4567-e89b-12d3-a456-426614174001";
const challengeId = "123e4567-e89b-12d3-a456-426614174002";
const sha256 = "b".repeat(64);

describe("Envelopes input contracts", () => {
  it("validates envelope create routing and recipients", () => {
    expect(
      envelopeCreateSchema.safeParse({
        documentId,
        routing: "sequential",
        recipientUserIds: [recipientId],
        title: "Retainer signature",
      }).success,
    ).toBe(true);
    expect(
      envelopeCreateSchema.safeParse({
        documentId,
        routing: "round-robin",
        recipientUserIds: [recipientId],
      }).success,
    ).toBe(false);
    expect(
      envelopeCreateSchema.safeParse({
        documentId,
        routing: "parallel",
        recipientUserIds: [],
      }).success,
    ).toBe(false);
  });

  it("validates void and decline reasons", () => {
    expect(envelopeVoidSchema.safeParse({ reason: "Client withdrew" }).success).toBe(true);
    expect(envelopeVoidSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(envelopeDeclineSchema.safeParse({ reason: "Incorrect party" }).success).toBe(true);
    expect(envelopeDeclineSchema.safeParse({ reason: "   " }).success).toBe(false);
  });

  it("validates OTP issue and verify payloads", () => {
    expect(envelopeOtpIssueSchema.safeParse({ documentId }).success).toBe(true);
    expect(
      envelopeOtpIssueSchema.safeParse({ documentId, envelopeId: challengeId }).success,
    ).toBe(true);
    expect(envelopeOtpIssueSchema.safeParse({ documentId: "bad" }).success).toBe(false);

    expect(
      envelopeOtpVerifySchema.safeParse({ challengeId, code: "123456" }).success,
    ).toBe(true);
    expect(envelopeOtpVerifySchema.safeParse({ challengeId, code: "12" }).success).toBe(false);
    expect(
      envelopeOtpVerifySchema.safeParse({ challengeId, code: "x".repeat(13) }).success,
    ).toBe(false);
    expect(
      envelopeOtpVerifySchema.safeParse({ challengeId: "not-uuid", code: "123456" }).success,
    ).toBe(false);
  });

  it("requires non-empty reasons for void and decline lifecycle actions", () => {
    expect(envelopeVoidSchema.safeParse({ reason: "Cancelled by counsel" }).success).toBe(true);
    expect(envelopeDeclineSchema.safeParse({ reason: "Wrong party named" }).success).toBe(true);
    expect(envelopeVoidSchema.safeParse({}).success).toBe(false);
    expect(envelopeDeclineSchema.safeParse({ reason: "" }).success).toBe(false);
  });

  it("validates document sign consent, method, and sha256", () => {
    const valid = {
      documentId,
      signatureMethod: "type" as const,
      typedSignatureText: "Ada Lovelace",
      consentAccepted: true,
      documentSha256: sha256,
      otpChallengeId: challengeId,
    };
    expect(documentSignSchema.safeParse(valid).success).toBe(true);
    expect(documentSignSchema.safeParse({ ...valid, consentAccepted: false }).success).toBe(true);
    expect(
      documentSignSchema.safeParse({ ...valid, consentAccepted: undefined }).success,
    ).toBe(false);
    expect(
      documentSignSchema.safeParse({ ...valid, signatureMethod: "stamp" }).success,
    ).toBe(false);
    expect(
      documentSignSchema.safeParse({ ...valid, documentSha256: "deadbeef" }).success,
    ).toBe(false);
  });
});
