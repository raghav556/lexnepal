import { and, eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import { authUsers, firmSettings, users } from "../../db/schema";
import { GET as getUserRoute } from "../../src/app/api/v1/users/[userId]/route";

const database = getDatabase();
const password = "Local-boundary-only-2026!";
const fixtures = [
  {
    firmId: "61000000-0000-4000-8000-000000000001",
    email: "boundary-a@example.invalid",
    name: "Boundary A",
  },
  {
    firmId: "61000000-0000-4000-8000-000000000002",
    email: "boundary-b@example.invalid",
    name: "Boundary B",
  },
] as const;

try {
  const created = [];
  for (const fixture of fixtures) {
    const [lexUser] = await database
      .insert(users)
      .values({
        firmId: fixture.firmId,
        tokenIdentifier: `boundary:${fixture.email}`,
        email: fixture.email,
        name: fixture.name,
        role: "associate",
        isActive: true,
        isPending: false,
      })
      .onConflictDoUpdate({
        target: [users.firmId, users.email],
        set: { isActive: true, isPending: false, updatedAt: new Date() },
      })
      .returning({ id: users.id });
    const [existingAuthUser] = await database
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.lexnepalUserId, lexUser.id))
      .limit(1);
    if (existingAuthUser)
      await database.delete(authUsers).where(eq(authUsers.id, existingAuthUser.id));
    const result = await getLocalAuth().api.createUser({
      body: {
        name: fixture.name,
        email: fixture.email,
        password,
        role: "user",
        data: { lexnepalUserId: lexUser.id },
      },
    });
    const authUser = { id: result.user.id };
    await database
      .update(authUsers)
      .set({ emailVerified: true })
      .where(eq(authUsers.id, authUser.id));
    created.push({ ...fixture, userId: lexUser.id });
  }

  await database
    .insert(firmSettings)
    .values({
      firmId: created[0].firmId,
      key: "rolePermissions",
      value: { associate: ["users.manage", "users.view_directory"] },
    })
    .onConflictDoUpdate({
      target: [firmSettings.firmId, firmSettings.key],
      set: {
        value: { associate: ["users.manage", "users.view_directory"] },
        updatedAt: new Date(),
      },
    });

  const signIn = await getLocalAuth().api.signInEmail({
    body: { email: created[0].email, password },
    asResponse: true,
  });
  if (!signIn.ok) throw new Error(`Local sign-in failed with ${signIn.status}`);
  const cookie = signIn.headers.get("set-cookie");
  if (!cookie) throw new Error("Local sign-in did not issue a session cookie");
  const headers = { cookie };

  const anonymous = await getUserRoute(
    new Request(`http://localhost/api/v1/users/${created[0].userId}`),
    { params: Promise.resolve({ userId: created[0].userId }) },
  );
  const sameFirm = await getUserRoute(
    new Request(`http://localhost/api/v1/users/${created[0].userId}`, { headers }),
    { params: Promise.resolve({ userId: created[0].userId }) },
  );
  const crossFirm = await getUserRoute(
    new Request(`http://localhost/api/v1/users/${created[1].userId}`, { headers }),
    { params: Promise.resolve({ userId: created[1].userId }) },
  );
  if (anonymous.status !== 401 || sameFirm.status !== 200 || crossFirm.status !== 404)
    throw new Error(
      `Boundary mismatch anonymous=${anonymous.status} sameFirm=${sameFirm.status} crossFirm=${crossFirm.status}`,
    );
  const body = JSON.stringify(await sameFirm.json());
  for (const sensitive of ["passwordHash", "totpSecret", "activationToken", "tokenIdentifier"])
    if (body.includes(sensitive)) throw new Error(`Sensitive DTO field leaked: ${sensitive}`);

  await database
    .update(users)
    .set({ twoFactorRequired: true })
    .where(eq(users.id, created[0].userId));
  const mfaBlocked = await getUserRoute(
    new Request(`http://localhost/api/v1/users/${created[0].userId}`, { headers }),
    { params: Promise.resolve({ userId: created[0].userId }) },
  );
  const mfaBody = (await mfaBlocked.json()) as { error?: { details?: { reason?: string } } };
  await database
    .update(users)
    .set({ twoFactorRequired: false })
    .where(eq(users.id, created[0].userId));
  if (mfaBlocked.status !== 403 || mfaBody.error?.details?.reason !== "MFA_ENROLLMENT_REQUIRED")
    throw new Error("Privileged account was not blocked pending MFA enrollment");

  const [sessionOwner] = await database
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, created[0].userId), eq(users.firmId, created[0].firmId)));
  process.stdout.write(
    `${JSON.stringify({ passed: true, anonymous: 401, sameFirm: 200, crossFirm: 404, mfaEnrollmentRequired: 403, dtoSecretsExcluded: true, sessionOwner: sessionOwner.id })}\n`,
  );
} finally {
  await closeDatabase();
}
