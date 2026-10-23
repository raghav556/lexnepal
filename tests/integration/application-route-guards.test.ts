import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { describe, expect, it, vi, afterAll } from "vitest";

const state = vi.hoisted(() => ({ databaseCalls: 0, sessionCalls: 0 }));
vi.mock("@/server/auth/runtime", () => ({
  requireSession: async () => {
    state.sessionCalls++;
    const { AppError } = await import("@/shared/errors/api-error");
    throw new AppError("UNAUTHENTICATED", "A session is required", 401);
  },
}));
// Imports may construct repositories; no route may execute SQL in this gate.
vi.mock("@/server/db/client", () => ({
  getDatabase: () =>
    new Proxy(
      {},
      {
        get: () => () => {
          state.databaseCalls++;
          throw new Error("Route guard gate refuses all database access");
        },
      },
    ),
}));

const walk = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(resolve(directory, entry.name))
      : entry.name === "route.ts"
        ? [resolve(directory, entry.name)]
        : [],
  );
const records = walk(resolve("src/app/api")).map((file) => {
  const source = readFileSync(file, "utf8");
  return {
    file: relative(process.cwd(), file).replaceAll("\\", "/"),
    methods: [...source.matchAll(/export const (GET|POST|PUT|PATCH|DELETE)\b/g)].map(
      (match) => match[1],
    ),
    session: /import\s*\{\s*requireSession\s*\}\s*from\s*["']@\/server\/auth\/runtime/.test(source),
  };
});
const checks = records
  .filter((record) => record.session && !record.file.includes("users/[userId]/avatar/"))
  .flatMap((record) => record.methods.map((method) => ({ ...record, method })));
const results: Array<{ file: string; method: string; status: number; databaseCalls: number }> = [];

describe("all direct session route methods deny anonymous requests before I/O", () => {
  it.each(checks)(
    "$method $file",
    async ({ file, method }) => {
      state.databaseCalls = 0;
      state.sessionCalls = 0;
      const route = await import(/* @vite-ignore */ resolve(file));
      const params: Record<string, string | string[]> = {};
      for (const match of file.matchAll(/\[([^\]]+)\]/g)) {
        params[match[1]] =
          match[1] === "collection" ? "blog-posts" : "10000000-0000-4000-8000-000000000001";
      }
      const request = new Request("http://localhost/api/v1/guard", {
        method,
        headers: { "content-type": "application/json" },
        ...(method === "GET" ? {} : { body: "{}" }),
      });
      const response = await route[method](request, { params: Promise.resolve(params) });
      results.push({ file, method, status: response.status, databaseCalls: state.databaseCalls });
      expect(response.status).toBe(401);
      expect(state.sessionCalls).toBeGreaterThan(0);
      expect(state.databaseCalls).toBe(0);
      expect(await response.json()).toMatchObject({ error: { code: "UNAUTHENTICATED" } });
    },
    60000,
  );
});

afterAll(() => {
  mkdirSync(".local/qa/session-18b", { recursive: true });
  writeFileSync(
    ".local/qa/session-18b/route-guard-evidence.json",
    JSON.stringify({ records, results }, null, 2) + "\n",
  );
});
