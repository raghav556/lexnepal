import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(child) : [child];
  });
}

const manifestFile = path.join("drizzle", "checksums.json");
const migrations = walk("drizzle")
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => ({
    file: file.replaceAll("\\", "/"),
    sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
  }));

if (process.argv.includes("--write")) {
  fs.writeFileSync(
    manifestFile,
    `${JSON.stringify({ algorithm: "sha256", migrations }, null, 2)}\n`,
  );
  console.log(`Wrote checksums for ${migrations.length} migration files.`);
  process.exit(0);
}

const expected = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
if (
  expected.algorithm !== "sha256" ||
  JSON.stringify(expected.migrations) !== JSON.stringify(migrations)
) {
  console.error(
    "Migration checksum mismatch. Never edit an applied migration; add a new migration instead.",
  );
  process.exit(1);
}
console.log(`Verified checksums for ${migrations.length} migration files.`);
