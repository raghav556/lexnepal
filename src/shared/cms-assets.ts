export const CMS_ASSET_PURPOSES = [
  "director_photo",
  "director_signature",
  "logo",
  "favicon",
  "hero_image",
  "practice_area_cover",
  "testimonial_avatar",
] as const;
export type CmsAssetPurpose = (typeof CMS_ASSET_PURPOSES)[number];

export function publicCmsAssetUrl(assetId: string): string {
  return `/api/v1/public/cms/assets/${assetId}`;
}

export function isPublicCmsAssetUrl(url: string | undefined | null): boolean {
  return Boolean(url?.startsWith("/api/v1/public/cms/assets/"));
}
