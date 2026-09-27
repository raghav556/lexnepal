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
  // Storage keys are never client authority. Drawn/uploaded signatures are
  // referenced by a signer- and document-bound upload intent instead.
  signatureArtifactIntentId: uuidSchema.optional(),
  typedSignatureText: z.string().trim().min(1).max(500).optional(),
  consentAccepted: z.boolean(),
  userAgent: z.string().trim().max(1000).optional(),
  signatureNote: z.string().trim().max(2000).optional(),
  otpChallengeId: uuidSchema,
  envelopeId: uuidSchema.optional(),
});

export const signatureArtifactIntentSchema = z.object({
  documentId: uuidSchema,
  envelopeId: uuidSchema.optional(),
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.enum(["image/png", "image/jpeg"]),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024),
  sha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/i)
    .optional(),
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
export type SignatureArtifactIntentInput = z.infer<typeof signatureArtifactIntentSchema>;
export type DocumentMarkViewedInput = z.infer<typeof documentMarkViewedSchema>;
export type DocumentRequestSignatureInput = z.infer<typeof documentRequestSignatureSchema>;
