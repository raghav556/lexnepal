/** Restore the newest local MySQL dump into an isolated drill database, verify, then drop it. */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const envPath = join(root, ".env.local");

function readDatabaseUrl() {
  const text = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const line = text.split(/\r?\n/).find((item) => item.startsWith("DATABASE_URL="));
  const raw = (line?.slice("DATABASE_URL=".length) || process.env.DATABASE_URL || "").trim();
  const url = new URL(raw);
  if (url.protocol !== "mysql:") throw new Error("DATABASE_URL must use mysql://");
  return {
    user: decodeURIComponent(url.username),
    pass: decodeURIComponent(url.password),
    host: url.hostname,
    port: url.port || "3306",
    db: url.pathname.slice(1),
  };
}

function mysqlBin(name) {
  const localAppData = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
  const portable = join(
    localAppData,
    "LexNepal",
    "MySQL",
    "server",
    "mysql-8.4.9-winx64",
    "bin",
    name,
  );
  if (existsSync(portable)) return portable;
  const base = "C:\\Program Files\\MySQL";
  const installations = readdirSync(base).sort().reverse();
  const installation = installations.find((item) => existsSync(join(base, item, "bin", name)));
  if (!installation) throw new Error("MySQL installation not found");
  return join(base, installation, "bin", name);
}

function run(bin, args, env, input) {
  return spawnSync(bin, args, {
    env: { ...process.env, ...env },
    encoding: "utf8",
    shell: false,
    input,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function main() {
  const { user, pass, host, port, db } = readDatabaseUrl();
  const drillDb = "lexnepal_restore_drill";
  if (db === drillDb) throw new Error("Live DB name collides with drill DB");
  const localAppData = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
  const backupRoot = join(localAppData, "LexNepal", "backups");
  mkdirSync(backupRoot, { recursive: true });

  let dumps = readdirSync(backupRoot).filter((file) => /^lexnepal-.*\.sql$/.test(file));
  if (dumps.length === 0) {
    const backup = run(
      "powershell",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        join(root, "scripts/local/mysql-backup.ps1"),
      ],
      {},
    );
    if (backup.status !== 0) throw new Error(`Backup failed: ${backup.stderr || backup.stdout}`);
    dumps = readdirSync(backupRoot).filter((file) => /^lexnepal-.*\.sql$/.test(file));
  }
  const latest = dumps
    .map((file) => ({
      path: join(backupRoot, file),
      mtime: statSync(join(backupRoot, file)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)[0]?.path;
  if (!latest) throw new Error("No MySQL backup available");

  const mysql = mysqlBin("mysql.exe");
  const args = [
    "--protocol=TCP",
    `--host=${host}`,
    `--port=${port}`,
    `--user=${user}`,
    "--batch",
    "--skip-column-names",
  ];
  const env = { MYSQL_PWD: pass };
  const recreate = run(
    mysql,
    [
      ...args,
      "--execute",
      `DROP DATABASE IF EXISTS \`${drillDb}\`; CREATE DATABASE \`${drillDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`,
    ],
    env,
  );
  if (recreate.status !== 0) throw new Error(`Drill database creation failed: ${recreate.stderr}`);
  const restore = run(mysql, [...args, drillDb], env, readFileSync(latest, "utf8"));
  if (restore.status !== 0) throw new Error(`Restore failed: ${restore.stderr}`);
  const count = run(
    mysql,
    [
      ...args,
      drillDb,
      "--execute",
      "SELECT JSON_OBJECT('firms',(SELECT COUNT(*) FROM firms),'users',(SELECT COUNT(*) FROM users),'testimonials',(SELECT COUNT(*) FROM testimonials));",
    ],
    env,
  );
  if (count.status !== 0) throw new Error(`Smoke count failed: ${count.stderr}`);
  const smokeCounts = JSON.parse(count.stdout.trim());
  const drop = run(mysql, [...args, "--execute", `DROP DATABASE \`${drillDb}\`;`], env);
  if (drop.status !== 0) throw new Error(`Drill cleanup failed: ${drop.stderr}`);

  const result = {
    ok: true,
    dump: latest,
    drillDb,
    dropped: true,
    smokeCounts,
    ranAt: new Date().toISOString(),
  };
  const logPath = join(backupRoot, "restore-drill-latest.json");
  writeFileSync(logPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main();
