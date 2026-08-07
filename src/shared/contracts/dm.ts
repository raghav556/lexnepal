import { z } from "zod";
import { uuidSchema } from "@/shared/contracts/communication";

export const dmThreadCreateSchema = z.object({
  peerUserId: uuidSchema,
});

export const dmMessageCreateSchema = z.object({
  content: z.string().trim().min(1).max(20_000),
  attachmentIds: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
});

export const dmMessageListSchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export type DmThreadCreateInput = z.infer<typeof dmThreadCreateSchema>;
export type DmMessageCreateInput = z.infer<typeof dmMessageCreateSchema>;
export type DmMessageListInput = z.infer<typeof dmMessageListSchema>;
