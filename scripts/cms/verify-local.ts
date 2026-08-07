import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import { firmSettings, practiceAreas, users } from "../../db/schema";
import { GET as publicCollectionGet } from "../../src/app/api/v1/public/cms/[collection]/route";
import {
  GET as adminCollectionGet,
  POST as adminCollectionPost,
} from "../../src/app/api/v1/cms/[collection]/route";
import {
  PATCH as adminItemPatch,
  DELETE as adminItemDelete,
} from "../../src/app/api/v1/cms/[collection]/[id]/route";
import { PUT as settingsPut } from "../../src/app/api/v1/cms/settings/route";
import { GET as publicSettingsGet } from "../../src/app/api/v1/public/cms/settings/route";
import { GET as adminLegalGet } from "../../src/app/api/v1/cms/legal-pages/[slug]/route";
import { POST as newsletterPost } from "../../src/app/api/v1/public/cms/newsletter/route";
import { todayIsoInFirmTz } from "../../src/shared/crm/appointment-dates";

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

  // CMS-1: careers postedDate must be YYYY-MM-DD (not ISO datetime).
  const careerBase = {
    title: "CMS-1 Verify Associate",
    department: "Legal",
    location: "Kathmandu, Nepal",
    type: "full_time" as const,
    description: "Verify careers postedDate contract.",
    requirements: ["LL.B."],
    isActive: true,
  };
  const badPostedDate = await adminCollectionPost(
    new Request("http://local/api/v1/cms/careers", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ ...careerBase, postedDate: new Date().toISOString() }),
    }),
    { params: Promise.resolve({ collection: "careers" }) },
  );
  if (badPostedDate.status !== 400) {
    throw new Error(
      `Expected careers ISO postedDate 400, got ${badPostedDate.status} ${await badPostedDate.text()}`,
    );
  }

  const postedDate = todayIsoInFirmTz();
  const goodCareer = await adminCollectionPost(
    new Request("http://local/api/v1/cms/careers", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ ...careerBase, postedDate }),
    }),
    { params: Promise.resolve({ collection: "careers" }) },
  );
  if (goodCareer.status !== 201) {
    throw new Error(
      `Careers date-only create failed: ${goodCareer.status} ${await goodCareer.text()}`,
    );
  }
  const goodBody = (await goodCareer.json()) as {
    data: { id?: string; _id?: string; postedDate?: string };
  };
  const careerId = goodBody.data.id || goodBody.data._id;
  if (!careerId) throw new Error("Careers create missing id");
  if (String(goodBody.data.postedDate).slice(0, 10) !== postedDate) {
    throw new Error(
      `Careers postedDate not date-only: ${JSON.stringify(goodBody.data.postedDate)}`,
    );
  }

  const careerUpdate = await adminItemPatch(
    new Request(`http://local/api/v1/cms/careers/${careerId}`, {
      method: "PATCH",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        ...careerBase,
        title: "CMS-1 Verify Associate (updated)",
        postedDate,
      }),
    }),
    { params: Promise.resolve({ collection: "careers", id: careerId }) },
  );
  if (careerUpdate.status !== 200) {
    throw new Error(
      `Careers date-only update failed: ${careerUpdate.status} ${await careerUpdate.text()}`,
    );
  }

  // CMS-2: public settings expose admin phone/email/address (no contact* aliases).
  const contactPhone = "+977-9800000002";
  const contactEmail = "cms2-contact@example.invalid";
  const contactAddress = "CMS-2 Verify Address, Kathmandu";
  const contactPut = await settingsPut(
    new Request("http://local/api/v1/cms/settings", {
      method: "PUT",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        settings: [
          { key: "phone", value: contactPhone },
          { key: "email", value: contactEmail },
          { key: "address", value: contactAddress },
        ],
      }),
    }),
  );
  if (contactPut.status !== 200) {
    throw new Error(
      `CMS-2 settings put failed: ${contactPut.status} ${await contactPut.text()}`,
    );
  }
  const publicSettingsRes = await publicSettingsGet(
    new Request("http://local/api/v1/public/cms/settings"),
  );
  if (publicSettingsRes.status !== 200) {
    throw new Error(
      `CMS-2 public settings get failed: ${publicSettingsRes.status} ${await publicSettingsRes.text()}`,
    );
  }
  const publicSettings = (await publicSettingsRes.json()) as {
    data: Record<string, unknown>;
  };
  if (
    publicSettings.data.phone !== contactPhone ||
    publicSettings.data.email !== contactEmail ||
    publicSettings.data.address !== contactAddress
  ) {
    throw new Error(
      `CMS-2 contact key mismatch: ${JSON.stringify({
        phone: publicSettings.data.phone,
        email: publicSettings.data.email,
        address: publicSettings.data.address,
      })}`,
    );
  }

  // CMS-3: footer columns are distinct locations on public navigation API.
  const footer1Public = await publicCollectionGet(
    new Request("http://local/api/v1/public/cms/navigation?location=footer_col_1"),
    { params: Promise.resolve({ collection: "navigation" }) },
  );
  const footer2Public = await publicCollectionGet(
    new Request("http://local/api/v1/public/cms/navigation?location=footer_col_2"),
    { params: Promise.resolve({ collection: "navigation" }) },
  );
  if (footer1Public.status !== 200 || footer2Public.status !== 200) {
    throw new Error("CMS-3 footer navigation public list failed");
  }

  // CMS-5: blog publishDate preserved on re-save while published.
  const blogSlug = `cms5-verify-${Date.now()}`;
  const firstPublish = new Date("2024-01-15T10:00:00.000Z").toISOString();
  const blogCreate = await adminCollectionPost(
    new Request("http://local/api/v1/cms/blog-posts", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        title: "CMS-5 Verify Post",
        slug: blogSlug,
        category: "General",
        excerpt: "Verify publishDate preserve.",
        content: "Body for CMS-5 verification.",
        author: "Verifier",
        status: "published",
        publishDate: firstPublish,
        seoTitle: "CMS-5 SEO Title",
        seoDescription: "CMS-5 SEO Description",
      }),
    }),
    { params: Promise.resolve({ collection: "blog-posts" }) },
  );
  if (blogCreate.status !== 201) {
    throw new Error(`CMS-5 blog create failed: ${blogCreate.status} ${await blogCreate.text()}`);
  }
  const blogBody = (await blogCreate.json()) as {
    data: { id?: string; _id?: string; publishDate?: string };
  };
  const blogId = blogBody.data.id || blogBody.data._id;
  if (!blogId) throw new Error("CMS-5 blog create missing id");
  const blogUpdate = await adminItemPatch(
    new Request(`http://local/api/v1/cms/blog-posts/${blogId}`, {
      method: "PATCH",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        title: "CMS-5 Verify Post (updated)",
        slug: blogSlug,
        category: "General",
        excerpt: "Verify publishDate preserve.",
        content: "Body for CMS-5 verification.",
        author: "Verifier",
        status: "published",
        publishDate: firstPublish,
        seoTitle: "CMS-5 SEO Title",
        seoDescription: "CMS-5 SEO Description",
      }),
    }),
    { params: Promise.resolve({ collection: "blog-posts", id: blogId }) },
  );
  if (blogUpdate.status !== 200) {
    throw new Error(`CMS-5 blog update failed: ${blogUpdate.status} ${await blogUpdate.text()}`);
  }
  const blogUpdated = (await blogUpdate.json()) as { data: { publishDate?: string } };
  if (String(blogUpdated.data.publishDate) !== firstPublish) {
    throw new Error(
      `CMS-5 publishDate not preserved: ${JSON.stringify(blogUpdated.data.publishDate)}`,
    );
  }

  // CMS-6: news drafts never appear on public list.
  const draftNews = await adminCollectionPost(
    new Request("http://local/api/v1/cms/news", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        title: "CMS-6 Draft News",
        excerpt: "Should stay private.",
        content: "Draft body for CMS-6.",
        date: postedDate,
        type: "firm_news",
        status: "draft",
      }),
    }),
    { params: Promise.resolve({ collection: "news" }) },
  );
  if (draftNews.status !== 201) {
    throw new Error(`CMS-6 draft news create failed: ${draftNews.status} ${await draftNews.text()}`);
  }
  const draftNewsBody = (await draftNews.json()) as {
    data: { id?: string; _id?: string; status?: string };
  };
  const draftNewsId = draftNewsBody.data.id || draftNewsBody.data._id;
  if (!draftNewsId) throw new Error("CMS-6 draft news missing id");
  if (draftNewsBody.data.status !== "draft") {
    throw new Error(`CMS-6 expected draft status, got ${draftNewsBody.data.status}`);
  }
  const publicNews = await publicCollectionGet(
    new Request("http://local/api/v1/public/cms/news"),
    { params: Promise.resolve({ collection: "news" }) },
  );
  const publicNewsBody = (await publicNews.json()) as {
    data: Array<{ id?: string; _id?: string; status?: string }>;
  };
  if (
    publicNews.status !== 200 ||
    publicNewsBody.data.some((item) => (item.id || item._id) === draftNewsId) ||
    publicNewsBody.data.some((item) => item.status === "draft")
  ) {
    throw new Error("CMS-6 draft news leaked to public list");
  }

  // CMS-9: admin legal GET + nav soft-delete cascades children.
  const legalGet = await adminLegalGet(
    new Request("http://local/api/v1/cms/legal-pages/privacy-policy", { headers: { cookie } }),
    { params: Promise.resolve({ slug: "privacy-policy" }) },
  );
  if (legalGet.status !== 200 && legalGet.status !== 404) {
    throw new Error(`CMS-9 admin legal GET unexpected ${legalGet.status}`);
  }
  const parentNav = await adminCollectionPost(
    new Request("http://local/api/v1/cms/navigation", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        label: "CMS-9 Parent",
        url: "/cms9-parent",
        location: "header",
        order: 9000,
        isActive: true,
      }),
    }),
    { params: Promise.resolve({ collection: "navigation" }) },
  );
  if (parentNav.status !== 201) {
    throw new Error(`CMS-9 parent nav create failed: ${parentNav.status} ${await parentNav.text()}`);
  }
  const parentBody = (await parentNav.json()) as { data: { id?: string; _id?: string } };
  const parentId = parentBody.data.id || parentBody.data._id;
  if (!parentId) throw new Error("CMS-9 parent nav missing id");
  const childNav = await adminCollectionPost(
    new Request("http://local/api/v1/cms/navigation", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        label: "CMS-9 Child",
        url: "/cms9-child",
        location: "header",
        order: 9001,
        isActive: true,
        parentId,
      }),
    }),
    { params: Promise.resolve({ collection: "navigation" }) },
  );
  if (childNav.status !== 201) {
    throw new Error(`CMS-9 child nav create failed: ${childNav.status} ${await childNav.text()}`);
  }
  const childBody = (await childNav.json()) as { data: { id?: string; _id?: string } };
  const childId = childBody.data.id || childBody.data._id;
  if (!childId) throw new Error("CMS-9 child nav missing id");
  const deleteParent = await adminItemDelete(
    new Request(`http://local/api/v1/cms/navigation/${parentId}`, {
      method: "DELETE",
      headers: { cookie },
    }),
    { params: Promise.resolve({ collection: "navigation", id: parentId }) },
  );
  if (deleteParent.status !== 204) {
    throw new Error(`CMS-9 nav delete failed: ${deleteParent.status}`);
  }
  const adminNavAfter = await adminCollectionGet(
    new Request("http://local/api/v1/cms/navigation", { headers: { cookie } }),
    { params: Promise.resolve({ collection: "navigation" }) },
  );
  const adminNavBody = (await adminNavAfter.json()) as {
    data: Array<{ id?: string; _id?: string }>;
  };
  const remaining = adminNavBody.data.map((item) => item.id || item._id);
  if (remaining.includes(parentId) || remaining.includes(childId)) {
    throw new Error("CMS-9 nav delete did not cascade children");
  }

  const [actor] = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "boundary-a@example.invalid"))
    .limit(1);
  process.stdout.write(
    `${JSON.stringify({
      passed: true,
      publicPublishedOnly: true,
      anonymousAdmin: 401,
      crossFirmWrite: 404,
      unsafeSetting: 400,
      newsletterIdempotent: true,
      careersPostedDateOk: true,
      careersPostedDate: postedDate,
      contactKeysOk: true,
      contactPhone,
      contactEmail,
      footerNavOk: true,
      blogPublishDatePreserved: true,
      newsDraftsPrivate: true,
      adminLegalGetOk: true,
      navCascadeDeleteOk: true,
      actor: actor.id,
    })}\n`,
  );
} finally {
  await closeDatabase();
}
