-- R12 Stage E: drop leftover closed_won/closed_lost from cases.status after Stage D
-- proved those values unused. API Zod still accepts them as aliases of closed + outcome.
-- MySQL rejects this MODIFY if any row still stores closed_won or closed_lost.
-- Recovery: restore from mysqldump (`npm run local:mysql:backup`). ENUM contraction
-- is not safely undone by a down migration.
ALTER TABLE `cases` MODIFY `status` enum('inquiry','active','on_hold','closed') NOT NULL;
