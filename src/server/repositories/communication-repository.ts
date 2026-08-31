import "server-only";
import { and, desc, eq, inArray, ne, notExists, sql } from "drizzle-orm";
import type { AuditContext } from "@/server/audit/context";
import { getDatabase } from "@/server/db/client";
import {
  auditLog,
  caseTeamMembers,
  cases,
  clients,
  messageAttachments,
  messageReads,
  messages,
  notifications,
  users,
} from "@/server/db/schema";
import type { MessageCreateInput, MessageListInput } from "@/shared/contracts/communication";
import { AppError } from "@/shared/errors/api-error";

const database = getDatabase();

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

export class CommunicationRepository {
  async listMessages(firmId: string, input: MessageListInput & { includeInternal: boolean }) {
    const conditions = [eq(messages.firmId, firmId), eq(messages.caseId, input.caseId)];
    if (!input.includeInternal) {
      conditions.push(eq(messages.isInternal, false));
    } else if (input.isInternal === true) {
      conditions.push(eq(messages.isInternal, true));
    } else if (input.isInternal === false) {
      conditions.push(eq(messages.isInternal, false));
    }

    const rows = await database
      .select({
        message: messages,
        senderName: users.name,
        senderEmail: users.email,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(input.limit ?? 50);

    const messageIds = rows.map((row) => row.message.id);
    const readByMap: Record<string, string[]> = {};
    const attachmentMap: Record<string, string[]> = {};

    if (messageIds.length > 0) {
      const reads = await database
        .select({
          messageId: messageReads.messageId,
          userId: messageReads.userId,
        })
        .from(messageReads)
        .where(and(eq(messageReads.firmId, firmId), inArray(messageReads.messageId, messageIds)));
      for (const read of reads) {
        (readByMap[read.messageId] ??= []).push(read.userId);
      }

      const attachments = await database
        .select({
          messageId: messageAttachments.messageId,
          storageId: messageAttachments.storageId,
          position: messageAttachments.position,
        })
        .from(messageAttachments)
        .where(
          and(
            eq(messageAttachments.firmId, firmId),
            inArray(messageAttachments.messageId, messageIds),
          ),
        )
        .orderBy(messageAttachments.position);
      for (const attachment of attachments) {
        (attachmentMap[attachment.messageId] ??= []).push(attachment.storageId);
      }
    }

    return rows
      .map((row) =>
        toDto({
          ...(row.message as unknown as Record<string, unknown>),
          senderName: row.senderName || row.senderEmail || "Unknown",
          readBy: readByMap[row.message.id] ?? [],
          attachmentIds: attachmentMap[row.message.id] ?? [],
        }),
      )
      .reverse();
  }

  async unreadCountsByCase(
    firmId: string,
    userId: string,
    caseIds: string[],
    options: { clientVisibleOnly: boolean },
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    for (const id of caseIds) result[id] = 0;
    if (caseIds.length === 0) return result;

    const conditions = [
      eq(messages.firmId, firmId),
      inArray(messages.caseId, caseIds),
      ne(messages.senderId, userId),
      notExists(
        database
          .select({ id: messageReads.id })
          .from(messageReads)
          .where(
            and(
              eq(messageReads.messageId, messages.id),
              eq(messageReads.userId, userId),
              eq(messageReads.firmId, firmId),
            ),
          ),
      ),
    ];
    if (options.clientVisibleOnly) {
      conditions.push(eq(messages.isInternal, false));
    }

    const rows = await database
      .select({
        caseId: messages.caseId,
        count: sql<number>`count(*)::int`,
      })
      .from(messages)
      .where(and(...conditions))
      .groupBy(messages.caseId);

    for (const row of rows) {
      result[row.caseId] = Number(row.count) || 0;
    }
    return result;
  }

  async createMessage(
    firmId: string,
    sender: { id: string; name: string; role: string },
    input: MessageCreateInput,
    audit: AuditContext,
  ) {
    return database.transaction(async (tx) => {
      const [matter] = await tx
        .select()
        .from(cases)
        .where(and(eq(cases.id, input.caseId), eq(cases.firmId, firmId)))
        .limit(1);
      if (!matter) throw new AppError("NOT_FOUND", "Case was not found", 404);

      const [row] = await tx
        .insert(messages)
        .values({
          firmId,
          caseId: input.caseId,
          senderId: sender.id,
          content: input.content,
          isInternal: input.isInternal,
        })
        .returning();
      if (!row) throw new AppError("INTERNAL_ERROR", "Failed to create message", 500);

      await tx.insert(messageReads).values({
        firmId,
        messageId: row.id,
        userId: sender.id,
      });

      for (const [index, storageId] of (input.attachmentIds ?? []).entries()) {
        await tx.insert(messageAttachments).values({
          firmId,
          messageId: row.id,
          storageId,
          position: index,
        });
      }

      if (!input.isInternal) {
        const isStaff = sender.role !== "client";
        if (isStaff) {
          const [client] = await tx
            .select()
            .from(clients)
            .where(and(eq(clients.id, matter.clientId), eq(clients.firmId, firmId)))
            .limit(1);
          if (client?.userId) {
            await tx.insert(notifications).values({
              firmId,
              userId: client.userId,
              title: "New Message",
              body: `${sender.name} sent you a message regarding ${matter.title}.`,
              type: "message",
              relatedId: matter.id,
              link: `/client/messages?caseId=${matter.id}`,
            });
          }
        } else if (matter.assignedLawyerId) {
          await tx.insert(notifications).values({
            firmId,
            userId: matter.assignedLawyerId,
            title: "New Client Message",
            body: `${sender.name} sent a message regarding ${matter.title}.`,
            type: "message",
            relatedId: matter.id,
            link: `/staff/messages?caseId=${matter.id}`,
          });
        }
      } else {
        // Case Team (internal): notify assigned lawyer + team members except sender.
        const teamRows = await tx
          .select({ userId: caseTeamMembers.userId })
          .from(caseTeamMembers)
          .where(and(eq(caseTeamMembers.caseId, matter.id), eq(caseTeamMembers.firmId, firmId)));
        const recipientIds = new Set<string>([
          matter.assignedLawyerId,
          ...teamRows.map((row) => row.userId),
        ]);
        recipientIds.delete(sender.id);
        for (const userId of recipientIds) {
          await tx.insert(notifications).values({
            firmId,
            userId,
            title: "Case Team Message",
            body: `${sender.name} posted in the case team chat for ${matter.title}.`,
            type: "message",
            relatedId: matter.id,
            link: `/staff/cases/${matter.id}?tab=messages&mode=team`,
          });
        }
      }

      await tx.insert(auditLog).values({
        firmId: audit.firmId,
        userId: audit.actorId,
        action: "message.created",
        resource: "messages",
        resourceId: row.id,
        details: input.caseId,
        ipAddress: audit.ipAddress,
        requestId: audit.requestId,
        createdAt: audit.occurredAt,
        updatedAt: audit.occurredAt,
      });

      return toDto(row as unknown as Record<string, unknown>);
    });
  }

  async markMessagesRead(firmId: string, caseId: string, userId: string) {
    const caseMessages = await database
      .select({ id: messages.id })
      .from(messages)
      .where(and(eq(messages.firmId, firmId), eq(messages.caseId, caseId)));
    if (caseMessages.length === 0) return { success: true as const, marked: 0 };

    await database
      .insert(messageReads)
      .values(
        caseMessages.map((message) => ({
          firmId,
          messageId: message.id,
          userId,
        })),
      )
      .onConflictDoNothing({
        target: [messageReads.firmId, messageReads.messageId, messageReads.userId],
      });
    return { success: true as const, marked: caseMessages.length };
  }

  async listNotifications(firmId: string, userId: string, limit = 50) {
    const rows = await database
      .select()
      .from(notifications)
      .where(and(eq(notifications.firmId, firmId), eq(notifications.userId, userId)))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    return rows.map((row) => toDto(row as unknown as Record<string, unknown>));
  }

  async markNotificationRead(firmId: string, notificationId: string, userId: string) {
    const [row] = await database
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(
        and(
          eq(notifications.firmId, firmId),
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
        ),
      )
      .returning();
    if (!row) throw new AppError("NOT_FOUND", "Notification was not found", 404);
    return { success: true as const, ...toDto(row as unknown as Record<string, unknown>) };
  }

  async markAllNotificationsRead(firmId: string, userId: string) {
    await database
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(
        and(
          eq(notifications.firmId, firmId),
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
        ),
      );
    return { success: true as const };
  }

  async createNotification(
    firmId: string,
    data: {
      userId: string;
      title: string;
      body: string;
      type:
        | "hearing_reminder"
        | "task_due"
        | "invoice_sent"
        | "payment_received"
        | "document_request"
        | "message"
        | "system";
      relatedId?: string | null;
      link?: string | null;
    },
  ) {
    const [row] = await database
      .insert(notifications)
      .values({
        firmId,
        userId: data.userId,
        title: data.title,
        body: data.body,
        type: data.type,
        relatedId: data.relatedId ?? null,
        link: data.link ?? null,
        isRead: false,
      })
      .returning();
    if (!row) throw new AppError("INTERNAL_ERROR", "Failed to create notification", 500);
    return toDto(row as unknown as Record<string, unknown>);
  }
}
