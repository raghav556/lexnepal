-- Preserve the tenant-isolation guarantees that lived in the former hand-written migrations.
-- Composite candidate keys are required by MySQL before tenant-scoped foreign keys can be added.
CREATE UNIQUE INDEX `appointments_firm_id_id_unique` ON `appointments` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_firm_id_id_unique` ON `attendance` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_log_firm_id_id_unique` ON `audit_log` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `avatar_upload_intents_firm_id_id_unique` ON `avatar_upload_intents` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `blog_posts_firm_id_id_unique` ON `blog_posts` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `career_requirements_firm_id_id_unique` ON `career_requirements` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `careers_firm_id_id_unique` ON `careers` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `case_team_members_firm_id_id_unique` ON `case_team_members` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `cases_firm_id_id_unique` ON `cases` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_kyc_files_firm_id_id_unique` ON `client_kyc_files` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_kyc_upload_intents_firm_id_id_unique` ON `client_kyc_upload_intents` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_firm_id_id_unique` ON `clients` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_asset_upload_intents_firm_id_id_unique` ON `cms_asset_upload_intents` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_settings_firm_id_id_unique` ON `cms_settings` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `conflict_checks_firm_id_id_unique` ON `conflict_checks` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `dm_message_attachments_firm_id_id_unique` ON `dm_message_attachments` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `dm_message_reads_firm_id_id_unique` ON `dm_message_reads` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `dm_messages_firm_id_id_unique` ON `dm_messages` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `dm_threads_firm_id_id_unique` ON `dm_threads` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_scan_jobs_firm_id_id_unique` ON `document_scan_jobs` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_shares_firm_id_id_unique` ON `document_shares` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_tag_assignments_firm_id_id_unique` ON `document_tag_assignments` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_tags_firm_id_id_unique` ON `document_tags` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_templates_firm_id_id_unique` ON `document_templates` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_upload_intents_firm_id_id_unique` ON `document_upload_intents` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_upload_rate_limits_firm_id_id_unique` ON `document_upload_rate_limits` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `documents_firm_id_id_unique` ON `documents` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `durable_job_attempts_firm_id_id_unique` ON `durable_job_attempts` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `durable_job_effects_firm_id_id_unique` ON `durable_job_effects` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `durable_jobs_firm_id_id_unique` ON `durable_jobs` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `durable_schedules_firm_id_id_unique` ON `durable_schedules` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `firm_settings_firm_id_id_unique` ON `firm_settings` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `hearings_firm_id_id_unique` ON `hearings` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_applications_firm_id_id_unique` ON `job_applications` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_firm_id_id_unique` ON `leads` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `leave_balances_firm_id_id_unique` ON `leave_balances` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `leave_requests_firm_id_id_unique` ON `leave_requests` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `legal_pages_firm_id_id_unique` ON `legal_pages` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_attachments_firm_id_id_unique` ON `message_attachments` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_reads_firm_id_id_unique` ON `message_reads` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `messages_firm_id_id_unique` ON `messages` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `navigation_firm_id_id_unique` ON `navigation` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `news_and_awards_firm_id_id_unique` ON `news_and_awards` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_subscribers_firm_id_id_unique` ON `newsletter_subscribers` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_firm_id_id_unique` ON `notifications` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `payroll_run_lines_firm_id_id_unique` ON `payroll_run_lines` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `payroll_runs_firm_id_id_unique` ON `payroll_runs` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `practice_areas_firm_id_id_unique` ON `practice_areas` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `research_note_tags_firm_id_id_unique` ON `research_note_tags` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `research_notes_firm_id_id_unique` ON `research_notes` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `resources_firm_id_id_unique` ON `resources` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_firm_id_id_unique` ON `sessions` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `signature_envelopes_firm_id_id_unique` ON `signature_envelopes` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `signature_recipients_firm_id_id_unique` ON `signature_recipients` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `signing_challenges_firm_id_id_unique` ON `signing_challenges` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `sop_template_tasks_firm_id_id_unique` ON `sop_template_tasks` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `sop_templates_firm_id_id_unique` ON `sop_templates` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `storage_migration_items_firm_id_id_unique` ON `storage_migration_items` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_comments_firm_id_id_unique` ON `task_comments` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_watchers_firm_id_id_unique` ON `task_watchers` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_firm_id_id_unique` ON `tasks` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `template_variables_firm_id_id_unique` ON `template_variables` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `templates_firm_id_id_unique` ON `templates` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `testimonials_firm_id_id_unique` ON `testimonials` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_educations_firm_id_id_unique` ON `user_educations` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_notable_cases_firm_id_id_unique` ON `user_notable_cases` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_practice_areas_firm_id_id_unique` ON `user_practice_areas` (`firm_id`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_firm_id_id_unique` ON `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `users`
  ADD CONSTRAINT `users_invited_by_same_firm_fk` FOREIGN KEY (`firm_id`, `invited_by`) REFERENCES `users` (`firm_id`, `id`),
  ADD CONSTRAINT `users_deactivated_by_same_firm_fk` FOREIGN KEY (`firm_id`, `deactivated_by`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `user_educations` ADD CONSTRAINT `user_educations_same_firm_fk` FOREIGN KEY (`firm_id`, `user_id`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `user_practice_areas` ADD CONSTRAINT `user_practice_areas_same_firm_fk` FOREIGN KEY (`firm_id`, `user_id`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `user_notable_cases` ADD CONSTRAINT `user_notable_cases_same_firm_fk` FOREIGN KEY (`firm_id`, `user_id`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `conflict_checks` ADD CONSTRAINT `conflict_checks_run_by_same_firm_fk` FOREIGN KEY (`firm_id`, `run_by`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `clients`
  ADD CONSTRAINT `clients_user_same_firm_fk` FOREIGN KEY (`firm_id`, `user_id`) REFERENCES `users` (`firm_id`, `id`),
  ADD CONSTRAINT `clients_reviewer_same_firm_fk` FOREIGN KEY (`firm_id`, `kyc_reviewed_by`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `client_kyc_files` ADD CONSTRAINT `client_kyc_files_same_firm_fk` FOREIGN KEY (`firm_id`, `client_id`) REFERENCES `clients` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `cases`
  ADD CONSTRAINT `cases_client_same_firm_fk` FOREIGN KEY (`firm_id`, `client_id`) REFERENCES `clients` (`firm_id`, `id`),
  ADD CONSTRAINT `cases_lawyer_same_firm_fk` FOREIGN KEY (`firm_id`, `assigned_lawyer_id`) REFERENCES `users` (`firm_id`, `id`),
  ADD CONSTRAINT `cases_clearer_same_firm_fk` FOREIGN KEY (`firm_id`, `conflict_cleared_by`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `case_team_members`
  ADD CONSTRAINT `case_team_case_same_firm_fk` FOREIGN KEY (`firm_id`, `case_id`) REFERENCES `cases` (`firm_id`, `id`),
  ADD CONSTRAINT `case_team_user_same_firm_fk` FOREIGN KEY (`firm_id`, `user_id`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `templates` ADD CONSTRAINT `templates_creator_same_firm_fk` FOREIGN KEY (`firm_id`, `created_by`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `template_variables` ADD CONSTRAINT `template_variables_same_firm_fk` FOREIGN KEY (`firm_id`, `template_id`) REFERENCES `templates` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `hearings` ADD CONSTRAINT `hearings_case_same_firm_fk` FOREIGN KEY (`firm_id`, `case_id`) REFERENCES `cases` (`firm_id`, `id`);
--> statement-breakpoint

ALTER TABLE `documents`
  ADD CONSTRAINT `documents_case_same_firm_fk` FOREIGN KEY (`firm_id`, `case_id`) REFERENCES `cases` (`firm_id`, `id`),
  ADD CONSTRAINT `documents_parent_same_firm_fk` FOREIGN KEY (`firm_id`, `parent_document_id`) REFERENCES `documents` (`firm_id`, `id`),
  ADD CONSTRAINT `documents_uploader_same_firm_fk` FOREIGN KEY (`firm_id`, `uploaded_by`) REFERENCES `users` (`firm_id`, `id`),
  ADD CONSTRAINT `documents_locker_same_firm_fk` FOREIGN KEY (`firm_id`, `locked_by`) REFERENCES `users` (`firm_id`, `id`),
  ADD CONSTRAINT `documents_hold_actor_same_firm_fk` FOREIGN KEY (`firm_id`, `legal_hold_set_by`) REFERENCES `users` (`firm_id`, `id`),
  ADD CONSTRAINT `documents_intended_signer_same_firm_fk` FOREIGN KEY (`firm_id`, `intended_signer_user_id`) REFERENCES `users` (`firm_id`, `id`),
  ADD CONSTRAINT `documents_signer_same_firm_fk` FOREIGN KEY (`firm_id`, `signed_by_user_id`) REFERENCES `users` (`firm_id`, `id`),
  ADD CONSTRAINT `documents_deleter_same_firm_fk` FOREIGN KEY (`firm_id`, `deleted_by`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `document_tag_assignments`
  ADD CONSTRAINT `document_tag_doc_same_firm_fk` FOREIGN KEY (`firm_id`, `document_id`) REFERENCES `documents` (`firm_id`, `id`),
  ADD CONSTRAINT `document_tag_tag_same_firm_fk` FOREIGN KEY (`firm_id`, `tag_id`) REFERENCES `document_tags` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `document_shares`
  ADD CONSTRAINT `document_shares_doc_same_firm_fk` FOREIGN KEY (`firm_id`, `document_id`) REFERENCES `documents` (`firm_id`, `id`),
  ADD CONSTRAINT `document_shares_creator_same_firm_fk` FOREIGN KEY (`firm_id`, `created_by`) REFERENCES `users` (`firm_id`, `id`),
  ADD CONSTRAINT `document_shares_revoker_same_firm_fk` FOREIGN KEY (`firm_id`, `revoked_by`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `document_upload_rate_limits` ADD CONSTRAINT `document_rate_user_same_firm_fk` FOREIGN KEY (`firm_id`, `user_id`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `signature_envelopes`
  ADD CONSTRAINT `envelopes_document_same_firm_fk` FOREIGN KEY (`firm_id`, `document_id`) REFERENCES `documents` (`firm_id`, `id`),
  ADD CONSTRAINT `envelopes_case_same_firm_fk` FOREIGN KEY (`firm_id`, `case_id`) REFERENCES `cases` (`firm_id`, `id`),
  ADD CONSTRAINT `envelopes_creator_same_firm_fk` FOREIGN KEY (`firm_id`, `created_by`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `signature_recipients`
  ADD CONSTRAINT `recipients_envelope_same_firm_fk` FOREIGN KEY (`firm_id`, `envelope_id`) REFERENCES `signature_envelopes` (`firm_id`, `id`),
  ADD CONSTRAINT `recipients_user_same_firm_fk` FOREIGN KEY (`firm_id`, `user_id`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `signing_challenges`
  ADD CONSTRAINT `challenges_user_same_firm_fk` FOREIGN KEY (`firm_id`, `user_id`) REFERENCES `users` (`firm_id`, `id`),
  ADD CONSTRAINT `challenges_document_same_firm_fk` FOREIGN KEY (`firm_id`, `document_id`) REFERENCES `documents` (`firm_id`, `id`),
  ADD CONSTRAINT `challenges_envelope_same_firm_fk` FOREIGN KEY (`firm_id`, `envelope_id`) REFERENCES `signature_envelopes` (`firm_id`, `id`);
--> statement-breakpoint

ALTER TABLE `tasks`
  ADD CONSTRAINT `tasks_case_same_firm_fk` FOREIGN KEY (`firm_id`, `case_id`) REFERENCES `cases` (`firm_id`, `id`),
  ADD CONSTRAINT `tasks_assignee_same_firm_fk` FOREIGN KEY (`firm_id`, `assigned_to`) REFERENCES `users` (`firm_id`, `id`),
  ADD CONSTRAINT `tasks_creator_same_firm_fk` FOREIGN KEY (`firm_id`, `created_by`) REFERENCES `users` (`firm_id`, `id`),
  ADD CONSTRAINT `tasks_parent_same_firm_fk` FOREIGN KEY (`firm_id`, `parent_task_id`) REFERENCES `tasks` (`firm_id`, `id`),
  ADD CONSTRAINT `tasks_hearing_same_firm_fk` FOREIGN KEY (`firm_id`, `hearing_id`) REFERENCES `hearings` (`firm_id`, `id`),
  ADD CONSTRAINT `tasks_document_same_firm_fk` FOREIGN KEY (`firm_id`, `document_id`) REFERENCES `documents` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `task_watchers`
  ADD CONSTRAINT `task_watchers_task_same_firm_fk` FOREIGN KEY (`firm_id`, `task_id`) REFERENCES `tasks` (`firm_id`, `id`),
  ADD CONSTRAINT `task_watchers_user_same_firm_fk` FOREIGN KEY (`firm_id`, `user_id`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `sop_template_tasks` ADD CONSTRAINT `sop_template_tasks_same_firm_fk` FOREIGN KEY (`firm_id`, `sop_template_id`) REFERENCES `sop_templates` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `task_comments`
  ADD CONSTRAINT `task_comments_task_same_firm_fk` FOREIGN KEY (`firm_id`, `task_id`) REFERENCES `tasks` (`firm_id`, `id`),
  ADD CONSTRAINT `task_comments_author_same_firm_fk` FOREIGN KEY (`firm_id`, `author_id`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint

ALTER TABLE `messages`
  ADD CONSTRAINT `messages_case_same_firm_fk` FOREIGN KEY (`firm_id`, `case_id`) REFERENCES `cases` (`firm_id`, `id`),
  ADD CONSTRAINT `messages_sender_same_firm_fk` FOREIGN KEY (`firm_id`, `sender_id`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `message_attachments` ADD CONSTRAINT `message_attachments_same_firm_fk` FOREIGN KEY (`firm_id`, `message_id`) REFERENCES `messages` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `message_reads`
  ADD CONSTRAINT `message_reads_message_same_firm_fk` FOREIGN KEY (`firm_id`, `message_id`) REFERENCES `messages` (`firm_id`, `id`),
  ADD CONSTRAINT `message_reads_user_same_firm_fk` FOREIGN KEY (`firm_id`, `user_id`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `leads`
  ADD CONSTRAINT `leads_assignee_same_firm_fk` FOREIGN KEY (`firm_id`, `assigned_to`) REFERENCES `users` (`firm_id`, `id`),
  ADD CONSTRAINT `leads_client_same_firm_fk` FOREIGN KEY (`firm_id`, `converted_client_id`) REFERENCES `clients` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_user_same_firm_fk` FOREIGN KEY (`firm_id`, `user_id`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `leave_requests`
  ADD CONSTRAINT `leave_user_same_firm_fk` FOREIGN KEY (`firm_id`, `user_id`) REFERENCES `users` (`firm_id`, `id`),
  ADD CONSTRAINT `leave_reviewer_same_firm_fk` FOREIGN KEY (`firm_id`, `reviewed_by`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_user_same_firm_fk` FOREIGN KEY (`firm_id`, `user_id`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_same_firm_fk` FOREIGN KEY (`firm_id`, `user_id`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `appointments`
  ADD CONSTRAINT `appointments_client_same_firm_fk` FOREIGN KEY (`firm_id`, `client_id`) REFERENCES `clients` (`firm_id`, `id`),
  ADD CONSTRAINT `appointments_lawyer_same_firm_fk` FOREIGN KEY (`firm_id`, `assigned_lawyer_id`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `sessions`
  ADD CONSTRAINT `sessions_user_same_firm_fk` FOREIGN KEY (`firm_id`, `user_id`) REFERENCES `users` (`firm_id`, `id`),
  ADD CONSTRAINT `sessions_revoker_same_firm_fk` FOREIGN KEY (`firm_id`, `revoked_by`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `research_notes`
  ADD CONSTRAINT `research_author_same_firm_fk` FOREIGN KEY (`firm_id`, `author_id`) REFERENCES `users` (`firm_id`, `id`),
  ADD CONSTRAINT `research_notes_case_same_firm_fk` FOREIGN KEY (`firm_id`, `case_id`) REFERENCES `cases` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `research_note_tags` ADD CONSTRAINT `research_tags_note_same_firm_fk` FOREIGN KEY (`firm_id`, `research_note_id`) REFERENCES `research_notes` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `career_requirements` ADD CONSTRAINT `career_requirements_same_firm_fk` FOREIGN KEY (`firm_id`, `career_id`) REFERENCES `careers` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `job_applications` ADD CONSTRAINT `job_applications_same_firm_fk` FOREIGN KEY (`firm_id`, `job_id`) REFERENCES `careers` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `navigation` ADD CONSTRAINT `navigation_parent_same_firm_fk` FOREIGN KEY (`firm_id`, `parent_id`) REFERENCES `navigation` (`firm_id`, `id`);
--> statement-breakpoint

ALTER TABLE `document_upload_intents`
  ADD CONSTRAINT `upload_intents_creator_same_firm_fk` FOREIGN KEY (`firm_id`, `created_by`) REFERENCES `users` (`firm_id`, `id`),
  ADD CONSTRAINT `upload_intents_case_same_firm_fk` FOREIGN KEY (`firm_id`, `case_id`) REFERENCES `cases` (`firm_id`, `id`),
  ADD CONSTRAINT `upload_intents_parent_same_firm_fk` FOREIGN KEY (`firm_id`, `parent_document_id`) REFERENCES `documents` (`firm_id`, `id`),
  ADD CONSTRAINT `upload_intents_document_same_firm_fk` FOREIGN KEY (`firm_id`, `document_id`) REFERENCES `documents` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `document_scan_jobs` ADD CONSTRAINT `document_scan_jobs_same_firm_fk` FOREIGN KEY (`firm_id`, `upload_intent_id`) REFERENCES `document_upload_intents` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `client_kyc_upload_intents`
  ADD CONSTRAINT `client_kyc_upload_intents_firm_client_fk` FOREIGN KEY (`firm_id`, `client_id`) REFERENCES `clients` (`firm_id`, `id`) ON DELETE CASCADE,
  ADD CONSTRAINT `client_kyc_upload_intents_firm_user_fk` FOREIGN KEY (`firm_id`, `user_id`) REFERENCES `users` (`firm_id`, `id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `durable_jobs`
  ADD CONSTRAINT `durable_jobs_actor_same_firm_fk` FOREIGN KEY (`firm_id`, `actor_user_id`) REFERENCES `users` (`firm_id`, `id`),
  ADD CONSTRAINT `durable_jobs_manual_retry_actor_same_firm_fk` FOREIGN KEY (`firm_id`, `last_manual_retry_by`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `durable_job_attempts` ADD CONSTRAINT `durable_job_attempts_same_firm_fk` FOREIGN KEY (`firm_id`, `job_id`) REFERENCES `durable_jobs` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `durable_job_effects` ADD CONSTRAINT `durable_job_effects_same_firm_fk` FOREIGN KEY (`firm_id`, `job_id`) REFERENCES `durable_jobs` (`firm_id`, `id`);
--> statement-breakpoint
ALTER TABLE `durable_schedules` ADD CONSTRAINT `durable_schedules_actor_same_firm_fk` FOREIGN KEY (`firm_id`, `actor_user_id`) REFERENCES `users` (`firm_id`, `id`);
--> statement-breakpoint

-- MySQL 8 enforces these CHECK constraints; REGEXP replaces PostgreSQL's regex operator.
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_size_valid` CHECK (`size_bytes` > 0 AND `size_bytes` <= 52428800),
  ADD CONSTRAINT `documents_version_valid` CHECK (`version` > 0),
  ADD CONSTRAINT `documents_sha256_valid` CHECK (`sha256` IS NULL OR `sha256` REGEXP '^[0-9a-fA-F]{64}$'),
  ADD CONSTRAINT `documents_legal_hold_reason_required` CHECK (NOT `is_on_legal_hold` OR `legal_hold_reason` IS NOT NULL);
--> statement-breakpoint
CREATE TRIGGER `documents_deleted_actor_insert` BEFORE INSERT ON `documents`
FOR EACH ROW BEGIN
  IF NEW.`deleted_at` IS NOT NULL AND NEW.`deleted_by` IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'deleted documents require deleted_by';
  END IF;
END;
--> statement-breakpoint
CREATE TRIGGER `documents_deleted_actor_update` BEFORE UPDATE ON `documents`
FOR EACH ROW BEGIN
  IF NEW.`deleted_at` IS NOT NULL AND NEW.`deleted_by` IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'deleted documents require deleted_by';
  END IF;
END;
--> statement-breakpoint
ALTER TABLE `document_shares` ADD CONSTRAINT `document_shares_counts_valid` CHECK (`downloads_count` >= 0 AND `failed_attempts` >= 0 AND (`max_downloads` IS NULL OR `max_downloads` > 0));
--> statement-breakpoint
ALTER TABLE `document_upload_rate_limits` ADD CONSTRAINT `document_rate_count_valid` CHECK (`count` >= 0);
--> statement-breakpoint
ALTER TABLE `signing_challenges` ADD CONSTRAINT `signing_challenges_attempts_valid` CHECK (`attempts` >= 0);
--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_clock_order_valid` CHECK (`clock_out` IS NULL OR `clock_in` IS NULL OR `clock_out` >= `clock_in`);
--> statement-breakpoint
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_date_order_valid` CHECK (`to_date` >= `from_date`);
--> statement-breakpoint
ALTER TABLE `testimonials` ADD CONSTRAINT `testimonials_rating_valid` CHECK (`rating` IS NULL OR `rating` BETWEEN 1 AND 5);
--> statement-breakpoint
ALTER TABLE `resources` ADD CONSTRAINT `resources_downloads_valid` CHECK (`downloads` >= 0);
--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_contact_valid` CHECK (`client_email` IS NOT NULL OR `client_phone` <> '');
--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_auth_fields_complete_check` CHECK (`token_hash` IS NULL OR (`identity_subject` IS NOT NULL AND `expires_at` IS NOT NULL));
--> statement-breakpoint
ALTER TABLE `document_upload_intents`
  ADD CONSTRAINT `upload_intents_size_check` CHECK (`declared_size_bytes` > 0 AND `declared_size_bytes` <= 52428800),
  ADD CONSTRAINT `upload_intents_expected_sha_check` CHECK (`expected_sha256` IS NULL OR `expected_sha256` REGEXP '^[0-9a-f]{64}$'),
  ADD CONSTRAINT `upload_intents_actual_sha_check` CHECK (`actual_sha256` IS NULL OR `actual_sha256` REGEXP '^[0-9a-f]{64}$');
--> statement-breakpoint
ALTER TABLE `document_scan_jobs` ADD CONSTRAINT `document_scan_jobs_attempts_check` CHECK (`attempts` >= 0 AND `max_attempts` BETWEEN 1 AND 20 AND `attempts` <= `max_attempts`);
--> statement-breakpoint
ALTER TABLE `storage_migration_items`
  ADD CONSTRAINT `storage_migration_items_attempts_check` CHECK (`attempts` >= 0),
  ADD CONSTRAINT `storage_migration_expected_sha_check` CHECK (`expected_sha256` IS NULL OR `expected_sha256` REGEXP '^[0-9a-f]{64}$'),
  ADD CONSTRAINT `storage_migration_actual_sha_check` CHECK (`actual_sha256` IS NULL OR `actual_sha256` REGEXP '^[0-9a-f]{64}$');
--> statement-breakpoint
ALTER TABLE `durable_jobs`
  ADD CONSTRAINT `durable_jobs_attempts_check` CHECK (`attempts` >= 0 AND `total_attempts` >= `attempts` AND `max_attempts` BETWEEN 1 AND 20),
  ADD CONSTRAINT `durable_jobs_timeout_check` CHECK (`timeout_seconds` BETWEEN 1 AND 86400),
  ADD CONSTRAINT `durable_jobs_priority_check` CHECK (`priority` BETWEEN 0 AND 1000);
--> statement-breakpoint
ALTER TABLE `durable_job_attempts`
  ADD CONSTRAINT `durable_job_attempts_number_check` CHECK (`attempt_number` > 0),
  ADD CONSTRAINT `durable_job_attempts_duration_check` CHECK (`duration_ms` IS NULL OR `duration_ms` >= 0);
--> statement-breakpoint
ALTER TABLE `durable_schedules`
  ADD CONSTRAINT `durable_schedules_interval_check` CHECK (`interval_seconds` BETWEEN 60 AND 31536000),
  ADD CONSTRAINT `durable_schedules_attempts_check` CHECK (`max_attempts` BETWEEN 1 AND 20),
  ADD CONSTRAINT `durable_schedules_timeout_check` CHECK (`timeout_seconds` BETWEEN 1 AND 86400);
--> statement-breakpoint
ALTER TABLE `client_kyc_upload_intents`
  ADD CONSTRAINT `client_kyc_upload_intents_size_check` CHECK (`declared_size_bytes` BETWEEN 1 AND 26214400),
  ADD CONSTRAINT `client_kyc_upload_intents_mime_check` CHECK (`declared_mime_type` IN ('application/pdf', 'image/jpeg', 'image/png'));
--> statement-breakpoint

CREATE FULLTEXT INDEX `documents_search_fulltext_idx` ON `documents` (`title`, `description`, `searchable_text`);
