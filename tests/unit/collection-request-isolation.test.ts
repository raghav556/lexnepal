import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "@/client/api/client";

describe("Continuation requests across account/tenant/role transitions", () => {
  it("shares identical reads only within the same authenticated view scope", async () => {
    const resolvers: Array<(value: Response) => void> = [];
    const fetcher = vi.fn<typeof fetch>(() => new Promise<Response>(resolve => resolvers.push(resolve)));
    const client = new ApiClient({ baseUrl: "http://localhost", fetcher });
    const first = client.request("/api/v1/documents", { query: { page: true }, deduplicationKey: "firm-a/user-a/client" });
    const same = client.request("/api/v1/documents", { query: { page: true }, deduplicationKey: "firm-a/user-a/client" });
    const other = client.request("/api/v1/documents", { query: { page: true }, deduplicationKey: "firm-b/user-b/client" });
    const role = client.request("/api/v1/documents", { query: { page: true }, deduplicationKey: "firm-a/user-a/admin" });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls.every(([url]) => !String(url).includes("firm-"))).toBe(true);
    resolvers[0](Response.json({ data: ["only-a"] })); resolvers[1](Response.json({ data: ["only-b"] })); resolvers[2](Response.json({ data: ["admin-only"] }));
    expect(await first).toEqual(["only-a"]); expect(await same).toEqual(["only-a"]);
    expect(await other).toEqual(["only-b"]); expect(await role).toEqual(["admin-only"]);
  });
});
