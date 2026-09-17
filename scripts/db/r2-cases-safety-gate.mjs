import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createPool } from "mysql2/promise";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationSql = fs.readFileSync(
  path.join(root, "drizzle/0005_cases_domain_foundations.sql"),
  "utf8",
);
const recoveryDoc = path.join(root, "doc/migration/R2_CASES_SAFETY_GATE.md");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(recoveryDoc)) fail(`Missing recovery doc: ${recoveryDoc}`);
if (/INSERT\s+INTO\s+`case_parties`/i.test(migrationSql)) {
  fail("0005 must not insert case_parties rows.");
}
if (/client_summary[^\n]*=[^\n]*description/i.test(migrationSql)) {
  fail("0005 must not copy description into client_summary.");
}

const sourceUrl = process.env.DATABASE_URL;
if (!sourceUrl) fail("DATABASE_URL is required to run the R2 safety gate.");

const source = new URL(sourceUrl);
const sourceDb = decodeURIComponent(source.pathname.replace(/^\//, ""));
if (!sourceDb) fail("DATABASE_URL is missing a database name.");
if (sourceDb.endsWith("_r2_gate")) fail("Refusing to clone a gate database onto itself.");

const copyDb = `${sourceDb}_r2_gate`.slice(0, 64);
const copyUrl = new URL(sourceUrl);
copyUrl.pathname = `/${copyDb}`;

const adminUrl = new URL(sourceUrl);
adminUrl.pathname = "/";
const admin = createPool({ uri: adminUrl.toString(), timezone: "Z" });
const keepCopy = process.env.KEEP_R2_GATE === "1";

function asCount(value) {
  return Number(value ?? 0);
}

async function hasRelation(pool, table, column) {
  const [rows] = await pool.query(
    `SELECT 1 AS ok FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column ?? "id"],
  );
  return rows.length > 0;
}

async function snapshot(pool) {
  const hasSummary = await hasRelation(pool, "cases", "client_summary");
  const hasOutcome = await hasRelation(pool, "cases", "closure_outcome");
  const hasParties = await hasRelation(pool, "case_parties");
  const [[row]] = await pool.query(`
    SELECT
      COUNT(*) AS caseCount,
      SUM(CRC32(IFNULL(description, ''))) AS descriptionChecksum,
      SUM(CRC32(IFNULL(CAST(closed_date AS CHAR), ''))) AS closedDateChecksum,
      SUM(status = 'closed_won') AS closedWon,
      SUM(status = 'closed_lost') AS closedLost,
      SUM(status = 'closed') AS closed
    FROM cases
  `);
  let summaries = 0;
  let outcomes = 0;
  let parties = 0;
  if (hasSummary) {
    const [[summaryRow]] = await pool.query(
      "SELECT SUM(client_summary IS NOT NULL) AS n FROM cases",
    );
    summaries = asCount(summaryRow.n);
  }
  if (hasOutcome) {
    const [[outcomeRow]] = await pool.query(
      "SELECT SUM(closure_outcome IS NOT NULL) AS n FROM cases",
    );
    outcomes = asCount(outcomeRow.n);
  }
  if (hasParties) {
    const [[partyRow]] = await pool.query("SELECT COUNT(*) AS n FROM case_parties");
    parties = asCount(partyRow.n);
  }
  return {
    caseCount: asCount(row.caseCount),
    descriptionChecksum: asCount(row.descriptionChecksum),
    closedDateChecksum: asCount(row.closedDateChecksum),
    closedWon: asCount(row.closedWon),
    closedLost: asCount(row.closedLost),
    closed: asCount(row.closed),
    outcomes,
    summaries,
    parties,
  };
}

async function cloneDatabase() {
  await admin.query(`DROP DATABASE IF EXISTS \`${copyDb}\``);
  await admin.query(
    `CREATE DATABASE \`${copyDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  );
  const [tables] = await admin.query(
    `SELECT table_name AS name FROM information_schema.tables
     WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
    [sourceDb],
  );
  await admin.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of tables) {
    const name = table.name;
    await admin.query(`CREATE TABLE \`${copyDb}\`.\`${name}\` LIKE \`${sourceDb}\`.\`${name}\``);
    await admin.query(
      `INSERT INTO \`${copyDb}\`.\`${name}\` SELECT * FROM \`${sourceDb}\`.\`${name}\``,
    );
  }
  await admin.query("SET FOREIGN_KEY_CHECKS = 1");
}

try {
  await cloneDatabase();
  const copy = createPool({ uri: copyUrl.toString(), timezone: "Z", charset: "utf8mb4" });
  try {
    const before = await snapshot(copy);
    const migrated = spawnSync(
      process.execPath,
      ["--env-file-if-exists=.env.local", "scripts/db/migrate.mjs"],
      {
        cwd: root,
        env: { ...process.env, DATABASE_URL: copyUrl.toString() },
        encoding: "utf8",
      },
    );
    if (migrated.status !== 0) {
      fail(`Migration on copy failed:\n${migrated.stdout}\n${migrated.stderr}`);
    }
    const after = await snapshot(copy);
    const [[statusType]] = await copy.query(
      `
      SELECT COLUMN_TYPE AS columnType FROM information_schema.columns
      WHERE table_schema = ? AND table_name = 'cases' AND column_name = 'status'
    `,
      [copyDb],
    );
    const enumValues = String(statusType.columnType);
    const checks = [];
    const assert = (ok, label) => {
      checks.push({ ok, label });
      if (!ok) console.error(`FAIL: ${label}`);
    };

    assert(after.caseCount === before.caseCount, "case row count unchanged");
    assert(
      after.descriptionChecksum === before.descriptionChecksum,
      "description checksum unchanged",
    );
    assert(after.closedDateChecksum === before.closedDateChecksum, "closedDate checksum unchanged");
    assert(after.parties === 0, "case_parties remains empty");
    assert(after.summaries === 0, "client_summary was not backfilled");
    assert(enumValues.includes("'closed'"), "status enum includes closed");
    assert(after.closedWon === 0, "closed_won rows converted");
    assert(after.closedLost === 0, "closed_lost rows converted");
    assert(
      after.closed >= before.closed + before.closedWon + before.closedLost,
      "closed count includes converted won/lost rows",
    );

    const failed = checks.filter((check) => !check.ok);
    const result = {
      ok: failed.length === 0,
      sourceDb,
      copyDb,
      before,
      after,
      enumValues,
      failed: failed.map((check) => check.label),
    };
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) fail("R2 safety gate failed on the database copy.");
    console.log("R2 safety gate passed. Safe to run npm run db:migrate on the primary database.");
  } finally {
    await copy.end();
  }
} finally {
  if (!keepCopy) {
    await admin.query(`DROP DATABASE IF EXISTS \`${copyDb}\``);
  }
  await admin.end();
}
