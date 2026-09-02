# LexNepal Local Release Sign-Off

**Scope:** Localhost only  
**Assessment date:** 2026-09-01
**Result:** `LOCAL LAUNCH READY`  
**Public deployment:** `DEFER_PROD`

## Plain-language result

LexNepal has been audited as one connected application: public website, CMS, admin portal, staff
portal, client portal, authentication, MySQL data, private document storage, malware scanning,
background work, email capture, and the principal legal-practice workflows.

The audit found and corrected functional, security, accessibility, test-reliability, responsive,
and maintainability defects. No live server, cloud account, DNS record, production credential, or
real user data was changed.

All 13 phases in the master plan and the permanent finance-removal phase are `PASS_LOCAL`.
The current Chromium suite passed 47/47, all unit/integration/characterization/database checks
passed, and the optimized production build passed with healthy localhost readiness.

## Completed local evidence

- 77 active page routes and 160 API route files are inventoried and mapped; URL-preservation and
  deep-link inventories match the active application.
- MySQL migrations and checksums, repeatable seeding, local backup, and isolated restore drill
  pass.
- Local storage privacy/tokenized downloads and the ClamAV clean/malware-rejection pipeline pass.
- Authentication, cookies, invitations, client grants, role boundaries, MFA enforcement,
  cross-firm denial, safe DTOs, rate limiting, redirect safety, and security headers pass locally.
- CMS, matters, work management, CRM, communications, documents, signatures, analytics,
  HR, jobs, retries, idempotency, and migration rehearsals pass their local verifiers.
- Formatting, full-repository ESLint, TypeScript, unit, integration, characterization, database,
  dependency, production-build, and performance gates pass.
- Real Chromium browser coverage includes public/auth routes and every static admin, staff, and
  client portal route, plus core workflows and responsive accessibility checks.
- Representative public, admin, staff, and client pages have no serious/critical automated WCAG
  A/AA violation or mobile horizontal overflow; mobile navigation is keyboard operable.
- The performance fixture covers 120 clients, 250 cases, 500 documents, and 200
  tasks within the local 2-second budgets.

## Known local limitations (not hidden defects)

- Email is captured in Mailpit and is not delivered to real recipients.
- SMS, hosted identity, court-data providers, and other external services remain
  disabled, simulated, or fail closed until real providers are selected and configured.
- Local HTTP cannot prove production `Secure` cookies or TLS behavior; that belongs in staging.
- The remaining npm advisories are four moderate `esbuild` findings reachable through Drizzle's
  development tooling. There are no critical/high production dependency findings. The available
  forced npm fix would replace/downgrade the current migration toolchain and is not accepted without
  a compatible upstream release.
- Demo accounts and fixture data are localhost-only and are unsuitable for public use.

## Owner evaluation

Start the environment using the four commands in the README, then visit:

- Public website: `http://localhost:3001`
- Admin portal: `http://localhost:3001/admin`
- Staff portal: `http://localhost:3001/staff`
- Client portal: `http://localhost:3001/client`
- Local email: `http://127.0.0.1:8025`

Use `npm run db:seed`, then `npm run e2e:seed`, if demo accounts need to be recreated. Full setup, stop, testing, backup, and
troubleshooting instructions are in [`../README.md`](../README.md).

## Required later production-launch phase

Do not expose this localhost configuration to public traffic. A separate authorized production
phase must complete all of the following:

1. Select hosting region and architecture; provision managed MySQL with encryption, HA,
   backups, point-in-time recovery, and tested restore ownership.
2. Provision private object storage, malware scanning, lifecycle rules, encryption/KMS, and data
   residency controls.
3. Create environment-separated, vault-managed secrets and rotate every local/demo credential.
4. Configure production identity, HTTPS/TLS, DNS, secure cookies, trusted origins, and edge/WAF rate
   limits.
5. Contract and verify real email, SMS, OCR/CDR, and any court-data providers; complete
   provider failure and reconciliation tests.
6. Configure logs, metrics, alerting, uptime checks, error reporting, audit retention, incident
   contacts, on-call ownership, and rollback procedures.
7. Obtain legal approval for privacy policy, terms, consent, retention/deletion, data processing,
   accessibility, and Nepal-specific professional/compliance requirements.
8. Run staging load tests, cross-browser/device QA, final penetration testing, disaster-recovery
   rehearsal, and a production-data migration rehearsal using approved sanitized/exported data.
9. Remove or disable all demo users and fixtures, complete launch approval, take a final backup, and
   execute monitored cutover with a tested rollback window.

## Sign-off rule

The application may be labeled **LOCAL LAUNCH READY** only when the master plan records Phases
0-12 as `PASS_LOCAL` and the final production build/start rehearsal succeeds. This sign-off never
means that public deployment is complete; all items above remain `DEFER_PROD` until separately
authorized and evidenced. This local rule is now satisfied as of 2026-08-31.
