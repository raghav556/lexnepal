import fs from "node:fs/promises";
import { closeDatabase } from "../../src/server/db/client";
import { migrateFinancialExport } from "../../src/server/services/financial-migration";

const [exportPath, firmMapPath, orphanFirmId] = process.argv.slice(2);
if (!exportPath || !firmMapPath)
  throw new Error(
    "Usage: npm run migration:financial -- <convex-export-dir-or-zip> <firm-map.json> [orphan-firm-uuid]",
  );
try {
  const firmMap = JSON.parse(await fs.readFile(firmMapPath, "utf8")) as Record<string, string>;
  const report = await migrateFinancialExport({ exportPath, firmMap, orphanFirmId });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.reconciliation.passed) process.exitCode = 1;
} finally {
  await closeDatabase();
}
