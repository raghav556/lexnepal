import React from "react";
import { createRequire } from "node:module";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InfiniteQueryObserver, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiClientError } from "@/client/api/errors";
import { fetchCollectionPage, useCollectionQuery } from "@/client/queries/collection";
import { encodeMessageCursor } from "@/shared/message-cursor";
import { decodeMessageCursor } from "@/shared/message-cursor";
import { CollectionContinuation } from "@/components/ui/collection-continuation";
import { useHardDeleteDocument, useRecentDocuments, useRestoreDocument, useTrashDocument, useUpdateDocument } from "@/client/queries/documents";
const mocks = vi.hoisted(() => ({ request: vi.fn(), language: "en", actor: { id: "fixture-user", firmId: "fixture-firm", role: "staff" } }));
vi.mock("@/client/api/client", () => ({ apiClient: { request: mocks.request } }));
vi.mock("@/client/auth/auth-provider", () => ({ useAuthContext: () => ({ identityUser: mocks.actor }) }));
vi.mock("@/lib/i18n-context", () => ({ useI18n: () => ({ language: mocks.language }) }));
const id = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const cursor = (n: number) => encodeMessageCursor("2026-10-20T12:00:00.000Z", id(n));
let client: QueryClient;
beforeEach(() => { mocks.request.mockReset(); mocks.language = "en"; mocks.actor = { id: "fixture-user", firmId: "fixture-firm", role: "staff" }; client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }); });
afterEach(() => { client.clear(); vi.unstubAllGlobals(); });
function capture() {
  let result!: ReturnType<typeof useCollectionQuery<{ id: string; title: string }>>;
  function Harness() { result = useCollectionQuery<{ id: string; title: string }>({ queryKey: ["fixture"], path: "/fixture" }); return null; }
  renderToString(React.createElement(QueryClientProvider, { client }, React.createElement(Harness)));
  return result;
}
function command<T>(hook: () => T): T {
  let result!: T;
  function Harness() { result = hook(); return null; }
  renderToString(React.createElement(QueryClientProvider, { client }, React.createElement(Harness)));
  return result;
}
describe("Shared bounded collection continuation", () => {
  it("keeps cursor bytes compatible with Next's browser Buffer without base64url encoding support", () => {
    const original = cursor(2);
    const browserBuffer = createRequire(import.meta.url)("next/dist/compiled/buffer").Buffer;
    expect(browserBuffer.isEncoding("base64url")).toBe(false);
    vi.stubGlobal("Buffer", browserBuffer);
    expect(cursor(2)).toBe(original);
    expect(decodeMessageCursor(original)?.id).toBe(id(2));
  });
  it("uses one explicit page request, merges duplicate identities and preserves original order", async () => {
    client.setQueryData(["fixture", "continued", { firmId: mocks.actor.firmId, userId: mocks.actor.id, role: mocks.actor.role }], { pages: [{ items: [{ id: id(2), title: "fresh" }], nextCursor: cursor(2), total: null }, { items: [{ id: id(2), title: "duplicate" }, { id: id(1), title: "older" }], nextCursor: null, total: null }], pageParams: [undefined, cursor(2)] });
    const query = capture(); expect(query.data?.map(row => row.title)).toEqual(["fresh", "older"]); expect(query.hasMore).toBe(false);
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("never reuses another user, tenant or role's cached continuation pages", () => {
    client.setQueryData(["fixture", "continued", { firmId: mocks.actor.firmId, userId: mocks.actor.id, role: mocks.actor.role }], { pages: [{ items: [{ id: id(1), title: "private cached item" }], nextCursor: null, total: null }], pageParams: [undefined] });
    expect(capture().data).toHaveLength(1);
    for (const actor of [{ id: "other-user", firmId: "fixture-firm", role: "staff" }, { id: "fixture-user", firmId: "other-firm", role: "staff" }, { id: "fixture-user", firmId: "fixture-firm", role: "client" }]) {
      mocks.actor = actor; expect(capture().data).toBeUndefined();
    }
  });
  it("keeps the bounded recent-document preview isolated from another account's cache too", () => {
    client.setQueryData(["documents", "recent", 5, "scope", { firmId: mocks.actor.firmId, userId: mocks.actor.id, role: mocks.actor.role }], [{ _id: id(1), title: "private preview" }]);
    expect(command(() => useRecentDocuments(5))).toHaveLength(1);
    mocks.actor = { ...mocks.actor, id: "other-user" };
    expect(command(() => useRecentDocuments(5))).toBeUndefined();
  });
  it("continues only when requested and preserves the loaded page on error/retry", async () => {
    mocks.request.mockResolvedValueOnce({ items: [{ id: id(2) }], nextCursor: cursor(2), total: null });
    const observer = new InfiniteQueryObserver(client, { queryKey: ["history"], queryFn: ({ pageParam }) => fetchCollectionPage<{ id: string }>("/history", {}, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: page => page.nextCursor ?? undefined, retry: false });
    const unsubscribe = observer.subscribe(() => {}); await observer.refetch(); expect(mocks.request).toHaveBeenCalledTimes(1);
    mocks.request.mockRejectedValueOnce(new Error("Synthetic network failure")); await observer.fetchNextPage();
    expect(observer.getCurrentResult().isFetchNextPageError).toBe(true); expect(observer.getCurrentResult().data?.pages[0].items[0].id).toBe(id(2));
    mocks.request.mockResolvedValueOnce({ items: [{ id: id(1) }], nextCursor: null, total: null }); await observer.fetchNextPage();
    expect(observer.getCurrentResult().data?.pages.flatMap(p => p.items).map(r => r.id)).toEqual([id(2), id(1)]); expect(observer.getCurrentResult().hasNextPage).toBe(false);
    unsubscribe();
  });
  it.each([401, 403, 404])("withholds cached records after HTTP %i", async status => {
    client.setQueryData(["fixture", "continued", { firmId: mocks.actor.firmId, userId: mocks.actor.id, role: mocks.actor.role }], { pages: [{ items: [{ id: id(1), title: "private cached item" }], nextCursor: cursor(1), total: null }], pageParams: [undefined] });
    mocks.request.mockRejectedValue(new ApiClientError("FORBIDDEN", "Denied", status));
    await client.fetchInfiniteQuery({ queryKey: ["fixture", "continued", { firmId: mocks.actor.firmId, userId: mocks.actor.id, role: mocks.actor.role }], queryFn: () => fetchCollectionPage("/fixture", {}, undefined), initialPageParam: undefined, staleTime: 0 }).catch(() => {});
    expect(capture().data).toBeUndefined(); expect(capture().hasMore).toBe(false);
  });
  it.each([[], { items: [], nextCursor: "bad" }, { items: [{ title: "missing identity" }], nextCursor: null }, { items: [{ id: "" }], nextCursor: null }])("rejects missing metadata/identity instead of claiming all records loaded: %j", async value => {
    mocks.request.mockResolvedValue(value); await expect(fetchCollectionPage("/fixture", {}, undefined)).rejects.toThrow();
  });
  it("rejects repeated or forward cursors and preserves request filters", async () => {
    mocks.request.mockResolvedValue({ items: [], nextCursor: cursor(2) });
    await expect(fetchCollectionPage("/fixture", { caseId: id(90), query: "evidence" }, cursor(2))).rejects.toThrow("Invalid continuation progress");
    expect(mocks.request).toHaveBeenCalledWith("/fixture", expect.objectContaining({ query: { page: "true", cursor: cursor(2), caseId: id(90), query: "evidence" } }));
    mocks.request.mockResolvedValue({ items: [], nextCursor: cursor(3) }); await expect(fetchCollectionPage("/fixture", {}, cursor(2))).rejects.toThrow();
  });
  it.each(["en", "ne"])("renders truthful unknown totals and accessible continuation/retry in %s", language => {
    mocks.language = language;
    const html = renderToString(React.createElement(CollectionContinuation, { noun: "documents", query: { data: [{ id: id(1) }], hasMore: true, refetch: vi.fn(), fetchNextPage: vi.fn() } }));
    expect(html).toContain('role="status"'); expect(html).toContain('type="button"'); expect(html).toContain(language === "en" ? "Load more documents" : "थप कागजात लोड गर्नुहोस्"); expect(html).not.toContain("total");
  });
  it.each([
    ["trash", useTrashDocument, "POST", "/trash"],
    ["restore", useRestoreDocument, "POST", "/restore"],
    ["delete", useHardDeleteDocument, "DELETE", ""],
  ] as const)("preserves the %s action and invalidates the new continued document caches", async (_name, hook, method, suffix) => {
    const key = ["documents", "list", {}, "continued", { userId: mocks.actor.id }];
    client.setQueryData(key, { pages: [{ items: [{ id: id(1) }], nextCursor: null }], pageParams: [undefined] });
    client.setQueryData(["unrelated"], ["keep"]); mocks.request.mockResolvedValue({ success: true });
    await command(hook)(id(1));
    expect(mocks.request).toHaveBeenCalledWith(`/api/v1/documents/${id(1)}${suffix}`, method === "DELETE" ? { method } : { method, body: {} });
    expect(client.getQueryState(key)?.isInvalidated).toBe(true); expect(client.getQueryState(["unrelated"])?.isInvalidated).toBe(false);
  });
  it("preserves policy-only/metadata PATCH bodies and propagates denial without clearing a draft's cached record", async () => {
    const key = ["documents", "list", {}, "continued", { userId: mocks.actor.id }];
    client.setQueryData(key, ["original"]); mocks.request.mockRejectedValue(new ApiClientError("FORBIDDEN", "Denied", 403));
    await expect(command(useUpdateDocument)({ id: id(1), updates: { retentionPolicy: "original draft" } })).rejects.toMatchObject({ status: 403 });
    expect(client.getQueryData(key)).toEqual(["original"]);
    mocks.request.mockResolvedValue({ success: true }); await command(useUpdateDocument)({ id: id(1), updates: { title: "Explicit metadata edit" } });
    expect(mocks.request).toHaveBeenLastCalledWith(`/api/v1/documents/${id(1)}`, { method: "PATCH", body: { title: "Explicit metadata edit" } });
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  });
});
