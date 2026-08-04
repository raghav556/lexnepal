/* eslint-disable @typescript-eslint/no-explicit-any -- migration input is untrusted heterogeneous legacy JSON */
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { inArray } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { leads, appointments, firms, users, clients } from "@/server/db/schema";

type Value = Record<string, unknown>;
const tables = ["leads", "appointments"] as const;

export interface CrmMigrationReport {
  source: Record<string, number>;
  migrated: Record<string, number>;
  exceptions: Array<{ table: string; id?: string; reason: string }>;
  reconciliation: { passed: boolean; checks: Record<string, { source: number; target: number }> };
}

export async function migrateCrmExport(input: {
  exportPath: string;
  firmMap: Record<string, string>;
  orphanFirmId?: string;
}): Promise<CrmMigrationReport> {
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
  const clientRows = await database
    .select({ id: clients.id, firmId: clients.firmId, legacyId: clients.legacyConvexId })
    .from(clients);
  const clientMap = new Map(
    clientRows.filter((row) => row.legacyId).map((row) => [row.legacyId!, row]),
  );

  const migrated = Object.fromEntries(tables.map((table) => [table, 0]));
  const exceptions: CrmMigrationReport["exceptions"] = [];

  await database.transaction(async (tx) => {
    for (const record of records.get("leads") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");
        const assignedUser = record.assignedTo ? userMap.get(asString(record.assignedTo) ?? "") : undefined;
        const converted = record.convertedClientId
          ? clientMap.get(asString(record.convertedClientId) ?? "")
          : undefined;
        // fallback to orphanFirmId if neither available, though Convex leads usually don't have firmId
        const firmId = resolveFirm(record, input, assignedUser?.firmId ?? converted?.firmId);

        const source = normalizeLeadSource(record.source);
        const fullName = asString(record.fullName) ?? "Migrated Lead";
        const email = asString(record.email);
        const phone = asString(record.phone);
        const practiceAreaInterest = asString(record.practiceAreaInterest);
        const message = asString(record.message);
        const status = enumValue(
          record.status,
          ["new", "contacted", "consultation_scheduled", "converted", "lost"] as const,
          "new",
        );
        const notes = asString(record.notes);
        const intakeToken = asString(record.intakeToken);
        const intakeSubmitted = asBoolean(record.intakeSubmitted, false);
        
        await tx
          .insert(leads)
          .values({
            legacyConvexId: legacyId,
            firmId,
            fullName,
            email,
            phone,
            source,
            practiceAreaInterest,
            message,
            status,
            assignedTo: assignedUser?.id,
            convertedClientId: converted?.id,
            notes,
            intakeToken,
            intakeSubmitted,
            createdAt: toDate(record._creationTime) ?? new Date(),
          })
          .onConflictDoUpdate({
            target: leads.legacyConvexId,
            set: {
              firmId,
              fullName,
              email,
              phone,
              source,
              practiceAreaInterest,
              message,
              status,
              assignedTo: assignedUser?.id,
              convertedClientId: converted?.id,
              notes,
              intakeToken,
              intakeSubmitted,
              updatedAt: new Date(),
            },
          });
        migrated.leads += 1;
      } catch (error) {
        exceptions.push({ table: "leads", id: legacyId, reason: message(error) });
      }
    }

    for (const record of records.get("appointments") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");
        const client = record.clientId ? clientMap.get(asString(record.clientId) ?? "") : undefined;
        const lawyer = record.assignedLawyerId ? userMap.get(asString(record.assignedLawyerId) ?? "") : undefined;
        
        if (client && lawyer && client.firmId !== lawyer.firmId) {
            throw new Error("Appointment client and assigned lawyer belong to different firms");
        }
        
        const firmId = resolveFirm(record, input, client?.firmId ?? lawyer?.firmId);

        const clientName = asString(record.clientName) ?? "Migrated Client";
        const clientEmail = asString(record.clientEmail);
        const clientPhone = asString(record.clientPhone) ?? "000000000";
        const practiceArea = asString(record.practiceArea) ?? "Other";
        const date = asString(record.date) ?? new Date().toISOString().slice(0, 10);
        const timeSlot = asString(record.timeSlot) ?? "00:00";
        const notes = asString(record.notes);
        const status = enumValue(
          record.status,
          ["pending", "confirmed", "completed", "cancelled"] as const,
          "pending",
        );
        const meetingLink = asString(record.meetingLink);

        await tx
          .insert(appointments)
          .values({
            legacyConvexId: legacyId,
            firmId,
            clientName,
            clientEmail,
            clientPhone,
            clientId: client?.id,
            assignedLawyerId: lawyer?.id,
            practiceArea,
            date,
            timeSlot,
            notes,
            status,
            meetingLink,
            createdAt: toDate(record._creationTime) ?? new Date(),
          })
          .onConflictDoUpdate({
            target: appointments.legacyConvexId,
            set: {
              firmId,
              clientName,
              clientEmail,
              clientPhone,
              clientId: client?.id,
              assignedLawyerId: lawyer?.id,
              practiceArea,
              date,
              timeSlot,
              notes,
              status,
              meetingLink,
              updatedAt: new Date(),
            },
          });
        migrated.appointments += 1;
      } catch (error) {
        exceptions.push({ table: "appointments", id: legacyId, reason: message(error) });
      }
    }
  });

  const checks: Record<string, { source: number; target: number }> = {};
  for (const [name, table] of [
    ["leads", leads],
    ["appointments", appointments],
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
function toDate(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}
function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}
function normalizeLeadSource(
  value: unknown,
): "website" | "referral" | "walk_in" | "phone" | "social" | "newsletter" {
  if (typeof value !== "string") return "website";
  const normalized = value.trim().toLowerCase().replace(/-/g, "_");
  if (normalized === "walkin") return "walk_in";
  return enumValue(
    normalized,
    ["website", "referral", "walk_in", "phone", "social", "newsletter"] as const,
    "website",
  );
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
