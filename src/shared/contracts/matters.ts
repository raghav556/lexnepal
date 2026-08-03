import { z } from "zod";

export const uuidSchema = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();
const optionalEmail = z
  .union([z.string().trim().email().max(320), z.literal("")])
  .optional()
  .nullable();

export const clientTypeSchema = z.enum(["individual", "corporate"]);
export const kycStatusSchema = z.enum(["pending", "submitted", "verified", "rejected"]);
export const caseStatusSchema = z.enum([
  "inquiry",
  "active",
  "on_hold",
  "closed_won",
  "closed_lost",
]);
export const kycDocumentTypeSchema = z.enum(["government_id", "proof_of_address", "other"]);

const clientCreateBaseSchema = z.object({
  type: clientTypeSchema,
  fullName: z.string().trim().min(1).max(250),
  email: optionalEmail,
  phone: optionalText(50),
  address: optionalText(2_000),
  companyName: optionalText(250),
  registrationNumber: optionalText(150),
  notes: optionalText(10_000),
  userId: uuidSchema.optional().nullable(),
});

export const clientCreateSchema = clientCreateBaseSchema.refine(
  (value) => value.type === "individual" || Boolean(value.companyName?.trim()),
  {
    message: "Corporate clients require a company name",
    path: ["companyName"],
  },
);

export const clientStaffUpdateSchema = clientCreateBaseSchema
  .omit({ type: true })
  .partial()
  .extend({ type: clientTypeSchema.optional(), isActive: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const clientSelfUpdateSchema = z
  .object({ phone: optionalText(50), address: optionalText(2_000) })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const kycUploadIntentSchema = z.object({
  fileName: z.string().trim().min(1).max(240),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
  sha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/i)
    .optional(),
  documentType: kycDocumentTypeSchema,
});

export const kycSubmitSchema = z.object({
  uploadIntentIds: z.array(uuidSchema).min(2).max(10),
  address: z.string().trim().min(1).max(2_000),
  idNumber: z.string().trim().min(1).max(200),
  consentAccepted: z.literal(true),
});

export const kycReviewSchema = z
  .object({ decision: z.enum(["verified", "rejected"]), rejectionReason: optionalText(2_000) })
  .refine((value) => value.decision !== "rejected" || Boolean(value.rejectionReason?.trim()), {
    message: "A rejection reason is required",
    path: ["rejectionReason"],
  });

export const caseCreateSchema = z.object({
  caseNumber: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(300),
  description: optionalText(50_000),
  practiceArea: z.string().trim().min(1).max(200),
  clientId: uuidSchema,
  assignedLawyerId: uuidSchema,
  teamMemberIds: z.array(uuidSchema).max(100).default([]),
  court: optionalText(300),
  judge: optionalText(250),
  opposingCounsel: optionalText(500),
  filingDate: z.string().date().optional().nullable(),
});

export const caseUpdateSchema = caseCreateSchema
  .omit({
    caseNumber: true,
    clientId: true,
    practiceArea: true,
    teamMemberIds: true,
    assignedLawyerId: true,
  })
  .partial()
  .extend({
    status: caseStatusSchema.optional(),
    assignedLawyerId: uuidSchema.optional(),
    teamMemberIds: z.array(uuidSchema).max(100).optional(),
    closedDate: z.string().date().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const caseListSchema = z.object({
  status: caseStatusSchema.optional(),
  clientId: uuidSchema.optional(),
  lawyerId: uuidSchema.optional(),
});

export const conflictSearchSchema = z.object({ query: z.string().trim().min(2).max(250) });
export const conflictDecisionSchema = z.object({
  status: z.enum(["cleared", "conflict"]),
  notes: optionalText(5_000),
});
export const caseConflictDecisionSchema = z.object({
  cleared: z.boolean(),
  notes: optionalText(5_000),
});

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type ClientStaffUpdateInput = z.infer<typeof clientStaffUpdateSchema>;
export type KycSubmitInput = z.infer<typeof kycSubmitSchema>;
export type KycReviewInput = z.infer<typeof kycReviewSchema>;
export type CaseCreateInput = z.infer<typeof caseCreateSchema>;
export type CaseUpdateInput = z.infer<typeof caseUpdateSchema>;
export type CaseListInput = z.infer<typeof caseListSchema>;
