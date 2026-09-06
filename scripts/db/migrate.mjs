import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { createPool } from "mysql2/promise";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = fs.existsSync(path.join(scriptDirectory, "../drizzle"))
  ? path.resolve(scriptDirectory, "..")
  : path.resolve(scriptDirectory, "../..");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

const pool = createPool({
  uri: databaseUrl,
  connectionLimit: 1,
  charset: "utf8mb4",
  timezone: "Z",
});

try {
  await migrate(drizzle(pool), { migrationsFolder: path.join(root, "drizzle") });
} finally {
  await pool.end();
}

await import("./migration-status.mjs");
