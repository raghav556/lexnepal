import { z } from "zod";

export const uuidSchema = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

export const documentTypeSchema = z.enum([
  "pleading",
  "affidavit",
  "contract",
  "poa",
  "correspondence",
  "evidence",
  "template",
  "court_filing",
  "notice",
  "memo",
  "other",
]);

export const confidentialitySchema = z.enum(["public", "internal", "confidential", "privileged"]);

export const documentListSchema = z.object({
  caseId: uuidSchema.optional(),
  isTemplate: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  inTrash: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});

export const documentSearchSchema = z.object({
  query: z.string().trim().min(1).max(200),
  caseId: uuidSchema.optional(),
  type: documentTypeSchema.optional(),
  tag: optionalText(100),
  generalOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});

export const documentRecentSchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(5),
});

export const documentUpdateSchema = z.object({
  title: optionalText(500),
  description: optionalText(10_000),
  type: documentTypeSchema.optional(),
  isPrivileged: z.boolean().optional(),
  confidentialityLevel: confidentialitySchema.optional(),
  isOnLegalHold: z.boolean().optional(),
  legalHoldReason: optionalText(2000),
  retentionPolicy: optionalText(200),
  deletedAt: z.union([z.string().datetime(), z.null()]).optional(),
});

export const documentShareCreateSchema = z.object({
  expiresAt: z.string().datetime().optional().nullable(),
  password: optionalText(200),
  allowDownload: z.boolean().optional(),
  maxDownloads: z.number().int().min(1).max(10_000).optional().nullable(),
});

export const publicDocumentShareSchema = z.object({
  token: z.string().trim().min(8).max(128),
  password: optionalText(200),
});

export const documentUploadIntentSchema = z.object({
  fileName: z.string().trim().min(1).max(240),
  mimeType: z.string().trim().min(1).max(160),
  sizeBytes: z.number().int().positive(),
  sha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/i)
    .optional(),
  caseId: uuidSchema.optional(),
  parentDocumentId: uuidSchema.optional(),
});

export type DocumentListInput = z.infer<typeof documentListSchema>;
export type DocumentSearchInput = z.infer<typeof documentSearchSchema>;
export type DocumentUpdateInput = z.infer<typeof documentUpdateSchema>;
export type DocumentShareCreateInput = z.infer<typeof documentShareCreateSchema>;
