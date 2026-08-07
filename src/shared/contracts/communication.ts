import { z } from "zod";

export const uuidSchema = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

export const notificationTypeSchema = z.enum([
  "hearing_reminder",
  "task_due",
  "invoice_sent",
  "payment_received",
  "document_request",
  "message",
  "system",
]);

export const messageListSchema = z.object({
  caseId: uuidSchema,
  isInternal: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export const messageCreateSchema = z.object({
  caseId: uuidSchema,
  content: z.string().trim().min(1).max(20_000),
  isInternal: z.boolean().default(false),
  attachmentIds: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
});

export const messageMarkReadSchema = z.object({
  caseId: uuidSchema,
});

export const messageUnreadSchema = z.object({
  caseIds: z
    .string()
    .trim()
    .min(1)
    .transform((value, ctx) => {
      const ids = value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      if (ids.length === 0 || ids.length > 100) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide 1–100 caseIds" });
        return z.NEVER;
      }
      for (const id of ids) {
        if (!z.string().uuid().safeParse(id).success) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid caseId: ${id}` });
          return z.NEVER;
        }
      }
      return ids;
    }),
});

export const notificationMarkReadSchema = z.object({
  notificationId: uuidSchema,
});

export const emailSendSchema = z.object({
  to: z.string().trim().email().max(320),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(50_000),
  relatedId: optionalText(200),
});

export type MessageListInput = z.infer<typeof messageListSchema>;
export type MessageCreateInput = z.infer<typeof messageCreateSchema>;
export type MessageMarkReadInput = z.infer<typeof messageMarkReadSchema>;
export type MessageUnreadInput = z.infer<typeof messageUnreadSchema>;
export type EmailSendInput = z.infer<typeof emailSendSchema>;
