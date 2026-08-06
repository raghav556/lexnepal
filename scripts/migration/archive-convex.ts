/**
 * R8.A1 (local waiver): immutable archive of the Convex runtime before decommission.
 *
 * Deleting `convex/`, the bridge and the mock removes the flag-flip rollback path,
 * so the source is captured as a single zip plus a per-file SHA-256 manifest.
 * Stored under `doc/` so the residual scanner and tsc/eslint globs never re-ingest it.
 *
 *   npm run migration:archive-convex           # write archive
 *   npm run migration:archive-convex -- --verify  # re-check zip + manifest digests
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { DOC_MIGRATION_DIR } from "./types";

const ROOT = process.cwd();
const ARCHIVE_DIR = path.join(DOC_MIGRATION_DIR, "archive", "convex-decommission");
const ZIP_PATH = path.join(ARCHIVE_DIR, "convex-source.zip");
const MANIFEST_PATH = path.join(ARCHIVE_DIR, "manifest.json");

/** Everything the app loses when Convex is removed. Directories are archived recursively. */
const ARCHIVE_ROOTS = ["convex"] as const;
const ARCHIVE_FILES = [
  "src/lib/convex-mock.tsx",
  "src/lib/convex-client-stub.ts",
  "src/client/data/convex-bridge.ts",
  "src/client/data/shadow-reader.ts",
  "src/client/queries/briefs.ts",
  "tests/characterization/document-security.test.mjs",
] as const;

function sha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function toPosix(relative: string): string {
  return relative.split(path.sep).join("/");
}

async function walk(directory: string, acc: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

async function collectFiles(): Promise<string[]> {
  const files: string[] = [];
  for (const root of ARCHIVE_ROOTS) {
    files.push(...(await walk(path.join(ROOT, root))));
  }
  for (const file of ARCHIVE_FILES) {
    const full = path.join(ROOT, file);
    if (await fs.access(full).then(() => true, () => false)) files.push(full);
  }
  return [...new Set(files)].sort();
}

interface ManifestEntry {
  path: string;
  bytes: number;
  sha256: string;
}

interface Manifest {
  createdAt: string;
  reason: string;
  fileCount: number;
  totalBytes: number;
  zip: { path: string; sha256: string; bytes: number };
  files: ManifestEntry[];
}

async function writeArchive(): Promise<Manifest> {
  const files = await collectFiles();
  if (files.length === 0) throw new Error("Nothing to archive — Convex sources already removed");

  const zip = new JSZip();
  const entries: ManifestEntry[] = [];
  let totalBytes = 0;

  for (const file of files) {
    const relative = toPosix(path.relative(ROOT, file));
    const contents = await fs.readFile(file);
    zip.file(relative, contents);
    entries.push({ path: relative, bytes: contents.byteLength, sha256: sha256(contents) });
    totalBytes += contents.byteLength;
  }

  // Deterministic output so re-running without source changes reproduces the same digest.
  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
    // JSZip stamps mtime into the archive unless dates are pinned.
    date: new Date(0),
  });

  await fs.mkdir(ARCHIVE_DIR, { recursive: true });
  await fs.writeFile(ZIP_PATH, zipBuffer);

  const manifest: Manifest = {
    createdAt: new Date().toISOString(),
    reason:
      "R8.A1 local-only waiver — Convex runtime removed from the app; restore from this zip to rebuild the rollback path",
    fileCount: entries.length,
    totalBytes,
    zip: {
      path: toPosix(path.relative(ROOT, ZIP_PATH)),
      sha256: sha256(zipBuffer),
      bytes: zipBuffer.byteLength,
    },
    files: entries,
  };
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function verifyArchive(): Promise<Manifest> {
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8")) as Manifest;
  const zipBuffer = await fs.readFile(ZIP_PATH);
  if (sha256(zipBuffer) !== manifest.zip.sha256) {
    throw new Error("Archive zip digest does not match manifest.zip.sha256");
  }

  const zip = await JSZip.loadAsync(zipBuffer);
  for (const entry of manifest.files) {
    const file = zip.file(entry.path);
    if (!file) throw new Error(`Archive is missing ${entry.path}`);
    const contents = await file.async("nodebuffer");
    if (sha256(contents) !== entry.sha256) {
      throw new Error(`Archive digest mismatch for ${entry.path}`);
    }
  }
  return manifest;
}

try {
  const verifyOnly = process.argv.includes("--verify");
  const manifest = verifyOnly ? await verifyArchive() : await writeArchive();
  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: verifyOnly ? "verify" : "write",
        archive: manifest.zip.path,
        sha256: manifest.zip.sha256,
        fileCount: manifest.fileCount,
        totalBytes: manifest.totalBytes,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
