import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import { createDisposableMysql } from "../support/disposable-mysql";
import type { AuthPrincipal, UserRole } from "../../src/server/auth/types";
import { resolveCapabilities } from "../../src/server/auth/capabilities";
import { AppError } from "../../src/shared/errors/api-error";

const state = vi.hoisted(() => ({
  database: undefined as unknown as MySql2Database<typeof schema>,
  actor: undefined as AuthPrincipal | undefined,
  authSession: undefined as unknown,
}));
// Authentication identity is supplied; handlers, services, authorization and SQL are real.
vi.mock("@/server/db/client", () => ({
  getDatabase: () => {
    if (!state.database) throw Error("Restricted fixture not ready");
    return state.database;
  },
}));
vi.mock("@/server/auth/runtime", () => ({
  requireSession: async () => {
    if (!state.actor) throw new AppError("UNAUTHENTICATED", "Fixture session expired", 401);
    return state.actor;
  },
}));
vi.mock("@/server/auth/local-auth", () => ({
  getLocalAuth: () => ({ api: { getSession: async () => state.authSession } }),
}));
let fixture: Awaited<ReturnType<typeof createDisposableMysql>> | undefined;
let routes: {
  doc: typeof import("../../src/app/api/v1/documents/[id]/route");
  share: typeof import("../../src/app/api/v1/documents/[id]/share/route");
  publicShare: typeof import("../../src/app/api/v1/public/document-shares/[token]/route");
  user: typeof import("../../src/app/api/v1/users/[userId]/route");
  mfa: typeof import("../../src/app/api/v1/users/[userId]/mfa/route");
  payroll: typeof import("../../src/app/api/v1/hr/payroll/runs/[id]/finalize/route");
};
const firmA = randomUUID(),
  firmB = randomUUID(),
  adminA = randomUUID(),
  adminB = randomUUID(),
  staffA = randomUUID(),
  clientA = randomUUID();
function actor(id = adminA, firmId = firmA, role: UserRole = "admin"): AuthPrincipal {
  return {
    firmId,
    sessionId: "fixture",
    authenticationMethod: "session_cookie",
    capabilities: resolveCapabilities(role, undefined),
    user: {
      id,
      firmId,
      tokenIdentifier: "isolated|" + id,
      name: "Synthetic actor",
      email: id + "@example.invalid",
      role,
      isActive: true,
      isPending: false,
      avatar: null,
      phone: null,
    },
  };
}
function req(path: string, method = "GET", body?: unknown) {
  return new Request("http://localhost" + path, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });
}
function context(userId: string) {
  return { params: Promise.resolve({ userId }) };
}
async function doc(options: Partial<typeof schema.documents.$inferInsert> = {}) {
  const id = randomUUID();
  await state.database.insert(schema.documents).values({
    id,
    firmId: firmA,
    documentNumber: id,
    title: "Synthetic safety fixture",
    type: "other",
    storageId: `protected/${firmA}/${id}/fixture.pdf`,
    mimeType: "application/pdf",
    sizeBytes: 8,
    uploadedBy: adminA,
    uploadStatus: "clean",
    confidentialityLevel: "internal",
    ...options,
  });
  return id;
}
async function row(id: string) {
  return (
    await state.database.select().from(schema.documents).where(eq(schema.documents.id, id))
  )[0];
}
beforeAll(async () => {
  fixture = await createDisposableMysql();
  await promisify(execFile)(process.execPath, ["scripts/db/migrate.mjs"], {
    env: { ...process.env, DATABASE_URL: fixture.url },
    timeout: 600000,
  });
  state.database = drizzle(fixture.pool, { schema, mode: "default" });
  for (const id of [firmA, firmB])
    await state.database
      .insert(schema.firms)
      .values({ id, name: "Disposable firm", slug: "fixture-" + id });
  for (const [id, firmId, role] of [
    [adminA, firmA, "admin"],
    [adminB, firmB, "admin"],
    [staffA, firmA, "associate"],
    [clientA, firmA, "client"],
  ] as const)
    await state.database.insert(schema.users).values({
      id,
      firmId,
      role,
      tokenIdentifier: "fixture|" + id,
      email: id + "@example.invalid",
      twoFactorEnabled: id === staffA,
      totpSecret: id === staffA ? "fixture-secret" : null,
    });
  await state.database.insert(schema.authUsers).values({
    id: "auth-" + staffA,
    lexnepalUserId: staffA,
    name: "Synthetic MFA target",
    email: staffA + "@example.invalid",
    twoFactorEnabled: true,
  });
  await state.database.insert(schema.authTwoFactors).values({
    id: randomUUID(),
    userId: "auth-" + staffA,
    secret: "synthetic-active-secret",
    backupCodes: "[synthetic]",
    verified: true,
  });
  await state.database.insert(schema.authSessions).values({
    id: randomUUID(),
    userId: "auth-" + staffA,
    token: randomUUID(),
    expiresAt: new Date("2030-01-01T00:00:00Z"),
  });
  routes = {
    doc: await import("../../src/app/api/v1/documents/[id]/route"),
    share: await import("../../src/app/api/v1/documents/[id]/share/route"),
    publicShare: await import("../../src/app/api/v1/public/document-shares/[token]/route"),
    user: await import("../../src/app/api/v1/users/[userId]/route"),
    mfa: await import("../../src/app/api/v1/users/[userId]/mfa/route"),
    payroll: await import("../../src/app/api/v1/hr/payroll/runs/[id]/finalize/route"),
  };
}, 660000);
afterAll(async () => {
  state.actor = undefined;
  await fixture?.dispose();
}, 120000);

describe("real authenticated mutation routes on restricted disposable SQL", () => {
  it.each(["read", "edit", "delete", "share"] as const)(
    "foreign firm cannot %s a document or alter its original row",
    async (action) => {
      const id = await doc();
      state.actor = actor(adminB, firmB);
      const before = await row(id);
      const r =
        action === "read"
          ? await routes.doc.GET(req("/api/v1/documents/" + id))
          : action === "edit"
            ? await routes.doc.PATCH(
                req("/api/v1/documents/" + id, "PATCH", { title: "Foreign overwrite" }),
              )
            : action === "delete"
              ? await routes.doc.DELETE(req("/api/v1/documents/" + id, "DELETE"))
              : await routes.share.POST(req("/api/v1/documents/" + id + "/share", "POST", {}));
      expect(r.status).toBe(404);
      expect(await row(id)).toEqual(before);
    },
  );
  it.each(["edit", "delete", "share"] as const)(
    "Client cannot %s an internal document",
    async (action) => {
      const id = await doc();
      state.actor = actor(clientA, firmA, "client");
      const r =
        action === "edit"
          ? await routes.doc.PATCH(req("/api/v1/documents/" + id, "PATCH", { title: "Overwrite" }))
          : action === "delete"
            ? await routes.doc.DELETE(req("/api/v1/documents/" + id, "DELETE"))
            : await routes.share.POST(req("/api/v1/documents/" + id + "/share", "POST", {}));
      expect(r.status).toBe(403);
      expect((await row(id)).title).toBe("Synthetic safety fixture");
    },
  );
  it("preserves returned retention instant while accepting policy-only edits", async () => {
    const instant = new Date("2027-01-15T18:15:00.000Z");
    const id = await doc({ retentionUntil: instant });
    state.actor = actor();
    const r = await routes.doc.PATCH(
      req("/api/v1/documents/" + id, "PATCH", {
        retentionPolicy: "Synthetic seven-year policy",
        retentionUntil: "2099-01-01T00:00:00.000Z",
      }),
    );
    expect(r.status).toBe(200);
    expect((await row(id)).retentionUntil).toEqual(instant);
    expect((await row(id)).retentionPolicy).toBe("Synthetic seven-year policy");
  });
  it("legal hold blocks permanent deletion and public sharing until explicit authorized release", async () => {
    const id = await doc();
    state.actor = actor();
    expect(
      (
        await routes.doc.PATCH(
          req("/api/v1/documents/" + id, "PATCH", {
            isOnLegalHold: true,
            legalHoldReason: "Synthetic preservation",
          }),
        )
      ).status,
    ).toBe(200);
    expect((await row(id)).legalHoldSetBy).toBe(adminA);
    expect((await routes.doc.DELETE(req("/api/v1/documents/" + id, "DELETE"))).status).toBe(409);
    expect(
      (await routes.share.POST(req("/api/v1/documents/" + id + "/share", "POST", {}))).status,
    ).toBe(403);
    expect(
      (await routes.doc.PATCH(req("/api/v1/documents/" + id, "PATCH", { isOnLegalHold: false })))
        .status,
    ).toBe(200);
    expect((await row(id)).isOnLegalHold).toBe(false);
    expect((await routes.doc.DELETE(req("/api/v1/documents/" + id, "DELETE"))).status).toBe(200);
    expect(await row(id)).toBeUndefined();
  });
  it("share password, download policy, revocation and document association are enforced by real routes", async () => {
    const id = await doc(),
      other = await doc();
    state.actor = actor();
    const r = await routes.share.POST(
      req("/api/v1/documents/" + id + "/share", "POST", {
        password: "synthetic-password-123",
        allowDownload: false,
        maxDownloads: 2,
      }),
    );
    expect(r.status).toBe(201);
    const { data } = await r.json();
    const stored = (
      await state.database
        .select()
        .from(schema.documentShares)
        .where(eq(schema.documentShares.id, data.id))
    )[0];
    expect(stored.passwordHash).not.toBe("synthetic-password-123");
    expect(stored.passwordHash).toBeTruthy();
    expect(stored.allowDownload).toBe(false);
    expect(stored.maxDownloads).toBe(2);
    const locked = await routes.publicShare.POST(
      req("/api/v1/public/document-shares/" + data.token, "POST", { password: "wrong" }),
    );
    expect((await locked.json()).data.isPasswordRequired).toBe(true);
    const publicResponse = await routes.publicShare.POST(
      req("/api/v1/public/document-shares/" + data.token, "POST", {
        password: "synthetic-password-123",
      }),
    );
    expect(publicResponse.status).toBe(200);
    expect((await publicResponse.json()).data.allowDownload).toBe(false);
    const wrongDoc = await routes.share.DELETE(
      req("/api/v1/documents/" + other + "/share?shareId=" + data.id, "DELETE"),
    );
    expect(wrongDoc.status).toBe(404);
    expect(
      (
        await routes.share.DELETE(
          req("/api/v1/documents/" + id + "/share?shareId=" + data.id, "DELETE"),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await routes.publicShare.POST(
          req("/api/v1/public/document-shares/" + data.token, "POST", {}),
        )
      ).status,
    ).toBe(404);
  });
  it("privileged document refuses an external share even for Admin", async () => {
    const id = await doc({ isPrivileged: true });
    state.actor = actor();
    expect(
      (await routes.share.POST(req("/api/v1/documents/" + id + "/share", "POST", {}))).status,
    ).toBe(403);
  });
  it("expired session and invalid UUID fail before document mutation", async () => {
    const id = await doc();
    state.actor = undefined;
    expect(
      (await routes.doc.PATCH(req("/api/v1/documents/" + id, "PATCH", { title: "No session" })))
        .status,
    ).toBe(401);
    state.actor = actor();
    expect(
      (
        await routes.doc.PATCH(
          req("/api/v1/documents/not-a-uuid", "PATCH", { title: "Bad identifier" }),
        )
      ).status,
    ).toBe(400);
    expect((await row(id)).title).toBe("Synthetic safety fixture");
  });
  it("authorized role change is audited while foreign-firm and Client role changes are denied", async () => {
    state.actor = actor();
    expect(
      (
        await routes.user.PATCH(
          req("/api/v1/users/" + staffA, "PATCH", { role: "senior_associate" }),
          context(staffA),
        )
      ).status,
    ).toBe(200);
    expect(
      (await state.database.select().from(schema.users).where(eq(schema.users.id, staffA)))[0].role,
    ).toBe("senior_associate");
    const audits = await state.database
      .select()
      .from(schema.auditLog)
      .where(eq(schema.auditLog.resourceId, staffA));
    expect(
      audits.some((a) => a.userId === adminA && a.firmId === firmA && a.action === "users.updated"),
    ).toBe(true);
    expect(
      (
        await routes.user.PATCH(
          req("/api/v1/users/" + adminB, "PATCH", { role: "client" }),
          context(adminB),
        )
      ).status,
    ).toBe(404);
    state.actor = actor(clientA, firmA, "client");
    expect(
      (
        await routes.user.PATCH(
          req("/api/v1/users/" + staffA, "PATCH", { role: "admin" }),
          context(staffA),
        )
      ).status,
    ).toBe(403);
  });
  it("self-suspension/archive/MFA reset and cross-firm reset are denied; target MFA reset clears secrets", async () => {
    state.actor = actor();
    expect(
      (
        await routes.user.PATCH(
          req("/api/v1/users/" + adminA, "PATCH", { isActive: false }),
          context(adminA),
        )
      ).status,
    ).toBe(409);
    expect(
      (await routes.user.DELETE(req("/api/v1/users/" + adminA, "DELETE"), context(adminA))).status,
    ).toBe(409);
    expect(
      (await routes.mfa.DELETE(req("/api/v1/users/" + adminA + "/mfa", "DELETE"), context(adminA)))
        .status,
    ).toBe(409);
    expect(
      (await routes.mfa.DELETE(req("/api/v1/users/" + adminB + "/mfa", "DELETE"), context(adminB)))
        .status,
    ).toBe(404);
    expect(
      (await routes.mfa.DELETE(req("/api/v1/users/" + staffA + "/mfa", "DELETE"), context(staffA)))
        .status,
    ).toBe(204);
    const target = (
      await state.database.select().from(schema.users).where(eq(schema.users.id, staffA))
    )[0];
    expect(target.twoFactorEnabled).toBe(false);
    expect(target.totpSecret).toBeNull();
    expect(
      await state.database
        .select()
        .from(schema.authTwoFactors)
        .where(eq(schema.authTwoFactors.userId, "auth-" + staffA)),
    ).toHaveLength(0);
    expect(
      await state.database
        .select()
        .from(schema.authSessions)
        .where(eq(schema.authSessions.userId, "auth-" + staffA)),
    ).toHaveLength(0);
    expect(
      (
        await state.database
          .select()
          .from(schema.authUsers)
          .where(eq(schema.authUsers.id, "auth-" + staffA))
      )[0].twoFactorEnabled,
    ).toBe(false);
  });
  it("payroll finalization enforces firm/capability, persists audit and rejects repeat finalization", async () => {
    const id = randomUUID();
    await state.database.insert(schema.payrollRuns).values({
      id,
      firmId: firmA,
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
      generatedBy: adminA,
    });
    const request = () => req("/api/v1/hr/payroll/runs/" + id + "/finalize", "POST");
    state.actor = actor(adminB, firmB);
    expect((await routes.payroll.POST(request())).status).toBe(404);
    state.actor = actor(clientA, firmA, "client");
    expect((await routes.payroll.POST(request())).status).toBe(403);
    state.actor = actor();
    expect((await routes.payroll.POST(request())).status).toBe(200);
    const run = (
      await state.database.select().from(schema.payrollRuns).where(eq(schema.payrollRuns.id, id))
    )[0];
    expect(run.status).toBe("finalized");
    expect(run.finalizedBy).toBe(adminA);
    expect((await routes.payroll.POST(request())).status).toBe(400);
    const audits = await state.database
      .select()
      .from(schema.auditLog)
      .where(eq(schema.auditLog.resourceId, id));
    expect(audits.filter((a) => a.action === "hr.payroll_run_finalized")).toHaveLength(1);
  });

  it.each(["admin", "partner"] as const)(
    "promotion to %s preserves mandatory MFA in persisted identity",
    async (role) => {
      const id = randomUUID();
      await state.database.insert(schema.users).values({
        id,
        firmId: firmA,
        role: "associate",
        email: id + "@example.invalid",
        tokenIdentifier: "promote|" + id,
        twoFactorRequired: false,
      });
      state.actor = actor();
      expect(
        (await routes.user.PATCH(req("/api/v1/users/" + id, "PATCH", { role }), context(id)))
          .status,
      ).toBe(200);
      const promoted = (
        await state.database.select().from(schema.users).where(eq(schema.users.id, id))
      )[0];
      expect(promoted.role).toBe(role);
      expect(promoted.twoFactorRequired).toBe(true);
    },
  );
  it.each(["admin", "partner"] as const)(
    "historical %s identity with a missing required flag cannot bypass session MFA enrollment",
    async (role) => {
      const id = randomUUID();
      await state.database.insert(schema.users).values({
        id,
        firmId: firmA,
        role,
        email: id + "@example.invalid",
        tokenIdentifier: "legacy-mfa|" + id,
        twoFactorRequired: false,
      });
      const { BetterAuthSessionService } =
        await import("../../src/server/auth/better-auth-session-service");
      state.authSession = {
        user: { lexnepalUserId: id, twoFactorEnabled: false },
        session: { id: "synthetic-legacy-session" },
      };
      await expect(
        new BetterAuthSessionService().requireSession(req("/api/v1/users")),
      ).rejects.toMatchObject({ status: 403, details: { reason: "MFA_ENROLLMENT_REQUIRED" } });
    },
  );
  it("enrolled Admin and ordinary unenrolled Client retain their actual role-scoped access", async () => {
    const { BetterAuthSessionService } =
      await import("../../src/server/auth/better-auth-session-service");
    const service = new BetterAuthSessionService();
    state.authSession = {
      user: { lexnepalUserId: adminA, twoFactorEnabled: true },
      session: { id: "synthetic-enrolled-session" },
    };
    const admin = await service.requireSession(req("/api/v1/users"));
    expect(admin.capabilities.has("users.manage")).toBe(true);
    state.authSession = {
      user: { lexnepalUserId: clientA, twoFactorEnabled: false, role: "admin", firmId: firmB },
      session: { id: "synthetic-client-session" },
    };
    const client = await service.requireSession(req("/api/v1/documents"));
    expect(client.user.id).toBe(clientA);
    expect(client.capabilities.has("users.manage")).toBe(false);
  });

  it("role demotion cannot silently clear an existing stronger MFA policy", async () => {
    const id = randomUUID();
    await state.database.insert(schema.users).values({
      id,
      firmId: firmA,
      role: "partner",
      email: id + "@example.invalid",
      tokenIdentifier: "demotion-mfa|" + id,
      twoFactorRequired: true,
    });
    state.actor = actor();
    expect(
      (
        await routes.user.PATCH(
          req("/api/v1/users/" + id, "PATCH", { role: "associate" }),
          context(id),
        )
      ).status,
    ).toBe(200);
    expect(
      (await state.database.select().from(schema.users).where(eq(schema.users.id, id)))[0]
        .twoFactorRequired,
    ).toBe(true);
  });
});
