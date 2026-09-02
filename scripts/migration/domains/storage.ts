import fs from "node:fs/promises";
import { registerDomain } from "./registry";
import { saveDomainReport, loadDomainReport } from "../report-store";
import { appendReconciliationReport } from "../report-writer";
import { Reconciler } from "../reconcile";
import type { DomainMigrationReport } from "../types";
import { detailsFromReport, loadFileSha256Rows } from "../reconciliation-details";
import { countStorageObjects, runStorageConvertAndMigrate } from "../storage-run";

/**
 * Wraps existing storage convert + migrate helpers (R3.6).
 * Prefer --storage-manifest for migrate-only; otherwise convert from --export-path then migrate.
 */
registerDomain({
  name: "storage",

  import: async (engine, isDryRun, options) => {
    const firmMapPath = options.firmMapPath;
    if (!firmMapPath) {
      throw new Error("storage domain requires --firm-map");
    }
    const firmMap = JSON.parse(await fs.readFile(firmMapPath, "utf8")) as Record<string, string>;
    const fingerprint = await engine.fingerprintExport(["_storage"], options.exportPath);

    if (isDryRun) {
      const sourceCount = await countStorageObjects(options.exportPath);
      await engine.log(
        `[DRY RUN] Would convert + migrate ${sourceCount} storage object(s) from ${options.exportPath} via convertConvexStorageExport + migrateLegacyStorage`,
      );
      const report: DomainMigrationReport = {
        source: { storageObjects: sourceCount },
        migrated: { storageObjects: 0 },
        exceptions: [],
        reconciliation: {
          passed: true,
          checks: { storageObjects: { source: sourceCount, target: 0 } },
        },
      };
      await saveDomainReport("storage", report);
      await appendReconciliationReport({
        domain: "storage",
        command: "import-mysql",
        dryRun: true,
        report,
        notes: [
          "Uses convertConvexStorageExport + migrateLegacyStorage (no rewrite).",
          `fingerprint=${fingerprint}`,
        ],
      });
      await engine.writeCheckpoint({
        domain: "storage",
        status: "dry-run",
        exportPath: options.exportPath,
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
      exportPath: options.exportPath,
      resume: Boolean(options.resume),
      force: Boolean(options.force),
    });
    if (resumeHit) {
      await engine.log(
        `Resume: skipping storage import (checkpoint at ${resumeHit.at}, fingerprint=${fingerprint})`,
      );
      await engine.writeCheckpoint({
        ...resumeHit,
        status: "skipped-resume",
        at: new Date().toISOString(),
        notes: "Skipped because --resume matched prior successful import fingerprint",
      });
      return;
    }

    const { report, conversionExceptions } = await runStorageConvertAndMigrate({
      exportPath: options.exportPath,
      firmMap,
      storageManifestPath: options.storageManifestPath,
      storageOutputDir: options.storageOutputDir,
      onLog: (message) => engine.log(message),
    });

    await saveDomainReport("storage", report);
    await appendReconciliationReport({
      domain: "storage",
      command: "import-mysql",
      report,
      details: report.details,
      notes: [
        "Checksum verified via migrateLegacyStorage.",
        "R3.6 uses existing convertConvexStorageExport + migrateLegacyStorage helpers.",
        `fingerprint=${fingerprint}`,
      ],
    });
    if (report.exceptions.length || conversionExceptions.length) {
      const reconciler = new Reconciler("storage");
      for (const ex of report.exceptions) {
        reconciler.addException({ table: ex.table, id: ex.id, type: "OTHER", reason: ex.reason });
      }
      await reconciler.writeExceptions();
    }
    await engine.writeCheckpoint({
      domain: "storage",
      status: report.reconciliation.passed ? "imported" : "failed",
      exportPath: options.exportPath,
      fingerprint,
      passed: report.reconciliation.passed,
      at: new Date().toISOString(),
      checks: report.reconciliation.checks,
    });
    if (!report.reconciliation.passed) {
      throw new Error("storage migration had checksum/copy failures");
    }
  },

  reconcile: async (engine, reconciler, options) => {
    const report = (await loadDomainReport("storage")) ?? {
      source: { storageObjects: 0 },
      migrated: { storageObjects: 0 },
      exceptions: [],
      reconciliation: { passed: true, checks: { storageObjects: { source: 0, target: 0 } } },
    };
    const firmId =
      options.targetFirmId ??
      options.orphanFirmId ??
      (options.firmMapPath
        ? Object.values(
            JSON.parse(await fs.readFile(options.firmMapPath, "utf8")) as Record<string, string>,
          )[0]
        : undefined);
    const fileSha256 = await loadFileSha256Rows(firmId);
    for (const row of fileSha256) {
      if (!row.match) {
        reconciler.addException({
          table: "storage",
          id: row.storageId,
          type: "OTHER",
          reason: `SHA-256 mismatch or unverified (status=${row.status})`,
          sourceValue: row.expectedSha256,
          targetValue: row.actualSha256,
        });
      }
    }
    reconciler.checkRowCount(
      "storageObjects",
      report.reconciliation.checks.storageObjects?.source ?? fileSha256.length,
      report.reconciliation.checks.storageObjects?.target ??
        fileSha256.filter((r) => r.match).length,
    );
    const details = detailsFromReport(report, { fileSha256 });
    report.details = details;
    await saveDomainReport("storage", report);
    await appendReconciliationReport({
      domain: "storage",
      command: "reconcile",
      report,
      details,
      notes: [
        "R3.6 File SHA-256 from storage_migration_items (expected vs actual).",
        "Re-run import-mysql --domain storage to re-verify bytes in local storage.",
      ],
    });
    await engine.log(
      `Storage reconcile: ${fileSha256.length} journal row(s), ${fileSha256.filter((r) => r.match).length} SHA match(es)`,
    );
  },

  verify: async (engine) => {
    const report = await loadDomainReport("storage");
    if (!report) {
      await engine.log("No saved storage report");
      return false;
    }
    const passed = report.reconciliation.passed && report.exceptions.length === 0;
    await engine.log(
      `Verify storage from last report: passed=${passed} objects=${report.reconciliation.checks.storageObjects?.target ?? 0}`,
    );
    await appendReconciliationReport({
      domain: "storage",
      command: "verify",
      report,
      details: report.details,
      notes: ["Verified against last saved storage migration report."],
    });
    return passed;
  },

  rollback: async (engine, isDryRun) => {
    await engine.log(
      `${isDryRun ? "[DRY RUN] " : ""}Storage rollback of local storage objects is manual; see storage:cleanup helper.`,
    );
  },
});
