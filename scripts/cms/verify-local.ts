import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import { firmSettings, practiceAreas, users } from "../../db/schema";
import { GET as publicCollectionGet } from "../../src/app/api/v1/public/cms/[collection]/route";
import { GET as adminCollectionGet } from "../../src/app/api/v1/cms/[collection]/route";
import { PATCH as adminItemPatch } from "../../src/app/api/v1/cms/[collection]/[id]/route";
import { PUT as settingsPut } from "../../src/app/api/v1/cms/settings/route";
import { POST as newsletterPost } from "../../src/app/api/v1/public/cms/newsletter/route";

const database = getDatabase();
const firmA = "61000000-0000-4000-8000-000000000001";
const firmB = "61000000-0000-4000-8000-000000000002";
try {
  await database
    .insert(firmSettings)
    .values({
      firmId: firmA,
      key: "rolePermissions",
      value: { associate: ["users.manage", "users.view_directory", "cms.manage"] },
    })
    .onConflictDoUpdate({
      target: [firmSettings.firmId, firmSettings.key],
      set: {
        value: { associate: ["users.manage", "users.view_directory", "cms.manage"] },
        updatedAt: new Date(),
      },
    });
  const signIn = await getLocalAuth().api.signInEmail({
    body: { email: "boundary-a@example.invalid", password: "Local-boundary-only-2026!" },
    asResponse: true,
  });
  if (!signIn.ok) throw new Error("Run npm run auth:verify-boundary before CMS verification");
  const cookie = signIn.headers.get("set-cookie");
  if (!cookie) throw new Error("CMS verification session was not issued");
  const publicPosts = await publicCollectionGet(
    new Request("http://local/api/v1/public/cms/blog-posts"),
    { params: Promise.resolve({ collection: "blog-posts" }) },
  );
  const publicBody = (await publicPosts.json()) as { data: Array<{ status: string }> };
  const anonymousAdmin = await adminCollectionGet(
    new Request("http://local/api/v1/cms/blog-posts"),
    { params: Promise.resolve({ collection: "blog-posts" }) },
  );
  const adminPosts = await adminCollectionGet(
    new Request("http://local/api/v1/cms/blog-posts", { headers: { cookie } }),
    { params: Promise.resolve({ collection: "blog-posts" }) },
  );
  const adminBody = (await adminPosts.json()) as { data: Array<{ status: string }> };
  const [foreign] = await database
    .insert(practiceAreas)
    .values({
      firmId: firmB,
      legacyConvexId: "cms-cross-firm-verification",
      title: "Foreign",
      description: "Foreign firm item",
      icon: "Scale",
      slug: "foreign-verification",
      isActive: true,
    })
    .onConflictDoUpdate({ target: practiceAreas.legacyConvexId, set: { updatedAt: new Date() } })
    .returning({ id: practiceAreas.id });
  const crossFirm = await adminItemPatch(
    new Request("http://local/api/v1/cms/practice-areas/x", {
      method: "PATCH",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        title: "Attack",
        description: "Cross-firm update",
        icon: "Scale",
        slug: "attack",
        isActive: true,
      }),
    }),
    { params: Promise.resolve({ collection: "practice-areas", id: foreign.id }) },
  );
  const unsafeSetting = await settingsPut(
    new Request("http://local/api/v1/cms/settings", {
      method: "PUT",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        settings: [{ key: "liveChatWidgetScript", value: "<script>alert(1)</script>" }],
      }),
    }),
  );
  const email = "cms-local-verification@example.invalid";
  const subscribe1 = await newsletterPost(
    new Request("http://local/api/v1/public/cms/newsletter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    }),
  );
  const subscribe2 = await newsletterPost(
    new Request("http://local/api/v1/public/cms/newsletter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    }),
  );
  const secondBody = (await subscribe2.json()) as { data: { alreadySubscribed: boolean } };
  if (
    publicPosts.status !== 200 ||
    publicBody.data.some((post) => post.status !== "published") ||
    !publicBody.data.length
  )
    throw new Error("Public draft isolation failed");
  if (
    anonymousAdmin.status !== 401 ||
    adminPosts.status !== 200 ||
    !adminBody.data.some((post) => post.status === "draft")
  )
    throw new Error("CMS management authorization parity failed");
  if (
    crossFirm.status !== 404 ||
    unsafeSetting.status !== 400 ||
    subscribe1.status !== 201 ||
    !secondBody.data.alreadySubscribed
  )
    throw new Error("CMS security or newsletter idempotency failed");
  const [actor] = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "boundary-a@example.invalid"))
    .limit(1);
  process.stdout.write(
    `${JSON.stringify({ passed: true, publicPublishedOnly: true, anonymousAdmin: 401, crossFirmWrite: 404, unsafeSetting: 400, newsletterIdempotent: true, actor: actor.id })}\n`,
  );
} finally {
  await closeDatabase();
}
