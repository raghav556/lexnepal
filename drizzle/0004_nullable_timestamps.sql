ALTER TABLE `appointments` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `appointments` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `attendance` MODIFY `clock_in` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `attendance` SET `clock_in` = NULL WHERE `clock_in` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `attendance` MODIFY `clock_out` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `attendance` SET `clock_out` = NULL WHERE `clock_out` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `attendance` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `attendance` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `audit_log` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `auth_accounts` MODIFY `access_token_expires_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `auth_accounts` SET `access_token_expires_at` = NULL WHERE `access_token_expires_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `auth_accounts` MODIFY `refresh_token_expires_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `auth_accounts` SET `refresh_token_expires_at` = NULL WHERE `refresh_token_expires_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `auth_two_factors` MODIFY `locked_until` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `auth_two_factors` SET `locked_until` = NULL WHERE `locked_until` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `auth_users` MODIFY `ban_expires` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `auth_users` SET `ban_expires` = NULL WHERE `ban_expires` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `avatar_upload_intents` MODIFY `uploaded_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `avatar_upload_intents` SET `uploaded_at` = NULL WHERE `uploaded_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `avatar_upload_intents` MODIFY `completed_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `avatar_upload_intents` SET `completed_at` = NULL WHERE `completed_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `avatar_upload_intents` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `avatar_upload_intents` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `blog_posts` MODIFY `publish_date` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `blog_posts` SET `publish_date` = NULL WHERE `publish_date` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `blog_posts` MODIFY `submitted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `blog_posts` SET `submitted_at` = NULL WHERE `submitted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `blog_posts` MODIFY `reviewed_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `blog_posts` SET `reviewed_at` = NULL WHERE `reviewed_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `blog_posts` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `blog_posts` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `career_requirements` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `career_requirements` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `careers` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `careers` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `case_team_members` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `case_team_members` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `cases` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `cases` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `client_kyc_files` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `client_kyc_files` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `client_kyc_upload_intents` MODIFY `uploaded_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `client_kyc_upload_intents` SET `uploaded_at` = NULL WHERE `uploaded_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `client_kyc_upload_intents` MODIFY `completed_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `client_kyc_upload_intents` SET `completed_at` = NULL WHERE `completed_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `client_kyc_upload_intents` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `client_kyc_upload_intents` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `clients` MODIFY `kyc_consent_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `clients` SET `kyc_consent_at` = NULL WHERE `kyc_consent_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `clients` MODIFY `kyc_submitted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `clients` SET `kyc_submitted_at` = NULL WHERE `kyc_submitted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `clients` MODIFY `kyc_reviewed_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `clients` SET `kyc_reviewed_at` = NULL WHERE `kyc_reviewed_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `clients` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `clients` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `cms_asset_upload_intents` MODIFY `uploaded_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `cms_asset_upload_intents` SET `uploaded_at` = NULL WHERE `uploaded_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `cms_asset_upload_intents` MODIFY `completed_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `cms_asset_upload_intents` SET `completed_at` = NULL WHERE `completed_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `cms_asset_upload_intents` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `cms_asset_upload_intents` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `cms_settings` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `cms_settings` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `conflict_checks` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `conflict_checks` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `dm_message_attachments` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `dm_message_attachments` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `dm_message_reads` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `dm_message_reads` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `dm_messages` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `dm_messages` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `dm_threads` MODIFY `last_message_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `dm_threads` SET `last_message_at` = NULL WHERE `last_message_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `dm_threads` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `dm_threads` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `document_scan_jobs` MODIFY `locked_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `document_scan_jobs` SET `locked_at` = NULL WHERE `locked_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `document_scan_jobs` MODIFY `completed_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `document_scan_jobs` SET `completed_at` = NULL WHERE `completed_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `document_scan_jobs` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `document_scan_jobs` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `document_shares` MODIFY `expires_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `document_shares` SET `expires_at` = NULL WHERE `expires_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `document_shares` MODIFY `locked_until` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `document_shares` SET `locked_until` = NULL WHERE `locked_until` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `document_shares` MODIFY `last_access_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `document_shares` SET `last_access_at` = NULL WHERE `last_access_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `document_shares` MODIFY `revoked_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `document_shares` SET `revoked_at` = NULL WHERE `revoked_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `document_shares` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `document_shares` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `document_tag_assignments` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `document_tag_assignments` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `document_tags` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `document_tags` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `document_templates` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `document_templates` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `document_upload_intents` MODIFY `uploaded_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `document_upload_intents` SET `uploaded_at` = NULL WHERE `uploaded_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `document_upload_intents` MODIFY `completed_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `document_upload_intents` SET `completed_at` = NULL WHERE `completed_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `document_upload_intents` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `document_upload_intents` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `document_upload_rate_limits` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `document_upload_rate_limits` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `documents` MODIFY `locked_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `documents` SET `locked_at` = NULL WHERE `locked_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `documents` MODIFY `expires_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `documents` SET `expires_at` = NULL WHERE `expires_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `documents` MODIFY `legal_hold_set_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `documents` SET `legal_hold_set_at` = NULL WHERE `legal_hold_set_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `documents` MODIFY `retention_until` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `documents` SET `retention_until` = NULL WHERE `retention_until` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `documents` MODIFY `scan_completed_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `documents` SET `scan_completed_at` = NULL WHERE `scan_completed_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `documents` MODIFY `signed_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `documents` SET `signed_at` = NULL WHERE `signed_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `documents` MODIFY `sign_consent_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `documents` SET `sign_consent_at` = NULL WHERE `sign_consent_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `documents` MODIFY `viewed_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `documents` SET `viewed_at` = NULL WHERE `viewed_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `documents` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `documents` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `durable_job_attempts` MODIFY `completed_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `durable_job_attempts` SET `completed_at` = NULL WHERE `completed_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `durable_job_attempts` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `durable_job_attempts` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `durable_job_effects` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `durable_job_effects` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `durable_jobs` MODIFY `locked_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `durable_jobs` SET `locked_at` = NULL WHERE `locked_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `durable_jobs` MODIFY `lease_expires_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `durable_jobs` SET `lease_expires_at` = NULL WHERE `lease_expires_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `durable_jobs` MODIFY `completed_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `durable_jobs` SET `completed_at` = NULL WHERE `completed_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `durable_jobs` MODIFY `dead_lettered_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `durable_jobs` SET `dead_lettered_at` = NULL WHERE `dead_lettered_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `durable_jobs` MODIFY `last_manual_retry_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `durable_jobs` SET `last_manual_retry_at` = NULL WHERE `last_manual_retry_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `durable_jobs` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `durable_jobs` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `durable_schedules` MODIFY `last_enqueued_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `durable_schedules` SET `last_enqueued_at` = NULL WHERE `last_enqueued_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `durable_schedules` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `durable_schedules` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `firm_settings` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `firm_settings` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `firms` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `firms` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `hearings` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `hearings` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `job_applications` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `job_applications` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `leads` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `leads` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `leave_balances` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `leave_balances` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `leave_requests` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `leave_requests` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `legal_pages` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `legal_pages` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `message_attachments` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `message_attachments` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `message_reads` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `message_reads` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `messages` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `messages` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `navigation` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `navigation` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `news_and_awards` MODIFY `submitted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `news_and_awards` SET `submitted_at` = NULL WHERE `submitted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `news_and_awards` MODIFY `reviewed_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `news_and_awards` SET `reviewed_at` = NULL WHERE `reviewed_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `news_and_awards` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `news_and_awards` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `newsletter_subscribers` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `newsletter_subscribers` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `notifications` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `notifications` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `payroll_run_lines` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `payroll_run_lines` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `payroll_runs` MODIFY `finalized_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `payroll_runs` SET `finalized_at` = NULL WHERE `finalized_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `payroll_runs` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `payroll_runs` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `practice_areas` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `practice_areas` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `research_note_tags` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `research_note_tags` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `research_notes` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `research_notes` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `resources` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `resources` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `sessions` MODIFY `expires_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `sessions` SET `expires_at` = NULL WHERE `expires_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `sessions` MODIFY `revoked_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `sessions` SET `revoked_at` = NULL WHERE `revoked_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `sessions` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `sessions` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `signature_envelopes` MODIFY `expires_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `signature_envelopes` SET `expires_at` = NULL WHERE `expires_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `signature_envelopes` MODIFY `voided_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `signature_envelopes` SET `voided_at` = NULL WHERE `voided_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `signature_envelopes` MODIFY `completed_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `signature_envelopes` SET `completed_at` = NULL WHERE `completed_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `signature_envelopes` MODIFY `last_reminded_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `signature_envelopes` SET `last_reminded_at` = NULL WHERE `last_reminded_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `signature_envelopes` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `signature_envelopes` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `signature_recipients` MODIFY `declined_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `signature_recipients` SET `declined_at` = NULL WHERE `declined_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `signature_recipients` MODIFY `signed_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `signature_recipients` SET `signed_at` = NULL WHERE `signed_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `signature_recipients` MODIFY `reminded_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `signature_recipients` SET `reminded_at` = NULL WHERE `reminded_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `signature_recipients` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `signature_recipients` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `signing_challenges` MODIFY `verified_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `signing_challenges` SET `verified_at` = NULL WHERE `verified_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `signing_challenges` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `signing_challenges` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `sop_template_tasks` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `sop_template_tasks` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `sop_templates` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `sop_templates` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `storage_migration_items` MODIFY `verified_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `storage_migration_items` SET `verified_at` = NULL WHERE `verified_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `storage_migration_items` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `storage_migration_items` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `task_comments` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `task_comments` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `task_watchers` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `task_watchers` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `tasks` MODIFY `due_date` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `tasks` SET `due_date` = NULL WHERE `due_date` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `tasks` MODIFY `reminder_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `tasks` SET `reminder_at` = NULL WHERE `reminder_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `tasks` MODIFY `completed_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `tasks` SET `completed_at` = NULL WHERE `completed_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `tasks` MODIFY `archived_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `tasks` SET `archived_at` = NULL WHERE `archived_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `tasks` MODIFY `last_due_reminder_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `tasks` SET `last_due_reminder_at` = NULL WHERE `last_due_reminder_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `tasks` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `tasks` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `template_variables` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `template_variables` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `templates` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `templates` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `testimonials` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `testimonials` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `user_educations` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `user_educations` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `user_notable_cases` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `user_notable_cases` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `user_practice_areas` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `user_practice_areas` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `users` MODIFY `last_login_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `users` SET `last_login_at` = NULL WHERE `last_login_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `users` MODIFY `invited_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `users` SET `invited_at` = NULL WHERE `invited_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `users` MODIFY `invite_expires_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `users` SET `invite_expires_at` = NULL WHERE `invite_expires_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `users` MODIFY `deactivated_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `users` SET `deactivated_at` = NULL WHERE `deactivated_at` = '0000-00-00 00:00:00.000';
--> statement-breakpoint
ALTER TABLE `users` MODIFY `deleted_at` timestamp(3) NULL DEFAULT NULL;
--> statement-breakpoint
UPDATE `users` SET `deleted_at` = NULL WHERE `deleted_at` = '0000-00-00 00:00:00.000';
