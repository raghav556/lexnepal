import { returningUpsert } from "@/server/db/mysql-returning";
import { eq } from "drizzle-orm";
import { returningMutation } from "@/server/db/mysql-returning";
import { sql } from "drizzle-orm";
/* eslint-disable @typescript-eslint/no-explicit-any -- migration input is untrusted heterogeneous legacy JSON */
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { inArray } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import {
  cases,
  hearings,
  researchNotes,
  researchNoteTags,
  sopTemplates,
  sopTemplateTasks,
  taskComments,
  tasks,
  taskWatchers,
  users,
} from "@/server/db/schema";

type Value = Record<string, unknown>;
const tables = [
  "tasks",
  "taskWatchers",
  "taskComments",
  "hearings",
  "researchNotes",
  "sopTemplates",
  "sopTemplateTasks",
] as const;

export interface WorkManagementMigrationReport {
  source: Record<string, number>;
  migrated: Record<string, number>;
  exceptions: Array<{ table: string; id?: string; reason: string }>;
  reconciliation: { passed: boolean; checks: Record<string, { source: number; target: number }> };
}

export async function migrateWorkManagementExport(input: {
  exportPath: string;
  firmMap: Record<string, string>;
  orphanFirmId?: string;
}): Promise<WorkManagementMigrationReport> {
  const reader = await createReader(input.exportPath);
  const records = new Map<string, Value[]>();
  for (const table of tables) {
    try {
      records.set(table, await reader.readTable(table));
    } catch {
      // A table missing from the export simply has nothing to migrate.
      records.set(table, []);
    }
  }

  const database = getDatabase();

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
  const exceptions: WorkManagementMigrationReport["exceptions"] = [];

  const taskMap = new Map<string, { id: string; firmId: string }>();
  const hearingMap = new Map<string, { id: string; firmId: string }>();
  const researchNoteMap = new Map<string, { id: string; firmId: string }>();
  const sopTemplateMap = new Map<string, { id: string; firmId: string }>();

  await database.transaction(async (tx) => {
    // 1. Hearings
    for (const record of records.get("hearings") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");
        const caseRecord = caseMap.get(asString(record.caseId) ?? "");
        if (!caseRecord) throw new Error("Case missing");

        const firmId = resolveFirm(record, input, caseRecord.firmId);

        const [row] = await returningUpsert(
          tx
            .insert(hearings)
            .values({
              legacyConvexId: legacyId,
              firmId,
              caseId: caseRecord.id,
              court: asString(record.court) ?? "Unknown",
              judge: asString(record.judge),
              dateGregorian:
                dateOnly(record.dateGregorian) ?? new Date().toISOString().split("T")[0]!,
              dateBs: asString(record.dateBs) ?? "",
              hearingTime: asString(record.hearingTime),
              purpose: asString(record.purpose),
              outcome: asString(record.outcome),
              nextDateGregorian: dateOnly(record.nextDateGregorian),
              nextDateBs: asString(record.nextDateBs),
              status: enumValue(
                record.status,
                [
                  "scheduled",
                  "completed",
                  "adjourned",
                  "cancelled",
                  "postponed",
                  "not_reached",
                  "bench_disqualified",
                  "could_not_present",
                  "part_heard",
                  "continuous",
                  "procedural_order",
                  "evidence_exam",
                  "final_judgment",
                  "dismissed",
                  "settled",
                  "archived",
                  "on_hold",
                ] as const,
                "scheduled",
              ),
              notes: asString(record.notes),
              createdAt: toDate(record._creationTime) ?? new Date(),
            })
            .onDuplicateKeyUpdate({
              set: {
                firmId,
                caseId: caseRecord.id,
                court: asString(record.court) ?? "Unknown",
                updatedAt: new Date(),
              },
            }),
          () => tx.select().from(hearings).where(eq(hearings.legacyConvexId, legacyId)).limit(1),
        );

        hearingMap.set(legacyId, row);
        migrated.hearings += 1;
      } catch (error) {
        exceptions.push({ table: "hearings", id: legacyId, reason: message(error) });
      }
    }

    // 2. Tasks
    for (const record of records.get("tasks") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");

        const assignee = userMap.get(asString(record.assignedTo) ?? "");
        const creator = userMap.get(asString(record.createdBy) ?? "");

        if (!assignee || !creator) throw new Error("Assignee or creator missing");

        let firmId = assignee.firmId;
        const caseRecord = record.caseId ? caseMap.get(asString(record.caseId) ?? "") : null;
        if (caseRecord) {
          firmId = resolveFirm(record, input, caseRecord.firmId);
        } else {
          firmId = resolveFirm(record, input, firmId);
        }

        const hearingRecord = record.hearingId
          ? hearingMap.get(asString(record.hearingId) ?? "")
          : null;

        const [row] = await returningUpsert(
          tx
            .insert(tasks)
            .values({
              legacyConvexId: legacyId,
              firmId,
              title: asString(record.title) ?? "Migrated task",
              description: asString(record.description),
              assignedTo: assignee.id,
              createdBy: creator.id,
              status: enumValue(
                record.status,
                ["todo", "in_progress", "done", "cancelled"] as const,
                "todo",
              ),
              priority: enumValue(
                record.priority,
                ["low", "medium", "high", "urgent"] as const,
                "medium",
              ),
              category: enumValue(
                record.category,
                ["filing", "research", "client", "court", "admin", "other"] as const,
                "other",
              ),
              dueDate: toDate(record.dueDate),
              dueDateBs: asString(record.dueDateBs),
              caseId: caseRecord?.id,
              hearingId: hearingRecord?.id,
              isRecurring: asBoolean(record.isRecurring, false),
              recurrenceRule: enumValue(
                record.recurrenceRule,
                ["daily", "weekly", "monthly"] as const,
                "daily",
              ),
              completedAt: toDate(record.completedAt),
              createdAt: toDate(record._creationTime) ?? new Date(),
            })
            .onDuplicateKeyUpdate({
              set: {
                firmId,
                title: asString(record.title) ?? "Migrated task",
                updatedAt: new Date(),
              },
            }),
          () => tx.select().from(tasks).where(eq(tasks.legacyConvexId, legacyId)).limit(1),
        );

        taskMap.set(legacyId, row);
        migrated.tasks += 1;
      } catch (error) {
        exceptions.push({ table: "tasks", id: legacyId, reason: message(error) });
      }
    }

    // 2b. Task Watchers
    for (const record of records.get("taskWatchers") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");
        const taskRow = taskMap.get(asString(record.taskId) ?? "");
        if (!taskRow) throw new Error("Task missing");
        const watcher = userMap.get(asString(record.userId) ?? "");
        if (!watcher) throw new Error("Watcher user missing");
        const firmId = resolveFirm(record, input, taskRow.firmId);
        await tx
          .insert(taskWatchers)
          .values({
            legacyConvexId: legacyId,
            firmId,
            taskId: taskRow.id,
            userId: watcher.id,
            createdAt: toDate(record._creationTime) ?? new Date(),
          })
          .onDuplicateKeyUpdate({
            set: {
              firmId,
              taskId: taskRow.id,
              userId: watcher.id,
              updatedAt: new Date(),
            },
          });
        migrated.taskWatchers += 1;
      } catch (error) {
        exceptions.push({ table: "taskWatchers", id: legacyId, reason: message(error) });
      }
    }

    // 3. Task Comments
    for (const record of records.get("taskComments") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");

        const taskRow = taskMap.get(asString(record.taskId) ?? "");
        if (!taskRow) throw new Error("Task missing");

        const author = userMap.get(asString(record.authorId) ?? "");
        if (!author) throw new Error("Author missing");

        const firmId = resolveFirm(record, input, taskRow.firmId);

        await tx
          .insert(taskComments)
          .values({
            legacyConvexId: legacyId,
            firmId,
            taskId: taskRow.id,
            authorId: author.id,
            content: asString(record.content) ?? "",
            createdAt: toDate(record._creationTime) ?? new Date(),
          })
          .onDuplicateKeyUpdate({
            set: {
              firmId,
              content: asString(record.content) ?? "",
              updatedAt: new Date(),
            },
          });

        migrated.taskComments += 1;
      } catch (error) {
        exceptions.push({ table: "taskComments", id: legacyId, reason: message(error) });
      }
    }

    // 4. Research Notes
    for (const record of records.get("researchNotes") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");

        const author = userMap.get(asString(record.authorId) ?? "");
        if (!author) throw new Error("Author missing");

        const firmId = resolveFirm(record, input, author.firmId);

        const [row] = await returningUpsert(
          tx
            .insert(researchNotes)
            .values({
              legacyConvexId: legacyId,
              firmId,
              title: asString(record.title) ?? "Migrated Note",
              content: asString(record.content) ?? "",
              category: enumValue(
                record.category,
                [
                  "supreme_court",
                  "high_court",
                  "district_court",
                  "commentary",
                  "procedure",
                  "template_research",
                ] as const,
                "commentary",
              ),
              authorId: author.id,
              createdAt: toDate(record._creationTime) ?? new Date(),
            })
            .onDuplicateKeyUpdate({
              set: {
                firmId,
                title: asString(record.title) ?? "Migrated Note",
                updatedAt: new Date(),
              },
            }),
          () =>
            tx
              .select()
              .from(researchNotes)
              .where(eq(researchNotes.legacyConvexId, legacyId))
              .limit(1),
        );

        researchNoteMap.set(legacyId, row);

        if (Array.isArray(record.tags)) {
          for (const tag of record.tags) {
            if (typeof tag === "string" && tag.trim()) {
              await tx
                .insert(researchNoteTags)
                .values({
                  firmId,
                  researchNoteId: row.id,
                  tag: tag.trim(),
                })
                .onDuplicateKeyUpdate({ set: { id: sql.raw("id") } });
            }
          }
        }

        migrated.researchNotes += 1;
      } catch (error) {
        exceptions.push({ table: "researchNotes", id: legacyId, reason: message(error) });
      }
    }

    // 5. SOP Templates
    for (const record of records.get("sopTemplates") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");
        const firmId = resolveFirm(record, input);

        const [row] = await returningUpsert(
          tx
            .insert(sopTemplates)
            .values({
              legacyConvexId: legacyId,
              firmId,
              key: asString(record.key) ?? `migrated-${legacyId}`,
              label: asString(record.label) ?? "Migrated SOP",
              defaultPriority: enumValue(
                record.defaultPriority,
                ["low", "medium", "high", "urgent"] as const,
                "medium",
              ),
              practiceArea: asString(record.practiceArea),
              createdAt: toDate(record._creationTime) ?? new Date(),
            })
            .onDuplicateKeyUpdate({
              set: {
                firmId,
                label: asString(record.label) ?? "Migrated SOP",
                updatedAt: new Date(),
              },
            }),
          () =>
            tx
              .select()
              .from(sopTemplates)
              .where(eq(sopTemplates.legacyConvexId, legacyId))
              .limit(1),
        );

        sopTemplateMap.set(legacyId, row);
        migrated.sopTemplates += 1;
      } catch (error) {
        exceptions.push({ table: "sopTemplates", id: legacyId, reason: message(error) });
      }
    }

    // 6. SOP Template Tasks
    for (const record of records.get("sopTemplateTasks") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");

        const templateRow = sopTemplateMap.get(asString(record.templateId) ?? "");
        if (!templateRow) throw new Error("Template missing");

        const firmId = resolveFirm(record, input, templateRow.firmId);

        await tx
          .insert(sopTemplateTasks)
          .values({
            legacyConvexId: legacyId,
            firmId,
            sopTemplateId: templateRow.id,
            title: asString(record.title) ?? "Task",
            position: asNumber(record.position, 0),
            createdAt: toDate(record._creationTime) ?? new Date(),
          })
          .onDuplicateKeyUpdate({
            set: {
              firmId,
              title: asString(record.title) ?? "Task",
              updatedAt: new Date(),
            },
          });

        migrated.sopTemplateTasks += 1;
      } catch (error) {
        exceptions.push({ table: "sopTemplateTasks", id: legacyId, reason: message(error) });
      }
    }
  });

  const checks: Record<string, { source: number; target: number }> = {};
  for (const [name, table] of [
    ["tasks", tasks],
    ["taskWatchers", taskWatchers],
    ["hearings", hearings],
    ["researchNotes", researchNotes],
    ["sopTemplates", sopTemplates],
    ["sopTemplateTasks", sopTemplateTasks],
    ["taskComments", taskComments],
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
