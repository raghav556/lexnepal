import { registerDomain } from "./registry";
import { saveDomainReport } from "../report-store";
import { appendReconciliationReport } from "../report-writer";
import type { DomainMigrationReport } from "../types";

/**
 * Analytics is a live SQL read model over already-migrated domains.
 * There is no Convex analytics export to import.
 */
registerDomain({
  name: "analytics",

  import: async (engine, isDryRun, options) => {
    const fingerprint = await engine.fingerprintExport([], options.exportPath);
    await engine.log(
      `${isDryRun ? "[DRY RUN] " : ""}Analytics has no Convex table export — skip import (read model).`,
    );
    const report: DomainMigrationReport = {
      source: {},
      migrated: {},
      exceptions: [],
      reconciliation: { passed: true, checks: {} },
    };
    await saveDomainReport("analytics", report);
    await appendReconciliationReport({
      domain: "analytics",
      command: "import-postgres",
      dryRun: isDryRun,
      report,
      notes: [
        "Explicit no-op: dashboard aggregates cases/clients/finance/CRM already migrated elsewhere.",
        `fingerprint=${fingerprint}`,
      ],
    });
    await engine.writeCheckpoint({
      domain: "analytics",
      status: isDryRun ? "dry-run" : "imported",
      exportPath: options.exportPath,
      fingerprint,
      passed: true,
      at: new Date().toISOString(),
      notes: "Analytics no-op read model",
    });
  },

  reconcile: async (engine, _reconciler) => {
    await engine.log("Analytics reconcile: no export rows to compare.");
    const report: DomainMigrationReport = {
      source: {},
      migrated: {},
      exceptions: [],
      reconciliation: { passed: true, checks: {} },
    };
    await appendReconciliationReport({
      domain: "analytics",
      command: "reconcile",
      report,
      notes: ["No-op reconcile for read-model domain."],
    });
  },

  verify: async (engine) => {
    await engine.log("Analytics verify: always passes (no import surface).");
    return true;
  },

  rollback: async (engine, isDryRun) => {
    await engine.log(
      `${isDryRun ? "[DRY RUN] " : ""}Analytics rollback: nothing to delete (no analytics tables).`,
    );
  },
});
