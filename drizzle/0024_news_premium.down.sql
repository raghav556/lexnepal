DROP INDEX IF EXISTS "news_and_awards_firm_slug_unique";
ALTER TABLE "news_and_awards" DROP COLUMN IF EXISTS "is_featured";
ALTER TABLE "news_and_awards" DROP COLUMN IF EXISTS "display_order";
ALTER TABLE "news_and_awards" DROP COLUMN IF EXISTS "seo_description";
ALTER TABLE "news_and_awards" DROP COLUMN IF EXISTS "seo_title";
ALTER TABLE "news_and_awards" DROP COLUMN IF EXISTS "slug";
