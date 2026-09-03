import { returningUpsert } from "@/server/db/mysql-returning";
import { eq } from "drizzle-orm";
/* eslint-disable @typescript-eslint/no-explicit-any -- migration input is untrusted heterogeneous legacy JSON */
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { inArray } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import {
  documents,
  firms,
  signatureEnvelopes,
  signatureRecipients,
  users,
} from "@/server/db/schema";

type Value = Record<string, unknown>;
const tables = ["signatureEnvelopes", "signatureRecipients"] as const;

export interface EnvelopeMigrationReport {
  source: Record<string, number>;
  migrated: Record<string, number>;
  exceptions: Array<{ table: string; id?: string; reason: string }>;
  reconciliation: { passed: boolean; checks: Record<string, { source: number; target: number }> };
}

export async function migrateEnvelopeExport(input: {
  exportPath: string;
  firmMap: Record<string, string>;
  orphanFirmId?: string;
}): Promise<EnvelopeMigrationReport> {
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
  const docRows = await database
    .select({ id: documents.id, firmId: documents.firmId, legacyId: documents.legacyConvexId })
    .from(documents);
  const docMap = new Map(docRows.filter((row) => row.legacyId).map((row) => [row.legacyId!, row]));

  const migrated = Object.fromEntries(tables.map((table) => [table, 0]));
  const exceptions: EnvelopeMigrationReport["exceptions"] = [];
  const envelopeIdMap = new Map<string, string>();

  await database.transaction(async (tx) => {
    for (const record of records.get("signatureEnvelopes") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");
        const creator = record.createdBy
          ? userMap.get(asString(record.createdBy) ?? "")
          : undefined;
        const doc = record.documentId ? docMap.get(asString(record.documentId) ?? "") : undefined;
        if (!doc) throw new Error("Envelope document could not be mapped");
        if (!creator) throw new Error("Envelope creator could not be mapped");
        const firmId = resolveFirm(record, input, doc.firmId);
        if (creator.firmId !== firmId) throw new Error("Creator firm mismatch");
        const createdAt = toDate(record._creationTime) ?? new Date();
        const status = enumValue(
          record.status,
          ["draft", "sent", "completed", "declined", "voided", "expired"] as const,
          "draft",
        );
        const routing = enumValue(
          record.routing,
          ["sequential", "parallel"] as const,
          "sequential",
        );

        const [row] = await returningUpsert(
          tx
            .insert(signatureEnvelopes)
            .values({
              legacyConvexId: legacyId,
              firmId,
              documentId: doc.id,
              title: asString(record.title) ?? "Migrated Envelope",
              status,
              routing,
              createdBy: creator.id,
              expiresAt: toDate(record.expiresAt),
              voidedAt: toDate(record.voidedAt),
              voidReason: asString(record.voidReason),
              completedAt: toDate(record.completedAt),
              lastRemindedAt: toDate(record.lastRemindedAt),
              createdAt,
              updatedAt: createdAt,
            })
            .onDuplicateKeyUpdate({
              set: {
                firmId,
                documentId: doc.id,
                title: asString(record.title) ?? "Migrated Envelope",
                status,
                routing,
                createdBy: creator.id,
                expiresAt: toDate(record.expiresAt),
                voidedAt: toDate(record.voidedAt),
                voidReason: asString(record.voidReason),
                completedAt: toDate(record.completedAt),
                lastRemindedAt: toDate(record.lastRemindedAt),
                updatedAt: new Date(),
              },
            }),
          () =>
            tx
              .select()
              .from(signatureEnvelopes)
              .where(eq(signatureEnvelopes.legacyConvexId, legacyId))
              .limit(1),
        );
        envelopeIdMap.set(legacyId, row!.id);
        migrated.signatureEnvelopes += 1;
      } catch (error: any) {
        exceptions.push({
          table: "signatureEnvelopes",
          id: legacyId,
          reason: error?.message || String(error),
        });
      }
    }

    for (const record of records.get("signatureRecipients") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");
        const envelopeLegacy = asString(record.envelopeId);
        const envelopePg =
          (envelopeLegacy ? envelopeIdMap.get(envelopeLegacy) : undefined) ??
          (
            await tx
              .select({ id: signatureEnvelopes.id })
              .from(signatureEnvelopes)
              .where(
                inArray(signatureEnvelopes.legacyConvexId, envelopeLegacy ? [envelopeLegacy] : []),
              )
              .limit(1)
          )[0]?.id;
        if (!envelopePg) throw new Error("Recipient envelope could not be mapped");
        const signer = record.userId ? userMap.get(asString(record.userId) ?? "") : undefined;
        if (!signer) throw new Error("Recipient user could not be mapped");
        const firmId = resolveFirm(record, input, signer.firmId);
        const createdAt = toDate(record._creationTime) ?? new Date();
        const status = enumValue(
          record.status,
          ["pending", "awaiting_turn", "signed", "declined"] as const,
          "pending",
        );
        const order = Number(record.order ?? 0);
        await tx
          .insert(signatureRecipients)
          .values({
            legacyConvexId: legacyId,
            firmId,
            envelopeId: envelopePg,
            userId: signer.id,
            order: Number.isFinite(order) ? order : 0,
            status,
            declinedAt: toDate(record.declinedAt),
            declineReason: asString(record.declineReason),
            signedAt: toDate(record.signedAt),
            remindedAt: toDate(record.remindedAt),
            createdAt,
            updatedAt: createdAt,
          })
          .onDuplicateKeyUpdate({
            set: {
              firmId,
              envelopeId: envelopePg,
              userId: signer.id,
              order: Number.isFinite(order) ? order : 0,
              status,
              declinedAt: toDate(record.declinedAt),
              declineReason: asString(record.declineReason),
              signedAt: toDate(record.signedAt),
              remindedAt: toDate(record.remindedAt),
              updatedAt: new Date(),
            },
          });
        migrated.signatureRecipients += 1;
      } catch (error: any) {
        exceptions.push({
          table: "signatureRecipients",
          id: legacyId,
          reason: error?.message || String(error),
        });
      }
    }
  });

  const source = Object.fromEntries(
    tables.map((table) => [table, (records.get(table) ?? []).length]),
  );
  const checks: EnvelopeMigrationReport["reconciliation"]["checks"] = {};
  for (const table of tables) {
    // Reconciliation counts the rows carrying a legacy id seen in the export, per table.
    const legacyIds = (records.get(table) ?? [])
      .map((r) => asString(r._id))
      .filter(Boolean) as string[];
    let target = 0;
    if (legacyIds.length) {
      target =
        table === "signatureEnvelopes"
          ? (
              await database
                .select({ id: signatureEnvelopes.id })
                .from(signatureEnvelopes)
                .where(inArray(signatureEnvelopes.legacyConvexId, legacyIds))
            ).length
          : (
              await database
                .select({ id: signatureRecipients.id })
                .from(signatureRecipients)
                .where(inArray(signatureRecipients.legacyConvexId, legacyIds))
            ).length;
    }
    checks[table] = { source: source[table]!, target };
  }

  const passed =
    exceptions.length === 0 &&
    tables.every((table) => checks[table]!.source === checks[table]!.target);

  return { source, migrated, exceptions, reconciliation: { passed, checks } };
}

function resolveFirm(
  record: Value,
  input: { firmMap: Record<string, string>; orphanFirmId?: string },
  fallback?: string,
) {
  const legacyFirm = asString(record.firmId);
  if (legacyFirm && input.firmMap[legacyFirm]) return input.firmMap[legacyFirm]!;
  if (fallback) return fallback;
  if (input.orphanFirmId) return input.orphanFirmId;
  throw new Error("Firm could not be resolved");
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toDate(value: unknown) {
  if (value == null) return null;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string" && value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

async function createReader(exportPath: string) {
  const stat = await fs.stat(exportPath);
  if (stat.isDirectory()) {
    return {
      readTable: async (table: string) => readJsonlDir(path.join(exportPath, table)),
    };
  }
  const zip = await JSZip.loadAsync(await fs.readFile(exportPath));
  return {
    readTable: async (table: string) => {
      const file =
        zip.file(`${table}/documents.jsonl`) ||
        zip.file(`tables/${table}/documents.jsonl`) ||
        zip.file(`${table}.jsonl`);
      if (!file) return [];
      return (await file.async("string"))
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as Value);
    },
  };
}

async function readJsonlDir(dir: string) {
  try {
    const file = path.join(dir, "documents.jsonl");
    return (await fs.readFile(file, "utf8"))
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as Value);
  } catch {
    return [];
  }
}
