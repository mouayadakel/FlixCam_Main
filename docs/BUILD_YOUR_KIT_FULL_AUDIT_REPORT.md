# Build Your Kit — Full Audit Report

**Page:** `http://localhost:3000/build-your-kit`  
**Route:** `/build-your-kit`  
**Audit date:** 2026-02-15  
**Scope:** Codebase analysis, accessibility, security, performance, API contracts, UX (supplementing existing BUILD_YOUR_KIT_UX_AUDIT.md)

---

## 1. Executive Summary

The Build Your Kit feature is a multi-step wizard (shoot type → budget → questionnaire → categories → duration → summary) for assembling a custom rental kit. The flow uses the platform’s `<Stepper>`, persisted Zustand store, and public APIs. This audit covers **architecture**, **accessibility**, **security**, **performance**, **API usage**, **i18n**, and **error handling**.

### Overall Assessment

| Dimension      | Score | Notes                                                                            |
| -------------- | ----- | -------------------------------------------------------------------------------- |
| Architecture   | 7/10  | Clear store + steps; some steps still do raw fetch with no shared client cache.  |
| Accessibility  | 5/10  | Stepper is a11y-friendly; cards/buttons need consistent labels and semantics.    |
| Security       | 7/10  | Public APIs rate-limited and validated; one unhandled fetch in wizard.           |
| Performance    | 6/10  | Dynamic import + skeleton; duplicate fetches possible; no request dedup.         |
| API / Data     | 6/10  | Zod on kit-ai-suggest; shoot-types fetch in wizard has no .catch().              |
| i18n           | 6/10  | Most UI uses t(); one hardcoded "Loading..." in step-category-equipment.         |
| Error handling | 4/10  | StepShootType has retry UI; goNext fetch and category-equipment errors are weak. |

**Note:** A prior UX audit (BUILD_YOUR_KIT_UX_AUDIT.md) gave lower scores and listed 19 hardcoded strings; the current codebase has improved (e.g. Stepper in use, most copy via i18n). This report re-evaluates the current state and adds security/API/performance.

---

## 2. Page & Route Architecture

### 2.1 Entry Point

- **File:** `src/app/(public)/build-your-kit/page.tsx`
- **Layout:** Wrapped in `<PublicContainer>`, `<main>`, with `h1` + subtitle from `t('kit.title')` / `t('kit.subtitle')`.
- **Wizard load:** `KitWizard` is loaded via `next/dynamic` with **ssr: true** and a skeleton loading state (no hardcoded Arabic in the current file).

### 2.2 Wizard Flow (kit-wizard.tsx)

- **Phases:** `shoot-type` → `budget` → `questionnaire` (optional) → `categories` (per-category equipment) → `duration` → `summary`.
- **State:** `useKitWizardStore` (Zustand + persist key `flixcam-kit-wizard`). Persisted: phase, step, shootTypeId, shootTypeSlug, budgetTier, answers, categorySteps, currentCategoryIndex, skippedCategories, selectedCategoryId, selectedEquipment, durationDays.
- **Navigation:** Back/Next at bottom; mobile: sticky bar with item count + total + “Summary” when `selectedCount > 0`.

### 2.3 APIs Used

| API                              | Method | Used in                              | Auth | Rate limit        |
| -------------------------------- | ------ | ------------------------------------ | ---- | ----------------- |
| `/api/public/shoot-types`        | GET    | step-shoot-type, kit-wizard (goNext) | No   | Yes (public tier) |
| `/api/public/shoot-types/[slug]` | GET    | kit-wizard goNext                    | No   | Yes               |
| `/api/public/equipment`          | GET    | step-category-equipment              | No   | Yes               |
| `/api/public/kit-compatibility`  | POST   | step-category-equipment (lenses)     | No   | Yes               |
| `/api/public/kit-ai-suggest`     | POST   | step-summary, kit-ai-assistant       | No   | Yes               |

All are public; middleware allows `/build-your-kit` without auth.

---

## 3. Accessibility (a11y)

### 3.1 Positive

- **Stepper** (`src/components/ui/stepper.tsx`): `<nav aria-label="Progress">`, `<ol>`, buttons with `aria-current="step"` and `aria-label` including “completed” / “current step”. Good semantics and focus model.
- **Step duration:** `<Label htmlFor="kit-duration-custom">` and `<Input id="kit-duration-custom">` correctly associated.
- **KitEquipmentCard:** Add/remove and quantity buttons use `aria-label` from `t('kit.remove')`, `t('kit.add')`, `t('kit.qty')`.
- **Images:** StepShootType and KitEquipmentCard use `alt` (e.g. `st.name`, `item.model ?? item.sku`). Placeholder/fallback handled.

### 3.2 Gaps

- **Shoot type cards:** Wrapped in `<button>` with no explicit `aria-label`; visible text is the heading/description. Suggest: `aria-label={st.name}` (or localized) so SRs get a clear label.
- **Budget tier pills (step-category-equipment):** Interactive `<button>`s with icon + text but no `aria-pressed` or `aria-current` for selected tier. Recommend: `aria-pressed={budgetTier === id}` or `aria-current={budgetTier === id ? 'true' : undefined}`.
- **Duration presets:** Preset buttons have no `aria-pressed`/`aria-current` for the selected duration.
- **“More in category” expandable:** The control is a `<button>`; consider `aria-expanded={showMore}` and `aria-controls` pointing to the expandable region id for SRs.
- **Summary mobile bar:** Uses `aria-hidden` on the spacer div; the bar itself could have `role="region"` and `aria-label` for “Kit summary” or similar.
- **Focus order:** No focus trap; flow is linear. Ensure no focusable elements are hidden when steps change (current structure is fine).

### 3.3 Contrast & Semantics

- No inline contrast audit was run; components use design tokens (`text-text-heading`, `text-text-muted`, `bg-brand-primary`). Recommend validating contrast in browser with axe or similar.
- Main landmark: page has `<main>`; wizard content is in a logical order. Stepper is in `<nav>`.

---

## 4. Security

### 4.1 Public API Routes

- **Rate limiting:** All listed public routes use `rateLimitByTier(request, 'public')` and return 429 when not allowed.
- **kit-ai-suggest:** Body validated with Zod (`bodySchema`); enums for `budgetTier`, bounds for `duration`. No raw body use.
- **equipment:** Query params parsed with defaults and caps (`skip`/`take` capped, numeric params parsed). Filters use Prisma `where` (parameterized).
- **shoot-types:** Read-only list/config; no user input in path beyond slug (handled by route segment).

### 4.2 Client-Side

- **Data exposure:** No sensitive data in store persistence; only kit-building state. No PII in URLs for this page.
- **XSS:** React escapes output; no `dangerouslySetInnerHTML` in the reviewed components. API responses are rendered as text/attributes.
- **goNext fetch (kit-wizard.tsx):** `fetch(\`/api/public/shoot-types/${shootTypeSlug}\`)`has`.catch(() => {})`, so errors are swallowed and the user gets no feedback. **Recommendation:** At least set a phase-local error state and show a retry or message.

### 4.3 Summary

- No critical security issues found for this page.
- Improvement: handle and surface errors for the shoot-types fetch in the wizard (no silent fail).

---

## 5. Performance

### 5.1 Loading

- **Page:** KitWizard is dynamically imported with a skeleton (good for initial load).
- **StepShootType:** Fetches `/api/public/shoot-types` on mount; loading spinner; no caching (each visit refetches unless server cache hits).
- **StepCategoryEquipment:** Fetches equipment or kit-compatibility on step show; “More in category” loads additional equipment. No shared client cache (e.g. TanStack Query); repeated navigation to same category can re-fetch.

### 5.2 Possible Improvements

- **Request dedup:** Use a data layer (e.g. TanStack Query) for `shoot-types`, `equipment`, and `kit-compatibility` to avoid duplicate requests when revisiting steps.
- **Prefetch:** When moving to “categories”, prefetch first category’s equipment if known.
- **Images:** Next/Image used with `sizes`; `unoptimized` only for `/images/` in StepShootType. Ensure placeholder and external URLs are configured where needed.

### 5.3 Bundle

- Wizard and steps are in the same feature folder; dynamic import of `KitWizard` keeps the main page bundle smaller. No heavy unused deps observed in the reviewed files.

---

## 6. API Contract & Error Handling

### 6.1 GET /api/public/shoot-types

- **Response:** `{ data: ShootTypeItem[] }`. StepShootType expects `json?.data` array.
- **Errors:** 429 from rate limit; 500 from service. StepShootType: checks `!res.ok`, shows `t('kit.errorLoading')` and retry. Good.

### 6.2 GET /api/public/shoot-types/[slug]

- **Used in:** kit-wizard `goNext` when phase is `shoot-type` and `shootTypeSlug` is set.
- **Error handling:** `.catch(() => {})` — no user feedback, no phase rollback. **Fix:** Add error state and retry or message.

### 6.3 GET /api/public/equipment

- **Query params:** categoryId, take, sort, budgetTier, etc. step-category-equipment builds params correctly.
- **Error handling:** In step-category-equipment, `.catch(() => setOtherEquipment([]))` — empty list shown, no message. Acceptable for “more” list; consider a small “Could not load more” message.

### 6.4 POST /api/public/kit-compatibility

- **Body:** `{ selectedEquipmentIds: string[], targetCategoryId: string }`. Used for lenses compatibility.
- **Error handling:** `.catch` resets `otherEquipment` and `lensCompatibilityMap`; no toast or inline message.

### 6.5 POST /api/public/kit-ai-suggest

- **Body:** Zod-validated (shootTypeId, shootTypeSlug, budgetTier, questionnaireAnswers, currentSelections, duration).
- **Step-summary:** `if (!res.ok) return` — matching kits and AI suggestions stay empty; no error message. **Recommendation:** Set error state or toast on !res.ok and optionally on parse errors.

---

## 7. i18n & Copy

- **Page title/subtitle:** From `t('kit.title')`, `t('kit.subtitle')`.
- **Steps:** Labels from `t('kit.chooseShootType')`, `t('kit.chooseBudget')`, `t('kit.stepSummary')`, `t('kit.stepDuration')`, etc.
- **Buttons:** `t('common.back')`, `t('common.next')`, `t('common.retry')` in StepShootType.
- **Hardcoded string:** In `step-category-equipment.tsx` line 304: `"Loading..."` in the “More in category” section. **Fix:** Replace with `t('common.loading')`.

---

## 8. Error Handling Summary

| Location                                | Behavior                 | Recommendation                                    |
| --------------------------------------- | ------------------------ | ------------------------------------------------- |
| StepShootType fetch                     | Shows error + retry      | Keep; good pattern.                               |
| kit-wizard goNext fetch                 | .catch(() => {})         | Add error state + retry or message.               |
| StepCategoryEquipment “other” fetch     | .catch → empty list      | Optional: “Could not load more” message.          |
| StepCategoryEquipment kit-compatibility | .catch → empty           | Optional: message or fallback to non-compat list. |
| StepSummary kit-ai-suggest              | if (!res.ok) return      | Show toast or inline error.                       |
| StepDuration custom input               | parseInt; setDuration(v) | Already guarded with !Number.isNaN(v).            |

---

## 9. Recommendations (Prioritized)

### P0 (Do first)

1. **Wizard goNext fetch:** Replace `.catch(() => {})` with error state and user-visible message or retry for `GET /api/public/shoot-types/[slug]`.
2. **Hardcoded "Loading...":** In `step-category-equipment.tsx`, use `t('common.loading')` instead of `"Loading..."`.

### P1 (High)

3. **Shoot type cards:** Add `aria-label` (e.g. `st.name` or localized) on the card buttons.
4. **Budget tier / duration selection:** Add `aria-pressed` or `aria-current` on the selected option for SRs.
5. **“More in category”:** Add `aria-expanded={showMore}` and optional `aria-controls` on the toggle button.
6. **StepSummary kit-ai-suggest:** On `!res.ok` (and optionally on parse error), set error state or call toast so the user knows prebuilt/AI failed.

### P2 (Medium)

7. **Data layer:** Introduce TanStack Query (or similar) for shoot-types and equipment to cache and dedupe requests.
8. **StepCategoryEquipment:** Consider a short “Could not load more equipment” message when the “other” or compatibility fetch fails.
9. **Contrast:** Run axe or similar on `/build-your-kit` and fix any contrast issues.

### P3 (Nice to have)

10. **Prefetch:** Prefetch first category equipment when entering categories phase.
11. **Summary bar:** Add `role="region"` and `aria-label` for the mobile summary bar.

---

## 10. File Reference

| Path                                                                       | Purpose                                       |
| -------------------------------------------------------------------------- | --------------------------------------------- |
| `src/app/(public)/build-your-kit/page.tsx`                                 | Page wrapper, dynamic KitWizard, skeleton     |
| `src/components/features/build-your-kit/kit-wizard.tsx`                    | Main wizard, phases, nav, sidebar, mobile bar |
| `src/components/features/build-your-kit/kit-summary-sidebar.tsx`           | Sticky sidebar (desktop)                      |
| `src/components/features/build-your-kit/kit-equipment-card.tsx`            | Equipment card + qty                          |
| `src/components/features/build-your-kit/kit-ai-assistant.tsx`              | AI suggestions UI                             |
| `src/components/features/build-your-kit/kit-prebuilt-comparison.tsx`       | Prebuilt kit comparison                       |
| `src/components/features/build-your-kit/steps/step-shoot-type.tsx`         | Shoot type cards                              |
| `src/components/features/build-your-kit/steps/step-budget-tier.tsx`        | Budget tier                                   |
| `src/components/features/build-your-kit/steps/step-questionnaire.tsx`      | Optional questionnaire                        |
| `src/components/features/build-your-kit/steps/step-category-equipment.tsx` | Per-category equipment + “More”               |
| `src/components/features/build-your-kit/steps/step-duration.tsx`           | Duration presets + custom input               |
| `src/components/features/build-your-kit/steps/step-summary.tsx`            | Summary, add to cart, AI/prebuilt             |
| `src/lib/stores/kit-wizard.store.ts`                                       | Zustand store (persisted)                     |
| `src/components/ui/stepper.tsx`                                            | Progress stepper (a11y)                       |

---

## 11. Live Page Note

The audit was performed against the codebase and existing documentation. A live run of `http://localhost:3000/build-your-kit` was not executed (localhost is not reachable from the audit environment). For a full runtime check, run the app locally and:

- Walk the full flow (shoot type → budget → categories → duration → summary).
- Run an accessibility scan (e.g. axe DevTools) on each step.
- Simulate network errors (e.g. offline or 500) and confirm error messages appear where recommended above.

---

_End of report._
