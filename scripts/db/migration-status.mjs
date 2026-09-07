import fs from "node:fs/promises";
import syncFs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createPool } from "mysql2/promise";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = syncFs.existsSync(path.join(scriptDirectory, "../drizzle"))
  ? path.resolve(scriptDirectory, "..")
  : path.resolve(scriptDirectory, "../..");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required to check migration status.");
  process.exit(1);
}

const journalPath = path.join(root, "drizzle/meta/_journal.json");
const journal = JSON.parse(await fs.readFile(journalPath, "utf8"));
const expected = await Promise.all(
  journal.entries.map(async (entry) => {
    const sqlPath = path.join(root, "drizzle", `${entry.tag}.sql`);
    const sql = await fs.readFile(sqlPath, "utf8");
    return {
      idx: entry.idx,
      tag: entry.tag,
      createdAt: Number(entry.when),
      hash: createHash("sha256").update(sql).digest("hex"),
    };
  }),
);

const pool = createPool({
  uri: databaseUrl,
  connectionLimit: 1,
  charset: "utf8mb4",
  timezone: "Z",
});

try {
  await pool.query(`
    create table if not exists __drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `);
  const [rows] = await pool.query(
    "select id, hash, created_at from __drizzle_migrations order by created_at asc, id asc",
  );
  const appliedByCreatedAt = new Map(rows.map((row) => [Number(row.created_at), row]));
  const expectedCreatedAt = new Set(expected.map((entry) => entry.createdAt));

  console.log("Migration status:");
  console.log("Status   Migration");
  console.log("-------  --------------------------------");

  let applied = 0;
  for (const entry of expected) {
    const row = appliedByCreatedAt.get(entry.createdAt);
    if (row) applied += 1;
    console.log(`${row ? "Ran    " : "Pending"}  ${entry.tag}`);
  }

  const unknown = rows.filter((row) => !expectedCreatedAt.has(Number(row.created_at)));
  for (const row of unknown) {
    console.log(`Unknown  created_at=${row.created_at} id=${row.id}`);
  }

  console.log("");
  console.log(`Applied: ${applied}`);
  console.log(`Pending: ${expected.length - applied}`);
  console.log(`Unknown: ${unknown.length}`);
} finally {
  await pool.end();
}
