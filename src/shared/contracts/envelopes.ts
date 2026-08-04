import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const envelopeRoutingSchema = z.enum(["sequential", "parallel"]);
export const signatureMethodSchema = z.enum(["draw", "type", "upload"]);

export const envelopeCreateSchema = z.object({
  documentId: uuidSchema,
  title: z.string().trim().min(1).max(500).optional(),
  routing: envelopeRoutingSchema,
  expiresAt: z.string().datetime().optional().nullable(),
  recipientUserIds: z.array(uuidSchema).min(1).max(50),
});

export const envelopeVoidSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});

export const envelopeDeclineSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});

export const envelopeOtpIssueSchema = z.object({
  documentId: uuidSchema,
  envelopeId: uuidSchema.optional(),
});

export const envelopeOtpVerifySchema = z.object({
  challengeId: uuidSchema,
  code: z.string().trim().min(4).max(12),
});

export const documentSignSchema = z.object({
  documentId: uuidSchema,
  signatureMethod: signatureMethodSchema,
  signatureArtifactStorageId: z.string().trim().min(1).max(500).optional(),
  typedSignatureText: z.string().trim().min(1).max(500).optional(),
  consentAccepted: z.boolean(),
  documentSha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/i),
  userAgent: z.string().trim().max(1000).optional(),
  signatureNote: z.string().trim().max(2000).optional(),
  otpChallengeId: uuidSchema,
  envelopeId: uuidSchema.optional(),
});

export const documentMarkViewedSchema = z.object({
  documentId: uuidSchema,
});

export const documentRequestSignatureSchema = z.object({
  documentId: uuidSchema,
  intendedSignerUserId: uuidSchema.optional(),
});

export type EnvelopeCreateInput = z.infer<typeof envelopeCreateSchema>;
export type EnvelopeVoidInput = z.infer<typeof envelopeVoidSchema>;
export type EnvelopeDeclineInput = z.infer<typeof envelopeDeclineSchema>;
export type EnvelopeOtpIssueInput = z.infer<typeof envelopeOtpIssueSchema>;
export type EnvelopeOtpVerifyInput = z.infer<typeof envelopeOtpVerifySchema>;
export type DocumentSignInput = z.infer<typeof documentSignSchema>;
export type DocumentMarkViewedInput = z.infer<typeof documentMarkViewedSchema>;
export type DocumentRequestSignatureInput = z.infer<typeof documentRequestSignatureSchema>;
