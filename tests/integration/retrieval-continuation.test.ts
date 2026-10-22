/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createConnection, type Connection } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql-proxy";
import { getTableColumns, getTableName } from "drizzle-orm";
import { documents, documentTags, documentTagAssignments, auditLog, users, notifications } from "../../db/schema";
import { collectionPageQuerySchema, type CollectionPage } from "@/shared/collection-page";
import { encodeMessageCursor } from "@/shared/message-cursor";
import type { AuthPrincipal } from "@/server/auth/types";

const state = vi.hoisted(() => ({ db: undefined as any, principal: undefined as any }));
vi.mock("@/server/db/client", () => ({ getDatabase: () => state.db }));
vi.mock("@/server/auth/runtime", () => ({ requireSession: async () => {
  if (!state.principal) { const { AppError } = await import("@/shared/errors/api-error"); throw new AppError("UNAUTHENTICATED", "No session", 401); }
  return state.principal;
} }));
vi.mock("@/server/repositories/security-repository", () => ({ MySqlSecurityRepository: class {
  getClientByUser = async (id: string) => ({ id: id.endsWith("2") ? "other-client" : "client-a", firmId: "10000000-0000-4000-8000-000000000001" });
  listCaseIdsForClient = async (_firmId: string, clientId: string) => clientId === "client-a" ? ["30000000-0000-4000-8000-000000000001"] : [];
  getCase = async (id: string) => ({ id, firmId: id.endsWith("9") ? "foreign" : "10000000-0000-4000-8000-000000000001", clientId: "client-a", assignedLawyerId: "someone-else", teamMemberIds: [] });
} }));
const firm = "10000000-0000-4000-8000-000000000001", user = "20000000-0000-4000-8000-000000000001", caseId = "30000000-0000-4000-8000-000000000001";
const foreign = "10000000-0000-4000-8000-000000000002", otherUser = "20000000-0000-4000-8000-000000000002";
const id = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const when = "2026-10-20 12:00:00.000";
const tables = { documents, document_tags: documentTags, document_tag_assignments: documentTagAssignments, audit_log: auditLog, users, notifications };
let fixtures: Record<string, Array<Record<string, unknown>>>;
let connection: Connection;
let queries: Array<{ sql: string; params: unknown[] }>;
let documentService: InstanceType<typeof import("@/server/services/document-service")["DocumentService"]>;
let identityService: InstanceType<typeof import("@/server/services/identity-service")["IdentityService"]>;
let communicationService: InstanceType<typeof import("@/server/services/communication-service")["CommunicationService"]>;
let routes: any[];

function actor(role: "staff" | "admin" | "client" = "staff", actorId = user): AuthPrincipal {
  return { user: { id: actorId, firmId: firm, role: role === "staff" ? "associate" : role, tokenIdentifier: "synthetic-retrieval", avatar: null, phone: null, name: "Synthetic retrieval actor", email: "fixture@example.invalid", isActive: true, isPending: false }, firmId: firm,
    capabilities: new Set(role === "client" ? ["documents.read"] : ["documents.read", "cases.view_all"]), sessionId: "fixture", authenticationMethod: "session_cookie" };
}
function rows(size: number) {
  return Array.from({ length: size }, (_, i) => ({ id: id(i + 1), firmId: firm, caseId, userId: user, createdAt: when, updatedAt: when,
    title: `Fixture ${i + 1}`, description: "Synthetic", type: "evidence", storageId: "fixture", mimeType: "text/plain", sizeBytes: 1,
    uploadedBy: user, isTemplate: false, isPrivileged: false, confidentialityLevel: "public", version: 1,
    status: "active", uploadStatus: "completed", name: "Synthetic actor", role: "client", action: "documents.uploaded", resource: "documents",
    details: "PRIVATE-AUDIT-DETAIL", ipAddress: "192.0.2.1", requestId: "PRIVATE-REQUEST", isRead: false, link: "/admin/users" }));
}
/** Execute real repository SQL over parameterized CTE fixtures. No application table is read or written. */
function cte() {
  const params: unknown[] = [];
  const definitions = Object.entries(tables).map(([name, table]) => {
    const columns = Object.entries(getTableColumns(table));
    const source = fixtures[name] ?? [];
    const selects = (source.length ? source : [{}]).map((row, n) => "SELECT " + columns.map(([key, column]) => {
      let value = (row as Record<string, unknown>)[key] ?? null;
      if (typeof value === "boolean") value = Number(value);
      params.push(value); return "?" + (n === 0 ? ` AS \`${column.name}\`` : "");
    }).join(",") + (!source.length ? " WHERE FALSE" : ""));
    return `\`${getTableName(table)}\` AS (${selects.join(" UNION ALL ")})`;
  });
  return { sql: "WITH " + definitions.join(",") + " ", params };
}
beforeAll(async () => {
  const uri = process.env.DATABASE_URL;
  if (!uri || !["127.0.0.1", "localhost"].includes(new URL(uri).hostname)) throw new Error("Local read-only MySQL is required; no remote fallback");
  connection = await createConnection({ uri, rowsAsArray: true, timezone: "Z" });
  await connection.query("SET TRANSACTION READ ONLY"); await connection.query("START TRANSACTION READ ONLY");
  state.db = drizzle(async (sql, params) => {
    if (!/^select\b/i.test(sql)) throw new Error("Fixture harness refuses mutations");
    queries.push({ sql, params }); const fixture = cte();
    const [data] = await connection.query(fixture.sql + sql, [...fixture.params, ...params]);
    return { rows: data as unknown[][] };
  });
  const [d, i, c] = await Promise.all([import("@/server/services/document-service"), import("@/server/services/identity-service"), import("@/server/services/communication-service")]);
  documentService = new d.DocumentService(); identityService = new i.IdentityService(); communicationService = new c.CommunicationService();
  routes = await Promise.all([import("@/app/api/v1/documents/route"), import("@/app/api/v1/users/me/audit-events/route"), import("@/app/api/v1/notifications/route")]);
}, 30000);
afterAll(async () => { if (connection) { await connection.rollback(); await connection.end(); } });
beforeEach(() => { queries = []; fixtures = { users: [{ ...rows(1)[0], id: user }] }; state.principal = actor(); });

async function collect(fetch: (cursor?: string) => Promise<CollectionPage<any>>) {
  const all: any[] = []; let cursor: string | undefined;
  for (let attempt = 0; attempt < 20; attempt++) {
    const page = await fetch(cursor); expect(page.total).toBeNull(); all.push(...page.items);
    if (!page.nextCursor) return all;
    expect(page.nextCursor).not.toBe(cursor); cursor = page.nextCursor;
  }
  throw new Error("Fixture continuation did not terminate");
}
describe("Session17D read-only repository/API continuation", () => {
  for (const family of ["documents", "audit", "notifications"] as const) {
    const limit = family === "audit" ? 30 : 50;
    it.each([0, 1, limit, limit + 1, limit * 3 + 7])(`${family}: exact coverage at %i records including identical creation timestamps`, async size => {
      fixtures[family === "audit" ? "audit_log" : family] = rows(size);
      const fetch = family === "documents" ? (cursor?: string) => documentService.listPage(actor(), { caseId, limit, cursor })
        : family === "audit" ? (cursor?: string) => identityService.listOwnAuditPage(actor(), { limit, cursor })
          : (cursor?: string) => communicationService.listNotificationsPage(actor(), { limit, cursor });
      const all = await collect(fetch);
      expect(all.map(r => r.id ?? r._id)).toEqual(rows(size).reverse().map(r => r.id));
      expect(new Set(all.map(r => r.id ?? r._id)).size).toBe(size);
      for (const query of queries.filter(q => /limit \?/i.test(q.sql))) expect(query.params.at(-1)).toBe(limit + 1);
      expect(queries.length).toBeLessThanOrEqual((Math.ceil(size / limit) || 1) * (family === "documents" ? 2 : 1));
    });
  }
  it("documents/Misl/history: insertions and deletions cannot offset the next page", async () => {
    fixtures.documents = rows(101);
    const first = await documentService.listPage(actor(), { caseId, limit: 50 });
    fixtures.documents.push(rows(1000).at(-1)!);
    fixtures.documents = fixtures.documents.filter(r => r.id !== id(75)); // deletion in the already loaded window
    const rest = await collect(cursor => documentService.listPage(actor(), { caseId, limit: 50, cursor: cursor ?? first.nextCursor! }));
    const ids = [...first.items, ...rest].map(r => r._id);
    expect(ids).toHaveLength(101); expect(new Set(ids).size).toBe(101); expect(ids).not.toContain(id(1000));
    expect(ids).toContain(id(1));
  });
  it("search applies tag/type/client visibility BEFORE the limit and never leaks cross-tenant rows", async () => {
    fixtures.documents = rows(155).map((r, i) => ({ ...r, isPrivileged: i > 0 }));
    fixtures.documents.push({ ...rows(1)[0], id: id(999), firmId: foreign });
    fixtures.document_tags = [{ ...rows(1)[0], id: id(800), name: "Verified" }];
    fixtures.document_tag_assignments = [{ ...rows(1)[0], id: id(801), documentId: id(1), tagId: id(800) }];
    const page = await documentService.searchPage(actor("client"), { query: "Fixture", tag: "verified", type: "evidence", limit: 1 });
    expect(page.items.map(r => r._id)).toEqual([id(1)]); expect(page.nextCursor).toBeNull();
    const wrongType = await documentService.searchPage(actor("client"), { query: "Fixture", type: "contract" }); expect(wrongType.items).toEqual([]);
  });
  it("case filtering intersects Client ownership instead of returning owned documents from other matters", async () => {
    fixtures.documents = [rows(1)[0], { ...rows(2)[1], caseId: "30000000-0000-4000-8000-000000000002" }];
    expect((await documentService.listPage(actor("client"), { caseId })).items.map(r => r._id)).toEqual([id(1)]);
    expect((await documentService.searchPage(actor("client"), { query: "Fixture", generalOnly: true })).items).toEqual([]);
    fixtures.documents.push({ ...rows(3)[2], caseId: null });
    expect((await documentService.searchPage(actor("client"), { query: "Fixture", generalOnly: true })).items.map(r => r._id)).toEqual([id(3)]);
  });
  it("retains current-version/trash/template filters before page boundaries", async () => {
    fixtures.documents = [rows(1)[0], { ...rows(2)[1], parentDocumentId: id(1) }, { ...rows(3)[2], deletedAt: when }, { ...rows(4)[3], isTemplate: true }];
    expect((await documentService.listPage(actor(), { isTemplate: false })).items.map(r => r._id)).toEqual([id(2)]);
    expect((await documentService.listPage(actor(), { inTrash: true })).items.map(r => r._id)).toEqual([id(3)]);
    expect((await documentService.searchPage(actor(), { query: "Fixture", inTrash: true })).items.map(r => r._id)).toEqual([id(3)]);
    expect((await documentService.listPage(actor(), { isTemplate: true })).items.map(r => r._id)).toEqual([id(4)]);
  });
  it("denies missing document permission and foreign/unauthorized cases on every continuation", async () => {
    const denied: AuthPrincipal = { ...actor(), capabilities: new Set() };
    await expect(documentService.listPage(denied, {})).rejects.toMatchObject({ status: 403 });
    await expect(documentService.listPage(actor(), { caseId: "30000000-0000-4000-8000-000000000009" })).rejects.toMatchObject({ status: 404 });
    const staff: AuthPrincipal = { ...actor(), capabilities: new Set(["documents.read"]) };
    await expect(documentService.searchPage(staff, { query: "Fixture", caseId })).rejects.toMatchObject({ status: 403 });
    await expect(documentService.listPage(actor("client", otherUser), { caseId })).rejects.toMatchObject({ status: 403 });
  });
  it.each(["staff", "admin", "client"] as const)("%s own audit is self/firm-scoped and Client privacy survives later pages", async role => {
    fixtures.users = [{ ...rows(1)[0], id: user }, { ...rows(1)[0], id: otherUser }];
    fixtures.audit_log = [...rows(33), { ...rows(1)[0], id: id(90), userId: otherUser }, { ...rows(1)[0], id: id(91), firmId: foreign }];
    const all = await collect(cursor => identityService.listOwnAuditPage(actor(role), { limit: 30, cursor }));
    expect(all).toHaveLength(33);
    if (role === "client") for (const item of all) { expect(item).not.toHaveProperty("details"); expect(item).not.toHaveProperty("ipAddress"); expect(item).not.toHaveProperty("requestId"); }
    else expect(all[0].details).toBe("PRIVATE-AUDIT-DETAIL");
  });
  it("notifications stay self/firm scoped, role-safe and stable when read state changes", async () => {
    fixtures.notifications = [...rows(55), { ...rows(1)[0], id: id(91), userId: otherUser }, { ...rows(1)[0], id: id(92), firmId: foreign }];
    const first = await communicationService.listNotificationsPage(actor("client"), { limit: 50 });
    fixtures.notifications.forEach(r => { r.isRead = true; }); // fixture-only read action
    const next = await communicationService.listNotificationsPage(actor("client"), { limit: 50, cursor: first.nextCursor! });
    expect([...first.items, ...next.items]).toHaveLength(55); expect(next.items.every(r => (r as Record<string, unknown>).isRead)).toBe(true);
    expect([...first.items, ...next.items].every(r => r.link === null)).toBe(true);
  });
  it("real routes keep legacy arrays and expose explicit continuation only when opted in", async () => {
    fixtures.documents = rows(51); fixtures.audit_log = rows(31); fixtures.notifications = rows(51);
    for (const [index, route] of routes.entries()) {
      const legacy = await route.GET(new Request("http://localhost/api/v1/fixture"));
      expect(Array.isArray((await legacy.json()).data)).toBe(true);
      const paged = await route.GET(new Request("http://localhost/api/v1/fixture?page=true&limit=1&userId=" + otherUser));
      expect(paged.status).toBe(200); const { data } = await paged.json(); expect(data.items).toHaveLength(1); expect(data.nextCursor).toBeTruthy(); expect(data.total).toBeNull();
      if (index === 1) expect(data.items[0].userId).toBe(user);
    }
  });
  it("rejects malformed/out-of-bound cursors and sizes rather than inventing end-of-history", async () => {
    for (const input of [{ cursor: "bad" }, { limit: 0 }, { limit: 101 }]) expect(collectionPageQuerySchema.safeParse(input).success).toBe(false);
    for (const route of routes) { const response = await route.GET(new Request("http://localhost/api/v1/fixture?page=true&cursor=bad")); expect(response.status).toBe(400); }
    expect(collectionPageQuerySchema.parse({ cursor: encodeMessageCursor(new Date(), id(1)) }).cursor).toBeTruthy();
  });
  it("supports the maximum page size without losing the final lookahead record", async () => {
    fixtures.documents = rows(101); fixtures.audit_log = rows(101); fixtures.notifications = rows(101);
    for (const fetch of [(cursor?: string) => documentService.listPage(actor(), { limit: 100, cursor }), (cursor?: string) => identityService.listOwnAuditPage(actor(), { limit: 100, cursor }), (cursor?: string) => communicationService.listNotificationsPage(actor(), { limit: 100, cursor })]) {
      expect(await collect(fetch)).toHaveLength(101);
    }
  });
  it("all three real routes reject unauthenticated retrieval before any fixture SQL executes", async () => {
    state.principal = null;
    for (const route of routes) expect((await route.GET(new Request("http://localhost/api/v1/fixture?page=true"))).status).toBe(401);
    expect(queries).toHaveLength(0);
  });
});
