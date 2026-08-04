/* eslint-disable @typescript-eslint/no-explicit-any -- migration input is untrusted heterogeneous legacy JSON */
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { inArray } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { cases, firms, messageReads, messages, notifications, users } from "@/server/db/schema";

type Value = Record<string, unknown>;
const tables = ["messages", "notifications"] as const;

export interface CommunicationMigrationReport {
  source: Record<string, number>;
  migrated: Record<string, number>;
  exceptions: Array<{ table: string; id?: string; reason: string }>;
  reconciliation: { passed: boolean; checks: Record<string, { source: number; target: number }> };
}

export async function migrateCommunicationExport(input: {
  exportPath: string;
  firmMap: Record<string, string>;
  orphanFirmId?: string;
}): Promise<CommunicationMigrationReport> {
  const reader = await createReader(input.exportPath);
  const records = new Map<string, Value[]>();
  for (const table of tables) records.set(table, await reader.readTable(table));
  const database = getDatabase();
  const targetFirmIds = [
    ...new Set([
      ...Object.values(input.firmMap),
      ...(input.orphanFirmId ? [input.orphanFirmId] : []),
    ]),
  ];
  const firmRows = targetFirmIds.length
    ? await database.select({ id: firms.id }).from(firms).where(inArray(firms.id, targetFirmIds))
    : [];
  if (firmRows.length !== targetFirmIds.length) {
    throw new Error("Firm map contains an unknown target firm");
  }

  const userRows = await database
    .select({ id: users.id, firmId: users.firmId, legacyId: users.legacyConvexId })
    .from(users);
  const userMap = new Map(
    userRows.filter((row) => row.legacyId).map((row) => [row.legacyId!, row]),
  );
  const caseRows = await database
    .select({ id: cases.id, firmId: cases.firmId, legacyId: cases.legacyConvexId })
    .from(cases);
  const caseMap = new Map(
    caseRows.filter((row) => row.legacyId).map((row) => [row.legacyId!, row]),
  );

  const migrated = Object.fromEntries(tables.map((table) => [table, 0]));
  const exceptions: CommunicationMigrationReport["exceptions"] = [];

  await database.transaction(async (tx) => {
    for (const record of records.get("messages") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");
        const matter = record.caseId ? caseMap.get(asString(record.caseId) ?? "") : undefined;
        const sender = record.senderId ? userMap.get(asString(record.senderId) ?? "") : undefined;
        if (!matter) throw new Error("Message case could not be mapped");
        if (!sender) throw new Error("Message sender could not be mapped");
        if (matter.firmId !== sender.firmId) {
          throw new Error("Message case and sender belong to different firms");
        }
        const firmId = resolveFirm(record, input, matter.firmId);
        const content = asString(record.content) ?? "";
        const isInternal = asBoolean(record.isInternal, false);
        const createdAt = toDate(record._creationTime) ?? new Date();

        const [msg] = await tx
          .insert(messages)
          .values({
            legacyConvexId: legacyId,
            firmId,
            caseId: matter.id,
            senderId: sender.id,
            content,
            isInternal,
            createdAt,
            updatedAt: createdAt,
          })
          .onConflictDoUpdate({
            target: messages.legacyConvexId,
            set: {
              firmId,
              caseId: matter.id,
              senderId: sender.id,
              content,
              isInternal,
              updatedAt: new Date(),
            },
          })
          .returning({ id: messages.id });

        if (Array.isArray(record.readBy)) {
          for (const readerId of record.readBy) {
            const mapped = userMap.get(asString(readerId) ?? "");
            if (!mapped || mapped.firmId !== firmId) continue;
            await tx
              .insert(messageReads)
              .values({
                firmId,
                messageId: msg!.id,
                userId: mapped.id,
                readAt: createdAt,
              })
              .onConflictDoNothing({
                target: [messageReads.firmId, messageReads.messageId, messageReads.userId],
              });
          }
        }
        migrated.messages += 1;
      } catch (error) {
        exceptions.push({ table: "messages", id: legacyId, reason: message(error) });
      }
    }

    for (const record of records.get("notifications") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");
        const owner = record.userId ? userMap.get(asString(record.userId) ?? "") : undefined;
        if (!owner) throw new Error("Notification user could not be mapped");
        const firmId = resolveFirm(record, input, owner.firmId);
        const title = asString(record.title) ?? "Notification";
        const body = asString(record.body) ?? "";
        const type = enumValue(
          record.type,
          [
            "hearing_reminder",
            "task_due",
            "invoice_sent",
            "payment_received",
            "document_request",
            "message",
            "system",
          ] as const,
          "system",
        );
        const relatedId = asString(record.relatedId);
        const link = asString(record.link);
        const isRead = asBoolean(record.isRead, false);
        const createdAt = toDate(record._creationTime) ?? new Date();

        await tx
          .insert(notifications)
          .values({
            legacyConvexId: legacyId,
            firmId,
            userId: owner.id,
            title,
            body,
            type,
            relatedId,
            link,
            isRead,
            createdAt,
            updatedAt: createdAt,
          })
          .onConflictDoUpdate({
            target: notifications.legacyConvexId,
            set: {
              firmId,
              userId: owner.id,
              title,
              body,
              type,
              relatedId,
              link,
              isRead,
              updatedAt: new Date(),
            },
          });
        migrated.notifications += 1;
      } catch (error) {
        exceptions.push({ table: "notifications", id: legacyId, reason: message(error) });
      }
    }
  });

  const checks: Record<string, { source: number; target: number }> = {};
  for (const [name, table] of [
    ["messages", messages],
    ["notifications", notifications],
  ] as const) {
    const ids = (records.get(name) ?? [])
      .map((row) => asString(row._id))
      .filter(Boolean) as string[];
    const target = ids.length
      ? (
          await database
            .select({ id: table.id })
            .from(table as any)
            .where(inArray((table as any).legacyConvexId, ids))
        ).length
      : 0;
    checks[name] = { source: records.get(name)?.length ?? 0, target };
  }

  return {
    source: Object.fromEntries([...records].map(([name, rows]) => [name, rows.length])),
    migrated,
    exceptions,
    reconciliation: {
      passed:
        exceptions.length === 0 &&
        Object.values(checks).every((check) => check.source === check.target),
      checks,
    },
  };
}

function resolveFirm(
  record: Value,
  input: { firmMap: Record<string, string>; orphanFirmId?: string },
  relatedFirmId?: string,
) {
  const legacyFirmId = asString(record.firmId);
  const mapped = legacyFirmId ? input.firmMap[legacyFirmId] : undefined;
  const firmId = mapped ?? relatedFirmId ?? input.orphanFirmId;
  if (!firmId) {
    throw new Error("Firm ownership is missing; supply an explicit firm map/orphan firm");
  }
  if (mapped && relatedFirmId && mapped !== relatedFirmId) {
    throw new Error("Firm ownership conflicts with a related record");
  }
  return firmId;
}
function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}
function toDate(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}
function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}
function message(error: unknown) {
  return error instanceof Error ? error.message : "Unknown migration error";
}
async function createReader(exportPath: string) {
  const stat = await fs.stat(exportPath);
  if (stat.isDirectory()) {
    return {
      readTable: async (table: string) => {
        for (const candidate of [
          path.join(exportPath, table, "documents.jsonl"),
          path.join(exportPath, `${table}.jsonl`),
          path.join(exportPath, `${table}.json`),
        ]) {
          try {
            return parseRows(await fs.readFile(candidate, "utf8"));
          } catch (error: any) {
            if (error?.code !== "ENOENT") throw error;
          }
        }
        return [];
      },
    };
  }
  const zip = await JSZip.loadAsync(await fs.readFile(exportPath));
  return {
    readTable: async (table: string) => {
      const entry =
        zip.file(`${table}/documents.jsonl`) ??
        zip.file(`${table}.jsonl`) ??
        zip.file(`${table}.json`);
      return entry ? parseRows(await entry.async("string")) : [];
    },
  };
}
function parseRows(text: string): Value[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) return JSON.parse(trimmed) as Value[];
  return trimmed
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Value);
}
