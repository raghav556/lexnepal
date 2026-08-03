import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { authUsers, users } from "../../src/server/db/schema";
import { provisionLocalIdentity } from "../../src/server/auth/local-auth";

const database = getDatabase();
let provisioned = 0;
let skipped = 0;
try {
  const candidates = await database
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(isNull(users.deletedAt), isNotNull(users.email)));
  for (const candidate of candidates) {
    const [existing] = await database
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.lexnepalUserId, candidate.id))
      .limit(1);
    if (existing) {
      skipped += 1;
      continue;
    }
    await provisionLocalIdentity({
      lexnepalUserId: candidate.id,
      name: candidate.name ?? candidate.email!,
      email: candidate.email!,
    });
    provisioned += 1;
  }
  process.stdout.write(
    `${JSON.stringify({ candidates: candidates.length, provisioned, skipped })}\n`,
  );
} finally {
  await closeDatabase();
}
