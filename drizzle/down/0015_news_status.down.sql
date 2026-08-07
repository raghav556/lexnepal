DROP INDEX IF EXISTS "news_and_awards_firm_status_idx";
ALTER TABLE "news_and_awards" DROP COLUMN IF EXISTS "status";
DROP TYPE IF EXISTS "news_status";
