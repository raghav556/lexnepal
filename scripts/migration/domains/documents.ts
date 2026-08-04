import fs from "node:fs/promises";
import path from "node:path";
import { inArray } from "drizzle-orm";
import { getDatabase } from "../../../src/server/db/client";
import { documents } from "../../../src/server/db/schema";
import {
  migrateDocuments,
  migrateDocumentShares,
} from "../../../src/server/services/document-migration";
import { registerDomain } from "./registry";
import { saveDomainReport, loadDomainReport } from "../report-store";
import { appendReconciliationReport } from "../report-writer";
import { Reconciler } from "../reconcile";
import type { DomainMigrationReport } from "../types";
import { readLegacyIdsFromExport, softDeleteByLegacyIds } from "./create-export-domain";
import { exceptionTypeForReason } from "../reconciliation-details";

async function resolveJsonl(exportPath: string, table: string): Promise<string | null> {
  const candidates = [
    path.join(exportPath, table, "documents.jsonl"),
    path.join(exportPath, `${table}.jsonl`),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      /* continue */
    }
  }
  return null;
}

async function countJsonl(filePath: string | null): Promise<number> {
  if (!filePath) return 0;
  const text = (await fs.readFile(filePath, "utf8")).trim();
  if (!text) return 0;
  if (text.startsWith("[")) return (JSON.parse(text) as unknown[]).length;
  return text.split(/\r?\n/).filter(Boolean).length;
}

async function readFirmMap(firmMapPath?: string): Promise<Record<string, string>> {
  if (!firmMapPath) return {};
  return JSON.parse(await fs.readFile(firmMapPath, "utf8")) as Record<string, string>;
}

async function runDocumentsImport(
  exportPath: string,
  firmMapPath?: string,
): Promise<DomainMigrationReport> {
  const firmMap = await readFirmMap(firmMapPath);
  const docsPath = await resolveJsonl(exportPath, "documents");
  const sharesPath = await resolveJsonl(exportPath, "documentShares");
  const exceptions: DomainMigrationReport["exceptions"] = [];
  const source = {
    documents: await countJsonl(docsPath),
    documentShares: await countJsonl(sharesPath),
  };
  let migratedDocs = 0;
  let migratedShares = 0;

  if (docsPath) {
    const report = await migrateDocuments(docsPath, { firmMap });
    migratedDocs = report.migrated.documents ?? 0;
    exceptions.push(...report.exceptions);
  }
  if (sharesPath) {
    const report = await migrateDocumentShares(sharesPath, { firmMap });
    migratedShares = report.migrated.documentShares ?? 0;
    exceptions.push(...report.exceptions);
  }

  const db = getDatabase();
  const docIds = docsPath ? await readLegacyIdsFromExport(exportPath, "documents") : [];
  const docTarget = docIds.length
    ? (
        await db
          .select({ id: documents.id })
          .from(documents)
          .where(inArray(documents.legacyConvexId, docIds))
      ).length
    : 0;

  const checks = {
    documents: { source: source.documents, target: docTarget },
    documentShares: { source: source.documentShares, target: migratedShares },
  };
  if (checks.documents.source !== checks.documents.target) {
    exceptions.push({
      table: "documents",
      reason: `Row count mismatch source=${checks.documents.source} target=${checks.documents.target}`,
    });
  }

  return {
    source,
    migrated: { documents: migratedDocs, documentShares: migratedShares },
    exceptions,
    reconciliation: { passed: exceptions.length === 0, checks },
  };
}

registerDomain({
  name: "documents",

  import: async (engine, isDryRun, options) => {
    const exportPath = options.exportPath;
    const fingerprint = await engine.fingerprintExport(["documents", "documentShares"], exportPath);
    if (isDryRun) {
      const docsPath = await resolveJsonl(exportPath, "documents");
      const sharesPath = await resolveJsonl(exportPath, "documentShares");
      const source = {
        documents: await countJsonl(docsPath),
        documentShares: await countJsonl(sharesPath),
      };
      await engine.log(`[DRY RUN] documents=${source.documents} shares=${source.documentShares}`);
      const report: DomainMigrationReport = {
        source,
        migrated: { documents: 0, documentShares: 0 },
        exceptions: [],
        reconciliation: {
          passed: true,
          checks: {
            documents: { source: source.documents, target: 0 },
            documentShares: { source: source.documentShares, target: 0 },
          },
        },
      };
      await saveDomainReport("documents", report);
      await appendReconciliationReport({
        domain: "documents",
        command: "import-postgres",
        dryRun: true,
        report,
        notes: [
          "Wraps existing document-migration.ts; firmMap resolves hyphenated Convex IDs.",
          `fingerprint=${fingerprint}`,
        ],
      });
      await engine.writeCheckpoint({
        domain: "documents",
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
        `Resume: skipping documents import (checkpoint at ${resumeHit.at}, fingerprint=${fingerprint})`,
      );
      await engine.writeCheckpoint({
        ...resumeHit,
        status: "skipped-resume",
        at: new Date().toISOString(),
        notes: "Skipped because --resume matched prior successful import fingerprint",
      });
      return;
    }

    await engine.log("Delegating to existing document-migration service");
    const report = await runDocumentsImport(exportPath, options.firmMapPath);
    await saveDomainReport("documents", report);
    await appendReconciliationReport({
      domain: "documents",
      command: "import-postgres",
      report,
      notes: [`fingerprint=${fingerprint}`],
    });
    if (report.exceptions.length) {
      const reconciler = new Reconciler("documents");
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
      domain: "documents",
      status: report.reconciliation.passed ? "imported" : "failed",
      exportPath,
      fingerprint,
      passed: report.reconciliation.passed,
      at: new Date().toISOString(),
      checks: report.reconciliation.checks,
    });
    if (!report.reconciliation.passed) {
      throw new Error("documents import reconcile failed");
    }
  },

  reconcile: async (engine, reconciler, options) => {
    const report = await runDocumentsImport(options.exportPath, options.firmMapPath);
    await saveDomainReport("documents", report);
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
    await appendReconciliationReport({ domain: "documents", command: "reconcile", report });
  },

  verify: async (engine) => {
    const report = await loadDomainReport("documents");
    if (!report) {
      await engine.log("No saved documents report");
      return false;
    }
    return report.reconciliation.passed;
  },

  rollback: async (engine, isDryRun, options) => {
    const ids = await readLegacyIdsFromExport(options.exportPath, "documents");
    await softDeleteByLegacyIds({
      tableName: "documents",
      table: documents,
      legacyIds: ids,
      isDryRun,
      log: (m) => engine.log(m),
    });
  },
});
