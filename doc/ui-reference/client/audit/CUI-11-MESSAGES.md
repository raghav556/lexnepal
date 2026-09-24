# CUI-11 — Client Messages

## Starting SHA

`96d97b280ce044f1d7b1075c1196af2ee41e8e49` (`origin/main` at CUI-10 publication)

Branch: `cui-11-client-messages`  
Worktree: `D:\lexnepal\.local\worktrees\cui-11-client-messages`

## Reference 07

File: `doc/ui-reference/client/references/07-messages.jpg`  
SHA-256: `C45617D69B6E9051BF2C9A38935688F1A30531D0A71A02247E8EA3DC3B009D83`  
Verified: YES

Body direction only. Frozen Home shell remains master (dark navy sidebar).

## Architecture

| Layer       | Implementation                                                |
| ----------- | ------------------------------------------------------------- |
| Route       | `/client/messages`                                            |
| Page        | `src/views/client/ClientMessagesPage.tsx`                     |
| Engine      | `src/components/messages/MatterChatPanel.tsx` (retained)      |
| Queries     | `useMessages`, `useUnreadMessageCounts`, `useMessageCommands` |
| Send        | `POST /api/v1/messages`                                       |
| Unread      | `GET /api/v1/messages/unread`                                 |
| Mark-read   | `POST /api/v1/messages/read`                                  |
| Attachments | existing document-upload-intent / storage pipeline            |

No second chat system.

## Client visibility / internal boundary

- Client mode forces `listFilter = false` (client-visible messages only)
- Client send always `isInternal: false`
- Internal stream toggle unavailable in Client appearance/composer
- Staff default MatterChatPanel appearance unchanged (`appearance="default"`)

## Attachment behavior

Unchanged: SHA-256 → upload intent → storage POST → complete → storageId on message.

## Unread behavior

- Real per-matter counts from `useUnreadMessageCounts`
- Opening a matter still triggers `markMessagesRead`
- Visiting `/client/messages` alone does not invent mark-all-read

## Deep-link behavior

`/client/messages?caseId=<id>`:

- Selects only when `caseId` is in the Client’s own matters
- Invalid / unauthorized id shows “Matter unavailable” and does not open another conversation

## Unsupported security wording

Removed prior “Conversations are securely encrypted…” marketing claim.  
Neutral copy: “Message your legal team about your matters.”

## Shared-component safety

Added optional `appearance?: "default" | "client"` to:

- `MatterChatPanel`
- `LuxuryChatHeader`
- `LuxuryChatBubble`
- `LuxuryChatComposer`

Default remains Staff dark presentation. Client page passes `appearance="client"` only.  
Client hides decorative read-receipt checks (status was hardcoded `"read"`).  
Client hides canned templates and internal-stream chrome.

## Responsive

Desktop two-pane workspace; mobile list → conversation → Back.  
Overflow measured in QA `overflow-measures.json`.

## Accessibility

- Matter listbox options with `aria-selected`
- Unread badge accessible name
- Chat `role="log"` labelled
- Composer Message / Send / Attach / Back labelled
- Reduced-motion respected for auto-scroll

## Tests

- `tests/unit/cui-11-client-messages-contract.test.ts`
- `tests/e2e/cui-11-client-messages.spec.ts`
- Plus CUI-05–CUI-10 regressions, lint, typecheck, build

## Validation

| Check                                               | Result                                 |
| --------------------------------------------------- | -------------------------------------- |
| format (changed files)                              | PASS                                   |
| lint                                                | PASS                                   |
| typecheck                                           | PASS                                   |
| CUI-11 unit                                         | PASS (6)                               |
| CUI-11 E2E                                          | PASS (3)                               |
| messaging/attachment unit (incl. document pipeline) | PASS (22)                              |
| CUI-05–CUI-09 E2E                                   | PASS (14)                              |
| CUI-10 E2E                                          | PASS (4; one initial rate-limit retry) |
| build                                               | PASS                                   |
| Overflow 360/390/768/1024/1280/1400                 | PASS (no horizontal overflow)          |

### Final pre-publish correction

Default selection now waits for `useUnreadMessageCounts().isFetched` so an empty unread map no longer locks onto `cases[0]` (Property Dispute). Owner screenshots must be captured after reseed (`final-check/`).

## Changed files

- `src/views/client/ClientMessagesPage.tsx`
- `src/client/queries/communication.ts` (`isFetched` on unread hook)
- `src/components/messages/MatterChatPanel.tsx`
- `src/components/chat/luxury-chat-header.tsx`
- `src/components/chat/luxury-chat-bubble.tsx`
- `src/components/chat/luxury-chat-composer.tsx`
- `src/index.css` (`.client-messages*` only)
- CUI-11 tests + this audit

## Screenshots

Under `D:\lexnepal\.local\qa\cui-11\`  
Final evidence: `D:\lexnepal\.local\qa\cui-11\final-check\`

## Accepted deviations from Reference 07

1. Dark Home shell (not Reference light sidebar)
2. Matter channels (not invented advocate DM list / last-message previews / online status)
3. No Matter Details / Response Time / encrypted security cards (unsupported claims / invented data)
4. No decorative read receipts for Client
5. Compact service header consistent with CUI-10 (no large metrics strip)

## Final status

Implementation complete for owner visual review.  
One local commit on `cui-11-client-messages`. Not pushed.
