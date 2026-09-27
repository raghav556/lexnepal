import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createConnection } from "mysql2/promise";

/** A schema-only copy of local MySQL, never a copy of owner or client records. */
export async function createSigningTestDatabase(
  options: { applyArtifactMigration?: boolean } = {},
) {
  const source = process.env.DATABASE_URL;
  if (!source) throw new Error("DATABASE_URL must be loaded from .env.local for signing tests");
  const url = new URL(source);
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error("Signing integration tests only run against local MySQL");
  }
  const sourceName = decodeURIComponent(url.pathname.slice(1));
  if (!/^[a-zA-Z0-9_]+$/.test(sourceName)) throw new Error("Unsafe local database name");
  const name = `lexnepal_signing_test_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const admin = await createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: "root",
    multipleStatements: true,
  });
  const localRoot = process.env.LOCALAPPDATA;
  const dumpBin =
    process.env.MYSQLDUMP_BIN ??
    (localRoot
      ? path.join(
          localRoot,
          "LexNepal",
          "MySQL",
          "server",
          "mysql-8.4.9-winx64",
          "bin",
          "mysqldump.exe",
        )
      : "mysqldump");
  let storageRoot: string | undefined;
  try {
    const [tableRows] = await admin.query<
      Array<{ count: number }> & import("mysql2").RowDataPacket[]
    >(
      "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'signature_artifact_upload_intents'",
      [sourceName],
    );
    if (Number(tableRows[0]?.count) !== 0)
      throw new Error("Source database is not at the expected pre-0007 schema");
    await admin.query(
      `CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
    const schemaSql = execFileSync(
      dumpBin,
      [
        "--no-data",
        "--skip-triggers",
        "--skip-events",
        "--skip-routines",
        "--no-tablespaces",
        "--skip-comments",
        "--set-gtid-purged=OFF",
        "--host",
        url.hostname,
        "--port",
        String(url.port || 3306),
        "--user",
        "root",
        sourceName,
      ],
      { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    );
    await admin.query(`USE \`${name}\``);
    await admin.query(schemaSql);
    if (options.applyArtifactMigration !== false) {
      // Job A/B fixture setup only. Job C opts out and applies 0007 itself.
      await admin.query(
        await readFile(path.resolve("drizzle/0007_signature_artifact_upload_intents.sql"), "utf8"),
      );
    }
    const testUrl = new URL(source);
    testUrl.pathname = `/${name}`;
    // The app user is scoped to the source schema. The local root connection
    // created this disposable clone and is used only for this guarded test URL.
    testUrl.username = "root";
    testUrl.password = "";
    process.env.DATABASE_URL = testUrl.toString();
    storageRoot = await mkdtemp(path.join(tmpdir(), "lexnepal-signing-tests-"));
    process.env.STORAGE_ROOT = storageRoot;
    return {
      name,
      admin,
      storageRoot,
      async dispose(closeAppDatabase: () => Promise<void>) {
        await closeAppDatabase();
        await admin.query(`DROP DATABASE \`${name}\``);
        await admin.end();
        if (storageRoot && path.basename(storageRoot).startsWith("lexnepal-signing-tests-")) {
          await rm(storageRoot, { recursive: true, force: true });
        }
      },
    };
  } catch (error) {
    await admin.query(`DROP DATABASE IF EXISTS \`${name}\``).catch(() => undefined);
    await admin.end();
    if (storageRoot && path.basename(storageRoot).startsWith("lexnepal-signing-tests-"))
      await rm(storageRoot, { recursive: true, force: true });
    throw error;
  }
}
