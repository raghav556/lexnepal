# AUDIT — `/admin/cms/homepage` (Director Message module)

**Date:** 2026-08-07  
**Route:** `http://localhost:3001/admin/cms/homepage`  
**Public consumer:** `HomePage` → `DirectorMessageSection` at `/`  
**Storage:** `cms_settings.key = director_message` (JSON object)

---

## 1. Executive verdict

| Layer | Status |
| --- | --- |
| Admin UI (all fields + save) | **Complete** — live preview + team link warnings added |
| API (PUT/GET admin + public read) | **Wired** — `director_message` not filtered by public sanitizer |
| Public homepage section | **Wired** — all fields consumed via `parseDirectorMessage` + `resolveDirectorProfile` |
| Automated verify | **`homepageDirectorMessageOk`** in `npm run cms:verify-local` |

**Scope note:** This admin page owns **only** the director message block. Homepage hero, tagline pill, stats, FAQ, trusted logos, and mobile-app banner are owned by **Site Settings** (`/admin/cms`) or remain hardcoded (FAQ/stats — CMS-10 deferred).

---

## 2. Field matrix (admin → public)

| Admin field | Setting key path | Public consumer | E2E |
| --- | --- | --- | --- |
| Show on homepage | `director_message.isVisible` | `DirectorMessageSection` — hides section when false | ✅ |
| Section title | `director_message.sectionTitle` | Section `<h2>` | ✅ |
| Message body | `director_message.message` | Blockquote text | ✅ |
| Name | `director_message.name` | Footer of card; overridden by linked team member | ✅ |
| Public designation | `director_message.designation` | Subtitle under name | ✅ |
| Team member link | `director_message.teamMemberId` | CTA → `/lawyers/[id]`; photo/name from team when public | ✅ |
| Photo URL | `director_message.photoUrl` | Left column image; team avatar wins when linked + public | ✅ |
| Signature image URL | `director_message.signatureUrl` | Signature image above name | ✅ |
| Button label | `director_message.ctaLabel` | CTA button text | ✅ |

---

## 3. Bugs found & fixed (this audit)

| Issue | Fix |
| --- | --- |
| Admin team dropdown used **public** team only (`usePublicTeam`) — non-public partners invisible | Switched to **`useAdminTeam()`** with “(not public yet)” labels |
| Form load required truthy `raw.message` — partial DB rows failed to hydrate | Load via **`parseDirectorMessage()`** |
| Default seed text referenced “Srimar Law” | Neutral **`DEFAULT_DIRECTOR_MESSAGE`** |
| No admin live preview | **`DirectorMessageSection previewMode`** card |
| No warning when linked member not public-facing (profile 404) | Amber alert + post-save toast |
| Lawyer profile page only matched `m._id` | Match **`m._id ?? m.id`** |
| No automated E2E test | **`homepageDirectorMessageOk`** in verify script |

---

## 4. Out of scope (homepage `/` but not this admin page)

| Content | Owner | Status |
| --- | --- | --- |
| Hero background image | Site Settings → `heroImageUrl` | Wired |
| Tagline pill in hero | Site Settings → `tagline` | Wired |
| Stats counters | Hardcoded `STATS` in `HomePage.tsx` | Not CMS — future phase |
| FAQ accordion | Hardcoded `FAQS` in `HomePage.tsx` | CMS-10 deferred |
| Trusted-by logos | Hardcoded `TRUSTED_LOGOS` | Not CMS |
| Practice areas / blog / testimonials | `/admin/cms/practice-areas`, `/blog`, `/testimonials` | Wired (separate modules) |
| Mobile app banner | Site Settings → `mobileAppBannerVisible` + related keys | Wired |

---

## 5. Test plan (manual)

1. Open `/admin/cms/homepage` — confirm saved message loads (not blank defaults).
2. Toggle **Show on homepage** off — live preview shows “Hidden on public site” banner; `/` has no director section.
3. Edit section title + message → Save → hard refresh `/` — section updates.
4. Link a **public** partner → Save → CTA opens `/lawyers/[id]`.
5. Link a **non-public** partner → amber warning; after featuring in CMS → Team, profile link works.
6. Run `npm run cms:verify-local` — `homepageDirectorMessageOk: true`.
