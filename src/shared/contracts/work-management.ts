import { z } from "zod";

export const uuidSchema = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

// ── Hearings ──────────────────────────────────────────────────────────────────

export const hearingStatusSchema = z.enum([
  "scheduled",
  "completed",
  "adjourned",
  "cancelled",
  "postponed",
  "not_reached",
  "bench_disqualified",
  "could_not_present",
  "part_heard",
  "continuous",
  "procedural_order",
  "evidence_exam",
  "final_judgment",
  "dismissed",
  "settled",
  "archived",
  "on_hold",
]);

export const hearingCreateSchema = z.object({
  caseId: uuidSchema,
  court: z.string().trim().min(1).max(300),
  judge: optionalText(250),
  dateGregorian: z.string().date(),
  dateBs: z.string().trim().min(1).max(20),
  hearingTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),
  purpose: optionalText(500),
  notes: optionalText(10_000),
});

export const hearingUpdateSchema = z
  .object({
    outcome: optionalText(10_000),
    nextDateGregorian: z.string().date().optional().nullable(),
    nextDateBs: optionalText(20),
    status: hearingStatusSchema.optional(),
    notes: optionalText(10_000),
    judge: optionalText(250),
    purpose: optionalText(500),
  })
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");

export const hearingListSchema = z.object({
  caseId: uuidSchema.optional(),
});

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const taskStatusSchema = z.enum(["todo", "in_progress", "done", "cancelled"]);
export const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const taskCategorySchema = z.enum([
  "filing",
  "research",
  "client",
  "court",
  "admin",
  "other",
]);
export const recurrenceRuleSchema = z.enum(["daily", "weekly", "monthly"]);

const flexibleDateTime = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T00:00:00.000Z`;
  return trimmed;
}, z.string().datetime({ offset: true }).optional().nullable());

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: optionalText(50_000),
  caseId: uuidSchema.optional().nullable(),
  assignedTo: uuidSchema,
  priority: taskPrioritySchema,
  category: taskCategorySchema.optional().nullable(),
  dueDate: flexibleDateTime,
  dueDateBs: optionalText(20),
  hearingId: uuidSchema.optional().nullable(),
  documentId: uuidSchema.optional().nullable(),
  parentTaskId: uuidSchema.optional().nullable(),
  watchers: z.array(uuidSchema).max(50).optional(),
  clientVisible: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: recurrenceRuleSchema.optional().nullable(),
  reminderAt: flexibleDateTime,
});

export const taskUpdateSchema = taskCreateSchema
  .partial()
  .extend({ status: taskStatusSchema.optional() })
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");

export const taskListSchema = z.object({
  caseId: uuidSchema.optional(),
  assignedTo: uuidSchema.optional(),
  status: taskStatusSchema.optional(),
  hearingId: uuidSchema.optional(),
  parentTaskId: uuidSchema.optional(),
  includeArchived: z
    .string()
    .transform((v) => v === "true")
    .optional(),
});

// ── SOP Templates ─────────────────────────────────────────────────────────────

export const sopCreateSchema = z.object({
  key: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(200),
  taskTitles: z.array(z.string().trim().min(1).max(300)).min(1).max(50),
  defaultPriority: taskPrioritySchema,
  practiceArea: optionalText(200),
});

export const sopRunSchema = z.object({
  templateKey: z.string().trim().min(1).max(100),
  caseId: uuidSchema,
  assignedTo: uuidSchema.optional(),
});

export const hearingPrepSchema = z.object({
  hearingId: uuidSchema,
  assignedTo: uuidSchema.optional(),
});

// ── Task Comments ─────────────────────────────────────────────────────────────

export const taskCommentCreateSchema = z.object({
  taskId: uuidSchema,
  content: z.string().trim().min(1).max(10_000),
});

// ── Research Notes ────────────────────────────────────────────────────────────

export const researchCategorySchema = z.enum([
  "supreme_court",
  "high_court",
  "district_court",
  "commentary",
  "procedure",
  "template_research",
]);

export const researchCreateSchema = z.object({
  title: z.string().trim().min(1).max(300),
  category: researchCategorySchema,
  tags: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  content: z.string().trim().min(1).max(500_000),
});

export const researchUpdateSchema = researchCreateSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");

// ── Types ─────────────────────────────────────────────────────────────────────

export type HearingCreateInput = z.infer<typeof hearingCreateSchema>;
export type HearingUpdateInput = z.infer<typeof hearingUpdateSchema>;
export type HearingListInput = z.infer<typeof hearingListSchema>;
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TaskListInput = z.infer<typeof taskListSchema>;
export type SopCreateInput = z.infer<typeof sopCreateSchema>;
export type SopRunInput = z.infer<typeof sopRunSchema>;
export type HearingPrepInput = z.infer<typeof hearingPrepSchema>;
export type TaskCommentCreateInput = z.infer<typeof taskCommentCreateSchema>;
export type ResearchCreateInput = z.infer<typeof researchCreateSchema>;
export type ResearchUpdateInput = z.infer<typeof researchUpdateSchema>;
