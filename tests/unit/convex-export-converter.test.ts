import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { afterEach, describe, expect, it } from "vitest";
import { convertConvexStorageExport } from "@/server/storage/convex-export-converter";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe("native Convex storage export conversion", () => {
  it("resolves tenant ownership and produces checksummed per-firm manifests", async () => {
    const outputDirectory = await temporaryDirectory();
    const report = await convertConvexStorageExport({
      exportPath: path.resolve("tests/fixtures/convex-export"),
      outputDirectory,
      firmMap: { "convex-firm-a": "61000000-0000-4000-8000-000000000001" },
    });

    expect(report).toMatchObject({
      storageCount: 2,
      referencedCount: 2,
      convertedCount: 2,
      firmCount: 1,
      exceptions: [],
    });
    const manifest = JSON.parse(await fs.readFile(report.manifests[0], "utf8")) as {
      firmId: string;
      files: Array<{ storageId: string; sha256: string; sizeBytes: number }>;
    };
    expect(manifest.firmId).toBe("61000000-0000-4000-8000-000000000001");
    expect(manifest.files).toHaveLength(2);
    expect(manifest.files.every((file) => /^[0-9a-f]{64}$/.test(file.sha256))).toBe(true);
    expect(manifest.files.every((file) => file.sizeBytes > 0)).toBe(true);
  });

  it("reports unowned objects instead of silently dropping them", async () => {
    const exportDirectory = await temporaryDirectory();
    const outputDirectory = await temporaryDirectory();
    await fs.mkdir(path.join(exportDirectory, "_storage"), { recursive: true });
    await fs.writeFile(
      path.join(exportDirectory, "_storage", "documents.jsonl"),
      '{"_id":"orphan","contentType":"text/plain"}\n',
    );
    await fs.writeFile(path.join(exportDirectory, "_storage", "orphan"), "orphan");

    const report = await convertConvexStorageExport({
      exportPath: exportDirectory,
      outputDirectory,
      firmMap: {},
    });
    expect(report.convertedCount).toBe(0);
    expect(report.exceptions).toContainEqual({
      storageId: "orphan",
      reason: "Storage object has no tenant-owned database reference",
    });
  });

  it("reads the native ZIP export layout", async () => {
    const outputDirectory = await temporaryDirectory();
    const zipDirectory = await temporaryDirectory();
    const zipPath = path.join(zipDirectory, "convex-export.zip");
    const zip = new JSZip();
    const fixtureRoot = path.resolve("tests/fixtures/convex-export");
    for (const name of await listFiles(fixtureRoot)) {
      zip.file(name, await fs.readFile(path.join(fixtureRoot, ...name.split("/"))));
    }
    await fs.writeFile(zipPath, await zip.generateAsync({ type: "nodebuffer" }));

    const report = await convertConvexStorageExport({
      exportPath: zipPath,
      outputDirectory,
      firmMap: { "convex-firm-a": "61000000-0000-4000-8000-000000000001" },
    });
    expect(report).toMatchObject({ convertedCount: 2, exceptions: [] });
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "lexnepal-convex-export-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function listFiles(root: string, relative = ""): Promise<string[]> {
  const entries = await fs.readdir(path.join(root, relative), { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const child = path.posix.join(relative.replaceAll("\\", "/"), entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(root, child)));
    else files.push(child);
  }
  return files;
}
