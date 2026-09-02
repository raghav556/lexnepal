import { returningUpsert } from "@/server/db/mysql-returning";
import { returningMutation } from "@/server/db/mysql-returning";
import { sql } from "drizzle-orm";
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { eq, inArray } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import {
  auditLog,
  firmSettings,
  firms,
  userEducations,
  userNotableCases,
  userPracticeAreas,
  users,
} from "@/server/db/schema";
import { USER_ROLES, type UserRole } from "@/server/auth/types";

type RecordValue = Record<string, unknown>;
export interface IdentityMigrationReport {
  source: Record<string, number>;
  migrated: Record<string, number>;
  retiredSessions: number;
  exceptions: Array<{ table: string; id?: string; reason: string }>;
  reconciliation: { passed: boolean; checks: Record<string, { source: number; target: number }> };
}

export interface IdentityShadowReport {
  passed: boolean;
  checkedUsers: number;
  checkedSettings: number;
  mismatches: Array<{
    table: string;
    id?: string;
    field: string;
    source: unknown;
    target: unknown;
  }>;
  security: {
    sessionsRetired: number;
    credentialFieldsImported: false;
    totpFieldsImported: false;
  };
}

export async function shadowReadIdentityExport(input: {
  exportPath: string;
  firmMap: Record<string, string>;
}): Promise<IdentityShadowReport> {
  const reader = await createReader(input.exportPath);
  const sourceUsers = await reader.readTable("users");
  const sourceSettings = await reader.readTable("firmSettings");
  const sourceSessions = await reader.readTable("sessions");
  const legacyUserIds = sourceUsers
    .map((row) => asString(row._id))
    .filter((id): id is string => Boolean(id));
  const database = getDatabase();
  const targetUsers = legacyUserIds.length
    ? await database.select().from(users).where(inArray(users.legacyConvexId, legacyUserIds))
    : [];
  const userByLegacyId = new Map(targetUsers.map((row) => [row.legacyConvexId, row]));
  const mismatches: IdentityShadowReport["mismatches"] = [];

  for (const source of sourceUsers) {
    const id = asString(source._id);
    const target = id ? userByLegacyId.get(id) : undefined;
    if (!target) {
      mismatches.push({ table: "users", id, field: "row", source: "present", target: "missing" });
      continue;
    }
    const expectedFirmId = input.firmMap[asString(source.firmId) ?? ""];
    compare(mismatches, "users", id, "firmId", expectedFirmId, target.firmId);
    compare(
      mismatches,
      "users",
      id,
      "email",
      asString(source.email)?.toLowerCase() ?? null,
      target.email,
    );
    compare(mismatches, "users", id, "role", asString(source.role), target.role);
    compare(mismatches, "users", id, "isActive", asBoolean(source.isActive, true), target.isActive);
    compare(
      mismatches,
      "users",
      id,
      "isPending",
      asBoolean(source.isPending, false),
      target.isPending,
    );
    if (target.passwordHash || target.totpSecret || target.activationToken)
      mismatches.push({
        table: "users",
        id,
        field: "legacySecrets",
        source: "excluded",
        target: "present",
      });
  }

  const legacySettingIds = sourceSettings
    .map((row) => asString(row._id))
    .filter((id): id is string => Boolean(id));
  const targetSettings = legacySettingIds.length
    ? await database
        .select()
        .from(firmSettings)
        .where(inArray(firmSettings.legacyConvexId, legacySettingIds))
    : [];
  const settingByLegacyId = new Map(targetSettings.map((row) => [row.legacyConvexId, row]));
  for (const source of sourceSettings) {
    const id = asString(source._id);
    const target = id ? settingByLegacyId.get(id) : undefined;
    if (!target) {
      mismatches.push({
        table: "firmSettings",
        id,
        field: "row",
        source: "present",
        target: "missing",
      });
      continue;
    }
    compare(
      mismatches,
      "firmSettings",
      id,
      "firmId",
      input.firmMap[asString(source.firmId) ?? ""],
      target.firmId,
    );
    compare(mismatches, "firmSettings", id, "key", asString(source.key), target.key);
    compare(mismatches, "firmSettings", id, "value", source.value ?? null, target.value);
  }

  return {
    passed: mismatches.length === 0,
    checkedUsers: sourceUsers.length,
    checkedSettings: sourceSettings.length,
    mismatches,
    security: {
      sessionsRetired: sourceSessions.length,
      credentialFieldsImported: false,
      totpFieldsImported: false,
    },
  };
}

function compare(
  mismatches: IdentityShadowReport["mismatches"],
  table: string,
  id: string | undefined,
  field: string,
  source: unknown,
  target: unknown,
) {
  if (JSON.stringify(source ?? null) !== JSON.stringify(target ?? null))
    mismatches.push({ table, id, field, source: source ?? null, target: target ?? null });
}

export async function migrateIdentityExport(input: {
  exportPath: string;
  firmMap: Record<string, string>;
}): Promise<IdentityMigrationReport> {
  const reader = await createReader(input.exportPath);
  const tableNames = ["firms", "users", "firmSettings", "sessions", "auditLog"];
  const records = new Map<string, RecordValue[]>();
  for (const table of tableNames) records.set(table, await reader.readTable(table));
  const exceptions: IdentityMigrationReport["exceptions"] = [];
  const migrated = Object.fromEntries(tableNames.map((name) => [name, 0]));
  const database = getDatabase();
  const targetFirmIds = [...new Set(Object.values(input.firmMap))];
  const existingFirms = targetFirmIds.length
    ? await database.select({ id: firms.id }).from(firms).where(inArray(firms.id, targetFirmIds))
    : [];
  const existingFirmSet = new Set(existingFirms.map((firm) => firm.id));
  for (const [source, target] of Object.entries(input.firmMap))
    if (!existingFirmSet.has(target))
      exceptions.push({
        table: "firms",
        id: source,
        reason: `Target firm ${target} does not exist`,
      });
  if (exceptions.length)
    return buildReport(records, migrated, exceptions, records.get("sessions")?.length ?? 0, {});

  await database.transaction(async (tx) => {
    for (const record of records.get("firms") ?? []) {
      const id = asString(record._id);
      const target = id ? input.firmMap[id] : undefined;
      if (!id || !target) {
        exceptions.push({
          table: "firms",
          id,
          reason: "Firm is not present in the approved firm map",
        });
        continue;
      }
      await tx
        .update(firms)
        .set({
          legacyConvexId: id,
          name: asString(record.name) ?? "Migrated firm",
          slug: asString(record.slug) ?? `firm-${target.slice(0, 8)}`,
          isActive: asBoolean(record.isActive, true),
          updatedAt: toDate(record._creationTime),
        })
        .where(eq(firms.id, target));
      migrated.firms += 1;
    }

    const userMap = new Map<string, string>();
    for (const record of records.get("users") ?? []) {
      const legacyId = asString(record._id);
      const sourceFirm = asString(record.firmId);
      const firmId = sourceFirm ? input.firmMap[sourceFirm] : undefined;
      const role = asString(record.role);
      if (!legacyId || !firmId || !role || !USER_ROLES.includes(role as UserRole)) {
        exceptions.push({
          table: "users",
          id: legacyId,
          reason: "Missing valid ID, firm ownership or role",
        });
        continue;
      }
      const [row] = await returningUpsert(
        tx
          .insert(users)
          .values({
            legacyConvexId: legacyId,
            firmId,
            tokenIdentifier: `migration:${legacyId}`,
            name: asString(record.name),
            email: asString(record.email)?.toLowerCase(),
            role: role as UserRole,
            avatar: null,
            phone: asString(record.phone),
            barCouncilNumber: asString(record.barCouncilNumber),
            barCouncilExpiry: asDateOnly(record.barCouncilExpiry),
            isActive: asBoolean(record.isActive, true),
            isPublicFacing: asBoolean(record.isPublicFacing, false),
            bio: asString(record.bio),
            longBio: asString(record.longBio),
            publicEmail: asString(record.publicEmail),
            linkedinUrl: asString(record.linkedinUrl),
            twitterUrl: asString(record.twitterUrl),
            isPending: asBoolean(record.isPending, false),
            twoFactorEnabled: false,
            twoFactorRequired: asBoolean(
              record.twoFactorRequired,
              role === "admin" || role === "partner",
            ),
            lastLoginAt: toOptionalDate(record.lastLoginAt),
            invitedAt: toOptionalDate(record.invitedAt),
            inviteExpiresAt: toOptionalDate(record.inviteExpiresAt),
            deactivatedAt: toOptionalDate(record.deactivatedAt),
            createdAt: toDate(record._creationTime),
            updatedAt: toDate(record._creationTime),
          })
          .onDuplicateKeyUpdate({
            set: {
              firmId,
              name: asString(record.name),
              email: asString(record.email)?.toLowerCase(),
              role: role as UserRole,
              phone: asString(record.phone),
              isActive: asBoolean(record.isActive, true),
              updatedAt: new Date(),
            },
          }),
        () => tx.select().from(users).where(eq(users.legacyConvexId, legacyId)).limit(1),
      );
      userMap.set(legacyId, row.id);
      migrated.users += 1;
      await tx.delete(userEducations).where(eq(userEducations.userId, row.id));
      for (const [position, education] of asObjects(record.education).entries())
        await tx.insert(userEducations).values({
          firmId,
          userId: row.id,
          degree: asString(education.degree) ?? "",
          institution: asString(education.institution) ?? "",
          year: asString(education.year) ?? "",
          position,
        });
      await tx.delete(userPracticeAreas).where(eq(userPracticeAreas.userId, row.id));
      for (const practiceArea of asStrings(record.practiceAreas))
        await tx
          .insert(userPracticeAreas)
          .values({ firmId, userId: row.id, practiceArea })
          .onDuplicateKeyUpdate({ set: { id: sql.raw("id") } });
      await tx.delete(userNotableCases).where(eq(userNotableCases.userId, row.id));
      for (const [position, description] of asStrings(record.notableCases).entries())
        await tx.insert(userNotableCases).values({ firmId, userId: row.id, description, position });
    }

    for (const record of records.get("firmSettings") ?? []) {
      const legacyId = asString(record._id);
      const sourceFirm = asString(record.firmId);
      const firmId = sourceFirm ? input.firmMap[sourceFirm] : undefined;
      const key = asString(record.key);
      if (!legacyId || !firmId || !key) {
        exceptions.push({
          table: "firmSettings",
          id: legacyId,
          reason: "Missing ID, firm ownership or key",
        });
        continue;
      }
      await tx
        .insert(firmSettings)
        .values({ legacyConvexId: legacyId, firmId, key, value: record.value ?? null })
        .onDuplicateKeyUpdate({
          set: { firmId, key, value: record.value ?? null, updatedAt: new Date() },
        });
      migrated.firmSettings += 1;
    }

    for (const record of records.get("auditLog") ?? []) {
      const legacyId = asString(record._id);
      const sourceUser = asString(record.userId);
      const userId = sourceUser ? userMap.get(sourceUser) : undefined;
      const sourceFirm = asString(record.firmId);
      const firmId = sourceFirm ? input.firmMap[sourceFirm] : undefined;
      if (!legacyId || !userId || !firmId) {
        exceptions.push({
          table: "auditLog",
          id: legacyId,
          reason: "Missing migrated actor or firm ownership",
        });
        continue;
      }
      await tx
        .insert(auditLog)
        .values({
          legacyConvexId: legacyId,
          firmId,
          userId,
          action: asString(record.action) ?? "legacy.unknown",
          resource: asString(record.resource) ?? "unknown",
          resourceId: asString(record.resourceId),
          details: asString(record.details),
          ipAddress: asString(record.ipAddress),
          createdAt: toDate(record._creationTime),
          updatedAt: toDate(record._creationTime),
        })
        .onDuplicateKeyUpdate({ set: { id: sql.raw("id") } });
      migrated.auditLog += 1;
    }
  });

  const checks: Record<string, { source: number; target: number }> = {};
  for (const [table, targetTable] of [
    ["users", users],
    ["firmSettings", firmSettings],
    ["auditLog", auditLog],
  ] as const) {
    const source = migrated[table];
    const ids = (records.get(table) ?? [])
      .map((record) => asString(record._id))
      .filter((id): id is string => Boolean(id));
    const target = ids.length
      ? (
          await database
            .select({ id: targetTable.legacyConvexId })
            .from(targetTable)
            .where(inArray(targetTable.legacyConvexId, ids))
        ).length
      : 0;
    checks[table] = { source, target };
  }
  return buildReport(records, migrated, exceptions, records.get("sessions")?.length ?? 0, checks);
}

function buildReport(
  records: Map<string, RecordValue[]>,
  migrated: Record<string, number>,
  exceptions: IdentityMigrationReport["exceptions"],
  retiredSessions: number,
  checks: Record<string, { source: number; target: number }>,
): IdentityMigrationReport {
  return {
    source: Object.fromEntries([...records].map(([name, rows]) => [name, rows.length])),
    migrated,
    retiredSessions,
    exceptions,
    reconciliation: {
      passed:
        exceptions.length === 0 &&
        Object.values(checks).every((check) => check.source === check.target),
      checks,
    },
  };
}

interface Reader {
  readTable(table: string): Promise<RecordValue[]>;
}
async function createReader(exportPath: string): Promise<Reader> {
  const resolved = path.resolve(exportPath);
  const stat = await fs.stat(resolved);
  if (stat.isDirectory())
    return { readTable: (table) => readJsonLines(path.join(resolved, table, "documents.jsonl")) };
  const zip = await JSZip.loadAsync(await fs.readFile(resolved));
  return {
    readTable: async (table) => {
      const entry = zip.file(`${table}/documents.jsonl`) ?? zip.file(`${table}.jsonl`);
      return entry ? parseJsonLines(await entry.async("string")) : [];
    },
  };
}
async function readJsonLines(file: string) {
  try {
    return parseJsonLines(await fs.readFile(file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
function parseJsonLines(text: string): RecordValue[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RecordValue);
}
function asString(value: unknown) {
  return typeof value === "string" && value.length ? value : undefined;
}
function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}
function asStrings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
function asObjects(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is RecordValue =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}
function toDate(value: unknown) {
  const date =
    typeof value === "number" || typeof value === "string" ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}
function toOptionalDate(value: unknown) {
  const string = asString(value);
  if (!string) return null;
  const date = new Date(string);
  return Number.isNaN(date.getTime()) ? null : date;
}
function asDateOnly(value: unknown) {
  const string = asString(value);
  return string && /^\d{4}-\d{2}-\d{2}/.test(string) ? string.slice(0, 10) : null;
}
