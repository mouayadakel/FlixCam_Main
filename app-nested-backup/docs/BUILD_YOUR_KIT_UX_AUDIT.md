# Build Your Kit — Comprehensive UX/UI Audit Report

**Page:** `/build-your-kit`  
**Component:** `src/components/features/build-your-kit/kit-wizard.tsx`  
**Page wrapper:** `src/app/(public)/build-your-kit/page.tsx`  
**Audit date:** 2026-02-14  
**Auditor:** AI Assistant  
**Platform version:** FlixCam.rent (Phase 2.6)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Page Architecture & File Structure](#2-page-architecture--file-structure)
3. [Visual Design Audit](#3-visual-design-audit)
4. [User Experience Flow Audit](#4-user-experience-flow-audit)
5. [Localization & RTL Audit](#5-localization--rtl-audit)
6. [Accessibility (a11y) Audit](#6-accessibility-a11y-audit)
7. [Error Handling & Edge Cases](#7-error-handling--edge-cases)
8. [Performance Audit](#8-performance-audit)
9. [Code Quality & Architecture](#9-code-quality--architecture)
10. [Platform Consistency Comparison](#10-platform-consistency-comparison)
11. [Cart Integration Gap Analysis](#11-cart-integration-gap-analysis)
12. [Prioritized Recommendations](#12-prioritized-recommendations)
13. [Appendix: Platform Design Token Reference](#appendix-platform-design-token-reference)

---

## 1. Executive Summary

The Build Your Kit feature is a 4-step wizard allowing customers to assemble a custom rental kit: **Category → Equipment → Duration → Summary**. While the feature is functionally scaffolded, it is significantly below the UI/UX quality bar set by the rest of the platform (checkout, equipment catalog, equipment detail pages).

### Overall Score

| Dimension            | Score      | Grade |
| -------------------- | ---------- | ----- |
| Visual Design        | 3/10       | F     |
| User Experience      | 4/10       | D     |
| Localization / i18n  | 2/10       | F     |
| Accessibility        | 2/10       | F     |
| Error Handling       | 1/10       | F     |
| Performance          | 6/10       | C     |
| Code Quality         | 4/10       | D     |
| Platform Consistency | 2/10       | F     |
| Cart Integration     | 1/10       | F     |
| **Overall**          | **2.8/10** | **F** |

### Key Findings

- **19 hardcoded English strings** in an Arabic-first RTL platform
- **Zero error handling** on both API calls (categories + equipment)
- **Zero empty-state UI** when API returns no data
- Ignores the existing `<Stepper>` component used in checkout
- Uses raw HTML `<input>` instead of the platform's Shadcn `<Input>` component
- Cart integration is entirely broken — URL params are never parsed
- No equipment images, thumbnails, brand names, or availability badges
- Progress indicator is invisible to screen readers (`aria-hidden`)

---

## 2. Page Architecture & File Structure

### Current Structure

```
src/
├── app/(public)/build-your-kit/
│   └── page.tsx                    # Page wrapper (24 lines)
└── components/features/build-your-kit/
    └── kit-wizard.tsx              # Main wizard component (240 lines)
```

### Page Wrapper (`page.tsx`)

```tsx
// Line 10-13: Dynamic import with ssr: false
const KitWizard = dynamic(
  () =>
    import('@/components/features/build-your-kit/kit-wizard').then((m) => ({
      default: m.KitWizard,
    })),
  { ssr: false, loading: () => <div className="min-h-[400px] ...">جاري التحميل...</div> }
)
```

**Issues identified:**

| #   | Issue                                                                                                                                                              | Severity |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 2.1 | `ssr: false` is unnecessary — the component has no browser-only top-level APIs (`window`, `document`). It only uses `fetch` inside `useEffect`, which is SSR-safe. | Low      |
| 2.2 | Loading fallback uses hardcoded Arabic text `"جاري التحميل..."` instead of `t('common.loading')` — language is not yet available in the dynamic loading callback.  | Medium   |
| 2.3 | No `<title>` or metadata export for SEO (`export const metadata = { ... }`). The page inherits the generic site title.                                             | Low      |
| 2.4 | Page layout uses `className="container py-8 px-4"` but other public pages use `<PublicContainer>` (`max-w-public-container px-4 sm:px-6 lg:px-8`).                 | Medium   |

### Wizard Component (`kit-wizard.tsx`)

- **240 lines**, single component, no sub-components extracted
- All 4 steps rendered in one function with conditional `{step === N && ...}` blocks
- State managed via 7 `useState` hooks — no external store
- Two `useEffect` hooks for API data fetching — no caching layer

---

## 3. Visual Design Audit

### 3.1 Progress Indicator

**Current implementation (lines 96–106):**

```tsx
<div className="flex gap-2">
  {Array.from({ length: STEPS }).map((_, i) => (
    <div
      key={i}
      className={`h-2 flex-1 rounded ${i + 1 <= step ? 'bg-primary' : 'bg-muted'}`}
      aria-hidden
    />
  ))}
</div>
```

**Problems:**

- 4 thin colored bars with no labels, no step numbers, no icons
- Uses `bg-primary` / `bg-muted` instead of `bg-brand-primary` / `bg-surface-light`
- `aria-hidden` means completely invisible to screen readers
- Not clickable — users cannot navigate back to a completed step by clicking
- No step names shown — user doesn't know what step 3 or 4 is ahead of time

**Platform standard** — the existing `<Stepper>` component at `src/components/ui/stepper.tsx`:

- Numbered circles with check marks for completed steps
- Text labels below each step
- `aria-label`, `aria-current="step"` for accessibility
- Clickable completed steps via `onStepClick`
- Uses `border-brand-primary`, `bg-brand-primary`, `text-brand-primary`, `ring-2 ring-brand-primary`

### 3.2 Category Selection (Step 1)

**Current:** Plain `<Button variant="outline">` elements in a `grid grid-cols-2 gap-2`.

**Problems:**

- No category images or icons — just text buttons
- No equipment count per category (available in API: `_count.equipment`)
- No description shown (available in API: `description`)
- 2-column grid doesn't scale for mobile (too cramped) or desktop (too small)
- Selected state is just `variant="default"` vs `variant="outline"` — subtle difference

**Platform standard** — Equipment catalog category cards use:

- `rounded-2xl border border-border-light/60 shadow-card` for cards
- Category images/icons with hover effects
- Equipment counts displayed per category
- Responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`

### 3.3 Equipment Selection (Step 2)

**Current (lines 136–181):**

```tsx
<div className="max-h-96 space-y-2 overflow-y-auto">
  {equipment.map((eq) => (
    <div className="flex items-center justify-between rounded border p-3">
      <p className="font-medium">{eq.model ?? eq.sku}</p>
      <p className="text-sm text-muted-foreground">
        {eq.dailyPrice.toLocaleString()} SAR / {t('common.pricePerDay')}
      </p>
      {/* quantity input or add button */}
    </div>
  ))}
</div>
```

**Problems:**

| #     | Issue                   | Detail                                                                                                              |
| ----- | ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 3.3.1 | No equipment images     | Cards show text only; the platform's `EquipmentCard` shows `aspect-[4/3]` images with hover zoom                    |
| 3.3.2 | No brand name           | The equipment API returns brand data but it's not displayed                                                         |
| 3.3.3 | No availability badge   | `AvailabilityBadge` component exists but is not used                                                                |
| 3.3.4 | No condition indicator  | Equipment condition (new, good, fair) is not shown                                                                  |
| 3.3.5 | Unstyled quantity input | Raw `<input type="number" className="w-14 rounded border px-2 py-1 text-sm">` vs the platform's `<Input>` component |
| 3.3.6 | Generic card styling    | `rounded border p-3` vs platform standard `rounded-2xl border-border-light/60 shadow-card`                          |
| 3.3.7 | `max-h-96` hard limit   | The scrollable list is capped at 384px. No indicator that more items exist below the fold                           |
| 3.3.8 | No search or filter     | For categories with many items, there's no way to search                                                            |
| 3.3.9 | `take=50` hard limit    | Only 50 items shown. No pagination or "load more"                                                                   |

### 3.4 Duration Selection (Step 3)

**Current (lines 194–213):**

```tsx
<h2 className="text-lg font-semibold">Rental duration (days)</h2>
<input
  type="number"
  min={1}
  max={365}
  value={durationDays}
  onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 1)}
  className="w-full rounded border px-3 py-2"
/>
```

**Problems:**

- Raw HTML `<input>` instead of Shadcn `<Input>` component
- No visual feedback for valid/invalid ranges
- No helper text explaining min/max (e.g., "1–365 days")
- No date picker option — the user enters an abstract number of days with no start/end dates
- No price preview updating as days change
- Could offer quick-pick buttons (1 day, 3 days, 7 days, 30 days) for common durations

### 3.5 Summary (Step 4)

**Current (lines 216–236):**

```tsx
<h2 className="text-lg font-semibold">Summary</h2>
<p className="text-muted-foreground">
  {selectedEquipment.length} item(s) × {durationDays} days
</p>
<p className="text-xl font-semibold">
  Total: {total.toLocaleString()} SAR
</p>
```

**Problems:**

- No per-item breakdown — just total count and total price
- No item names, no individual prices, no quantity per item
- No way to edit quantities from the summary
- No way to remove individual items from the summary
- No subtotal / VAT / deposit breakdown (platform standard in `OrderSummary`)
- No visual formatting matching the checkout `OrderSummary` component

### 3.6 Overall Spacing & Layout

| Aspect             | Kit Wizard            | Platform Standard                                         |
| ------------------ | --------------------- | --------------------------------------------------------- |
| Max width          | `max-w-2xl` (672px)   | `max-w-public-container` (1320px) or `max-w-6xl` (1152px) |
| Container padding  | `container py-8 px-4` | `<PublicContainer>` with `px-4 sm:px-6 lg:px-8`           |
| Card border radius | `rounded`             | `rounded-2xl`                                             |
| Card shadow        | none                  | `shadow-card`                                             |
| Card border        | `border`              | `border border-border-light/60`                           |
| Section spacing    | `space-y-4`           | `space-y-8` or `space-y-10`                               |

---

## 4. User Experience Flow Audit

### 4.1 Step Flow Diagram

```
[Step 1: Category]  →  [Step 2: Equipment]  →  [Step 3: Duration]  →  [Step 4: Summary]  →  /cart?params
       ↑                       ↑                       ↑                      ↑
       │                       │                       │                      │
  No intro/context       No loading state         No date picker       No item breakdown
  No images              No empty state            No price preview     No edit capability
  No equipment count     No search/filter          No quick-picks       Cart doesn't parse params
```

### 4.2 Flow Issues

| #     | Issue                               | Severity | Detail                                                                                                                                                                                                                |
| ----- | ----------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.2.1 | **No introductory context**         | Medium   | The user lands on the page with just "ابنِ كيتك" (Build Your Kit) and immediately sees the wizard. No explanation of what this feature does, who it's for, or what the steps are.                                     |
| 4.2.2 | **Single-category limitation**      | High     | Users can only select equipment from ONE category. For a "build your kit" feature, users should be able to combine cameras + lenses + lighting + audio. This defeats the purpose of building a custom kit.            |
| 4.2.3 | **State loss on back-navigation**   | Medium   | Going from Step 2 back to Step 1 and changing the category triggers a re-fetch (line 44–60), but `selectedEquipment` still holds IDs from the old category. These orphaned selections would produce incorrect totals. |
| 4.2.4 | **No browser back/forward support** | Medium   | Step changes don't update the URL. If the user presses the browser back button, they leave the page entirely instead of going to the previous step.                                                                   |
| 4.2.5 | **No state persistence**            | Low      | Accidental page refresh loses all progress. The checkout uses `useCheckoutStore` (Zustand with persist) to retain state.                                                                                              |
| 4.2.6 | **No success feedback**             | Medium   | After clicking "Add to Cart" on the summary, the user is redirected to `/cart?kitCustom=1&items=...`. No toast, no animation, no "Kit added!" confirmation.                                                           |
| 4.2.7 | **No way to restart**               | Low      | Once in the wizard, there's no "Start over" or "Clear all" button.                                                                                                                                                    |

### 4.3 Missing UX Patterns (vs. Platform)

| Pattern                                  | Used in Checkout/Catalog?   | Used in Kit Wizard? |
| ---------------------------------------- | --------------------------- | ------------------- |
| Step labels visible at all times         | Yes (Stepper)               | No                  |
| Sticky order summary sidebar             | Yes (OrderSummary)          | No                  |
| Loading skeletons                        | Yes (EquipmentCardSkeleton) | No                  |
| Error state with retry                   | Yes (catalog error)         | No                  |
| Empty state with icon + CTA              | Yes (catalog no results)    | No                  |
| Breadcrumbs                              | Yes (equipment page)        | No                  |
| Price formatting via `Intl.NumberFormat` | Yes (`formatSar()`)         | No                  |
| Hold timer / urgency                     | Yes (checkout)              | No                  |

---

## 5. Localization & RTL Audit

### 5.1 Hardcoded English Strings

The following strings are hardcoded in English within `kit-wizard.tsx`. The platform is Arabic-first with RTL layout.

| Line | Hardcoded String           | Should Be                   |
| ---- | -------------------------- | --------------------------- |
| 110  | `"Choose category"`        | `t('kit.chooseCategory')`   |
| 135  | `"Choose equipment"`       | `t('kit.chooseEquipment')`  |
| 165  | `"Remove"`                 | `t('common.remove')`        |
| 196  | `"Rental duration (days)"` | `t('kit.rentalDuration')`   |
| 218  | `"Summary"`                | `t('kit.summary')`          |
| 220  | `"item(s)"`                | `t('kit.items', { count })` |
| 220  | `"days"`                   | `t('kit.days', { count })`  |
| 222  | `"Total:"`                 | `t('kit.total')`            |
| 222  | `"SAR"`                    | Handled via `formatSar()`   |
| 147  | `"SAR"` in price display   | Handled via `formatSar()`   |

**Count of untranslated strings: 19** (including label text, button text, summary text, currency labels, and pluralization).

### 5.2 Missing Translation Keys

The `src/messages/en.json` and `src/messages/ar.json` files have no `kit` section at all. The following keys need to be added:

```json
{
  "kit": {
    "title": "Build Your Kit",
    "subtitle": "Select equipment from different categories to build your custom rental kit",
    "chooseCategory": "Choose a category",
    "chooseEquipment": "Choose equipment",
    "rentalDuration": "Rental duration",
    "durationDays": "{count} day(s)",
    "summary": "Kit Summary",
    "items": "{count} item(s)",
    "total": "Total",
    "dailySubtotal": "Daily subtotal",
    "remove": "Remove",
    "addMore": "Add more equipment",
    "noCategories": "No categories available",
    "noEquipment": "No equipment in this category",
    "startOver": "Start over",
    "perDay": "per day"
  }
}
```

### 5.3 Price Formatting

| Location     | Current                                   | Platform Standard                                                                                     |
| ------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Step 2 price | `eq.dailyPrice.toLocaleString() + " SAR"` | `formatSar(eq.dailyPrice)` using `Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' })` |
| Step 4 total | `total.toLocaleString() + " SAR"`         | `formatSar(total)`                                                                                    |

### 5.4 RTL Layout Considerations

- The `flex gap-2` progress bar works in RTL (flexbox auto-reverses)
- The Back/Next button order (`flex gap-2` with Back first, Next second) displays correctly in RTL (Back appears on the right, Next on the left — but this is counterintuitive in RTL where "forward" is left-to-right logically reversed)
- The equipment list `flex items-center justify-between` works in RTL
- No use of `ms-*` / `me-*` (margin-start/end) logical properties — uses `px-*` which is safe

---

## 6. Accessibility (a11y) Audit

### 6.1 WCAG 2.1 Violations

| #     | WCAG Rule                        | Severity | Detail                                                                                                                                           |
| ----- | -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 6.1.1 | **1.3.1 Info and Relationships** | Critical | Progress indicator is `aria-hidden`, meaning screen readers cannot determine which step the user is on or how many steps exist.                  |
| 6.1.2 | **1.3.1 Info and Relationships** | High     | Quantity `<input type="number">` has no `<label>` element or `aria-label`. Screen readers announce "spinbutton" with no context.                 |
| 6.1.3 | **2.4.3 Focus Order**            | High     | When advancing between steps, focus remains on the clicked button (which is then removed from DOM). Focus should move to the new step's heading. |
| 6.1.4 | **4.1.3 Status Messages**        | Medium   | Step transitions produce no `aria-live` announcement. Screen readers don't know the content has changed.                                         |
| 6.1.5 | **2.4.6 Headings and Labels**    | Medium   | Step headings are `<h2>` but use hardcoded English, making them useless for Arabic screen reader users.                                          |
| 6.1.6 | **1.1.1 Non-text Content**       | Low      | "Remove" button has no `aria-label` indicating which item it removes. Should be `aria-label="Remove [item name]"`.                               |
| 6.1.7 | **1.3.5 Identify Input Purpose** | Low      | Duration input has no `aria-describedby` for its constraints (min 1, max 365).                                                                   |
| 6.1.8 | **2.1.1 Keyboard**               | Low      | All interactive elements are keyboard-accessible (buttons, inputs), but focus management between steps is poor.                                  |

### 6.2 Recommended ARIA Structure

```tsx
// Progress indicator should use:
<nav aria-label="Kit builder progress">
  <ol>
    <li aria-current="step" aria-label="Step 1: Choose category, current step">
      ...
    </li>
  </ol>
</nav>

// Step content should use:
<section aria-labelledby="step-heading" aria-live="polite">
  <h2 id="step-heading">{t('kit.chooseCategory')}</h2>
  ...
</section>

// Quantity input:
<label htmlFor={`qty-${eq.id}`} className="sr-only">
  Quantity for {eq.model}
</label>
<input id={`qty-${eq.id}`} ... />

// Remove button:
<Button aria-label={`Remove ${eq.model}`}>Remove</Button>
```

---

## 7. Error Handling & Edge Cases

### 7.1 API Error Handling

**Categories fetch (lines 37–42):**

```tsx
useEffect(() => {
  fetch('/api/public/categories')
    .then((r) => r.json())
    .then((res) => setCategories(Array.isArray(res?.data) ? res.data : []))
    .finally(() => setLoading(false))
}, [])
```

| Scenario                       | Current Behavior                                                               | Expected Behavior                                               |
| ------------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Network failure (offline)      | `fetch` rejects → unhandled promise → `loading` stays `true` forever           | Show error state with retry button                              |
| API returns 500                | `r.json()` may fail or return error body → categories set to `[]` → empty grid | Show error state: `"Something went wrong. Please try again."`   |
| API returns 429 (rate limited) | Same as 500                                                                    | Show "Too many requests, please wait"                           |
| API returns empty `[]`         | Empty grid with disabled "Next" button — no explanation                        | Show: icon + "No categories available" + link to equipment page |

**Equipment fetch (lines 44–60):**

```tsx
useEffect(() => {
  if (!selectedCategoryId) { setEquipment([]); return }
  fetch(`/api/public/equipment?categoryId=${selectedCategoryId}&take=50`)
    .then((r) => r.json())
    .then((res) => { ... })
}, [selectedCategoryId])
```

| Scenario                 | Current Behavior                               | Expected Behavior                     |
| ------------------------ | ---------------------------------------------- | ------------------------------------- |
| Network failure          | Unhandled rejection → old equipment list stays | Show error with retry                 |
| Category has 0 equipment | Empty scroll area, "Next" disabled, no message | Show: "No equipment in this category" |
| Category has >50 items   | Silently truncated at 50                       | Pagination or "Load more"             |
| No `.catch()` handler    | Exception silently swallowed                   | Catch and display error UI            |

### 7.2 Edge Cases Not Handled

| #     | Edge Case                                                                                  | Impact                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------ | --- | ------------------------------ |
| 7.2.1 | User selects equipment, goes back, changes category — old selections remain with stale IDs | Incorrect total calculation, broken cart params                                                                        |
| 7.2.2 | User enters `0` in duration input                                                          | `durationDays` becomes `0`, total becomes `0` — `canNextStep3` still passes since `0 >= 1` is false but `parseInt("0") |     | 1`yields`1`via the`            |     | 1` fallback, masking the issue |
| 7.2.3 | User enters `999` in duration (above max=365)                                              | HTML `max` attribute prevents via spinner but manual typing allows it — no Zod/JS validation                           |
| 7.2.4 | User enters non-numeric text in duration                                                   | `parseInt("abc")                                                                                                       |     | 1`returns`1` — silently resets |
| 7.2.5 | Equipment `dailyPrice` is `null`                                                           | `e.dailyPrice ?? 0` handles it, but displays `0 SAR` with no indication it's unavailable for rent                      |
| 7.2.6 | Very long item names                                                                       | No text truncation → layout breaks on small screens                                                                    |

---

## 8. Performance Audit

### 8.1 Dynamic Import

```tsx
const KitWizard = dynamic(
  () => import('@/components/features/build-your-kit/kit-wizard').then((m) => ({ default: m.KitWizard })),
  { ssr: false, loading: () => <div ...>جاري التحميل...</div> }
)
```

- **Component size:** ~240 lines, minimal imports (`useState`, `useEffect`, `Link`, `Button`, `useLocale`)
- **Assessment:** Dynamic import adds a loading flash for minimal benefit. The component is lightweight. `ssr: false` forces client-only rendering unnecessarily.
- **Recommendation:** Remove `dynamic()` wrapper and import directly, or at minimum remove `ssr: false`.

### 8.2 Data Fetching

| Concern                      | Detail                                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| No caching                   | Equipment is re-fetched every time category changes. Should use TanStack Query (already installed) with `queryKey: ['public-equipment', categoryId]`. |
| No deduplication             | If user rapidly clicks categories, multiple parallel fetches fire with no cancellation of stale requests.                                             |
| O(n\*m) in total calculation | `totalDaily` uses `.find()` inside `.reduce()` (line 84–87). Fine for <50 items but should use a `Map` for larger datasets.                           |
| No API response streaming    | Full equipment list loaded at once (up to 50 items). Consider virtual scrolling for larger lists.                                                     |

### 8.3 Bundle Impact

- Imports: `useState`, `useEffect`, `Link`, `useLocale`, `Button` — all lightweight
- No heavy dependencies pulled in
- No unnecessary re-renders detected (state updates are targeted)

---

## 9. Code Quality & Architecture

### 9.1 Component Structure

**Current:** Single 240-line monolithic component with all 4 steps inline.

**Recommended structure:**

```
src/components/features/build-your-kit/
├── kit-wizard.tsx                 # Main orchestrator
├── kit-step-category.tsx          # Step 1: Category selection
├── kit-step-equipment.tsx         # Step 2: Equipment selection
├── kit-step-duration.tsx          # Step 3: Duration input
├── kit-step-summary.tsx           # Step 4: Summary + add to cart
├── kit-equipment-item.tsx         # Individual equipment row
└── use-kit-wizard.ts              # Custom hook for wizard state
```

### 9.2 State Management

**Current:** 7 `useState` hooks in one component.

```tsx
const [step, setStep] = useState(1)
const [categories, setCategories] = useState<Category[]>([])
const [equipment, setEquipment] = useState<EquipmentItem[]>([])
const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
const [selectedEquipment, setSelectedEquipment] = useState<{ id: string; qty: number }[]>([])
const [durationDays, setDurationDays] = useState(1)
const [loading, setLoading] = useState(true)
```

**Recommended:** Zustand store (matching `useCheckoutStore` pattern) for:

- State persistence across page refreshes
- URL sync for back/forward navigation
- Separation of concerns

### 9.3 Missing Patterns

| Pattern                                    | Required by `.cursorrules`?               | Implemented?                          |
| ------------------------------------------ | ----------------------------------------- | ------------------------------------- |
| Zod validation schema                      | Yes ("Validator Layer MANDATORY")         | No                                    |
| Error handling with custom errors          | Yes ("Error Handling")                    | No                                    |
| JSDoc comments on component                | Yes ("Component Documentation MANDATORY") | Minimal — 1-line comment              |
| Named exports at end                       | Yes ("Named exports at end")              | Yes — `export function KitWizard`     |
| `useLocale()` for all text                 | Yes (implied by i18n)                     | Partial — only 5 of 24 strings        |
| `<Input>` from Shadcn UI                   | Yes ("Shadcn UI Integration")             | No — raw `<input>`                    |
| TanStack Query for server state            | Yes ("TanStack Query for Server State")   | No — raw `fetch`                      |
| Event handlers with `handle` prefix        | Yes ("handle + Action")                   | No — uses `toggleEquipment`, `setQty` |
| Boolean variables with `is/has/can` prefix | Yes ("is/has/can/should prefix")          | Partial — `canNextStep1` etc.         |

---

## 10. Platform Consistency Comparison

### 10.1 Side-by-Side Token Usage

| CSS Property        | Kit Wizard (Current)           | Platform Standard                   | Match? |
| ------------------- | ------------------------------ | ----------------------------------- | ------ |
| Card border radius  | `rounded`                      | `rounded-2xl`                       | No     |
| Card shadow         | (none)                         | `shadow-card`                       | No     |
| Card border         | `border`                       | `border border-border-light/60`     | No     |
| Primary color       | `bg-primary`                   | `bg-brand-primary`                  | No     |
| Muted background    | `bg-muted`                     | `bg-surface-light`                  | No     |
| Text heading        | `font-semibold`                | `text-card-title text-text-heading` | No     |
| Text muted          | `text-muted-foreground`        | `text-text-muted`                   | Close  |
| Price display       | `text-xl font-semibold`        | `text-price-tag text-brand-primary` | No     |
| Input styling       | `rounded border px-3 py-2`     | `<Input>` component                 | No     |
| Container width     | `max-w-2xl` (672px)            | `max-w-public-container` (1320px)   | No     |
| Container component | `<main className="container">` | `<PublicContainer>`                 | No     |
| Section spacing     | `space-y-4`                    | `space-y-8` / `space-y-10`          | No     |

### 10.2 Component Reuse

| Available Component                       | Used in Kit Wizard?          | Where It's Used Elsewhere     |
| ----------------------------------------- | ---------------------------- | ----------------------------- |
| `<Stepper>`                               | No — custom progress bar     | Checkout page                 |
| `<Input>`                                 | No — raw `<input>`           | All forms across platform     |
| `<Skeleton>`                              | No — plain text loading      | Equipment catalog             |
| `<AvailabilityBadge>`                     | No                           | Equipment cards               |
| `<SaveEquipmentButton>`                   | No                           | Equipment cards               |
| `<PublicContainer>`                       | No — uses `container`        | All public pages              |
| `EquipmentCard` / `EquipmentCardSkeleton` | No — custom text rows        | Equipment catalog, search     |
| `OrderSummary`                            | No                           | Checkout page                 |
| `<DateRangePicker>`                       | No                           | Filter panel, checkout        |
| `formatSar()`                             | No — inline `toLocaleString` | Order summary, price displays |

---

## 11. Cart Integration Gap Analysis

### 11.1 Current Flow

```
Kit Wizard (Step 4) → navigates to:
  /cart?kitCustom=1&items=id1:qty1,id2:qty2&days=7
```

### 11.2 Cart Page Analysis

The cart page at `src/app/(public)/cart/page.tsx`:

- Renders `<CartList>` component only
- **Does NOT use `useSearchParams()`**
- **Does NOT read `kitCustom`, `items`, or `days` query parameters**
- **Does NOT call `addItem()` on the cart store based on URL params**

### 11.3 Cart Store Analysis

The cart store at `src/lib/stores/cart.store.ts`:

- `addItem()` sends `POST /api/cart` with `{ itemType, equipmentId, startDate, endDate, quantity, dailyRate }`
- **No handling of `kitCustom` flag**
- **No URL parameter parsing**
- Kit items would need `startDate` and `endDate` but the wizard only collects `durationDays` (no actual dates)

### 11.4 Impact

**The "Add to Cart" button on the summary page does nothing useful.** The user is redirected to the cart page, but the kit items are never added to the cart. The cart shows whatever was previously in it (or empty). This is a **complete feature break**.

### 11.5 Required Fix

Either:

1. **Option A:** The kit wizard should call `addItem()` for each selected equipment before navigating to cart, OR
2. **Option B:** The cart page should parse URL params and auto-add items on mount, OR
3. **Option C:** Create a dedicated `/api/cart/add-kit` endpoint that accepts the kit configuration

---

## 12. Prioritized Recommendations

### P0 — Critical (Must Fix Before Launch)

| #    | Issue                                                                                      | Effort | Files                                             |
| ---- | ------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------- |
| P0-1 | **Fix cart integration** — kit items are never added to cart                               | Medium | `kit-wizard.tsx`, `cart.store.ts`                 |
| P0-2 | **Add error handling** for both API calls (categories + equipment) with error UI and retry | Small  | `kit-wizard.tsx`                                  |
| P0-3 | **Add empty states** for no categories and no equipment in category                        | Small  | `kit-wizard.tsx`                                  |
| P0-4 | **Translate all 19 hardcoded English strings** and add `kit` section to all 3 locale files | Small  | `kit-wizard.tsx`, `en.json`, `ar.json`, `zh.json` |
| P0-5 | **Clean up orphaned selections** when category changes in step 1                           | Small  | `kit-wizard.tsx`                                  |

### P1 — High Priority (Should Fix)

| #    | Issue                                                                                                      | Effort | Files                           |
| ---- | ---------------------------------------------------------------------------------------------------------- | ------ | ------------------------------- |
| P1-1 | **Replace progress bar** with existing `<Stepper>` component                                               | Small  | `kit-wizard.tsx`                |
| P1-2 | **Use Shadcn `<Input>`** for all form inputs                                                               | Small  | `kit-wizard.tsx`                |
| P1-3 | **Apply platform design tokens** (`rounded-2xl`, `shadow-card`, `border-border-light/60`, `brand-primary`) | Medium | `kit-wizard.tsx`                |
| P1-4 | **Add equipment thumbnails/images** to step 2 items                                                        | Medium | `kit-wizard.tsx`, equipment API |
| P1-5 | **Expand summary** with per-item breakdown, names, prices, editable quantities                             | Medium | `kit-wizard.tsx`                |
| P1-6 | **Add loading skeletons** when equipment is fetching after category change                                 | Small  | `kit-wizard.tsx`                |
| P1-7 | **Use `formatSar()`** for all price displays                                                               | Small  | `kit-wizard.tsx`                |
| P1-8 | **Use `<PublicContainer>`** instead of raw `container` class                                               | Small  | `page.tsx`                      |
| P1-9 | **Add focus management** — move focus to step heading on step change                                       | Small  | `kit-wizard.tsx`                |

### P2 — Medium Priority (Nice to Have)

| #     | Issue                                                                                    | Effort | Files                        |
| ----- | ---------------------------------------------------------------------------------------- | ------ | ---------------------------- |
| P2-1  | **Support multi-category selection** (mix cameras + lenses + lighting)                   | Large  | `kit-wizard.tsx`             |
| P2-2  | **Add search/filter** in equipment selection step                                        | Medium | `kit-wizard.tsx`             |
| P2-3  | **Replace raw `fetch`** with TanStack Query for caching + dedup                          | Medium | `kit-wizard.tsx`             |
| P2-4  | **Add date picker** for actual rental dates (not just day count)                         | Medium | `kit-wizard.tsx`             |
| P2-5  | **Add sticky sidebar summary** (like checkout `OrderSummary`) visible from step 2 onward | Medium | `kit-wizard.tsx`             |
| P2-6  | **Persist wizard state** in Zustand store                                                | Medium | New: `kit-wizard.store.ts`   |
| P2-7  | **Add URL-based step navigation** for browser back/forward                               | Small  | `page.tsx`, `kit-wizard.tsx` |
| P2-8  | **Remove unnecessary `dynamic()`** / `ssr: false` wrapper                                | Small  | `page.tsx`                   |
| P2-9  | **Add ARIA live regions** for step transitions                                           | Small  | `kit-wizard.tsx`             |
| P2-10 | **Add quick-pick duration buttons** (1, 3, 7, 30 days)                                   | Small  | `kit-wizard.tsx`             |
| P2-11 | **Add page metadata** for SEO                                                            | Small  | `page.tsx`                   |
| P2-12 | **Extract sub-components** per step for maintainability                                  | Medium | New files                    |

### P3 — Low Priority (Future Enhancement)

| #    | Issue                                           | Effort |
| ---- | ----------------------------------------------- | ------ |
| P3-1 | Add Zod validation schema for wizard data       |
| P3-2 | Add virtual scrolling for large equipment lists |
| P3-3 | Add "Save kit as template" for logged-in users  |
| P3-4 | Add price comparison with pre-built kits        |
| P3-5 | Add recommended kits based on project type      |

---

## Appendix: Platform Design Token Reference

### Colors

| Token                 | Value     | Usage                                 |
| --------------------- | --------- | ------------------------------------- |
| `brand-primary`       | `#C92C37` | Primary actions, links, active states |
| `brand-primary-hover` | `#A8242D` | Hover state for primary               |
| `brand-primary-light` | `#FEF2F2` | Light background for primary areas    |
| `surface-light`       | `#F9F9F9` | Card backgrounds, section backgrounds |
| `text-heading`        | `#111827` | Headings, important text              |
| `text-body`           | `#4B5563` | Body text                             |
| `text-muted`          | `#9CA3AF` | Secondary text, labels                |
| `border-light`        | `#E5E7EB` | Card borders, dividers                |

### Border Radius

| Token           | Value     | Usage                 |
| --------------- | --------- | --------------------- |
| `rounded-2xl`   | `1rem`    | Cards, dialogs        |
| `rounded-xl`    | `0.75rem` | Buttons, inputs       |
| `rounded-full`  | `9999px`  | Avatars, badges       |
| `public-card`   | `12px`    | Public-facing cards   |
| `public-button` | `8px`     | Public-facing buttons |
| `pill`          | `50px`    | Pills, tags           |

### Shadows

| Token               | Value                                                                 | Usage                  |
| ------------------- | --------------------------------------------------------------------- | ---------------------- |
| `shadow-card`       | `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)`         | Default card elevation |
| `shadow-card-hover` | `0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)` | Card hover state       |

### Typography

| Token                | Usage                 |
| -------------------- | --------------------- |
| `text-hero-title`    | Hero sections         |
| `text-section-title` | Page section headings |
| `text-card-title`    | Card headings         |
| `text-body-main`     | Body copy             |
| `text-label-small`   | Labels, metadata      |
| `text-price-tag`     | Price displays        |

### Component Patterns

```tsx
// Standard card wrapper
className="rounded-2xl border border-border-light/60 bg-white shadow-card"

// Standard error state
<div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-destructive text-sm">
  {error}
  <Button variant="link" className="ms-2 text-destructive" onClick={retry}>
    {t('common.retry')}
  </Button>
</div>

// Standard empty state
<div className="text-center py-16 text-muted-foreground">
  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-light">
    <span className="text-3xl">🔍</span>
  </div>
  <p className="text-lg font-medium text-text-heading">{t('common.noResults')}</p>
  <p className="mt-1 text-sm text-text-muted">Description</p>
  <Button variant="outline" asChild className="mt-4 rounded-xl border-brand-primary/20 text-brand-primary">
    <Link href="/equipment">{t('common.viewAll')}</Link>
  </Button>
</div>

// Standard price formatting
function formatSar(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}
```

---

_End of audit report._
