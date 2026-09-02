CREATE TABLE `appointments` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`client_name` varchar(255) NOT NULL,
	`client_email` varchar(255),
	`client_phone` varchar(255) NOT NULL,
	`client_id` varchar(36),
	`lead_id` varchar(36),
	`practice_area` varchar(255) NOT NULL,
	`appointment_date` date NOT NULL,
	`time_slot` varchar(255) NOT NULL,
	`notes` longtext,
	`status` enum('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
	`assigned_lawyer_id` varchar(36),
	`meeting_link` varchar(255),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`),
	CONSTRAINT `appointments_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`)
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`attendance_date` date NOT NULL,
	`clock_in` timestamp(3),
	`clock_out` timestamp(3),
	`status` enum('present','absent','half_day','leave') NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `attendance_firm_user_date_unique` UNIQUE(`firm_id`,`user_id`,`attendance_date`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`action` varchar(255) NOT NULL,
	`resource` varchar(255) NOT NULL,
	`resource_id` varchar(255),
	`details` longtext,
	`ip_address` varchar(255),
	`request_id` varchar(255),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`),
	CONSTRAINT `audit_log_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`)
);
--> statement-breakpoint
CREATE TABLE `auth_accounts` (
	`id` varchar(255) NOT NULL,
	`account_id` varchar(255) NOT NULL,
	`provider_id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`access_token` longtext,
	`refresh_token` longtext,
	`id_token` longtext,
	`access_token_expires_at` timestamp(3),
	`refresh_token_expires_at` timestamp(3),
	`scope` varchar(255),
	`password` varchar(255),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `auth_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_accounts_provider_account_unique` UNIQUE(`provider_id`,`account_id`)
);
--> statement-breakpoint
CREATE TABLE `auth_rate_limits` (
	`id` varchar(255) NOT NULL,
	`key` varchar(255) NOT NULL,
	`count` int NOT NULL,
	`last_request` bigint NOT NULL,
	CONSTRAINT `auth_rate_limits_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_rate_limits_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` varchar(255) NOT NULL,
	`token` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`ip_address` varchar(255),
	`user_agent` longtext,
	`impersonated_by` varchar(255),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `auth_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `auth_two_factors` (
	`id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`secret` varchar(255) NOT NULL,
	`backup_codes` longtext NOT NULL,
	`verified` boolean NOT NULL DEFAULT false,
	`failed_verification_count` int NOT NULL DEFAULT 0,
	`locked_until` timestamp(3),
	CONSTRAINT `auth_two_factors_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_two_factors_user_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `auth_users` (
	`id` varchar(255) NOT NULL,
	`lexnepal_user_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` varchar(255),
	`two_factor_enabled` boolean NOT NULL DEFAULT false,
	`role` varchar(255) NOT NULL DEFAULT 'user',
	`banned` boolean NOT NULL DEFAULT false,
	`ban_reason` longtext,
	`ban_expires` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `auth_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_users_lexnepal_user_unique` UNIQUE(`lexnepal_user_id`),
	CONSTRAINT `auth_users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `auth_verifications` (
	`id` varchar(255) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` varchar(255) NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `auth_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `avatar_upload_intents` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`original_file_name` varchar(255) NOT NULL,
	`declared_mime_type` varchar(255) NOT NULL,
	`declared_size_bytes` bigint NOT NULL,
	`expected_sha256` varchar(255),
	`actual_sha256` varchar(255),
	`quarantine_key` varchar(255) NOT NULL,
	`protected_key` varchar(255),
	`status` enum('pending','uploaded','scanning','promoted','rejected','expired') NOT NULL DEFAULT 'pending',
	`expires_at` timestamp(3) NOT NULL,
	`uploaded_at` timestamp(3),
	`completed_at` timestamp(3),
	`failure_code` varchar(255),
	`failure_details` longtext,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `avatar_upload_intents_id` PRIMARY KEY(`id`),
	CONSTRAINT `avatar_upload_intents_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `avatar_upload_intents_quarantine_key_unique` UNIQUE(`quarantine_key`)
);
--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`category` varchar(255) NOT NULL,
	`excerpt` longtext NOT NULL,
	`content` longtext NOT NULL,
	`cover_image_url` varchar(255),
	`author` varchar(255) NOT NULL,
	`author_user_id` varchar(36),
	`status` enum('draft','pending_review','published','rejected') NOT NULL,
	`publish_date` timestamp(3),
	`seo_title` varchar(255),
	`seo_description` longtext,
	`display_order` int NOT NULL DEFAULT 0,
	`is_featured` boolean NOT NULL DEFAULT false,
	`submitted_by` varchar(36),
	`submitted_at` timestamp(3),
	`reviewed_by` varchar(36),
	`reviewed_at` timestamp(3),
	`review_notes` longtext,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `blog_posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_posts_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `blog_posts_firm_slug_unique` UNIQUE(`firm_id`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `career_requirements` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`career_id` varchar(36) NOT NULL,
	`requirement` varchar(255) NOT NULL,
	`position` int NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `career_requirements_id` PRIMARY KEY(`id`),
	CONSTRAINT `career_requirements_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `career_requirements_position_unique` UNIQUE(`firm_id`,`career_id`,`position`)
);
--> statement-breakpoint
CREATE TABLE `careers` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`department` varchar(255) NOT NULL,
	`location` varchar(255) NOT NULL,
	`type` enum('full_time','part_time','contract','internship') NOT NULL,
	`description` longtext NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`posted_date` date NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `careers_id` PRIMARY KEY(`id`),
	CONSTRAINT `careers_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`)
);
--> statement-breakpoint
CREATE TABLE `case_team_members` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`case_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `case_team_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `case_team_members_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `case_team_members_unique` UNIQUE(`firm_id`,`case_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`case_number` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` longtext,
	`practice_area` varchar(255) NOT NULL,
	`status` enum('inquiry','active','on_hold','closed_won','closed_lost') NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`assigned_lawyer_id` varchar(36) NOT NULL,
	`court` varchar(255),
	`judge` varchar(255),
	`opposing_counsel` varchar(255),
	`filing_date` date,
	`closed_date` date,
	`conflict_checked` boolean NOT NULL DEFAULT false,
	`conflict_cleared_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `cases_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `cases_firm_case_number_unique` UNIQUE(`firm_id`,`case_number`)
);
--> statement-breakpoint
CREATE TABLE `client_kyc_files` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`storage_id` varchar(255) NOT NULL,
	`document_type` enum('government_id','proof_of_address','other') NOT NULL DEFAULT 'other',
	`file_name` varchar(255) NOT NULL,
	`mime_type` varchar(255),
	`sha256` varchar(255),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `client_kyc_files_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_kyc_files_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `client_kyc_files_storage_unique` UNIQUE(`firm_id`,`storage_id`)
);
--> statement-breakpoint
CREATE TABLE `client_kyc_upload_intents` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`document_type` enum('government_id','proof_of_address','other') NOT NULL,
	`original_file_name` varchar(255) NOT NULL,
	`declared_mime_type` varchar(255) NOT NULL,
	`declared_size_bytes` bigint NOT NULL,
	`expected_sha256` varchar(255),
	`actual_sha256` varchar(255),
	`quarantine_key` varchar(255) NOT NULL,
	`protected_key` varchar(255),
	`status` enum('pending','uploaded','scanning','promoted','rejected','expired') NOT NULL DEFAULT 'pending',
	`expires_at` timestamp(3) NOT NULL,
	`uploaded_at` timestamp(3),
	`completed_at` timestamp(3),
	`failure_code` varchar(255),
	`failure_details` longtext,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `client_kyc_upload_intents_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_kyc_upload_intents_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `client_kyc_upload_intents_quarantine_key_unique` UNIQUE(`quarantine_key`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`type` enum('individual','corporate') NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(255),
	`address` longtext,
	`company_name` varchar(255),
	`registration_number` varchar(255),
	`kyc_status` enum('pending','submitted','verified','rejected') NOT NULL DEFAULT 'pending',
	`kyc_id_number` varchar(255),
	`kyc_consent_at` timestamp(3),
	`kyc_consent_version` varchar(255),
	`kyc_rejection_reason` varchar(255),
	`kyc_submitted_at` timestamp(3),
	`kyc_reviewed_at` timestamp(3),
	`kyc_reviewed_by` varchar(36),
	`notes` longtext,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `clients_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `clients_firm_user_unique` UNIQUE(`firm_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `cms_asset_upload_intents` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`purpose` varchar(255) NOT NULL,
	`original_file_name` varchar(255) NOT NULL,
	`declared_mime_type` varchar(255) NOT NULL,
	`declared_size_bytes` bigint NOT NULL,
	`expected_sha256` varchar(255),
	`actual_sha256` varchar(255),
	`quarantine_key` varchar(255) NOT NULL,
	`protected_key` varchar(255),
	`status` enum('pending','uploaded','scanning','promoted','rejected','expired') NOT NULL DEFAULT 'pending',
	`expires_at` timestamp(3) NOT NULL,
	`uploaded_at` timestamp(3),
	`completed_at` timestamp(3),
	`failure_code` varchar(255),
	`failure_details` longtext,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `cms_asset_upload_intents_id` PRIMARY KEY(`id`),
	CONSTRAINT `cms_asset_upload_intents_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `cms_asset_upload_intents_quarantine_key_unique` UNIQUE(`quarantine_key`)
);
--> statement-breakpoint
CREATE TABLE `cms_settings` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`key` varchar(255) NOT NULL,
	`value` json NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `cms_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `cms_settings_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `cms_settings_firm_key_unique` UNIQUE(`firm_id`,`key`)
);
--> statement-breakpoint
CREATE TABLE `conflict_checks` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`search_query` varchar(255) NOT NULL,
	`hits_count` int NOT NULL DEFAULT 0,
	`status` enum('pending','cleared','conflict') NOT NULL,
	`run_by` varchar(36),
	`run_by_name` varchar(255) NOT NULL,
	`checked_at` timestamp(3) NOT NULL,
	`notes` longtext,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `conflict_checks_id` PRIMARY KEY(`id`),
	CONSTRAINT `conflict_checks_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`)
);
--> statement-breakpoint
CREATE TABLE `dm_message_attachments` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`message_id` varchar(36) NOT NULL,
	`storage_id` varchar(255) NOT NULL,
	`position` int NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `dm_message_attachments_id` PRIMARY KEY(`id`),
	CONSTRAINT `dm_message_attachments_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `dm_message_attachments_position_unique` UNIQUE(`firm_id`,`message_id`,`position`)
);
--> statement-breakpoint
CREATE TABLE `dm_message_reads` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`message_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`read_at` timestamp(3) NOT NULL DEFAULT (now()),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `dm_message_reads_id` PRIMARY KEY(`id`),
	CONSTRAINT `dm_message_reads_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `dm_message_reads_unique` UNIQUE(`firm_id`,`message_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `dm_messages` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`thread_id` varchar(36) NOT NULL,
	`sender_id` varchar(36) NOT NULL,
	`content` longtext NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `dm_messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `dm_messages_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`)
);
--> statement-breakpoint
CREATE TABLE `dm_threads` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`user_low_id` varchar(36) NOT NULL,
	`user_high_id` varchar(36) NOT NULL,
	`last_message_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `dm_threads_id` PRIMARY KEY(`id`),
	CONSTRAINT `dm_threads_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `dm_threads_pair_unique` UNIQUE(`firm_id`,`user_low_id`,`user_high_id`)
);
--> statement-breakpoint
CREATE TABLE `document_scan_jobs` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`upload_intent_id` varchar(36) NOT NULL,
	`status` enum('pending','processing','retry','completed','dead_letter') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`max_attempts` int NOT NULL DEFAULT 5,
	`available_at` timestamp(3) NOT NULL DEFAULT (now()),
	`locked_at` timestamp(3),
	`locked_by` varchar(255),
	`last_error` longtext,
	`completed_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `document_scan_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `document_scan_jobs_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `document_scan_jobs_intent_unique` UNIQUE(`firm_id`,`upload_intent_id`)
);
--> statement-breakpoint
CREATE TABLE `document_shares` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`document_id` varchar(36) NOT NULL,
	`token` varchar(255) NOT NULL,
	`password_hash` varchar(255),
	`expires_at` timestamp(3),
	`created_by` varchar(36) NOT NULL,
	`downloads_count` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`allow_download` boolean NOT NULL DEFAULT true,
	`max_downloads` int,
	`failed_attempts` int NOT NULL DEFAULT 0,
	`locked_until` timestamp(3),
	`last_access_at` timestamp(3),
	`revoked_at` timestamp(3),
	`revoked_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `document_shares_id` PRIMARY KEY(`id`),
	CONSTRAINT `document_shares_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `document_shares_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `document_tag_assignments` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`document_id` varchar(36) NOT NULL,
	`tag_id` varchar(36) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `document_tag_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `document_tag_assignments_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `document_tag_assignments_unique` UNIQUE(`firm_id`,`document_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `document_tags` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`color` varchar(255),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `document_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `document_tags_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `document_tags_firm_name_unique` UNIQUE(`firm_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `document_templates` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`type` enum('retainer','petition','nda','general') NOT NULL,
	`content` longtext NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `document_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `document_templates_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `document_templates_firm_title_unique` UNIQUE(`firm_id`,`title`)
);
--> statement-breakpoint
CREATE TABLE `document_upload_intents` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`case_id` varchar(36),
	`parent_document_id` varchar(36),
	`document_id` varchar(36),
	`original_file_name` varchar(255) NOT NULL,
	`declared_mime_type` varchar(255) NOT NULL,
	`declared_size_bytes` bigint NOT NULL,
	`expected_sha256` varchar(255),
	`actual_sha256` varchar(255),
	`quarantine_key` varchar(255) NOT NULL,
	`protected_key` varchar(255),
	`status` enum('pending','uploaded','scanning','promoted','rejected','expired') NOT NULL DEFAULT 'pending',
	`expires_at` timestamp(3) NOT NULL,
	`uploaded_at` timestamp(3),
	`completed_at` timestamp(3),
	`failure_code` varchar(255),
	`failure_details` longtext,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `document_upload_intents_id` PRIMARY KEY(`id`),
	CONSTRAINT `document_upload_intents_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `document_upload_intents_quarantine_key_unique` UNIQUE(`quarantine_key`)
);
--> statement-breakpoint
CREATE TABLE `document_upload_rate_limits` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`window_started_at` timestamp(3) NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `document_upload_rate_limits_id` PRIMARY KEY(`id`),
	CONSTRAINT `document_upload_rate_limits_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `document_upload_rate_limits_window_unique` UNIQUE(`firm_id`,`user_id`,`window_started_at`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`case_id` varchar(36),
	`document_number` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` longtext,
	`type` enum('pleading','affidavit','contract','poa','correspondence','evidence','template','court_filing','notice','memo','other') NOT NULL,
	`storage_id` varchar(255) NOT NULL,
	`mime_type` varchar(255) NOT NULL,
	`size_bytes` bigint NOT NULL,
	`sha256` varchar(255),
	`version` int NOT NULL DEFAULT 1,
	`parent_document_id` varchar(36),
	`uploaded_by` varchar(36) NOT NULL,
	`is_template` boolean NOT NULL DEFAULT false,
	`is_privileged` boolean NOT NULL DEFAULT false,
	`searchable_text` longtext,
	`thumbnail_storage_id` varchar(255),
	`status` enum('draft','review','approved','filed','archived') NOT NULL DEFAULT 'draft',
	`is_locked_for_edit` boolean NOT NULL DEFAULT false,
	`locked_by` varchar(36),
	`locked_at` timestamp(3),
	`physical_location` varchar(255),
	`expires_at` timestamp(3),
	`retention_policy` varchar(255),
	`date_bs` varchar(255),
	`is_on_legal_hold` boolean NOT NULL DEFAULT false,
	`legal_hold_reason` varchar(255),
	`legal_hold_set_at` timestamp(3),
	`legal_hold_set_by` varchar(36),
	`retention_until` timestamp(3),
	`upload_status` enum('quarantined','scanning','clean','rejected') NOT NULL DEFAULT 'quarantined',
	`scan_provider` varchar(255),
	`scan_completed_at` timestamp(3),
	`scan_details` longtext,
	`confidentiality_level` enum('public','internal','confidential','privileged') NOT NULL DEFAULT 'internal',
	`requires_signature` boolean NOT NULL DEFAULT false,
	`signature_status` enum('pending','signed'),
	`signed_at` timestamp(3),
	`intended_signer_user_id` varchar(36),
	`signed_by_user_id` varchar(36),
	`signature_method` enum('draw','type','upload'),
	`signature_artifact_storage_id` varchar(255),
	`typed_signature_text` varchar(255),
	`sign_consent_version` varchar(255),
	`sign_consent_at` timestamp(3),
	`viewed_at` timestamp(3),
	`signer_user_agent` varchar(255),
	`deleted_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `documents_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `documents_firm_number_unique` UNIQUE(`firm_id`,`document_number`),
	CONSTRAINT `documents_firm_storage_unique` UNIQUE(`firm_id`,`storage_id`),
	CONSTRAINT `documents_parent_version_unique` UNIQUE(`firm_id`,`parent_document_id`,`version`)
);
--> statement-breakpoint
CREATE TABLE `durable_job_attempts` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`job_id` varchar(36) NOT NULL,
	`attempt_number` int NOT NULL,
	`worker_id` varchar(255) NOT NULL,
	`outcome` enum('processing','completed','retry','dead_letter','lease_expired') NOT NULL DEFAULT 'processing',
	`started_at` timestamp(3) NOT NULL,
	`completed_at` timestamp(3),
	`duration_ms` int,
	`error` longtext,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `durable_job_attempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `durable_job_attempts_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `durable_job_attempts_number_unique` UNIQUE(`firm_id`,`job_id`,`attempt_number`)
);
--> statement-breakpoint
CREATE TABLE `durable_job_effects` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`job_id` varchar(36) NOT NULL,
	`effect_key` varchar(255) NOT NULL,
	`details` json NOT NULL DEFAULT ('{}'),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `durable_job_effects_id` PRIMARY KEY(`id`),
	CONSTRAINT `durable_job_effects_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `durable_job_effects_key_unique` UNIQUE(`firm_id`,`job_id`,`effect_key`)
);
--> statement-breakpoint
CREATE TABLE `durable_jobs` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`type` varchar(255) NOT NULL,
	`idempotency_key` varchar(255) NOT NULL,
	`payload` json NOT NULL DEFAULT ('{}'),
	`status` enum('pending','processing','retry','completed','dead_letter','cancelled') NOT NULL DEFAULT 'pending',
	`priority` int NOT NULL DEFAULT 100,
	`attempts` int NOT NULL DEFAULT 0,
	`total_attempts` int NOT NULL DEFAULT 0,
	`max_attempts` int NOT NULL DEFAULT 5,
	`timeout_seconds` int NOT NULL DEFAULT 300,
	`available_at` timestamp(3) NOT NULL DEFAULT (now()),
	`locked_at` timestamp(3),
	`locked_by` varchar(255),
	`lease_expires_at` timestamp(3),
	`last_error` longtext,
	`result` json,
	`actor_user_id` varchar(36) NOT NULL,
	`correlation_id` varchar(255),
	`completed_at` timestamp(3),
	`dead_lettered_at` timestamp(3),
	`manual_retry_count` int NOT NULL DEFAULT 0,
	`last_manual_retry_at` timestamp(3),
	`last_manual_retry_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `durable_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `durable_jobs_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `durable_jobs_idempotency_unique` UNIQUE(`firm_id`,`type`,`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `durable_schedules` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`job_type` varchar(255) NOT NULL,
	`payload` json NOT NULL DEFAULT ('{}'),
	`interval_seconds` int NOT NULL,
	`next_run_at` timestamp(3) NOT NULL,
	`actor_user_id` varchar(36) NOT NULL,
	`max_attempts` int NOT NULL DEFAULT 5,
	`timeout_seconds` int NOT NULL DEFAULT 300,
	`is_active` boolean NOT NULL DEFAULT true,
	`last_enqueued_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `durable_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `durable_schedules_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `durable_schedules_firm_name_unique` UNIQUE(`firm_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `firm_settings` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`key` varchar(255) NOT NULL,
	`value` json NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `firm_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `firm_settings_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `firm_settings_firm_key_unique` UNIQUE(`firm_id`,`key`)
);
--> statement-breakpoint
CREATE TABLE `firms` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `firms_id` PRIMARY KEY(`id`),
	CONSTRAINT `firms_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `firms_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `hearings` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`case_id` varchar(36) NOT NULL,
	`court` varchar(255) NOT NULL,
	`judge` varchar(255),
	`date_gregorian` date NOT NULL,
	`date_bs` varchar(255) NOT NULL,
	`hearing_time` time,
	`purpose` varchar(255),
	`outcome` varchar(255),
	`next_date_gregorian` date,
	`next_date_bs` varchar(255),
	`status` enum('scheduled','completed','adjourned','cancelled','postponed','not_reached','bench_disqualified','could_not_present','part_heard','continuous','procedural_order','evidence_exam','final_judgment','dismissed','settled','archived','on_hold') NOT NULL,
	`notes` longtext,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `hearings_id` PRIMARY KEY(`id`),
	CONSTRAINT `hearings_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`)
);
--> statement-breakpoint
CREATE TABLE `job_applications` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`job_id` varchar(36) NOT NULL,
	`applicant_name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(255) NOT NULL,
	`resume_url` varchar(255),
	`cover_letter` longtext,
	`status` enum('new','reviewed','interviewed','rejected','hired') NOT NULL DEFAULT 'new',
	`applied_date` date NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `job_applications_id` PRIMARY KEY(`id`),
	CONSTRAINT `job_applications_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(255),
	`source` enum('website','referral','walk_in','phone','social','newsletter') NOT NULL,
	`practice_area_interest` varchar(255),
	`message` longtext,
	`status` enum('new','contacted','consultation_scheduled','converted','lost') NOT NULL DEFAULT 'new',
	`assigned_to` varchar(36),
	`converted_client_id` varchar(36),
	`notes` longtext,
	`resource_id` varchar(36),
	`intake_token` varchar(255),
	`intake_submitted` boolean NOT NULL DEFAULT false,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `leads_id` PRIMARY KEY(`id`),
	CONSTRAINT `leads_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `leads_intake_token_unique` UNIQUE(`intake_token`)
);
--> statement-breakpoint
CREATE TABLE `leave_balances` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` enum('annual','sick','maternity','paternity','unpaid') NOT NULL,
	`year` int NOT NULL,
	`entitled_days` int NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `leave_balances_id` PRIMARY KEY(`id`),
	CONSTRAINT `leave_balances_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `leave_balances_firm_user_type_year_unique` UNIQUE(`firm_id`,`user_id`,`type`,`year`)
);
--> statement-breakpoint
CREATE TABLE `leave_requests` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` enum('annual','sick','maternity','paternity','unpaid') NOT NULL,
	`from_date` date NOT NULL,
	`to_date` date NOT NULL,
	`reason` longtext,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewed_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `leave_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `leave_requests_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`)
);
--> statement-breakpoint
CREATE TABLE `legal_pages` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`slug` enum('privacy-policy','terms') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` longtext NOT NULL,
	`content_updated_at` timestamp(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `legal_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `legal_pages_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `legal_pages_firm_slug_unique` UNIQUE(`firm_id`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `message_attachments` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`message_id` varchar(36) NOT NULL,
	`storage_id` varchar(255) NOT NULL,
	`position` int NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `message_attachments_id` PRIMARY KEY(`id`),
	CONSTRAINT `message_attachments_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `message_attachments_position_unique` UNIQUE(`firm_id`,`message_id`,`position`)
);
--> statement-breakpoint
CREATE TABLE `message_reads` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`message_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`read_at` timestamp(3) NOT NULL DEFAULT (now()),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `message_reads_id` PRIMARY KEY(`id`),
	CONSTRAINT `message_reads_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `message_reads_unique` UNIQUE(`firm_id`,`message_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`case_id` varchar(36) NOT NULL,
	`sender_id` varchar(36) NOT NULL,
	`content` longtext NOT NULL,
	`is_internal` boolean NOT NULL DEFAULT false,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `messages_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`)
);
--> statement-breakpoint
CREATE TABLE `navigation` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`label` varchar(255) NOT NULL,
	`url` varchar(255) NOT NULL,
	`location` enum('header','footer_col_1','footer_col_2') NOT NULL,
	`display_order` int NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`parent_id` varchar(36),
	`parent_scope` varchar(36) GENERATED ALWAYS AS (coalesce(parent_id, '__root__')) VIRTUAL,
	`open_in_new_tab` boolean NOT NULL DEFAULT false,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `navigation_id` PRIMARY KEY(`id`),
	CONSTRAINT `navigation_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `navigation_firm_location_sibling_order_unique` UNIQUE(`firm_id`,`location`,`parent_scope`,`display_order`)
);
--> statement-breakpoint
CREATE TABLE `news_and_awards` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`excerpt` longtext NOT NULL,
	`content` longtext NOT NULL,
	`publication_date` date NOT NULL,
	`type` enum('award','press_release','firm_news') NOT NULL,
	`status` enum('draft','pending_review','published','rejected') NOT NULL DEFAULT 'published',
	`link_url` varchar(255),
	`image_url` varchar(255),
	`seo_title` varchar(255),
	`seo_description` longtext,
	`display_order` int NOT NULL DEFAULT 0,
	`is_featured` boolean NOT NULL DEFAULT false,
	`submitted_by` varchar(36),
	`submitted_at` timestamp(3),
	`reviewed_by` varchar(36),
	`reviewed_at` timestamp(3),
	`review_notes` longtext,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `news_and_awards_id` PRIMARY KEY(`id`),
	CONSTRAINT `news_and_awards_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `news_and_awards_firm_slug_unique` UNIQUE(`firm_id`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `newsletter_subscribers` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`subscribed_at` timestamp(3) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `newsletter_subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `newsletter_subscribers_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `newsletter_subscribers_firm_email_unique` UNIQUE(`firm_id`,`email`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` longtext NOT NULL,
	`type` enum('hearing_reminder','task_due','document_request','message','system') NOT NULL,
	`related_id` varchar(255),
	`link` varchar(255),
	`is_read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `notifications_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`)
);
--> statement-breakpoint
CREATE TABLE `payroll_run_lines` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`run_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(255) NOT NULL,
	`gross` int NOT NULL,
	`pf` int NOT NULL,
	`pf_employer` int NOT NULL,
	`ssf` int NOT NULL,
	`tax` int NOT NULL,
	`net` int NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `payroll_run_lines_id` PRIMARY KEY(`id`),
	CONSTRAINT `payroll_run_lines_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `payroll_run_lines_run_user_unique` UNIQUE(`run_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `payroll_runs` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`period_start` date NOT NULL,
	`period_end` date NOT NULL,
	`label` varchar(255),
	`status` enum('draft','finalized') NOT NULL DEFAULT 'draft',
	`generated_by` varchar(36),
	`finalized_by` varchar(36),
	`finalized_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `payroll_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `payroll_runs_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`)
);
--> statement-breakpoint
CREATE TABLE `practice_areas` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` longtext NOT NULL,
	`icon` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`display_order` int NOT NULL DEFAULT 0,
	`long_description` longtext,
	`faqs` json NOT NULL DEFAULT ('[]'),
	`cover_image_url` varchar(255),
	`seo_title` varchar(255),
	`seo_description` longtext,
	`show_on_home` boolean NOT NULL DEFAULT true,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `practice_areas_id` PRIMARY KEY(`id`),
	CONSTRAINT `practice_areas_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `practice_areas_firm_slug_unique` UNIQUE(`firm_id`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `research_note_tags` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`research_note_id` varchar(36) NOT NULL,
	`tag` varchar(255) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `research_note_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `research_note_tags_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `research_note_tags_unique` UNIQUE(`firm_id`,`research_note_id`,`tag`)
);
--> statement-breakpoint
CREATE TABLE `research_notes` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`category` enum('supreme_court','high_court','district_court','commentary','procedure','template_research') NOT NULL,
	`content` longtext NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`case_id` varchar(36),
	`citation_nkp_no` varchar(255),
	`citation_decision_no` varchar(255),
	`citation_bench` varchar(255),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `research_notes_id` PRIMARY KEY(`id`),
	CONSTRAINT `research_notes_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`)
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` longtext NOT NULL,
	`category` varchar(255) NOT NULL,
	`cover_image_url` varchar(255),
	`file_url` varchar(255) NOT NULL,
	`is_gated` boolean NOT NULL DEFAULT false,
	`downloads` int NOT NULL DEFAULT 0,
	`published_date` date NOT NULL,
	`status` enum('draft','published') NOT NULL DEFAULT 'published',
	`slug` varchar(255) NOT NULL,
	`seo_title` varchar(255),
	`seo_description` longtext,
	`display_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `resources_id` PRIMARY KEY(`id`),
	CONSTRAINT `resources_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `resources_firm_slug_unique` UNIQUE(`firm_id`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`device` varchar(255) NOT NULL,
	`browser` varchar(255) NOT NULL,
	`ip_address` varchar(255) NOT NULL,
	`token_hash` varchar(255),
	`identity_subject` varchar(255),
	`expires_at` timestamp(3),
	`user_agent` longtext,
	`request_id` varchar(255),
	`last_active` timestamp(3) NOT NULL,
	`is_current` boolean NOT NULL DEFAULT false,
	`revoked_at` timestamp(3),
	`revoked_by` varchar(36),
	`revocation_reason` varchar(255),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `sessions_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `signature_envelopes` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`document_id` varchar(36) NOT NULL,
	`case_id` varchar(36),
	`title` varchar(255) NOT NULL,
	`status` enum('draft','sent','completed','declined','voided','expired') NOT NULL DEFAULT 'draft',
	`routing` enum('sequential','parallel') NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`expires_at` timestamp(3),
	`voided_at` timestamp(3),
	`void_reason` varchar(255),
	`completed_at` timestamp(3),
	`last_reminded_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `signature_envelopes_id` PRIMARY KEY(`id`),
	CONSTRAINT `signature_envelopes_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`)
);
--> statement-breakpoint
CREATE TABLE `signature_recipients` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`envelope_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`routing_order` int NOT NULL,
	`status` enum('pending','awaiting_turn','signed','declined') NOT NULL,
	`declined_at` timestamp(3),
	`decline_reason` varchar(255),
	`signed_at` timestamp(3),
	`reminded_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `signature_recipients_id` PRIMARY KEY(`id`),
	CONSTRAINT `signature_recipients_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `signature_recipients_envelope_user_unique` UNIQUE(`firm_id`,`envelope_id`,`user_id`),
	CONSTRAINT `signature_recipients_envelope_order_unique` UNIQUE(`firm_id`,`envelope_id`,`routing_order`)
);
--> statement-breakpoint
CREATE TABLE `signing_challenges` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`document_id` varchar(36) NOT NULL,
	`envelope_id` varchar(36),
	`code_hash` varchar(255) NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`verified_at` timestamp(3),
	`attempts` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `signing_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `signing_challenges_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`)
);
--> statement-breakpoint
CREATE TABLE `sop_template_tasks` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`sop_template_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`position` int NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `sop_template_tasks_id` PRIMARY KEY(`id`),
	CONSTRAINT `sop_template_tasks_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `sop_template_tasks_position_unique` UNIQUE(`firm_id`,`sop_template_id`,`position`)
);
--> statement-breakpoint
CREATE TABLE `sop_templates` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`key` varchar(255) NOT NULL,
	`label` varchar(255) NOT NULL,
	`default_priority` enum('low','medium','high','urgent') NOT NULL,
	`practice_area` varchar(255),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `sop_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `sop_templates_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `sop_templates_firm_key_unique` UNIQUE(`firm_id`,`key`)
);
--> statement-breakpoint
CREATE TABLE `storage_migration_items` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`legacy_storage_id` varchar(255) NOT NULL,
	`destination_key` varchar(255) NOT NULL,
	`expected_sha256` varchar(255),
	`actual_sha256` varchar(255),
	`size_bytes` bigint,
	`status` enum('pending','copied','verified','failed') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`last_error` longtext,
	`verified_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `storage_migration_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `storage_migration_items_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `storage_migration_items_legacy_unique` UNIQUE(`firm_id`,`legacy_storage_id`),
	CONSTRAINT `storage_migration_items_destination_unique` UNIQUE(`destination_key`)
);
--> statement-breakpoint
CREATE TABLE `task_comments` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`content` longtext NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `task_comments_id` PRIMARY KEY(`id`),
	CONSTRAINT `task_comments_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`)
);
--> statement-breakpoint
CREATE TABLE `task_watchers` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `task_watchers_id` PRIMARY KEY(`id`),
	CONSTRAINT `task_watchers_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `task_watchers_unique` UNIQUE(`firm_id`,`task_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`case_id` varchar(36),
	`title` varchar(255) NOT NULL,
	`description` longtext,
	`assigned_to` varchar(36) NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`status` enum('todo','in_progress','done','cancelled') NOT NULL DEFAULT 'todo',
	`priority` enum('low','medium','high','urgent') NOT NULL,
	`category` enum('filing','research','client','court','admin','other'),
	`due_date` timestamp(3),
	`due_date_bs` varchar(255),
	`is_recurring` boolean NOT NULL DEFAULT false,
	`recurrence_rule` enum('daily','weekly','monthly'),
	`reminder_at` timestamp(3),
	`completed_at` timestamp(3),
	`archived_at` timestamp(3),
	`parent_task_id` varchar(36),
	`client_visible` boolean NOT NULL DEFAULT false,
	`hearing_id` varchar(36),
	`document_id` varchar(36),
	`last_due_reminder_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`),
	CONSTRAINT `tasks_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`)
);
--> statement-breakpoint
CREATE TABLE `template_variables` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`template_id` varchar(36) NOT NULL,
	`variable` varchar(255) NOT NULL,
	`position` int NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `template_variables_id` PRIMARY KEY(`id`),
	CONSTRAINT `template_variables_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `template_variables_unique` UNIQUE(`firm_id`,`template_id`,`variable`),
	CONSTRAINT `template_variables_position_unique` UNIQUE(`firm_id`,`template_id`,`position`)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` longtext,
	`category` enum('vakalatnama','firad_patra','jawab','prastab_patra','retainer','poa','contract','other') NOT NULL,
	`html_content` longtext NOT NULL,
	`created_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `templates_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `templates_firm_title_unique` UNIQUE(`firm_id`,`title`)
);
--> statement-breakpoint
CREATE TABLE `testimonials` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`client_name` varchar(255) NOT NULL,
	`company` varchar(255),
	`quote` longtext NOT NULL,
	`rating` int,
	`is_approved` boolean NOT NULL DEFAULT false,
	`avatar_url` varchar(255),
	`display_order` int NOT NULL DEFAULT 0,
	`show_on_home` boolean NOT NULL DEFAULT true,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `testimonials_id` PRIMARY KEY(`id`),
	CONSTRAINT `testimonials_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`)
);
--> statement-breakpoint
CREATE TABLE `user_educations` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`degree` varchar(255) NOT NULL,
	`institution` varchar(255) NOT NULL,
	`year` varchar(255) NOT NULL,
	`position` int NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `user_educations_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_educations_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `user_educations_position_unique` UNIQUE(`firm_id`,`user_id`,`position`)
);
--> statement-breakpoint
CREATE TABLE `user_notable_cases` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`description` longtext NOT NULL,
	`position` int NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `user_notable_cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_notable_cases_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `user_notable_cases_position_unique` UNIQUE(`firm_id`,`user_id`,`position`)
);
--> statement-breakpoint
CREATE TABLE `user_practice_areas` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`practice_area` varchar(255) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `user_practice_areas_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_practice_areas_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `user_practice_areas_unique` UNIQUE(`firm_id`,`user_id`,`practice_area`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL DEFAULT (uuid()),
	`legacy_convex_id` varchar(255),
	`firm_id` varchar(36) NOT NULL,
	`token_identifier` varchar(255) NOT NULL,
	`name` varchar(255),
	`email` varchar(255),
	`role` enum('partner','senior_associate','associate','paralegal','intern','admin','client') NOT NULL,
	`avatar` varchar(255),
	`phone` varchar(255),
	`bar_council_number` varchar(255),
	`bar_council_expiry` date,
	`is_active` boolean NOT NULL DEFAULT true,
	`is_public_facing` boolean NOT NULL DEFAULT false,
	`bio` longtext,
	`long_bio` longtext,
	`leadership_title` varchar(255),
	`public_email` varchar(255),
	`linkedin_url` varchar(255),
	`twitter_url` varchar(255),
	`public_phone` varchar(255),
	`display_order` int NOT NULL DEFAULT 0,
	`languages` json NOT NULL DEFAULT ('[]'),
	`years_experience` int,
	`base_salary` decimal(14,2),
	`activation_token` varchar(255),
	`is_pending` boolean NOT NULL DEFAULT false,
	`two_factor_enabled` boolean NOT NULL DEFAULT false,
	`two_factor_required` boolean NOT NULL DEFAULT false,
	`totp_secret` varchar(255),
	`password_hash` varchar(255),
	`last_login_at` timestamp(3),
	`invited_at` timestamp(3),
	`invited_by` varchar(36),
	`invite_expires_at` timestamp(3),
	`deactivated_at` timestamp(3),
	`deactivated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_legacy_convex_id_unique` UNIQUE(`legacy_convex_id`),
	CONSTRAINT `users_token_identifier_unique` UNIQUE(`token_identifier`),
	CONSTRAINT `users_firm_email_unique` UNIQUE(`firm_id`,`email`),
	CONSTRAINT `users_activation_token_unique` UNIQUE(`activation_token`)
);
--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_lead_id_leads_id_fk` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_assigned_lawyer_id_users_id_fk` FOREIGN KEY (`assigned_lawyer_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auth_accounts` ADD CONSTRAINT `auth_accounts_user_id_auth_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD CONSTRAINT `auth_sessions_user_id_auth_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auth_two_factors` ADD CONSTRAINT `auth_two_factors_user_id_auth_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auth_users` ADD CONSTRAINT `auth_users_lexnepal_user_id_users_id_fk` FOREIGN KEY (`lexnepal_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `avatar_upload_intents` ADD CONSTRAINT `avatar_upload_intents_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `avatar_upload_intents` ADD CONSTRAINT `avatar_upload_intents_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_posts` ADD CONSTRAINT `blog_posts_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `career_requirements` ADD CONSTRAINT `career_requirements_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `career_requirements` ADD CONSTRAINT `career_requirements_career_id_careers_id_fk` FOREIGN KEY (`career_id`) REFERENCES `careers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `careers` ADD CONSTRAINT `careers_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_team_members` ADD CONSTRAINT `case_team_members_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_team_members` ADD CONSTRAINT `case_team_members_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_team_members` ADD CONSTRAINT `case_team_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cases` ADD CONSTRAINT `cases_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cases` ADD CONSTRAINT `cases_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cases` ADD CONSTRAINT `cases_assigned_lawyer_id_users_id_fk` FOREIGN KEY (`assigned_lawyer_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cases` ADD CONSTRAINT `cases_conflict_cleared_by_users_id_fk` FOREIGN KEY (`conflict_cleared_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_kyc_files` ADD CONSTRAINT `client_kyc_files_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_kyc_files` ADD CONSTRAINT `client_kyc_files_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_kyc_upload_intents` ADD CONSTRAINT `client_kyc_upload_intents_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_kyc_upload_intents` ADD CONSTRAINT `client_kyc_upload_intents_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_kyc_upload_intents` ADD CONSTRAINT `client_kyc_upload_intents_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_kyc_reviewed_by_users_id_fk` FOREIGN KEY (`kyc_reviewed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cms_asset_upload_intents` ADD CONSTRAINT `cms_asset_upload_intents_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cms_asset_upload_intents` ADD CONSTRAINT `cms_asset_upload_intents_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cms_settings` ADD CONSTRAINT `cms_settings_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conflict_checks` ADD CONSTRAINT `conflict_checks_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conflict_checks` ADD CONSTRAINT `conflict_checks_run_by_users_id_fk` FOREIGN KEY (`run_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dm_message_attachments` ADD CONSTRAINT `dm_message_attachments_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dm_message_attachments` ADD CONSTRAINT `dm_message_attachments_message_id_dm_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `dm_messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dm_message_reads` ADD CONSTRAINT `dm_message_reads_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dm_message_reads` ADD CONSTRAINT `dm_message_reads_message_id_dm_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `dm_messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dm_message_reads` ADD CONSTRAINT `dm_message_reads_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dm_messages` ADD CONSTRAINT `dm_messages_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dm_messages` ADD CONSTRAINT `dm_messages_thread_id_dm_threads_id_fk` FOREIGN KEY (`thread_id`) REFERENCES `dm_threads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dm_messages` ADD CONSTRAINT `dm_messages_sender_id_users_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dm_threads` ADD CONSTRAINT `dm_threads_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dm_threads` ADD CONSTRAINT `dm_threads_user_low_id_users_id_fk` FOREIGN KEY (`user_low_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dm_threads` ADD CONSTRAINT `dm_threads_user_high_id_users_id_fk` FOREIGN KEY (`user_high_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_scan_jobs` ADD CONSTRAINT `document_scan_jobs_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_scan_jobs` ADD CONSTRAINT `document_scan_jobs_upload_intent_fk` FOREIGN KEY (`upload_intent_id`) REFERENCES `document_upload_intents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_shares` ADD CONSTRAINT `document_shares_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_shares` ADD CONSTRAINT `document_shares_document_id_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_shares` ADD CONSTRAINT `document_shares_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_shares` ADD CONSTRAINT `document_shares_revoked_by_users_id_fk` FOREIGN KEY (`revoked_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_tag_assignments` ADD CONSTRAINT `document_tag_assignments_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_tag_assignments` ADD CONSTRAINT `document_tag_assignments_document_id_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_tag_assignments` ADD CONSTRAINT `document_tag_assignments_tag_id_document_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `document_tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_tags` ADD CONSTRAINT `document_tags_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_templates` ADD CONSTRAINT `document_templates_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_upload_intents` ADD CONSTRAINT `document_upload_intents_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_upload_intents` ADD CONSTRAINT `document_upload_intents_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_upload_intents` ADD CONSTRAINT `document_upload_intents_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_upload_intents` ADD CONSTRAINT `document_upload_intents_parent_document_id_documents_id_fk` FOREIGN KEY (`parent_document_id`) REFERENCES `documents`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_upload_intents` ADD CONSTRAINT `document_upload_intents_document_id_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_upload_rate_limits` ADD CONSTRAINT `document_upload_rate_limits_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_upload_rate_limits` ADD CONSTRAINT `document_upload_rate_limits_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_parent_document_id_documents_id_fk` FOREIGN KEY (`parent_document_id`) REFERENCES `documents`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_locked_by_users_id_fk` FOREIGN KEY (`locked_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_legal_hold_set_by_users_id_fk` FOREIGN KEY (`legal_hold_set_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_intended_signer_user_id_users_id_fk` FOREIGN KEY (`intended_signer_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_signed_by_user_id_users_id_fk` FOREIGN KEY (`signed_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_deleted_by_users_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `durable_job_attempts` ADD CONSTRAINT `durable_job_attempts_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `durable_job_attempts` ADD CONSTRAINT `durable_job_attempts_job_id_durable_jobs_id_fk` FOREIGN KEY (`job_id`) REFERENCES `durable_jobs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `durable_job_effects` ADD CONSTRAINT `durable_job_effects_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `durable_job_effects` ADD CONSTRAINT `durable_job_effects_job_id_durable_jobs_id_fk` FOREIGN KEY (`job_id`) REFERENCES `durable_jobs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `durable_jobs` ADD CONSTRAINT `durable_jobs_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `durable_jobs` ADD CONSTRAINT `durable_jobs_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `durable_jobs` ADD CONSTRAINT `durable_jobs_last_manual_retry_by_users_id_fk` FOREIGN KEY (`last_manual_retry_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `durable_schedules` ADD CONSTRAINT `durable_schedules_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `durable_schedules` ADD CONSTRAINT `durable_schedules_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `firm_settings` ADD CONSTRAINT `firm_settings_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hearings` ADD CONSTRAINT `hearings_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hearings` ADD CONSTRAINT `hearings_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_applications` ADD CONSTRAINT `job_applications_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_applications` ADD CONSTRAINT `job_applications_job_id_careers_id_fk` FOREIGN KEY (`job_id`) REFERENCES `careers`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_converted_client_id_clients_id_fk` FOREIGN KEY (`converted_client_id`) REFERENCES `clients`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_balances` ADD CONSTRAINT `leave_balances_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_balances` ADD CONSTRAINT `leave_balances_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `legal_pages` ADD CONSTRAINT `legal_pages_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_attachments` ADD CONSTRAINT `message_attachments_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_attachments` ADD CONSTRAINT `message_attachments_message_id_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_reads` ADD CONSTRAINT `message_reads_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_reads` ADD CONSTRAINT `message_reads_message_id_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_reads` ADD CONSTRAINT `message_reads_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_users_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `navigation` ADD CONSTRAINT `navigation_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `navigation` ADD CONSTRAINT `navigation_parent_id_navigation_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `navigation`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `news_and_awards` ADD CONSTRAINT `news_and_awards_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `newsletter_subscribers` ADD CONSTRAINT `newsletter_subscribers_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_run_lines` ADD CONSTRAINT `payroll_run_lines_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_run_lines` ADD CONSTRAINT `payroll_run_lines_run_id_payroll_runs_id_fk` FOREIGN KEY (`run_id`) REFERENCES `payroll_runs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_run_lines` ADD CONSTRAINT `payroll_run_lines_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_runs` ADD CONSTRAINT `payroll_runs_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_runs` ADD CONSTRAINT `payroll_runs_generated_by_users_id_fk` FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_runs` ADD CONSTRAINT `payroll_runs_finalized_by_users_id_fk` FOREIGN KEY (`finalized_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practice_areas` ADD CONSTRAINT `practice_areas_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `research_note_tags` ADD CONSTRAINT `research_note_tags_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `research_note_tags` ADD CONSTRAINT `research_note_tags_research_note_id_research_notes_id_fk` FOREIGN KEY (`research_note_id`) REFERENCES `research_notes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `research_notes` ADD CONSTRAINT `research_notes_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `research_notes` ADD CONSTRAINT `research_notes_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `research_notes` ADD CONSTRAINT `research_notes_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resources` ADD CONSTRAINT `resources_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_revoked_by_users_id_fk` FOREIGN KEY (`revoked_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signature_envelopes` ADD CONSTRAINT `signature_envelopes_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signature_envelopes` ADD CONSTRAINT `signature_envelopes_document_id_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signature_envelopes` ADD CONSTRAINT `signature_envelopes_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signature_envelopes` ADD CONSTRAINT `signature_envelopes_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signature_recipients` ADD CONSTRAINT `signature_recipients_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signature_recipients` ADD CONSTRAINT `signature_recipients_envelope_id_signature_envelopes_id_fk` FOREIGN KEY (`envelope_id`) REFERENCES `signature_envelopes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signature_recipients` ADD CONSTRAINT `signature_recipients_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signing_challenges` ADD CONSTRAINT `signing_challenges_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signing_challenges` ADD CONSTRAINT `signing_challenges_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signing_challenges` ADD CONSTRAINT `signing_challenges_document_id_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signing_challenges` ADD CONSTRAINT `signing_challenges_envelope_id_signature_envelopes_id_fk` FOREIGN KEY (`envelope_id`) REFERENCES `signature_envelopes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sop_template_tasks` ADD CONSTRAINT `sop_template_tasks_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sop_template_tasks` ADD CONSTRAINT `sop_template_tasks_sop_template_id_sop_templates_id_fk` FOREIGN KEY (`sop_template_id`) REFERENCES `sop_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sop_templates` ADD CONSTRAINT `sop_templates_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storage_migration_items` ADD CONSTRAINT `storage_migration_items_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_comments` ADD CONSTRAINT `task_comments_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_comments` ADD CONSTRAINT `task_comments_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_comments` ADD CONSTRAINT `task_comments_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_watchers` ADD CONSTRAINT `task_watchers_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_watchers` ADD CONSTRAINT `task_watchers_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_watchers` ADD CONSTRAINT `task_watchers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_parent_task_id_tasks_id_fk` FOREIGN KEY (`parent_task_id`) REFERENCES `tasks`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_hearing_id_hearings_id_fk` FOREIGN KEY (`hearing_id`) REFERENCES `hearings`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_document_id_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_variables` ADD CONSTRAINT `template_variables_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_variables` ADD CONSTRAINT `template_variables_template_id_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `templates` ADD CONSTRAINT `templates_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `templates` ADD CONSTRAINT `templates_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testimonials` ADD CONSTRAINT `testimonials_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_educations` ADD CONSTRAINT `user_educations_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_educations` ADD CONSTRAINT `user_educations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_notable_cases` ADD CONSTRAINT `user_notable_cases_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_notable_cases` ADD CONSTRAINT `user_notable_cases_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_practice_areas` ADD CONSTRAINT `user_practice_areas_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_practice_areas` ADD CONSTRAINT `user_practice_areas_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_firm_id_firms_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_invited_by_users_id_fk` FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_deactivated_by_users_id_fk` FOREIGN KEY (`deactivated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `appointments_firm_date_idx` ON `appointments` (`firm_id`,`appointment_date`);--> statement-breakpoint
CREATE INDEX `appointments_firm_status_idx` ON `appointments` (`firm_id`,`status`);--> statement-breakpoint
CREATE INDEX `appointments_firm_assigned_idx` ON `appointments` (`firm_id`,`assigned_lawyer_id`);--> statement-breakpoint
CREATE INDEX `appointments_firm_lead_idx` ON `appointments` (`firm_id`,`lead_id`);--> statement-breakpoint
CREATE INDEX `attendance_firm_date_idx` ON `attendance` (`firm_id`,`attendance_date`);--> statement-breakpoint
CREATE INDEX `audit_log_firm_user_created_idx` ON `audit_log` (`firm_id`,`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_log_firm_resource_created_idx` ON `audit_log` (`firm_id`,`resource`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_log_firm_request_id_idx` ON `audit_log` (`firm_id`,`request_id`);--> statement-breakpoint
CREATE INDEX `auth_accounts_user_idx` ON `auth_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `auth_sessions_expiry_idx` ON `auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `auth_verifications_identifier_idx` ON `auth_verifications` (`identifier`);--> statement-breakpoint
CREATE INDEX `avatar_upload_intents_firm_status_idx` ON `avatar_upload_intents` (`firm_id`,`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `avatar_upload_intents_user_idx` ON `avatar_upload_intents` (`firm_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `blog_posts_firm_status_publish_idx` ON `blog_posts` (`firm_id`,`status`,`publish_date`);--> statement-breakpoint
CREATE INDEX `careers_firm_active_idx` ON `careers` (`firm_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `case_team_members_user_idx` ON `case_team_members` (`firm_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `cases_firm_client_idx` ON `cases` (`firm_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `cases_firm_lawyer_idx` ON `cases` (`firm_id`,`assigned_lawyer_id`);--> statement-breakpoint
CREATE INDEX `cases_firm_status_idx` ON `cases` (`firm_id`,`status`);--> statement-breakpoint
CREATE INDEX `client_kyc_files_client_idx` ON `client_kyc_files` (`firm_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `client_kyc_upload_intents_client_idx` ON `client_kyc_upload_intents` (`firm_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `client_kyc_upload_intents_status_idx` ON `client_kyc_upload_intents` (`firm_id`,`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `clients_firm_name_idx` ON `clients` (`firm_id`,`full_name`);--> statement-breakpoint
CREATE INDEX `clients_firm_kyc_status_idx` ON `clients` (`firm_id`,`kyc_status`);--> statement-breakpoint
CREATE INDEX `cms_asset_upload_intents_firm_status_idx` ON `cms_asset_upload_intents` (`firm_id`,`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `cms_asset_upload_intents_creator_idx` ON `cms_asset_upload_intents` (`firm_id`,`created_by`);--> statement-breakpoint
CREATE INDEX `conflict_checks_firm_status_idx` ON `conflict_checks` (`firm_id`,`status`);--> statement-breakpoint
CREATE INDEX `conflict_checks_firm_checked_at_idx` ON `conflict_checks` (`firm_id`,`checked_at`);--> statement-breakpoint
CREATE INDEX `dm_message_reads_user_idx` ON `dm_message_reads` (`firm_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `dm_messages_thread_created_idx` ON `dm_messages` (`firm_id`,`thread_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `dm_threads_firm_low_idx` ON `dm_threads` (`firm_id`,`user_low_id`);--> statement-breakpoint
CREATE INDEX `dm_threads_firm_high_idx` ON `dm_threads` (`firm_id`,`user_high_id`);--> statement-breakpoint
CREATE INDEX `document_scan_jobs_available_idx` ON `document_scan_jobs` (`status`,`available_at`);--> statement-breakpoint
CREATE INDEX `document_shares_firm_document_idx` ON `document_shares` (`firm_id`,`document_id`);--> statement-breakpoint
CREATE INDEX `document_shares_active_expiry_idx` ON `document_shares` (`firm_id`,`is_active`,`expires_at`);--> statement-breakpoint
CREATE INDEX `document_tag_assignments_tag_idx` ON `document_tag_assignments` (`firm_id`,`tag_id`);--> statement-breakpoint
CREATE INDEX `document_templates_firm_type_idx` ON `document_templates` (`firm_id`,`type`);--> statement-breakpoint
CREATE INDEX `document_upload_intents_firm_status_expiry_idx` ON `document_upload_intents` (`firm_id`,`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `document_upload_intents_creator_idx` ON `document_upload_intents` (`firm_id`,`created_by`);--> statement-breakpoint
CREATE INDEX `document_upload_rate_limits_user_idx` ON `document_upload_rate_limits` (`firm_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `documents_firm_case_idx` ON `documents` (`firm_id`,`case_id`);--> statement-breakpoint
CREATE INDEX `documents_firm_type_idx` ON `documents` (`firm_id`,`type`);--> statement-breakpoint
CREATE INDEX `documents_firm_parent_idx` ON `documents` (`firm_id`,`parent_document_id`);--> statement-breakpoint
CREATE INDEX `documents_firm_uploader_idx` ON `documents` (`firm_id`,`uploaded_by`);--> statement-breakpoint
CREATE INDEX `documents_firm_template_idx` ON `documents` (`firm_id`,`is_template`);--> statement-breakpoint
CREATE INDEX `documents_firm_signature_idx` ON `documents` (`firm_id`,`intended_signer_user_id`,`signature_status`);--> statement-breakpoint
CREATE INDEX `documents_firm_deleted_idx` ON `documents` (`firm_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `durable_job_attempts_job_idx` ON `durable_job_attempts` (`firm_id`,`job_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `durable_jobs_claim_idx` ON `durable_jobs` (`status`,`available_at`,`priority`,`created_at`);--> statement-breakpoint
CREATE INDEX `durable_jobs_firm_status_idx` ON `durable_jobs` (`firm_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `durable_schedules_due_idx` ON `durable_schedules` (`is_active`,`next_run_at`);--> statement-breakpoint
CREATE INDEX `hearings_firm_case_idx` ON `hearings` (`firm_id`,`case_id`);--> statement-breakpoint
CREATE INDEX `hearings_firm_date_idx` ON `hearings` (`firm_id`,`date_gregorian`);--> statement-breakpoint
CREATE INDEX `job_applications_firm_job_idx` ON `job_applications` (`firm_id`,`job_id`);--> statement-breakpoint
CREATE INDEX `job_applications_firm_status_idx` ON `job_applications` (`firm_id`,`status`);--> statement-breakpoint
CREATE INDEX `leads_firm_status_idx` ON `leads` (`firm_id`,`status`);--> statement-breakpoint
CREATE INDEX `leads_firm_assigned_idx` ON `leads` (`firm_id`,`assigned_to`);--> statement-breakpoint
CREATE INDEX `leave_balances_firm_user_year_idx` ON `leave_balances` (`firm_id`,`user_id`,`year`);--> statement-breakpoint
CREATE INDEX `leave_requests_firm_user_idx` ON `leave_requests` (`firm_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `leave_requests_firm_status_idx` ON `leave_requests` (`firm_id`,`status`);--> statement-breakpoint
CREATE INDEX `message_reads_user_idx` ON `message_reads` (`firm_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `messages_firm_case_created_idx` ON `messages` (`firm_id`,`case_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `messages_firm_sender_idx` ON `messages` (`firm_id`,`sender_id`);--> statement-breakpoint
CREATE INDEX `navigation_firm_parent_idx` ON `navigation` (`firm_id`,`parent_id`);--> statement-breakpoint
CREATE INDEX `news_and_awards_firm_type_idx` ON `news_and_awards` (`firm_id`,`type`);--> statement-breakpoint
CREATE INDEX `news_and_awards_firm_date_idx` ON `news_and_awards` (`firm_id`,`publication_date`);--> statement-breakpoint
CREATE INDEX `news_and_awards_firm_status_idx` ON `news_and_awards` (`firm_id`,`status`);--> statement-breakpoint
CREATE INDEX `notifications_firm_user_read_idx` ON `notifications` (`firm_id`,`user_id`,`is_read`);--> statement-breakpoint
CREATE INDEX `notifications_firm_created_idx` ON `notifications` (`firm_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `payroll_run_lines_firm_user_idx` ON `payroll_run_lines` (`firm_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `payroll_run_lines_firm_run_idx` ON `payroll_run_lines` (`firm_id`,`run_id`);--> statement-breakpoint
CREATE INDEX `payroll_runs_firm_period_idx` ON `payroll_runs` (`firm_id`,`period_start`,`period_end`);--> statement-breakpoint
CREATE INDEX `payroll_runs_firm_status_idx` ON `payroll_runs` (`firm_id`,`status`);--> statement-breakpoint
CREATE INDEX `practice_areas_firm_active_order_idx` ON `practice_areas` (`firm_id`,`is_active`,`display_order`);--> statement-breakpoint
CREATE INDEX `research_note_tags_firm_tag_idx` ON `research_note_tags` (`firm_id`,`tag`);--> statement-breakpoint
CREATE INDEX `research_notes_firm_author_idx` ON `research_notes` (`firm_id`,`author_id`);--> statement-breakpoint
CREATE INDEX `research_notes_firm_category_idx` ON `research_notes` (`firm_id`,`category`);--> statement-breakpoint
CREATE INDEX `research_notes_firm_case_idx` ON `research_notes` (`firm_id`,`case_id`);--> statement-breakpoint
CREATE INDEX `resources_firm_category_idx` ON `resources` (`firm_id`,`category`);--> statement-breakpoint
CREATE INDEX `resources_firm_status_idx` ON `resources` (`firm_id`,`status`);--> statement-breakpoint
CREATE INDEX `sessions_firm_user_active_idx` ON `sessions` (`firm_id`,`user_id`,`last_active`);--> statement-breakpoint
CREATE INDEX `sessions_expiry_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `signature_envelopes_firm_document_idx` ON `signature_envelopes` (`firm_id`,`document_id`);--> statement-breakpoint
CREATE INDEX `signature_envelopes_firm_status_idx` ON `signature_envelopes` (`firm_id`,`status`);--> statement-breakpoint
CREATE INDEX `signature_envelopes_firm_case_idx` ON `signature_envelopes` (`firm_id`,`case_id`);--> statement-breakpoint
CREATE INDEX `signature_recipients_user_status_idx` ON `signature_recipients` (`firm_id`,`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `signing_challenges_user_document_idx` ON `signing_challenges` (`firm_id`,`user_id`,`document_id`);--> statement-breakpoint
CREATE INDEX `signing_challenges_expiry_idx` ON `signing_challenges` (`firm_id`,`expires_at`);--> statement-breakpoint
CREATE INDEX `sop_templates_firm_practice_idx` ON `sop_templates` (`firm_id`,`practice_area`);--> statement-breakpoint
CREATE INDEX `storage_migration_items_firm_status_idx` ON `storage_migration_items` (`firm_id`,`status`);--> statement-breakpoint
CREATE INDEX `task_comments_firm_task_idx` ON `task_comments` (`firm_id`,`task_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `task_watchers_user_idx` ON `task_watchers` (`firm_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `tasks_firm_case_idx` ON `tasks` (`firm_id`,`case_id`);--> statement-breakpoint
CREATE INDEX `tasks_firm_assignee_idx` ON `tasks` (`firm_id`,`assigned_to`);--> statement-breakpoint
CREATE INDEX `tasks_firm_status_idx` ON `tasks` (`firm_id`,`status`);--> statement-breakpoint
CREATE INDEX `tasks_firm_hearing_idx` ON `tasks` (`firm_id`,`hearing_id`);--> statement-breakpoint
CREATE INDEX `tasks_firm_parent_idx` ON `tasks` (`firm_id`,`parent_task_id`);--> statement-breakpoint
CREATE INDEX `tasks_firm_due_idx` ON `tasks` (`firm_id`,`due_date`);--> statement-breakpoint
CREATE INDEX `templates_firm_category_idx` ON `templates` (`firm_id`,`category`);--> statement-breakpoint
CREATE INDEX `testimonials_firm_approved_idx` ON `testimonials` (`firm_id`,`is_approved`);--> statement-breakpoint
CREATE INDEX `testimonials_firm_approved_order_idx` ON `testimonials` (`firm_id`,`is_approved`,`display_order`);--> statement-breakpoint
CREATE INDEX `users_firm_role_idx` ON `users` (`firm_id`,`role`);
