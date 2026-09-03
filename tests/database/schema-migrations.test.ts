import fs from "node:fs";
import path from "node:path";
import { getTableName } from "drizzle-orm";
import { createPool, type Pool, type RowDataPacket } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { convexTableTargets } from "../../db/schema";
import indexManifest from "../../db/index-manifest.json";

const testDatabaseName = "lexnepal_test";
const migrationFiles = fs
  .readdirSync(path.resolve("drizzle"))
  .filter((file) => /^\d{4}_.+\.sql$/.test(file))
  .sort()
  .map((file) => path.join("drizzle", file));

function databaseUrl(databaseName = testDatabaseName): URL {
  const url = new URL(
    process.env.DATABASE_URL ?? "mysql://ethan:ethan@127.0.0.1:3306/dit_lexnepal",
  );
  url.pathname = databaseName ? `/${databaseName}` : "";
  return url;
}

async function applySqlFile(database: Pool, file: string): Promise<void> {
  const contents = fs.readFileSync(path.resolve(file), "utf8");
  for (const statement of contents
    .split("--> statement-breakpoint")
    .map((part) => part.trim())
    .filter(Boolean)) {
    try {
      await database.query(statement);
    } catch (error) {
      throw new Error(`Migration failed in ${file}: ${statement.slice(0, 240)}`, {
        cause: error,
      });
    }
  }
}

async function rows<T extends RowDataPacket>(statement: string): Promise<T[]> {
  const [result] = await database.query<T[]>(statement);
  return result;
}

async function expectRejected(statement: string): Promise<void> {
  await expect(database.query(statement)).rejects.toThrow();
}

let admin: Pool;
let database: Pool;

beforeAll(async () => {
  admin = createPool({ uri: databaseUrl("").toString(), timezone: "Z" });
  await admin.query(`DROP DATABASE IF EXISTS \`${testDatabaseName}\``);
  await admin.query(
    `CREATE DATABASE \`${testDatabaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  );
  database = createPool({ uri: databaseUrl().toString(), timezone: "Z", charset: "utf8mb4" });
  for (const migration of migrationFiles) await applySqlFile(database, migration);
  for (const statement of fs
    .readFileSync(path.resolve("tests/fixtures/mysql/base.sql"), "utf8")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)) {
    await database.query(statement);
  }
}, 120_000);

afterAll(async () => {
  if (database) await database.end();
  if (admin) {
    await admin.query(`DROP DATABASE IF EXISTS \`${testDatabaseName}\``);
    await admin.end();
  }
});

describe("MySQL schema migrations", () => {
  it("creates every retained table with utf8mb4 collation", async () => {
    expect(Object.keys(convexTableTargets)).toHaveLength(39);
    const expectedTargets = Object.values(convexTableTargets).map(getTableName);
    const actual = await rows<{ tableName: string; tableCollation: string } & RowDataPacket>(
      `SELECT table_name AS tableName, table_collation AS tableCollation FROM information_schema.tables WHERE table_schema = '${testDatabaseName}' AND table_type = 'BASE TABLE'`,
    );
    expect(actual).toHaveLength(75);
    const names = new Set(actual.map((row) => row.tableName));
    for (const target of expectedTargets) expect(names.has(target), target).toBe(true);
    expect(actual.every((row) => row.tableCollation.startsWith("utf8mb4_"))).toBe(true);
  });

  it("requires firm ownership on every tenant table", async () => {
    const result = await rows<{ tableName: string; isNullable: string } & RowDataPacket>(
      `SELECT table_name AS tableName, is_nullable AS isNullable FROM information_schema.columns WHERE table_schema = '${testDatabaseName}' AND column_name = 'firm_id'`,
    );
    expect(result).toHaveLength(68);
    expect(result.filter((row) => row.isNullable !== "NO")).toEqual([]);
  });

  it("contains every documented operational index", async () => {
    const result = await rows<{ indexName: string } & RowDataPacket>(
      `SELECT DISTINCT index_name AS indexName FROM information_schema.statistics WHERE table_schema = '${testDatabaseName}'`,
    );
    const actual = new Set(result.map((row) => row.indexName));
    expect(indexManifest.length).toBeGreaterThan(200);
    for (const documented of indexManifest) {
      expect(actual.has(documented.index), documented.index).toBe(true);
    }
  });

  it("allows firm-owned uniqueness across firms but rejects duplicates within a firm", async () => {
    await expectRejected(`INSERT INTO cases (firm_id, case_number, title, practice_area, status, client_id, assigned_lawyer_id, conflict_checked)
      VALUES ('00000000-0000-4000-8000-000000000001', 'CASE-001', 'Duplicate', 'civil', 'active',
      '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', false)`);
    const [count] = await rows<{ count: number } & RowDataPacket>(
      "SELECT COUNT(*) AS count FROM cases WHERE case_number = 'CASE-001'",
    );
    expect(Number(count.count)).toBe(2);
  });

  it("rejects cross-firm relationships", async () => {
    await expectRejected(`INSERT INTO cases (firm_id, case_number, title, practice_area, status, client_id, assigned_lawyer_id, conflict_checked)
      VALUES ('00000000-0000-4000-8000-000000000002', 'CROSS-CASE', 'Cross firm', 'civil', 'active',
      '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', false)`);
    await expectRejected(`INSERT INTO signature_recipients (firm_id, envelope_id, user_id, routing_order, status)
      VALUES ('00000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002', 1, 'pending')`);
  });

  it("enforces authentication, storage, document, KYC and job checks", async () => {
    await expectRejected(`INSERT INTO sessions (firm_id, user_id, device, browser, ip_address, token_hash, last_active)
      VALUES ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
      'web', 'oidc', '127.0.0.1', 'incomplete-token-hash', NOW())`);
    await expectRejected(`INSERT INTO document_upload_intents
      (firm_id, created_by, original_file_name, declared_mime_type, declared_size_bytes, quarantine_key, expires_at)
      VALUES ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
      'oversized.pdf', 'application/pdf', 52428801, 'quarantine/oversized', DATE_ADD(NOW(), INTERVAL 1 HOUR))`);
    await expectRejected(`INSERT INTO client_kyc_upload_intents
      (firm_id, client_id, user_id, document_type, original_file_name, declared_mime_type, declared_size_bytes, quarantine_key, expires_at)
      VALUES ('00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001', 'government_id', 'unsafe.html', 'text/html', 100,
      'quarantine/unsafe-kyc', DATE_ADD(NOW(), INTERVAL 1 HOUR))`);
    await expectRejected(`INSERT INTO documents (firm_id, document_number, title, type, storage_id, mime_type, size_bytes, version, uploaded_by, is_template, is_privileged)
      VALUES ('00000000-0000-4000-8000-000000000001', 'BAD-SIZE', 'Bad', 'other', 'bad-size', 'text/plain', 0, 1,
      '10000000-0000-4000-8000-000000000001', false, false)`);
    await expectRejected(`INSERT INTO durable_jobs (firm_id, type, idempotency_key, actor_user_id, max_attempts)
      VALUES ('00000000-0000-4000-8000-000000000001', 'analytics.aggregate', 'bad-attempts',
      '10000000-0000-4000-8000-000000000001', 21)`);
  });

  it("supports UUID defaults, JSON, CRUD, UTC timestamps and transactions", async () => {
    await database.query(`INSERT INTO durable_jobs (firm_id, type, idempotency_key, actor_user_id, payload)
      VALUES ('00000000-0000-4000-8000-000000000001', 'analytics.aggregate', 'json-crud',
      '10000000-0000-4000-8000-000000000001', JSON_OBJECT('kind', 'verification'))`);
    const [created] = await rows<
      { id: string; payload: { kind: string }; created_at: Date } & RowDataPacket
    >("SELECT id, payload, created_at FROM durable_jobs WHERE idempotency_key = 'json-crud'");
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(created.payload).toEqual({ kind: "verification" });
    await database.query("UPDATE durable_jobs SET priority = 42 WHERE id = ?", [created.id]);
    const [updated] = await rows<{ priority: number } & RowDataPacket>(
      `SELECT priority FROM durable_jobs WHERE id = '${created.id}'`,
    );
    expect(updated.priority).toBe(42);
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM durable_jobs WHERE id = ?", [created.id]);
      await connection.rollback();
    } finally {
      connection.release();
    }
    const [preserved] = await rows<{ count: number } & RowDataPacket>(
      `SELECT COUNT(*) AS count FROM durable_jobs WHERE id = '${created.id}'`,
    );
    expect(Number(preserved.count)).toBe(1);
    await database.query("DELETE FROM durable_jobs WHERE id = ?", [created.id]);
    const [timezone] = await rows<{ timezone: string } & RowDataPacket>(
      "SELECT @@session.time_zone AS timezone",
    );
    expect(["+00:00", "UTC"]).toContain(timezone.timezone);
  });

  it("does not create the removed finance tables", async () => {
    const result = await rows<{ tableName: string } & RowDataPacket>(
      `SELECT table_name AS tableName FROM information_schema.tables WHERE table_schema = '${testDatabaseName}'`,
    );
    const names = new Set(result.map((row) => row.tableName));
    for (const removed of [
      "payments",
      "invoice_line_items",
      "time_entries",
      "expenses",
      "trust_transactions",
      "invoices",
    ]) {
      expect(names.has(removed), removed).toBe(false);
    }
  });
});
