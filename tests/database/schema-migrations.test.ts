import fs from "node:fs";
import path from "node:path";
import { getTableName } from "drizzle-orm";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { convexTableTargets } from "../../db/schema";
import indexManifest from "../../db/index-manifest.json";

const foundationalMigrationFiles = [
  "drizzle/0000_initial_postgresql_schema.sql",
  "drizzle/0001_tenant_integrity_and_checks.sql",
  "drizzle/0002_authentication_sessions.sql",
  "drizzle/0003_document_storage_pipeline.sql",
  "drizzle/0004_durable_jobs_and_schedules.sql",
  "drizzle/0005_audit_request_context.sql",
  "drizzle/0006_local_identity_authority.sql",
  "drizzle/0007_avatar_quarantine_pipeline.sql",
  "drizzle/0008_matters_kyc_security.sql",
  "drizzle/0009_financial_idempotency.sql",
  "drizzle/0010_research_citations.sql",
];

const migrationFiles = fs
  .readdirSync(path.resolve("drizzle"))
  .filter((file) => /^\d{4}_.+\.sql$/.test(file) && !file.endsWith(".down.sql"))
  .sort()
  .map((file) => path.join("drizzle", file));

async function applySqlFile(database: PGlite, file: string): Promise<void> {
  const sql = fs.readFileSync(path.resolve(file), "utf8");
  for (const statement of sql
    .split("--> statement-breakpoint")
    .map((part) => part.trim())
    .filter(Boolean)) {
    await database.exec(statement);
  }
}

async function expectRejected(statement: string): Promise<void> {
  await expect(database.exec(statement)).rejects.toThrow();
}

let database: PGlite;

beforeAll(async () => {
  database = new PGlite();
  for (const migration of migrationFiles) await applySqlFile(database, migration);
  await database.exec(fs.readFileSync(path.resolve("tests/fixtures/postgres/base.sql"), "utf8"));
}, 60_000);

afterAll(async () => {
  await database.close();
});

describe("PostgreSQL schema migrations", () => {
  it("maps all retained Convex tables and creates normalized relationship tables", async () => {
    expect(Object.keys(convexTableTargets)).toHaveLength(39);
    const expectedTargets = Object.values(convexTableTargets).map(getTableName).sort();
    const result = await database.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name",
    );
    const actual = result.rows.map((row) => row.table_name);
    expect(actual).toHaveLength(75);
    for (const target of expectedTargets) expect(actual).toContain(target);
    for (const normalized of [
      "case_team_members",
      "client_kyc_files",
      "cms_asset_upload_intents",
      "document_tag_assignments",
      "dm_message_attachments",
      "dm_message_reads",
      "dm_messages",
      "dm_threads",
      "leave_balances",
      "message_reads",
      "payroll_run_lines",
      "payroll_runs",
      "task_watchers",
      "template_variables",
    ]) {
      expect(actual).toContain(normalized);
    }
  });

  it("requires firm ownership on every tenant table", async () => {
    const result = await database.query<{ table_name: string; is_nullable: string }>(
      "select table_name, is_nullable from information_schema.columns where table_schema = 'public' and column_name = 'firm_id'",
    );
    expect(result.rows).toHaveLength(68);
    expect(result.rows.filter((row) => row.is_nullable !== "NO")).toEqual([]);
  });

  it("contains every documented operational index", async () => {
    const result = await database.query<{ indexname: string }>(
      "select indexname from pg_indexes where schemaname = 'public'",
    );
    const actual = new Set(result.rows.map((row) => row.indexname));
    expect(indexManifest.length).toBeGreaterThan(80);
    for (const documented of indexManifest) {
      expect(actual.has(documented.index), documented.index).toBe(true);
    }
  });

  it("allows firm-owned uniqueness across firms but rejects duplicates within a firm", async () => {
    await expectRejected(`
      insert into cases (firm_id, case_number, title, practice_area, status, client_id, assigned_lawyer_id, conflict_checked)
      values ('00000000-0000-4000-8000-000000000001', 'CASE-001', 'Duplicate', 'civil', 'active',
        '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', false)
    `);
    const count = await database.query<{ count: number }>(
      "select count(*)::int as count from cases where case_number = 'CASE-001'",
    );
    expect(count.rows[0].count).toBe(2);
  });

  it("rejects cross-firm matter, document-version and signer relationships", async () => {
    await expectRejected(`
      insert into cases (firm_id, case_number, title, practice_area, status, client_id, assigned_lawyer_id, conflict_checked)
      values ('00000000-0000-4000-8000-000000000002', 'CROSS-CASE', 'Cross firm', 'civil', 'active',
        '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', false)
    `);
    await expectRejected(`
      insert into documents (firm_id, case_id, document_number, title, type, storage_id, mime_type, size_bytes, version, parent_document_id, uploaded_by, is_template, is_privileged)
      values ('00000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'CROSS-DOC', 'Cross version', 'pleading',
        'cross-storage', 'application/pdf', 100, 2, '40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', false, false)
    `);
    await expectRejected(`
      insert into signature_recipients (firm_id, envelope_id, user_id, routing_order, status)
      values ('00000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000002', 1, 'pending')
    `);
  });

  it("enforces tenant-bound, complete authentication sessions", async () => {
    await expectRejected(`
      insert into sessions (firm_id, user_id, device, browser, ip_address, token_hash, last_active)
      values ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
        'web', 'oidc', '127.0.0.1', 'incomplete-token-hash', now())
    `);
    await expectRejected(`
      insert into sessions (firm_id, user_id, device, browser, ip_address, token_hash, identity_subject, expires_at, last_active, revoked_by)
      values ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
        'web', 'oidc', '127.0.0.1', 'cross-firm-revoker', 'subject', now() + interval '1 hour', now(),
        '10000000-0000-4000-8000-000000000002')
    `);
  });

  it("enforces quarantine, scan-job and storage-migration integrity", async () => {
    await expectRejected(`
      insert into document_upload_intents
        (firm_id, created_by, original_file_name, declared_mime_type, declared_size_bytes, quarantine_key, expires_at)
      values
        ('00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
         'cross-firm.pdf', 'application/pdf', 100, 'quarantine/cross-firm', now() + interval '1 hour')
    `);
    await expectRejected(`
      insert into document_upload_intents
        (firm_id, created_by, original_file_name, declared_mime_type, declared_size_bytes, quarantine_key, expires_at)
      values
        ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
         'oversized.pdf', 'application/pdf', 52428801, 'quarantine/oversized', now() + interval '1 hour')
    `);
  });

  it("enforces tenant-bound KYC quarantine and file limits", async () => {
    await expectRejected(`
      insert into client_kyc_upload_intents
        (firm_id, client_id, user_id, document_type, original_file_name, declared_mime_type,
         declared_size_bytes, quarantine_key, expires_at)
      values ('00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000002', 'government_id', 'cross.pdf', 'application/pdf',
        100, 'quarantine/cross-kyc', now() + interval '1 hour')
    `);
    await expectRejected(`
      insert into client_kyc_upload_intents
        (firm_id, client_id, user_id, document_type, original_file_name, declared_mime_type,
         declared_size_bytes, quarantine_key, expires_at)
      values ('00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001', 'government_id', 'unsafe.html', 'text/html',
        100, 'quarantine/unsafe-kyc', now() + interval '1 hour')
    `);
  });

  it("enforces durable-job idempotency, tenant actors and execution bounds", async () => {
    await database.exec(`
      insert into durable_jobs (firm_id, type, idempotency_key, actor_user_id)
      values ('00000000-0000-4000-8000-000000000001', 'analytics.aggregate', 'daily-1',
        '10000000-0000-4000-8000-000000000001')
    `);
    await expectRejected(`
      insert into durable_jobs (firm_id, type, idempotency_key, actor_user_id)
      values ('00000000-0000-4000-8000-000000000001', 'analytics.aggregate', 'daily-1',
        '10000000-0000-4000-8000-000000000001')
    `);
    await expectRejected(`
      insert into durable_jobs (firm_id, type, idempotency_key, actor_user_id)
      values ('00000000-0000-4000-8000-000000000001', 'analytics.aggregate', 'cross-firm',
        '10000000-0000-4000-8000-000000000002')
    `);
    await expectRejected(`
      insert into durable_jobs (firm_id, type, idempotency_key, actor_user_id, max_attempts)
      values ('00000000-0000-4000-8000-000000000001', 'analytics.aggregate', 'bad-attempts',
        '10000000-0000-4000-8000-000000000001', 21)
    `);
    await expectRejected(`
      insert into durable_schedules
        (firm_id, name, job_type, interval_seconds, next_run_at, actor_user_id)
      values ('00000000-0000-4000-8000-000000000001', 'too-frequent', 'analytics.aggregate', 10,
        now(), '10000000-0000-4000-8000-000000000001')
    `);
  });

  it("removes all finance tables and dedicated enums", async () => {
    const tables = await database.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public'",
    );
    const names = new Set(tables.rows.map((row) => row.table_name));
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
    const enums = await database.query<{ typname: string }>(
      "select typname from pg_type where typname in ('payment_status','payment_gateway','line_item_type','invoice_status','trust_transaction_type','expense_category')",
    );
    expect(enums.rows).toEqual([]);
  });

  it("enforces document quality checks", async () => {
    await expectRejected(`
      insert into documents (firm_id, document_number, title, type, storage_id, mime_type, size_bytes, version, uploaded_by, is_template, is_privileged)
      values ('00000000-0000-4000-8000-000000000001', 'BAD-SIZE', 'Bad', 'other', 'bad-size', 'text/plain', 0, 1,
        '10000000-0000-4000-8000-000000000001', false, false)
    `);
  });
});

describe("initial migration rollback", () => {
  it("can remove a clean rehearsal schema", async () => {
    const rollbackDatabase = new PGlite();
    try {
      for (const migration of foundationalMigrationFiles)
        await applySqlFile(rollbackDatabase, migration);
      await rollbackDatabase.exec(
        fs.readFileSync(path.resolve("drizzle/down/0010_research_citations.down.sql"), "utf8"),
      );
      await rollbackDatabase.exec(
        fs.readFileSync(path.resolve("drizzle/down/0009_financial_idempotency.down.sql"), "utf8"),
      );
      await rollbackDatabase.exec(
        fs.readFileSync(path.resolve("drizzle/down/0008_matters_kyc_security.down.sql"), "utf8"),
      );
      await rollbackDatabase.exec(
        fs.readFileSync(
          path.resolve("drizzle/down/0007_avatar_quarantine_pipeline.down.sql"),
          "utf8",
        ),
      );
      await rollbackDatabase.exec(
        fs.readFileSync(
          path.resolve("drizzle/down/0006_local_identity_authority.down.sql"),
          "utf8",
        ),
      );
      await rollbackDatabase.exec(
        fs.readFileSync(path.resolve("drizzle/down/0005_audit_request_context.down.sql"), "utf8"),
      );
      await rollbackDatabase.exec(
        fs.readFileSync(
          path.resolve("drizzle/down/0004_durable_jobs_and_schedules.down.sql"),
          "utf8",
        ),
      );
      await rollbackDatabase.exec(
        fs.readFileSync(path.resolve("drizzle/down/0001_initial_schema.down.sql"), "utf8"),
      );
      const result = await rollbackDatabase.query<{ count: number }>(
        "select count(*)::int as count from information_schema.tables where table_schema = 'public'",
      );
      expect(result.rows[0].count).toBe(0);
    } finally {
      await rollbackDatabase.close();
    }
  }, 60_000);
});
