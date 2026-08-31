import fs from "node:fs/promises";
import path from "node:path";
import { and, inArray, isNull } from "drizzle-orm";
import { getDatabase } from "../../../src/server/db/client";
import { Reconciler } from "../reconcile";
import { saveDomainReport, loadDomainReport } from "../report-store";
import { appendReconciliationReport } from "../report-writer";
import type { DomainMigrationReport } from "../types";
import { registerDomain, type MigrationDomain } from "./registry";
import {
  detailsFromReport,
  exceptionTypeForReason,
  type ReconciliationDetails,
} from "../reconciliation-details";

export interface ExportDomainConfig {
  name: string;
  /** Convex table folders expected in the export (for dry-run inventory). */
  tables: string[];
  /**
   * Call the existing `migrate*Export` service. Do not reimplement import logic here.
   */
  migrate: (input: {
    exportPath: string;
    firmMap: Record<string, string>;
    orphanFirmId?: string;
    targetFirmId?: string;
  }) => Promise<DomainMigrationReport>;
  /**
   * Optional soft-delete rollback for rows that carry `legacy_convex_id` matching the export.
   * Tables must expose `legacyConvexId` and preferably `deletedAt`.
   */
  rollback?: (input: {
    exportPath: string;
    isDryRun: boolean;
    log: (message: string) => Promise<void>;
  }) => Promise<void>;
  /** Extra notes written into the reconciliation report. */
  notes?: string[];
  /**
   * R3.5 — domain-specific enrichment (financial totals, SHA-256, etc.).
   * Runs after migrate; must not duplicate importer logic.
   */
  enrichDetails?: (input: {
    exportPath: string;
    firmMap: Record<string, string>;
    report: DomainMigrationReport;
    reconciler?: Reconciler;
  }) => Promise<Partial<ReconciliationDetails>>;
}

async function countExportTable(exportPath: string, table: string): Promise<number> {
  const candidates = [
    path.join(exportPath, table, "documents.jsonl"),
    path.join(exportPath, `${table}.jsonl`),
    path.join(exportPath, `${table}.json`),
  ];
  for (const candidate of candidates) {
    try {
      const text = await fs.readFile(candidate, "utf8");
      const trimmed = text.trim();
      if (!trimmed) return 0;
      if (trimmed.startsWith("[")) return (JSON.parse(trimmed) as unknown[]).length;
      return trimmed.split(/\r?\n/).filter(Boolean).length;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
    }
  }
  return 0;
}

async function readFirmMap(firmMapPath?: string): Promise<Record<string, string>> {
  if (!firmMapPath) return {};
  return JSON.parse(await fs.readFile(firmMapPath, "utf8")) as Record<string, string>;
}

export function registerExportDomain(config: ExportDomainConfig): void {
  const domain: MigrationDomain = {
    name: config.name,

    import: async (engine, isDryRun, options) => {
      const exportPath = options.exportPath;
      const firmMap = await readFirmMap(options.firmMapPath);
      const orphanFirmId = options.orphanFirmId;
      const targetFirmId = options.targetFirmId ?? orphanFirmId ?? Object.values(firmMap)[0];
      const fingerprint = await engine.fingerprintExport(config.tables, exportPath);

      if (isDryRun) {
        const source: Record<string, number> = {};
        for (const table of config.tables) {
          source[table] = await countExportTable(exportPath, table);
          await engine.log(`[DRY RUN] ${table}: ${source[table]} source row(s)`);
        }
        const report: DomainMigrationReport = {
          source,
          migrated: Object.fromEntries(config.tables.map((t) => [t, 0])),
          exceptions: [],
          reconciliation: {
            passed: true,
            checks: Object.fromEntries(
              config.tables.map((t) => [t, { source: source[t] ?? 0, target: 0 }]),
            ),
          },
        };
        await saveDomainReport(config.name, report);
        await appendReconciliationReport({
          domain: config.name,
          command: "import-postgres",
          dryRun: true,
          report,
          notes: [
            "Dry-run only inventories export rows; no Postgres writes.",
            "Real importers remain idempotent via legacyConvexId upserts.",
            `fingerprint=${fingerprint}`,
            ...(config.notes ?? []),
          ],
        });
        await engine.writeCheckpoint({
          domain: config.name,
          status: "dry-run",
          exportPath,
          fingerprint,
          passed: true,
          at: new Date().toISOString(),
          checks: report.reconciliation.checks,
          notes: "Dry-run inventory only; not eligible for --resume skip",
        });
        return;
      }

      const resumeHit = engine.shouldSkipImport({
        fingerprint,
        exportPath,
        resume: Boolean(options.resume),
        force: Boolean(options.force),
      });
      if (resumeHit) {
        await engine.log(
          `Resume: skipping import (checkpoint imported at ${resumeHit.at}, fingerprint=${fingerprint})`,
        );
        await engine.writeCheckpoint({
          ...resumeHit,
          status: "skipped-resume",
          at: new Date().toISOString(),
          notes: "Skipped because --resume matched prior successful import fingerprint",
        });
        return;
      }

      await engine.log(`Delegating import to existing ${config.name} migration service`);
      const report = await config.migrate({
        exportPath,
        firmMap,
        orphanFirmId,
        targetFirmId,
      });
      await saveDomainReport(config.name, report);
      const importDetails = await buildDetails(config, {
        exportPath,
        firmMap,
        report,
      });
      report.details = importDetails;
      await saveDomainReport(config.name, report);
      await appendReconciliationReport({
        domain: config.name,
        command: "import-postgres",
        report,
        details: importDetails,
        notes: [...(config.notes ?? []), `fingerprint=${fingerprint}`],
      });
      if (report.exceptions.length > 0) {
        const reconciler = new Reconciler(config.name);
        for (const ex of report.exceptions) {
          reconciler.addException({
            table: ex.table,
            id: ex.id,
            type: exceptionTypeForReason(ex.reason),
            reason: ex.reason,
          });
        }
        await reconciler.writeExceptions();
      }
      await engine.writeCheckpoint({
        domain: config.name,
        status: report.reconciliation.passed ? "imported" : "failed",
        exportPath,
        fingerprint,
        passed: report.reconciliation.passed,
        at: new Date().toISOString(),
        checks: report.reconciliation.checks,
      });
      if (report.reconciliation.passed) {
        engine.clearTableOffsets();
        await engine.saveState();
      }
      if (!report.reconciliation.passed) {
        throw new Error(
          `${config.name} import reconcile failed (${report.exceptions.length} exception(s))`,
        );
      }
      await engine.log(`Import complete. checks=${JSON.stringify(report.reconciliation.checks)}`);
    },

    reconcile: async (engine, reconciler, options) => {
      // Re-run the real importer (idempotent) to refresh checks, or use last report.
      const exportPath = options.exportPath;
      const firmMap = await readFirmMap(options.firmMapPath);
      const orphanFirmId = options.orphanFirmId;
      const targetFirmId = options.targetFirmId ?? orphanFirmId ?? Object.values(firmMap)[0];

      await engine.log(`Re-running ${config.name} migrate for reconciliation (idempotent)`);
      const report = await config.migrate({
        exportPath,
        firmMap,
        orphanFirmId,
        targetFirmId,
      });
      await saveDomainReport(config.name, report);

      for (const [table, check] of Object.entries(report.reconciliation.checks)) {
        reconciler.checkRowCount(table, check.source, check.target);
      }
      for (const ex of report.exceptions) {
        reconciler.addException({
          table: ex.table,
          id: ex.id,
          type: exceptionTypeForReason(ex.reason),
          reason: ex.reason,
        });
      }
      const details = await buildDetails(config, {
        exportPath,
        firmMap,
        report,
        reconciler,
      });
      report.details = details;
      await saveDomainReport(config.name, report);
      await appendReconciliationReport({
        domain: config.name,
        command: "reconcile",
        report,
        details,
        notes: config.notes,
      });
    },

    verify: async (engine) => {
      const report = await loadDomainReport(config.name);
      if (!report) {
        await engine.log(`No saved report for ${config.name}. Run import-postgres first.`);
        return false;
      }
      const passed = report.reconciliation.passed && report.exceptions.length === 0;
      await engine.log(
        `Verify from last report: passed=${passed} exceptions=${report.exceptions.length}`,
      );
      await appendReconciliationReport({
        domain: config.name,
        command: "verify",
        report,
        notes: ["Verified against last saved `.migration-reports` snapshot."],
      });
      return passed;
    },

    rollback: async (engine, isDryRun, options) => {
      if (config.rollback) {
        await config.rollback({
          exportPath: options.exportPath,
          isDryRun,
          log: (message) => engine.log(message),
        });
        return;
      }
      await engine.log(
        `No domain-specific rollback registered for ${config.name}. Soft-delete via legacyConvexId is not configured.`,
      );
    },
  };

  registerDomain(domain);
}

/** Soft-delete helper used by domain rollback wrappers. */
export async function softDeleteByLegacyIds(input: {
  tableName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: { legacyConvexId: any; deletedAt: any; id: any };
  legacyIds: string[];
  isDryRun: boolean;
  log: (message: string) => Promise<void>;
}) {
  if (input.legacyIds.length === 0) {
    await input.log(`No legacy IDs for ${input.tableName}`);
    return;
  }
  if (input.isDryRun) {
    await input.log(
      `[DRY RUN] Would soft-delete ${input.legacyIds.length} ${input.tableName} row(s)`,
    );
    return;
  }
  const db = getDatabase();
  await db
    .update(input.table)
    .set({ deletedAt: new Date() })
    .where(
      and(inArray(input.table.legacyConvexId, input.legacyIds), isNull(input.table.deletedAt)),
    );
  await input.log(`Soft-deleted matching ${input.tableName} rows`);
}

async function buildDetails(
  config: ExportDomainConfig,
  input: {
    exportPath: string;
    firmMap: Record<string, string>;
    report: DomainMigrationReport;
    reconciler?: Reconciler;
  },
): Promise<ReconciliationDetails> {
  const extra = config.enrichDetails
    ? await config.enrichDetails({
        exportPath: input.exportPath,
        firmMap: input.firmMap,
        report: input.report,
        reconciler: input.reconciler,
      })
    : {};
  return detailsFromReport(input.report, extra);
}

export async function readLegacyIdsFromExport(
  exportPath: string,
  table: string,
): Promise<string[]> {
  const candidates = [
    path.join(exportPath, table, "documents.jsonl"),
    path.join(exportPath, `${table}.jsonl`),
  ];
  for (const candidate of candidates) {
    try {
      const text = (await fs.readFile(candidate, "utf8")).trim();
      if (!text) return [];
      const rows = text.startsWith("[")
        ? (JSON.parse(text) as Array<{ _id?: string }>)
        : text
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line) => JSON.parse(line) as { _id?: string });
      return rows.map((r) => r._id).filter((id): id is string => Boolean(id));
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
    }
  }
  return [];
}
