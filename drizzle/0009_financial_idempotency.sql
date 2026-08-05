ALTER TABLE "payments" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "trust_transactions" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_firm_idempotency_unique" ON "payments" ("firm_id", "idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "trust_transactions_firm_idempotency_unique" ON "trust_transactions" ("firm_id", "idempotency_key");
