import { returningInsert } from "@/server/db/mysql-returning";
import "server-only";
import { and, asc, desc, eq, inArray, ne, notExists, or, sql } from "drizzle-orm";
import type { AuditContext } from "@/server/audit/context";
import { getDatabase } from "@/server/db/client";
import {
  auditLog,
  dmMessageAttachments,
  dmMessageReads,
  dmMessages,
  dmThreads,
  notifications,
  users,
} from "@/server/db/schema";
import type { DmMessageCreateInput } from "@/shared/contracts/dm";
import { AppError } from "@/shared/errors/api-error";

const database = getDatabase();

const STAFF_ROLES = new Set([
  "partner",
  "senior_associate",
  "associate",
  "paralegal",
  "intern",
  "admin",
]);

function toDto<T extends Record<string, unknown>>(row: T): T & { _id: string } {
  const output: Record<string, unknown> = { ...row, _id: row.id };
  for (const [key, value] of Object.entries(output)) {
    if (value instanceof Date) output[key] = value.toISOString();
  }
  delete output.firmId;
  delete output.legacyConvexId;
  delete output.deletedAt;
  return output as T & { _id: string };
}

function sortedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export class DmRepository {
  async assertStaffPeer(firmId: string, peerUserId: string) {
    const [peer] = await database
      .select({ id: users.id, role: users.role, name: users.name, email: users.email })
      .from(users)
      .where(and(eq(users.id, peerUserId), eq(users.firmId, firmId)))
      .limit(1);
    if (!peer || !STAFF_ROLES.has(peer.role)) {
      throw new AppError("NOT_FOUND", "Staff peer was not found", 404);
    }
    return peer;
  }

  async getOrCreateThread(firmId: string, userId: string, peerUserId: string) {
    if (userId === peerUserId) {
      throw new AppError("VALIDATION_FAILED", "Cannot start a DM with yourself", 422);
    }
    await this.assertStaffPeer(firmId, peerUserId);
    const [low, high] = sortedPair(userId, peerUserId);
    const [existing] = await database
      .select()
      .from(dmThreads)
      .where(
        and(
          eq(dmThreads.firmId, firmId),
          eq(dmThreads.userLowId, low),
          eq(dmThreads.userHighId, high),
        ),
      )
      .limit(1);
    if (existing) return toDto(existing as unknown as Record<string, unknown>);

    const [created] = await returningInsert(
      database
        .insert(dmThreads)
        .values({ firmId, userLowId: low, userHighId: high })
        .$returningId(),
      (id) => database.select().from(dmThreads).where(eq(dmThreads.id, id)).limit(1),
    );
    return toDto(created as unknown as Record<string, unknown>);
  }

  async requireThreadAccess(firmId: string, threadId: string, userId: string) {
    const [thread] = await database
      .select()
      .from(dmThreads)
      .where(and(eq(dmThreads.id, threadId), eq(dmThreads.firmId, firmId)))
      .limit(1);
    if (!thread) throw new AppError("NOT_FOUND", "DM thread was not found", 404);
    if (thread.userLowId !== userId && thread.userHighId !== userId) {
      throw new AppError("FORBIDDEN", "Access to this DM is denied", 403);
    }
    return thread;
  }

  async listThreads(firmId: string, userId: string) {
    const threads = await database
      .select()
      .from(dmThreads)
      .where(
        and(
          eq(dmThreads.firmId, firmId),
          or(eq(dmThreads.userLowId, userId), eq(dmThreads.userHighId, userId)),
        ),
      )
      .orderBy(desc(dmThreads.lastMessageAt), desc(dmThreads.updatedAt));

    if (threads.length === 0) return [];

    const peerIds = threads.map((t) => (t.userLowId === userId ? t.userHighId : t.userLowId));
    const peers = await database
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(inArray(users.id, peerIds));
    const peerMap = new Map(peers.map((p) => [p.id, p]));

    const threadIds = threads.map((t) => t.id);
    const lastMessages = await database
      .select({
        threadId: dmMessages.threadId,
        content: dmMessages.content,
        senderId: dmMessages.senderId,
        createdAt: dmMessages.createdAt,
      })
      .from(dmMessages)
      .where(and(eq(dmMessages.firmId, firmId), inArray(dmMessages.threadId, threadIds)))
      .orderBy(desc(dmMessages.createdAt));

    const lastByThread = new Map<string, (typeof lastMessages)[0]>();
    for (const row of lastMessages) {
      if (!lastByThread.has(row.threadId)) lastByThread.set(row.threadId, row);
    }

    const unreadRows = await database
      .select({
        threadId: dmMessages.threadId,
        count: sql<number>`cast(count(*) as signed)`,
      })
      .from(dmMessages)
      .where(
        and(
          eq(dmMessages.firmId, firmId),
          inArray(dmMessages.threadId, threadIds),
          ne(dmMessages.senderId, userId),
          notExists(
            database
              .select({ id: dmMessageReads.id })
              .from(dmMessageReads)
              .where(
                and(
                  eq(dmMessageReads.messageId, dmMessages.id),
                  eq(dmMessageReads.userId, userId),
                  eq(dmMessageReads.firmId, firmId),
                ),
              ),
          ),
        ),
      )
      .groupBy(dmMessages.threadId);
    const unreadMap = Object.fromEntries(unreadRows.map((r) => [r.threadId, Number(r.count) || 0]));

    return threads.map((thread) => {
      const peerId = thread.userLowId === userId ? thread.userHighId : thread.userLowId;
      const peer = peerMap.get(peerId);
      const last = lastByThread.get(thread.id);
      return {
        ...toDto(thread as unknown as Record<string, unknown>),
        peerUserId: peerId,
        peerName: peer?.name || peer?.email || "Staff",
        peerRole: peer?.role,
        lastMessage: last
          ? {
              content: last.content,
              senderId: last.senderId,
              createdAt: last.createdAt.toISOString(),
            }
          : null,
        unreadCount: unreadMap[thread.id] || 0,
      };
    });
  }

  async listMessages(firmId: string, threadId: string, limit = 50) {
    const rows = await database
      .select()
      .from(dmMessages)
      .where(and(eq(dmMessages.firmId, firmId), eq(dmMessages.threadId, threadId)))
      .orderBy(desc(dmMessages.createdAt))
      .limit(limit);

    const messageIds = rows.map((r) => r.id);
    const attachmentMap: Record<string, string[]> = {};
    if (messageIds.length > 0) {
      const attachments = await database
        .select()
        .from(dmMessageAttachments)
        .where(
          and(
            eq(dmMessageAttachments.firmId, firmId),
            inArray(dmMessageAttachments.messageId, messageIds),
          ),
        )
        .orderBy(asc(dmMessageAttachments.position));
      for (const a of attachments) {
        (attachmentMap[a.messageId] ??= []).push(a.storageId);
      }
    }

    return rows
      .map((row) =>
        toDto({
          ...(row as unknown as Record<string, unknown>),
          attachmentIds: attachmentMap[row.id] ?? [],
        }),
      )
      .reverse();
  }

  async createMessage(
    firmId: string,
    threadId: string,
    sender: { id: string; name: string },
    input: DmMessageCreateInput,
    audit: AuditContext,
  ) {
    return database.transaction(async (tx) => {
      const [row] = await returningInsert(
        tx
          .insert(dmMessages)
          .values({
            firmId,
            threadId,
            senderId: sender.id,
            content: input.content,
          })
          .$returningId(),
        (id) => tx.select().from(dmMessages).where(eq(dmMessages.id, id)).limit(1),
      );
      if (!row) throw new AppError("INTERNAL_ERROR", "Failed to create DM", 500);

      await tx.insert(dmMessageReads).values({
        firmId,
        messageId: row.id,
        userId: sender.id,
      });

      for (const [index, storageId] of (input.attachmentIds ?? []).entries()) {
        await tx.insert(dmMessageAttachments).values({
          firmId,
          messageId: row.id,
          storageId,
          position: index,
        });
      }

      await tx
        .update(dmThreads)
        .set({ lastMessageAt: new Date(), updatedAt: new Date() })
        .where(eq(dmThreads.id, threadId));

      const [thread] = await tx.select().from(dmThreads).where(eq(dmThreads.id, threadId)).limit(1);
      const peerId = thread!.userLowId === sender.id ? thread!.userHighId : thread!.userLowId;
      await tx.insert(notifications).values({
        firmId,
        userId: peerId,
        title: "Team DM",
        body: `${sender.name}: ${input.content.slice(0, 120)}`,
        type: "message",
        relatedId: threadId,
        link: `/staff/team-chat?dm=${threadId}`,
      });

      await tx.insert(auditLog).values({
        firmId: audit.firmId,
        userId: audit.actorId,
        action: "dm.message.created",
        resource: "dm_messages",
        resourceId: row.id,
        details: threadId,
        ipAddress: audit.ipAddress,
        requestId: audit.requestId,
        createdAt: audit.occurredAt,
        updatedAt: audit.occurredAt,
      });

      return toDto({
        ...(row as unknown as Record<string, unknown>),
        attachmentIds: input.attachmentIds ?? [],
      });
    });
  }

  async markThreadRead(firmId: string, threadId: string, userId: string) {
    const caseMessages = await database
      .select({ id: dmMessages.id })
      .from(dmMessages)
      .where(and(eq(dmMessages.firmId, firmId), eq(dmMessages.threadId, threadId)));
    if (caseMessages.length === 0) return { success: true as const, marked: 0 };

    await database
      .insert(dmMessageReads)
      .values(
        caseMessages.map((message) => ({
          firmId,
          messageId: message.id,
          userId,
        })),
      )
      .onDuplicateKeyUpdate({ set: { id: sql.raw("id") } });
    return { success: true as const, marked: caseMessages.length };
  }
}
