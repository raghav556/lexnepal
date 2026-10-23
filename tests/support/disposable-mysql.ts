import { randomBytes } from "node:crypto";
import { createConnection, createPool, type RowDataPacket } from "mysql2/promise";

/** Never reuses an existing schema. Application SQL receives schema-only credentials. */
export async function createDisposableMysql() {
  const source = process.env.TEST_DATABASE_ADMIN_URL;
  if (!source) throw new Error("TEST_DATABASE_ADMIN_URL is required for disposable MySQL tests");
  const url = new URL(source);
  if (url.protocol !== "mysql:" || !["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error("Disposable MySQL tests require an explicitly configured local server");
  }
  const suffix = randomBytes(12).toString("hex");
  const name = `lexnepal_test_${suffix}`;
  const user = `ln_test_${suffix}`;
  const password = randomBytes(32).toString("hex");
  const adminUrl = new URL(url);
  adminUrl.pathname = "/mysql";
  const admin = await createConnection(adminUrl.toString());
  let schemaOwned = false;
  let userOwned = false;
  let pool: ReturnType<typeof createPool> | undefined;
  async function dispose() {
    await pool?.end();
    if (schemaOwned) {
      await admin.query(`DROP DATABASE \`${name}\``);
      schemaOwned = false;
    }
    if (userOwned) {
      await admin.query("DROP USER ?@'127.0.0.1'", [user]);
      userOwned = false;
    }
    await admin.end();
  }
  try {
    const [existing] = await admin.query<RowDataPacket[]>(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name = ?",
      [name],
    );
    if (existing.length) throw new Error("Disposable schema collision; refusing to reuse it");
    // No IF NOT EXISTS: ownership is established only after successful creation.
    await admin.query(
      `CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
    schemaOwned = true;
    await admin.query("CREATE USER ?@'127.0.0.1' IDENTIFIED BY ?", [user, password]);
    userOwned = true;
    // Underscores are grant-pattern wildcards unless escaped.
    await admin.query(
      `GRANT ALL PRIVILEGES ON \`${name.replaceAll("_", "\\_")}\`.* TO ?@'127.0.0.1'`,
      [user],
    );
    const testUrl = new URL(url);
    testUrl.hostname = "127.0.0.1";
    testUrl.username = user;
    testUrl.password = password;
    testUrl.pathname = `/${name}`;
    pool = createPool({ uri: testUrl.toString(), connectionLimit: 1, timezone: "Z" });
    const [grants] = await pool.query<RowDataPacket[]>("SHOW GRANTS");
    const grantStrings = grants.map((row) => String(Object.values(row)[0]));
    if (
      grantStrings.length !== 2 ||
      !grantStrings.some((grant) => grant.startsWith("GRANT USAGE ON *.*")) ||
      !grantStrings.some((grant) => grant.includes(`ON \`${name.replaceAll("_", "\\_")}\`.*`)) ||
      grantStrings.some((grant) => grant.includes("WITH GRANT OPTION"))
    ) {
      throw new Error("Unexpected disposable-user grants; refusing to execute fixture SQL");
    }
    let systemDenied = false;
    try {
      await pool.query("SELECT 1 FROM mysql.user LIMIT 0");
    } catch (error) {
      systemDenied = (error as { code?: string }).code === "ER_TABLEACCESS_DENIED_ERROR";
    }
    if (!systemDenied) throw new Error("Disposable credentials are not isolated");
    return { name, pool, url: testUrl.toString(), grants: grantStrings, dispose };
  } catch (error) {
    await dispose();
    throw error;
  }
}
