import fs from "node:fs/promises";
import path from "node:path";
import { closeDatabase } from "../../src/server/db/client";
import { shadowReadMattersExport } from "../../src/server/services/matters-migration";

const [exportPath, firmMapPath, orphanFirmId] = process.argv.slice(2);
if (!exportPath || !firmMapPath) {
  throw new Error(
    "Usage: npm run migration:matters:shadow -- <convex-export-dir> <firm-map.json> [orphan-firm-uuid]",
  );
}

try {
  const firmMap = JSON.parse(await fs.readFile(path.resolve(firmMapPath), "utf8")) as Record<
    string,
    string
  >;
  const report = await shadowReadMattersExport({
    exportPath: path.resolve(exportPath),
    firmMap,
    orphanFirmId,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) process.exitCode = 1;
} finally {
  await closeDatabase();
}
