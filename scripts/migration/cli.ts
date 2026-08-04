import { parseArgs } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";
import { MigrationEngine } from "./engine";
import { Reconciler } from "./reconcile";
import { getDomain } from "./domains/registry";

// Ensure all domains are registered
import "./domains/identity";
import "./domains/documents";

async function main() {
  const { positionals, values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      domain: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      "batch-size": { type: "string" },
    },
    allowPositionals: true,
  });

  const command = positionals[0];
  const domainName = values.domain;
  const isDryRun = values["dry-run"] || false;
  const batchSize = values["batch-size"] ? parseInt(values["batch-size"]) : undefined;

  if (!command || !domainName) {
    console.error("Usage: npm run migration <command> -- --domain <domain> [--dry-run]");
    process.exit(1);
  }

  const engine = new MigrationEngine({ domain: domainName, batchSize });
  await engine.init();

  const domain = getDomain(domainName);

  switch (command) {
    case "export-convex":
      await engine.log(`Validating exports for domain: ${domainName}`);
      const exportsDir = path.resolve(process.cwd(), "exports");
      const stat = await fs.stat(exportsDir).catch(() => null);
      if (!stat || !stat.isDirectory()) {
        await engine.log(`Error: The exports/ directory does not exist. Please extract a Convex export zip there.`);
        process.exit(1);
      }
      await engine.log(`Export directory validated successfully.`);
      break;

    case "import-postgres":
      await engine.log(`Starting import for domain: ${domainName}${isDryRun ? " (DRY RUN)" : ""}`);
      await domain.import(engine, isDryRun);
      break;

    case "reconcile":
      await engine.log(`Starting reconciliation for domain: ${domainName}`);
      const reconciler = new Reconciler(domainName);
      await domain.reconcile(engine, reconciler);
      await reconciler.writeExceptions();
      const exceptions = reconciler.getExceptions();
      if (exceptions.length > 0) {
        await engine.log(`Reconciliation found ${exceptions.length} exceptions. Wrote to data-exceptions.csv`);
        process.exitCode = 1;
      } else {
        await engine.log(`Reconciliation passed with zero exceptions.`);
      }
      break;

    case "verify":
      await engine.log(`Starting verification for domain: ${domainName}`);
      const passed = await domain.verify(engine);
      if (!passed) {
        await engine.log(`Verification failed.`);
        process.exitCode = 1;
      } else {
        await engine.log(`Verification passed.`);
      }
      break;

    case "rollback":
      await engine.log(`Starting rollback for domain: ${domainName}${isDryRun ? " (DRY RUN)" : ""}`);
      await domain.rollback(engine, isDryRun);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("Migration CLI failed:", error);
  process.exit(1);
});
