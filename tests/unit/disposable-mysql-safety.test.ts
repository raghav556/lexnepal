import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), end: vi.fn(), pool: vi.fn(), connect: vi.fn() }));
vi.mock("mysql2/promise", () => ({ createConnection: mocks.connect, createPool: mocks.pool }));
import { createDisposableMysql } from "../support/disposable-mysql";

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
  mocks.query.mockResolvedValueOnce([[]]).mockRejectedValueOnce(new Error("create collision"));
  await expect(createDisposableMysql()).rejects.toThrow("create collision");
  expect(mocks.query.mock.calls.map(([sql]) => sql).some((sql) => sql.startsWith("DROP"))).toBe(
    false,
  );
  expect(mocks.pool).not.toHaveBeenCalled();
});

it("cleans only its freshly owned schema if restricted-user provisioning fails", async () => {
  mocks.query
    .mockResolvedValueOnce([[]])
    .mockResolvedValueOnce([{}])
    .mockRejectedValueOnce(new Error("user collision"))
    .mockResolvedValueOnce([{}]);
  await expect(createDisposableMysql()).rejects.toThrow("user collision");
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
