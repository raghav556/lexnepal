/**
 * Local Postgres restore drill: restore newest dump into lexnepal_restore_drill,
 * smoke-count firms/users/testimonials, drop drill DB. Never touches live DB.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const envPath = join(root, ".env.local");

function readDatabaseUrl() {
  const text = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const line = text.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
  const raw = (line?.slice("DATABASE_URL=".length) || process.env.DATABASE_URL || "").trim();
  const m = raw.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?\s]+)/);
  if (!m) throw new Error("Could not parse DATABASE_URL");
  return { user: m[1], pass: m[2], host: m[3], port: m[4], db: m[5] };
}

function pgBin(name) {
  const base = "C:\\Program Files\\PostgreSQL";
  const versions = readdirSync(base)
    .map((v) => ({ v, n: Number(v) }))
    .filter((x) => Number.isFinite(x.n))
    .sort((a, b) => b.n - a.n);
  if (!versions.length) throw new Error("PostgreSQL install not found");
  return join(base, versions[0].v, "bin", name);
}

function run(bin, args, env) {
  return spawnSync(bin, args, {
    env: { ...process.env, ...env },
    encoding: "utf8",
    shell: false,
  });
}

function ensureBackup(backupRoot) {
  const dumps = existsSync(backupRoot)
    ? readdirSync(backupRoot).filter((f) => f.startsWith("lexnepal-") && f.endsWith(".dump"))
    : [];
  if (dumps.length) return;
  const backup = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(root, "scripts/local/postgres-backup.ps1")],
    { cwd: root, encoding: "utf8", shell: false },
  );
  if (backup.status !== 0) throw new Error(`Backup failed: ${backup.stderr || backup.stdout}`);
}

function main() {
  const { user, pass, host, port, db } = readDatabaseUrl();
  const drillDb = "lexnepal_restore_drill";
  if (db === drillDb) throw new Error("Live DB name collides with drill DB");

  const localAppData = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
  const backupRoot = join(localAppData, "LexNepal", "backups");
  mkdirSync(backupRoot, { recursive: true });
  ensureBackup(backupRoot);

  const dumps = readdirSync(backupRoot)
    .filter((f) => f.startsWith("lexnepal-") && f.endsWith(".dump"))
    .map((f) => ({ path: join(backupRoot, f), mtime: statSync(join(backupRoot, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!dumps.length) throw new Error("No backup dump available");
  const latest = dumps[0].path;

  const env = { PGPASSWORD: pass };
  const psql = pgBin("psql.exe");
  const dropdb = pgBin("dropdb.exe");
  const createdb = pgBin("createdb.exe");
  const pgRestore = pgBin("pg_restore.exe");

  run(psql, [
    "-h",
    host,
    "-p",
    port,
    "-U",
    user,
    "-d",
    "postgres",
    "-c",
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${drillDb}' AND pid <> pg_backend_pid();`,
  ], env);
  run(dropdb, ["-h", host, "-p", port, "-U", user, "--if-exists", drillDb], env);
  const create = run(createdb, ["-h", host, "-p", port, "-U", user, "-O", user, drillDb], env);
  if (create.status !== 0) throw new Error(`createdb failed: ${create.stderr}`);

  run(pgRestore, ["-h", host, "-p", port, "-U", user, "-d", drillDb, "--no-owner", "--no-acl", latest], env);

  const count = run(
    psql,
    [
      "-h",
      host,
      "-p",
      port,
      "-U",
      user,
      "-d",
      drillDb,
      "-t",
      "-A",
      "-c",
      "SELECT json_build_object('firms', (SELECT count(*) FROM firms), 'users', (SELECT count(*) FROM users), 'testimonials', (SELECT count(*) FROM testimonials));",
    ],
    env,
  );
  if (count.status !== 0) throw new Error(`Smoke count failed: ${count.stderr}`);
  const smokeCountsJson = (count.stdout || "").trim();
  if (!smokeCountsJson) throw new Error("Empty smoke counts");

  run(dropdb, ["-h", host, "-p", port, "-U", user, "--if-exists", drillDb], env);

  const result = {
    ok: true,
    dump: latest,
    drillDb,
    dropped: true,
    smokeCounts: JSON.parse(smokeCountsJson),
    ranAt: new Date().toISOString(),
  };
  const logPath = join(backupRoot, "restore-drill-latest.json");
  writeFileSync(logPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(result)}\n`);
  console.error(`Restore drill OK (live DB untouched). Log: ${logPath}`);
}

main();
