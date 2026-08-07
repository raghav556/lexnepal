ALTER TABLE "news_and_awards" ADD COLUMN IF NOT EXISTS "slug" text;
--> statement-breakpoint
ALTER TABLE "news_and_awards" ADD COLUMN IF NOT EXISTS "seo_title" text;
--> statement-breakpoint
ALTER TABLE "news_and_awards" ADD COLUMN IF NOT EXISTS "seo_description" text;
--> statement-breakpoint
ALTER TABLE "news_and_awards" ADD COLUMN IF NOT EXISTS "display_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "news_and_awards" ADD COLUMN IF NOT EXISTS "is_featured" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "news_and_awards"
SET "slug" = lower(regexp_replace(regexp_replace(coalesce(trim("title"), 'news-update'), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
WHERE "slug" IS NULL OR trim("slug") = '';
--> statement-breakpoint
UPDATE "news_and_awards" n
SET "slug" = n."slug" || '-' || substr(replace(n."id"::text, '-', ''), 1, 8)
FROM (
  SELECT "firm_id", "slug", min("id"::text) AS keep_id
  FROM "news_and_awards"
  WHERE "deleted_at" IS NULL
  GROUP BY "firm_id", "slug"
  HAVING count(*) > 1
) d
WHERE n."firm_id" = d."firm_id"
  AND n."slug" = d."slug"
  AND n."id"::text <> d.keep_id
  AND n."deleted_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "news_and_awards" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "news_and_awards_firm_slug_unique" ON "news_and_awards" USING btree ("firm_id","slug");
