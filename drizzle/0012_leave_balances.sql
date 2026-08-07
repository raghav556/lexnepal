CREATE TABLE "leave_balances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "legacy_convex_id" text UNIQUE,
  "firm_id" uuid NOT NULL REFERENCES "firms"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE restrict,
  "type" "leave_type" NOT NULL,
  "year" integer NOT NULL,
  "entitled_days" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX "leave_balances_firm_user_type_year_unique" ON "leave_balances" ("firm_id","user_id","type","year");--> statement-breakpoint
CREATE INDEX "leave_balances_firm_user_year_idx" ON "leave_balances" ("firm_id","user_id","year");
