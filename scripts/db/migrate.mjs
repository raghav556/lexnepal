import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const drizzleKit = path.join(root, "node_modules/drizzle-kit/bin.cjs");

const migration = spawnSync(
  process.execPath,
  [drizzleKit, "migrate", "--config", "drizzle.config.ts"],
  { cwd: root, stdio: "inherit" },
);

if (migration.error) {
  console.error(migration.error.message);
  process.exit(1);
}

if (migration.status !== 0) process.exit(migration.status ?? 1);

const status = spawnSync(
  process.execPath,
  ["--env-file-if-exists=.env.local", "scripts/db/migration-status.mjs"],
  {
    cwd: root,
    stdio: "inherit",
  },
);

if (status.error) {
  console.error(status.error.message);
  process.exit(1);
}

process.exit(status.status ?? 0);
