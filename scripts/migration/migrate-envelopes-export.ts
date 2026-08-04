import { migrateEnvelopeExport } from "../../src/server/services/envelope-migration";
import fs from "node:fs/promises";
import path from "node:path";

const [exportPath, firmMapPath, orphanFirmId] = process.argv.slice(2);
if (!exportPath || !firmMapPath) {
  throw new Error(
    "Usage: npm run migration:envelopes -- <export-path> <firm-map.json> [orphanFirmId]",
  );
}

const firmMap = JSON.parse(await fs.readFile(path.resolve(firmMapPath), "utf8")) as Record<
  string,
  string
>;
const report = await migrateEnvelopeExport({
  exportPath: path.resolve(exportPath),
  firmMap,
  orphanFirmId,
});
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.reconciliation.passed) process.exitCode = 1;
