import { execFile } from "node:child_process";
import { mkdtemp, mkdir, copyFile, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, expect, it } from "vitest";

const root = process.cwd();
const archive = "doc/migration/archive/convex-decommission";
const names = ["convex-source.zip", "manifest.json"];
const loader = pathToFileURL(createRequire(import.meta.url).resolve("tsx")).href;
let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "lexnepal-archive-tests-"));
  await mkdir(path.join(directory, archive), { recursive: true });
  for (const name of names)
    await copyFile(path.join(root, archive, name), path.join(directory, archive, name));
});
afterEach(async () => {
  const resolved = path.resolve(directory);
  if (
    path.dirname(resolved) !== path.resolve(tmpdir()) ||
    !path.basename(resolved).startsWith("lexnepal-archive-tests-")
  )
    throw new Error("Unsafe fixture cleanup path");
  await rm(resolved, { recursive: true });
});
const snapshot = () =>
  Promise.all(names.map((name) => readFile(path.join(directory, archive, name))));
const run = (...args: string[]) =>
  promisify(execFile)(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      loader,
      path.join(root, "scripts/migration/archive-convex.ts"),
      ...args,
    ],
    { cwd: directory },
  );

it("verifies the real committed archive read-only without needing live Convex sources", async () => {
  const before = await snapshot();
  expect((await run("--verify")).stdout).toContain('"mode": "verify"');
  expect(await snapshot()).toEqual(before);
}, 30_000);

it("fails closed if a dropped verify flag would otherwise write a partial archive", async () => {
  const before = await snapshot();
  await expect(run()).rejects.toThrow("refusing archive rewrite");
  expect(await snapshot()).toEqual(before);
}, 30_000);

it("rejects a damaged digest without regenerating or repairing evidence", async () => {
  const file = path.join(directory, archive, "manifest.json");
  const manifest = JSON.parse(await readFile(file, "utf8"));
  manifest.zip.sha256 = "0".repeat(64);
  await writeFile(file, JSON.stringify(manifest));
  const before = await snapshot();
  await expect(run("--verify")).rejects.toThrow("digest does not match");
  expect(await snapshot()).toEqual(before);
}, 30_000);
