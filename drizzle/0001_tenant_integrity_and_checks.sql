-- Every tenant table gets a candidate key used by composite tenant foreign keys.
DO $$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'firm_id'
    ORDER BY table_name
  LOOP
    EXECUTE format(
      'CREATE UNIQUE INDEX %I ON public.%I (firm_id, id)',
      left(target.table_name || '_firm_id_id_unique', 63),
      target.table_name
    );
  END LOOP;
END $$;
--> statement-breakpoint

-- Identity, client and matter tenant integrity.
ALTER TABLE users
  ADD CONSTRAINT users_invited_by_same_firm_fk FOREIGN KEY (firm_id, invited_by) REFERENCES users (firm_id, id),
  ADD CONSTRAINT users_deactivated_by_same_firm_fk FOREIGN KEY (firm_id, deactivated_by) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE user_educations ADD CONSTRAINT user_educations_same_firm_fk FOREIGN KEY (firm_id, user_id) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE user_practice_areas ADD CONSTRAINT user_practice_areas_same_firm_fk FOREIGN KEY (firm_id, user_id) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE user_notable_cases ADD CONSTRAINT user_notable_cases_same_firm_fk FOREIGN KEY (firm_id, user_id) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE conflict_checks ADD CONSTRAINT conflict_checks_run_by_same_firm_fk FOREIGN KEY (firm_id, run_by) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE clients
  ADD CONSTRAINT clients_user_same_firm_fk FOREIGN KEY (firm_id, user_id) REFERENCES users (firm_id, id),
  ADD CONSTRAINT clients_reviewer_same_firm_fk FOREIGN KEY (firm_id, kyc_reviewed_by) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE client_kyc_files ADD CONSTRAINT client_kyc_files_same_firm_fk FOREIGN KEY (firm_id, client_id) REFERENCES clients (firm_id, id);
--> statement-breakpoint
ALTER TABLE cases
  ADD CONSTRAINT cases_client_same_firm_fk FOREIGN KEY (firm_id, client_id) REFERENCES clients (firm_id, id),
  ADD CONSTRAINT cases_lawyer_same_firm_fk FOREIGN KEY (firm_id, assigned_lawyer_id) REFERENCES users (firm_id, id),
  ADD CONSTRAINT cases_clearer_same_firm_fk FOREIGN KEY (firm_id, conflict_cleared_by) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE case_team_members
  ADD CONSTRAINT case_team_case_same_firm_fk FOREIGN KEY (firm_id, case_id) REFERENCES cases (firm_id, id),
  ADD CONSTRAINT case_team_user_same_firm_fk FOREIGN KEY (firm_id, user_id) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE templates ADD CONSTRAINT templates_creator_same_firm_fk FOREIGN KEY (firm_id, created_by) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE template_variables ADD CONSTRAINT template_variables_same_firm_fk FOREIGN KEY (firm_id, template_id) REFERENCES templates (firm_id, id);
--> statement-breakpoint
ALTER TABLE hearings ADD CONSTRAINT hearings_case_same_firm_fk FOREIGN KEY (firm_id, case_id) REFERENCES cases (firm_id, id);
--> statement-breakpoint

-- Document, version and signature tenant integrity.
ALTER TABLE documents
  ADD CONSTRAINT documents_case_same_firm_fk FOREIGN KEY (firm_id, case_id) REFERENCES cases (firm_id, id),
  ADD CONSTRAINT documents_parent_same_firm_fk FOREIGN KEY (firm_id, parent_document_id) REFERENCES documents (firm_id, id),
  ADD CONSTRAINT documents_uploader_same_firm_fk FOREIGN KEY (firm_id, uploaded_by) REFERENCES users (firm_id, id),
  ADD CONSTRAINT documents_locker_same_firm_fk FOREIGN KEY (firm_id, locked_by) REFERENCES users (firm_id, id),
  ADD CONSTRAINT documents_hold_actor_same_firm_fk FOREIGN KEY (firm_id, legal_hold_set_by) REFERENCES users (firm_id, id),
  ADD CONSTRAINT documents_intended_signer_same_firm_fk FOREIGN KEY (firm_id, intended_signer_user_id) REFERENCES users (firm_id, id),
  ADD CONSTRAINT documents_signer_same_firm_fk FOREIGN KEY (firm_id, signed_by_user_id) REFERENCES users (firm_id, id),
  ADD CONSTRAINT documents_deleter_same_firm_fk FOREIGN KEY (firm_id, deleted_by) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE document_tag_assignments
  ADD CONSTRAINT document_tag_doc_same_firm_fk FOREIGN KEY (firm_id, document_id) REFERENCES documents (firm_id, id),
  ADD CONSTRAINT document_tag_tag_same_firm_fk FOREIGN KEY (firm_id, tag_id) REFERENCES document_tags (firm_id, id);
--> statement-breakpoint
ALTER TABLE document_shares
  ADD CONSTRAINT document_shares_doc_same_firm_fk FOREIGN KEY (firm_id, document_id) REFERENCES documents (firm_id, id),
  ADD CONSTRAINT document_shares_creator_same_firm_fk FOREIGN KEY (firm_id, created_by) REFERENCES users (firm_id, id),
  ADD CONSTRAINT document_shares_revoker_same_firm_fk FOREIGN KEY (firm_id, revoked_by) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE document_upload_rate_limits ADD CONSTRAINT document_rate_user_same_firm_fk FOREIGN KEY (firm_id, user_id) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE signature_envelopes
  ADD CONSTRAINT envelopes_document_same_firm_fk FOREIGN KEY (firm_id, document_id) REFERENCES documents (firm_id, id),
  ADD CONSTRAINT envelopes_case_same_firm_fk FOREIGN KEY (firm_id, case_id) REFERENCES cases (firm_id, id),
  ADD CONSTRAINT envelopes_creator_same_firm_fk FOREIGN KEY (firm_id, created_by) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE signature_recipients
  ADD CONSTRAINT recipients_envelope_same_firm_fk FOREIGN KEY (firm_id, envelope_id) REFERENCES signature_envelopes (firm_id, id),
  ADD CONSTRAINT recipients_user_same_firm_fk FOREIGN KEY (firm_id, user_id) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE signing_challenges
  ADD CONSTRAINT challenges_user_same_firm_fk FOREIGN KEY (firm_id, user_id) REFERENCES users (firm_id, id),
  ADD CONSTRAINT challenges_document_same_firm_fk FOREIGN KEY (firm_id, document_id) REFERENCES documents (firm_id, id),
  ADD CONSTRAINT challenges_envelope_same_firm_fk FOREIGN KEY (firm_id, envelope_id) REFERENCES signature_envelopes (firm_id, id);
--> statement-breakpoint

-- Work management tenant integrity.
ALTER TABLE tasks
  ADD CONSTRAINT tasks_case_same_firm_fk FOREIGN KEY (firm_id, case_id) REFERENCES cases (firm_id, id),
  ADD CONSTRAINT tasks_assignee_same_firm_fk FOREIGN KEY (firm_id, assigned_to) REFERENCES users (firm_id, id),
  ADD CONSTRAINT tasks_creator_same_firm_fk FOREIGN KEY (firm_id, created_by) REFERENCES users (firm_id, id),
  ADD CONSTRAINT tasks_parent_same_firm_fk FOREIGN KEY (firm_id, parent_task_id) REFERENCES tasks (firm_id, id),
  ADD CONSTRAINT tasks_hearing_same_firm_fk FOREIGN KEY (firm_id, hearing_id) REFERENCES hearings (firm_id, id),
  ADD CONSTRAINT tasks_document_same_firm_fk FOREIGN KEY (firm_id, document_id) REFERENCES documents (firm_id, id);
--> statement-breakpoint
ALTER TABLE task_watchers
  ADD CONSTRAINT task_watchers_task_same_firm_fk FOREIGN KEY (firm_id, task_id) REFERENCES tasks (firm_id, id),
  ADD CONSTRAINT task_watchers_user_same_firm_fk FOREIGN KEY (firm_id, user_id) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE sop_template_tasks ADD CONSTRAINT sop_template_tasks_same_firm_fk FOREIGN KEY (firm_id, sop_template_id) REFERENCES sop_templates (firm_id, id);
--> statement-breakpoint
ALTER TABLE task_comments
  ADD CONSTRAINT task_comments_task_same_firm_fk FOREIGN KEY (firm_id, task_id) REFERENCES tasks (firm_id, id),
  ADD CONSTRAINT task_comments_author_same_firm_fk FOREIGN KEY (firm_id, author_id) REFERENCES users (firm_id, id);
--> statement-breakpoint

-- Financial tenant integrity. Application mutations must additionally use transactions.
ALTER TABLE invoices
  ADD CONSTRAINT invoices_case_same_firm_fk FOREIGN KEY (firm_id, case_id) REFERENCES cases (firm_id, id),
  ADD CONSTRAINT invoices_client_same_firm_fk FOREIGN KEY (firm_id, client_id) REFERENCES clients (firm_id, id);
--> statement-breakpoint
ALTER TABLE invoice_line_items ADD CONSTRAINT invoice_lines_same_firm_fk FOREIGN KEY (firm_id, invoice_id) REFERENCES invoices (firm_id, id);
--> statement-breakpoint
ALTER TABLE time_entries
  ADD CONSTRAINT time_entries_case_same_firm_fk FOREIGN KEY (firm_id, case_id) REFERENCES cases (firm_id, id),
  ADD CONSTRAINT time_entries_user_same_firm_fk FOREIGN KEY (firm_id, user_id) REFERENCES users (firm_id, id),
  ADD CONSTRAINT time_entries_invoice_same_firm_fk FOREIGN KEY (firm_id, invoice_id) REFERENCES invoices (firm_id, id);
--> statement-breakpoint
ALTER TABLE payments
  ADD CONSTRAINT payments_invoice_same_firm_fk FOREIGN KEY (firm_id, invoice_id) REFERENCES invoices (firm_id, id),
  ADD CONSTRAINT payments_client_same_firm_fk FOREIGN KEY (firm_id, client_id) REFERENCES clients (firm_id, id);
--> statement-breakpoint
ALTER TABLE trust_transactions
  ADD CONSTRAINT trust_client_same_firm_fk FOREIGN KEY (firm_id, client_id) REFERENCES clients (firm_id, id),
  ADD CONSTRAINT trust_case_same_firm_fk FOREIGN KEY (firm_id, case_id) REFERENCES cases (firm_id, id),
  ADD CONSTRAINT trust_approver_same_firm_fk FOREIGN KEY (firm_id, approved_by) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE expenses
  ADD CONSTRAINT expenses_case_same_firm_fk FOREIGN KEY (firm_id, case_id) REFERENCES cases (firm_id, id),
  ADD CONSTRAINT expenses_submitter_same_firm_fk FOREIGN KEY (firm_id, submitted_by) REFERENCES users (firm_id, id),
  ADD CONSTRAINT expenses_approver_same_firm_fk FOREIGN KEY (firm_id, approved_by) REFERENCES users (firm_id, id),
  ADD CONSTRAINT expenses_invoice_same_firm_fk FOREIGN KEY (firm_id, invoice_id) REFERENCES invoices (firm_id, id);
--> statement-breakpoint

-- Communications, HR and website tenant integrity.
ALTER TABLE messages
  ADD CONSTRAINT messages_case_same_firm_fk FOREIGN KEY (firm_id, case_id) REFERENCES cases (firm_id, id),
  ADD CONSTRAINT messages_sender_same_firm_fk FOREIGN KEY (firm_id, sender_id) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE message_attachments ADD CONSTRAINT message_attachments_same_firm_fk FOREIGN KEY (firm_id, message_id) REFERENCES messages (firm_id, id);
--> statement-breakpoint
ALTER TABLE message_reads
  ADD CONSTRAINT message_reads_message_same_firm_fk FOREIGN KEY (firm_id, message_id) REFERENCES messages (firm_id, id),
  ADD CONSTRAINT message_reads_user_same_firm_fk FOREIGN KEY (firm_id, user_id) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE leads
  ADD CONSTRAINT leads_assignee_same_firm_fk FOREIGN KEY (firm_id, assigned_to) REFERENCES users (firm_id, id),
  ADD CONSTRAINT leads_client_same_firm_fk FOREIGN KEY (firm_id, converted_client_id) REFERENCES clients (firm_id, id);
--> statement-breakpoint
ALTER TABLE attendance ADD CONSTRAINT attendance_user_same_firm_fk FOREIGN KEY (firm_id, user_id) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE leave_requests
  ADD CONSTRAINT leave_user_same_firm_fk FOREIGN KEY (firm_id, user_id) REFERENCES users (firm_id, id),
  ADD CONSTRAINT leave_reviewer_same_firm_fk FOREIGN KEY (firm_id, reviewed_by) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE audit_log ADD CONSTRAINT audit_user_same_firm_fk FOREIGN KEY (firm_id, user_id) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE notifications ADD CONSTRAINT notifications_user_same_firm_fk FOREIGN KEY (firm_id, user_id) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE appointments
  ADD CONSTRAINT appointments_client_same_firm_fk FOREIGN KEY (firm_id, client_id) REFERENCES clients (firm_id, id),
  ADD CONSTRAINT appointments_lawyer_same_firm_fk FOREIGN KEY (firm_id, assigned_lawyer_id) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE sessions ADD CONSTRAINT sessions_user_same_firm_fk FOREIGN KEY (firm_id, user_id) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE research_notes ADD CONSTRAINT research_author_same_firm_fk FOREIGN KEY (firm_id, author_id) REFERENCES users (firm_id, id);
--> statement-breakpoint
ALTER TABLE research_note_tags ADD CONSTRAINT research_tags_note_same_firm_fk FOREIGN KEY (firm_id, research_note_id) REFERENCES research_notes (firm_id, id);
--> statement-breakpoint
ALTER TABLE career_requirements ADD CONSTRAINT career_requirements_same_firm_fk FOREIGN KEY (firm_id, career_id) REFERENCES careers (firm_id, id);
--> statement-breakpoint
ALTER TABLE job_applications ADD CONSTRAINT job_applications_same_firm_fk FOREIGN KEY (firm_id, job_id) REFERENCES careers (firm_id, id);
--> statement-breakpoint
ALTER TABLE navigation ADD CONSTRAINT navigation_parent_same_firm_fk FOREIGN KEY (firm_id, parent_id) REFERENCES navigation (firm_id, id);
--> statement-breakpoint

-- Data-quality and records-management checks.
ALTER TABLE documents
  ADD CONSTRAINT documents_size_valid CHECK (size_bytes > 0 AND size_bytes <= 52428800),
  ADD CONSTRAINT documents_version_valid CHECK (version > 0),
  ADD CONSTRAINT documents_sha256_valid CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-fA-F]{64}$'),
  ADD CONSTRAINT documents_legal_hold_reason_required CHECK (NOT is_on_legal_hold OR legal_hold_reason IS NOT NULL),
  ADD CONSTRAINT documents_deleted_actor_required CHECK (deleted_at IS NULL OR deleted_by IS NOT NULL);
--> statement-breakpoint
ALTER TABLE document_shares
  ADD CONSTRAINT document_shares_counts_valid CHECK (downloads_count >= 0 AND failed_attempts >= 0 AND (max_downloads IS NULL OR max_downloads > 0));
--> statement-breakpoint
ALTER TABLE document_upload_rate_limits ADD CONSTRAINT document_rate_count_valid CHECK (count >= 0);
--> statement-breakpoint
ALTER TABLE signing_challenges ADD CONSTRAINT signing_challenges_attempts_valid CHECK (attempts >= 0);
--> statement-breakpoint
ALTER TABLE time_entries ADD CONSTRAINT time_entries_minutes_valid CHECK (minutes > 0 AND rate_per_hour >= 0);
--> statement-breakpoint
ALTER TABLE invoices ADD CONSTRAINT invoices_amounts_valid CHECK (subtotal >= 0 AND vat_amount >= 0 AND total >= 0 AND total = subtotal + vat_amount);
--> statement-breakpoint
ALTER TABLE invoice_line_items ADD CONSTRAINT invoice_lines_amounts_valid CHECK (quantity > 0 AND unit_price >= 0 AND amount >= 0);
--> statement-breakpoint
ALTER TABLE payments ADD CONSTRAINT payments_amount_valid CHECK (amount > 0);
--> statement-breakpoint
ALTER TABLE trust_transactions ADD CONSTRAINT trust_amount_valid CHECK (amount > 0);
--> statement-breakpoint
ALTER TABLE expenses ADD CONSTRAINT expenses_amount_valid CHECK (amount > 0);
--> statement-breakpoint
ALTER TABLE attendance ADD CONSTRAINT attendance_clock_order_valid CHECK (clock_out IS NULL OR clock_in IS NULL OR clock_out >= clock_in);
--> statement-breakpoint
ALTER TABLE leave_requests ADD CONSTRAINT leave_date_order_valid CHECK (to_date >= from_date);
--> statement-breakpoint
ALTER TABLE testimonials ADD CONSTRAINT testimonials_rating_valid CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);
--> statement-breakpoint
ALTER TABLE resources ADD CONSTRAINT resources_downloads_valid CHECK (downloads >= 0);
--> statement-breakpoint
ALTER TABLE appointments ADD CONSTRAINT appointments_contact_valid CHECK (client_email IS NOT NULL OR client_phone <> '');
--> statement-breakpoint

-- Case-insensitive firm-owned identity and content uniqueness.
CREATE UNIQUE INDEX users_firm_email_ci_unique ON users (firm_id, lower(email)) WHERE email IS NOT NULL AND deleted_at IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX newsletter_firm_email_ci_unique ON newsletter_subscribers (firm_id, lower(email)) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX document_tags_firm_name_ci_unique ON document_tags (firm_id, lower(name)) WHERE deleted_at IS NULL;
--> statement-breakpoint

-- PostgreSQL full-text search replacement for the Convex document search index.
CREATE INDEX documents_search_vector_idx ON documents USING gin (
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(searchable_text, ''))
);
--> statement-breakpoint

-- Keep updated_at reliable even when a repository forgets to set it.
CREATE FUNCTION set_row_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DO $$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'updated_at'
    ORDER BY table_name
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION set_row_updated_at()',
      left(target.table_name || '_set_updated_at', 63),
      target.table_name
    );
  END LOOP;
END $$;
