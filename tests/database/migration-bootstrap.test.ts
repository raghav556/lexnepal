import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterAll, beforeAll, expect, it } from "vitest";
import { type RowDataPacket } from "mysql2/promise";
import { createDisposableMysql } from "../support/disposable-mysql";
import { withMigrationSession } from "../../scripts/db/migration-session.mjs";

let fixture: Awaited<ReturnType<typeof createDisposableMysql>> | undefined;
beforeAll(async () => {
  fixture = await createDisposableMysql();
}, 30_000);
afterAll(async () => {
  await fixture?.dispose();
}, 120_000);

it("bootstraps immutable SQL through the real CLI and is idempotent with restricted credentials", async () => {
  if (!fixture) throw new Error("Disposable fixture was not established");
  const run = () =>
    promisify(execFile)(process.execPath, ["scripts/db/migrate.mjs"], {
      env: { ...process.env, DATABASE_URL: fixture!.url },
      timeout: 600_000,
    });
  const first = await run();
  expect(first.stdout).toContain("Pending: 0");
  const [before] = await fixture.pool.query<RowDataPacket[]>(
    "SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at",
  );
  expect(before).toHaveLength(8);
  expect(new Set(before.map((row) => row.hash)).size).toBe(8);
  expect((await run()).stdout).toContain("Pending: 0");
  const [after] = await fixture.pool.query<RowDataPacket[]>(
    "SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at",
  );
  expect(after).toEqual(before);
}, 660_000);

it("reproduces the zero-date incompatibility and restores strict mode after success and failure", async () => {
  if (!fixture) throw new Error("Disposable fixture was not established");
  const connection = await fixture.pool.getConnection();
  try {
    await connection.query(
      "SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,NO_ENGINE_SUBSTITUTION'",
    );
    const [[original]] = await connection.query<RowDataPacket[]>(
      "SELECT @@session.sql_mode AS mode, @@session.time_zone AS zone",
    );
    await connection.query("CREATE TEMPORARY TABLE zero_date_probe (deleted_at timestamp(3) NULL)");
    await expect(
      connection.query(
        "UPDATE zero_date_probe SET deleted_at=NULL WHERE deleted_at='0000-00-00 00:00:00.000'",
      ),
    ).rejects.toMatchObject({ code: "ER_TRUNCATED_WRONG_VALUE", errno: 1292, sqlState: "22007" });
    await withMigrationSession(connection, async () => {
      const [[inside]] = await connection.query<RowDataPacket[]>(
        "SELECT @@session.sql_mode AS mode",
      );
      expect(inside.mode).toContain("STRICT_TRANS_TABLES");
      expect(inside.mode).not.toContain("NO_ZERO_DATE");
      await connection.query(
        "UPDATE zero_date_probe SET deleted_at=NULL WHERE deleted_at='0000-00-00 00:00:00.000'",
      );
    });
    const current = async () =>
      (
        await connection.query<RowDataPacket[]>(
          "SELECT @@session.sql_mode AS mode, @@session.time_zone AS zone",
        )
      )[0][0];
    expect(await current()).toEqual(original);
    await expect(
      withMigrationSession(connection, async () => {
        throw new Error("fixture failure");
      }),
    ).rejects.toThrow("fixture failure");
    expect(await current()).toEqual(original);
    // Normal application/test statements retain strict rejection after the wrapper.
    await expect(
      connection.query("INSERT INTO zero_date_probe VALUES ('0000-00-00 00:00:00.000')"),
    ).rejects.toThrow();
  } finally {
    connection.release();
  }
});
