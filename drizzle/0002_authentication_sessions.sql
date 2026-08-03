ALTER TABLE "sessions" ADD COLUMN "token_hash" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "identity_subject" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "request_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "revoked_by" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "revocation_reason" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_expiry_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE sessions
  ADD CONSTRAINT sessions_revoker_same_firm_fk
    FOREIGN KEY (firm_id, revoked_by) REFERENCES users (firm_id, id),
  ADD CONSTRAINT sessions_auth_fields_complete_check
    CHECK (token_hash IS NULL OR (identity_subject IS NOT NULL AND expires_at IS NOT NULL));
