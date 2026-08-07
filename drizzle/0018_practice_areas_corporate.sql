ALTER TABLE "practice_areas" ADD COLUMN "display_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "practice_areas" ADD COLUMN "long_description" text;--> statement-breakpoint
ALTER TABLE "practice_areas" ADD COLUMN "faqs" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "practice_areas" ADD COLUMN "cover_image_url" text;--> statement-breakpoint
ALTER TABLE "practice_areas" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "practice_areas" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "practice_areas" ADD COLUMN "show_on_home" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "practice_areas_firm_active_order_idx" ON "practice_areas" USING btree ("firm_id","is_active","display_order");
