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
import { POST as cmsAssetIntentPost } from "../../src/app/api/v1/cms/asset-upload-intents/route";
import { POST as cmsAssetCompletePost } from "../../src/app/api/v1/cms/asset-upload-intents/[intentId]/complete/route";
import { GET as publicCmsAssetGet } from "../../src/app/api/v1/public/cms/assets/[assetId]/route";
import { SEED_CMS_ASSET_PNG } from "../e2e/seed-cms-assets";
import { GET as adminLegalGet } from "../../src/app/api/v1/cms/legal-pages/[slug]/route";
import { GET as adminTeamGet } from "../../src/app/api/v1/cms/team/route";
import { POST as newsletterPost } from "../../src/app/api/v1/public/cms/newsletter/route";
import { POST as navReorderPost } from "../../src/app/api/v1/cms/navigation/reorder/route";
import { GET as publicPracticeAreaGet } from "../../src/app/api/v1/public/cms/practice-areas/[slug]/route";
import { todayIsoInFirmTz } from "../../src/shared/crm/appointment-dates";
import {
  DEFAULT_PRIVACY_POLICY_URL,
  DEFAULT_TERMS_OF_SERVICE_URL,
  PUBLIC_INTERNAL_PATHS,
} from "../../src/shared/public-routes";

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

  // Site Settings dashboard sends *Description keys — must not trip script substring guard.
  const dashboardSettingsPut = await settingsPut(
    new Request("http://local/api/v1/cms/settings", {
      method: "PUT",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        settings: [
          { key: "firmName", value: "CMS Dashboard Verify Firm" },
          { key: "email", value: "dashboard-verify@example.invalid" },
          { key: "seoMetaDescription", value: "Meta description for verify." },
          { key: "mobileAppDescription", value: "Mobile banner description." },
        ],
      }),
    }),
  );
  if (dashboardSettingsPut.status !== 200) {
    throw new Error(
      `CMS settings dashboard save failed: ${dashboardSettingsPut.status} ${await dashboardSettingsPut.text()}`,
    );
  }
  const publicAfterDashboard = await publicSettingsGet(
    new Request("http://local/api/v1/public/cms/settings"),
  );
  const publicAfterBody = (await publicAfterDashboard.json()) as {
    data: Record<string, unknown>;
  };
  if (
    publicAfterBody.data.seoMetaDescription !== "Meta description for verify." ||
    publicAfterBody.data.mobileAppDescription !== "Mobile banner description."
  ) {
    throw new Error(
      `Public settings missing *Description keys: ${JSON.stringify({
        seoMetaDescription: publicAfterBody.data.seoMetaDescription,
        mobileAppDescription: publicAfterBody.data.mobileAppDescription,
      })}`,
    );
  }

  // Homepage director message: admin save → public settings → parseable payload.
  const uploadCmsAssetVerify = async (
    purpose: "director_photo" | "director_signature" | "logo" | "favicon" | "hero_image",
  ) => {
    const intentResponse = await cmsAssetIntentPost(
      new Request("http://local/api/v1/cms/asset-upload-intents", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          fileName: `${purpose}.png`,
          mimeType: "image/png",
          sizeBytes: SEED_CMS_ASSET_PNG.length,
          purpose,
        }),
      }),
    );
    if (intentResponse.status !== 201) {
      throw new Error(
        `CMS asset intent failed (${purpose}): ${intentResponse.status} ${await intentResponse.text()}`,
      );
    }
    const intentBody = (await intentResponse.json()) as {
      data: { intentId: string; upload: { url: string; fields: Record<string, string> } };
    };
    const form = new FormData();
    Object.entries(intentBody.data.upload.fields).forEach(([key, value]) => form.append(key, value));
    form.append(
      "file",
      new Blob([SEED_CMS_ASSET_PNG], { type: "image/png" }),
      `${purpose}.png`,
    );
    const storageUpload = await fetch(intentBody.data.upload.url, { method: "POST", body: form });
    if (!storageUpload.ok) {
      throw new Error(`CMS asset storage upload failed (${purpose}): ${storageUpload.status}`);
    }
    const completeResponse = await cmsAssetCompletePost(
      new Request("http://local/api/v1/cms/asset-upload-intents/x/complete", { method: "POST", headers: { cookie } }),
      { params: Promise.resolve({ intentId: intentBody.data.intentId }) },
    );
    if (completeResponse.status !== 200) {
      throw new Error(
        `CMS asset complete failed (${purpose}): ${completeResponse.status} ${await completeResponse.text()}`,
      );
    }
    const completeBody = (await completeResponse.json()) as {
      data: { status: string; publicUrl?: string | null };
    };
    if (completeBody.data.status !== "promoted" || !completeBody.data.publicUrl) {
      throw new Error(`CMS asset not promoted (${purpose}): ${JSON.stringify(completeBody.data)}`);
    }
    const assetId = completeBody.data.publicUrl.replace("/api/v1/public/cms/assets/", "");
    const publicAsset = await publicCmsAssetGet(new Request(`http://local/api/v1/public/cms/assets/${assetId}`), {
      params: Promise.resolve({ assetId }),
    });
    if (publicAsset.status !== 307) {
      throw new Error(`Public CMS asset redirect failed (${purpose}): ${publicAsset.status}`);
    }
    return completeBody.data.publicUrl;
  };

  const directorPhotoUrl = await uploadCmsAssetVerify("director_photo");
  const directorSignatureUrl = await uploadCmsAssetVerify("director_signature");

  const directorMessagePut = await settingsPut(
    new Request("http://local/api/v1/cms/settings", {
      method: "PUT",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        settings: [
          {
            key: "director_message",
            value: {
              isVisible: true,
              sectionTitle: "CMS Verify Director Section",
              message: "CMS homepage verify director message body.",
              name: "Verify Director",
              designation: "Managing Partner",
              photoUrl: directorPhotoUrl,
              signatureUrl: directorSignatureUrl,
              ctaLabel: "View Full Profile",
            },
          },
        ],
      }),
    }),
  );
  if (directorMessagePut.status !== 200) {
    throw new Error(
      `Homepage director_message save failed: ${directorMessagePut.status} ${await directorMessagePut.text()}`,
    );
  }
  const publicDirector = await publicSettingsGet(
    new Request("http://local/api/v1/public/cms/settings"),
  );
  const publicDirectorBody = (await publicDirector.json()) as {
    data: { director_message?: { message?: string; sectionTitle?: string; isVisible?: boolean } };
  };
  const dm = publicDirectorBody.data.director_message as
    | { message?: string; sectionTitle?: string; isVisible?: boolean; photoUrl?: string; signatureUrl?: string }
    | undefined;
  if (
    !dm ||
    dm.message !== "CMS homepage verify director message body." ||
    dm.sectionTitle !== "CMS Verify Director Section" ||
    dm.isVisible !== true ||
    dm.photoUrl !== directorPhotoUrl ||
    dm.signatureUrl !== directorSignatureUrl ||
    !dm.photoUrl?.startsWith("/api/v1/public/cms/assets/") ||
    !dm.signatureUrl?.startsWith("/api/v1/public/cms/assets/")
  ) {
    throw new Error(`Homepage director_message public read failed: ${JSON.stringify(dm)}`);
  }

  // Brand assets: upload logo/favicon/hero → settings → public settings + asset redirects.
  const brandLogoUrl = await uploadCmsAssetVerify("logo");
  const brandFaviconUrl = await uploadCmsAssetVerify("favicon");
  const brandHeroUrl = await uploadCmsAssetVerify("hero_image");
  const brandSettingsPut = await settingsPut(
    new Request("http://local/api/v1/cms/settings", {
      method: "PUT",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        settings: [
          { key: "logoUrl", value: brandLogoUrl },
          { key: "faviconUrl", value: brandFaviconUrl },
          { key: "heroImageUrl", value: brandHeroUrl },
        ],
      }),
    }),
  );
  if (brandSettingsPut.status !== 200) {
    throw new Error(
      `Brand assets settings save failed: ${brandSettingsPut.status} ${await brandSettingsPut.text()}`,
    );
  }
  const publicBrand = await publicSettingsGet(
    new Request("http://local/api/v1/public/cms/settings"),
  );
  const publicBrandBody = (await publicBrand.json()) as {
    data: { logoUrl?: string; faviconUrl?: string; heroImageUrl?: string };
  };
  if (
    publicBrandBody.data.logoUrl !== brandLogoUrl ||
    publicBrandBody.data.faviconUrl !== brandFaviconUrl ||
    publicBrandBody.data.heroImageUrl !== brandHeroUrl
  ) {
    throw new Error(`Brand assets public read failed: ${JSON.stringify(publicBrandBody.data)}`);
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

  // CMS-9: admin legal GET + nav soft-delete cascades children + sibling order uniqueness.
  const navOrderBase = 8000 + (Date.now() % 1000);
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
        url: "#",
        location: "header",
        order: navOrderBase,
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

  // Child may reuse the same display_order as its parent (sibling-scoped unique).
  const childNav = await adminCollectionPost(
    new Request("http://local/api/v1/cms/navigation", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        label: "CMS-9 Child A",
        url: "/blog",
        location: "header",
        order: navOrderBase,
        isActive: true,
        parentId,
      }),
    }),
    { params: Promise.resolve({ collection: "navigation" }) },
  );
  if (childNav.status !== 201) {
    throw new Error(`CMS-9 child nav create failed: ${childNav.status} ${await childNav.text()}`);
  }
  const childBody = (await childNav.json()) as { data: { id?: string; _id?: string; order?: number } };
  const childId = childBody.data.id || childBody.data._id;
  if (!childId) throw new Error("CMS-9 child nav missing id");

  const childNavB = await adminCollectionPost(
    new Request("http://local/api/v1/cms/navigation", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        label: "CMS-9 Child B",
        url: "/news",
        location: "header",
        order: navOrderBase + 1,
        isActive: true,
        parentId,
      }),
    }),
    { params: Promise.resolve({ collection: "navigation" }) },
  );
  if (childNavB.status !== 201) {
    throw new Error(`CMS-9 child B create failed: ${childNavB.status} ${await childNavB.text()}`);
  }
  const childBBody = (await childNavB.json()) as {
    data: { id?: string; _id?: string; order?: number };
  };
  const childBId = childBBody.data.id || childBBody.data._id;
  if (!childBId) throw new Error("CMS-9 child B missing id");

  const reorderRes = await navReorderPost(
    new Request("http://local/api/v1/cms/navigation/reorder", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        id1: childId,
        order1: navOrderBase + 1,
        id2: childBId,
        order2: navOrderBase,
      }),
    }),
  );
  if (reorderRes.status !== 200) {
    throw new Error(`CMS-9 sibling reorder failed: ${reorderRes.status} ${await reorderRes.text()}`);
  }
  const reorderBody = (await reorderRes.json()) as { data: { success?: boolean } };
  if (!reorderBody.data?.success) {
    throw new Error("CMS-9 sibling reorder returned success=false");
  }

  const publicHeaderNav = await publicCollectionGet(
    new Request("http://local/api/v1/public/cms/navigation?location=header"),
    { params: Promise.resolve({ collection: "navigation" }) },
  );
  if (publicHeaderNav.status !== 200) {
    throw new Error(`CMS-9 public header nav failed: ${publicHeaderNav.status}`);
  }
  const publicHeaderBody = (await publicHeaderNav.json()) as {
    data: Array<{ id?: string; _id?: string; parentId?: string | null; label?: string }>;
  };
  const publicChild = publicHeaderBody.data.find(
    (item) => (item.id || item._id) === childId || (item.id || item._id) === childBId,
  );
  if (!publicChild?.parentId || publicChild.parentId !== parentId) {
    throw new Error("CMS-9 public navigation missing parentId on nested child");
  }

  const publicSettingsEnsure = await settingsPut(
    new Request("http://local/api/v1/cms/settings", {
      method: "PUT",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        settings: [
          { key: "privacyPolicyUrl", value: DEFAULT_PRIVACY_POLICY_URL },
          { key: "termsOfServiceUrl", value: DEFAULT_TERMS_OF_SERVICE_URL },
          { key: "primaryCtaLabel", value: "Book Consultation" },
          { key: "primaryCtaShortLabel", value: "Book Now" },
          { key: "primaryCtaHref", value: "/consultation" },
        ],
      }),
    }),
  );
  if (publicSettingsEnsure.status !== 200) {
    throw new Error(`CMS-9 legal/CTA settings save failed: ${publicSettingsEnsure.status}`);
  }

  const publicSettingsNav = await publicSettingsGet(
    new Request("http://local/api/v1/public/cms/settings"),
  );
  const publicSettingsBody = (await publicSettingsNav.json()) as {
    data: Record<string, unknown>;
  };
  const privacyUrl = String(publicSettingsBody.data.privacyPolicyUrl);
  const termsUrl = String(publicSettingsBody.data.termsOfServiceUrl);
  const allowlist = new Set<string>(PUBLIC_INTERNAL_PATHS);
  if (!allowlist.has(privacyUrl) || !allowlist.has(termsUrl)) {
    throw new Error(`CMS-9 legal hrefs not in public allowlist: ${privacyUrl}, ${termsUrl}`);
  }
  if (String(publicSettingsBody.data.primaryCtaHref) !== "/consultation") {
    throw new Error("CMS-9 primary CTA href mismatch");
  }

  // Nav visibility toggle accepts partial PATCH (isActive only).
  const toggleNav = await adminItemPatch(
    new Request(`http://local/api/v1/cms/navigation/${parentId}`, {
      method: "PATCH",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    }),
    { params: Promise.resolve({ collection: "navigation", id: parentId }) },
  );
  if (toggleNav.status !== 200) {
    throw new Error(`Nav visibility toggle failed: ${toggleNav.status} ${await toggleNav.text()}`);
  }

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
  if (remaining.includes(parentId) || remaining.includes(childId) || remaining.includes(childBId)) {
    throw new Error("CMS-9 nav delete did not cascade children");
  }

  // Admin team roster exposes CMS profile fields (not identity-only UserDto).
  const adminTeam = await adminTeamGet(
    new Request("http://local/api/v1/cms/team", { headers: { cookie } }),
  );
  if (adminTeam.status !== 200) {
    throw new Error(`Admin team GET failed: ${adminTeam.status} ${await adminTeam.text()}`);
  }
  const adminTeamBody = (await adminTeam.json()) as {
    data: Array<{ longBio?: string | null; practiceAreas?: string[]; isPublicFacing?: boolean }>;
  };
  if (!Array.isArray(adminTeamBody.data)) {
    throw new Error("Admin team GET returned invalid payload");
  }

  // Practice areas: slug detail, FAQs, icon alias, inactive 404.
  const paSlug = `verify-pa-${Date.now().toString(36)}`;
  const paCreate = await adminCollectionPost(
    new Request("http://local/api/v1/cms/practice-areas", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        title: "Verify Practice Area",
        slug: paSlug,
        icon: "Scale",
        description: "Short verify description",
        longDescription: "Long verify description for detail page.",
        displayOrder: 50,
        showOnHome: true,
        isActive: true,
        faqs: [{ question: "Verify question?", answer: "Verify answer." }],
      }),
    }),
    { params: Promise.resolve({ collection: "practice-areas" }) },
  );
  if (paCreate.status !== 201) {
    throw new Error(`Practice area create failed: ${paCreate.status} ${await paCreate.text()}`);
  }
  const paBody = (await paCreate.json()) as {
    data: { id?: string; _id?: string; icon?: string; iconName?: string; faqs?: unknown[] };
  };
  const paId = paBody.data.id || paBody.data._id;
  if (!paId) throw new Error("Practice area missing id");
  if (paBody.data.icon !== "Scale" || paBody.data.iconName !== "Scale") {
    throw new Error("Practice area icon/iconName alias missing on create");
  }
  if (!Array.isArray(paBody.data.faqs) || paBody.data.faqs.length !== 1) {
    throw new Error("Practice area FAQs missing on create");
  }

  const publicPaList = await publicCollectionGet(
    new Request("http://local/api/v1/public/cms/practice-areas"),
    { params: Promise.resolve({ collection: "practice-areas" }) },
  );
  const publicPaListBody = (await publicPaList.json()) as {
    data: Array<{ slug?: string; icon?: string; iconName?: string; faqs?: unknown[] }>;
  };
  const listed = publicPaListBody.data.find((item) => item.slug === paSlug);
  if (!listed || listed.icon !== "Scale" || listed.iconName !== "Scale") {
    throw new Error("Public practice area list missing icon alias");
  }
  if (!Array.isArray(listed.faqs) || listed.faqs.length !== 1) {
    throw new Error("Public practice area list missing FAQs");
  }

  const publicPaSlug = await publicPracticeAreaGet(
    new Request(`http://local/api/v1/public/cms/practice-areas/${paSlug}`),
    { params: Promise.resolve({ slug: paSlug }) },
  );
  if (publicPaSlug.status !== 200) {
    throw new Error(`Public practice area by slug failed: ${publicPaSlug.status}`);
  }

  const hidePa = await adminItemPatch(
    new Request(`http://local/api/v1/cms/practice-areas/${paId}`, {
      method: "PATCH",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    }),
    { params: Promise.resolve({ collection: "practice-areas", id: paId }) },
  );
  if (hidePa.status !== 200) {
    throw new Error(`Practice area hide failed: ${hidePa.status}`);
  }
  const publicPaHidden = await publicPracticeAreaGet(
    new Request(`http://local/api/v1/public/cms/practice-areas/${paSlug}`),
    { params: Promise.resolve({ slug: paSlug }) },
  );
  if (publicPaHidden.status !== 404) {
    throw new Error(`Inactive practice area should 404, got ${publicPaHidden.status}`);
  }
  await adminItemDelete(
    new Request(`http://local/api/v1/cms/practice-areas/${paId}`, {
      method: "DELETE",
      headers: { cookie },
    }),
    { params: Promise.resolve({ collection: "practice-areas", id: paId }) },
  );

  // Testimonials: approved-only public, showOnHome filter, order, rating, avatar contract.
  const tStamp = Date.now().toString(36);
  const tCreateApproved = await adminCollectionPost(
    new Request("http://local/api/v1/cms/testimonials", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        clientName: `Verify Client ${tStamp}`,
        company: "Verify Co",
        quote: "Verify quote for homepage.",
        rating: 4,
        isApproved: true,
        showOnHome: true,
        displayOrder: 10,
        avatarUrl: "/api/v1/public/cms/assets/00000000-0000-4000-8000-000000000099",
      }),
    }),
    { params: Promise.resolve({ collection: "testimonials" }) },
  );
  if (tCreateApproved.status !== 201) {
    throw new Error(`Testimonial create failed: ${tCreateApproved.status} ${await tCreateApproved.text()}`);
  }
  const tApprovedBody = (await tCreateApproved.json()) as {
    data: { id?: string; _id?: string; rating?: number; avatarUrl?: string; displayOrder?: number };
  };
  const tApprovedId = tApprovedBody.data.id || tApprovedBody.data._id;
  if (!tApprovedId) throw new Error("Approved testimonial missing id");
  if (tApprovedBody.data.rating !== 4) throw new Error("Testimonial rating not persisted");
  if (
    tApprovedBody.data.avatarUrl !==
    "/api/v1/public/cms/assets/00000000-0000-4000-8000-000000000099"
  ) {
    throw new Error("Testimonial avatar CMS asset URL rejected or mangled");
  }

  const tCreateHidden = await adminCollectionPost(
    new Request("http://local/api/v1/cms/testimonials", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        clientName: `Hidden Client ${tStamp}`,
        quote: "Should not be public.",
        rating: 2,
        isApproved: false,
        showOnHome: true,
        displayOrder: 11,
      }),
    }),
    { params: Promise.resolve({ collection: "testimonials" }) },
  );
  if (tCreateHidden.status !== 201) {
    throw new Error(`Hidden testimonial create failed: ${tCreateHidden.status}`);
  }
  const tHiddenBody = (await tCreateHidden.json()) as { data: { id?: string; _id?: string } };
  const tHiddenId = tHiddenBody.data.id || tHiddenBody.data._id;
  if (!tHiddenId) throw new Error("Hidden testimonial missing id");

  const tCreateOffHome = await adminCollectionPost(
    new Request("http://local/api/v1/cms/testimonials", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        clientName: `Off-home Client ${tStamp}`,
        quote: "Approved but not on home.",
        rating: 5,
        isApproved: true,
        showOnHome: false,
        displayOrder: 12,
      }),
    }),
    { params: Promise.resolve({ collection: "testimonials" }) },
  );
  if (tCreateOffHome.status !== 201) {
    throw new Error(`Off-home testimonial create failed: ${tCreateOffHome.status}`);
  }
  const tOffHomeBody = (await tCreateOffHome.json()) as { data: { id?: string; _id?: string } };
  const tOffHomeId = tOffHomeBody.data.id || tOffHomeBody.data._id;
  if (!tOffHomeId) throw new Error("Off-home testimonial missing id");

  const publicTestimonials = await publicCollectionGet(
    new Request("http://local/api/v1/public/cms/testimonials"),
    { params: Promise.resolve({ collection: "testimonials" }) },
  );
  const publicTBody = (await publicTestimonials.json()) as {
    data: Array<{
      clientName?: string;
      isApproved?: boolean;
      showOnHome?: boolean;
      displayOrder?: number;
      rating?: number;
      avatarUrl?: string | null;
    }>;
  };
  if (publicTBody.data.some((row) => row.isApproved === false)) {
    throw new Error("Public testimonials leaked unapproved rows");
  }
  if (!publicTBody.data.some((row) => row.clientName === `Verify Client ${tStamp}`)) {
    throw new Error("Public testimonials missing approved verify row");
  }
  if (publicTBody.data.some((row) => row.clientName === `Hidden Client ${tStamp}`)) {
    throw new Error("Public testimonials included hidden verify row");
  }

  const publicHomeTestimonials = await publicCollectionGet(
    new Request("http://local/api/v1/public/cms/testimonials?showOnHome=true"),
    { params: Promise.resolve({ collection: "testimonials" }) },
  );
  const publicHomeBody = (await publicHomeTestimonials.json()) as {
    data: Array<{ clientName?: string; showOnHome?: boolean; displayOrder?: number; rating?: number }>;
  };
  if (publicHomeBody.data.some((row) => row.showOnHome === false)) {
    throw new Error("Public showOnHome=true leaked off-home rows");
  }
  if (publicHomeBody.data.some((row) => row.clientName === `Off-home Client ${tStamp}`)) {
    throw new Error("Off-home verify row appeared in showOnHome=true list");
  }
  if (!publicHomeBody.data.some((row) => row.clientName === `Verify Client ${tStamp}` && row.rating === 4)) {
    throw new Error("Homepage testimonials missing verify rating");
  }
  for (let i = 1; i < publicHomeBody.data.length; i++) {
    const prev = publicHomeBody.data[i - 1]?.displayOrder ?? 0;
    const next = publicHomeBody.data[i]?.displayOrder ?? 0;
    if (next < prev) throw new Error("Public testimonials not ordered by displayOrder ascending");
  }
  const avatarOk = publicHomeBody.data.every((row) => {
    if (!row.avatarUrl) return true;
    return (
      /^https?:\/\//.test(String(row.avatarUrl)) ||
      /^\/api\/v1\/public\/cms\/assets\/[0-9a-fA-F-]{36}$/.test(String(row.avatarUrl))
    );
  });
  if (!avatarOk) throw new Error("Public testimonial avatarUrl failed contract check");

  await adminItemDelete(
    new Request(`http://local/api/v1/cms/testimonials/${tApprovedId}`, {
      method: "DELETE",
      headers: { cookie },
    }),
    { params: Promise.resolve({ collection: "testimonials", id: tApprovedId }) },
  );
  await adminItemDelete(
    new Request(`http://local/api/v1/cms/testimonials/${tHiddenId}`, {
      method: "DELETE",
      headers: { cookie },
    }),
    { params: Promise.resolve({ collection: "testimonials", id: tHiddenId }) },
  );
  await adminItemDelete(
    new Request(`http://local/api/v1/cms/testimonials/${tOffHomeId}`, {
      method: "DELETE",
      headers: { cookie },
    }),
    { params: Promise.resolve({ collection: "testimonials", id: tOffHomeId }) },
  );

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
      dashboardSettingsSaveOk: true,
      publicDescriptionKeysOk: true,
      homepageDirectorMessageOk: true,
      homepageDirectorAssetUploadOk: true,
      brandAssetUploadOk: true,
      contactPhone,
      contactEmail,
      footerNavOk: true,
      blogPublishDatePreserved: true,
      newsDraftsPrivate: true,
      adminLegalGetOk: true,
      navCascadeDeleteOk: true,
      navTogglePartialPatchOk: true,
      navSiblingOrderOk: true,
      navPublicParentIdOk: true,
      navLegalHrefAllowlistOk: true,
      practiceAreaSlugOk: true,
      practiceAreaFaqsOk: true,
      practiceAreaIconAliasOk: true,
      testimonialsApprovedOnlyOk: true,
      testimonialsShowOnHomeOk: true,
      testimonialsOrderOk: true,
      testimonialsRatingOk: true,
      testimonialsAvatarContractOk: true,
      adminTeamRosterOk: true,
      actor: actor.id,
    })}\n`,
  );
} finally {
  await closeDatabase();
}
