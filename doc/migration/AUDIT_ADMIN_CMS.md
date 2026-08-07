# AUDIT — `/admin/cms` (Public CMS product)

**Date:** 2026-08-07  
**Scope:** Localhost production-shaped readiness of the admin CMS surface and every Public CMS module routed from it.  
**Authority baseline:** [`PHASE_8_2_PUBLIC_CMS.md`](./PHASE_8_2_PUBLIC_CMS.md) = **`complete_local`**. This audit does **not** reopen Convex→Next authority, importer, or tenant plumbing.

**Method:** Code evidence only (routes, views, contracts, APIs, public consumers). No invented endpoints.

---

## 1. Executive verdict

| Layer | Status |
| --- | --- |
| Domain authority (PG + `/api/v1/cms*` + `cms:verify-local`) | **Done** (`PHASE_8_2`) |
| Admin routes (12 CMS pages under `/admin/cms`) | **Present** and linked from admin layout |
| Public E2E connectivity (admin save → API → public read) | **Wired locally** — CMS-0…9 fixes applied; run `cms:verify-local` |
| Corporate polish (SEO runtime, media library, FAQ CMS, sitemap) | **Local complete** — CMS-7 covers via asset upload; CMS-10 sitemap + redirects; PDF resource files remain HTTPS URL |

**One-line:** Backend CMS authority is production-shaped for localhost; all 12 admin CMS modules route to live APIs. Remaining gaps are **deferred polish** (media library, FAQ/sitemap CMS), not broken admin→public pipes.

---

## 2. Ownership freeze (do not violate)

| Surface | Owns | Does **not** own |
| --- | --- | --- |
| `/admin/cms/**` | Public site content, settings, nav, practice areas, testimonials, blog/news, careers postings + applications UI, resources, about/legal, newsletter list, **public team profile fields** | User invite/role/auth, HR payroll/attendance, CRM lead pipeline, appointments calendar |
| `/admin/users` (Phase 8.1) | Accounts, roles, invite, suspend, avatar binary | Public bio / leadership copy |
| `/admin/hr` (Phase 8.11) | Attendance, leave, payroll | Public careers / job applications |
| `/admin/crm` | Leads (incl. contact form intake) | Contact *display* strings on the marketing site |
| `/admin/appointments` | Booking/calendar | Consultation marketing FAQ copy |

**Rules:**
1. Do not create users from `/admin/cms/team` (feature/edit profile only).
2. Do not merge job applications into HR without an explicit product decision.
3. Contact **display** = CMS settings; contact **intake** = CRM.
4. Do not embed a second media/auth stack inside CMS editors without reusing existing storage quarantine.

---

## 3. Surface inventory

### 3.1 Admin routes

| Route | View |
| --- | --- |
| `/admin/cms` | `AdminCMSDashboard.tsx` — **Site Settings** (not a module hub) |
| `/admin/cms/homepage` | `AdminCMSHomepage.tsx` |
| `/admin/cms/navigation` | `AdminCMSNavigation.tsx` |
| `/admin/cms/practice-areas` | `AdminCMSPracticeAreas.tsx` |
| `/admin/cms/testimonials` | `AdminCMSTestimonials.tsx` |
| `/admin/cms/team` | `AdminCMSTeam.tsx` |
| `/admin/cms/blog` | `AdminCMSBlog.tsx` |
| `/admin/cms/news` | `AdminCMSNews.tsx` |
| `/admin/cms/careers` | `AdminCMSCareers.tsx` |
| `/admin/cms/resources` | `AdminCMSResources.tsx` |
| `/admin/cms/about` | `AdminCMSAbout.tsx` |
| `/admin/cms/governance` | `AdminCMSGovernance.tsx` |

Nav for these lives in `src/app/(admin)/layout.tsx` under **“Public CMS”** (not as cards inside the dashboard).

### 3.2 Shared stack (reuse — no second CMS API)

| Layer | Path |
| --- | --- |
| Contracts | `src/shared/contracts/cms.ts` |
| Queries | `src/client/queries/cms.ts` |
| Service / repo | `cms-service.ts`, `cms-repository.ts` |
| Admin API | `/api/v1/cms/[collection]`, settings, team, applications, newsletter, legal-pages, navigation/reorder |
| Public API | `/api/v1/public/cms/[collection]`, settings, blog slug, news id, careers apply, resources downloads, legal, newsletter |
| Verify | `npm run cms:verify-local` |

---

## 4. Per-module connectivity matrix

Legend: **wired** = admin ↔ API ↔ DB ↔ public consumer working for core CRUD; **partial** = critical disconnect; **decorative** = UI writes fields nobody reads (or writes invalid payloads).

| Module | Admin | Public consumer(s) | Status | Top issue |
| --- | --- | --- | --- | --- |
| Site Settings | `/admin/cms` | Layout, Home, Contact | **wired** (CMS-2…4) | Contact keys + brand/ops consumers |
| Homepage | `/admin/cms/homepage` | Director message on Home | **wired** (narrow) | Only director message — not full section CMS |
| Navigation | `/admin/cms/navigation` | Header + footer cols | **wired** (CMS-3) | Footer uses `footer_col_*` + titles |
| Practice areas | `/admin/cms/practice-areas` | Home + `/practice-areas` + `/practice-areas/[slug]` + consultation/CRM/chatbot | **complete** | FAQs, order, cover, SEO, slug detail owned by CMS |
| Testimonials | `/admin/cms/testimonials` | Home (approved + showOnHome) | **complete** | Order, avatar CMS assets, rating fidelity, seed/verify |
| Public Team | `/admin/cms/team` | Home, `/lawyers`, profiles | **wired** | Avatar via Users (CMS-8) |
| Blog | `/admin/cms/blog` | `/blog`, `/blog/[slug]` | **wired** | publishDate preserve + SEO metadata (CMS-5) |
| News | `/admin/cms/news` | `/news`, `/news/[id]` | **wired** | draft/publish (CMS-6) |
| Careers | `/admin/cms/careers` | `/careers` + applications | **wired** | `postedDate` date-only (CMS-1) |
| Resources | `/admin/cms/resources` | `/resources` | **complete** | Cover via CMS upload; file URL remains HTTPS |
| About | `/admin/cms/about` | `/about-us` via settings | **wired** | Values/timeline as raw JSON |
| Governance | `/admin/cms/governance` | Legal pages + newsletter + redirects | **complete** | Admin legal GET; `urlRedirects` + sitemap |

---

## 5. P0 / P1 / P2 findings (evidence-based)

### P0 — correctness

| ID | Finding | Evidence |
| --- | --- | --- |
| CMS-P0-1 | Careers create/update sent ISO datetime; contract requires `YYYY-MM-DD` | **DONE (CMS-1)** — UI + verify |
| CMS-P0-2 | Contact display settings key mismatch on Contact page + footer | **DONE (CMS-2)** — readers use `phone`/`email`/`address` |

### 5.1 Contact / settings key map (CMS-0 freeze)

Canonical **admin write** keys (Site Settings → `updateSettings`): `phone`, `email`, `address`.

| Consumer | Keys read | Match admin? |
| --- | --- | --- |
| Header top bar (`public-layout-shell.tsx`) | `phone`, `email` | **Yes** |
| Footer contact block (`public-layout-shell.tsx`) | `phone`, `email` | **Yes** (CMS-2) |
| Contact page cards (`ContactPage.tsx`) | `phone`, `email`, `address` | **Yes** (CMS-2) |

**CMS-2 decision:** **(A)** public readers use canonical `phone`/`email`/`address` — no `contact*` aliases.

---

### P1 — ops / brand honesty

| ID | Finding | Evidence |
| --- | --- | --- |
| CMS-P1-1 | Footer nav columns unused | **DONE (CMS-3)** |
| CMS-P1-2 | Write-only settings | **DONE (CMS-4)** — consume brand/ops; honest notes for theme hex |
| CMS-P1-3 | Blog re-save resets `publishDate` | **DONE (CMS-5)** |
| CMS-P1-4 | Blog/global SEO not applied | **DONE (CMS-5)** |
| CMS-P1-5 | News has no draft | **DONE (CMS-6)** |

### P2 — corporate grade / hygiene

| ID | Finding | Notes |
| --- | --- | --- |
| CMS-P2-1 | No first-party media library | **DONE (CMS-7)** — blog/news/resource covers via CMS asset upload |
| CMS-P2-2 | Team `avatarUrl` decorative | **DONE (CMS-8)** |
| CMS-P2-3 | FAQ not CMS-owned | **DONE for practice areas** (CMS FAQs JSON); sitemap/redirects still deferred |
| CMS-P2-4 | No sitemap / redirects CMS | **DONE (CMS-10)** — `app/sitemap.ts` + governance redirects |
| CMS-P2-5 | Nav soft-delete children | **DONE (CMS-9)** — cascade proven |
| CMS-P2-6 | Live chat script | Intentionally retired — keep disabled |

---

## 6. Corporate-grade missing modules (classified)

| Capability | Classification |
| --- | --- |
| Homepage multi-section CMS | Missing (director message only) |
| SEO / meta runtime | Partial / decorative |
| Footer column CMS | Partial (admin yes, public no) |
| Media library | Missing |
| FAQ CMS | Missing (hardcoded) |
| Redirects / sitemap | Missing |
| Preview mode | Missing (blog draft only) |
| Content i18n | Missing |
| Analytics / maintenance / announcement / cookies | Admin write-only |
| Live chat injection | Intentionally deferred/retired |
| First-party resume upload + rate limits | Intentionally deferred (PHASE_8_2) |

---

## 7. Implementation plan (CMS-0…CMS-10)

Do **not** duplicate PHASE_8_2 authority work. Same pattern as CRM-0…6 / APT-0…6.

| Phase | Priority | Work | Exit |
| --- | --- | --- | --- |
| **CMS-0** | P0 | Baseline freeze: this audit + `cms:verify-local` green; document key map | **DONE 2026-08-07** |
| **CMS-1** | P0 | Fix careers `postedDate` → date-only; prove create/update | **DONE 2026-08-07** |
| **CMS-2** | P0 | Unify contact keys end-to-end (pick one map: alias on read **or** migrate keys) | **DONE 2026-08-07** |
| **CMS-3** | P1 | Wire footer `footer_col_1/2` + titles on public layout | **DONE 2026-08-07** |
| **CMS-4** | P1 | Consume or remove write-only settings (logo/firmName/hours/announcement/maintenance/cookies/GA) | **DONE 2026-08-07** |
| **CMS-5** | P1 | Preserve blog `publishDate`; apply SEO to public metadata | **DONE 2026-08-07** |
| **CMS-6** | P1 | News draft/publish filter mirroring blog | **DONE 2026-08-07** |
| **CMS-7** | P2 | Media upload via existing quarantine/storage for covers/resources | **DONE 2026-08-07** — blog/news/resource covers |
| **CMS-8** | P2 | Team: remove dead avatar URL; deep-link Users avatar; clarify caps UI | **DONE 2026-08-07** |
| **CMS-9** | P2 | Admin legal GET; nav soft-delete children | **DONE 2026-08-07** |
| **CMS-10** | P2 | Sitemap + redirects | **DONE 2026-08-07** — `sitemap.ts` + `urlRedirects` |

---

## 8. Localhost demo / verify

```powershell
npm run cms:verify-local
# After CMS-1+:
# Admin → /admin/cms (settings) → /admin/cms/careers (create job)
# Public → /careers, /contact, footer phone/email
```

**Related:** [`PHASE_8_2_PUBLIC_CMS.md`](./PHASE_8_2_PUBLIC_CMS.md) · Users [`AUDIT_ADMIN_USERS.md`](./AUDIT_ADMIN_USERS.md) · HR [`PHASE_8_11_HR.md`](./PHASE_8_11_HR.md) · CRM [`AUDIT_ADMIN_CRM.md`](./AUDIT_ADMIN_CRM.md) · Appointments [`AUDIT_ADMIN_APPOINTMENTS.md`](./AUDIT_ADMIN_APPOINTMENTS.md)

---

## 9. Phase execution records

### CMS-0 — Baseline freeze — **DONE 2026-08-07**

| Check | Result |
| --- | --- |
| Audit accepted | This file is the freeze |
| Ownership freeze | CMS ≠ Users ≠ HR ≠ CRM ≠ Appointments (§2) |
| Contact key map | Documented §5.1 |
| `npm run cms:verify-local` | **PASS** (`auth:verify-boundary` + CMS: `publicPublishedOnly`, `anonymousAdmin` 401, `crossFirmWrite` 404, `unsafeSetting` 400, `newsletterIdempotent`) |

**Note:** Careers `postedDate` date-only fix is already in `AdminCMSCareers.tsx` (ahead of CMS-1 prove). CMS-1 still owns formal prove/exit.

---

### CMS-1 — Careers postedDate — **DONE 2026-08-07**

| Check | Result |
| --- | --- |
| Admin UI | Create → `todayIsoInFirmTz()`; update → preserve existing date-only (`normalizePostedDate`) |
| Contract | `careerInputSchema.postedDate` = `z.string().date()` |
| ISO rejected | POST with `toISOString()` → **400** |
| Date-only create/update | POST **201** + PATCH **200**; stored `YYYY-MM-DD` |
| `cms:verify-local` | **PASS** (`careersPostedDateOk: true`) |

**Code:** `AdminCMSCareers.tsx`, `scripts/cms/verify-local.ts`.

---

### CMS-2 — Contact keys — **DONE 2026-08-07**

| Check | Result |
| --- | --- |
| Decision | **(A)** readers use canonical `phone` / `email` / `address` |
| Footer | `public-layout-shell.tsx` Contact block |
| Contact page | `ContactPage.tsx` cards + success callout |
| Admin write | unchanged (`AdminCMSDashboard` → `phone`/`email`/`address`) |
| Round-trip | PUT settings → GET `/api/v1/public/cms/settings` matches |
| `cms:verify-local` | **PASS** (`contactKeysOk: true`) |

---

### CMS-3 — Footer columns — **DONE 2026-08-07**

| Check | Result |
| --- | --- |
| Public footer | `footer_col_1` / `footer_col_2` + `footerCol1Title` / `footerCol2Title` |
| Prefetch | `(public)/layout.tsx` loads all three nav locations |
| Verify | `footerNavOk: true` |

---

### CMS-4 — Settings honesty — **DONE 2026-08-07**

| Setting | Public consumer |
| --- | --- |
| `firmName` / `tagline` / `logoUrl` | Header + footer brand |
| `businessHoursText` / emergency | Header bar + Contact / footer |
| `announcement*` | Top announcement bar |
| `maintenanceMode*` | Full-page public gate |
| `cookieConsentEnabled` | Cookie banner |
| `faviconUrl` / SEO | `generateMetadata` on public layout |
| `googleAnalyticsId` / `facebookPixelId` | Validated ID scripts only |
| `primaryColor` | Honest “not applied to OKLCH tokens yet” |
| Live chat script | Remains blocked |

---

### CMS-5 — Blog publishDate + SEO — **DONE 2026-08-07**

| Check | Result |
| --- | --- |
| Re-save | Preserves existing `publishDate` when still published |
| Post metadata | `blog/[slug]/page.tsx` `generateMetadata` uses `seoTitle` / `seoDescription` |
| Verify | `blogPublishDatePreserved: true` |

---

### CMS-6 — News drafts — **DONE 2026-08-07**

| Check | Result |
| --- | --- |
| Schema | `news_status` enum + `status` column (`0015_news_status`) |
| Contract / admin UI | `draft` \| `published` |
| Public | Lists/details only `published` |
| Verify | `newsDraftsPrivate: true` |

---

### CMS-7 — Media library — **DONE 2026-08-07**

Blog/news/resource **cover images** use CMS asset upload intents (`blog_cover`, `news_image`, `resource_cover`). Resource **file** downloads remain HTTPS URLs (PDF not in image-only CMS asset MIME allowlist).

---

### CMS-8 — Team avatar — **DONE 2026-08-07**

Removed editable Avatar URL; display Users avatar; deep-link `/admin/users`.

---

### CMS-9 — Legal GET + nav cascade — **DONE 2026-08-07**

| Check | Result |
| --- | --- |
| Admin legal GET | `/api/v1/cms/legal-pages/:slug` |
| Governance editor | Uses admin scope |
| Nav delete | Soft-deletes parent + children (`navCascadeDeleteOk`) |

---

### CMS-10 — FAQ / sitemap / redirects — **DONE 2026-08-07**

Practice-area FAQs are CMS-owned. Public `sitemap.xml` from published CMS content. Admin redirects via settings key `urlRedirects` (governance tab) + `.local/cms-redirects.json` cache consumed by `proxy.ts`.

---

## 10. Report status

**CMS-0…CMS-10 done for local production-shaped scope.** Resource PDF binary upload remains HTTPS URL-only by design (image MIME gate on CMS assets).
`cms:verify-local` PASS includes `cmsBlogCoverUploadOk` and `cmsRedirectsOk`.
