import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "@/client/api/client";
import { ApiClientError, normalizeApiError } from "@/client/api/errors";
import { queryKeys } from "@/client/queries/query-keys";

describe("frontend data adapter", () => {
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

  it("normalizes bare error payloads to the same client error type", () => {
    const normalized = normalizeApiError({
      message: "Request failed",
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

describe("API request lifecycle", () => {
  it("keeps GET requests alive for React Query remount reuse", async () => {
    let receivedSignal: AbortSignal | null | undefined;
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      receivedSignal = init?.signal;
      return Response.json({ data: [] });
    });
    const client = new ApiClient({
      baseUrl: "https://lexnepal.test",
      fetcher: fetcher as typeof fetch,
    });

    await client.request("/api/v1/tasks", { signal: new AbortController().signal });

    expect(receivedSignal).toBeUndefined();
  });

  it("shares identical GET requests while they are in flight", async () => {
    let resolveFetch!: (response: Response) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const client = new ApiClient({
      baseUrl: "https://lexnepal.test",
      fetcher: fetcher as typeof fetch,
    });

    const first = client.request("/api/v1/tasks");
    const second = client.request("/api/v1/tasks");

    expect(fetcher).toHaveBeenCalledTimes(1);
    resolveFetch(Response.json({ data: [{ id: "task-1" }] }));
    await expect(Promise.all([first, second])).resolves.toEqual([
      [{ id: "task-1" }],
      [{ id: "task-1" }],
    ]);

    const third = client.request("/api/v1/tasks");
    expect(fetcher).toHaveBeenCalledTimes(2);
    resolveFetch(Response.json({ data: [] }));
    await third;
  });

  it("still forwards explicit abort signals for mutations", async () => {
    let receivedSignal: AbortSignal | null | undefined;
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      receivedSignal = init?.signal;
      return new Response(null, { status: 204 });
    });
    const client = new ApiClient({
      baseUrl: "https://lexnepal.test",
      fetcher: fetcher as typeof fetch,
    });
    const controller = new AbortController();

    await client.request("/api/v1/tasks", {
      method: "POST",
      body: { title: "Prepare filing" },
      signal: controller.signal,
    });

    expect(receivedSignal).toBe(controller.signal);
  });
});

describe("decommissioned backend boundary", () => {
  it("has no Convex or react-router imports left in the app source", () => {
    const root = path.resolve("src");
    const violations: string[] = [];
    walk(root, (file) => {
      const source = fs.readFileSync(file, "utf8");
      if (/from\s+["']convex\/|from\s+["']react-router|@\/convex\//.test(source)) {
        violations.push(path.relative(root, file));
      }
    });
    expect(violations).toEqual([]);
  });

  it("routes every domain hook through the Next API client", () => {
    const queriesDir = path.resolve("src/client/queries");
    const offenders: string[] = [];
    for (const entry of fs.readdirSync(queriesDir)) {
      if (!entry.endsWith(".ts") || entry === "query-keys.ts") continue;
      const source = fs.readFileSync(path.join(queriesDir, entry), "utf8");
      if (!source.includes("@/client/api/client")) offenders.push(entry);
    }
    expect(offenders).toEqual([]);
  });
});

function walk(directory: string, visit: (file: string) => void): void {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target, visit);
    else if (/\.tsx?$/.test(entry.name)) visit(target);
  }
}
