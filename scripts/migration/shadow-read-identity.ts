import fs from "node:fs/promises";
import path from "node:path";
import { closeDatabase } from "../../src/server/db/client";
import { shadowReadIdentityExport } from "../../src/server/services/identity-migration";

const [exportPath, firmMapPath] = process.argv.slice(2);
if (!exportPath || !firmMapPath)
  throw new Error(
    "Usage: npm run migration:identity:shadow -- <convex-export-dir-or-zip> <firm-map.json>",
  );

try {
  const firmMap = JSON.parse(await fs.readFile(path.resolve(firmMapPath), "utf8")) as Record<
    string,
    string
  >;
  const report = await shadowReadIdentityExport({ exportPath: path.resolve(exportPath), firmMap });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) process.exitCode = 1;
} finally {
  await closeDatabase();
}
