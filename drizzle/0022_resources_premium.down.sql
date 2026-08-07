DROP INDEX IF EXISTS "resources_firm_status_idx";
DROP INDEX IF EXISTS "resources_firm_slug_unique";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "resource_id";
ALTER TABLE "resources" DROP COLUMN IF EXISTS "display_order";
ALTER TABLE "resources" DROP COLUMN IF EXISTS "seo_description";
ALTER TABLE "resources" DROP COLUMN IF EXISTS "seo_title";
ALTER TABLE "resources" DROP COLUMN IF EXISTS "slug";
ALTER TABLE "resources" DROP COLUMN IF EXISTS "status";
DROP TYPE IF EXISTS "public"."resource_status";
