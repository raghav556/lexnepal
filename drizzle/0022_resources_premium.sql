CREATE TYPE "public"."resource_status" AS ENUM('draft', 'published');
--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "status" "resource_status" DEFAULT 'published' NOT NULL;
--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "slug" text;
--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "seo_title" text;
--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "seo_description" text;
--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "display_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "resources"
SET "slug" = lower(regexp_replace(regexp_replace(coalesce(trim("title"), 'resource'), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
WHERE "slug" IS NULL OR trim("slug") = '';
--> statement-breakpoint
UPDATE "resources" r
SET "slug" = r."slug" || '-' || substr(replace(r."id"::text, '-', ''), 1, 8)
FROM (
  SELECT "firm_id", "slug", min("id"::text) AS keep_id
  FROM "resources"
  WHERE "deleted_at" IS NULL
  GROUP BY "firm_id", "slug"
  HAVING count(*) > 1
) d
WHERE r."firm_id" = d."firm_id"
  AND r."slug" = d."slug"
  AND r."id"::text <> d.keep_id
  AND r."deleted_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "resources_firm_slug_unique" ON "resources" USING btree ("firm_id","slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resources_firm_status_idx" ON "resources" USING btree ("firm_id","status");
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "resource_id" uuid;
