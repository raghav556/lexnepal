# CUI-19 Client visual regression checkpoint

Development baseline: `898a79b031864a711bce822c582ef39d6ebee95d`.
The locked v1.0 DOCX and original twelve JPGs remain authoritative and unchanged.

## Safe component screenshot runner

Run from the CUI-19 checkout, with installed locked dependencies and Playwright Chromium:

```powershell
$env:CUI19_ARTIFACT_DIR = "D:\lexnepal\.local\qa\cui-19\implementation\my-unique-run"
npm run test:visual:client
node scripts/qa/report-client-visual.mjs $env:CUI19_ARTIFACT_DIR
```

Use a unique output directory to preserve earlier evidence. This config has no
production write paths: artifacts are restricted to dedicated runs under ignored
`.local/qa/cui-19` directories. With no explicit output, the config selects a new
timestamped run and passes it to setup and workers. This config has no
`baseURL`, `webServer`, session provisioning, seeding or database setup. It never
uses the default E2E config or localhost:3001. All requests are denied in fresh
about:blank contexts; service workers are blocked. Query/auth adapters exist only
in the test bundle, not application pages. Write commands throw; the chat read
effect is a local no-op. Production role guards remain present with a synthetic
Client identity. This does not exercise actual authentication or authorization.

The real Client layout, twelve views, navigation, branding primitives, topbar,
footer, tables, dialogs, tabs and MatterChatPanel are bundled with the current
Client styles. esbuild, Tailwind/PostCSS and sharp are supplied by the existing
lockfile dependency graph; no dependency installation is performed by this runner.

Each route runs at 1440×900, 1280×800, 1024×768, 768×900, 390×844 and 360×800.
Each width captures healthy, loading, empty, failed, partial, long-text,
120-record, no-upcoming and completed fixtures where the component exposes them.
These are screenshot inputs, not a claim that all nine categories apply to every
screen or that a state acceptance gate passed. Profile secondary-data states open
Data & Privacy; mobile long/high-volume Messages opens the actual thread.
The extended KYC filename and Profile-name cases are recaptured after their
fixture enrichment; unchanged route evidence is reused.

Capture conditions: Chromium, device scale 1, en-GB, Asia/Kathmandu, frozen clock
2026-09-18 04:15 UTC, light theme, reduced motion, blocked network, no cookies or
origin storage. An offline installed Geist font is embedded with its SHA256;
it is a deterministic substitute, **not** the approved reference typography.
CSS motion and carets are disabled only in the fixture. DOM, fonts and scroll
settle before capture. Every state takes consecutive captures and requires exact
equality. Healthy/long/high-volume states also capture the bottom of the scroll
area. Named document-upload and Client security dialogs have desktop/mobile
containment and focus screenshots. Existing CUI-18 keyboard/drawer/radio evidence
is reused; this phase does not claim repeated accessibility acceptance.

## Reference comparisons and reviewed baselines

`reference-manifest.json` freezes each original file hash, actual dimensions and
the locked body-only exceptions for Matter Details and Checklist. A changed pack
stops setup. Current JPGs are 1400 px wide (876 or 933 px high). The DOCX's measured
1536×961 Home source description is not used to resize these stored images.
Candidate comparisons use the actual JPG dimensions, without scaling. Diagnostics
for the two body-only references omit the first 260 px from both images; this
exclusion is a comparison window, not an assertion of aligned sidebar geometry.
The original files are never cropped or overwritten. Side-by-side PNGs and
absolute channel-difference PNGs are written only to the selected QA directory.

Pixel differences from references are **diagnostics**, not pass thresholds:
synthetic contents, substitute fonts and absent approved CMS artwork create known
differences. The report must retain `NOT VERIFIED` for approved-reference acceptance
until a safe real-API synthetic fixture environment and correct assets/fonts are
available and deviations are reviewed. Mobile screenshots are never compared to
resized desktop references. Contrast is not inferred from screenshots.

For later reviewed _synthetic component_ goldens, set `CUI19_REVIEWED_BASELINES` to
a read-only directory containing `<screen-id>/<width>/<state>.png` and `review.json`:

```json
{
  "scope": "synthetic-component",
  "reviewedBy": "Technical Owner review reference",
  "fontSHA256": "copy the fixture-manifest font hash",
  "platform": "win32",
  "chromiumVersion": "copy the browser version from execution evidence"
}
```

The runner requires matching capture conditions/dimensions and exact RGB pixels;
missing files or changed pixels fail. It never creates or updates approved goldens.
These component goldens do not replace the twelve locked design references or the
required real-application visual acceptance. Without reviewed goldens, geometry
checks may pass while the 72-cell overall visual matrix remains `NOT VERIFIED`.

## Narrow visual corrections

Two demonstrated intrinsic-sizing problems required Client-only corrections:

- High-volume My Matters pagination with compact 44px controls expanded the
  implicit grid track at 360/390 px; the same root cause clipped Client Profile
  audit pagination at 360 px. Explicit zero-minimum tracks and opt-in wrapped
  Client pagination retain every existing page button and action. The shared
  Profile opt-in is conditional on the Client variant.
- Long Matter Details content expanded implicit main/rail grid tracks and caused
  overlap/clipping. Zero-minimum single-column tracks constrain the same cards
  within the approved two-column composition.

The selectors require the Client shell module class and Client theme. Staff/Admin
and backend behavior are unchanged. Before/after screenshot and command evidence
is retained under the ignored CUI-19 QA directory. A checkpoint is infrastructure
and targeted correction delivery; it is not CUI-19 visual acceptance or publication.
