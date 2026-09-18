# Client UI Source-of-Truth

Expected authoritative owner-approved source:

`doc/ui-reference/client/LexNepal_Client_UI_Upgrade_Source_of_Truth_v1.0.docx`

Expected SHA-256:

`53601050E81EC297DF4D83A31B05B3732D0D9E22291C547CD2BAB3D4D81FD55B`

Expected Markdown companion:

`doc/ui-reference/client/LexNepal_Client_UI_Upgrade_Source_of_Truth_v1.0.md`

**CUI-00 status on this clone (`main` @ `cdee66080fbdc51d47b7536d533aad60bfae54ff`): those Source-of-Truth files are not present.** Do not start Client UI implementation until the owner-approved DOCX is placed unchanged and CUI-00 reference freeze is completed.

CUI-00 audit (repository baseline only):

`doc/ui-reference/client/audit/CUI-00-BASELINE.md`

Expected lossless JPEG extracts (not created; DOCX missing):

- `doc/ui-reference/client/references/01-home.jpg`
- `doc/ui-reference/client/references/02-my-matters.jpg`
- `doc/ui-reference/client/references/03-matter-details.jpg`
- `doc/ui-reference/client/references/04-hearings.jpg`
- `doc/ui-reference/client/references/05-checklist.jpg`
- `doc/ui-reference/client/references/06-documents.jpg`
- `doc/ui-reference/client/references/07-messages.jpg`
- `doc/ui-reference/client/references/08-appointments.jpg`
- `doc/ui-reference/client/references/09-identity-verification.jpg`
- `doc/ui-reference/client/references/10-sign-documents.jpg`
- `doc/ui-reference/client/references/11-notifications.jpg`
- `doc/ui-reference/client/references/12-profile.jpg`

Rules:

1. The DOCX is the owner-approved master source when present.
2. Markdown is a machine-readable companion only.
3. The DOCX wins if DOCX and Markdown conflict.
4. Future Codex / Grok 4.6 sessions must read the Source-of-Truth before Client UI work.
5. Client UI implementation must execute CUI phases in order. CUI-00 is not complete until the reference pack is frozen.
6. Staff/Admin UI work is out of scope until Client freeze.
7. Reference images must not be replaced without owner approval and a version update.
