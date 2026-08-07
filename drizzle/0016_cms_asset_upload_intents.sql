CREATE TABLE "cms_asset_upload_intents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "legacy_convex_id" text UNIQUE,
  "firm_id" uuid NOT NULL REFERENCES "firms"("id") ON DELETE restrict,
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "purpose" text NOT NULL,
  "original_file_name" text NOT NULL,
  "declared_mime_type" text NOT NULL,
  "declared_size_bytes" bigint NOT NULL,
  "expected_sha256" text,
  "actual_sha256" text,
  "quarantine_key" text NOT NULL,
  "protected_key" text,
  "status" "upload_intent_status" DEFAULT 'pending' NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "uploaded_at" timestamptz,
  "completed_at" timestamptz,
  "failure_code" text,
  "failure_details" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz
);--> statement-breakpoint
CREATE UNIQUE INDEX "cms_asset_upload_intents_quarantine_key_unique" ON "cms_asset_upload_intents" USING btree ("quarantine_key");--> statement-breakpoint
CREATE INDEX "cms_asset_upload_intents_firm_status_idx" ON "cms_asset_upload_intents" USING btree ("firm_id", "status", "expires_at");--> statement-breakpoint
CREATE INDEX "cms_asset_upload_intents_creator_idx" ON "cms_asset_upload_intents" USING btree ("firm_id", "created_by");
