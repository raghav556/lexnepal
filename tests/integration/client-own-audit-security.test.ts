import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { auditLog, firms, users } from "../../db/schema";
import { createSigningTestDatabase } from "../support/signing-test-database";
import type { AuthPrincipal, UserRole } from "../../src/server/auth/types";
import { requireSession } from "../../src/server/auth/runtime";

// Supply authenticated principals to the real route handlers; production authentication is unchanged.
vi.mock("@/server/auth/runtime", () => ({ requireSession: vi.fn() }));

type DatabaseModule = typeof import("../../src/server/db/client");
let database: ReturnType<DatabaseModule["getDatabase"]>;
let closeDatabase: DatabaseModule["closeDatabase"];
let sandbox: Awaited<ReturnType<typeof createSigningTestDatabase>>;
let ownRoute: typeof import("../../src/app/api/v1/users/me/audit-events/route");
let privilegedRoute: typeof import("../../src/app/api/v1/audit-events/route");
let firmA: string;
let firmB: string;
let clientA: string;
let clientB: string;
let foreignClient: string;
let staffA: string;
let adminA: string;
let internalEvent: string;
let knownEvent: string;
let staffEvent: string;
let adminEvent: string;
const internalIntentId = randomUUID();
const internalJobId = randomUUID();
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalStorageRoot = process.env.STORAGE_ROOT;

function principal(userId: string, firmId: string, role: UserRole): AuthPrincipal {
  return {
    user: {
      id: userId,
      firmId,
      tokenIdentifier: `self-audit-test|${userId}`,
      name: "Audit test user",
      email: `${userId}@example.invalid`,
      role,
      isActive: true,
      isPending: false,
      avatar: null,
      phone: null,
    },
    firmId,
    capabilities: role === "admin" ? new Set(["audit.view"] as const) : new Set(),
    sessionId: `test-${userId}`,
    authenticationMethod: "session_cookie",
  };
}

async function addFirm() {
  const id = randomUUID();
  await database
    .insert(firms)
    .values({ id, name: `Self-audit test ${id}`, slug: `self-audit-${id}` });
  return id;
}

async function addUser(firmId: string, role: UserRole) {
  const id = randomUUID();
  await database.insert(users).values({
    id,
    firmId,
    tokenIdentifier: `self-audit-test|${id}`,
    name: `Audit ${role}`,
    email: `${id}@example.invalid`,
    role,
  });
  return id;
}

async function addAudit(
  firmId: string,
  userId: string,
  action: string,
  details: string | null,
  resourceId: string | null = null,
) {
  const id = randomUUID();
  await database.insert(auditLog).values({
    id,
    firmId,
    userId,
    action,
    resource: "durable_jobs",
    resourceId,
    details,
    ipAddress: "192.0.2.10",
    requestId: "internal-request-id",
  });
  return id;
}

async function getOwn(actor: AuthPrincipal) {
  vi.mocked(requireSession).mockResolvedValue(actor);
  const response = await ownRoute.GET(new Request("http://localhost/api/v1/users/me/audit-events"));
  return { response, body: (await response.json()) as { data: Array<Record<string, unknown>> } };
}

beforeAll(async () => {
  sandbox = await createSigningTestDatabase({ applyArtifactMigration: false });
  const dbModule = await import("../../src/server/db/client");
  database = dbModule.getDatabase();
  closeDatabase = dbModule.closeDatabase;
  [ownRoute, privilegedRoute] = await Promise.all([
    import("../../src/app/api/v1/users/me/audit-events/route"),
    import("../../src/app/api/v1/audit-events/route"),
  ]);
  firmA = await addFirm();
  firmB = await addFirm();
  clientA = await addUser(firmA, "client");
  clientB = await addUser(firmA, "client");
  foreignClient = await addUser(firmB, "client");
  staffA = await addUser(firmA, "associate");
  adminA = await addUser(firmA, "admin");
  internalEvent = await addAudit(
    firmA,
    clientA,
    "job.enqueued",
    `type=document.malware_scan; uploadIntent=${internalIntentId}`,
    internalJobId,
  );
  knownEvent = await addAudit(firmA, clientA, "users.profile_updated", "phone", clientA);
  await addAudit(firmA, clientB, "auth.login", "other-client", clientB);
  await addAudit(firmB, foreignClient, "auth.login", "other-firm", foreignClient);
  staffEvent = await addAudit(firmA, staffA, "auth.password_changed", "staff-detail", staffA);
  adminEvent = await addAudit(firmA, adminA, "auth.login", "admin-detail", adminA);
}, 120_000);

afterAll(async () => {
  if (sandbox) await sandbox.dispose(closeDatabase ?? (async () => undefined));
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalStorageRoot === undefined) delete process.env.STORAGE_ROOT;
  else process.env.STORAGE_ROOT = originalStorageRoot;
});

describe("Client self-audit API projection", () => {
  it("returns only this Client's safe activity, without raw technical fields", async () => {
    const { response, body } = await getOwn(principal(clientA, firmA, "client"));
    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    const byId = new Map(body.data.map((row) => [row.id, row]));
    expect(byId.get(internalEvent)).toMatchObject({ action: "Account activity" });
    expect(byId.get(knownEvent)).toMatchObject({ action: "Profile updated" });
    for (const event of body.data) {
      expect(Object.keys(event).sort()).toEqual(["action", "createdAt", "id"]);
    }
    const serialized = JSON.stringify(body);
    for (const secret of [
      internalIntentId,
      internalJobId,
      "internal-request-id",
      "192.0.2.10",
      "document.malware_scan",
      "other-client",
      "other-firm",
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("keeps Staff and Admin own-audit responses unchanged", async () => {
    for (const [userId, role, eventId, detail] of [
      [staffA, "associate", staffEvent, "staff-detail"],
      [adminA, "admin", adminEvent, "admin-detail"],
    ] as const) {
      const { response, body } = await getOwn(principal(userId, firmA, role));
      expect(response.status).toBe(200);
      const row = body.data.find((event) => event.id === eventId);
      expect(row).toMatchObject({
        userId,
        details: detail,
        resourceId: userId,
        requestId: "internal-request-id",
        ipAddress: "192.0.2.10",
      });
    }
  });

  it("preserves full stored evidence for the privileged audit API", async () => {
    vi.mocked(requireSession).mockResolvedValue(principal(adminA, firmA, "admin"));
    const response = await privilegedRoute.GET(
      new Request(`http://localhost/api/v1/audit-events?userId=${clientA}&limit=100`),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: Array<Record<string, unknown>> };
    const row = body.data.find((event) => event.id === internalEvent);
    expect(row).toMatchObject({
      userId: clientA,
      resourceId: internalJobId,
      details: `type=document.malware_scan; uploadIntent=${internalIntentId}`,
      requestId: "internal-request-id",
      ipAddress: "192.0.2.10",
    });
    const [stored] = await database.select().from(auditLog).where(eq(auditLog.id, internalEvent));
    expect(stored.details).toBe(row?.details);
  });

  it("continues to deny Client access to the privileged audit API", async () => {
    vi.mocked(requireSession).mockResolvedValue(principal(clientA, firmA, "client"));
    const response = await privilegedRoute.GET(new Request("http://localhost/api/v1/audit-events"));
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
