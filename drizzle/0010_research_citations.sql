-- Research notes keep the precedent citation (Nepal Kanoon Patrika) and the matter they belong to.
ALTER TABLE "research_notes" ADD COLUMN "case_id" uuid;--> statement-breakpoint
ALTER TABLE "research_notes" ADD COLUMN "citation_nkp_no" text;--> statement-breakpoint
ALTER TABLE "research_notes" ADD COLUMN "citation_decision_no" text;--> statement-breakpoint
ALTER TABLE "research_notes" ADD COLUMN "citation_bench" text;--> statement-breakpoint
ALTER TABLE "research_notes" ADD CONSTRAINT "research_notes_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE research_notes ADD CONSTRAINT research_notes_case_same_firm_fk FOREIGN KEY (firm_id, case_id) REFERENCES cases (firm_id, id);--> statement-breakpoint
CREATE INDEX "research_notes_firm_case_idx" ON "research_notes" USING btree ("firm_id","case_id");
