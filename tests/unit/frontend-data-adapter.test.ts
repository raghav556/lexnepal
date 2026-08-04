import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "@/client/api/client";
import { ApiClientError, normalizeApiError } from "@/client/api/errors";
import { BACKEND_DOMAINS, resolveBackendFlags } from "@/client/data/backend-config";
import { queryKeys } from "@/client/queries/query-keys";

describe("frontend backend routing", () => {
  it("defaults every domain to Convex and switches domains independently", () => {
    const defaults = resolveBackendFlags({});
    expect(BACKEND_DOMAINS.every((domain) => defaults[domain] === "convex")).toBe(true);

    const switched = resolveBackendFlags({
      VITE_BACKEND_DOCUMENTS: "next",
      VITE_BACKEND_CASES: "convex",
      NEXT_PUBLIC_BACKEND_TASKS: "next",
      VITE_BACKEND_CMS: "invalid",
    });
    expect(switched.documents).toBe("next");
    expect(switched.tasks).toBe("next");
    expect(switched.cases).toBe("convex");
    expect(switched.cms).toBe("convex");
  });

  it("forces Convex for every domain while VITE_USE_MOCK is enabled", () => {
    const mocked = resolveBackendFlags({
      VITE_USE_MOCK: "true",
      VITE_BACKEND_DOCUMENTS: "next",
      VITE_BACKEND_CASES: "next",
      VITE_BACKEND_IDENTITY: "next",
      NEXT_PUBLIC_BACKEND_TASKS: "next",
    });
    expect(BACKEND_DOMAINS.every((domain) => mocked[domain] === "convex")).toBe(true);
  });

  it("uses stable domain query-key namespaces", () => {
    expect(queryKeys.documents.list({ inTrash: false })).toEqual([
      "documents",
      "list",
      { inTrash: false },
    ]);
    expect(queryKeys.cases.all[0]).toBe("cases");
    expect(queryKeys.tasks.detail("task-1")).toEqual(["tasks", "detail", "task-1"]);
  });
});

describe("normalized API errors", () => {
  it("preserves the structured Next.js API error contract", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "FORBIDDEN",
              message: "Cross-firm access is denied",
              requestId: "request-1",
            },
          }),
          { status: 403, headers: { "content-type": "application/json" } },
        ),
    );
    const client = new ApiClient({ baseUrl: "https://lexnepal.test", fetcher });
    await expect(client.request("/api/v1/documents")).rejects.toMatchObject({
      name: "ApiClientError",
      code: "FORBIDDEN",
      status: 403,
      requestId: "request-1",
    });
  });

  it("normalizes legacy Convex errors to the same client error type", () => {
    const normalized = normalizeApiError({
      message: "Convex request failed",
      data: { code: "UNAUTHENTICATED", message: "Authentication is required" },
    });
    expect(normalized).toBeInstanceOf(ApiClientError);
    expect(normalized).toMatchObject({
      code: "UNAUTHENTICATED",
      status: 401,
      message: "Authentication is required",
    });
  });
});

describe("Convex import boundary", () => {
  it("keeps direct convex/react imports inside the transitional bridge", () => {
    const root = path.resolve("src");
    const violations: string[] = [];
    walk(root, (file) => {
      if (file.endsWith(path.join("client", "data", "convex-bridge.ts"))) return;
      if (file.includes(path.join("client", "queries"))) return;
      if (/from\s+["']convex\/react["']/.test(fs.readFileSync(file, "utf8"))) {
        violations.push(path.relative(root, file));
      }
    });
    expect(violations).toEqual([]);
  });

  it("keeps matters components independent of Convex domain exports", () => {
    const root = path.resolve("src");
    const violations: string[] = [];
    walk(root, (file) => {
      if (!file.endsWith(".tsx")) return;
      if (/api\.(?:clients|cases|conflictChecks)\b/.test(fs.readFileSync(file, "utf8"))) {
        violations.push(path.relative(root, file));
      }
    });
    expect(violations).toEqual([]);
  });
});

function walk(directory: string, visit: (file: string) => void): void {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target, visit);
    else if (/\.tsx?$/.test(entry.name)) visit(target);
  }
}
