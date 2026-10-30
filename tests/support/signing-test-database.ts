import { execFileSync } from "node:child_process";
import { chmod, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createConnection } from "mysql2/promise";
import { createDisposableMysql, testMysqlAdminUrl } from "./disposable-mysql";
import { withMigrationSession } from "../../scripts/db/migration-session.mjs";

function optionValue(value: string) {
  if (/[\0\x01-\x08\x0b\x0c\x0e-\x1f]/.test(value)) {
    throw new Error("Unsupported MySQL client credential characters");
  }
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n").replaceAll("\r", "\\r").replaceAll("\t", "\\t")}"`;
}

/** Dumps only a freshly migrated owned template, never the configured application's data. */
async function dumpSchema(name: string) {
  if (!/^lexnepal_test_[a-f0-9]{24}$/.test(name)) throw new Error("Unowned dump source");
  const url = testMysqlAdminUrl();
  const credentialsRoot = await mkdtemp(path.join(tmpdir(), "lexnepal-mysql-client-"));
  try {
    await chmod(credentialsRoot, 0o700);
    const config = path.join(credentialsRoot, "client.cnf");
    await writeFile(
      config,
      `[client]\nprotocol=TCP\nhost=${optionValue(url.hostname)}\nport=${url.port || "3306"}\nuser=${optionValue(decodeURIComponent(url.username))}\npassword=${optionValue(decodeURIComponent(url.password))}\n`,
      { mode: 0o600 },
    );
    const dumpBin =
      process.env.MYSQLDUMP_BIN ??
      (process.env.LOCALAPPDATA
        ? path.join(
            process.env.LOCALAPPDATA,
            "LexNepal",
            "MySQL",
            "server",
            "mysql-8.4.9-winx64",
            "bin",
            "mysqldump.exe",
          )
        : "mysqldump");
    try {
      return execFileSync(
        dumpBin,
        [
          `--defaults-extra-file=${config}`,
          "--no-data",
          "--skip-triggers",
          "--skip-events",
          "--skip-routines",
          "--no-tablespaces",
          "--skip-comments",
          "--set-gtid-purged=OFF",
          name,
        ],
        { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] },
      );
    } catch {
      // Child errors may contain parsed option-file contents. Never propagate credentials.
      throw new Error("Schema-only fixture dump failed");
    }
  } finally {
    if (
      path.dirname(path.resolve(credentialsRoot)) !== path.resolve(tmpdir()) ||
      !path.basename(credentialsRoot).startsWith("lexnepal-mysql-client-")
    )
      throw new Error("Refusing unowned credential-directory cleanup");
    await rm(credentialsRoot, { recursive: true, force: true });
  }
}

/** Builds the pre-0007 schema from immutable migrations in disposable schemas only. */
export async function createSigningTestDatabase(
  options: { applyArtifactMigration?: boolean } = {},
) {
  const adminUrl = testMysqlAdminUrl();
  let source: Awaited<ReturnType<typeof createDisposableMysql>> | undefined;
  let target: Awaited<ReturnType<typeof createDisposableMysql>> | undefined;
  let setup: Awaited<ReturnType<typeof createConnection>> | undefined;
  let database: Awaited<ReturnType<typeof createConnection>> | undefined;
  let storageRoot: string | undefined;
  let stage = "provision template";
  async function dispose(closeAppDatabase: () => Promise<void> = async () => undefined) {
    // Attempt every owned cleanup even when an earlier close/drop fails.
    const failures: unknown[] = [];
    for (const close of [
      closeAppDatabase,
      async () => database?.end(),
      async () => setup?.end(),
      async () => target?.dispose(),
      async () => source?.dispose(),
      async () => {
        if (storageRoot) {
          if (
            path.dirname(path.resolve(storageRoot)) !== path.resolve(tmpdir()) ||
            !path.basename(storageRoot).startsWith("lexnepal-signing-tests-")
          )
            throw new Error("Refusing unowned storage cleanup");
          await rm(storageRoot, { recursive: true, force: true });
        }
      },
    ]) {
      try {
        await close();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length) throw new Error("Owned signing-fixture cleanup failed");
  }
  try {
    source = await createDisposableMysql();
    adminUrl.pathname = `/${source.name}`;
    setup = await createConnection(adminUrl.toString());
    stage = "migrate template";
    await withMigrationSession(setup, async () => {
      const files = (await readdir(path.resolve("drizzle")))
        .filter((file) => /^000[0-6]_.+\.sql$/.test(file))
        .sort();
      if (files.length !== 7) throw new Error("Expected seven pre-artifact migrations");
      for (const file of files) {
        const sql = await readFile(path.resolve("drizzle", file), "utf8");
        for (const statement of sql
          .split("--> statement-breakpoint")
          .map((s) => s.trim())
          .filter(Boolean)) {
          await setup!.query(statement);
        }
      }
    });
    const [tables] = await setup.query<import("mysql2").RowDataPacket[]>(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = ?",
      [source.name],
    );
    const names = new Set(tables.map((table) => String(table.name)));
    if (
      !["firms", "users", "documents", "durable_jobs", "signing_challenges"].every((name) =>
        names.has(name),
      ) ||
      names.has("signature_artifact_upload_intents")
    )
      throw new Error("Invalid pre-artifact application fixture schema");
    const [[rows]] = await setup.query<import("mysql2").RowDataPacket[]>(
      "SELECT (SELECT COUNT(*) FROM firms) + (SELECT COUNT(*) FROM users) + (SELECT COUNT(*) FROM documents) AS records",
    );
    if (Number(rows.records) !== 0)
      throw new Error("Fixture template must contain no application records");
    stage = "dump schema";
    const schemaSql = await dumpSchema(source.name);
    if (/^\s*(?:USE\s|CREATE\s+DATABASE\b|INSERT\s+INTO\b|REPLACE\s+INTO\b)/im.test(schemaSql)) {
      throw new Error("Unexpected data or database selection in schema-only dump");
    }
    stage = "import schema";
    target = await createDisposableMysql();
    database = await createConnection({ uri: target.url, multipleStatements: true });
    await database.query(schemaSql);
    if (options.applyArtifactMigration !== false) {
      await database.query(
        await readFile(path.resolve("drizzle/0007_signature_artifact_upload_intents.sql"), "utf8"),
      );
    }
    await setup.end();
    setup = undefined;
    await source.dispose();
    source = undefined;
    storageRoot = await mkdtemp(path.join(tmpdir(), "lexnepal-signing-tests-"));
    process.env.DATABASE_URL = target.url;
    process.env.STORAGE_ROOT = storageRoot;
    return { name: target.name, admin: database, storageRoot, dispose };
  } catch (error) {
    await dispose();
    const code = (error as { code?: string })?.code;
    throw new Error(
      `Disposable signing database ${stage} failed${code && /^[A-Z0-9_]+$/.test(code) ? ` (${code})` : ""}`,
    );
  }
}
