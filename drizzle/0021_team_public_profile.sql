ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "public_phone" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_order" integer DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "languages" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "years_experience" integer;
