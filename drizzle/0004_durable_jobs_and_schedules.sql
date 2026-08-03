CREATE TYPE "public"."durable_job_status" AS ENUM('pending', 'processing', 'retry', 'completed', 'dead_letter', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."durable_job_attempt_outcome" AS ENUM('processing', 'completed', 'retry', 'dead_letter', 'lease_expired');--> statement-breakpoint
CREATE TABLE "durable_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "legacy_convex_id" text UNIQUE,
  "firm_id" uuid NOT NULL REFERENCES "firms"("id") ON DELETE restrict,
  "type" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" "durable_job_status" DEFAULT 'pending' NOT NULL,
  "priority" integer DEFAULT 100 NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "total_attempts" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 5 NOT NULL,
  "timeout_seconds" integer DEFAULT 300 NOT NULL,
  "available_at" timestamptz DEFAULT now() NOT NULL,
  "locked_at" timestamptz,
  "locked_by" text,
  "lease_expires_at" timestamptz,
  "last_error" text,
  "result" jsonb,
  "actor_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE restrict,
  "correlation_id" text,
  "completed_at" timestamptz,
  "dead_lettered_at" timestamptz,
  "manual_retry_count" integer DEFAULT 0 NOT NULL,
  "last_manual_retry_at" timestamptz,
  "last_manual_retry_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  CONSTRAINT "durable_jobs_attempts_check" CHECK (attempts >= 0 AND total_attempts >= attempts AND max_attempts BETWEEN 1 AND 20),
  CONSTRAINT "durable_jobs_timeout_check" CHECK (timeout_seconds BETWEEN 1 AND 86400),
  CONSTRAINT "durable_jobs_priority_check" CHECK (priority BETWEEN 0 AND 1000)
);--> statement-breakpoint
CREATE UNIQUE INDEX "durable_jobs_idempotency_unique" ON "durable_jobs" ("firm_id", "type", "idempotency_key");--> statement-breakpoint
CREATE INDEX "durable_jobs_claim_idx" ON "durable_jobs" ("status", "available_at", "priority", "created_at") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "durable_jobs_firm_status_idx" ON "durable_jobs" ("firm_id", "status", "created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "durable_jobs_firm_id_id_unique" ON "durable_jobs" ("firm_id", "id");--> statement-breakpoint
ALTER TABLE "durable_jobs"
  ADD CONSTRAINT "durable_jobs_actor_same_firm_fk" FOREIGN KEY ("firm_id", "actor_user_id") REFERENCES "users" ("firm_id", "id"),
  ADD CONSTRAINT "durable_jobs_manual_retry_actor_same_firm_fk" FOREIGN KEY ("firm_id", "last_manual_retry_by") REFERENCES "users" ("firm_id", "id");--> statement-breakpoint

CREATE TABLE "durable_job_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "legacy_convex_id" text UNIQUE,
  "firm_id" uuid NOT NULL REFERENCES "firms"("id") ON DELETE restrict,
  "job_id" uuid NOT NULL REFERENCES "durable_jobs"("id") ON DELETE cascade,
  "attempt_number" integer NOT NULL,
  "worker_id" text NOT NULL,
  "outcome" "durable_job_attempt_outcome" DEFAULT 'processing' NOT NULL,
  "started_at" timestamptz NOT NULL,
  "completed_at" timestamptz,
  "duration_ms" integer,
  "error" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  CONSTRAINT "durable_job_attempts_number_check" CHECK (attempt_number > 0),
  CONSTRAINT "durable_job_attempts_duration_check" CHECK (duration_ms IS NULL OR duration_ms >= 0)
);--> statement-breakpoint
CREATE UNIQUE INDEX "durable_job_attempts_number_unique" ON "durable_job_attempts" ("firm_id", "job_id", "attempt_number");--> statement-breakpoint
CREATE INDEX "durable_job_attempts_job_idx" ON "durable_job_attempts" ("firm_id", "job_id", "started_at");--> statement-breakpoint
ALTER TABLE "durable_job_attempts" ADD CONSTRAINT "durable_job_attempts_same_firm_fk" FOREIGN KEY ("firm_id", "job_id") REFERENCES "durable_jobs" ("firm_id", "id");--> statement-breakpoint

CREATE TABLE "durable_job_effects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "legacy_convex_id" text UNIQUE,
  "firm_id" uuid NOT NULL REFERENCES "firms"("id") ON DELETE restrict,
  "job_id" uuid NOT NULL REFERENCES "durable_jobs"("id") ON DELETE cascade,
  "effect_key" text NOT NULL,
  "details" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz
);--> statement-breakpoint
CREATE UNIQUE INDEX "durable_job_effects_key_unique" ON "durable_job_effects" ("firm_id", "job_id", "effect_key");--> statement-breakpoint
ALTER TABLE "durable_job_effects" ADD CONSTRAINT "durable_job_effects_same_firm_fk" FOREIGN KEY ("firm_id", "job_id") REFERENCES "durable_jobs" ("firm_id", "id");--> statement-breakpoint

CREATE TABLE "durable_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "legacy_convex_id" text UNIQUE,
  "firm_id" uuid NOT NULL REFERENCES "firms"("id") ON DELETE restrict,
  "name" text NOT NULL,
  "job_type" text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "interval_seconds" integer NOT NULL,
  "next_run_at" timestamptz NOT NULL,
  "actor_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE restrict,
  "max_attempts" integer DEFAULT 5 NOT NULL,
  "timeout_seconds" integer DEFAULT 300 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "last_enqueued_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz,
  CONSTRAINT "durable_schedules_interval_check" CHECK (interval_seconds BETWEEN 60 AND 31536000),
  CONSTRAINT "durable_schedules_attempts_check" CHECK (max_attempts BETWEEN 1 AND 20),
  CONSTRAINT "durable_schedules_timeout_check" CHECK (timeout_seconds BETWEEN 1 AND 86400)
);--> statement-breakpoint
CREATE UNIQUE INDEX "durable_schedules_firm_name_unique" ON "durable_schedules" ("firm_id", "name");--> statement-breakpoint
CREATE INDEX "durable_schedules_due_idx" ON "durable_schedules" ("is_active", "next_run_at") WHERE "deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "durable_schedules" ADD CONSTRAINT "durable_schedules_actor_same_firm_fk" FOREIGN KEY ("firm_id", "actor_user_id") REFERENCES "users" ("firm_id", "id");
