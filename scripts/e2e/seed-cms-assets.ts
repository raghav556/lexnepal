import { createHash, randomUUID } from "node:crypto";
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

export type SeedPromotedCmsAssetOptions = {
  bytes?: Buffer;
  mimeType?: string;
  fileName?: string;
  /** Stable key so reruns update the same promoted CMS asset instead of inserting duplicates. */
  seedKey?: string;
};

function seededUuid(seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex");
  const variant = ((Number.parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
}

export async function seedPromotedCmsAsset(
  firmId: string,
  purpose: CmsAssetPurpose,
  options: SeedPromotedCmsAssetOptions = {},
) {
  const db = getDatabase();
  const [actor] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.firmId, firmId))
    .limit(1);
  if (!actor) throw new Error(`No users found for firm ${firmId}`);

  const bytes = options.bytes ?? SEED_CMS_ASSET_PNG;
  const mimeType = options.mimeType ?? "image/png";
  const fileName = options.fileName ?? `${purpose}.png`;
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const quarantineKey = options.seedKey
    ? `seed/${firmId}/cms/${purpose}/${options.seedKey}`
    : `seed/${firmId}/cms/${randomUUID()}`;

  const [existing] = options.seedKey
    ? await db
        .select({ id: cmsAssetUploadIntents.id, protectedKey: cmsAssetUploadIntents.protectedKey })
        .from(cmsAssetUploadIntents)
        .where(eq(cmsAssetUploadIntents.quarantineKey, quarantineKey))
        .limit(1)
    : [];

  const id = existing?.id ?? (options.seedKey ? seededUuid(quarantineKey) : randomUUID());
  const protectedKey = existing?.protectedKey ?? `protected/${firmId}/cms/${id}/${fileName}`;

  await getDocumentStorageRuntime().storage.putObject(protectedKey, bytes, mimeType, {
    seed: options.seedKey ?? "cms-smoke",
    sha256,
  });

  await db
    .insert(cmsAssetUploadIntents)
    .values({
      id,
      firmId,
      createdBy: actor.id,
      purpose,
      originalFileName: fileName,
      declaredMimeType: mimeType,
      declaredSizeBytes: bytes.length,
      quarantineKey,
      protectedKey,
      status: "promoted",
      expiresAt: new Date(Date.now() + 86_400_000),
      completedAt: new Date(),
      actualSha256: sha256,
    })
    .onDuplicateKeyUpdate({
      set: {
        purpose,
        originalFileName: fileName,
        declaredMimeType: mimeType,
        declaredSizeBytes: bytes.length,
        protectedKey,
        status: "promoted",
        completedAt: new Date(),
        actualSha256: sha256,
        deletedAt: null,
        updatedAt: new Date(),
      },
    });

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
