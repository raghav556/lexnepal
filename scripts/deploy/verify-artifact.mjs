import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? ".next/standalone");
const required = [
  "server.js",
  "app.cjs",
  "runtime-env.cjs",
  "ecosystem.config.cjs",
  "runtime/worker.mjs",
  "runtime/scheduler.mjs",
  "runtime/worker-once.mjs",
  "runtime/scheduler-once.mjs",
  "runtime/migrate.mjs",
  "runtime/migration-status.mjs",
  "drizzle/meta/_journal.json",
  ".next/static",
  "public",
];
const forbiddenTopLevel = ["tests", "test-results", "doc", "tmp", "logs", "exports", ".local"];

const failures = [];
for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`missing ${relative}`);
}
for (const relative of forbiddenTopLevel) {
  if (fs.existsSync(path.join(root, relative))) failures.push(`forbidden ${relative}`);
}

for (const file of walk(root)) {
  if ([".env", ".env.local", ".env.runtime"].includes(path.basename(file))) {
    failures.push(`forbidden environment file ${path.relative(root, file)}`);
  }
}

if (failures.length > 0) {
  console.error(`Release artifact rejected:\n${failures.map((item) => `- ${item}`).join("\n")}`);
  process.exit(1);
}

console.log(`Release artifact verified: ${root}`);

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}
