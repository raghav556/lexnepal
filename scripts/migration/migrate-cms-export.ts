import { closeDatabase } from "../../src/server/db/client";
import { migrateCmsExport } from "../../src/server/services/cms-migration";
const [exportPath, targetFirmId] = process.argv.slice(2);
if (!exportPath || !targetFirmId)
  throw new Error("Usage: npm run migration:cms -- <convex-export-dir-or-zip> <target-firm-uuid>");
try {
  const report = await migrateCmsExport({ exportPath, targetFirmId });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.reconciliation.passed) process.exitCode = 1;
} finally {
  await closeDatabase();
}
