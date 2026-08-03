import { eq } from "drizzle-orm";
import { buildAuditContext } from "../../src/server/audit/context";
import type { AuthPrincipal } from "../../src/server/auth/types";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { users } from "../../src/server/db/schema";
import { createJobWorker } from "../../src/server/jobs/runtime";
import { getAvatarService } from "../../src/server/services/avatar-service";

const database = getDatabase();
try {
  const [user] = await database
    .select()
    .from(users)
    .where(eq(users.email, "phase6-a@example.invalid"))
    .limit(1);
  if (!user) throw new Error("Local avatar verification user is missing");
  const principal: AuthPrincipal = {
    user: {
      id: user.id,
      firmId: user.firmId,
      tokenIdentifier: user.tokenIdentifier,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isPending: user.isPending,
      avatar: null,
      phone: user.phone,
    },
    firmId: user.firmId,
    capabilities: new Set(["users.manage", "users.view_directory"]),
    sessionId: "avatar-verification",
    authenticationMethod: "session_cookie",
  };
  const request = new Request("http://localhost/api/v1/users/me/avatar-upload-intents", {
    headers: { "x-real-ip": "127.0.0.1" },
  });
  const bytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
  ]);
  const intent = await getAvatarService().createIntent(
    principal,
    { fileName: "avatar.png", mimeType: "image/png", sizeBytes: bytes.length },
    buildAuditContext(request, "avatar-verification", principal),
  );
  const form = new FormData();
  for (const [key, value] of Object.entries(intent.upload.fields)) form.append(key, value);
  form.append("file", new Blob([bytes], { type: "image/png" }), "avatar.png");
  const upload = await fetch(intent.upload.url, { method: "POST", body: form });
  if (!upload.ok) throw new Error(`Avatar upload failed with ${upload.status}`);
  await getAvatarService().completeIntent(
    principal,
    intent.intentId,
    buildAuditContext(request, "avatar-verification-complete", principal),
  );
  const result = await createJobWorker("avatar-verification").runOnce();
  if (result !== "completed") throw new Error(`Avatar scan worker returned ${result}`);
  const [updated] = await database
    .select({ avatar: users.avatar })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!updated?.avatar?.startsWith(`protected/${user.firmId}/avatars/${user.id}/`))
    throw new Error("Avatar was not promoted to protected storage");
  process.stdout.write(
    `${JSON.stringify({ upload: true, scan: true, promoted: true, protectedKey: updated.avatar })}\n`,
  );
} finally {
  await closeDatabase();
}
