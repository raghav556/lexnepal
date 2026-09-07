ALTER TABLE `appointments` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `attendance` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `avatar_upload_intents` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `blog_posts` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `career_requirements` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `careers` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `case_team_members` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `cases` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `client_kyc_files` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `client_kyc_upload_intents` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `clients` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `cms_asset_upload_intents` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `cms_settings` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `conflict_checks` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `dm_message_attachments` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `dm_message_reads` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `dm_messages` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `dm_threads` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `document_scan_jobs` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `document_shares` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `document_tag_assignments` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `document_tags` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `document_templates` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `document_upload_intents` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `document_upload_rate_limits` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `documents` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `durable_job_attempts` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `durable_job_effects` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `durable_jobs` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `durable_schedules` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `firm_settings` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `firms` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `firms` SET `deleted_at` = NULL WHERE `slug` = 'srimar-law';
--> statement-breakpoint
ALTER TABLE `hearings` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `job_applications` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `leads` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `leave_balances` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `leave_requests` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `legal_pages` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `message_attachments` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `message_reads` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `messages` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `navigation` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `news_and_awards` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `newsletter_subscribers` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `notifications` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `payroll_run_lines` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `payroll_runs` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `practice_areas` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `research_note_tags` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `research_notes` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `resources` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `sessions` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `signature_envelopes` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `signature_recipients` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `signing_challenges` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `sop_template_tasks` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `sop_templates` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `storage_migration_items` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `task_comments` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `task_watchers` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `tasks` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `template_variables` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `templates` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `testimonials` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `user_educations` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `user_notable_cases` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `user_practice_areas` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `users` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
