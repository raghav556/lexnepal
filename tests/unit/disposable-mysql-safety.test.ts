import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), end: vi.fn(), pool: vi.fn(), connect: vi.fn() }));
vi.mock("mysql2/promise", () => ({ createConnection: mocks.connect, createPool: mocks.pool }));
import { createDisposableMysql, testMysqlAdminUrl } from "../support/disposable-mysql";
import { createSigningTestDatabase } from "../support/signing-test-database";

beforeEach(() => {
  vi.stubEnv("TEST_DATABASE_ADMIN_URL", "mysql://isolated-admin@127.0.0.1/mysql");
  mocks.connect.mockResolvedValue({ query: mocks.query, end: mocks.end });
  mocks.query.mockReset();
  mocks.end.mockReset();
  mocks.pool.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

it.each([undefined, "mysql://admin@remote.example/mysql", "postgres://admin@127.0.0.1/mysql"])(
  "refuses absent or nonlocal explicit isolation configuration: %s",
  async (value) => {
    vi.stubEnv("TEST_DATABASE_ADMIN_URL", value);
    await expect(createDisposableMysql()).rejects.toThrow();
    expect(mocks.connect).not.toHaveBeenCalled();
  },
);

it("refuses an existing schema before any create, reuse or drop", async () => {
  mocks.query.mockResolvedValue([[{ schema_name: "collision" }]]);
  await expect(createDisposableMysql()).rejects.toThrow("refusing to reuse");
  expect(mocks.query).toHaveBeenCalledTimes(1);
  expect(mocks.query.mock.calls[0][0]).toMatch(/^SELECT schema_name/);
  expect(mocks.pool).not.toHaveBeenCalled();
  expect(mocks.end).toHaveBeenCalledOnce();
});

it("does not drop a schema when CREATE fails and ownership was never established", async () => {
  mocks.query
    .mockResolvedValueOnce([[]])
    .mockResolvedValueOnce([[{ host: "172.18.0.1" }]])
    .mockRejectedValueOnce(new Error("create collision"));
  await expect(createDisposableMysql()).rejects.toThrow("create schema failed");
  expect(mocks.query.mock.calls[2][0]).toMatch(/^CREATE DATABASE/);
  expect(mocks.query.mock.calls.map(([sql]) => sql).some((sql) => sql.startsWith("DROP"))).toBe(
    false,
  );
  expect(mocks.pool).not.toHaveBeenCalled();
});

it("cleans only its freshly owned schema if restricted-user provisioning fails", async () => {
  mocks.query
    .mockResolvedValueOnce([[]])
    .mockResolvedValueOnce([[{ host: "172.18.0.1" }]])
    .mockResolvedValueOnce([{}])
    .mockRejectedValueOnce(new Error("user collision"))
    .mockResolvedValueOnce([{}]);
  await expect(createDisposableMysql()).rejects.toThrow("create scoped user failed");
  expect(mocks.query.mock.calls[3][0]).toMatch(/^CREATE USER/);
  const statements = mocks.query.mock.calls.map(([sql]) => sql);
  const created = statements.find((sql) => sql.startsWith("CREATE DATABASE"));
  const dropped = statements.find((sql) => sql.startsWith("DROP DATABASE"));
  expect(created).toMatch(/`lexnepal_test_[a-f0-9]{24}`/);
  const identifier = created?.match(/`[^`]+`/)?.[0];
  if (!identifier) throw new Error("Expected owned fixture identifier");
  expect(dropped).toBe(`DROP DATABASE ${identifier}`);
  expect(statements.some((sql) => sql.startsWith("DROP USER"))).toBe(false);
  expect(mocks.pool).not.toHaveBeenCalled();
});

it("ignores the application database and does not select the MySQL system schema", () => {
  vi.stubEnv("DATABASE_URL", "mysql://application@127.0.0.1/owner_records");
  vi.stubEnv("TEST_DATABASE_ADMIN_URL", "mysql://fixture-admin:p%40ss@localhost:3307/mysql");
  const url = testMysqlAdminUrl();
  expect(url.hostname).toBe("127.0.0.1");
  expect(url.port).toBe("3307");
  expect(decodeURIComponent(url.password)).toBe("p@ss");
  expect(url.pathname).toBe("/");
});

it("requires the explicit test administrator for signing fixtures too", async () => {
  vi.stubEnv("TEST_DATABASE_ADMIN_URL", undefined);
  vi.stubEnv("DATABASE_URL", "mysql://application@127.0.0.1/owner_records");
  await expect(createSigningTestDatabase()).rejects.toThrow("TEST_DATABASE_ADMIN_URL is required");
  expect(mocks.connect).not.toHaveBeenCalled();
});

it.each(["%", "172.18.%", "client_host", ""])(
  "refuses ambiguous or wildcard client hosts before provisioning: %s",
  async (host) => {
    mocks.query.mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{ host }]]);
    await expect(createDisposableMysql()).rejects.toThrow("exact disposable-user client host");
    expect(mocks.query.mock.calls.some(([sql]) => /^(CREATE|DROP|GRANT)/.test(sql))).toBe(false);
  },
);

function allowOwnedFixture(host: string, systemAccess = false, broadGrant = false) {
  let name = "";
  mocks.query.mockImplementation(async (sql: string) => {
    if (sql.startsWith("SELECT schema_name")) return [[]];
    if (sql.startsWith("SELECT SUBSTRING_INDEX")) return [[{ host }]];
    if (sql.startsWith("CREATE DATABASE")) name = sql.match(/`([^`]+)`/)![1];
    return [{}];
  });
  const end = vi.fn();
  mocks.pool.mockReturnValue({
    end,
    query: async (sql: string) => {
      if (sql === "SHOW GRANTS") {
        return [
          [
            { grant: "GRANT USAGE ON *.* TO fixture" },
            {
              grant: `GRANT ALL PRIVILEGES ON ${broadGrant ? "*" : `\`${name.replaceAll("_", "\\_")}\``}.* TO fixture`,
            },
          ],
        ];
      }
      if (systemAccess) return [[]];
      throw Object.assign(new Error("denied"), { code: "ER_TABLEACCESS_DENIED_ERROR" });
    },
  });
  return end;
}

it.each(["localhost", "172.18.0.1"])(
  "grants only the owned schema to the actual connecting host %s and cleans both",
  async (host) => {
    const end = allowOwnedFixture(host);
    const fixture = await createDisposableMysql();
    const create = mocks.query.mock.calls.find(([sql]) => sql.startsWith("CREATE USER"))!;
    expect(create[0]).toBe("CREATE USER ?@? IDENTIFIED BY ?");
    expect(create[1][1]).toBe(host);
    const grant = mocks.query.mock.calls.find(([sql]) => sql.startsWith("GRANT"))!;
    expect(grant[0]).toContain(`ON \`${fixture.name.replaceAll("_", "\\_")}\`.* TO ?@?`);
    expect(grant[1]).toEqual([create[1][0], host]);
    await fixture.dispose();
    expect(mocks.query).toHaveBeenCalledWith(`DROP DATABASE \`${fixture.name}\``);
    expect(mocks.query).toHaveBeenCalledWith("DROP USER ?@?", [create[1][0], host]);
    expect(end).toHaveBeenCalledOnce();
  },
);

it("does not expose driver SQL or credentials when provisioning fails", async () => {
  mocks.query
    .mockResolvedValueOnce([[]])
    .mockResolvedValueOnce([[{ host: "172.18.0.1" }]])
    .mockResolvedValueOnce([{}])
    .mockRejectedValueOnce(
      Object.assign(new Error("sensitive driver details"), {
        code: "ER_CANNOT_USER",
        sql: "CREATE USER IDENTIFIED BY 'synthetic-password'",
      }),
    )
    .mockResolvedValueOnce([{}]);
  const error = await createDisposableMysql().catch((failure) => failure);
  expect(error.message).toBe("Disposable MySQL create scoped user failed (ER_CANNOT_USER)");
  expect(error.sql).toBeUndefined();
  expect(error.cause).toBeUndefined();
  expect(String(error.stack)).not.toContain("synthetic-password");
});

it.each([
  [true, false],
  [false, true],
])(
  "rejects system access=%s or broad grants=%s and cleans owned resources",
  async (systemAccess, broadGrant) => {
    const end = allowOwnedFixture("172.18.0.1", systemAccess, broadGrant);
    await expect(createDisposableMysql()).rejects.toThrow(
      /not isolated|Unexpected disposable-user grants/,
    );
    expect(mocks.query.mock.calls.some(([sql]) => sql.startsWith("DROP DATABASE"))).toBe(true);
    expect(mocks.query.mock.calls.some(([sql]) => sql.startsWith("DROP USER"))).toBe(true);
    expect(end).toHaveBeenCalledOnce();
  },
);
