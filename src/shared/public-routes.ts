/** Known public site paths for CMS navigation href helpers and seed/verify allowlists. */
export const PUBLIC_INTERNAL_PATHS = [
  "/",
  "/about-us",
  "/practice-areas",
  "/lawyers",
  "/blog",
  "/news",
  "/contact",
  "/careers",
  "/resources",
  "/consultation",
  "/privacy-policy",
  "/terms",
] as const;

export type PublicInternalPath = (typeof PUBLIC_INTERNAL_PATHS)[number];

export const DEFAULT_PRIVACY_POLICY_URL = "/privacy-policy";
export const DEFAULT_TERMS_OF_SERVICE_URL = "/terms";
export const DEFAULT_PRIMARY_CTA_LABEL = "Book Consultation";
export const DEFAULT_PRIMARY_CTA_SHORT_LABEL = "Book Now";
export const DEFAULT_PRIMARY_CTA_HREF = "/consultation";
