INSERT INTO firms (id, name, slug, is_active)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'Firm A', 'firm-a', true),
  ('00000000-0000-4000-8000-000000000002', 'Firm B', 'firm-b', true);

INSERT INTO users (id, firm_id, token_identifier, name, email, role, is_active)
VALUES
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'fixture:user-a', 'User A', 'user@example.test', 'admin', true),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'fixture:user-b', 'User B', 'user@example.test', 'admin', true);

INSERT INTO clients (id, firm_id, type, full_name, kyc_status, is_active)
VALUES
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'individual', 'Client A', 'pending', true),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'individual', 'Client B', 'pending', true);

INSERT INTO cases (id, firm_id, case_number, title, practice_area, status, client_id, assigned_lawyer_id, conflict_checked)
VALUES
  ('30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'CASE-001', 'Case A', 'civil', 'active', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', false),
  ('30000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'CASE-001', 'Case B', 'civil', 'active', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', false);

INSERT INTO documents (id, firm_id, case_id, document_number, title, type, storage_id, mime_type, size_bytes, version, uploaded_by, is_template, is_privileged)
VALUES
  ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'DOC-001', 'Document A', 'pleading', 'fixture-storage-a', 'application/pdf', 1024, 1, '10000000-0000-4000-8000-000000000001', false, false);

INSERT INTO signature_envelopes (id, firm_id, document_id, case_id, title, status, routing, created_by)
VALUES
  ('50000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Envelope A', 'draft', 'sequential', '10000000-0000-4000-8000-000000000001');
