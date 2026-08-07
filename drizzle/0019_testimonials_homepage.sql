ALTER TABLE "testimonials" ADD COLUMN "display_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN "show_on_home" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "testimonials_firm_approved_order_idx" ON "testimonials" USING btree ("firm_id","is_approved","display_order");
