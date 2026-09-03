import { returningUpsert } from "@/server/db/mysql-returning";
import { sql } from "drizzle-orm";
/* eslint-disable @typescript-eslint/no-explicit-any -- migration input is untrusted heterogeneous legacy JSON */
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { and, eq, inArray } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import {
  cases,
  caseTeamMembers,
  clientKycFiles,
  clients,
  conflictChecks,
  firms,
  storageMigrationItems,
  users,
} from "@/server/db/schema";
import { asShadowBoolean, asShadowString, pushMismatch } from "./shadow-compare";

type Value = Record<string, unknown>;
const tables = ["clients", "cases", "conflictChecks"] as const;
export interface MattersMigrationReport {
  source: Record<string, number>;
  migrated: Record<string, number>;
  exceptions: Array<{ table: string; id?: string; reason: string }>;
  reconciliation: { passed: boolean; checks: Record<string, { source: number; target: number }> };
}

export interface MattersShadowReport {
  domain: "matters";
  passed: boolean;
  checkedClients: number;
  checkedCases: number;
  mismatches: Array<{
    table: string;
    id?: string;
    field: string;
    source: unknown;
    target: unknown;
  }>;
}

export async function shadowReadMattersExport(input: {
  exportPath: string;
  firmMap: Record<string, string>;
  orphanFirmId?: string;
}): Promise<MattersShadowReport> {
  const reader = await createReader(input.exportPath);
  const sourceClients = await reader.readTable("clients");
  const sourceCases = await reader.readTable("cases");
  const database = getDatabase();
  const mismatches: MattersShadowReport["mismatches"] = [];

  const clientIds = sourceClients
    .map((row) => asString(row._id))
    .filter((id): id is string => Boolean(id));
  const targetClients = clientIds.length
    ? await database.select().from(clients).where(inArray(clients.legacyConvexId, clientIds))
    : [];
  const clientByLegacy = new Map(targetClients.map((row) => [row.legacyConvexId, row]));

  for (const source of sourceClients) {
    const id = asString(source._id);
    const target = id ? clientByLegacy.get(id) : undefined;
    if (!target) {
      mismatches.push({ table: "clients", id, field: "row", source: "present", target: "missing" });
      continue;
    }
    const expectedFirm = input.firmMap[asString(source.firmId) ?? ""] ?? input.orphanFirmId ?? null;
    pushMismatch(mismatches, "clients", id, "firmId", expectedFirm, target.firmId);
    pushMismatch(
      mismatches,
      "clients",
      id,
      "fullName",
      asShadowString(source.fullName) ?? "Migrated client",
      target.fullName,
    );
    pushMismatch(
      mismatches,
      "clients",
      id,
      "email",
      asShadowString(source.email) ?? null,
      target.email,
    );
    pushMismatch(
      mismatches,
      "clients",
      id,
      "isActive",
      asShadowBoolean(source.isActive, true),
      target.isActive,
    );
  }

  const caseIds = sourceCases
    .map((row) => asString(row._id))
    .filter((id): id is string => Boolean(id));
  const targetCases = caseIds.length
    ? await database.select().from(cases).where(inArray(cases.legacyConvexId, caseIds))
    : [];
  const caseByLegacy = new Map(targetCases.map((row) => [row.legacyConvexId, row]));

  for (const source of sourceCases) {
    const id = asString(source._id);
    const target = id ? caseByLegacy.get(id) : undefined;
    if (!target) {
      mismatches.push({ table: "cases", id, field: "row", source: "present", target: "missing" });
      continue;
    }
    const expectedFirm = input.firmMap[asString(source.firmId) ?? ""] ?? input.orphanFirmId ?? null;
    pushMismatch(mismatches, "cases", id, "firmId", expectedFirm, target.firmId);
    pushMismatch(
      mismatches,
      "cases",
      id,
      "caseNumber",
      asShadowString(source.caseNumber) ?? null,
      target.caseNumber,
    );
    pushMismatch(
      mismatches,
      "cases",
      id,
      "title",
      asShadowString(source.title) ?? "Migrated case",
      target.title,
    );
    pushMismatch(
      mismatches,
      "cases",
      id,
      "status",
      asShadowString(source.status) ?? "active",
      target.status,
    );
    pushMismatch(
      mismatches,
      "cases",
      id,
      "conflictChecked",
      asShadowBoolean(source.conflictChecked, false),
      target.conflictChecked,
    );
  }

  return {
    domain: "matters",
    passed: mismatches.length === 0,
    checkedClients: sourceClients.length,
    checkedCases: sourceCases.length,
    mismatches,
  };
}

export async function migrateMattersExport(input: {
  exportPath: string;
  firmMap: Record<string, string>;
  orphanFirmId?: string;
}): Promise<MattersMigrationReport> {
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
  if (firmRows.length !== targetFirmIds.length)
    throw new Error("Firm map contains an unknown target firm");
  const userRows = await database
    .select({ id: users.id, firmId: users.firmId, legacyId: users.legacyConvexId })
    .from(users);
  const userMap = new Map(
    userRows.filter((row) => row.legacyId).map((row) => [row.legacyId!, row]),
  );
  const migrated = Object.fromEntries(tables.map((table) => [table, 0]));
  const exceptions: MattersMigrationReport["exceptions"] = [];
  const clientMap = new Map<string, { id: string; firmId: string }>();

  await database.transaction(async (tx) => {
    for (const record of records.get("clients") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");
        const linkedUser = record.userId ? userMap.get(asString(record.userId) ?? "") : undefined;
        const firmId = resolveFirm(record, input, linkedUser?.firmId);
        const reviewer = record.kycReviewedBy
          ? userMap.get(asString(record.kycReviewedBy) ?? "")
          : undefined;
        if (reviewer && reviewer.firmId !== firmId)
          throw new Error("KYC reviewer belongs to another firm");
        const [row] = await returningUpsert(
          tx
            .insert(clients)
            .values({
              legacyConvexId: legacyId,
              firmId,
              userId: linkedUser?.id,
              type: enumValue(record.type, ["individual", "corporate"] as const, "individual"),
              fullName: asString(record.fullName) ?? "Migrated client",
              email: asString(record.email),
              phone: asString(record.phone),
              address: asString(record.address),
              companyName: asString(record.companyName),
              registrationNumber: asString(record.registrationNumber),
              kycStatus: enumValue(
                record.kycStatus,
                ["pending", "submitted", "verified", "rejected"] as const,
                "pending",
              ),
              kycIdNumber: asString(record.kycIdNumber),
              kycConsentAt: toDate(record.kycConsentAt),
              kycConsentVersion: asString(record.kycConsentVersion),
              kycRejectionReason: asString(record.kycRejectionReason),
              kycSubmittedAt: toDate(record.kycSubmittedAt),
              kycReviewedAt: toDate(record.kycReviewedAt),
              kycReviewedBy: reviewer?.id,
              notes: asString(record.notes),
              isActive: asBoolean(record.isActive, true),
              createdAt: toDate(record._creationTime) ?? new Date(),
            })
            .onDuplicateKeyUpdate({
              set: {
                firmId,
                userId: linkedUser?.id,
                fullName: asString(record.fullName) ?? "Migrated client",
                updatedAt: new Date(),
              },
            }),
          () => tx.select().from(clients).where(eq(clients.legacyConvexId, legacyId)).limit(1),
        );
        clientMap.set(legacyId, row);
        const legacyFiles: Value[] = Array.isArray(record.kycFiles)
          ? (record.kycFiles as Value[])
          : Array.isArray(record.kycDocuments)
            ? (record.kycDocuments as unknown[]).map(
                (storageId, index) =>
                  ({
                    storageId,
                    docType: "other",
                    fileName: `Document ${index + 1}`,
                  }) as Value,
              )
            : [];
        for (const file of legacyFiles) {
          const storageId = asString(file.storageId);
          if (!storageId) continue;
          const [migratedStorage] = await tx
            .select()
            .from(storageMigrationItems)
            .where(
              and(
                eq(storageMigrationItems.firmId, firmId),
                eq(storageMigrationItems.legacyStorageId, storageId),
                eq(storageMigrationItems.status, "verified"),
              ),
            )
            .limit(1);
          if (!migratedStorage)
            throw new Error(
              `KYC storage ${storageId} is not verified in the storage migration journal`,
            );
          await tx
            .insert(clientKycFiles)
            .values({
              firmId,
              clientId: row.id,
              storageId: migratedStorage.destinationKey,
              documentType: enumValue(
                file.docType,
                ["government_id", "proof_of_address", "other"] as const,
                "other",
              ),
              fileName: asString(file.fileName) ?? "Migrated KYC document",
              mimeType: asString(file.mimeType),
              sha256: migratedStorage.actualSha256,
            })
            .onDuplicateKeyUpdate({ set: { id: sql.raw("id") } });
        }
        migrated.clients += 1;
      } catch (error) {
        exceptions.push({ table: "clients", id: legacyId, reason: message(error) });
      }
    }

    for (const record of records.get("cases") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");
        const client = clientMap.get(asString(record.clientId) ?? "");
        const lawyer = userMap.get(asString(record.assignedLawyerId) ?? "");
        if (!client || !lawyer || client.firmId !== lawyer.firmId)
          throw new Error("Case client or assigned lawyer relationship is missing/cross-firm");
        const firmId = resolveFirm(record, input, client.firmId);
        if (firmId !== client.firmId) throw new Error("Case ownership conflicts with its client");
        const members = (Array.isArray(record.teamMemberIds) ? record.teamMemberIds : [])
          .map((id) => userMap.get(asString(id) ?? ""))
          .filter(Boolean) as Array<{ id: string; firmId: string }>;
        if (members.some((member) => member.firmId !== firmId))
          throw new Error("Case team contains a cross-firm user");
        const clearer = record.conflictClearedBy
          ? userMap.get(asString(record.conflictClearedBy) ?? "")
          : undefined;
        if (clearer && clearer.firmId !== firmId)
          throw new Error("Conflict clearer belongs to another firm");
        const [row] = await returningUpsert(
          tx
            .insert(cases)
            .values({
              legacyConvexId: legacyId,
              firmId,
              caseNumber: asString(record.caseNumber) ?? `MIG-${legacyId}`,
              title: asString(record.title) ?? "Migrated case",
              description: asString(record.description),
              practiceArea: asString(record.practiceArea) ?? "Other",
              status: enumValue(
                record.status,
                ["inquiry", "active", "on_hold", "closed_won", "closed_lost"] as const,
                "active",
              ),
              clientId: client.id,
              assignedLawyerId: lawyer.id,
              court: asString(record.court),
              judge: asString(record.judge),
              opposingCounsel: asString(record.opposingCounsel),
              filingDate: dateOnly(record.filingDate),
              closedDate: dateOnly(record.closedDate),
              conflictChecked: asBoolean(record.conflictChecked, false),
              conflictClearedBy: clearer?.id,
              createdAt: toDate(record._creationTime) ?? new Date(),
            })
            .onDuplicateKeyUpdate({
              set: {
                firmId,
                title: asString(record.title) ?? "Migrated case",
                updatedAt: new Date(),
              },
            }),
          () => tx.select().from(cases).where(eq(cases.legacyConvexId, legacyId)).limit(1),
        );
        await tx
          .delete(caseTeamMembers)
          .where(and(eq(caseTeamMembers.firmId, firmId), eq(caseTeamMembers.caseId, row.id)));
        const uniqueMembers = [...new Set(members.map((member) => member.id))];
        if (uniqueMembers.length)
          await tx
            .insert(caseTeamMembers)
            .values(uniqueMembers.map((userId) => ({ firmId, caseId: row.id, userId })));
        migrated.cases += 1;
      } catch (error) {
        exceptions.push({ table: "cases", id: legacyId, reason: message(error) });
      }
    }

    for (const record of records.get("conflictChecks") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");
        const runner = record.runBy ? userMap.get(asString(record.runBy) ?? "") : undefined;
        const firmId = resolveFirm(record, input, runner?.firmId);
        await tx
          .insert(conflictChecks)
          .values({
            legacyConvexId: legacyId,
            firmId,
            searchQuery: asString(record.searchQuery) ?? "",
            hitsCount: asNumber(record.hitsCount, 0),
            status: enumValue(
              record.status,
              ["pending", "cleared", "conflict"] as const,
              "pending",
            ),
            runBy: runner?.id,
            runByName: asString(record.runByName) ?? "Migrated user",
            checkedAt: toDate(record.timestamp) ?? toDate(record._creationTime) ?? new Date(),
            notes: asString(record.notes),
            createdAt: toDate(record._creationTime) ?? new Date(),
          })
          .onDuplicateKeyUpdate({
            set: {
              firmId,
              status: enumValue(
                record.status,
                ["pending", "cleared", "conflict"] as const,
                "pending",
              ),
              notes: asString(record.notes),
              updatedAt: new Date(),
            },
          });
        migrated.conflictChecks += 1;
      } catch (error) {
        exceptions.push({ table: "conflictChecks", id: legacyId, reason: message(error) });
      }
    }
  });

  const checks: Record<string, { source: number; target: number }> = {};
  for (const [name, table] of [
    ["clients", clients],
    ["cases", cases],
    ["conflictChecks", conflictChecks],
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
  if (!firmId)
    throw new Error("Firm ownership is missing; supply an explicit firm map/orphan firm");
  if (mapped && relatedFirmId && mapped !== relatedFirmId)
    throw new Error("Firm ownership conflicts with a related record");
  return firmId;
}
function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}
function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function toDate(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}
function dateOnly(value: unknown) {
  const string = asString(value);
  return string && /^\d{4}-\d{2}-\d{2}$/.test(string) ? string : null;
}
function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}
function message(error: unknown) {
  return error instanceof Error ? error.message : "Unknown migration error";
}
async function createReader(exportPath: string) {
  const stat = await fs.stat(exportPath);
  if (stat.isDirectory())
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
