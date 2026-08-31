import "server-only";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { authUsers, users } from "@/server/db/schema";
import { getJobRepository } from "@/server/jobs/runtime";

export async function enqueueIdentityEmail(input: {
  authUserId: string;
  email: string;
  name: string;
  purpose: "verify" | "password-reset";
  url: string;
}): Promise<void> {
  const [linked] = await getDatabase()
    .select({ firmId: users.firmId, actorUserId: users.id })
    .from(authUsers)
    .innerJoin(users, eq(users.id, authUsers.lexnepalUserId))
    .where(eq(authUsers.id, input.authUserId))
    .limit(1);
  if (!linked) throw new Error("Identity email user is not linked to LexNepal");
  const digest = createHash("sha256").update(input.url).digest("hex");
  // Invite provision uses Better Auth password-reset with redirectTo=/setup-account.
  const isInviteSetup = input.url.includes("/setup-account");
  const purposeKey = isInviteSetup ? "invite" : input.purpose;
  await getJobRepository().enqueue({
    firmId: linked.firmId,
    actorUserId: linked.actorUserId,
    type: "communication.email",
    idempotencyKey: `identity:${purposeKey}:${digest}`,
    payload: {
      to: input.email,
      subject:
        purposeKey === "invite"
          ? "Activate your Srimar Law account"
          : purposeKey === "verify"
            ? "Verify your Srimar Law email"
            : "Reset your Srimar Law password",
      text:
        purposeKey === "invite"
          ? `${input.name},\n\nYou have been invited to Srimar Law. Set your password to activate your account:\n${input.url}\n\nIf you did not expect this invitation, contact your firm administrator.`
          : `${input.name},\n\n${purposeKey === "verify" ? "Verify your email" : "Reset your password"}:\n${input.url}\n\nIf you did not request this, contact your firm administrator.`,
    },
    maxAttempts: 5,
    timeoutSeconds: 60,
  });
}
