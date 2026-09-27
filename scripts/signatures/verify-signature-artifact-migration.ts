/**
 * Formal 0007 proof on a schema-only disposable clone of the local pre-0007
 * database. The configured database is inspected with SELECT only.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/mysql-core";
import { createConnection, type Connection } from "mysql2/promise";
import {
  documents,
  firms,
  signatureArtifactUploadIntents,
  signatureEnvelopes,
  users,
} from "../../db/schema";
import { createSigningTestDatabase } from "../../tests/support/signing-test-database";

const tableName = "signature_artifact_upload_intents";
type DataRow = Record<string, unknown>;
type ColumnRow = {
  COLUMN_NAME: string;
  COLUMN_TYPE: string;
  IS_NULLABLE: "YES" | "NO";
  COLUMN_DEFAULT: string | null;
  EXTRA: string;
};
type IndexRow = {
  INDEX_NAME: string;
  COLUMN_NAME: string;
  SEQ_IN_INDEX: number;
  NON_UNIQUE: number;
};
type ForeignKeyRow = {
  CONSTRAINT_NAME: string;
  COLUMN_NAME: string;
  REFERENCED_TABLE_NAME: string;
  REFERENCED_COLUMN_NAME: string;
  DELETE_RULE: string;
};

function check(value: unknown, label: string): asserts value {
  if (!value) throw new Error(label);
}
function pass(label: string) {
  process.stdout.write(`PASS ${label}\n`);
}
async function rows<T>(connection: Connection, sql: string, parameters: unknown[] = []) {
  const [result] = await connection.query(sql, parameters);
  return result as T[];
}
async function countTable(connection: Connection, schemaName: string) {
  const result = await rows<{ n: number }>(
    connection,
    "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ? AND table_name = ?",
    [schemaName, tableName],
  );
  return Number(result[0]?.n ?? 0);
}
async function expectDatabaseRejection(action: Promise<unknown>, label: string) {
  try {
    await action;
  } catch (error) {
    const code = (error as { code?: string }).code;
    check(
      code === "ER_BAD_NULL_ERROR" ||
        code === "ER_NO_REFERENCED_ROW_2" ||
        code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD" ||
        code === "WARN_DATA_TRUNCATED" ||
        code === "ER_DUP_ENTRY",
      `${label}: rejected for an unrelated SQL error`,
    );
    return;
  }
  throw new Error(`${label}: unexpectedly accepted`);
}

async function verifySource(databaseUrl: string) {
  const url = new URL(databaseUrl);
  check(["127.0.0.1", "localhost"].includes(url.hostname), "Only local MySQL may be used");
  const schemaName = decodeURIComponent(url.pathname.slice(1));
  check(/^[a-zA-Z0-9_]+$/.test(schemaName), "Configured database name is unsafe");
  const connection = await createConnection({ uri: databaseUrl });
  try {
    const journal = JSON.parse(
      await readFile(path.resolve("drizzle/meta/_journal.json"), "utf8"),
    ) as { entries: Array<{ idx: number; tag: string; when: number }> };
    const expected = journal.entries.filter((entry) => entry.idx <= 6);
    check(
      expected.length === 7 && journal.entries.some((entry) => entry.idx === 7),
      "Migration journal does not describe 0000 through 0007",
    );
    const applied = await rows<{ hash: string; created_at: number | string }>(
      connection,
      "SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at",
    );
    check(applied.length === 7, "Configured source is not at migrations 0000 through 0006");
    const historicalHashMismatches: string[] = [];
    for (const entry of expected) {
      const sql = await readFile(path.resolve("drizzle", `${entry.tag}.sql`));
      const hash = createHash("sha256").update(sql).digest("hex");
      const row = applied.find((item) => Number(item.created_at) === Number(entry.when));
      check(row, `Published pre-0007 migration ${entry.tag} is absent`);
      if (row.hash !== hash) {
        check(entry.idx === 5 || entry.idx === 6, `Pre-0007 migration ${entry.tag} hash differs`);
        historicalHashMismatches.push(entry.tag);
      }
    }
    check((await countTable(connection, schemaName)) === 0, "0007 is already present in source");
    const prerequisiteTables = await rows<{ TABLE_NAME: string }>(
      connection,
      "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? AND table_name IN ('firms','users','documents','signature_envelopes')",
      [schemaName],
    );
    check(prerequisiteTables.length === 4, "Source is missing signing prerequisite tables");
    // Historical 0005/0006 hashes in this local DB differ from today's SQL
    // files. They only touch Cases. Verify their resulting published shape,
    // plus every table/column to which 0007 adds a foreign key, before cloning.
    const caseColumns = await rows<{ COLUMN_NAME: string; COLUMN_TYPE: string }>(
      connection,
      "SELECT COLUMN_NAME,COLUMN_TYPE FROM information_schema.columns WHERE table_schema=? AND table_name='cases' AND column_name IN ('client_summary','closure_outcome','status')",
      [schemaName],
    );
    check(
      caseColumns.find((column) => column.COLUMN_NAME === "client_summary")?.COLUMN_TYPE ===
        "longtext" &&
        caseColumns.find((column) => column.COLUMN_NAME === "closure_outcome")?.COLUMN_TYPE ===
          "enum('won','lost','settled','withdrawn','other')" &&
        caseColumns.find((column) => column.COLUMN_NAME === "status")?.COLUMN_TYPE ===
          "enum('inquiry','active','on_hold','closed')",
      "Historical 0005/0006 Cases schema shape does not match published SQL",
    );
    const caseParties = await rows<{ n: number }>(
      connection,
      "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=? AND table_name='case_parties'",
      [schemaName],
    );
    check(Number(caseParties[0]?.n) === 1, "0005 case_parties table is absent");
    for (const table of [firms, users, documents, signatureEnvelopes]) {
      const expectedTable = getTableConfig(table);
      const actual = await rows<{ COLUMN_NAME: string; COLUMN_TYPE: string }>(
        connection,
        "SELECT COLUMN_NAME,COLUMN_TYPE FROM information_schema.columns WHERE table_schema=? AND table_name=? AND column_name IN ('id','firm_id')",
        [schemaName, expectedTable.name],
      );
      for (const column of expectedTable.columns.filter(
        (item) => item.name === "id" || item.name === "firm_id",
      )) {
        check(
          actual.find((item) => item.COLUMN_NAME === column.name)?.COLUMN_TYPE ===
            column.getSQLType(),
          `Published ${expectedTable.name}.${column.name} FK prerequisite differs from db/schema.ts`,
        );
      }
    }
    return {
      schemaName,
      host: url.hostname,
      port: Number(url.port || 3306),
      historicalHashMismatches,
    };
  } finally {
    await connection.end();
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  check(databaseUrl, "DATABASE_URL is required");
  const source = await verifySource(databaseUrl);
  pass("trusted local pre-0007 signing schema: 0000-0006 recorded, 0007 absent");
  if (source.historicalHashMismatches.length) {
    process.stdout.write(
      `WARN historical migration hashes differ but published Cases and 0007 FK prerequisite shapes match: ${source.historicalHashMismatches.join(", ")}\n`,
    );
  }
  const sandbox = await createSigningTestDatabase({ applyArtifactMigration: false });
  const db = sandbox.admin;
  const issues: string[] = [];
  try {
    check((await countTable(db, sandbox.name)) === 0, "Disposable clone was not pre-0007");
    const migration = await readFile(
      path.resolve("drizzle/0007_signature_artifact_upload_intents.sql"),
      "utf8",
    );
    await db.query(migration);
    check((await countTable(db, sandbox.name)) === 1, "0007 did not create its table");
    pass("0007 executed on schema-only disposable pre-0007 clone");

    const actualColumns = await rows<ColumnRow>(
      db,
      "SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ORDINAL_POSITION",
      [sandbox.name, tableName],
    );
    const schema = getTableConfig(signatureArtifactUploadIntents);
    const expectedColumnNames = schema.columns.map((column) => column.name);
    const actualColumnNames = actualColumns.map((column) => column.COLUMN_NAME);
    if (JSON.stringify(expectedColumnNames) !== JSON.stringify(actualColumnNames)) {
      issues.push(
        `column names/order: schema=${expectedColumnNames.join(",")} migration=${actualColumnNames.join(",")}`,
      );
    }
    for (const expected of schema.columns) {
      const actual = actualColumns.find((column) => column.COLUMN_NAME === expected.name);
      if (!actual) continue;
      if (actual.COLUMN_TYPE.toLowerCase() !== expected.getSQLType().toLowerCase()) {
        issues.push(
          `${expected.name} type: schema ${expected.getSQLType()}, migration ${actual.COLUMN_TYPE}`,
        );
      }
      if ((actual.IS_NULLABLE === "NO") !== expected.notNull) {
        issues.push(`${expected.name} nullability differs`);
      }
    }
    const status = actualColumns.find((column) => column.COLUMN_NAME === "status");
    check(status?.COLUMN_DEFAULT === "pending", "Status default is not pending");
    check(
      status.COLUMN_TYPE ===
        schema.columns.find((column) => column.name === "status")?.getSQLType(),
      "Status enum values differ from db/schema.ts",
    );
    const id = actualColumns.find((column) => column.COLUMN_NAME === "id");
    if (!id?.COLUMN_DEFAULT?.toLowerCase().includes("uuid()")) {
      issues.push("id database default is not UUID()");
    }
    for (const name of ["created_at", "updated_at"]) {
      const column = actualColumns.find((item) => item.COLUMN_NAME === name);
      if (!column?.COLUMN_DEFAULT || !/(current_timestamp|now\(\))/i.test(column.COLUMN_DEFAULT)) {
        issues.push(`${name} database default is not current timestamp`);
      }
    }
    for (const name of ["uploaded_at", "completed_at", "deleted_at"]) {
      const column = actualColumns.find((item) => item.COLUMN_NAME === name);
      if (column?.COLUMN_DEFAULT !== null) issues.push(`${name} default is not NULL`);
    }
    const updated = actualColumns.find((column) => column.COLUMN_NAME === "updated_at");
    check(
      updated?.EXTRA.toLowerCase().includes("on update current_timestamp"),
      "updated_at does not auto-update",
    );
    for (const name of ["created_at", "updated_at", "expires_at", "deleted_at"]) {
      check(
        actualColumns.some((column) => column.COLUMN_NAME === name),
        `${name} missing`,
      );
    }
    check(
      actualColumns.find((column) => column.COLUMN_NAME === "envelope_id")?.IS_NULLABLE === "YES",
      "envelope_id is not nullable",
    );
    pass("column presence, status enum/default, timestamp behavior, nullable envelope");

    const indexRows = await rows<IndexRow>(
      db,
      "SELECT INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX,NON_UNIQUE FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? ORDER BY INDEX_NAME,SEQ_IN_INDEX",
      [sandbox.name, tableName],
    );
    const actualIndexes = new Map<string, { columns: string[]; unique: boolean }>();
    for (const row of indexRows) {
      const index = actualIndexes.get(row.INDEX_NAME) ?? {
        columns: [],
        unique: row.NON_UNIQUE === 0,
      };
      index.columns.push(row.COLUMN_NAME);
      actualIndexes.set(row.INDEX_NAME, index);
    }
    check(actualIndexes.get("PRIMARY")?.columns.join(",") === "id", "Primary index is missing");
    for (const index of schema.indexes) {
      const actual = actualIndexes.get(index.config.name!);
      check(
        actual?.columns.join(",") === index.config.columns.map((column) => column.name).join(",") &&
          actual.unique === index.config.unique,
        `Declared index ${index.config.name} does not match db/schema.ts`,
      );
    }
    for (const column of schema.columns.filter((item) => item.isUnique)) {
      const unique = [...actualIndexes.values()].some(
        (index) => index.unique && index.columns.join(",") === column.name,
      );
      if (!unique) issues.push(`unique index missing for schema column ${column.name}`);
    }
    pass("primary and declared lookup indexes");

    const createTable = await rows<Record<string, string>>(
      db,
      `SHOW CREATE TABLE \`${tableName}\``,
    );
    const definition = createTable[0]?.["Create Table"];
    check(
      definition?.includes("DEFAULT (uuid())") &&
        definition.includes("signature_artifact_upload_intents_legacy_convex_id_unique") &&
        definition.includes("`expires_at` timestamp(3) NOT NULL"),
      "SHOW CREATE TABLE does not confirm corrected ID default, unique index and timestamp",
    );
    pass("SHOW CREATE TABLE confirms corrected default, uniqueness and timestamp");

    const actualForeignKeys = await rows<ForeignKeyRow>(
      db,
      "SELECT k.CONSTRAINT_NAME,k.COLUMN_NAME,k.REFERENCED_TABLE_NAME,k.REFERENCED_COLUMN_NAME,r.DELETE_RULE FROM information_schema.key_column_usage k JOIN information_schema.referential_constraints r ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME WHERE k.TABLE_SCHEMA=? AND k.TABLE_NAME=? AND k.REFERENCED_TABLE_NAME IS NOT NULL",
      [sandbox.name, tableName],
    );
    for (const foreignKey of schema.foreignKeys) {
      const ref = foreignKey.reference();
      const actual = actualForeignKeys.find((row) => row.COLUMN_NAME === ref.columns[0]?.name);
      check(
        actual?.REFERENCED_TABLE_NAME === getTableName(ref.foreignTable) &&
          actual.REFERENCED_COLUMN_NAME === ref.foreignColumns[0]?.name,
        `Foreign key mapping for ${ref.columns[0]?.name} differs`,
      );
    }
    check(actualForeignKeys.length === 4, "Unexpected foreign-key count");
    pass("foreign-key mapping");

    const firmA = randomUUID();
    const firmB = randomUUID();
    const userA = randomUUID();
    const userB = randomUUID();
    const documentA = randomUUID();
    const documentB = randomUUID();
    const envelopeA = randomUUID();
    const envelopeB = randomUUID();
    for (const [firm, label] of [
      [firmA, "a"],
      [firmB, "b"],
    ]) {
      await db.query("INSERT INTO firms (id,name,slug) VALUES (?,?,?)", [
        firm,
        `Migration verifier ${label}`,
        `migration-0007-${firm}`,
      ]);
    }
    for (const [user, firm, label] of [
      [userA, firmA, "a"],
      [userB, firmB, "b"],
    ]) {
      await db.query(
        "INSERT INTO users (id,firm_id,token_identifier,name,email,role) VALUES (?,?,?,?,?,?)",
        [
          user,
          firm,
          `migration-0007|${user}`,
          `Migration ${label}`,
          `${user}@migration-verifier.invalid`,
          "client",
        ],
      );
    }
    for (const [document, firm, user] of [
      [documentA, firmA, userA],
      [documentB, firmB, userB],
    ]) {
      await db.query(
        "INSERT INTO documents (id,firm_id,document_number,title,type,storage_id,mime_type,size_bytes,uploaded_by) VALUES (?,?,?,?,?,?,?,?,?)",
        [
          document,
          firm,
          `MIG-${document}`,
          "Migration verifier document",
          "contract",
          `protected/${firm}/migration/${document}`,
          "image/png",
          64,
          user,
        ],
      );
    }
    for (const [envelope, firm, document, user] of [
      [envelopeA, firmA, documentA, userA],
      [envelopeB, firmB, documentB, userB],
    ]) {
      await db.query(
        "INSERT INTO signature_envelopes (id,firm_id,document_id,title,status,routing,created_by) VALUES (?,?,?,?,?,?,?)",
        [envelope, firm, document, "Migration verifier envelope", "draft", "parallel", user],
      );
    }
    pass("controlled firms, users, documents and envelopes provisioned");

    async function insertArtifact(overrides: DataRow = {}) {
      const record: DataRow = {
        id: randomUUID(),
        firm_id: firmA,
        user_id: userA,
        document_id: documentA,
        envelope_id: null,
        original_file_name: "signature.png",
        declared_mime_type: "image/png",
        declared_size_bytes: 64,
        quarantine_key: `quarantine/${firmA}/${randomUUID()}`,
        expires_at: new Date(Date.now() + 600_000),
        ...overrides,
      };
      const names = Object.keys(record);
      await db.query(
        `INSERT INTO \`${tableName}\` (${names.map((name) => `\`${name}\``).join(",")}) VALUES (${names.map(() => "?").join(",")})`,
        names.map((name) => record[name]),
      );
      return String(record.id);
    }
    const validId = await insertArtifact();
    const valid = await rows<{
      status: string;
      envelope_id: string | null;
      created_at: Date;
      updated_at: Date;
      expires_at: Date;
      deleted_at: Date | null;
    }>(
      db,
      `SELECT status,envelope_id,created_at,updated_at,expires_at,deleted_at FROM \`${tableName}\` WHERE id=?`,
      [validId],
    );
    check(
      valid[0]?.status === "pending" && valid[0].envelope_id === null,
      "Same-firm nullable-envelope insert failed",
    );
    check(
      Boolean(valid[0].created_at) &&
        Boolean(valid[0].updated_at) &&
        Boolean(valid[0].expires_at) &&
        valid[0].deleted_at === null,
      "Timestamp defaults/expiry do not work",
    );
    await insertArtifact({ envelope_id: envelopeA });
    for (const statusValue of [
      "pending",
      "uploaded",
      "scanning",
      "promoted",
      "rejected",
      "expired",
    ]) {
      await insertArtifact({ status: statusValue });
    }
    pass("valid same-firm rows, nullable envelope, six statuses and timestamps");

    await expectDatabaseRejection(insertArtifact({ firm_id: null }), "Null firm");
    await expectDatabaseRejection(insertArtifact({ user_id: randomUUID() }), "Invalid signer FK");
    await expectDatabaseRejection(
      insertArtifact({ document_id: randomUUID() }),
      "Invalid document FK",
    );
    await expectDatabaseRejection(
      insertArtifact({ envelope_id: randomUUID() }),
      "Invalid envelope FK",
    );
    await expectDatabaseRejection(insertArtifact({ status: "not-a-status" }), "Invalid status");
    await expectDatabaseRejection(
      insertArtifact({ declared_size_bytes: null }),
      "Null declared size",
    );
    await expectDatabaseRejection(insertArtifact({ quarantine_key: null }), "Null quarantine key");
    const duplicateKey = `quarantine/${firmA}/duplicate-${randomUUID()}`;
    await insertArtifact({ quarantine_key: duplicateKey });
    await expectDatabaseRejection(
      insertArtifact({ quarantine_key: duplicateKey }),
      "Duplicate quarantine key",
    );
    pass("required fields, FK validity, status and quarantine uniqueness enforced");

    const crossFirm = {
      signer: await insertArtifact({ user_id: userB })
        .then(() => true)
        .catch(() => false),
      document: await insertArtifact({ document_id: documentB })
        .then(() => true)
        .catch(() => false),
      envelope: await insertArtifact({ envelope_id: envelopeB })
        .then(() => true)
        .catch(() => false),
    };
    check(
      crossFirm.signer && crossFirm.document && crossFirm.envelope,
      "Unexpected cross-firm DB constraint result",
    );
    pass("cross-firm FKs are individual, not composite tenant constraints (service-enforced)");
    await insertArtifact({ declared_size_bytes: -1, declared_mime_type: "text/plain" });
    pass("size and MIME constraints are service-enforced, not database-enforced");
    try {
      await db.query(migration);
      throw new Error("0007 unexpectedly succeeded on a second application");
    } catch (error) {
      check(
        (error as { code?: string }).code === "ER_TABLE_EXISTS_ERROR",
        "0007 rerun failed for an unexpected reason",
      );
    }
    pass("0007 rerun is rejected by existing table (normal migration-runner bookkeeping required)");

    if (issues.length) {
      for (const issue of issues) process.stdout.write(`DRIFT ${issue}\n`);
      throw new Error(`Migration/db-schema alignment failed (${issues.length} finding(s))`);
    }
    pass("0007 and db/schema.ts alignment");
  } finally {
    await sandbox.dispose(async () => undefined);
    const root = await createConnection({ host: source.host, port: source.port, user: "root" });
    try {
      check((await countTable(root, sandbox.name)) === 0, "Disposable database cleanup failed");
    } finally {
      await root.end();
    }
    pass("disposable database removed");
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown failure";
  process.stderr.write(`FAIL artifact migration verification: ${message}\n`);
  process.exitCode = 1;
});
