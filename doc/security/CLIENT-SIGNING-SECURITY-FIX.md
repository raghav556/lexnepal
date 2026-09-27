# Client signing security and functional fix

Starting baseline: `b95a17ef16b7d3a9b264973c26900c416f1fb462`.

## Corrected boundaries

- OTP issuance no longer returns a plaintext code or `demoCode`, and no longer writes a code to an in-app notification. It resolves the active signing user's firm-scoped account email and queues the existing `communication.email` durable job. The service fails closed with `503` before creating a challenge when SMTP is not configured.
- OTP challenges remain firm-, user-, and document-bound, expire after ten minutes, permit five attempts, and have a fifteen-minute verified window. Signing additionally requires challenge envelope context to match the signing context.
- Drawn and uploaded signature images use a dedicated, tenant-scoped signature-artifact upload intent. An artifact is bound to signer, document, and optional envelope before upload, remains quarantined until validation and malware scanning promote it, and is resolved to a protected key server-side at signing time.
- Browser storage keys and browser document hashes are not accepted as signing authority. The existing authoritative document SHA-256 is retained; signing rejects documents whose authoritative integrity value is unavailable.
- The signing inbox endpoint is signer-scoped and de-duplicates a document where an active envelope recipient action is authoritative over a direct request. It also applies the existing document-access policy to every pending/history item, excluding privileged or otherwise inaccessible documents. The document-access policy now recognizes same-firm active or signed envelope recipients, so a prior signer retains access to their own signed history and active parallel recipients can preview; future-turn recipients remain denied. Envelope history uses the recipient's signed timestamp and does not copy mutable document-level signature text/method from a later signer. Real MySQL regression assertions proved these boundaries during final review.

## Legal and certificate boundary

`esign-consent-v1` and the existing consent wording are unchanged. They remain **pre-existing legal-policy copy pending legal review**. Browser-generated signature certificate summaries are unchanged and must not be described as server-certified or authoritative; terminology correction belongs to CUI-14.

## Deployment prerequisite

SMTP configuration remains required for OTP issuance. This is intentionally fail-closed; local Mailpit is suitable for local verification.

## Formal migration 0007 evidence (Job C)

`npm run signatures:verify-artifact-migration` inspects the configured **local** database read-only, requires recorded migrations 0000–0006 and absence of the artifact table, then makes a schema-only `mysqldump` clone in a uniquely named disposable database. It applies only `drizzle/0007_signature_artifact_upload_intents.sql`, runs metadata and controlled-insert checks there, and drops the disposable database in `finally`. No owner/client rows are copied. The source's recorded 0005/0006 migration hashes differ from the current SQL files; the verifier separately checks their resulting published Cases shape and every 0007 foreign-key prerequisite. This makes the source suitable for this focused 0007 check, **not** proof that a fresh migration chain passes.

The SQL executed successfully on that pre-0007 clone. Column presence, declared enum/default, required-field nullability, primary and declared lookup indexes, individual foreign-key mappings, same-firm inserts, invalid references, invalid status, and quarantine-key uniqueness passed. MySQL accepted cross-firm combinations because the four foreign keys are individual references, not composite tenant constraints; firm/document/signer/envelope consistency is service-enforced. Size and MIME limits are also service-enforced, not database constraints. A second raw application fails because the table already exists, as expected for a migration tracked by the runner. The disposable database was confirmed absent after cleanup.

Job C initially found 13 migration/schema differences: five `char(36)` UUID columns, six `datetime(3)` fields, a missing `UUID()` ID default, and a missing `legacy_convex_id` unique index. Job C2 corrected the **unpublished 0007 migration itself** to match `db/schema.ts`. The strengthened verifier now passes its live `information_schema` and `SHOW CREATE TABLE` checks with **zero drift findings**, including defaults, indexes, foreign keys, and controlled insert/rejection behavior. Job A's real MySQL behavior tests passed 9/9 and Job B's independent live signing verifier passed after this correction.

The corrected 0007 checksum is recorded in `drizzle/checksums.json`. Job C3 proved that the prior 0005/0006 manifest hashes matched the exact same SQL text converted from repository-required LF to CRLF. It corrected **only those two manifest entries** to the canonical LF-byte hashes; migration SQL 0000–0006 and the integrity script remain unchanged. Repository `db:integrity` now passes. The connected local database's historical 0005/0006 migration records may still contain hashes from the former CRLF bytes: this is a **PRE-EXISTING LOCAL MIGRATION-HISTORY LINE-ENDING ARTIFACT**. Those database records were not changed or reapplied. `npm run db:check` passes, but it does not replace live 0007 verification.

Separately, the **pre-existing fresh-migration compatibility issue** in `drizzle/0004_nullable_timestamps.sql` remains: strict local MySQL rejects its legacy zero-date behavior before reaching 0007. Migration 0004 was not changed, SQL mode was not relaxed, and no full fresh-chain PASS is claimed.

## Malware scanner evidence boundary

Job B exercised signature-artifact validation, quarantine, and promotion using the repository's local development scanner fallback. That fallback reported provider `unscanned` because local ClamAV was unavailable; it is **not** an antivirus-clean verdict. Production deployment still requires a configured and verified malware scanner. Scanner architecture was not changed by Job C.
