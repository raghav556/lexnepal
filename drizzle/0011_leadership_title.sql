-- Public leadership title (e.g. Managing Partner) separate from system role.
ALTER TABLE "users" ADD COLUMN "leadership_title" text;
