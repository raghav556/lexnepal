# CUI-15 — Client Notifications implementation evidence

Baseline: `639a965ce95e021502109beb77901a331b15f229` (published notification-link security hotfix). Reference 11: `doc/ui-reference/client/references/11-notifications.jpg`, SHA-256 `D2480F975252F252E50538914863A6C666000711BA4F535BC1E107F68DFB7B4A`. The locked DOCX is the content authority; the Home Client shell remains the shell authority. Earlier baseline page evidence: `D:\lexnepal\.local\qa\cui-04\after\client-notifications-1440.png`.

## Scope and reference comparison

The Client Notifications page now has a compact Client-portal header, five native-button filters, a grouped recent notification feed, a real Important Dates rail, and a contextual Message Legal Team action. It removes the generic Total/Unread/Read KPI cards. On desktop the feed/rail occupy roughly two-thirds/one-third; on mobile the rail follows the feed. The reference's preference switches are intentionally omitted because no persisted notification-preference model or API exists. No fake preference state or screenshot-only notification array was added. The existing Client shell, bell, and all frozen CUI-05–14 page source remain unchanged.

The only other visual difference is data: notification titles, times and Important Dates come from the authorized Ravi fixture through MySQL → existing API → existing query hooks, not from the reference's sample names/dates. The backend feed is capped at 50 recent rows; the page says so and does not claim all historical notifications.

## Data and behavior

- Backend types remain `hearing_reminder`, `task_due`, `document_request`, `message`, `system`. All uses every returned row; Unread uses `isRead === false`; Documents uses `document_request` (including real signature requests); Messages uses `message`; Hearings uses `hearing_reminder`. `task_due` and `system` remain visible in All and, when unread, Unread. There is no invented Signatures type or category.
- Groups use `createdAt` in `Asia/Kathmandu`: Today is the current Kathmandu calendar day, This Week starts Monday and excludes Today, and Earlier precedes that week. Empty groups are not rendered. Production uses the real wall clock; Playwright fixes browser time to the fixture's `UI_PREVIEW_NOW` only for deterministic evidence.
- Important Dates uses the existing authorized `useHearingsQuery`/`useAppointments` paths. It selects the nearest scheduled hearing on or after today's Kathmandu date and nearest confirmed appointment on or after that date. Pending appointments and past/closed hearings are excluded. Query failure degrades only the rail, not the feed. The status-bearing hearings companion preserves the original `useHearings` data-only contract for frozen consumers.
- Native `ul/li` rows contain a button only when an unread item can be marked read or a validated destination can be opened. Read items without a destination are static. Unread is conveyed in visible text as well as visual treatment. Filters use `aria-pressed`, not listbox/option roles.
- An unread row awaits the persisted mark-read mutation before safe navigation. Failure leaves it unread, displays feedback, and does not navigate. Mark all read is shown only when useful, disabled/busy during mutation, and updates the same notifications query used by the bell. Neither action invents optimistic read state. The published `safeNotificationPath` remains the final navigation guard.
- `useNotifications` retains `data: next.data ?? []` for existing consumers while adding `isLoading`, `isError`, `error`, and `refetch`. The page now uses real query loading/error state; the former `data === undefined` skeleton check could never succeed.

## Evidence and gates

The deterministic Ravi fixture contains six notifications: three unread, three read, with Today/This Week/Earlier and hearing/message/document/system coverage. No fixture source was modified. Browser evidence uses an independent server on port 3002 until all gates complete, then port 3001 is reserved for the CUI-15 owner preview.

Focused unit coverage proves category filtering, Kathmandu date/week boundaries, and nearest authorized important dates. CUI-15 browser coverage proves real six-row feed, all filters, time groups, Important Dates, responsive 1440/1280/1024/768/390/360 widths with 390/360 no horizontal overflow, no serious/critical Axe violations, read persistence, bell reconciliation, keyboard button activation, and failure states. Published notification-link unit/integration/browser security coverage and shared Client shell tests remain regression gates. The Ravi fixture is reseeded after mutating tests.

Screenshot pack: `D:\lexnepal\.local\qa\cui-15\01-desktop-all.png` through `06-mobile-filtered.png`, including a focused Important Dates panel capture. No notification preference switches are shown.
