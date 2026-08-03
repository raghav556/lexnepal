CREATE TYPE "public"."application_status" AS ENUM('new', 'reviewed', 'interviewed', 'rejected', 'hired');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('pending', 'confirmed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'half_day', 'leave');--> statement-breakpoint
CREATE TYPE "public"."blog_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."career_type" AS ENUM('full_time', 'part_time', 'contract', 'internship');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('inquiry', 'active', 'on_hold', 'closed_won', 'closed_lost');--> statement-breakpoint
CREATE TYPE "public"."client_type" AS ENUM('individual', 'corporate');--> statement-breakpoint
CREATE TYPE "public"."confidentiality_level" AS ENUM('public', 'internal', 'confidential', 'privileged');--> statement-breakpoint
CREATE TYPE "public"."conflict_status" AS ENUM('pending', 'cleared', 'conflict');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('draft', 'review', 'approved', 'filed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."document_template_type" AS ENUM('retainer', 'petition', 'nda', 'general');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('pleading', 'affidavit', 'contract', 'poa', 'correspondence', 'evidence', 'template', 'court_filing', 'notice', 'memo', 'other');--> statement-breakpoint
CREATE TYPE "public"."envelope_routing" AS ENUM('sequential', 'parallel');--> statement-breakpoint
CREATE TYPE "public"."envelope_status" AS ENUM('draft', 'sent', 'completed', 'declined', 'voided', 'expired');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('office_rent', 'utilities', 'court_fees', 'courier', 'printing', 'travel', 'supplies', 'software', 'other');--> statement-breakpoint
CREATE TYPE "public"."hearing_status" AS ENUM('scheduled', 'completed', 'adjourned', 'cancelled', 'postponed', 'not_reached', 'bench_disqualified', 'could_not_present', 'part_heard', 'continuous', 'procedural_order', 'evidence_exam', 'final_judgment', 'dismissed', 'settled', 'archived', 'on_hold');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."kyc_document_type" AS ENUM('government_id', 'proof_of_address', 'other');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('pending', 'submitted', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('website', 'referral', 'walk_in', 'phone', 'social', 'newsletter');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'consultation_scheduled', 'converted', 'lost');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('annual', 'sick', 'maternity', 'paternity', 'unpaid');--> statement-breakpoint
CREATE TYPE "public"."legal_page_slug" AS ENUM('privacy-policy', 'terms');--> statement-breakpoint
CREATE TYPE "public"."line_item_type" AS ENUM('time', 'fixed', 'expense');--> statement-breakpoint
CREATE TYPE "public"."navigation_location" AS ENUM('header', 'footer_col_1', 'footer_col_2');--> statement-breakpoint
CREATE TYPE "public"."news_type" AS ENUM('award', 'press_release', 'firm_news');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('hearing_reminder', 'task_due', 'invoice_sent', 'payment_received', 'document_request', 'message', 'system');--> statement-breakpoint
CREATE TYPE "public"."payment_gateway" AS ENUM('esewa', 'khalti', 'connectips', 'bank_transfer', 'cash');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."recipient_status" AS ENUM('pending', 'awaiting_turn', 'signed', 'declined');--> statement-breakpoint
CREATE TYPE "public"."recurrence_rule" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."research_category" AS ENUM('supreme_court', 'high_court', 'district_court', 'commentary', 'procedure', 'template_research');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."signature_method" AS ENUM('draw', 'type', 'upload');--> statement-breakpoint
CREATE TYPE "public"."signature_status" AS ENUM('pending', 'signed');--> statement-breakpoint
CREATE TYPE "public"."task_category" AS ENUM('filing', 'research', 'client', 'court', 'admin', 'other');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."template_category" AS ENUM('vakalatnama', 'firad_patra', 'jawab', 'prastab_patra', 'retainer', 'poa', 'contract', 'other');--> statement-breakpoint
CREATE TYPE "public"."trust_transaction_type" AS ENUM('receipt', 'disbursement');--> statement-breakpoint
CREATE TYPE "public"."upload_status" AS ENUM('quarantined', 'scanning', 'clean', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('partner', 'senior_associate', 'associate', 'paralegal', 'intern', 'admin', 'client');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"client_name" text NOT NULL,
	"client_email" text,
	"client_phone" text NOT NULL,
	"client_id" uuid,
	"practice_area" text NOT NULL,
	"appointment_date" date NOT NULL,
	"time_slot" text NOT NULL,
	"notes" text,
	"status" "appointment_status" DEFAULT 'pending' NOT NULL,
	"assigned_lawyer_id" uuid,
	"meeting_link" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "appointments_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"attendance_date" date NOT NULL,
	"clock_in" timestamp with time zone,
	"clock_out" timestamp with time zone,
	"status" "attendance_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "attendance_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" text,
	"details" text,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "audit_log_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"category" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"cover_image_url" text,
	"author" text NOT NULL,
	"status" "blog_status" NOT NULL,
	"publish_date" timestamp with time zone,
	"seo_title" text,
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "blog_posts_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "career_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"career_id" uuid NOT NULL,
	"requirement" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "career_requirements_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "careers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"title" text NOT NULL,
	"department" text NOT NULL,
	"location" text NOT NULL,
	"type" "career_type" NOT NULL,
	"description" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"posted_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "careers_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "case_team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "case_team_members_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"case_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"practice_area" text NOT NULL,
	"status" "case_status" NOT NULL,
	"client_id" uuid NOT NULL,
	"assigned_lawyer_id" uuid NOT NULL,
	"court" text,
	"judge" text,
	"opposing_counsel" text,
	"filing_date" date,
	"closed_date" date,
	"conflict_checked" boolean DEFAULT false NOT NULL,
	"conflict_cleared_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "cases_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "client_kyc_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"storage_id" text NOT NULL,
	"document_type" "kyc_document_type" DEFAULT 'other' NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text,
	"sha256" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "client_kyc_files_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"user_id" uuid,
	"type" "client_type" NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"company_name" text,
	"registration_number" text,
	"kyc_status" "kyc_status" DEFAULT 'pending' NOT NULL,
	"kyc_id_number" text,
	"kyc_consent_at" timestamp with time zone,
	"kyc_consent_version" text,
	"kyc_rejection_reason" text,
	"kyc_submitted_at" timestamp with time zone,
	"kyc_reviewed_at" timestamp with time zone,
	"kyc_reviewed_by" uuid,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "clients_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "cms_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "cms_settings_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "conflict_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"search_query" text NOT NULL,
	"hits_count" integer DEFAULT 0 NOT NULL,
	"status" "conflict_status" NOT NULL,
	"run_by" uuid,
	"run_by_name" text NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "conflict_checks_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "document_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"token" text NOT NULL,
	"password_hash" text,
	"expires_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"downloads_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"allow_download" boolean DEFAULT true NOT NULL,
	"max_downloads" integer,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_access_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "document_shares_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "document_tag_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "document_tag_assignments_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "document_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "document_tags_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "document_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "document_template_type" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "document_templates_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "document_upload_rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "document_upload_rate_limits_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"case_id" uuid,
	"document_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "document_type" NOT NULL,
	"storage_id" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"sha256" text,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_document_id" uuid,
	"uploaded_by" uuid NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"is_privileged" boolean DEFAULT false NOT NULL,
	"searchable_text" text,
	"thumbnail_storage_id" text,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"is_locked_for_edit" boolean DEFAULT false NOT NULL,
	"locked_by" uuid,
	"locked_at" timestamp with time zone,
	"physical_location" text,
	"expires_at" timestamp with time zone,
	"retention_policy" text,
	"date_bs" text,
	"is_on_legal_hold" boolean DEFAULT false NOT NULL,
	"legal_hold_reason" text,
	"legal_hold_set_at" timestamp with time zone,
	"legal_hold_set_by" uuid,
	"retention_until" timestamp with time zone,
	"upload_status" "upload_status" DEFAULT 'quarantined' NOT NULL,
	"scan_provider" text,
	"scan_completed_at" timestamp with time zone,
	"scan_details" text,
	"confidentiality_level" "confidentiality_level" DEFAULT 'internal' NOT NULL,
	"requires_signature" boolean DEFAULT false NOT NULL,
	"signature_status" "signature_status",
	"signed_at" timestamp with time zone,
	"intended_signer_user_id" uuid,
	"signed_by_user_id" uuid,
	"signature_method" "signature_method",
	"signature_artifact_storage_id" text,
	"typed_signature_text" text,
	"sign_consent_version" text,
	"sign_consent_at" timestamp with time zone,
	"viewed_at" timestamp with time zone,
	"signer_user_agent" text,
	"deleted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "documents_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"description" text NOT NULL,
	"category" "expense_category" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"case_id" uuid,
	"receipt_id" text,
	"expense_date" date NOT NULL,
	"submitted_by" uuid NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"approved_by" uuid,
	"invoice_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "expenses_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "firm_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "firm_settings_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "firms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "firms_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "hearings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"court" text NOT NULL,
	"judge" text,
	"date_gregorian" date NOT NULL,
	"date_bs" text NOT NULL,
	"hearing_time" time,
	"purpose" text,
	"outcome" text,
	"next_date_gregorian" date,
	"next_date_bs" text,
	"status" "hearing_status" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "hearings_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"type" "line_item_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "invoice_line_items_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"case_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL,
	"vat_amount" numeric(14, 2) NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"issued_date" date NOT NULL,
	"due_date" date NOT NULL,
	"paid_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "invoices_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"applicant_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"resume_url" text,
	"cover_letter" text,
	"status" "application_status" DEFAULT 'new' NOT NULL,
	"applied_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "job_applications_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"source" "lead_source" NOT NULL,
	"practice_area_interest" text,
	"message" text,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"assigned_to" uuid,
	"converted_client_id" uuid,
	"notes" text,
	"intake_token" text,
	"intake_submitted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "leads_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "leave_type" NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"reason" text,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "leave_requests_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "legal_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"slug" "legal_page_slug" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"content_updated_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "legal_pages_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "message_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"storage_id" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "message_attachments_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "message_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "message_reads_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "messages_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "navigation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"location" "navigation_location" NOT NULL,
	"display_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"parent_id" uuid,
	"open_in_new_tab" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "navigation_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "news_and_awards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"publication_date" date NOT NULL,
	"type" "news_type" NOT NULL,
	"link_url" text,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "news_and_awards_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"email" text NOT NULL,
	"subscribed_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "newsletter_subscribers_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"related_id" text,
	"link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "notifications_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"gateway" "payment_gateway" NOT NULL,
	"reference_number" text,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "payments_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "practice_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"slug" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "practice_areas_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "research_note_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"research_note_id" uuid NOT NULL,
	"tag" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "research_note_tags_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "research_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category" "research_category" NOT NULL,
	"content" text NOT NULL,
	"author_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "research_notes_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"cover_image_url" text,
	"file_url" text NOT NULL,
	"is_gated" boolean DEFAULT false NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"published_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "resources_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"device" text NOT NULL,
	"browser" text NOT NULL,
	"ip_address" text NOT NULL,
	"last_active" timestamp with time zone NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "sessions_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "signature_envelopes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"case_id" uuid,
	"title" text NOT NULL,
	"status" "envelope_status" DEFAULT 'draft' NOT NULL,
	"routing" "envelope_routing" NOT NULL,
	"created_by" uuid NOT NULL,
	"expires_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"completed_at" timestamp with time zone,
	"last_reminded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "signature_envelopes_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "signature_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"envelope_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"routing_order" integer NOT NULL,
	"status" "recipient_status" NOT NULL,
	"declined_at" timestamp with time zone,
	"decline_reason" text,
	"signed_at" timestamp with time zone,
	"reminded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "signature_recipients_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "signing_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"envelope_id" uuid,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "signing_challenges_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "sop_template_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"sop_template_id" uuid NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "sop_template_tasks_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "sop_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"default_priority" "priority" NOT NULL,
	"practice_area" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "sop_templates_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "task_comments_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "task_watchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "task_watchers_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"case_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"assigned_to" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"priority" "priority" NOT NULL,
	"category" "task_category",
	"due_date" timestamp with time zone,
	"due_date_bs" text,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurrence_rule" "recurrence_rule",
	"reminder_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"parent_task_id" uuid,
	"client_visible" boolean DEFAULT false NOT NULL,
	"hearing_id" uuid,
	"document_id" uuid,
	"last_due_reminder_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tasks_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "template_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"variable" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "template_variables_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" "template_category" NOT NULL,
	"html_content" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "templates_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"client_name" text NOT NULL,
	"company" text,
	"quote" text NOT NULL,
	"rating" integer,
	"is_approved" boolean DEFAULT false NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "testimonials_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"description" text NOT NULL,
	"minutes" integer NOT NULL,
	"is_billable" boolean DEFAULT true NOT NULL,
	"entry_date" date NOT NULL,
	"rate_per_hour" numeric(14, 2) NOT NULL,
	"invoice_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "time_entries_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "trust_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"case_id" uuid,
	"type" "trust_transaction_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"description" text NOT NULL,
	"transaction_date" date NOT NULL,
	"balance" numeric(14, 2) NOT NULL,
	"approved_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "trust_transactions_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "user_educations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"degree" text NOT NULL,
	"institution" text NOT NULL,
	"year" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "user_educations_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "user_notable_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"description" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "user_notable_cases_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "user_practice_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"practice_area" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "user_practice_areas_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_convex_id" text,
	"firm_id" uuid NOT NULL,
	"token_identifier" text NOT NULL,
	"name" text,
	"email" text,
	"role" "user_role" NOT NULL,
	"avatar" text,
	"phone" text,
	"bar_council_number" text,
	"bar_council_expiry" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public_facing" boolean DEFAULT false NOT NULL,
	"bio" text,
	"long_bio" text,
	"public_email" text,
	"linkedin_url" text,
	"twitter_url" text,
	"base_salary" numeric(14, 2),
	"activation_token" text,
	"is_pending" boolean DEFAULT false NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_required" boolean DEFAULT false NOT NULL,
	"totp_secret" text,
	"password_hash" text,
	"last_login_at" timestamp with time zone,
	"invited_at" timestamp with time zone,
	"invited_by" uuid,
	"invite_expires_at" timestamp with time zone,
	"deactivated_at" timestamp with time zone,
	"deactivated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_legacy_convex_id_unique" UNIQUE("legacy_convex_id")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assigned_lawyer_id_users_id_fk" FOREIGN KEY ("assigned_lawyer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_requirements" ADD CONSTRAINT "career_requirements_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_requirements" ADD CONSTRAINT "career_requirements_career_id_careers_id_fk" FOREIGN KEY ("career_id") REFERENCES "public"."careers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "careers" ADD CONSTRAINT "careers_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_team_members" ADD CONSTRAINT "case_team_members_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_team_members" ADD CONSTRAINT "case_team_members_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_team_members" ADD CONSTRAINT "case_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_assigned_lawyer_id_users_id_fk" FOREIGN KEY ("assigned_lawyer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_conflict_cleared_by_users_id_fk" FOREIGN KEY ("conflict_cleared_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_kyc_files" ADD CONSTRAINT "client_kyc_files_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_kyc_files" ADD CONSTRAINT "client_kyc_files_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_kyc_reviewed_by_users_id_fk" FOREIGN KEY ("kyc_reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_settings" ADD CONSTRAINT "cms_settings_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflict_checks" ADD CONSTRAINT "conflict_checks_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflict_checks" ADD CONSTRAINT "conflict_checks_run_by_users_id_fk" FOREIGN KEY ("run_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_tag_assignments" ADD CONSTRAINT "document_tag_assignments_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_tag_assignments" ADD CONSTRAINT "document_tag_assignments_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_tag_assignments" ADD CONSTRAINT "document_tag_assignments_tag_id_document_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."document_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_upload_rate_limits" ADD CONSTRAINT "document_upload_rate_limits_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_upload_rate_limits" ADD CONSTRAINT "document_upload_rate_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_parent_document_id_documents_id_fk" FOREIGN KEY ("parent_document_id") REFERENCES "public"."documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_locked_by_users_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_legal_hold_set_by_users_id_fk" FOREIGN KEY ("legal_hold_set_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_intended_signer_user_id_users_id_fk" FOREIGN KEY ("intended_signer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_signed_by_user_id_users_id_fk" FOREIGN KEY ("signed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_settings" ADD CONSTRAINT "firm_settings_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_careers_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."careers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_client_id_clients_id_fk" FOREIGN KEY ("converted_client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_pages" ADD CONSTRAINT "legal_pages_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "navigation" ADD CONSTRAINT "navigation_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "navigation" ADD CONSTRAINT "navigation_parent_id_navigation_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_and_awards" ADD CONSTRAINT "news_and_awards_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_areas" ADD CONSTRAINT "practice_areas_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_note_tags" ADD CONSTRAINT "research_note_tags_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_note_tags" ADD CONSTRAINT "research_note_tags_research_note_id_research_notes_id_fk" FOREIGN KEY ("research_note_id") REFERENCES "public"."research_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_notes" ADD CONSTRAINT "research_notes_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_notes" ADD CONSTRAINT "research_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_envelopes" ADD CONSTRAINT "signature_envelopes_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_envelopes" ADD CONSTRAINT "signature_envelopes_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_envelopes" ADD CONSTRAINT "signature_envelopes_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_envelopes" ADD CONSTRAINT "signature_envelopes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_recipients" ADD CONSTRAINT "signature_recipients_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_recipients" ADD CONSTRAINT "signature_recipients_envelope_id_signature_envelopes_id_fk" FOREIGN KEY ("envelope_id") REFERENCES "public"."signature_envelopes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_recipients" ADD CONSTRAINT "signature_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signing_challenges" ADD CONSTRAINT "signing_challenges_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signing_challenges" ADD CONSTRAINT "signing_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signing_challenges" ADD CONSTRAINT "signing_challenges_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signing_challenges" ADD CONSTRAINT "signing_challenges_envelope_id_signature_envelopes_id_fk" FOREIGN KEY ("envelope_id") REFERENCES "public"."signature_envelopes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sop_template_tasks" ADD CONSTRAINT "sop_template_tasks_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sop_template_tasks" ADD CONSTRAINT "sop_template_tasks_sop_template_id_sop_templates_id_fk" FOREIGN KEY ("sop_template_id") REFERENCES "public"."sop_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sop_templates" ADD CONSTRAINT "sop_templates_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_watchers" ADD CONSTRAINT "task_watchers_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_watchers" ADD CONSTRAINT "task_watchers_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_watchers" ADD CONSTRAINT "task_watchers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_hearing_id_hearings_id_fk" FOREIGN KEY ("hearing_id") REFERENCES "public"."hearings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_variables" ADD CONSTRAINT "template_variables_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_variables" ADD CONSTRAINT "template_variables_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_transactions" ADD CONSTRAINT "trust_transactions_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_transactions" ADD CONSTRAINT "trust_transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_transactions" ADD CONSTRAINT "trust_transactions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_transactions" ADD CONSTRAINT "trust_transactions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_educations" ADD CONSTRAINT "user_educations_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_educations" ADD CONSTRAINT "user_educations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notable_cases" ADD CONSTRAINT "user_notable_cases_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notable_cases" ADD CONSTRAINT "user_notable_cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_practice_areas" ADD CONSTRAINT "user_practice_areas_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_practice_areas" ADD CONSTRAINT "user_practice_areas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_deactivated_by_users_id_fk" FOREIGN KEY ("deactivated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_firm_date_idx" ON "appointments" USING btree ("firm_id","appointment_date");--> statement-breakpoint
CREATE INDEX "appointments_firm_status_idx" ON "appointments" USING btree ("firm_id","status");--> statement-breakpoint
CREATE INDEX "appointments_firm_lawyer_date_idx" ON "appointments" USING btree ("firm_id","assigned_lawyer_id","appointment_date");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_firm_user_date_unique" ON "attendance" USING btree ("firm_id","user_id","attendance_date");--> statement-breakpoint
CREATE INDEX "attendance_firm_date_idx" ON "attendance" USING btree ("firm_id","attendance_date");--> statement-breakpoint
CREATE INDEX "audit_log_firm_user_created_idx" ON "audit_log" USING btree ("firm_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_firm_resource_created_idx" ON "audit_log" USING btree ("firm_id","resource","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_firm_slug_unique" ON "blog_posts" USING btree ("firm_id","slug");--> statement-breakpoint
CREATE INDEX "blog_posts_firm_status_publish_idx" ON "blog_posts" USING btree ("firm_id","status","publish_date");--> statement-breakpoint
CREATE UNIQUE INDEX "career_requirements_position_unique" ON "career_requirements" USING btree ("firm_id","career_id","position");--> statement-breakpoint
CREATE INDEX "careers_firm_active_idx" ON "careers" USING btree ("firm_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "case_team_members_unique" ON "case_team_members" USING btree ("firm_id","case_id","user_id");--> statement-breakpoint
CREATE INDEX "case_team_members_user_idx" ON "case_team_members" USING btree ("firm_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cases_firm_case_number_unique" ON "cases" USING btree ("firm_id","case_number");--> statement-breakpoint
CREATE INDEX "cases_firm_client_idx" ON "cases" USING btree ("firm_id","client_id");--> statement-breakpoint
CREATE INDEX "cases_firm_lawyer_idx" ON "cases" USING btree ("firm_id","assigned_lawyer_id");--> statement-breakpoint
CREATE INDEX "cases_firm_status_idx" ON "cases" USING btree ("firm_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "client_kyc_files_storage_unique" ON "client_kyc_files" USING btree ("firm_id","storage_id");--> statement-breakpoint
CREATE INDEX "client_kyc_files_client_idx" ON "client_kyc_files" USING btree ("firm_id","client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_firm_user_unique" ON "clients" USING btree ("firm_id","user_id");--> statement-breakpoint
CREATE INDEX "clients_firm_name_idx" ON "clients" USING btree ("firm_id","full_name");--> statement-breakpoint
CREATE INDEX "clients_firm_kyc_status_idx" ON "clients" USING btree ("firm_id","kyc_status");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_settings_firm_key_unique" ON "cms_settings" USING btree ("firm_id","key");--> statement-breakpoint
CREATE INDEX "conflict_checks_firm_status_idx" ON "conflict_checks" USING btree ("firm_id","status");--> statement-breakpoint
CREATE INDEX "conflict_checks_firm_checked_at_idx" ON "conflict_checks" USING btree ("firm_id","checked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "document_shares_token_unique" ON "document_shares" USING btree ("token");--> statement-breakpoint
CREATE INDEX "document_shares_firm_document_idx" ON "document_shares" USING btree ("firm_id","document_id");--> statement-breakpoint
CREATE INDEX "document_shares_active_expiry_idx" ON "document_shares" USING btree ("firm_id","is_active","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "document_tag_assignments_unique" ON "document_tag_assignments" USING btree ("firm_id","document_id","tag_id");--> statement-breakpoint
CREATE INDEX "document_tag_assignments_tag_idx" ON "document_tag_assignments" USING btree ("firm_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_tags_firm_name_unique" ON "document_tags" USING btree ("firm_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "document_templates_firm_title_unique" ON "document_templates" USING btree ("firm_id","title");--> statement-breakpoint
CREATE INDEX "document_templates_firm_type_idx" ON "document_templates" USING btree ("firm_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "document_upload_rate_limits_window_unique" ON "document_upload_rate_limits" USING btree ("firm_id","user_id","window_started_at");--> statement-breakpoint
CREATE INDEX "document_upload_rate_limits_user_idx" ON "document_upload_rate_limits" USING btree ("firm_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_firm_number_unique" ON "documents" USING btree ("firm_id","document_number");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_firm_storage_unique" ON "documents" USING btree ("firm_id","storage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_parent_version_unique" ON "documents" USING btree ("firm_id","parent_document_id","version");--> statement-breakpoint
CREATE INDEX "documents_firm_case_idx" ON "documents" USING btree ("firm_id","case_id");--> statement-breakpoint
CREATE INDEX "documents_firm_type_idx" ON "documents" USING btree ("firm_id","type");--> statement-breakpoint
CREATE INDEX "documents_firm_parent_idx" ON "documents" USING btree ("firm_id","parent_document_id");--> statement-breakpoint
CREATE INDEX "documents_firm_uploader_idx" ON "documents" USING btree ("firm_id","uploaded_by");--> statement-breakpoint
CREATE INDEX "documents_firm_template_idx" ON "documents" USING btree ("firm_id","is_template");--> statement-breakpoint
CREATE INDEX "documents_firm_signature_idx" ON "documents" USING btree ("firm_id","intended_signer_user_id","signature_status");--> statement-breakpoint
CREATE INDEX "documents_firm_deleted_idx" ON "documents" USING btree ("firm_id","deleted_at");--> statement-breakpoint
CREATE INDEX "expenses_firm_status_idx" ON "expenses" USING btree ("firm_id","status");--> statement-breakpoint
CREATE INDEX "expenses_firm_case_idx" ON "expenses" USING btree ("firm_id","case_id");--> statement-breakpoint
CREATE INDEX "expenses_firm_date_idx" ON "expenses" USING btree ("firm_id","expense_date");--> statement-breakpoint
CREATE UNIQUE INDEX "firm_settings_firm_key_unique" ON "firm_settings" USING btree ("firm_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "firms_slug_unique" ON "firms" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "hearings_firm_case_idx" ON "hearings" USING btree ("firm_id","case_id");--> statement-breakpoint
CREATE INDEX "hearings_firm_date_idx" ON "hearings" USING btree ("firm_id","date_gregorian");--> statement-breakpoint
CREATE INDEX "invoice_line_items_firm_invoice_idx" ON "invoice_line_items" USING btree ("firm_id","invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_firm_number_unique" ON "invoices" USING btree ("firm_id","invoice_number");--> statement-breakpoint
CREATE INDEX "invoices_firm_case_idx" ON "invoices" USING btree ("firm_id","case_id");--> statement-breakpoint
CREATE INDEX "invoices_firm_client_idx" ON "invoices" USING btree ("firm_id","client_id");--> statement-breakpoint
CREATE INDEX "invoices_firm_status_due_idx" ON "invoices" USING btree ("firm_id","status","due_date");--> statement-breakpoint
CREATE INDEX "job_applications_firm_job_idx" ON "job_applications" USING btree ("firm_id","job_id");--> statement-breakpoint
CREATE INDEX "job_applications_firm_status_idx" ON "job_applications" USING btree ("firm_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_intake_token_unique" ON "leads" USING btree ("intake_token");--> statement-breakpoint
CREATE INDEX "leads_firm_status_idx" ON "leads" USING btree ("firm_id","status");--> statement-breakpoint
CREATE INDEX "leads_firm_assigned_idx" ON "leads" USING btree ("firm_id","assigned_to");--> statement-breakpoint
CREATE INDEX "leave_requests_firm_user_idx" ON "leave_requests" USING btree ("firm_id","user_id");--> statement-breakpoint
CREATE INDEX "leave_requests_firm_status_idx" ON "leave_requests" USING btree ("firm_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_pages_firm_slug_unique" ON "legal_pages" USING btree ("firm_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "message_attachments_position_unique" ON "message_attachments" USING btree ("firm_id","message_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "message_reads_unique" ON "message_reads" USING btree ("firm_id","message_id","user_id");--> statement-breakpoint
CREATE INDEX "message_reads_user_idx" ON "message_reads" USING btree ("firm_id","user_id");--> statement-breakpoint
CREATE INDEX "messages_firm_case_created_idx" ON "messages" USING btree ("firm_id","case_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_firm_sender_idx" ON "messages" USING btree ("firm_id","sender_id");--> statement-breakpoint
CREATE UNIQUE INDEX "navigation_firm_location_order_unique" ON "navigation" USING btree ("firm_id","location","display_order");--> statement-breakpoint
CREATE INDEX "navigation_firm_parent_idx" ON "navigation" USING btree ("firm_id","parent_id");--> statement-breakpoint
CREATE INDEX "news_and_awards_firm_type_idx" ON "news_and_awards" USING btree ("firm_id","type");--> statement-breakpoint
CREATE INDEX "news_and_awards_firm_date_idx" ON "news_and_awards" USING btree ("firm_id","publication_date");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscribers_firm_email_unique" ON "newsletter_subscribers" USING btree ("firm_id","email");--> statement-breakpoint
CREATE INDEX "notifications_firm_user_read_idx" ON "notifications" USING btree ("firm_id","user_id","is_read");--> statement-breakpoint
CREATE INDEX "notifications_firm_created_idx" ON "notifications" USING btree ("firm_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_firm_gateway_reference_unique" ON "payments" USING btree ("firm_id","gateway","reference_number");--> statement-breakpoint
CREATE INDEX "payments_firm_invoice_idx" ON "payments" USING btree ("firm_id","invoice_id");--> statement-breakpoint
CREATE INDEX "payments_firm_client_idx" ON "payments" USING btree ("firm_id","client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_areas_firm_slug_unique" ON "practice_areas" USING btree ("firm_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "research_note_tags_unique" ON "research_note_tags" USING btree ("firm_id","research_note_id","tag");--> statement-breakpoint
CREATE INDEX "research_note_tags_firm_tag_idx" ON "research_note_tags" USING btree ("firm_id","tag");--> statement-breakpoint
CREATE INDEX "research_notes_firm_author_idx" ON "research_notes" USING btree ("firm_id","author_id");--> statement-breakpoint
CREATE INDEX "research_notes_firm_category_idx" ON "research_notes" USING btree ("firm_id","category");--> statement-breakpoint
CREATE INDEX "resources_firm_category_idx" ON "resources" USING btree ("firm_id","category");--> statement-breakpoint
CREATE INDEX "sessions_firm_user_active_idx" ON "sessions" USING btree ("firm_id","user_id","last_active");--> statement-breakpoint
CREATE INDEX "signature_envelopes_firm_document_idx" ON "signature_envelopes" USING btree ("firm_id","document_id");--> statement-breakpoint
CREATE INDEX "signature_envelopes_firm_status_idx" ON "signature_envelopes" USING btree ("firm_id","status");--> statement-breakpoint
CREATE INDEX "signature_envelopes_firm_case_idx" ON "signature_envelopes" USING btree ("firm_id","case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "signature_recipients_envelope_user_unique" ON "signature_recipients" USING btree ("firm_id","envelope_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "signature_recipients_envelope_order_unique" ON "signature_recipients" USING btree ("firm_id","envelope_id","routing_order");--> statement-breakpoint
CREATE INDEX "signature_recipients_user_status_idx" ON "signature_recipients" USING btree ("firm_id","user_id","status");--> statement-breakpoint
CREATE INDEX "signing_challenges_user_document_idx" ON "signing_challenges" USING btree ("firm_id","user_id","document_id");--> statement-breakpoint
CREATE INDEX "signing_challenges_expiry_idx" ON "signing_challenges" USING btree ("firm_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sop_template_tasks_position_unique" ON "sop_template_tasks" USING btree ("firm_id","sop_template_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "sop_templates_firm_key_unique" ON "sop_templates" USING btree ("firm_id","key");--> statement-breakpoint
CREATE INDEX "sop_templates_firm_practice_idx" ON "sop_templates" USING btree ("firm_id","practice_area");--> statement-breakpoint
CREATE INDEX "task_comments_firm_task_idx" ON "task_comments" USING btree ("firm_id","task_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_watchers_unique" ON "task_watchers" USING btree ("firm_id","task_id","user_id");--> statement-breakpoint
CREATE INDEX "task_watchers_user_idx" ON "task_watchers" USING btree ("firm_id","user_id");--> statement-breakpoint
CREATE INDEX "tasks_firm_case_idx" ON "tasks" USING btree ("firm_id","case_id");--> statement-breakpoint
CREATE INDEX "tasks_firm_assignee_idx" ON "tasks" USING btree ("firm_id","assigned_to");--> statement-breakpoint
CREATE INDEX "tasks_firm_status_idx" ON "tasks" USING btree ("firm_id","status");--> statement-breakpoint
CREATE INDEX "tasks_firm_hearing_idx" ON "tasks" USING btree ("firm_id","hearing_id");--> statement-breakpoint
CREATE INDEX "tasks_firm_parent_idx" ON "tasks" USING btree ("firm_id","parent_task_id");--> statement-breakpoint
CREATE INDEX "tasks_firm_due_idx" ON "tasks" USING btree ("firm_id","due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "template_variables_unique" ON "template_variables" USING btree ("firm_id","template_id","variable");--> statement-breakpoint
CREATE UNIQUE INDEX "template_variables_position_unique" ON "template_variables" USING btree ("firm_id","template_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "templates_firm_title_unique" ON "templates" USING btree ("firm_id","title");--> statement-breakpoint
CREATE INDEX "templates_firm_category_idx" ON "templates" USING btree ("firm_id","category");--> statement-breakpoint
CREATE INDEX "testimonials_firm_approved_idx" ON "testimonials" USING btree ("firm_id","is_approved");--> statement-breakpoint
CREATE INDEX "time_entries_firm_case_idx" ON "time_entries" USING btree ("firm_id","case_id");--> statement-breakpoint
CREATE INDEX "time_entries_firm_user_idx" ON "time_entries" USING btree ("firm_id","user_id");--> statement-breakpoint
CREATE INDEX "time_entries_firm_invoice_idx" ON "time_entries" USING btree ("firm_id","invoice_id");--> statement-breakpoint
CREATE INDEX "trust_transactions_firm_client_date_idx" ON "trust_transactions" USING btree ("firm_id","client_id","transaction_date");--> statement-breakpoint
CREATE INDEX "trust_transactions_firm_case_idx" ON "trust_transactions" USING btree ("firm_id","case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_educations_position_unique" ON "user_educations" USING btree ("firm_id","user_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "user_notable_cases_position_unique" ON "user_notable_cases" USING btree ("firm_id","user_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "user_practice_areas_unique" ON "user_practice_areas" USING btree ("firm_id","user_id","practice_area");--> statement-breakpoint
CREATE UNIQUE INDEX "users_token_identifier_unique" ON "users" USING btree ("token_identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "users_firm_email_unique" ON "users" USING btree ("firm_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_activation_token_unique" ON "users" USING btree ("activation_token");--> statement-breakpoint
CREATE INDEX "users_firm_role_idx" ON "users" USING btree ("firm_id","role");