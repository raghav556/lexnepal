ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_lead_id_leads_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "appointments_firm_lead_idx";--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN IF EXISTS "lead_id";
