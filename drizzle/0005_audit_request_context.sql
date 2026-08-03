ALTER TABLE "audit_log" ADD COLUMN "request_id" text;
CREATE INDEX "audit_log_firm_request_id_idx" ON "audit_log" USING btree ("firm_id", "request_id");
