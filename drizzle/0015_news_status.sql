CREATE TYPE "news_status" AS ENUM('draft', 'published');--> statement-breakpoint
ALTER TABLE "news_and_awards" ADD COLUMN "status" "news_status" DEFAULT 'published' NOT NULL;--> statement-breakpoint
CREATE INDEX "news_and_awards_firm_status_idx" ON "news_and_awards" ("firm_id","status");
