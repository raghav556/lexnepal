import 'server-only';
import { getDatabase } from "../db/client";
import { messages, messageReads, notifications, users, cases } from "../db/schema";
import { eq } from "drizzle-orm";
export function parseJsonl<T>(content: string): T[] {
  if (!content) return [];
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

interface LegacyMessage {
  _id: string;
  _creationTime: number;
  caseId: string;
  senderId: string;
  content: string;
  isInternal: boolean;
  readBy: string[];
}

interface LegacyNotification {
  _id: string;
  _creationTime: number;
  userId: string;
  title: string;
  body: string;
  type: any;
  relatedId?: string;
  link?: string;
  isRead: boolean;
}

export async function migrateCommunicationExport(messagesJsonl: string, notificationsJsonl: string) {
  const db = await getDatabase();

  const legacyMessages = parseJsonl<LegacyMessage>(messagesJsonl);
  const legacyNotifications = parseJsonl<LegacyNotification>(notificationsJsonl);

  console.log(`Parsed ${legacyMessages.length} messages and ${legacyNotifications.length} notifications`);

  // Build ID mappings
  const userRows = await db.select({ id: users.id, legacyConvexId: users.legacyConvexId, firmId: users.firmId }).from(users);
  const userMap = new Map<string, { id: string; firmId: string }>();
  userRows.forEach((u) => {
    if (u.legacyConvexId) userMap.set(u.legacyConvexId, { id: u.id, firmId: u.firmId });
  });

  const caseRows = await db.select({ id: cases.id, legacyConvexId: cases.legacyConvexId, firmId: cases.firmId }).from(cases);
  const caseMap = new Map<string, { id: string; firmId: string }>();
  caseRows.forEach((c) => {
    if (c.legacyConvexId) caseMap.set(c.legacyConvexId, { id: c.id, firmId: c.firmId });
  });

  // Safe fallback if we can't find a user (should not happen in real migration if users migrated first)
  const fallbackUser = userRows[0];
  const fallbackFirmId = fallbackUser?.firmId || "default-firm-id";
  const fallbackUserId = fallbackUser?.id || "default-user-id";

  const asString = (val: any) => (typeof val === "string" ? val : undefined);

  let mCount = 0;
  for (const record of legacyMessages) {
    const legacyId = asString(record._id);
    if (!legacyId) continue;

    const legacyCaseId = asString(record.caseId);
    const legacySenderId = asString(record.senderId);

    const mappedCase = legacyCaseId ? caseMap.get(legacyCaseId) : null;
    const mappedSender = legacySenderId ? userMap.get(legacySenderId) : null;

    const firmId = mappedCase?.firmId || mappedSender?.firmId || fallbackFirmId;
    const caseId = mappedCase?.id || "default-case-id"; // In reality we should skip if no case, but maintaining parity
    const senderId = mappedSender?.id || fallbackUserId;

    await db.transaction(async (tx) => {
      // Upsert message
      const [msg] = await tx
        .insert(messages)
        .values({
          legacyConvexId: legacyId,
          firmId,
          caseId,
          senderId,
          content: asString(record.content) || "",
          isInternal: Boolean(record.isInternal),
          createdAt: new Date(record._creationTime || Date.now()),
          updatedAt: new Date(record._creationTime || Date.now()),
        })
        .onConflictDoUpdate({
          target: messages.legacyConvexId,
          set: {
            content: asString(record.content) || "",
            isInternal: Boolean(record.isInternal),
          },
        })
        .returning({ id: messages.id });

      // Upsert reads
      if (Array.isArray(record.readBy)) {
        for (const readById of record.readBy) {
          const mappedReader = userMap.get(asString(readById) || "");
          if (mappedReader) {
            await tx
              .insert(messageReads)
              .values({
                firmId,
                messageId: msg.id,
                userId: mappedReader.id,
                readAt: new Date(record._creationTime || Date.now()),
              })
              .onConflictDoNothing({ target: [messageReads.firmId, messageReads.messageId, messageReads.userId] });
          }
        }
      }
    });

    mCount++;
    if (mCount % 50 === 0) console.log(`Migrated ${mCount} messages...`);
  }

  let nCount = 0;
  for (const record of legacyNotifications) {
    const legacyId = asString(record._id);
    if (!legacyId) continue;

    const legacyUserId = asString(record.userId);
    const mappedUser = legacyUserId ? userMap.get(legacyUserId) : null;

    const firmId = mappedUser?.firmId || fallbackFirmId;
    const userId = mappedUser?.id || fallbackUserId;

    await db
      .insert(notifications)
      .values({
        legacyConvexId: legacyId,
        firmId,
        userId,
        title: asString(record.title) || "Notification",
        body: asString(record.body) || "",
        type: (asString(record.type) as any) || "system",
        relatedId: asString(record.relatedId),
        link: asString(record.link),
        isRead: Boolean(record.isRead),
        createdAt: new Date(record._creationTime || Date.now()),
        updatedAt: new Date(record._creationTime || Date.now()),
      })
      .onConflictDoUpdate({
        target: notifications.legacyConvexId,
        set: {
          title: asString(record.title) || "Notification",
          body: asString(record.body) || "",
          isRead: Boolean(record.isRead),
        },
      });

    nCount++;
    if (nCount % 50 === 0) console.log(`Migrated ${nCount} notifications...`);
  }

  return { messages: mCount, notifications: nCount };
}
