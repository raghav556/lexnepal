import { describe, expect, it } from "vitest";
import {
  compareMessageOrder,
  decodeMessageCursor,
  encodeMessageCursor,
  mergeMessagePages,
} from "@/shared/message-cursor";
import { messageListSchema } from "@/shared/contracts/communication";
import { dmMessageListSchema } from "@/shared/contracts/dm";

describe("message history cursors", () => {
  it("round-trips createdAt + id", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const createdAt = "2026-10-19T04:00:00.000Z";
    const cursor = encodeMessageCursor(createdAt, id);
    const decoded = decodeMessageCursor(cursor);
    expect(decoded?.id).toBe(id);
    expect(decoded?.createdAt.toISOString()).toBe(createdAt);
  });

  it("rejects invalid cursors safely", () => {
    expect(decodeMessageCursor("")).toBeNull();
    expect(decodeMessageCursor("not-base64")).toBeNull();
    expect(() => encodeMessageCursor("2026-10-19T04:00:00.000Z", "nope")).toThrow();
    expect(
      decodeMessageCursor(Buffer.from('{"t":"bad","i":"nope"}', "utf8").toString("base64url")),
    ).toBeNull();
  });

  it("orders equal timestamps by id", () => {
    const stamp = "2026-10-19T04:00:00.000Z";
    const a = { createdAt: stamp, _id: "11111111-1111-1111-1111-111111111111" };
    const b = { createdAt: stamp, _id: "22222222-2222-2222-2222-222222222222" };
    expect(compareMessageOrder(a, b)).toBeLessThan(0);
    expect(mergeMessagePages([b, a], [a])).toEqual([a, b]);
  });

  it("accepts optional cursor on existing list schemas", () => {
    const caseId = "123e4567-e89b-12d3-a456-426614174000";
    expect(messageListSchema.safeParse({ caseId }).success).toBe(true);
    expect(
      messageListSchema.safeParse({
        caseId,
        limit: "30",
        cursor: encodeMessageCursor("2026-10-19T04:00:00.000Z", caseId),
      }).success,
    ).toBe(true);
    expect(dmMessageListSchema.safeParse({ limit: 30 }).success).toBe(true);
    expect(dmMessageListSchema.safeParse({ cursor: "x".repeat(600) }).success).toBe(false);
  });
});
