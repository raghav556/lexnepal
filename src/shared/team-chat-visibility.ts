/**
 * Team Chat visibility matrix (TC-0).
 *
 * | Channel              | Client | Assigned lawyer | Case team members | Other staff | Admin (view_all) |
 * |----------------------|--------|-----------------|-------------------|-------------|------------------|
 * | Client Reply         | yes    | yes             | yes               | no*         | yes              |
 * | Case Team (internal) | no     | yes             | yes               | no*         | yes              |
 * | Staff 1:1 DM         | no     | yes (as peer)   | yes (as peer)     | yes (peer)  | yes (as peer)    |
 *
 * *Other staff without case access / cases.view_all cannot open the matter thread.
 * Clients never appear in the Team Chat / DM directory.
 *
 * Owner acceptance checklist:
 * 1. Staff A DMs Staff B — client cannot see.
 * 2. Three lawyers on one case use Case Team tab — client only sees Client Reply.
 * 3. Command Center Team tab opens real DMs.
 * 4. Unread badges and attachments work on mobile + desktop.
 */
export const TEAM_CHAT_VISIBILITY = {
  clientSeesClientReplyOnly: true,
  clientsInDmDirectory: false,
  caseTeamUsesInternalFlag: true,
} as const;
