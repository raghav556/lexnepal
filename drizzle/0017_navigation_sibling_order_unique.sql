DROP INDEX IF EXISTS "navigation_firm_location_order_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "navigation_firm_location_root_order_unique" ON "navigation" USING btree ("firm_id","location","display_order") WHERE "parent_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "navigation_firm_location_child_order_unique" ON "navigation" USING btree ("firm_id","location","parent_id","display_order") WHERE "parent_id" is not null;
