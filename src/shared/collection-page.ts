import { z } from "zod";
import { decodeMessageCursor, encodeMessageCursor } from "@/shared/message-cursor";

/** Opt-in extension: callers without page=true retain the original array response. */
export const collectionPageQuerySchema = z.object({
  page: z.literal("true").optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z
    .string()
    .max(512)
    .refine((value) => decodeMessageCursor(value) !== null, "Invalid continuation cursor")
    .optional(),
});
export type CollectionPageRequest = z.infer<typeof collectionPageQuerySchema>;
export interface CollectionPage<T> {
  items: T[];
  nextCursor: string | null;
  /** No lifetime count is inferred from a bounded result window. */
  total: null;
}
export function collectionPage<T>(
  rows: T[],
  limit: number,
  position: (row: T) => { createdAt: string | Date; id: string },
): CollectionPage<T> {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  const key = last ? position(last) : undefined;
  return {
    items,
    nextCursor: rows.length > limit && key ? encodeMessageCursor(key.createdAt, key.id) : null,
    total: null,
  };
}
