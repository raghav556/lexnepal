/* eslint-disable @typescript-eslint/no-explicit-any -- migration input is untrusted heterogeneous legacy JSON */
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { inArray } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { attendance, firms, leaveRequests, users } from "@/server/db/schema";

type Value = Record<string, unknown>;
const tables = ["attendance", "leaveRequests"] as const;

export interface HrMigrationReport {
  source: Record<string, number>;
  migrated: Record<string, number>;
  exceptions: Array<{ table: string; id?: string; reason: string }>;
  reconciliation: { passed: boolean; checks: Record<string, { source: number; target: number }> };
}

function parseClock(date: string, clock?: string): Date | null {
  if (!clock?.trim()) return null;
  const trimmed = clock.trim();
  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso) && trimmed.includes("T")) return new Date(iso);
  const combined = Date.parse(`${date} ${trimmed}`);
  if (!Number.isNaN(combined)) return new Date(combined);
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const d = new Date(`${date}T00:00:00`);
    if (!Number.isNaN(d.valueOf())) {
      d.setHours(Number(match[1]), Number(match[2]), 0, 0);
      return d;
    }
  }
  return null;
}

export async function migrateHrExport(input: {
  exportPath: string;
  firmMap: Record<string, string>;
  orphanFirmId?: string;
}): Promise<HrMigrationReport> {
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
  const exceptions: HrMigrationReport["exceptions"] = [];

  await database.transaction(async (tx) => {
    for (const record of records.get("attendance") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");
        const user = userMap.get(asString(record.userId) ?? "");
        if (!user) throw new Error("Unknown userId");
        const firmId = resolveFirm(record, input, user.firmId);
        const date = asString(record.date) ?? asString(record.attendanceDate);
        if (!date) throw new Error("Missing attendance date");
        const status = enumValue(
          record.status,
          ["present", "absent", "half_day", "leave"] as const,
          "present",
        );
        const clockIn = parseClock(date, asString(record.clockIn));
        const clockOut = parseClock(date, asString(record.clockOut));
        const now = new Date();
        await tx
          .insert(attendance)
          .values({
            firmId,
            userId: user.id,
            attendanceDate: date,
            clockIn,
            clockOut,
            status,
            legacyConvexId: legacyId,
            createdAt: parseTimestamp(record._creationTime) ?? now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: attendance.legacyConvexId,
            set: {
              firmId,
              userId: user.id,
              attendanceDate: date,
              clockIn,
              clockOut,
              status,
              updatedAt: now,
              deletedAt: null,
            },
          });
        migrated.attendance += 1;
      } catch (error) {
        exceptions.push({ table: "attendance", id: legacyId, reason: message(error) });
      }
    }

    for (const record of records.get("leaveRequests") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");
        const user = userMap.get(asString(record.userId) ?? "");
        if (!user) throw new Error("Unknown userId");
        const firmId = resolveFirm(record, input, user.firmId);
        const leaveFrom = asString(record.fromDate);
        const leaveTo = asString(record.toDate);
        if (!leaveFrom || !leaveTo) throw new Error("Missing leave dates");
        const type = enumValue(
          record.type,
          ["annual", "sick", "maternity", "paternity", "unpaid"] as const,
          "annual",
        );
        const status = enumValue(
          record.status,
          ["pending", "approved", "rejected"] as const,
          "pending",
        );
        const reviewer = record.reviewedBy
          ? userMap.get(asString(record.reviewedBy) ?? "")
          : undefined;
        const now = new Date();
        await tx
          .insert(leaveRequests)
          .values({
            firmId,
            userId: user.id,
            type,
            fromDate: leaveFrom,
            toDate: leaveTo,
            reason: asString(record.reason) ?? null,
            status,
            reviewedBy: reviewer?.id ?? null,
            legacyConvexId: legacyId,
            createdAt: parseTimestamp(record._creationTime) ?? now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: leaveRequests.legacyConvexId,
            set: {
              firmId,
              userId: user.id,
              type,
              fromDate: leaveFrom,
              toDate: leaveTo,
              reason: asString(record.reason) ?? null,
              status,
              reviewedBy: reviewer?.id ?? null,
              updatedAt: now,
              deletedAt: null,
            },
          });
        migrated.leaveRequests += 1;
      } catch (error) {
        exceptions.push({ table: "leaveRequests", id: legacyId, reason: message(error) });
      }
    }
  });

  const checks: Record<string, { source: number; target: number }> = {};
  for (const [name, table] of [
    ["attendance", attendance],
    ["leaveRequests", leaveRequests],
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
function parseTimestamp(value: unknown) {
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
