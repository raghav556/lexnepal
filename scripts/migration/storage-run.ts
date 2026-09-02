/**
 * R3.6 — Thin wrapper around existing convertConvexStorageExport + migrateLegacyStorage.
 * Used by the CLI storage domain and prove scripts. Do not reimplement convert/migrate here.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getServerEnvironment } from "../../src/server/env";
import { MySqlDocumentStorageRepository } from "../../src/server/repositories/document-storage-repository";
import { LocalObjectStorage } from "../../src/server/storage/local-object-storage";
import { convertConvexStorageExport } from "../../src/server/storage/convex-export-converter";
import { migrateLegacyStorage } from "../../src/server/storage/storage-migration";
import type { DomainMigrationReport } from "./types";
import { detailsFromReport, loadFileSha256Rows } from "./reconciliation-details";

export async function countStorageObjects(exportPath: string): Promise<number> {
  for (const candidate of [
    path.join(exportPath, "_storage", "documents.jsonl"),
    path.join(exportPath, "_storage.jsonl"),
  ]) {
    try {
      const text = (await fs.readFile(candidate, "utf8")).trim();
      if (!text) return 0;
      if (text.startsWith("[")) return (JSON.parse(text) as unknown[]).length;
      return text.split(/\r?\n/).filter(Boolean).length;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
    }
  }
  return 0;
}

export async function runStorageConvertAndMigrate(input: {
  exportPath: string;
  firmMap: Record<string, string>;
  storageManifestPath?: string;
  storageOutputDir?: string;
  onLog?: (message: string) => Promise<void> | void;
}): Promise<{
  report: DomainMigrationReport;
  firmId: string;
  conversionExceptions: Array<{ storageId: string; reason: string }>;
}> {
  const log = input.onLog ?? (() => undefined);
  const environment = getServerEnvironment();

  let manifestPath = input.storageManifestPath;
  let manifestRoot: string;
  const conversionExceptions: Array<{ storageId: string; reason: string }> = [];

  if (!manifestPath) {
    const outputDirectory =
      input.storageOutputDir ??
      (await fs.mkdtemp(path.join(os.tmpdir(), "lexnepal-storage-migrate-")));
    await log(`Converting Convex storage export → ${outputDirectory}`);
    const conversion = await convertConvexStorageExport({
      exportPath: path.resolve(input.exportPath),
      outputDirectory,
      firmMap: input.firmMap,
    });
    conversionExceptions.push(...conversion.exceptions);
    if (!conversion.manifests.length) {
      throw new Error("Storage conversion produced no manifests");
    }
    manifestPath = conversion.manifests[0]!;
    manifestRoot = path.dirname(manifestPath);
    await log(
      `Convert summary: storage=${conversion.storageCount} converted=${conversion.convertedCount} exceptions=${conversion.exceptions.length}`,
    );
  } else {
    manifestRoot = path.dirname(path.resolve(manifestPath));
  }

  const manifest = JSON.parse(await fs.readFile(path.resolve(manifestPath), "utf8")) as {
    firmId: string;
    files: Array<{ storageId: string; path: string; mimeType: string; sha256?: string }>;
  };
  if (!manifest.firmId || !Array.isArray(manifest.files)) {
    throw new Error("Storage manifest is invalid");
  }

  const destination = new LocalObjectStorage({
    root: environment.STORAGE_ROOT,
    appBaseUrl: environment.APP_PUBLIC_URL,
  });
  await destination.initialize();
  const byId = new Map(manifest.files.map((file) => [file.storageId, file]));
  const journal = new MySqlDocumentStorageRepository();
  const storageReport = await migrateLegacyStorage({
    firmId: manifest.firmId,
    source: {
      listFiles: async () =>
        manifest.files.map((file) => ({
          storageId: file.storageId,
          mimeType: file.mimeType,
          expectedSha256: file.sha256,
        })),
      readFile: async (storageId) => {
        const file = byId.get(storageId);
        if (!file) throw new Error(`Missing manifest entry for ${storageId}`);
        const target = path.resolve(manifestRoot, file.path);
        const relative = path.relative(manifestRoot, target);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
          throw new Error("Manifest path escapes its export directory");
        }
        return new Uint8Array(await fs.readFile(target));
      },
    },
    destination,
    journal,
  });

  const exceptions = [
    ...conversionExceptions.map((ex) => ({
      table: "storage",
      id: ex.storageId,
      reason: ex.reason,
    })),
    ...storageReport.failed.map((f) => ({
      table: "storage",
      id: f.storageId,
      reason: f.reason,
    })),
  ];

  const report: DomainMigrationReport = {
    source: { storageObjects: storageReport.sourceCount },
    migrated: { storageObjects: storageReport.verifiedCount },
    exceptions,
    reconciliation: {
      passed:
        exceptions.length === 0 &&
        storageReport.sourceCount === storageReport.verifiedCount &&
        storageReport.sourceCount === storageReport.destinationCount,
      checks: {
        storageObjects: {
          source: storageReport.sourceCount,
          target: storageReport.verifiedCount,
        },
      },
    },
  };

  const fileSha256 = await loadFileSha256Rows(manifest.firmId);
  report.details = detailsFromReport(report, { fileSha256 });
  return { report, firmId: manifest.firmId, conversionExceptions };
}
