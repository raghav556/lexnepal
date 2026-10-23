# Session 14 engineering report — Unified Staff Messages (release-blocker check)

Worktree: `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`
Branch: `ui/staff-admin-upgrade`
Base HEAD: `e3dfa100d0cad9eac9fb3cf05ebf977843889a47`
No commit, push, merge, or deploy.

## Release-blocker fixes (this pass)

1. **Composer contrast (Staff Messages)** — `staff-chat-composer-shell` / `staff-chat-input-row` / audience + kbd tokens so labels, hints and attach icons stay readable on the light Staff canvas (and dark mode equivalents).
2. **Case Team bubble contrast** — `staff-chat-bubble-confidential` + Staff-scoped warning tokens for body, labels, timestamps and attachments.
3. **New direct message** — Direct tab always shows a **New direct message** block wired to the existing staff-directory → `openThread` flow (no new API).
4. **Pagination proof** — unit paging tests + mocked browser QA with network capture (`pagination-network.json`).
5. **Mobile chat chrome** — open conversation uses a fixed stage under the topbar; Back is visible; composer sits above bottom nav; details toggle hidden while chat is open.
6. **Decorative status** — removed fake online dots and `status: "read"` / Delivered marks unless real presence is passed.

## Changed files (exact)

### This blocker pass
- `src/components/chat/luxury-chat-composer.tsx`
- `src/components/chat/luxury-chat-bubble.tsx`
- `src/components/chat/luxury-chat-header.tsx`
- `src/components/chat/luxury-dm-panel.tsx`
- `src/components/messages/MatterChatPanel.tsx`
- `src/views/staff/StaffMessagesPage.tsx`
- `src/index.css`
- `src/server/repositories/communication-repository.ts` (cursor encode typing)
- `src/server/repositories/dm-repository.ts` (cursor encode typing)
- `tests/unit/message-pagination.test.ts` *(new)*
- `tests/unit/staff-messages-nav.test.ts`
- `doc/ui-reference/staff-admin/SESSION-14-ENGINEERING-REPORT.md`
- `.local/qa/session-14/tools/blocker.cjs` *(QA harness)*

### Prior Session 14 (still uncommitted, preserved)
- `src/app/(staff)/layout.tsx`
- `src/app/(staff)/staff/team-chat/page.tsx`
- `src/client/queries/communication.ts`
- `src/client/queries/dm.ts`
- `src/lib/operational-navigation.ts`
- `src/server/services/communication-service.ts`
- `src/server/services/dm-service.ts`
- `src/shared/contracts/communication.ts`
- `src/shared/contracts/dm.ts`
- `src/shared/message-cursor.ts`
- `src/views/staff/StaffDashboard.tsx`
- `tests/unit/message-cursor.test.ts`

Unrelated noise left untouched: `SESSION-08-ENGINEERING-REPORT.md` CRLF.

## Pagination

Optional `cursor` on existing GETs:

- `GET /api/v1/messages?caseId=&isInternal=&limit=&cursor=`
- `GET /api/v1/dm/threads/:threadId/messages?limit=&cursor=`

Firm + case/stream or thread scoping unchanged. Invalid cursors → `400 BAD_REQUEST`. Client loads limit **30**, accumulates older pages, sticky **Load earlier messages**, polls without dropping history.

## Verification

| Check | Result |
| --- | --- |
| Focused ESLint | **pass** (composer, bubbles, header, DM/matter panels, StaffMessagesPage, queries, cursor) |
| `tsc --noEmit` | **pass** (ran after briefly freeing heap from the preview process) |
| Unit tests | **17 passed** — `message-cursor`, `message-pagination`, `staff-messages-nav` |
| Pagination unit coverage | latest 30, walk to end, no duplicates, invalid cursor, client/internal isolation, cross-thread cursor reuse, poll merge |
| Browser blocker QA | **pass** — `.local/qa/session-14/tools/blocker.cjs` |
| Mocked writes | **0** matter/DM POSTs during blocker capture |
| Case Team bubble contrast | `rgb(180,83,9)` on `rgb(255,251,235)` |
| Mobile Back | visible at `top≈74` with stage under topbar (`stageTop≈56`) |
| Load earlier network | cursor GETs recorded in `pagination-network.json`; **90** bubbles after walking history |

## Screenshots (blocker only)

`.local/qa/session-14/blocker/`

1. `01-composer-case-team-contrast.png`
2. `02-load-earlier-pagination.png`
3. `03-new-direct-message.png`
4. `04-mobile-chat-header-back.png`

Plus `pagination-network.json`.

## Remaining limitations

- Matter unread KPI still not channel-split (API).
- Snippets remain off on the unified Messages page only.
- Full-matrix contrast sampling for every icon state was not repeated in dark mode screenshot form; CSS uses the same token pairs under `.dark`.
- Preview + `tsc` still contend for RAM on the 8 GB host.

## Git status

HEAD `e3dfa10` on `ui/staff-admin-upgrade`. **No commit created.**

Stopped for Technical Lead checkpoint approval. No Session 15.
