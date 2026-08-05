DROP INDEX IF EXISTS "trust_transactions_firm_idempotency_unique";
DROP INDEX IF EXISTS "payments_firm_idempotency_unique";
ALTER TABLE "trust_transactions" DROP COLUMN IF EXISTS "idempotency_key";
ALTER TABLE "payments" DROP COLUMN IF EXISTS "idempotency_key";
