-- Development/rehearsal rollback for the initial schema only.
-- Never run after production data exists. Production rollback uses PITR/restore.
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
