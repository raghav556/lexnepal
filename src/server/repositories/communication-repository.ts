import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDatabase } from "../db/client";
import {
  messages,
  messageReads,
  notifications,
  users,
} from "../db/schema";
import { randomUUID } from "crypto";

export class CommunicationRepository {
  // --- Messages ---
  static async listMessages(firmId: string, caseId: string, limit = 50, includeInternal = true) {
    const db = await getDatabase();
    
    const conditions = [
      eq(messages.firmId, firmId),
      eq(messages.caseId, caseId),
    ];
    
    if (!includeInternal) {
      conditions.push(eq(messages.isInternal, false));
    }

    const rows = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return rows.map((row) => ({
      ...row.message,
      senderName: row.sender?.name || row.sender?.email || "Unknown",
    }));
  }

  static async createMessage(
    firmId: string,
    data: { caseId: string; senderId: string; content: string; isInternal: boolean }
  ) {
    const db = await getDatabase();
    return await db.transaction(async (tx) => {
      const msgId = randomUUID();
      await tx.insert(messages).values({
        id: msgId,
        firmId,
        caseId: data.caseId,
        senderId: data.senderId,
        content: data.content,
        isInternal: data.isInternal,
      });

      await tx.insert(messageReads).values({
        id: randomUUID(),
        firmId,
        messageId: msgId,
        userId: data.senderId,
      });

      return msgId;
    });
  }

  static async markMessagesRead(firmId: string, caseId: string, userId: string) {
    const db = await getDatabase();
    
    const caseMessages = await db
      .select({ id: messages.id })
      .from(messages)
      .where(and(eq(messages.firmId, firmId), eq(messages.caseId, caseId)));

    if (caseMessages.length === 0) return;

    const readRecords = caseMessages.map((m) => ({
      id: randomUUID(),
      firmId,
      messageId: m.id,
      userId,
    }));

    await db
      .insert(messageReads)
      .values(readRecords)
      .onConflictDoNothing({ target: [messageReads.firmId, messageReads.messageId, messageReads.userId] });
  }

  // --- Notifications ---
  static async listNotifications(firmId: string, userId: string, limit = 50) {
    const db = await getDatabase();
    return await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.firmId, firmId), eq(notifications.userId, userId)))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  static async markNotificationRead(firmId: string, notificationId: string, userId: string) {
    const db = await getDatabase();
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.firmId, firmId),
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      );
  }

  static async markAllNotificationsRead(firmId: string, userId: string) {
    const db = await getDatabase();
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.firmId, firmId),
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
  }

  static async createNotification(
    firmId: string,
    data: { userId: string; title: string; body: string; type: any; relatedId?: string; link?: string }
  ) {
    const db = await getDatabase();
    const id = randomUUID();
    await db.insert(notifications).values({
      id,
      firmId,
      userId: data.userId,
      title: data.title,
      body: data.body,
      type: data.type,
      relatedId: data.relatedId,
      link: data.link,
      isRead: false,
    });
    return id;
  }
}
