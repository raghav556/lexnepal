import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../src/server/db/client";
import { cmsAssetUploadIntents, users } from "../../db/schema";
import { getDocumentStorageRuntime } from "../../src/server/storage/runtime";
import { publicCmsAssetUrl, type CmsAssetPurpose } from "../../src/shared/cms-assets";

/** 1×1 PNG used for deterministic local CMS asset seeding. */
export const SEED_CMS_ASSET_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export async function seedPromotedCmsAsset(firmId: string, purpose: CmsAssetPurpose) {
  const db = getDatabase();
  const [actor] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.firmId, firmId))
    .limit(1);
  if (!actor) throw new Error(`No users found for firm ${firmId}`);

  const id = randomUUID();
  const protectedKey = `protected/${firmId}/cms/${id}/seed.png`;
  await getDocumentStorageRuntime().storage.putObject(
    protectedKey,
    SEED_CMS_ASSET_PNG,
    "image/png",
    { seed: "cms-smoke" },
  );

  await db
    .insert(cmsAssetUploadIntents)
    .values({
      id,
      firmId,
      createdBy: actor.id,
      purpose,
      originalFileName: `${purpose}.png`,
      declaredMimeType: "image/png",
      declaredSizeBytes: SEED_CMS_ASSET_PNG.length,
      quarantineKey: `seed/${firmId}/cms/${id}`,
      protectedKey,
      status: "promoted",
      expiresAt: new Date(Date.now() + 86_400_000),
      completedAt: new Date(),
      actualSha256: "seed",
    })
    .onConflictDoNothing();

  return publicCmsAssetUrl(id);
}

export async function seedDirectorMessageAssets(firmId: string) {
  const photoUrl = await seedPromotedCmsAsset(firmId, "director_photo");
  const signatureUrl = await seedPromotedCmsAsset(firmId, "director_signature");
  return { photoUrl, signatureUrl };
}

export async function seedBrandAssets(firmId: string) {
  const logoUrl = await seedPromotedCmsAsset(firmId, "logo");
  const faviconUrl = await seedPromotedCmsAsset(firmId, "favicon");
  const heroImageUrl = await seedPromotedCmsAsset(firmId, "hero_image");
  return { logoUrl, faviconUrl, heroImageUrl };
}
