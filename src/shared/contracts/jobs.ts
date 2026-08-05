import { z } from "zod";

export const jobStatusSchema = z.enum([
  "pending",
  "processing",
  "retry",
  "completed",
  "dead_letter",
  "cancelled",
]);

/** Admin manual recovery of a dead-letter job. */
export const jobManualRetrySchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const jobListQuerySchema = z.object({
  status: jobStatusSchema.optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export type JobManualRetryInput = z.infer<typeof jobManualRetrySchema>;
export type JobListQueryInput = z.infer<typeof jobListQuerySchema>;
