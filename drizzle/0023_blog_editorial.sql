-- Extend editorial statuses for blog + news
ALTER TYPE "public"."blog_status" ADD VALUE IF NOT EXISTS 'pending_review';
--> statement-breakpoint
ALTER TYPE "public"."blog_status" ADD VALUE IF NOT EXISTS 'rejected';
--> statement-breakpoint
ALTER TYPE "public"."news_status" ADD VALUE IF NOT EXISTS 'pending_review';
--> statement-breakpoint
ALTER TYPE "public"."news_status" ADD VALUE IF NOT EXISTS 'rejected';
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "author_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "display_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "is_featured" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "submitted_by" uuid;
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "submitted_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "reviewed_by" uuid;
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "review_notes" text;
--> statement-breakpoint
ALTER TABLE "news_and_awards" ADD COLUMN IF NOT EXISTS "submitted_by" uuid;
--> statement-breakpoint
ALTER TABLE "news_and_awards" ADD COLUMN IF NOT EXISTS "submitted_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "news_and_awards" ADD COLUMN IF NOT EXISTS "reviewed_by" uuid;
--> statement-breakpoint
ALTER TABLE "news_and_awards" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "news_and_awards" ADD COLUMN IF NOT EXISTS "review_notes" text;
