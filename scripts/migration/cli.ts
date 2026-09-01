import { parseArgs } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";
import { closeDatabase } from "../../src/server/db/client";
import { MigrationEngine } from "./engine";
import { Reconciler, ensureExceptionsCsvPlaceholder } from "./reconcile";
import { getDomain, listDomainNames } from "./domains/registry";
import { defaultExportPathForDomain } from "./report-writer";

import "./domains/identity";
import "./domains/cms";
import "./domains/matters";
import "./domains/work-management";
import "./domains/crm";
import "./domains/communication";
import "./domains/documents";
import "./domains/envelopes";
import "./domains/hr";
import "./domains/analytics";
import "./domains/storage";

function printUsage() {
  console.error(`Usage:
  npm run migration -- <command> --domain <name> [options]

Commands:
  export-convex     Validate that an export directory exists (place Convex zip extract under exports/)
  import-postgres   Run the registered domain importer (wraps existing migrate*Export services)
  verify            Check last saved domain report
  reconcile         Re-run idempotent importer and write exceptions + reconciliation report
  rollback          Soft-delete migrated rows matching export legacy IDs (where configured)
  list              List registered domains

Options:
  --domain <name>           Required for most commands
  --dry-run                 Inventory / preview only (no Postgres writes for import/rollback)
  --resume                  Skip import when checkpoint matches same export fingerprint
  --force                   Ignore checkpoint; re-run import (still idempotent via legacyConvexId)
  --export-path <path>      Convex export dir (default: exports/<domain> or exports/)
  --firm-map <path>         JSON map of Convex firm id → Postgres firm UUID
  --orphan-firm <uuid>      Fallback firm UUID for orphaned rows
  --target-firm <uuid>      Explicit firm for CMS
  --storage-manifest <path> Pre-built storage manifest (storage domain)
  --storage-output <path>   Convert output directory (storage domain)
  --batch-size <n>          Engine batch size for streaming helpers

Registered domains: ${listDomainNames().join(", ")}
`);
}

async function main() {
  const { positionals, values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      domain: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      resume: { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      "batch-size": { type: "string" },
      "export-path": { type: "string" },
      "firm-map": { type: "string" },
      "orphan-firm": { type: "string" },
      "target-firm": { type: "string" },
      "storage-manifest": { type: "string" },
      "storage-output": { type: "string" },
    },
    allowPositionals: true,
  });

  const command = positionals[0];
  if (!command) {
    printUsage();
    process.exit(1);
  }

  if (command === "list") {
    console.log(listDomainNames().join("\n"));
    return;
  }

  const domainName = values.domain;
  if (!domainName) {
    printUsage();
    process.exit(1);
  }

  const isDryRun = values["dry-run"] || false;
  const batchSize = values["batch-size"] ? parseInt(values["batch-size"], 10) : undefined;
  const exportPath = path.resolve(values["export-path"] || defaultExportPathForDomain(domainName));
  const firmMapPath = values["firm-map"] ? path.resolve(values["firm-map"]) : undefined;
  const options = {
    exportPath,
    firmMapPath,
    orphanFirmId: values["orphan-firm"],
    targetFirmId: values["target-firm"],
    storageManifestPath: values["storage-manifest"]
      ? path.resolve(values["storage-manifest"])
      : undefined,
    storageOutputDir: values["storage-output"] ? path.resolve(values["storage-output"]) : undefined,
    resume: values.resume || false,
    force: values.force || false,
  };

  await ensureExceptionsCsvPlaceholder();

  const engine = new MigrationEngine({ domain: domainName, exportPath, batchSize });
  await engine.init();
  const domain = getDomain(domainName);

  try {
    switch (command) {
      case "export-convex": {
        await engine.log(`Validating export path for domain: ${domainName}`);
        const stat = await fs.stat(exportPath).catch(() => null);
        if (!stat || !stat.isDirectory()) {
          await engine.log(
            `Error: export path missing or not a directory: ${exportPath}. Extract a Convex export zip there (or pass --export-path).`,
          );
          process.exitCode = 1;
          break;
        }
        await engine.log(`Export directory validated: ${exportPath}`);
        break;
      }

      case "import-postgres": {
        await engine.log(
          `Starting import for domain: ${domainName}${isDryRun ? " (DRY RUN)" : ""} from ${exportPath}`,
        );
        await domain.import(engine, isDryRun, options);
        break;
      }

      case "reconcile": {
        await engine.log(`Starting reconciliation for domain: ${domainName}`);
        const reconciler = new Reconciler(domainName);
        await domain.reconcile(engine, reconciler, options);
        const written = await reconciler.writeExceptions();
        if (written.written > 0) {
          await engine.log(
            `Reconciliation recorded ${written.written} exception(s) to doc/migration/data-exceptions.csv (${written.approved} approved, ${written.unexplained} unexplained)`,
          );
        }
        if (written.unexplained > 0) {
          await engine.log(
            `Reconciliation failed: ${written.unexplained} unexplained exception(s). Fix or append to doc/migration/approved-exceptions.csv`,
          );
          process.exitCode = 1;
        } else {
          await engine.log(
            written.written === 0
              ? `Reconciliation passed with zero exceptions.`
              : `Reconciliation passed with zero unexplained exceptions (${written.approved} approved).`,
          );
        }
        break;
      }

      case "verify": {
        await engine.log(`Starting verification for domain: ${domainName}`);
        const passed = await domain.verify(engine, options);
        if (!passed) {
          await engine.log(`Verification failed.`);
          process.exitCode = 1;
        } else {
          await engine.log(`Verification passed.`);
        }
        break;
      }

      case "rollback": {
        await engine.log(
          `Starting rollback for domain: ${domainName}${isDryRun ? " (DRY RUN)" : ""}`,
        );
        await domain.rollback(engine, isDryRun, options);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exitCode = 1;
    }
  } finally {
    await closeDatabase();
  }
}

main().catch((error) => {
  console.error("Migration CLI failed:", error);
  process.exit(1);
});
