CREATE TYPE "public"."payroll_run_status" AS ENUM('draft', 'finalized');--> statement-breakpoint
CREATE TABLE "payroll_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "legacy_convex_id" text UNIQUE,
  "firm_id" uuid NOT NULL REFERENCES "firms"("id"),
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "label" text,
  "status" "payroll_run_status" DEFAULT 'draft' NOT NULL,
  "generated_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "finalized_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "finalized_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);--> statement-breakpoint
CREATE INDEX "payroll_runs_firm_period_idx" ON "payroll_runs" ("firm_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX "payroll_runs_firm_status_idx" ON "payroll_runs" ("firm_id","status");--> statement-breakpoint
CREATE TABLE "payroll_run_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "legacy_convex_id" text UNIQUE,
  "firm_id" uuid NOT NULL REFERENCES "firms"("id"),
  "run_id" uuid NOT NULL REFERENCES "payroll_runs"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE restrict,
  "name" text NOT NULL,
  "role" text NOT NULL,
  "gross" integer NOT NULL,
  "pf" integer NOT NULL,
  "pf_employer" integer NOT NULL,
  "ssf" integer NOT NULL,
  "tax" integer NOT NULL,
  "net" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_run_lines_run_user_unique" ON "payroll_run_lines" ("run_id","user_id");--> statement-breakpoint
CREATE INDEX "payroll_run_lines_firm_user_idx" ON "payroll_run_lines" ("firm_id","user_id");--> statement-breakpoint
CREATE INDEX "payroll_run_lines_firm_run_idx" ON "payroll_run_lines" ("firm_id","run_id");
