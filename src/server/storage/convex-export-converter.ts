import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { sha256Hex } from "@/server/storage/file-validation";

interface ConvexRecord {
  _id?: string;
  firmId?: string;
  caseId?: string;
  uploadedBy?: string;
  userId?: string;
  storageId?: string;
  thumbnailStorageId?: string;
  signatureArtifactStorageId?: string;
  mimeType?: string;
  sha256?: string;
  sizeBytes?: number;
  attachmentIds?: string[];
  kycDocuments?: string[];
  kycFiles?: Array<{ storageId?: string; mimeType?: string }>;
  contentType?: string;
  size?: number;
}

interface ExportReader {
  list(): Promise<string[]>;
  readBytes(name: string): Promise<Uint8Array | null>;
}

interface StorageReference {
  convexFirmId: string;
  mimeType?: string;
  source: string;
  expectedSha256?: string;
}

export interface ConvexStorageConversionReport {
  storageCount: number;
  referencedCount: number;
  convertedCount: number;
  firmCount: number;
  manifests: string[];
  exceptions: Array<{ storageId: string; reason: string }>;
}

export async function convertConvexStorageExport(input: {
  exportPath: string;
  outputDirectory: string;
  firmMap: Record<string, string>;
  ownershipOverrides?: Record<string, string>;
}): Promise<ConvexStorageConversionReport> {
  const reader = await createReader(input.exportPath);
  const names = await reader.list();
  const tableRecords = new Map<string, ConvexRecord[]>();
  for (const table of ["users", "clients", "cases", "documents", "messages"]) {
    tableRecords.set(table, await readTable(reader, names, table));
  }
  const storageRecords = await readTable(reader, names, "_storage");
  const users = indexById(tableRecords.get("users") ?? []);
  const cases = indexById(tableRecords.get("cases") ?? []);
  const references = new Map<string, StorageReference>();
  const exceptions: ConvexStorageConversionReport["exceptions"] = [];

  const resolveFirm = (record: ConvexRecord): string | undefined =>
    record.firmId ??
    (record.caseId ? cases.get(record.caseId)?.firmId : undefined) ??
    (record.uploadedBy ? users.get(record.uploadedBy)?.firmId : undefined) ??
    (record.userId ? users.get(record.userId)?.firmId : undefined);

  const addReference = (
    storageId: string | undefined,
    firmId: string | undefined,
    source: string,
    mimeType?: string,
    expectedSha256?: string,
  ) => {
    if (!storageId) return;
    if (!firmId) {
      exceptions.push({ storageId, reason: `${source} has no resolvable firm ownership` });
      return;
    }
    const existing = references.get(storageId);
    if (existing && existing.convexFirmId !== firmId) {
      exceptions.push({
        storageId,
        reason: `Cross-firm reference: ${existing.convexFirmId} and ${firmId}`,
      });
      return;
    }
    references.set(storageId, {
      convexFirmId: firmId,
      mimeType: mimeType ?? existing?.mimeType,
      source: existing ? `${existing.source},${source}` : source,
      expectedSha256: expectedSha256 ?? existing?.expectedSha256,
    });
  };

  for (const document of tableRecords.get("documents") ?? []) {
    const firmId = resolveFirm(document);
    addReference(
      document.storageId,
      firmId,
      `documents:${document._id}:storageId`,
      document.mimeType,
      document.sha256,
    );
    addReference(
      document.thumbnailStorageId,
      firmId,
      `documents:${document._id}:thumbnailStorageId`,
    );
    addReference(
      document.signatureArtifactStorageId,
      firmId,
      `documents:${document._id}:signatureArtifactStorageId`,
    );
  }
  for (const client of tableRecords.get("clients") ?? []) {
    const firmId = resolveFirm(client);
    for (const file of client.kycFiles ?? []) {
      addReference(file.storageId, firmId, `clients:${client._id}:kycFiles`, file.mimeType);
    }
    for (const storageId of client.kycDocuments ?? []) {
      addReference(storageId, firmId, `clients:${client._id}:kycDocuments`);
    }
  }
  for (const message of tableRecords.get("messages") ?? []) {
    const firmId = resolveFirm(message);
    for (const storageId of message.attachmentIds ?? []) {
      addReference(storageId, firmId, `messages:${message._id}:attachmentIds`);
    }
  }
  for (const [storageId, convexFirmId] of Object.entries(input.ownershipOverrides ?? {})) {
    addReference(storageId, convexFirmId, "ownership-override");
  }

  const storageById = new Map<string, ConvexRecord>();
  for (const record of storageRecords) {
    if (record._id) storageById.set(record._id, record);
  }
  for (const storageId of references.keys()) {
    if (!storageById.has(storageId)) {
      exceptions.push({
        storageId,
        reason: "Referenced storage object is missing from the export",
      });
    }
  }

  const manifestsDirectory = path.join(input.outputDirectory, "manifests");
  const filesDirectory = path.join(manifestsDirectory, "files");
  await fs.mkdir(filesDirectory, { recursive: true });
  await fs.mkdir(manifestsDirectory, { recursive: true });
  const manifests = new Map<
    string,
    Array<{ storageId: string; path: string; mimeType: string; sha256: string; sizeBytes: number }>
  >();
  let convertedSequence = 0;

  for (const [storageId, metadata] of storageById) {
    const reference = references.get(storageId);
    if (!reference) {
      exceptions.push({
        storageId,
        reason: "Storage object has no tenant-owned database reference",
      });
      continue;
    }
    const mysqlFirmId = input.firmMap[reference.convexFirmId];
    if (!mysqlFirmId) {
      exceptions.push({
        storageId,
        reason: `No MySQL firm mapping for Convex firm ${reference.convexFirmId}`,
      });
      continue;
    }
    const sourceName = findStorageObjectName(names, storageId);
    const bytes = sourceName ? await reader.readBytes(sourceName) : null;
    if (!bytes) {
      exceptions.push({ storageId, reason: "Storage object bytes are missing from the export" });
      continue;
    }
    const actualSha256 = sha256Hex(bytes);
    const expectedSha256 = reference.expectedSha256 ?? metadata.sha256;
    if (
      expectedSha256 &&
      /^[0-9a-f]{64}$/i.test(expectedSha256) &&
      expectedSha256.toLowerCase() !== actualSha256
    ) {
      exceptions.push({ storageId, reason: "Exported bytes do not match the recorded SHA-256" });
      continue;
    }
    const expectedSize = metadata.size ?? metadata.sizeBytes;
    if (expectedSize !== undefined && expectedSize !== bytes.byteLength) {
      exceptions.push({ storageId, reason: "Exported bytes do not match the recorded size" });
      continue;
    }
    const fileName = `${convertedSequence.toString().padStart(4, "0")}-${encodeURIComponent(storageId)}`;
    convertedSequence += 1;
    await fs.writeFile(path.join(filesDirectory, fileName), bytes);
    const files = manifests.get(mysqlFirmId) ?? [];
    files.push({
      storageId,
      path: `files/${fileName}`,
      mimeType: reference.mimeType ?? metadata.contentType ?? "application/octet-stream",
      sha256: actualSha256,
      sizeBytes: bytes.byteLength,
    });
    manifests.set(mysqlFirmId, files);
  }

  const manifestPaths: string[] = [];
  for (const [firmId, files] of manifests) {
    files.sort((left, right) => left.storageId.localeCompare(right.storageId));
    const manifestPath = path.join(manifestsDirectory, `${firmId}.json`);
    await fs.writeFile(manifestPath, `${JSON.stringify({ firmId, files }, null, 2)}\n`, "utf8");
    manifestPaths.push(manifestPath);
  }
  const report: ConvexStorageConversionReport = {
    storageCount: storageById.size,
    referencedCount: references.size,
    convertedCount: [...manifests.values()].reduce((total, files) => total + files.length, 0),
    firmCount: manifests.size,
    manifests: manifestPaths,
    exceptions,
  };
  await fs.writeFile(
    path.join(input.outputDirectory, "conversion-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  return report;
}

async function createReader(exportPath: string): Promise<ExportReader> {
  const stat = await fs.stat(exportPath);
  if (stat.isDirectory()) {
    return {
      list: async () => listDirectoryFiles(exportPath),
      readBytes: async (name) => {
        try {
          return new Uint8Array(await fs.readFile(path.join(exportPath, ...name.split("/"))));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
          throw error;
        }
      },
    };
  }
  const zip = await JSZip.loadAsync(await fs.readFile(exportPath));
  return {
    list: async () =>
      Object.values(zip.files)
        .filter((entry) => !entry.dir)
        .map((entry) => entry.name),
    readBytes: async (name) => {
      const entry = zip.file(name);
      return entry ? new Uint8Array(await entry.async("uint8array")) : null;
    },
  };
}

async function listDirectoryFiles(root: string, relative = ""): Promise<string[]> {
  const entries = await fs.readdir(path.join(root, relative), { withFileTypes: true });
  const names: string[] = [];
  for (const entry of entries) {
    const child = path.posix.join(relative.replaceAll("\\", "/"), entry.name);
    if (entry.isDirectory()) names.push(...(await listDirectoryFiles(root, child)));
    else names.push(child);
  }
  return names;
}

async function readTable(
  reader: ExportReader,
  names: string[],
  table: string,
): Promise<ConvexRecord[]> {
  const suffix = `${table}/documents.jsonl`;
  const name = names.find((candidate) => candidate === suffix || candidate.endsWith(`/${suffix}`));
  if (!name) return [];
  const bytes = await reader.readBytes(name);
  if (!bytes) return [];
  return new TextDecoder()
    .decode(bytes)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ConvexRecord);
}

function findStorageObjectName(names: string[], storageId: string): string | undefined {
  const suffix = `_storage/${storageId}`;
  return names.find((candidate) => candidate === suffix || candidate.endsWith(`/${suffix}`));
}

function indexById(records: ConvexRecord[]): Map<string, ConvexRecord> {
  return new Map(records.flatMap((record) => (record._id ? [[record._id, record]] : [])));
}
