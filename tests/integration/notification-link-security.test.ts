import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { firms, notifications, users } from "../../db/schema";
import { createSigningTestDatabase } from "../support/signing-test-database";
import type { AuthPrincipal, UserRole } from "../../src/server/auth/types";

type Runtime = {
  db: ReturnType<typeof import("../../src/server/db/client").getDatabase>;
  close: typeof import("../../src/server/db/client").closeDatabase;
  service: import("../../src/server/services/communication-service").CommunicationService;
  migrate: typeof import("../../src/server/services/communication-migration").migrateCommunicationExport;
};

let runtime: Runtime;
let sandbox: Awaited<ReturnType<typeof createSigningTestDatabase>>;
let firmA: string;
let firmB: string;
let clientA: string;
let clientB: string;
let foreignClient: string;
let staffA: string;
let adminA: string;
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalStorageRoot = process.env.STORAGE_ROOT;

function principal(userId: string, firmId: string, role: UserRole): AuthPrincipal {
  return {
    user: {
      id: userId,
      firmId,
      tokenIdentifier: `notification-security|${userId}`,
      name: "Notification test user",
      email: `${userId}@example.invalid`,
      role,
      isActive: true,
      isPending: false,
      avatar: null,
      phone: null,
    },
    firmId,
    capabilities: new Set(),
    sessionId: `test-${userId}`,
    authenticationMethod: "session_cookie",
  };
}

async function addFirm() {
  const id = randomUUID();
  await runtime.db
    .insert(firms)
    .values({ id, name: `Notification test ${id}`, slug: `notification-${id}` });
  return id;
}

async function addUser(firmId: string, role: UserRole, legacyConvexId: string) {
  const id = randomUUID();
  await runtime.db.insert(users).values({
    id,
    firmId,
    legacyConvexId,
    tokenIdentifier: `notification-security|${id}`,
    name: `Notification ${role}`,
    email: `${id}@example.invalid`,
    role,
  });
  return id;
}

async function addNotification(firmId: string, userId: string, link: string | null) {
  const id = randomUUID();
  await runtime.db.insert(notifications).values({
    id,
    firmId,
    userId,
    title: `Notification ${id}`,
    body: "Controlled security test",
    type: "system",
    link,
    isRead: false,
  });
  return id;
}

beforeAll(async () => {
  sandbox = await createSigningTestDatabase();
  const [dbModule, serviceModule, migrationModule] = await Promise.all([
    import("../../src/server/db/client"),
    import("../../src/server/services/communication-service"),
    import("../../src/server/services/communication-migration"),
  ]);
  runtime = {
    db: dbModule.getDatabase(),
    close: dbModule.closeDatabase,
    service: new serviceModule.CommunicationService(),
    migrate: migrationModule.migrateCommunicationExport,
  };
  firmA = await addFirm();
  firmB = await addFirm();
  clientA = await addUser(firmA, "client", "legacy-notification-client-a");
  clientB = await addUser(firmA, "client", "legacy-notification-client-b");
  foreignClient = await addUser(firmB, "client", "legacy-notification-foreign-client");
  staffA = await addUser(firmA, "associate", "legacy-notification-staff-a");
  adminA = await addUser(firmA, "admin", "legacy-notification-admin-a");
}, 120_000);

afterAll(async () => {
  if (sandbox) await sandbox.dispose(runtime?.close ?? (async () => undefined));
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalStorageRoot === undefined) delete process.env.STORAGE_ROOT;
  else process.env.STORAGE_ROOT = originalStorageRoot;
});

describe("notification link and authorization boundaries", () => {
  it("migrates notification content but nulls unsafe and cross-role legacy links", async () => {
    const exportPath = await mkdtemp(path.join(tmpdir(), "lexnepal-notification-import-"));
    const records = [
      {
        _id: "safe-client",
        userId: "legacy-notification-client-a",
        link: "/client/messages?caseId=123",
      },
      {
        _id: "external-client",
        userId: "legacy-notification-client-a",
        link: "https://evil.example",
      },
      { _id: "cross-role-client", userId: "legacy-notification-client-a", link: "/staff/messages" },
      { _id: "safe-staff", userId: "legacy-notification-staff-a", link: "/staff/cases/123" },
      { _id: "safe-admin", userId: "legacy-notification-admin-a", link: "/admin/users" },
    ].map((row) => ({
      ...row,
      firmId: "legacy-notification-firm-a",
      title: `Imported ${row._id}`,
      body: `Body ${row._id}`,
      type: "system",
      isRead: false,
    }));
    try {
      await writeFile(
        path.join(exportPath, "notifications.jsonl"),
        records.map((row) => JSON.stringify(row)).join("\n"),
      );
      const report = await runtime.migrate({
        exportPath,
        firmMap: { "legacy-notification-firm-a": firmA },
      });
      expect(report.reconciliation.passed).toBe(true);
      expect(report.migrated.notifications).toBe(records.length);
      const rows = await runtime.db.select().from(notifications);
      const imported = new Map(
        rows.filter((row) => row.legacyConvexId).map((row) => [row.legacyConvexId, row]),
      );
      expect(imported.get("safe-client")?.link).toBe("/client/messages?caseId=123");
      expect(imported.get("safe-staff")?.link).toBe("/staff/cases/123");
      expect(imported.get("safe-admin")?.link).toBe("/admin/users");
      expect(imported.get("external-client")?.link).toBeNull();
      expect(imported.get("cross-role-client")?.link).toBeNull();
      expect(imported.get("external-client")?.title).toBe("Imported external-client");
      expect(imported.get("cross-role-client")?.body).toBe("Body cross-role-client");
    } finally {
      await rm(exportPath, { recursive: true, force: true });
    }
  });

  it("sanitizes existing unsafe rows in service responses without changing storage", async () => {
    const unsafe = await addNotification(firmA, clientA, "https://evil.example");
    const crossRole = await addNotification(firmA, clientA, "/admin/users");
    const safe = await addNotification(firmA, clientA, "/client/signatures?x=1");
    const foreign = await addNotification(firmA, clientB, "/client/messages");
    const otherFirm = await addNotification(firmB, foreignClient, "/client/messages");
    const rows = await runtime.service.listNotifications(principal(clientA, firmA, "client"));
    const byId = new Map(rows.map((row) => [row._id, row]));
    expect(byId.get(unsafe)?.link).toBeNull();
    expect(byId.get(crossRole)?.link).toBeNull();
    expect(byId.get(safe)?.link).toBe("/client/signatures?x=1");
    expect(byId.has(foreign)).toBe(false);
    expect(byId.has(otherFirm)).toBe(false);
    const [stored] = await runtime.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, unsafe));
    expect(stored.link).toBe("https://evil.example");
    const markedUnsafe = await runtime.service.markNotificationRead(
      principal(clientA, firmA, "client"),
      unsafe,
    );
    expect(markedUnsafe.link).toBeNull();
    const staffRows = await runtime.service.listNotifications(
      principal(staffA, firmA, "associate"),
    );
    expect(staffRows.some((row) => row.link === "/staff/cases/123")).toBe(true);
    const adminRows = await runtime.service.listNotifications(principal(adminA, firmA, "admin"));
    expect(adminRows.some((row) => row.link === "/admin/users")).toBe(true);
  });

  it("denies foreign mark-one and limits mark-all to current firm and user", async () => {
    const own = await addNotification(firmA, clientA, "/client/messages");
    const otherUser = await addNotification(firmA, clientB, "/client/messages");
    const otherFirm = await addNotification(firmB, foreignClient, "/client/messages");
    const actor = principal(clientA, firmA, "client");
    await expect(runtime.service.markNotificationRead(actor, otherUser)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(runtime.service.markNotificationRead(actor, otherFirm)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await runtime.service.markNotificationRead(actor, own);
    const [marked] = await runtime.db.select().from(notifications).where(eq(notifications.id, own));
    expect(marked.isRead).toBe(true);
    const ownSecond = await addNotification(firmA, clientA, null);
    await runtime.service.markAllNotificationsRead(actor);
    const [ownSecondRow] = await runtime.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, ownSecond));
    const [otherUserRow] = await runtime.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, otherUser));
    const [otherFirmRow] = await runtime.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, otherFirm));
    expect(ownSecondRow.isRead).toBe(true);
    expect(otherUserRow.isRead).toBe(false);
    expect(otherFirmRow.isRead).toBe(false);
  });
});
