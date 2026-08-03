CREATE TYPE "public"."processing_job_status" AS ENUM('pending', 'processing', 'retry', 'completed', 'dead_letter');--> statement-breakpoint
CREATE TYPE "public"."storage_migration_status" AS ENUM('pending', 'copied', 'verified', 'failed');--> statement-breakpoint
CREATE TYPE "public"."upload_intent_status" AS ENUM('pending', 'uploaded', 'scanning', 'promoted', 'rejected', 'expired');--> statement-breakpoint
CREATE TABLE "document_scan_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"upload_intent_id" uuid NOT NULL,
	"status" "processing_job_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"last_error" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "document_scan_jobs_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "document_upload_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"case_id" uuid,
	"parent_document_id" uuid,
	"document_id" uuid,
	"original_file_name" text NOT NULL,
	"declared_mime_type" text NOT NULL,
	"declared_size_bytes" bigint NOT NULL,
	"expected_sha256" text,
	"actual_sha256" text,
	"quarantine_key" text NOT NULL,
	"protected_key" text,
	"status" "upload_intent_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"uploaded_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failure_code" text,
	"failure_details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "document_upload_intents_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "storage_migration_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"legacy_storage_id" text NOT NULL,
	"destination_key" text NOT NULL,
	"expected_sha256" text,
	"actual_sha256" text,
	"size_bytes" bigint,
	"status" "storage_migration_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "storage_migration_items_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
ALTER TABLE "document_scan_jobs" ADD CONSTRAINT "document_scan_jobs_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_scan_jobs" ADD CONSTRAINT "document_scan_jobs_upload_intent_id_document_upload_intents_id_fk" FOREIGN KEY ("upload_intent_id") REFERENCES "public"."document_upload_intents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_upload_intents" ADD CONSTRAINT "document_upload_intents_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_upload_intents" ADD CONSTRAINT "document_upload_intents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_upload_intents" ADD CONSTRAINT "document_upload_intents_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_upload_intents" ADD CONSTRAINT "document_upload_intents_parent_document_id_documents_id_fk" FOREIGN KEY ("parent_document_id") REFERENCES "public"."documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_upload_intents" ADD CONSTRAINT "document_upload_intents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_migration_items" ADD CONSTRAINT "storage_migration_items_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_scan_jobs_intent_unique" ON "document_scan_jobs" USING btree ("firm_id","upload_intent_id");--> statement-breakpoint
CREATE INDEX "document_scan_jobs_available_idx" ON "document_scan_jobs" USING btree ("status","available_at");--> statement-breakpoint
CREATE UNIQUE INDEX "document_upload_intents_quarantine_key_unique" ON "document_upload_intents" USING btree ("quarantine_key");--> statement-breakpoint
CREATE INDEX "document_upload_intents_firm_status_expiry_idx" ON "document_upload_intents" USING btree ("firm_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "document_upload_intents_creator_idx" ON "document_upload_intents" USING btree ("firm_id","created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "storage_migration_items_legacy_unique" ON "storage_migration_items" USING btree ("firm_id","legacy_storage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "storage_migration_items_destination_unique" ON "storage_migration_items" USING btree ("destination_key");--> statement-breakpoint
CREATE INDEX "storage_migration_items_firm_status_idx" ON "storage_migration_items" USING btree ("firm_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX document_scan_jobs_firm_id_id_unique ON document_scan_jobs (firm_id, id);--> statement-breakpoint
CREATE UNIQUE INDEX document_upload_intents_firm_id_id_unique ON document_upload_intents (firm_id, id);--> statement-breakpoint
CREATE UNIQUE INDEX storage_migration_items_firm_id_id_unique ON storage_migration_items (firm_id, id);--> statement-breakpoint
ALTER TABLE document_upload_intents
  ADD CONSTRAINT upload_intents_creator_same_firm_fk FOREIGN KEY (firm_id, created_by) REFERENCES users (firm_id, id),
  ADD CONSTRAINT upload_intents_case_same_firm_fk FOREIGN KEY (firm_id, case_id) REFERENCES cases (firm_id, id),
  ADD CONSTRAINT upload_intents_parent_same_firm_fk FOREIGN KEY (firm_id, parent_document_id) REFERENCES documents (firm_id, id),
  ADD CONSTRAINT upload_intents_document_same_firm_fk FOREIGN KEY (firm_id, document_id) REFERENCES documents (firm_id, id),
  ADD CONSTRAINT upload_intents_size_check CHECK (declared_size_bytes > 0 AND declared_size_bytes <= 52428800),
  ADD CONSTRAINT upload_intents_expected_sha_check CHECK (expected_sha256 IS NULL OR expected_sha256 ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT upload_intents_actual_sha_check CHECK (actual_sha256 IS NULL OR actual_sha256 ~ '^[0-9a-f]{64}$');--> statement-breakpoint
ALTER TABLE document_scan_jobs
  ADD CONSTRAINT document_scan_jobs_same_firm_fk FOREIGN KEY (firm_id, upload_intent_id) REFERENCES document_upload_intents (firm_id, id),
  ADD CONSTRAINT document_scan_jobs_attempts_check CHECK (attempts >= 0 AND max_attempts BETWEEN 1 AND 20 AND attempts <= max_attempts);--> statement-breakpoint
ALTER TABLE storage_migration_items
  ADD CONSTRAINT storage_migration_items_attempts_check CHECK (attempts >= 0),
  ADD CONSTRAINT storage_migration_expected_sha_check CHECK (expected_sha256 IS NULL OR expected_sha256 ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT storage_migration_actual_sha_check CHECK (actual_sha256 IS NULL OR actual_sha256 ~ '^[0-9a-f]{64}$');
