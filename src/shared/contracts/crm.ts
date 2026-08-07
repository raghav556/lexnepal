import { z } from "zod";

export const uuidSchema = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

export const leadSourceSchema = z.enum([
  "website",
  "referral",
  "walk_in",
  "phone",
  "social",
  "newsletter",
]);
export const leadStatusSchema = z.enum([
  "new",
  "contacted",
  "consultation_scheduled",
  "converted",
  "lost",
]);
export const appointmentStatusSchema = z.enum([
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);
export const clientTypeSchema = z.enum(["individual", "corporate"]);

export const leadListSchema = z.object({
  status: leadStatusSchema.optional(),
  assignedTo: uuidSchema.optional(),
  source: leadSourceSchema.optional(),
  q: z.string().trim().max(200).optional(),
});

export const leadCreateSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: optionalText(320),
  phone: optionalText(40),
  practiceAreaInterest: optionalText(200),
  message: optionalText(10_000),
  source: leadSourceSchema.default("website"),
  assignedTo: uuidSchema.optional().nullable(),
  notes: optionalText(10_000),
  resourceId: uuidSchema.optional().nullable(),
});

/** Stricter payload for /contact → public leads (actionable CRM rows). */
export const publicContactLeadSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(9).max(40),
  message: z.string().trim().min(10).max(10_000),
  practiceAreaInterest: optionalText(200),
  source: z.literal("website").default("website"),
});

export const leadUpdateSchema = z.object({
  status: leadStatusSchema.optional(),
  assignedTo: uuidSchema.optional().nullable(),
  notes: optionalText(10_000),
});

export const leadConvertSchema = z.object({
  type: clientTypeSchema.default("individual"),
  companyName: optionalText(200),
});

export const intakeSubmitSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(40),
  email: optionalText(320),
  address: optionalText(500),
  citizenshipNo: optionalText(100),
  practiceArea: optionalText(200),
  caseDescription: optionalText(10_000),
  documentStorageIds: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
});

export const appointmentListSchema = z.object({
  status: appointmentStatusSchema.optional(),
  assignedLawyerId: uuidSchema.optional(),
  leadId: uuidSchema.optional(),
  /** Staff/admin filter; clients never control this — service forces their linked client. */
  clientId: uuidSchema.optional(),
});

export const appointmentSlotsSchema = z.object({
  date: z.string().date(),
  assignedLawyerId: uuidSchema.optional(),
});

export const appointmentCreateSchema = z.object({
  clientName: z.string().trim().min(1).max(200),
  clientEmail: optionalText(320),
  clientPhone: z.string().trim().min(1).max(40),
  clientId: uuidSchema.optional().nullable(),
  leadId: uuidSchema.optional().nullable(),
  practiceArea: z.string().trim().min(1).max(200),
  date: z.string().date(),
  timeSlot: z.string().trim().min(1).max(40),
  notes: optionalText(10_000),
  assignedLawyerId: uuidSchema.optional().nullable(),
});

export const appointmentBookSchema = appointmentCreateSchema;

export const appointmentStatusUpdateSchema = z.object({
  status: appointmentStatusSchema,
  meetingLink: optionalText(2000),
});

export const appointmentAssignSchema = z.object({
  assignedLawyerId: uuidSchema,
});

export const appointmentRescheduleSchema = z.object({
  date: z.string().date(),
  timeSlot: z.string().trim().min(1).max(40),
});

export type LeadListInput = z.infer<typeof leadListSchema>;
export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type PublicContactLeadInput = z.infer<typeof publicContactLeadSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
export type LeadConvertInput = z.infer<typeof leadConvertSchema>;
export type IntakeSubmitInput = z.infer<typeof intakeSubmitSchema>;
export type AppointmentListInput = z.infer<typeof appointmentListSchema> & {
  /** Internal: match legacy rows with no clientId but same email */
  clientEmail?: string | null;
};
export type AppointmentSlotsInput = z.infer<typeof appointmentSlotsSchema>;
export type AppointmentCreateInput = z.infer<typeof appointmentCreateSchema>;
export type AppointmentBookInput = z.infer<typeof appointmentBookSchema>;
export type AppointmentStatusUpdateInput = z.infer<typeof appointmentStatusUpdateSchema>;
export type AppointmentAssignInput = z.infer<typeof appointmentAssignSchema>;
export type AppointmentRescheduleInput = z.infer<typeof appointmentRescheduleSchema>;

