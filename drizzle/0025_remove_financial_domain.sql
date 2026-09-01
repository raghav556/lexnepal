-- Permanent local finance-domain removal. A validated logical backup is required before execution.
DROP TABLE IF EXISTS "payments";
--> statement-breakpoint
DROP TABLE IF EXISTS "invoice_line_items";
--> statement-breakpoint
DROP TABLE IF EXISTS "time_entries";
--> statement-breakpoint
DROP TABLE IF EXISTS "expenses";
--> statement-breakpoint
DROP TABLE IF EXISTS "trust_transactions";
--> statement-breakpoint
DROP TABLE IF EXISTS "invoices";
--> statement-breakpoint
DROP TYPE IF EXISTS "payment_status";
--> statement-breakpoint
DROP TYPE IF EXISTS "payment_gateway";
--> statement-breakpoint
DROP TYPE IF EXISTS "line_item_type";
--> statement-breakpoint
DROP TYPE IF EXISTS "invoice_status";
--> statement-breakpoint
DROP TYPE IF EXISTS "trust_transaction_type";
--> statement-breakpoint
DROP TYPE IF EXISTS "expense_category";
--> statement-breakpoint
DELETE FROM "firm_settings"
WHERE "key" IN (
  'defaultHourlyRate',
  'vatRate',
  'invoicePaymentTerms',
  'activePaymentMethods',
  'bankName',
  'bankAccountName',
  'bankAccountNumber',
  'bankBranch'
);
--> statement-breakpoint
UPDATE "firm_settings" AS settings
SET
  "value" = COALESCE(
    (
      SELECT jsonb_object_agg(
        role_entry.key,
        (
          SELECT COALESCE(jsonb_agg(permission.value), '[]'::jsonb)
          FROM jsonb_array_elements(role_entry.value) AS permission(value)
          WHERE permission.value <> to_jsonb('finance.manage'::text)
        )
      )
      FROM jsonb_each(settings.value) AS role_entry(key, value)
      WHERE jsonb_typeof(role_entry.value) = 'array'
    ),
    '{}'::jsonb
  ),
  "updated_at" = now()
WHERE "key" = 'rolePermissions'
  AND jsonb_typeof("value") = 'object';
