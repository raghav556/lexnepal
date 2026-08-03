import fs from "node:fs/promises";
import path from "node:path";
import { convertConvexStorageExport } from "../../src/server/storage/convex-export-converter";

const [exportArgument, outputArgument, firmMapArgument, overridesArgument] = process.argv.slice(2);
if (!exportArgument || !outputArgument || !firmMapArgument) {
  throw new Error(
    "Usage: npm run storage:convert-convex -- <export-dir-or-zip> <output-dir> <firm-map.json> [ownership-overrides.json]",
  );
}

const readMap = async (file: string): Promise<Record<string, string>> =>
  JSON.parse(await fs.readFile(path.resolve(file), "utf8")) as Record<string, string>;
const report = await convertConvexStorageExport({
  exportPath: path.resolve(exportArgument),
  outputDirectory: path.resolve(outputArgument),
  firmMap: await readMap(firmMapArgument),
  ownershipOverrides: overridesArgument ? await readMap(overridesArgument) : undefined,
});

process.stdout.write(`${JSON.stringify(report)}\n`);
if (
  report.exceptions.length > 0 ||
  report.storageCount !== report.referencedCount ||
  report.storageCount !== report.convertedCount
) {
  process.exitCode = 1;
}
