DROP INDEX IF EXISTS "research_notes_firm_case_idx";
ALTER TABLE research_notes DROP CONSTRAINT IF EXISTS research_notes_case_same_firm_fk;
ALTER TABLE "research_notes" DROP CONSTRAINT IF EXISTS "research_notes_case_id_cases_id_fk";
ALTER TABLE "research_notes" DROP COLUMN IF EXISTS "citation_bench";
ALTER TABLE "research_notes" DROP COLUMN IF EXISTS "citation_decision_no";
ALTER TABLE "research_notes" DROP COLUMN IF EXISTS "citation_nkp_no";
ALTER TABLE "research_notes" DROP COLUMN IF EXISTS "case_id";
