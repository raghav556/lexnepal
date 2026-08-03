CREATE TABLE "client_kyc_upload_intents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "legacy_convex_id" text UNIQUE,
  "firm_id" uuid NOT NULL REFERENCES "firms"("id") ON DELETE restrict,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE restrict,
  "document_type" "kyc_document_type" NOT NULL,
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
  "deleted_at" timestamptz,
  CONSTRAINT "client_kyc_upload_intents_size_check" CHECK ("declared_size_bytes" BETWEEN 1 AND 26214400),
  CONSTRAINT "client_kyc_upload_intents_mime_check" CHECK ("declared_mime_type" IN ('application/pdf', 'image/jpeg', 'image/png'))
);--> statement-breakpoint
CREATE UNIQUE INDEX "client_kyc_upload_intents_quarantine_key_unique" ON "client_kyc_upload_intents" ("quarantine_key");--> statement-breakpoint
CREATE INDEX "client_kyc_upload_intents_client_idx" ON "client_kyc_upload_intents" ("firm_id", "client_id");--> statement-breakpoint
CREATE INDEX "client_kyc_upload_intents_status_idx" ON "client_kyc_upload_intents" ("firm_id", "status", "expires_at");--> statement-breakpoint
ALTER TABLE "client_kyc_upload_intents" ADD CONSTRAINT "client_kyc_upload_intents_firm_client_fk" FOREIGN KEY ("firm_id", "client_id") REFERENCES "clients"("firm_id", "id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "client_kyc_upload_intents" ADD CONSTRAINT "client_kyc_upload_intents_firm_user_fk" FOREIGN KEY ("firm_id", "user_id") REFERENCES "users"("firm_id", "id") ON DELETE restrict;
