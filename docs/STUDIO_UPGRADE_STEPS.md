# Studio Booking – Upgrade Steps (UI, UX, Content & User Flow)

> Based on [STUDIO_PAGE_FULL_AUDIT.md](./STUDIO_PAGE_FULL_AUDIT.md). All steps are **studio-specific**.

---

## Current Studio User Flow

```
Studios List → Studio Detail → Select Date → Select Slot → Duration/Package → Add-ons → Add to Cart
                                                                                    ↓
                                                              /cart?studio=...&date=...&start=...&duration=...
                                                                                    ↓
                                                              CartStudioSync (POST add-studio) → Cart Page
                                                                                    ↓
                                                              Proceed to Checkout → ❌ FAILS (studio-only not supported)
```

---

## Phase 1: Fix Critical Blockers (Must Do First)

### Step 1.1 — Enable Studio-Only Checkout

**Problem:** Checkout rejects studio-only carts with "Cart must contain at least one equipment or kit."

**Files:** `src/app/api/checkout/create-session/route.ts`, `src/lib/services/booking.service.ts`

**Actions:**

1. In `create-session`, detect studio items in cart (`itemType === 'STUDIO'`).
2. If cart has studio items (with or without equipment), pass `studioId`, `studioStartTime`, `studioEndTime` from cart item to `BookingService.create`.
3. Remove or relax the `if (!equipment.length)` guard so studio-only carts can proceed.
4. Ensure `BookingService.create` accepts and persists studio fields when `studioId` is provided.

**Success:** User with only a studio in cart can complete payment and get a confirmed booking.

---

### Step 1.2 — Fix Availability API (Wrong Booking Fields)

**Problem:** API blocks slots using `startDate`/`endDate`, but studio slots use `studioStartTime`/`studioEndTime`. Slots can appear available when they are actually booked.

**File:** `src/app/api/public/studios/[slug]/availability/route.ts`

**Actions:**

1. Change the `where` clause to use `studioStartTime`/`studioEndTime` when present.
2. Use an `OR` condition:
   - For bookings with `studioStartTime`/`studioEndTime`: filter by those fields.
   - For legacy bookings with only `startDate`/`endDate`: filter by those as fallback.

**Success:** Availability correctly excludes booked slots.

---

### Step 1.3 — Fix Package Duration in Cart URL

**Problem:** When user selects a 4-hour package, cart URL can still send `duration=2` from the previous hourly selection.

**File:** `src/components/features/studio/studio-booking-panel.tsx`

**Actions:**

1. In `cartParams`, when `selectedPackageId` is set, use `selectedPkg.hours ?? durationHours` for `duration`.
2. Ensure `duration` is always set when a package is selected (even if `pkg.hours` is null, fallback to `durationHours`).

**Code change (example):**

```typescript
const effectiveDuration = selectedPkg ? (selectedPkg.hours ?? durationHours) : durationHours
if (slot) {
  cartParams.set('start', slot.start)
  cartParams.set('duration', String(effectiveDuration))
}
```

**Success:** Cart receives correct duration for packages.

---

### Step 1.4 — Add Error Feedback for CartStudioSync

**Problem:** When add-studio fails, user gets no message. Cart may show empty or stale state.

**File:** `src/components/features/cart/cart-studio-sync.tsx`

**Actions:**

1. Add state: `error: string | null`, `isSyncing: boolean`.
2. On failure: set `error` with a user-friendly message (e.g. from API `j.error` or `t('studios.addToCartFailed')`).
3. Render an inline error banner or use toast when `error` is set.
4. Add "Retry" button that calls the add-studio API again.

**Success:** User sees clear error and can retry or choose a different slot.

---

## Phase 2: UX Improvements

### Step 2.1 — Same-Day Booking (Optional)

**Problem:** `minDate` is tomorrow. Same-day booking is disabled.

**File:** `src/components/features/studio/studio-slot-picker.tsx`

**Actions:**

1. Add `allowSameDay` to studio schema or CMS (if not exists). Otherwise use a config flag.
2. If allowed: set `minDate` to today (`new Date().toISOString().slice(0, 10)`).
3. Ensure availability API returns slots for today when requested.

**Success:** Users can book today if business allows.

---

### Step 2.2 — Improve Slot Picker UX

**File:** `src/components/features/studio/studio-slot-picker.tsx`

**Actions:**

1. Add `aria-label` to date input: `aria-label={t('studios.selectDate')}`.
2. When slots are loading: show skeleton or spinner instead of "Loading...".
3. When no slots: show "No slots available for this date. Try another date." (add `studios.noSlotsForDate`).
4. Format time in user's locale (already using `toLocaleTimeString`).

**Success:** Clearer feedback and better accessibility.

---

### Step 2.3 — Improve Booking Panel UX

**File:** `src/components/features/studio/studio-booking-panel.tsx`

**Actions:**

1. When package is selected, auto-sync duration: `useEffect` to set `durationHours` to `selectedPkg.hours` when a package is chosen.
2. When switching from package to hourly: reset duration to `studio.minHours` or last valid.
3. Add visual hierarchy: "1. Date" → "2. Time" → "3. Duration or Package" → "4. Add-ons" (optional section labels).
4. Disable "Add to cart" with tooltip when `!canAdd`: "Select date and time to continue".

**Success:** Clearer flow and fewer mistakes.

---

### Step 2.4 — Improve Cart Item Display for Studio

**Problem:** `CartItemRow` shows "Studio" + "1 × X SAR" but no date, time, or studio name.

**File:** `src/components/features/cart/cart-item-row.tsx`, `CartItem` type

**Actions:**

1. Ensure studio items include `studioName`, `startDate`, `endDate` (or equivalent) in cart item data.
2. In `CartItemRow`, when `item.itemType === 'STUDIO'`:
   - Show studio name (from `item.studioName` or fetch).
   - Show date and time slot (e.g. "Mar 15, 2025 • 10:00–14:00").
   - Show duration or package name if applicable.
3. Add "Edit" link back to studio detail page with pre-filled params (e.g. `?date=...&start=...`).

**Success:** User sees full booking details in cart.

---

### Step 2.5 — Add Loading State for Studios List

**File:** `src/app/(public)/studios/loading.tsx` (create new)

**Actions:**

1. Create `loading.tsx` with skeleton cards (e.g. 6 placeholder cards).
2. Use same grid layout as list page.

**Success:** No blank flash while studios load.

---

## Phase 3: Content & Copy

### Step 3.1 — Add Missing Studio Messages

**File:** `src/messages/en.json` (and `ar.json`, `zh.json`)

**Add keys:**

```json
{
  "studios": {
    "addToCartFailed": "Could not add studio. The slot may no longer be available.",
    "noSlotsForDate": "No slots available for this date. Try another date.",
    "addToCartSuccess": "Studio added to cart",
    "selectDateAndTime": "Select date and time to continue",
    "bookingPanelStep1": "Select date",
    "bookingPanelStep2": "Select time",
    "bookingPanelStep3": "Duration or package",
    "bookingPanelStep4": "Add-ons (optional)"
  }
}
```

**Success:** Consistent, localized copy for all states.

---

### Step 3.2 — Improve Empty State Messages

**File:** `src/messages/en.json`, `cart-list.tsx`

**Actions:**

1. When cart is empty and user came from studio URL: "Your studio booking could not be added. [Retry] or [Choose another slot]."
2. Generic empty: "Your cart is empty" + "Continue shopping" with links to Equipment and Studios.

**Success:** Context-aware empty states.

---

### Step 3.3 — Fix Hardcoded "ر.س" in Booking Panel

**File:** `src/components/features/studio/studio-booking-panel.tsx`

**Actions:**

1. Replace `ر.س` with `t('common.currency')` or `t('studios.currency')` if available.
2. Add `"currency": "SAR"` or `"currency": "ر.س"` to messages.

**Success:** Currency localized for RTL/LTR.

---

## Phase 4: UI Polish

### Step 4.1 — Studio Card Design

**File:** `src/components/features/studio/studio-card.tsx`

**Actions:**

1. Add "From X SAR/hour" label.
2. Add location/city if available.
3. Add hover state: slight scale, shadow.
4. Ensure placeholder image exists or use a neutral placeholder.

**Success:** More informative, scannable cards.

---

### Step 4.2 — Studio Detail Layout

**File:** `src/components/features/studio/studio-detail.tsx`

**Actions:**

1. Ensure booking panel is sticky on desktop (`lg:sticky lg:top-24`).
2. On mobile: booking panel below gallery, or collapsible "Book now" bar.
3. Ensure gallery has proper `alt` text and keyboard navigation for "View all photos".

**Success:** Responsive, accessible layout.

---

### Step 4.3 — Accessibility

**Files:** `studio-slot-picker.tsx`, `studio-booking-panel.tsx`, `studio-gallery.tsx`

**Actions:**

1. All form inputs: `<label>` or `aria-label`.
2. Date input: `aria-describedby` for error.
3. Slot buttons: `aria-pressed` when selected.
4. Focus: visible focus ring on all interactive elements.

**Success:** Screen reader and keyboard friendly.

---

## Phase 5: Backend & Performance

### Step 5.1 — List Page Caching

**File:** `src/app/(public)/studios/page.tsx`

**Actions:**

1. Wrap `getStudios()` call in `unstable_cache` with key `studios` and revalidate (e.g. 60).
2. Or refactor to use the public API from a client component (same as HomeStudios).

**Success:** Consistent caching, faster list page.

---

### Step 5.2 — Cache Invalidation

**Files:** Package, FAQ, Add-on, Blackout APIs

**Actions:**

1. When packages, FAQs, add-ons, or blackout dates change, call `cacheDelete('equipmentDetail', 'studio:' + slug)` and `cacheDelete('equipmentList', 'studios')` for the affected studio.

**Success:** Users see updated content after CMS changes.

---

### Step 5.3 — Support durationOptions & dailyRate

**File:** `src/components/features/studio/studio-booking-panel.tsx`

**Actions:**

1. If `studio.durationOptions` exists (JSON: half_day, full_day, etc.), show preset buttons.
2. If `studio.dailyRate` exists and user selects full-day, use daily rate instead of hourly × hours.

**Success:** More flexible pricing options.

---

## Phase 6: Checkout Flow for Studio

### Step 6.1 — Simplify Checkout Steps for Studio-Only

**File:** `src/app/(public)/checkout/page.tsx`, checkout steps

**Actions:**

1. When cart is studio-only: skip "Dates" and "Availability" steps (dates/slot already set).
2. Show: Add-ons (if any) → Review → Payment → Confirm.
3. In Review step: show studio name, date, time slot, duration, package, add-ons, total.

**Success:** Shorter checkout for studio-only (2–3 steps instead of 5).

---

### Step 6.2 — Profile Gate for Studio

**File:** Same as general checkout

**Actions:**

1. If profile incomplete: show modal "Complete your profile to continue" with link to profile.
2. After profile complete: redirect back to cart or checkout (preserve `?studio=...` params if needed).

**Success:** Less abrupt redirect.

---

## Phase 7: SEO & Discovery

### Step 7.1 — Sitemap

**File:** `src/app/sitemap.ts`

**Actions:**

1. Add `/studios/[slug]` for each active studio.

**Success:** Better indexing for studio detail pages.

---

### Step 7.2 — Structured Data

**File:** `src/app/(public)/studios/[slug]/page.tsx` or `StudioDetail`

**Actions:**

1. Add JSON-LD for `Place` or `LocalBusiness` with studio name, address, price range.

**Success:** Rich snippets in search.

---

## Summary: Priority Order

| Phase | Step    | Focus                  | Files                                   |
| ----- | ------- | ---------------------- | --------------------------------------- |
| 1     | 1.1     | Studio-only checkout   | create-session, booking.service         |
| 1     | 1.2     | Availability API       | availability/route.ts                   |
| 1     | 1.3     | Package duration       | studio-booking-panel.tsx                |
| 1     | 1.4     | CartStudioSync errors  | cart-studio-sync.tsx                    |
| 2     | 2.1     | Same-day booking       | studio-slot-picker.tsx                  |
| 2     | 2.2     | Slot picker UX         | studio-slot-picker.tsx                  |
| 2     | 2.3     | Booking panel UX       | studio-booking-panel.tsx                |
| 2     | 2.4     | Cart item display      | cart-item-row.tsx                       |
| 2     | 2.5     | Loading state          | studios/loading.tsx                     |
| 3     | 3.1–3.3 | Content & copy         | messages/\*.json, studio-booking-panel  |
| 4     | 4.1–4.3 | UI & a11y              | studio-card, studio-detail, slot picker |
| 5     | 5.1–5.3 | Cache, durationOptions | studios page, studio.service, APIs      |
| 6     | 6.1–6.2 | Checkout for studio    | checkout page, steps                    |
| 7     | 7.1–7.2 | SEO                    | sitemap, structured data                |

---

## Quick Wins (Do First)

1. **Step 1.3** — Package duration fix (5 min)
2. **Step 1.4** — CartStudioSync error feedback (15 min)
3. **Step 2.5** — Loading skeleton (10 min)
4. **Step 3.3** — Localize currency (5 min)

**Critical path (unblocks booking):**

1. **Step 1.1** — Studio-only checkout
2. **Step 1.2** — Availability API

---

_Reference: [STUDIO_PAGE_FULL_AUDIT.md](./STUDIO_PAGE_FULL_AUDIT.md) for full details._
