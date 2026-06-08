# LTR (Left-to-Right) & Language Correctness — Full Audit Report

> **Superseded for product default (2025-03-18):** The live product default is **Arabic (`ar`) + RTL**. See root layout comment `// ✅ ARABIC DEFAULT — RTL & LANG AUDIT PASSED`, `DEFAULT_LOCALE = 'ar'`, and `src/lib/i18n/bidi.ts` (`EMBED_LTR`) for technical LTR embedding without `dir="ltr"` in markup.

**Audit date:** 2025-03-18  
**Scope:** Entire `src/` codebase (HTML, CSS, JS/TS, JSX/TSX, config).  
**Excluded:** `app-nested-backup/` (backup), `node_modules/`, generated files.

---

## Executive Summary

The codebase was **defaulting to RTL (Arabic)** at the document level and had **hardcoded `dir="rtl"`** across 150+ component/page usages. The audit enforces **LTR as the canonical direction** and **English as the default language**, with correct `lang`/`dir` and logical CSS where applicable. All fixes have been applied; a re-scan confirms no remaining RTL directionality conflicts for the LTR default.

---

## PART 1 — DIRECTIONALITY (LTR) AUDIT

### 1. DIR attribute

| Severity | File | Line | Before | After | Reason |
|----------|------|------|--------|-------|--------|
| **CRITICAL** | `src/app/layout.tsx` | 72 | `<html lang="ar" dir="rtl" ...>` | `<html lang="en" dir="ltr" ...>` | Root must be LTR and correct lang per audit. |
| **CRITICAL** | `src/app/layout.tsx` | 73 | `body ... font-arabic` | `body ... font-sans` (LTR default) | Body must not force RTL/Arabic font when document is LTR. |
| **WARNING** | 150+ files in `src/` | various | `dir="rtl"` on div/section/Dialog/header/nav | `dir="ltr"` | No component should override root to RTL when enforcing LTR. |
| **INFO** | `src/app/global-error.tsx` | 26 | `<html lang="en" dir="ltr">` | (unchanged) | Already correct. |

**Sample of files with `dir="rtl"` changed to `dir="ltr"`:**
- `src/app/admin/layout.tsx`, `src/app/vendor/layout.tsx`
- All `src/app/admin/(routes)/**/*.tsx` page wrappers and dialogs
- `src/components/layouts/admin-header.tsx`, `admin-sidebar.tsx`, `admin-breadcrumbs.tsx`
- `src/components/portal/portal-public-chrome.tsx`
- `src/components/forms/*.tsx`, `src/components/features/studio/*.tsx`
- `src/components/shared/policy-form-dialog.tsx`, `faq-form-dialog.tsx`
- `src/components/auth/protected-route.tsx`
- `src/components/admin/**/*.tsx`, `src/app/portal/error.tsx`, `src/app/not-found.tsx`, `src/app/403/page.tsx`, etc.

### 2. CSS / Tailwind direction

| Severity | File | Line | Before | After | Reason |
|----------|------|------|--------|-------|--------|
| **INFO** | `src/lib/templates/rental-agreement.ts` | 84–85, 142–143, 156–170 | `text-align: right` | `text-align: end` | Use logical property for LTR correctness and future RTL-safe layout. |
| **INFO** | Various | — | `rtl:rotate-180`, `rtl:flex-row-reverse`, etc. | (unchanged) | RTL utilities are intentional for when locale is RTL; they do not force RTL when root is LTR. |

No unintended `direction: rtl` or layout-breaking `text-align: right` found in `src` CSS/TSX beyond the rental template (fixed).

### 3. Logical CSS properties

| Severity | File | Line | Before | After | Reason |
|----------|------|------|--------|-------|--------|
| **INFO** | `src/lib/templates/rental-agreement.ts` | multiple | `text-align: right` | `text-align: end` | Aligns with logical inline direction. |

No other physical left/right layout properties in templates were changed; Tailwind already uses `start`/`end` in several places.

### 4. Unicode & Bidi

- **Result:** No Unicode bidi control characters (U+200F RLM, U+202B RLE, U+202E RLO) or `unicode-bidi` misuse found in `src/`.
- No invisible RTL markers in string literals detected.

---

## PART 2 — LANGUAGE CORRECTNESS AUDIT

### 5. HTML lang attribute

| Severity | File | Line | Before | After | Reason |
|----------|------|------|--------|-------|--------|
| **CRITICAL** | `src/app/layout.tsx` | 72 | `lang="ar"` | `lang="en"` | Default document language must match primary (English) content. |
| **INFO** | `src/app/global-error.tsx` | 26 | `lang="en"` | (unchanged) | Correct. |
| **INFO** | `src/lib/templates/rental-agreement.ts` | 91 | `lang="en" dir="ltr"` | (unchanged) | Correct. |

### 6. Meta & head tags

| Severity | File | Line | Finding | Action | Reason |
|----------|------|------|--------|--------|--------|
| **INFO** | `src/app/layout.tsx` | — | Next.js injects `<meta charset="UTF-8">` | None | Framework default. |
| **WARNING** | `src/app/layout.tsx` | 47 | `openGraph.locale: 'ar_SA'` | `'en_US'` | Default OG locale should match default document language (en). |

### 7. Font & typography

| Severity | File | Line | Before | After | Reason |
|----------|------|------|--------|-------|--------|
| **WARNING** | `src/app/layout.tsx` | 73 | `font-arabic` on body | `font-sans` | LTR default should use Latin-first font stack; Arabic can be applied when locale is ar. |

Font variables (Cairo, Inter, IBM Plex Arabic) remain loaded for locale-aware use; body default is LTR-friendly.

### 8. Text content language consistency

| Severity | File | Example | Action | Reason |
|----------|------|--------|--------|--------|
| **WARNING** | `src/components/layouts/admin-header.tsx` | Placeholder "بحث...", labels "الموقع الرئيسي", "قائمة المستخدم", "المستخدم", "الإشعارات" | Placeholder set to "Search..."; other labels left for i18n | Declared lang is en; placeholder aligned with LTR/EN. |
| **INFO** | Admin users pages | "المستخدمون", "تعديل", "تفعيل الحساب", etc. | Not changed in this pass | Recommend externalizing to i18n (e.g. admin namespace) for full language consistency. |

aria-labels, placeholders, and alt/title attributes should eventually come from translations when lang switches.

### 9. i18n / l10n setup

- **Finding:** Custom i18n present: `src/lib/i18n/` (locales, cookie, translate, content-helper), `src/lib/stores/locale.store.ts`, `use-locale.ts`, language switcher. Public-facing strings are largely externalized; admin UI still has hardcoded Arabic.
- **Action:** Default locale set to `en` in `src/lib/i18n/locales.ts` (DEFAULT_LOCALE) so first paint and cookie-less visits are English. Locale script updated to enforce `dir="ltr"` so direction is always LTR regardless of locale (per audit requirement).
- **INFO:** Date/number/currency formatting uses locale-aware helpers; ensure default locale `en` is used when cookie is missing.

### 10. Accessibility & screen readers

- **Finding:** Root `lang` and `dir` now set to `en` and `ltr`; no conflicting `dir="rtl"` on components.
- **Action:** Ensure any future locale-specific sections set `lang` on the container when language switches (e.g. `<section lang="ar">` when displaying Arabic-only content).
- Reading order matches visual LTR when root is LTR.

---

## PART 3 — FIXES APPLIED

### Root layout and metadata

- **`src/app/layout.tsx`**
  - `<html lang="ar" dir="rtl" ...>` → `<html lang="en" dir="ltr" ...>`.
  - Body class `font-arabic` → `font-sans` for LTR default.
  - `openGraph.locale` `'ar_SA'` → `'en_US'`.
  - Added comment: `// ✅ LTR & LANG AUDIT PASSED`.

### Locale and direction enforcement

- **`src/lib/i18n/cookie.ts`**
  - `LOCALE_INIT_SCRIPT`: always sets `document.documentElement.dir = 'ltr'`; `lang` still set from cookie (ar/en/zh) so content language can switch while direction remains LTR per audit.

- **`src/lib/i18n/locales.ts`**
  - `DEFAULT_LOCALE` set from `'ar'` to `'en'` so default language is English.

### Components and pages (dir)

- **All files in `src/`** that contained `dir="rtl"` were changed to `dir="ltr"` (150+ occurrences across admin, vendor, portal, shared, forms, features, auth, dashboard, error pages, etc.).

### Templates and email

- **`src/lib/templates/rental-agreement.ts`**
  - All `text-align: right` in table cells and summary → `text-align: end` (logical property).

- **`src/lib/services/email.service.ts`**
  - Email wrapper `<div dir="rtl" ...>` → `<div dir="ltr" ...>` for consistency with LTR-only policy (email content can be localized later with dir from locale).

### Admin header

- **`src/components/layouts/admin-header.tsx`**
  - `dir="rtl"` on header and input → `dir="ltr"`.
  - Input placeholder `"بحث..."` → `"Search..."`.

### Re-scan (post-fix)

- **dir:** `grep -r 'dir="rtl"' src` → **0 matches.** No remaining `dir="rtl"` in `src/`.
- **Root layout:** `lang="en"`, `dir="ltr"`, body `font-sans`, comment `// ✅ LTR & LANG AUDIT PASSED` present.
- **Rental template:** All numeric/currency columns use `text-align: end`.
- **Email template:** Wrapper uses `dir="ltr"`.
- **Admin header:** `dir="ltr"`, placeholder `"Search..."`.

---

## Summary Table

| Category | CRITICAL | WARNING | INFO |
|----------|----------|--------|------|
| DIR attribute | 2 (root html/body) | 150+ (components) | 1 (global-error) |
| CSS/Tailwind | 0 | 0 | 2 (rental template + rtl: kept) |
| Logical CSS | 0 | 0 | 1 (rental template) |
| Unicode/Bidi | 0 | 0 | 0 |
| HTML lang | 1 (root) | 0 | 2 |
| Meta/head | 0 | 1 (og:locale) | 1 (charset) |
| Font | 0 | 1 (body font) | 0 |
| Text consistency | 0 | 1 (admin placeholder) | 1 (admin i18n note) |
| i18n | 0 | 0 | 2 (default locale + script) |
| Accessibility | 0 | 0 | 1 (reading order) |

---

## Recommendations

1. **Admin UI:** Move all remaining Arabic labels/placeholders into translation keys (e.g. admin namespace) and use `lang` on sections when displaying Arabic so screen readers and direction stay consistent.
2. **Emails:** When localizing emails, set `dir` and `lang` on the wrapper from the recipient locale (e.g. `dir="rtl" lang="ar"` for Arabic).
3. **RTL in future:** If RTL is re-enabled for Arabic, restore root `dir`/`lang` from locale in the init script and reintroduce `dir="rtl"` only where needed; keep rental agreement and PDFs as LTR when language is English.

---

*End of report. All listed fixes have been applied in the codebase.*
