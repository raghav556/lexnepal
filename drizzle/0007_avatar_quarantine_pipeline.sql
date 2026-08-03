CREATE TABLE "avatar_upload_intents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "legacy_convex_id" text UNIQUE,
  "firm_id" uuid NOT NULL REFERENCES "firms"("id") ON DELETE restrict,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
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
CREATE UNIQUE INDEX "avatar_upload_intents_quarantine_key_unique" ON "avatar_upload_intents" USING btree ("quarantine_key");--> statement-breakpoint
CREATE INDEX "avatar_upload_intents_firm_status_idx" ON "avatar_upload_intents" USING btree ("firm_id", "status", "expires_at");--> statement-breakpoint
CREATE INDEX "avatar_upload_intents_user_idx" ON "avatar_upload_intents" USING btree ("firm_id", "user_id");
