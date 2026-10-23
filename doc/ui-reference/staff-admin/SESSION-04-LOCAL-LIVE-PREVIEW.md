# Continuous local development preview

Verified 14 October 2026 (Asia/Katmandu).

**LIVE DEVELOPMENT PREVIEW READY — http://localhost:3001/staff**

The real upgraded Next.js application is running in a dedicated VS Code window
for `ui-staff-admin-upgrade`, in its integrated PowerShell terminal. The original
`lexnepal` VS Code window and its uncommitted work remain intact. No screenshot
fixture, mock authentication, new database or deployment infrastructure is used
by the application on port 3001.

The owner's clarification controls this workflow: ordinary UI development reuses
the verified existing local development database. The disposable-database plans
in earlier session reports apply to release QA, not to viewing and editing the
application locally. Those reports retain their historical test results.

## Working directory and startup

Edit and run this worktree:

```text
D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade
```

Branch: `ui/staff-admin-upgrade`.
HEAD remains `d705db7a805996a99539b6af67407b2d95afbc2f`.
Session 04 changes remain uncommitted. This task additionally changes only
`next.config.ts` and adds this note; private configuration and QA evidence are ignored.

The live VS Code terminal started the repository-supported command:

```powershell
Set-Location -LiteralPath 'D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade'
$env:LEXNEPAL_DEV_WARMUP = 'off'
npm run dev
```

This expands to:

```text
node --env-file-if-exists=.env.local scripts/local/run-dev.mjs
```

The existing wrapper starts installed Next.js 16.3.4 with Turbopack, port 3001
and the existing 4 GB Node heap option. Warm-up is disabled in this terminal
to avoid the wrapper's Client-first background compilation queue; real routes
compile when opened. This is an existing wrapper option, not a new server.

URLs:

- Application: http://localhost:3001
- Staff: http://localhost:3001/staff
- Staff sign-in: http://localhost:3001/sign-in/staff
- Client: http://localhost:3001/client
- Admin: http://localhost:3001/admin

Use existing local Staff credentials. A browser already signed in as Client or
Admin may show the normal role gate on Staff; use its account-switch action or
a separate browser profile/private window. Passwords and session tokens are
not included in this note.

## Port ownership and previous setup

Before this task, port 3001 was served from:

```text
D:\lexnepal\.local\worktrees\cui-16-client-profile
```

The old server was PID 1884, Next CLI 2568 and development wrapper 7544.
Their working directories were verified through Windows process information,
not inferred from the Node package path. The startup command was the same
`run-dev.mjs` wrapper with `--env-file-if-exists=.env.local`, using Turbopack.
Only this verified development process tree was stopped. MySQL, Mailpit,
VS Code and other applications were left running.

Final VS Code-owned process snapshot:

| Process                   |           PID | Verification                                                 |
| ------------------------- | ------------: | ------------------------------------------------------------ |
| Next server/listener      |          1828 | Port 3001; actual working directory is the upgrade worktree  |
| Next CLI                  |          9288 | `next dev --turbopack --port 3001` from the upgrade worktree |
| Development wrapper       |         14764 | Existing `scripts/local/run-dev.mjs`, same working directory |
| Integrated terminal shell |         11212 | PowerShell, dedicated Terminal 2, descended from VS Code     |
| Terminal host / editor    | 11332 / 12524 | Code.exe ancestry verified                                   |

PIDs are a verification snapshot and may change on restart. The server's command
line points into `D:\lexnepal\node_modules` because dependencies are shared through
a junction; that package path alone does not identify the application checkout.
The CLI path, actual process working directory and rendered Home marker do.

## Environment and local services

The upgrade worktree's ignored `.env.local` was created from the previous working
checkout's `.env.local`, which was byte-identical to `D:\lexnepal\.env.local`.
All existing private settings were preserved. No authentication or download secret
was rotated. Auth/app origins remain the existing localhost:3001 defaults, and
local Better Auth and role guards remain enabled.

One non-secret setting was added: an absolute `STORAGE_ROOT` pointing to the previous
worktree's existing `.local/storage` directory. Existing upload objects are reused
in place; they were not copied, restored, deleted or reseeded.

| Service/configuration | Verified state                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| MySQL                 | Local `mysqld.exe`, loopback port 3306; existing `lexnepal` development schema                       |
| MySQL data directory  | `%LOCALAPPDATA%\LexNepal\MySQL\data`; matches read-only SQL server identity                          |
| Better Auth           | Existing local accounts, secret and normal email/password/session flow                               |
| Environment file      | `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade\.env.local`, Git-ignored                        |
| Existing storage      | `D:\lexnepal\.local\worktrees\cui-16-client-profile\.local\storage`                                  |
| Mailpit               | Existing loopback SMTP 1025 and UI 8025 services retained                                            |
| ClamAV                | Configuration retained, but no listener on 3310 at inspection; upload/scan acceptance was not tested |

Do not use `local:infra:start`, `db:seed:fresh`, migrations, seeders or restore drills
to restart this preview. Some infrastructure scripts provision/alter users and
databases; they are unnecessary for this already working environment.

At the owner's continuation, the previous preview terminal and local services
were no longer running. The same existing MySQL data directory and Mailpit database
were restarted without initialization, upgrades, migrations or account provisioning.
MySQL listener PID is now 8972 (launcher 8700); Mailpit PID is 2708. Read-only business
counts still match the original snapshot. The dedicated upgrade editor was reopened;
the original editor window was preserved. These services must be restarted after
closing them or restarting Windows; they are not installed as auto-start services.

If MySQL is stopped, use this **existing-data-only** startup in PowerShell. It refuses
to start a second server or initialize missing data. Do not substitute an initialization
or infrastructure provisioning command if it fails.

```powershell
$ErrorActionPreference = 'Stop'
if (Get-CimInstance Win32_Process -Filter "Name = 'mysqld.exe'") { throw 'MySQL already exists; inspect it first' }
if (Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 3306 is occupied' }
$previewMysqlBase = 'C:\Users\user\AppData\Local\LexNepal\MySQL\server\mysql-8.4.9-winx64'
$previewMysqlData = 'C:\Users\user\AppData\Local\LexNepal\MySQL\data'
if (-not (Test-Path -LiteralPath (Join-Path $previewMysqlData 'mysql')) -or -not (Test-Path -LiteralPath (Join-Path $previewMysqlData 'ibdata1'))) { throw 'Existing database files missing; do not initialize' }
$previewMysqlArgs = @(
  '--no-defaults', '--standalone', "--basedir=$previewMysqlBase", "--datadir=$previewMysqlData",
  '--port=3306', '--bind-address=127.0.0.1', '--character-set-server=utf8mb4',
  '--collation-server=utf8mb4_0900_ai_ci', '--default-time-zone=+00:00',
  '--skip-log-bin', '--mysqlx=0', '--upgrade=NONE',
  '--log-error=D:\lexnepal\.local\runtime\dependency-recovery-20261012-164809\mysql.err.log',
  '--pid-file=D:\lexnepal\.local\runtime\dependency-recovery-20261012-164809\mysql.pid'
)
Start-Process -FilePath (Join-Path $previewMysqlBase 'bin\mysqld.exe') -ArgumentList $previewMysqlArgs -WindowStyle Hidden
```

Allow startup to finish, then confirm the 3306 listener and the existing error log's
“ready for connections” entry. If startup fails, inspect the error rather than deleting
database files or attempting a forced recovery. Mailpit is required for mail workflows;
to restart it when both 1025 and 8025 are free and no Mailpit process exists:

```powershell
Start-Process -FilePath 'C:\Users\user\AppData\Local\LexNepal\Mailpit\mailpit.exe' -ArgumentList @(
  '--smtp', '127.0.0.1:1025', '--listen', '127.0.0.1:8025',
  '--database', 'C:\Users\user\AppData\Local\LexNepal\Mailpit\mailpit.db', '--max', '500'
) -WindowStyle Hidden
```

Stop the application with Ctrl+C as described below. Leave the database running for
normal local development; do not force-terminate it or delete its data/PID files to
resolve a startup conflict.

## Turbopack configuration correction

The upgrade worktree shares `D:\lexnepal\node_modules` through a Windows junction.
Its previous `turbopack.root = rootDir` excluded that physical directory, causing
the first request to terminate the server with “Symlink ... points out of the
filesystem root”. The older Client worktree had its own physical dependency folder
and therefore did not encounter that error.

The installed Next.js root-directory guide explicitly requires the common parent
of the project and linked dependencies. `next.config.ts` now finds that parent in
development only. Here it resolves to `D:\lexnepal`. The application directory,
routes and TypeScript aliases still belong to the upgrade worktree. Production
root behavior and all security headers remain unchanged.

The existing webpack fallback was tried without dependency changes; several cold
route probes stalled. The final running server uses Turbopack, and the final Staff
route checks pass. No new development framework or dependencies were introduced.

## Continuous editing and safe restart

Keep the dedicated upgrade VS Code window and its development terminal open.
Save changes in this worktree; Next Fast Refresh updates the real application.
There is no build or restart step for ordinary React/CSS edits. Next configuration
and environment edits may require the usual development-server restart.

To stop, press **Ctrl+C in the terminal running `npm run dev`**. Then execute the
startup commands above in that same integrated terminal. Do not start a second
server while port 3001 is occupied, and do not kill every Node process.

If the terminal is lost, inspect port ownership first:

```powershell
$previewListener = Get-NetTCPConnection -LocalPort 3001 -State Listen
$previewServer = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $previewListener.OwningProcess)
$previewCli = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $previewServer.ParentProcessId)
$previewCli | Select-Object ProcessId, ParentProcessId, CommandLine
```

Confirm that the CLI command identifies this upgrade worktree and `next dev` before
stopping anything. Stop only that verified application tree, never its parent
terminal/editor or database services. If a different process owns the port, identify
it before acting. The ignored `process-location.ps1` diagnostic also records the
actual process working directory in `.local/qa/live-preview/current-process.json`.

For a quick browser confirmation, open Staff Home: the `.staff-dashboard-home`
element and calm Session 04 welcome/KPI/workspace composition must be present.
The dedicated VS Code window title includes `ui-staff-admin-upgrade`.

## Actual verification

| Requirement      | Result | Evidence                                                                                                                                               |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Port 3001        | PASS   | Listener and actual process working directory verified in the upgrade worktree                                                                         |
| Real application | PASS   | Real Next/Turbopack routes, normal cookies, existing APIs and local MySQL; no synthetic response substitution                                          |
| Staff login      | PASS   | Existing session survived checkout/server change; fresh normal UI sign-in succeeded with the existing local Staff account                              |
| Staff Home       | PASS   | Session 04 component, four KPI concepts and seven content sections rendered with real values                                                           |
| Staff routes     | PASS   | All 14 listed routes and a real local case-detail route rendered with HTTP 200 and page content                                                        |
| Client/Admin     | PASS   | Fresh normal sign-in and actual portal Home rendered for each; session API returned 200                                                                |
| Fast Refresh     | PASS   | Temporary Home text edit appeared, was restored exactly, and returned without document reload or server restart; same listener PID before/after        |
| Local data       | PASS   | Existing account credentials/roles and domain counts retained; no migration, reseed, reset, restore or direct user-record mutation                     |
| Worktrees/Git    | PASS   | Original six owner edits and both existing tracked Session 04 edits remain byte-identical; all branches/HEADs unchanged; no staging, commits or pushes |
| Documentation    | PASS   | This note records the actual configuration, services, editor/terminal and restart workflow                                                             |

Actual Staff routes checked:

```text
/staff                    /staff/tasks          /staff/cases
/staff/hearings           /staff/documents      /staff/clients
/staff/crm                /staff/appointments   /staff/research
/staff/content            /staff/messages       /staff/team-chat
/staff/hr                 /staff/profile
```

The case-detail path was taken from a real My Cases link and verified; no fake ID
or record was created. Staff was also denied the Admin portal by the existing role
guard. At 1440, 768 and 390px, Home has no horizontal viewport overflow. Staff search
excludes Admin settings, selects the real Staff cases destination and supports
browser back. Mobile drawer keyboard entry, Tab containment, Escape and focus return
work. The real loading skeleton was exercised by delaying one actual GET request;
its response was not replaced. The real My Day schedule's empty state was visible.

Fast Refresh verification changed only the welcome description temporarily. Both
updates occurred in the same browser document. The final VS Code-owned server PID
was unchanged, and the StaffDashboard file's original bytes/hash were restored.

Checks executed:

- `npm run lint`: exit 0.
- `npm run typecheck`: exit 0, including route type generation.
- Direct Vitest unit command with two workers: 631 pass, same five inherited failures,
  636 tests. Failure names match the Session 04 baseline; no test/assertion was changed.
- `git diff --check` and changed configuration/document formatting: pass.
- Actual browser/Windows diagnostics are in ignored `.local/qa/live-preview/`:
  `dashboard-result.json`, `portal-results.json`, `navigation-result.json`,
  `refresh-result.json`, `preservation-result.json`, process metadata and screenshots.

Exact live-task commands (from this worktree):

```powershell
npm run lint
npm run typecheck
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=2 --reporter=json --outputFile=.local/qa/live-preview/unit-results.json
node --import tsx .local/qa/live-preview/verify-live.mjs
node --import tsx .local/qa/live-preview/verify-portals.mjs
node .local/qa/live-preview/verify-navigation.mjs
node .local/qa/live-preview/verify-refresh.mjs
node .local/qa/live-preview/verify-preservation.mjs
git diff --check
```

After restoring the services on continuation, the broad browser probe again verified
all 15 Staff destinations (14 pages plus case detail), normal Client/Admin sign-in,
and all three viewport checks: 17 route results, zero interaction failures and zero
JavaScript page errors. Its exit code remains **1** because it explicitly records
the existing missing-logo API 404s (19 responses in that probe). The focused navigation,
Fast Refresh and preservation probes each exit **0**. Fast Refresh retained listener
PID 1828 and restored the exact original StaffDashboard SHA-256. The current Next
development log shows no HTTP 5xx or database connection errors; the 27 error lines
recorded across these checks concern 404 resources. These counts are snapshots,
not a claim that the application has no outstanding diagnostics.

The broad native browser probe's Client check initially expected the wrong main ID;
Client actually uses `client-main-content`. The corrected focused probe verified
normal Client login and the real page. That was a probe defect, not an application
or authentication failure. Earlier cold webpack probe timeouts and the initial
Turbopack failure remain diagnostic history; final readiness uses the native
Turbopack checks, not those failed attempts.

## Remaining diagnostics and separate QA work

Existing public CMS configuration references image objects missing from both the
previous worktree's storage and the original checkout's storage. The logo request
returns 404; configured fallbacks render. No asset reference or file was deleted
or replaced to hide this condition. Several other configured CMS image files are
also absent. Restoring/reassigning those assets needs its own approved data/asset task.

The existing external Google Fonts CSS import conflicts with the unchanged
`style-src 'self' 'unsafe-inline'` policy. Browser stylesheet/CSP and occasional
development resource-event warnings remain visible; font fallbacks render.
No security policy was loosened for preview. These diagnostics do not block
Staff login, actual route content or Fast Refresh. Core Staff data queries returned
200; the recorded failed requests were missing CMS image objects, not database/auth
failures. The broad probe retains those 404s as failures rather than suppressing them.

The five inherited unit assertions remain in `cases-r7-client` (two),
`cui-09-client-checklist-contract` (one) and `dashboard-contrast` (two); their exact
names/classifications remain in the Session 04 engineering report and unit evidence.
Authenticated release QA, integration setup, complete CRUD/upload/scanning coverage,
production builds and owner visual approval are separate. No release sign-off is
claimed by restoring local development.

Normal sign-in creates ordinary session/audit entries; visiting messaging may update
normal read receipts. Existing users and business records were not reseeded or
edited directly. Counts remained: five users, four cases, five hearings, five tasks,
ten documents, two clients and six appointments. Other Staff pages retain their
current UI; this task does not begin Session 05 or redesign them.

For subsequent sessions, keep this real server running, edit this upgrade worktree,
let the owner review the live application, and seek visual approval at checkpoints.
Commit/push only approved progress to the feature branch when explicitly authorized.
Protect `main` and the original checkout throughout.
