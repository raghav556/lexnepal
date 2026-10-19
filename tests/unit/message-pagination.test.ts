import { describe, expect, it } from "vitest";
import {
  decodeMessageCursor,
  encodeMessageCursor,
  mergeMessagePages,
  messageIdOf,
} from "@/shared/message-cursor";
import { messageListSchema } from "@/shared/contracts/communication";
import { dmMessageListSchema } from "@/shared/contracts/dm";

type Row = {
  _id: string;
  createdAt: string;
  content: string;
  isInternal?: boolean;
  threadId?: string;
};

function encode(createdAt: string, id: string) {
  return encodeMessageCursor(createdAt, id);
}

/** Mirrors repository older-than paging: newest-first fetch, chronological return. */
function pageFrom(
  all: Row[],
  opts: { cursor?: string; limit?: number; filter?: (row: Row) => boolean },
) {
  const limit = opts.limit ?? 30;
  let filtered = opts.filter ? all.filter(opts.filter) : all;
  if (opts.cursor) {
    const decoded = decodeMessageCursor(opts.cursor);
    if (!decoded) throw new Error("BAD_REQUEST: invalid cursor");
    filtered = filtered.filter((row) => {
      if (row.createdAt < decoded.createdAt.toISOString()) return true;
      if (row.createdAt === decoded.createdAt.toISOString() && row._id < decoded.id) return true;
      return false;
    });
  }
  const newestFirst = [...filtered].sort((a, b) => {
    if (a.createdAt === b.createdAt) return b._id.localeCompare(a._id);
    return a.createdAt < b.createdAt ? 1 : -1;
  });
  const hasMore = newestFirst.length > limit;
  const page = newestFirst.slice(0, limit).reverse();
  const oldest = page[0];
  return {
    page,
    isDone: !hasMore,
    continueCursor:
      hasMore && oldest ? encode(oldest.createdAt, oldest._id) : "",
  };
}

function makeStream(prefix: string, count: number, extra: Partial<Row> = {}): Row[] {
  const rows: Row[] = [];
  for (let i = 1; i <= count; i += 1) {
    const id = `${prefix}-${String(i).padStart(4, "0")}-4000-8000-${String(i).padStart(12, "0")}`;
    rows.push({
      _id: id,
      createdAt: new Date(Date.UTC(2026, 9, 1, 0, 0, i)).toISOString(),
      content: `${prefix}-${i}`,
      ...extra,
    });
  }
  return rows;
}

describe("message pagination paging", () => {
  const client = makeStream("a0000001", 100, { isInternal: false });
  const team = makeStream("b0000001", 80, { isInternal: true });
  const dmA = makeStream("c0000001", 70, { threadId: "thread-a" });
  const dmB = makeStream("d0000001", 70, { threadId: "thread-b" });

  it("loads the latest 30 and exposes Load-earlier cursor", () => {
    const first = pageFrom(client, { limit: 30 });
    expect(first.page).toHaveLength(30);
    expect(first.page[0].content).toBe("a0000001-71");
    expect(first.page.at(-1)?.content).toBe("a0000001-100");
    expect(first.isDone).toBe(false);
    expect(first.continueCursor).toBeTruthy();
  });

  it("walks older pages without duplicates until the real end", () => {
    let cursor: string | undefined;
    const seen = new Set<string>();
    let pages = 0;
    for (;;) {
      const result = pageFrom(client, { limit: 30, cursor });
      pages += 1;
      for (const row of result.page) {
        expect(seen.has(row._id)).toBe(false);
        seen.add(row._id);
      }
      if (result.isDone) break;
      cursor = result.continueCursor;
      expect(cursor).toBeTruthy();
    }
    expect(seen.size).toBe(100);
    expect(pages).toBe(4);
  });

  it("rejects invalid cursors safely", () => {
    expect(() => pageFrom(client, { cursor: "not-a-cursor" })).toThrow(/invalid cursor/);
    expect(decodeMessageCursor("%%%")).toBeNull();
  });

  it("keeps client and internal streams isolated under the same case", () => {
    const clientPage = pageFrom(client, {
      limit: 30,
      filter: (row) => row.isInternal === false,
    });
    const teamPage = pageFrom(team, {
      limit: 30,
      filter: (row) => row.isInternal === true,
    });
    expect(clientPage.page.every((row) => row.isInternal === false)).toBe(true);
    expect(teamPage.page.every((row) => row.isInternal === true)).toBe(true);
    const clientIds = new Set(clientPage.page.map((row) => row._id));
    expect(teamPage.page.some((row) => clientIds.has(row._id))).toBe(false);
  });

  it("does not leak DM history across threads when a cursor is reused", () => {
    const firstA = pageFrom(dmA, {
      limit: 30,
      filter: (row) => row.threadId === "thread-a",
    });
    const cross = pageFrom(dmB, {
      limit: 30,
      cursor: firstA.continueCursor,
      filter: (row) => row.threadId === "thread-b",
    });
    expect(cross.page.every((row) => row.threadId === "thread-b")).toBe(true);
    expect(cross.page.some((row) => row.threadId === "thread-a")).toBe(false);
  });

  it("merges poll windows without dropping earlier history", () => {
    const first = pageFrom(client, { limit: 30 });
    const earlier = pageFrom(client, { limit: 30, cursor: first.continueCursor });
    const polledLatest = pageFrom(client, { limit: 30 });
    const merged = mergeMessagePages(earlier.page, first.page, polledLatest.page);
    expect(merged).toHaveLength(60);
    expect(messageIdOf(merged[0])).toBe(earlier.page[0]._id);
    expect(messageIdOf(merged.at(-1)!)).toBe(polledLatest.page.at(-1)!._id);
  });

  it("keeps list schemas accepting optional cursor without breaking callers", () => {
    const caseId = "123e4567-e89b-12d3-a456-426614174000";
    expect(messageListSchema.safeParse({ caseId, limit: 30 }).success).toBe(true);
    expect(
      messageListSchema.safeParse({
        caseId,
        isInternal: "true",
        cursor: encode(client[0].createdAt, client[0]._id),
      }).success,
    ).toBe(true);
    expect(dmMessageListSchema.safeParse({ limit: 30 }).success).toBe(true);
    expect(
      dmMessageListSchema.safeParse({
        cursor: encode(dmA[0].createdAt, dmA[0]._id),
      }).success,
    ).toBe(true);
  });
});
