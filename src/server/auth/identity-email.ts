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
  await getJobRepository().enqueue({
    firmId: linked.firmId,
    actorUserId: linked.actorUserId,
    type: "communication.email",
    idempotencyKey: `identity:${input.purpose}:${digest}`,
    payload: {
      to: input.email,
      subject:
        input.purpose === "verify"
          ? "Activate your LexNepal account"
          : "Reset your LexNepal password",
      text: `${input.name},\n\n${input.purpose === "verify" ? "Activate your account" : "Reset your password"}:\n${input.url}\n\nIf you did not request this, contact your firm administrator.`,
    },
    maxAttempts: 5,
    timeoutSeconds: 60,
  });
}
