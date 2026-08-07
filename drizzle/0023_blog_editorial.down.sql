-- Down migration is best-effort: enum values cannot be removed safely in Postgres.
ALTER TABLE "news_and_awards" DROP COLUMN IF EXISTS "review_notes";
ALTER TABLE "news_and_awards" DROP COLUMN IF EXISTS "reviewed_at";
ALTER TABLE "news_and_awards" DROP COLUMN IF EXISTS "reviewed_by";
ALTER TABLE "news_and_awards" DROP COLUMN IF EXISTS "submitted_at";
ALTER TABLE "news_and_awards" DROP COLUMN IF EXISTS "submitted_by";
ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "review_notes";
ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "reviewed_at";
ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "reviewed_by";
ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "submitted_at";
ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "submitted_by";
ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "is_featured";
ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "display_order";
ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "author_user_id";
