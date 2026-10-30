import { randomBytes } from "node:crypto";
import { createConnection, createPool, type RowDataPacket } from "mysql2/promise";

export function testMysqlAdminUrl() {
  const source = process.env.TEST_DATABASE_ADMIN_URL;
  if (!source) throw new Error("TEST_DATABASE_ADMIN_URL is required for disposable MySQL tests");
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    throw new Error("Invalid test-admin MySQL configuration");
  }
  if (
    url.protocol !== "mysql:" ||
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !url.username
  ) {
    throw new Error("Disposable MySQL tests require an explicitly configured local server");
  }
  url.hostname = "127.0.0.1";
  url.pathname = "/";
  return url;
}

/** Never reuses an existing schema. Application SQL receives schema-only credentials. */
export async function createDisposableMysql() {
  const url = testMysqlAdminUrl();
  const suffix = randomBytes(12).toString("hex");
  const name = `lexnepal_test_${suffix}`;
  const user = `ln_test_${suffix}`;
  const password = randomBytes(32).toString("hex");
  let admin: Awaited<ReturnType<typeof createConnection>>;
  try {
    admin = await createConnection(url.toString());
  } catch {
    throw new Error("Cannot connect with the configured test-admin credentials");
  }
  let schemaOwned = false;
  let userOwned = false;
  let clientHost = "";
  let stage = "check schema ownership";
  let pool: ReturnType<typeof createPool> | undefined;
  async function dispose() {
    try {
      try {
        await pool?.end();
      } finally {
        try {
          if (schemaOwned) {
            await admin.query(`DROP DATABASE \`${name}\``);
            schemaOwned = false;
          }
        } finally {
          try {
            if (userOwned) {
              await admin.query("DROP USER ?@?", [user, clientHost]);
              userOwned = false;
            }
          } finally {
            await admin.end();
          }
        }
      }
    } catch {
      throw new Error("Owned disposable MySQL cleanup failed");
    }
  }
  try {
    const [existing] = await admin.query<RowDataPacket[]>(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name = ?",
      [name],
    );
    if (existing.length) throw new Error("Disposable schema collision; refusing to reuse it");
    stage = "identify client host";
    // USER() reports the actual connecting host; CURRENT_USER() may contain a '%' account.
    const [[origin]] = await admin.query<RowDataPacket[]>(
      "SELECT SUBSTRING_INDEX(USER(), '@', -1) AS host",
    );
    if (!origin || !/^[a-zA-Z0-9:.\-]+$/.test(String(origin.host))) {
      throw new Error("Cannot establish an exact disposable-user client host");
    }
    clientHost = String(origin.host);
    // No IF NOT EXISTS: ownership is established only after successful creation.
    stage = "create schema";
    await admin.query(
      `CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
    schemaOwned = true;
    stage = "create scoped user";
    await admin.query("CREATE USER ?@? IDENTIFIED BY ?", [user, clientHost, password]);
    userOwned = true;
    stage = "grant schema access";
    // Underscores are grant-pattern wildcards unless escaped.
    await admin.query(`GRANT ALL PRIVILEGES ON \`${name.replaceAll("_", "\\_")}\`.* TO ?@?`, [
      user,
      clientHost,
    ]);
    const testUrl = new URL(url);
    testUrl.hostname = "127.0.0.1";
    testUrl.username = user;
    testUrl.password = password;
    testUrl.pathname = `/${name}`;
    pool = createPool({ uri: testUrl.toString(), connectionLimit: 1, timezone: "Z" });
    stage = "verify scoped access";
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
    const safeMessages = [
      "Disposable schema collision; refusing to reuse it",
      "Cannot establish an exact disposable-user client host",
      "Unexpected disposable-user grants; refusing to execute fixture SQL",
      "Disposable credentials are not isolated",
    ];
    if (error instanceof Error && safeMessages.includes(error.message))
      throw new Error(error.message);
    // Driver errors can retain SQL/passwords on .sql or .cause; expose only a safe stage/code.
    const code = (error as { code?: string })?.code;
    throw new Error(
      `Disposable MySQL ${stage} failed${code && /^[A-Z0-9_]+$/.test(code) ? ` (${code})` : ""}`,
    );
  }
}
