/* eslint-disable @typescript-eslint/no-explicit-any -- table metadata is heterogeneous during reconciliation */
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { eq, inArray } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import {
  blogPosts,
  careerRequirements,
  careers,
  cmsSettings,
  firms,
  jobApplications,
  legalPages,
  navigation,
  newsAndAwards,
  newsletterSubscribers,
  practiceAreas,
  resources,
  testimonials,
} from "@/server/db/schema";

type Value = Record<string, unknown>;
const tables = [
  "testimonials",
  "newsletterSubscribers",
  "legalPages",
  "cmsSettings",
  "practiceAreas",
  "careers",
  "jobApplications",
  "resources",
  "newsAndAwards",
  "blogPosts",
  "navigation",
] as const;
export interface CmsMigrationReport {
  source: Record<string, number>;
  migrated: Record<string, number>;
  exceptions: Array<{ table: string; id?: string; reason: string }>;
  reconciliation: { passed: boolean; checks: Record<string, { source: number; target: number }> };
}

export async function migrateCmsExport(input: {
  exportPath: string;
  targetFirmId: string;
}): Promise<CmsMigrationReport> {
  const reader = await createReader(input.exportPath);
  const records = new Map<string, Value[]>();
  for (const table of tables) records.set(table, await reader.readTable(table));
  const database = getDatabase();
  const [firm] = await database
    .select({ id: firms.id })
    .from(firms)
    .where(eq(firms.id, input.targetFirmId))
    .limit(1);
  if (!firm) throw new Error("Target firm does not exist");
  const migrated = Object.fromEntries(tables.map((name) => [name, 0]));
  const exceptions: CmsMigrationReport["exceptions"] = [];
  await database.transaction(async (tx) => {
    for (const row of records.get("testimonials") ?? [])
      await migrate(
        "testimonials",
        row,
        async (id) =>
          tx
            .insert(testimonials)
            .values({
              legacyConvexId: id,
              firmId: input.targetFirmId,
              clientName: textValue(row.clientName)!,
              company: textValue(row.company),
              quote: textValue(row.quote)!,
              rating: numberValue(row.rating),
              isApproved: boolValue(row.isApproved, false),
              avatarUrl: textValue(row.avatarUrl),
              createdAt: dateValue(row._creationTime),
            })
            .onConflictDoUpdate({
              target: testimonials.legacyConvexId,
              set: {
                clientName: textValue(row.clientName)!,
                quote: textValue(row.quote)!,
                isApproved: boolValue(row.isApproved, false),
                updatedAt: new Date(),
              },
            }),
        migrated,
        exceptions,
      );
    for (const row of records.get("newsletterSubscribers") ?? [])
      await migrate(
        "newsletterSubscribers",
        row,
        async (id) =>
          tx
            .insert(newsletterSubscribers)
            .values({
              legacyConvexId: id,
              firmId: input.targetFirmId,
              email: textValue(row.email)!.toLowerCase(),
              subscribedAt: dateValue(row.subscribedAt ?? row._creationTime),
              isActive: boolValue(row.isActive, true),
              createdAt: dateValue(row._creationTime),
            })
            .onConflictDoUpdate({
              target: newsletterSubscribers.legacyConvexId,
              set: { isActive: boolValue(row.isActive, true), updatedAt: new Date() },
            }),
        migrated,
        exceptions,
      );
    for (const row of records.get("legalPages") ?? [])
      await migrate(
        "legalPages",
        row,
        async (id) =>
          tx
            .insert(legalPages)
            .values({
              legacyConvexId: id,
              firmId: input.targetFirmId,
              slug: enumValue(row.slug, ["privacy-policy", "terms"])!,
              title: textValue(row.title)!,
              content: textValue(row.content)!,
              contentUpdatedAt: dateValue(row.updatedAt ?? row._creationTime),
              createdAt: dateValue(row._creationTime),
            })
            .onConflictDoUpdate({
              target: legalPages.legacyConvexId,
              set: {
                title: textValue(row.title)!,
                content: textValue(row.content)!,
                contentUpdatedAt: dateValue(row.updatedAt),
                updatedAt: new Date(),
              },
            }),
        migrated,
        exceptions,
      );
    for (const row of records.get("cmsSettings") ?? [])
      await migrate(
        "cmsSettings",
        row,
        async (id) => {
          const key = textValue(row.key)!;
          if (/(secret|token|password|private|script|apiKey)/i.test(key))
            throw new Error("Unsafe CMS setting key is intentionally excluded");
          return tx
            .insert(cmsSettings)
            .values({
              legacyConvexId: id,
              firmId: input.targetFirmId,
              key,
              value: row.value ?? null,
              createdAt: dateValue(row._creationTime),
            })
            .onConflictDoUpdate({
              target: cmsSettings.legacyConvexId,
              set: { value: row.value ?? null, updatedAt: new Date() },
            });
        },
        migrated,
        exceptions,
      );
    for (const row of records.get("practiceAreas") ?? [])
      await migrate(
        "practiceAreas",
        row,
        async (id) =>
          tx
            .insert(practiceAreas)
            .values({
              legacyConvexId: id,
              firmId: input.targetFirmId,
              title: textValue(row.title)!,
              description: textValue(row.description)!,
              icon: textValue(row.iconName ?? row.icon) ?? "Briefcase",
              slug: textValue(row.slug)!,
              isActive: boolValue(row.isActive, true),
              createdAt: dateValue(row._creationTime),
            })
            .onConflictDoUpdate({
              target: practiceAreas.legacyConvexId,
              set: {
                title: textValue(row.title)!,
                description: textValue(row.description)!,
                isActive: boolValue(row.isActive, true),
                updatedAt: new Date(),
              },
            }),
        migrated,
        exceptions,
      );

    const careerMap = new Map<string, string>();
    for (const row of records.get("careers") ?? [])
      await migrate(
        "careers",
        row,
        async (id) => {
          const [created] = await tx
            .insert(careers)
            .values({
              legacyConvexId: id,
              firmId: input.targetFirmId,
              title: textValue(row.title)!,
              department: textValue(row.department)!,
              location: textValue(row.location)!,
              type: enumValue(row.type, ["full_time", "part_time", "contract", "internship"])!,
              description: textValue(row.description)!,
              isActive: boolValue(row.isActive, true),
              postedDate: dateOnly(row.postedDate),
              createdAt: dateValue(row._creationTime),
            })
            .onConflictDoUpdate({
              target: careers.legacyConvexId,
              set: {
                title: textValue(row.title)!,
                isActive: boolValue(row.isActive, true),
                updatedAt: new Date(),
              },
            })
            .returning({ id: careers.id });
          careerMap.set(id, created.id);
          await tx.delete(careerRequirements).where(eq(careerRequirements.careerId, created.id));
          const requirements = stringArray(row.requirements);
          if (requirements.length)
            await tx.insert(careerRequirements).values(
              requirements.map((requirement, position) => ({
                firmId: input.targetFirmId,
                careerId: created.id,
                requirement,
                position,
              })),
            );
        },
        migrated,
        exceptions,
      );
    for (const row of records.get("jobApplications") ?? [])
      await migrate(
        "jobApplications",
        row,
        async (id) => {
          const jobId = careerMap.get(textValue(row.jobId) ?? "");
          if (!jobId) throw new Error("Referenced career was not migrated");
          return tx
            .insert(jobApplications)
            .values({
              legacyConvexId: id,
              firmId: input.targetFirmId,
              jobId,
              applicantName: textValue(row.applicantName)!,
              email: textValue(row.email)!.toLowerCase(),
              phone: textValue(row.phone)!,
              resumeUrl: textValue(row.resumeUrl),
              coverLetter: textValue(row.coverLetter),
              status:
                enumValue(row.status, ["new", "reviewed", "interviewed", "rejected", "hired"]) ??
                "new",
              appliedDate: dateOnly(row.appliedDate),
              createdAt: dateValue(row._creationTime),
            })
            .onConflictDoUpdate({
              target: jobApplications.legacyConvexId,
              set: {
                status:
                  enumValue(row.status, ["new", "reviewed", "interviewed", "rejected", "hired"]) ??
                  "new",
                updatedAt: new Date(),
              },
            });
        },
        migrated,
        exceptions,
      );
    for (const row of records.get("resources") ?? [])
      await migrate(
        "resources",
        row,
        async (id) =>
          tx
            .insert(resources)
            .values({
              legacyConvexId: id,
              firmId: input.targetFirmId,
              title: textValue(row.title)!,
              description: textValue(row.description)!,
              category: textValue(row.category)!,
              coverImageUrl: textValue(row.coverImageUrl),
              fileUrl: textValue(row.fileUrl)!,
              isGated: boolValue(row.isGated, false),
              downloads: numberValue(row.downloads) ?? 0,
              publishedDate: dateOnly(row.publishedDate),
              createdAt: dateValue(row._creationTime),
            })
            .onConflictDoUpdate({
              target: resources.legacyConvexId,
              set: {
                title: textValue(row.title)!,
                downloads: numberValue(row.downloads) ?? 0,
                updatedAt: new Date(),
              },
            }),
        migrated,
        exceptions,
      );
    for (const row of records.get("newsAndAwards") ?? [])
      await migrate(
        "newsAndAwards",
        row,
        async (id) =>
          tx
            .insert(newsAndAwards)
            .values({
              legacyConvexId: id,
              firmId: input.targetFirmId,
              title: textValue(row.title)!,
              excerpt: textValue(row.excerpt)!,
              content: textValue(row.content)!,
              publicationDate: dateOnly(row.date),
              type: enumValue(row.type, ["award", "press_release", "firm_news"])!,
              linkUrl: textValue(row.linkUrl),
              imageUrl: textValue(row.imageUrl),
              createdAt: dateValue(row._creationTime),
            })
            .onConflictDoUpdate({
              target: newsAndAwards.legacyConvexId,
              set: { title: textValue(row.title)!, updatedAt: new Date() },
            }),
        migrated,
        exceptions,
      );
    for (const row of records.get("blogPosts") ?? [])
      await migrate(
        "blogPosts",
        row,
        async (id) =>
          tx
            .insert(blogPosts)
            .values({
              legacyConvexId: id,
              firmId: input.targetFirmId,
              title: textValue(row.title)!,
              slug: textValue(row.slug)!,
              category: textValue(row.category)!,
              excerpt: textValue(row.excerpt)!,
              content: textValue(row.content)!,
              coverImageUrl: textValue(row.coverImageUrl),
              author: textValue(row.author)!,
              status: enumValue(row.status, ["draft", "published"])!,
              publishDate: optionalDate(row.publishDate),
              seoTitle: textValue(row.seoTitle),
              seoDescription: textValue(row.seoDescription),
              createdAt: dateValue(row._creationTime),
            })
            .onConflictDoUpdate({
              target: blogPosts.legacyConvexId,
              set: {
                title: textValue(row.title)!,
                status: enumValue(row.status, ["draft", "published"])!,
                publishDate: optionalDate(row.publishDate),
                updatedAt: new Date(),
              },
            }),
        migrated,
        exceptions,
      );

    const navigationMap = new Map<string, string>();
    for (const row of records.get("navigation") ?? [])
      await migrate(
        "navigation",
        row,
        async (id) => {
          const [created] = await tx
            .insert(navigation)
            .values({
              legacyConvexId: id,
              firmId: input.targetFirmId,
              label: textValue(row.label)!,
              url: textValue(row.url)!,
              location: enumValue(row.location, ["header", "footer_col_1", "footer_col_2"])!,
              order: numberValue(row.order) ?? 0,
              isActive: boolValue(row.isActive, true),
              parentId: null,
              openInNewTab: boolValue(row.openInNewTab, false),
              createdAt: dateValue(row._creationTime),
            })
            .onConflictDoUpdate({
              target: navigation.legacyConvexId,
              set: {
                label: textValue(row.label)!,
                url: textValue(row.url)!,
                order: numberValue(row.order) ?? 0,
                updatedAt: new Date(),
              },
            })
            .returning({ id: navigation.id });
          navigationMap.set(id, created.id);
        },
        migrated,
        exceptions,
      );
    for (const row of records.get("navigation") ?? []) {
      const id = textValue(row._id);
      const parentLegacy = textValue(row.parentId);
      if (id && parentLegacy && navigationMap.has(id) && navigationMap.has(parentLegacy))
        await tx
          .update(navigation)
          .set({ parentId: navigationMap.get(parentLegacy) })
          .where(eq(navigation.id, navigationMap.get(id)!));
    }
  });
  const checks: Record<string, { source: number; target: number }> = {};
  const mappings: Array<[string, any]> = [
    ["testimonials", testimonials],
    ["newsletterSubscribers", newsletterSubscribers],
    ["legalPages", legalPages],
    ["cmsSettings", cmsSettings],
    ["practiceAreas", practiceAreas],
    ["careers", careers],
    ["jobApplications", jobApplications],
    ["resources", resources],
    ["newsAndAwards", newsAndAwards],
    ["blogPosts", blogPosts],
    ["navigation", navigation],
  ];
  for (const [name, table] of mappings) {
    const ids = (records.get(name) ?? [])
      .map((row) => textValue(row._id))
      .filter(Boolean) as string[];
    const target = ids.length
      ? (
          await database
            .select({ id: table.legacyConvexId })
            .from(table)
            .where(inArray(table.legacyConvexId, ids))
        ).length
      : 0;
    checks[name] = { source: migrated[name], target };
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

async function migrate(
  table: string,
  row: Value,
  action: (id: string) => Promise<unknown>,
  migrated: Record<string, number>,
  exceptions: CmsMigrationReport["exceptions"],
) {
  const id = textValue(row._id);
  if (!id) {
    exceptions.push({ table, reason: "Missing Convex ID" });
    return;
  }
  try {
    await action(id);
    migrated[table] += 1;
  } catch (error) {
    exceptions.push({
      table,
      id,
      reason: error instanceof Error ? error.message : "Migration failed",
    });
  }
}
interface Reader {
  readTable(name: string): Promise<Value[]>;
}
async function createReader(exportPath: string): Promise<Reader> {
  const resolved = path.resolve(exportPath);
  const stat = await fs.stat(resolved);
  if (stat.isDirectory())
    return { readTable: (name) => readLines(path.join(resolved, name, "documents.jsonl")) };
  const zip = await JSZip.loadAsync(await fs.readFile(resolved));
  return {
    readTable: async (name) => {
      const file = zip.file(`${name}/documents.jsonl`) ?? zip.file(`${name}.jsonl`);
      return file ? parseLines(await file.async("string")) : [];
    },
  };
}
async function readLines(file: string) {
  try {
    return parseLines(await fs.readFile(file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
function parseLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Value);
}
function textValue(value: unknown) {
  return typeof value === "string" && value.length ? value : undefined;
}
function boolValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}
function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}
function enumValue<const T extends readonly string[]>(
  value: unknown,
  values: T,
): T[number] | undefined {
  return typeof value === "string" && values.includes(value) ? (value as T[number]) : undefined;
}
function dateValue(value: unknown) {
  const date =
    typeof value === "number" || typeof value === "string" ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}
function optionalDate(value: unknown) {
  const text = textValue(value);
  return text ? dateValue(text) : null;
}
function dateOnly(value: unknown) {
  return dateValue(value).toISOString().slice(0, 10);
}
