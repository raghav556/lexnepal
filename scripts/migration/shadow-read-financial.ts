import fs from "node:fs/promises";
import path from "node:path";
import { closeDatabase } from "../../src/server/db/client";
import { shadowReadFinancialExport } from "../../src/server/services/financial-migration";

const [exportPath, firmMapPath, orphanFirmId] = process.argv.slice(2);
if (!exportPath || !firmMapPath) {
  throw new Error(
    "Usage: npm run migration:financial:shadow -- <convex-export-dir> <firm-map.json> [orphan-firm-uuid]",
  );
}

try {
  const firmMap = JSON.parse(await fs.readFile(path.resolve(firmMapPath), "utf8")) as Record<
    string,
    string
  >;
  const report = await shadowReadFinancialExport({
    exportPath: path.resolve(exportPath),
    firmMap,
    orphanFirmId,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) process.exitCode = 1;
} finally {
  await closeDatabase();
}
