import fs from "node:fs/promises";
import { closeDatabase } from "../../src/server/db/client";
import { migrateCrmExport } from "../../src/server/services/crm-migration";

const [exportPath, firmMapPath, orphanFirmId] = process.argv.slice(2);
if (!exportPath || !firmMapPath)
  throw new Error(
    "Usage: npm run migration:crm -- <convex-export-dir-or-zip> <firm-map.json> [orphan-firm-uuid]",
  );
try {
  const firmMap = JSON.parse(await fs.readFile(firmMapPath, "utf8")) as Record<string, string>;
  const report = await migrateCrmExport({ exportPath, firmMap, orphanFirmId });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.reconciliation.passed) process.exitCode = 1;
} finally {
  await closeDatabase();
}
