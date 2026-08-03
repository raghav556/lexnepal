DROP INDEX IF EXISTS "audit_log_firm_request_id_idx";
ALTER TABLE "audit_log" DROP COLUMN IF EXISTS "request_id";
