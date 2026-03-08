# Studio Page – Full Audit Report

> **Date:** February 2025  
> **Scope:** Public studio pages (`/studios`, `/studios/[slug]`), APIs, CMS, cart/checkout flow, components, services

---

## 1. Architecture Overview

### 1.1 Public Routes

| Route             | Type   | Data Source                     | Feature Flag     |
| ----------------- | ------ | ------------------------------- | ---------------- |
| `/studios`        | Server | `prisma.studio.findMany` direct | `enable_studios` |
| `/studios/[slug]` | Server | `StudioService.getBySlugPublic` | `enable_studios` |

### 1.2 APIs

| Endpoint                                       | Auth     | Purpose                            |
| ---------------------------------------------- | -------- | ---------------------------------- |
| `GET /api/public/studios`                      | None     | List studios (cached)              |
| `GET /api/public/studios/[slug]`               | None     | Single studio by slug (cached)     |
| `POST /api/public/studios/[slug]/availability` | None     | Available time slots for date      |
| `POST /api/cart/add-studio`                    | Optional | Add studio to cart from URL params |
| `GET/PUT /api/admin/studios/*`                 | Admin    | CMS CRUD                           |

### 1.3 Components

- **List:** `StudiosListClient` → `StudioCard`
- **Detail:** `StudioDetail` → `StudioHeader`, `StudioGallery`, `StudioLocation`, `StudioBookingPanel`, `StudioWhatsIncluded`, `StudioRules`, `StudioTrust`, `StudioFaq`
- **Booking:** `StudioSlotPicker`, `StudioBookingPanel` (sticky on desktop)

---

## 2. Critical Issues

### 2.1 Studio-Only Checkout Not Supported

**Location:** `src/app/api/checkout/create-session/route.ts`

**Issue:** The checkout flow requires at least one equipment or kit. Studio-only carts are rejected:

```typescript
if (!equipment.length) {
  return NextResponse.json(
    { error: 'Cart must contain at least one equipment or kit' },
    { status: 400 }
  )
}
```

**Impact:** Users who add only a studio to the cart cannot proceed to payment. The "Add to cart" CTA on the studio page redirects to `/cart?studio=...&date=...` but checkout will fail for studio-only carts.

**Recommendation:** Extend checkout to support studio-only bookings. Pass `studioId`, `studioStartTime`, `studioEndTime` from cart items to `BookingService.create`.

---

### 2.2 Availability API Uses Wrong Booking Fields

**Location:** `src/app/api/public/studios/[slug]/availability/route.ts` (lines 53–62)

**Issue:** The API filters bookings by `startDate` and `endDate`:

```typescript
const bookings = await prisma.booking.findMany({
  where: {
    studioId: studio.id,
    status: { in: ['CONFIRMED', 'ACTIVE'] },
    startDate: { lt: dayEnd },
    endDate: { gt: dayStart },
    deletedAt: null,
  },
  ...
})
```

**Problem:** For studio bookings, the actual slot is stored in `studioStartTime` and `studioEndTime`. The `StudioService.checkAvailability` correctly uses these fields. The public availability API should use `studioStartTime`/`studioEndTime` when present, or `startDate`/`endDate` as fallback.

**Recommendation:** Use `OR` condition:

```typescript
OR: [
  {
    studioStartTime: { not: null },
    studioEndTime: { not: null },
    studioStartTime: { lt: dayEnd },
    studioEndTime: { gt: dayStart },
  },
  {
    studioStartTime: null,
    studioEndTime: null,
    startDate: { lt: dayEnd },
    endDate: { gt: dayStart },
  },
]
```

---

### 2.3 CartStudioSync Redirects Before Showing Errors

**Location:** `src/components/features/cart/cart-studio-sync.tsx`

**Issue:** On failure, `synced.current = false` is set but the user gets no feedback. The cart page may show empty or stale state. No toast or error message.

**Recommendation:** Add toast/error UI when the add-studio request fails. Consider showing a retry option.

---

## 3. High Priority Issues

### 3.1 List Page Bypasses Cache

**Location:** `src/app/(public)/studios/page.tsx`

**Issue:** The list page uses `prisma.studio.findMany` directly instead of the cached `/api/public/studios` endpoint. Homepage `HomeStudios` uses the API. Inconsistency and no cache benefit for the list page.

**Recommendation:** Either use the public API (via fetch in a client component) or add `unstable_cache` / similar server-side caching for consistency with the API.

---

### 3.2 No Cache Invalidation for Studio Detail

**Location:** `src/lib/services/studio.service.ts` (updateCms)

**Issue:** `cacheDelete` is called for `studio:${slug}` and `studios` list when CMS is updated. But when packages, FAQs, add-ons, or blackout dates change via their own APIs, the studio detail cache may not be invalidated.

**Recommendation:** Ensure `StudioPackageService`, `StudioFaqService`, add-ons, and blackout APIs call `cacheDelete('equipmentDetail', 'studio:' + slug)` and `cacheDelete('equipmentList', 'studios')` on create/update/delete.

---

### 3.3 Slot Picker: No Same-Day Booking

**Location:** `src/components/features/studio/studio-slot-picker.tsx`

**Issue:** `minDate` is set to tomorrow. Same-day studio booking is not allowed.

**Recommendation:** Make same-day configurable (e.g. via `studio.allowSameDay` or business rules). If allowed, adjust `minDate` and ensure availability API supports today.

---

### 3.4 Package Hours vs Duration Mismatch

**Location:** `src/components/features/studio/studio-booking-panel.tsx`

**Issue:** When a package is selected (e.g. "4 hours"), the duration selector is hidden. The cart URL uses `duration` from `durationHours` state, which may still reflect the previous hourly selection. For packages, `duration` should come from `pkg.hours`, not user-selected duration.

**Current behavior:** `cartParams.set('duration', String(durationHours))` – when a package is selected, `durationHours` is not updated to `pkg.hours`. The user could have selected 2 hours, then picked a 4-hour package; the cart would receive `duration=2`.

**Recommendation:** When `selectedPackageId` is set, use `selectedPkg.hours ?? durationHours` for the duration in cart params.

---

### 3.5 Media `orderBy` Uses `sortOrder` – Schema Allows Null

**Location:** `prisma/schema.prisma` (Media model), `StudioService.getBySlugPublic`

**Issue:** `sortOrder` is optional (`Int?`). Ordering by `[{ sortOrder: 'asc' }, { createdAt: 'asc' }]` may not handle nulls consistently across DBs.

**Recommendation:** Ensure `sortOrder` has a default (e.g. 0) or use `nullsLast`/equivalent in the query.

---

## 4. Medium Priority Issues

### 4.1 Duplicate Studio Systems

**Issue:** Two admin flows exist:

- `/admin/studios` – uses `GET /api/studios` (legacy)
- `/admin/cms/studios` – uses `GET /api/admin/studios` (CMS)

The sidebar has both "الاستوديوهات" (`/admin/studios`) and "CMS > الاستوديوهات" (`/admin/cms/studios`). This can confuse admins.

**Recommendation:** Consolidate or clearly document the difference. Prefer CMS for content management.

---

### 4.2 Studio Service Uses `equipment.create` for Studio Permissions

**Location:** `src/lib/services/studio.service.ts` (lines 65, 181, 336, etc.)

**Issue:** Studio create/update/delete checks `equipment.create`, `equipment.update`, `equipment.read`, `equipment.delete`. Dedicated studio permissions exist (`studio.create`, `studio.read`, etc.) but are not used.

**Recommendation:** Use `PERMISSIONS.STUDIO_CREATE`, `STUDIO_UPDATE`, etc., for studio operations.

---

### 4.3 No Loading State on Studios List Page

**Location:** `src/app/(public)/studios/page.tsx`

**Issue:** The page is a server component. While data loads, there is no explicit loading UI. Next.js may show a blank or layout shift.

**Recommendation:** Add `loading.tsx` for the route with a skeleton.

---

### 4.4 HomeStudios API Response Shape

**Location:** `src/components/features/home/home-studios.tsx`

**Issue:** Expects `json.data` as array. The public API returns `{ data: studios }`. The list page passes `studios` directly to `StudiosListClient`. Both work but the shapes differ (list page gets from server, home fetches from API).

---

### 4.5 Missing `durationOptions` and `dailyRate` Usage

**Location:** `StudioPublicData`, `studio-booking-panel.tsx`

**Issue:** `durationOptions` (JSON: half_day, full_day, etc.) and `dailyRate` exist in the schema but are not used in the booking panel. Duration is a fixed 1–8 hour dropdown.

**Recommendation:** Support `durationOptions` when set (e.g. half-day, full-day presets) and use `dailyRate` for full-day pricing when applicable.

---

## 5. Low Priority / Suggestions

### 5.1 Sitemap

**Location:** `src/app/sitemap.ts`

**Status:** `/studios` is included. Individual studio slugs are not. Consider adding `/studios/[slug]` for SEO.

---

### 5.2 Placeholder Image

**Location:** `home-studios.tsx`, `studio-card.tsx`

**Issue:** `STUDIO_PLACEHOLDER = '/images/placeholder.jpg'` – verify this file exists. `studio-card` uses `t('studios.noImages')` when no media.

---

### 5.3 Date Input Timezone

**Issue:** Date selection uses `YYYY-MM-DD`. The availability API builds slots in local server time. For multi-region, timezone handling may be needed.

---

### 5.4 Accessibility

- `StudioSlotPicker` date input: ensure `aria-label` or associated label.
- Gallery: verify `alt` text and keyboard navigation for "View all photos".
- Booking panel: ensure form fields have proper labels (mostly done via `t()`).

---

## 6. What Works Well

- **CMS:** Full tab coverage (Basic, Gallery, Location, Booking, Packages, Add-ons, Included, Rules, Trust, Blackout, FAQ).
- **i18n:** Studio components use `t('studios.xxx')` and `t('common.xxx')`.
- **SEO:** `generateMetadata` on detail page uses `metaTitle` and `metaDescription`.
- **Rate limiting:** Public APIs use `rateLimitByTier`.
- **Caching:** List and detail use Redis/in-memory cache.
- **Permissions:** CMS routes use `cms.studio.read` and `cms.studio.update`.
- **Soft delete:** Studios and related entities use `deletedAt`.
- **Audit:** Studio service logs create/update/delete.

---

## 7. Summary Table

| Severity | Count | Top Items                                                                                       |
| -------- | ----- | ----------------------------------------------------------------------------------------------- |
| Critical | 3     | Studio-only checkout broken, availability API wrong fields, no error feedback in CartStudioSync |
| High     | 5     | List page cache, cache invalidation, same-day booking, package duration bug, sortOrder nulls    |
| Medium   | 5     | Duplicate admin systems, wrong permissions, loading state, API shape, durationOptions           |
| Low      | 4     | Sitemap slugs, placeholder, timezone, a11y                                                      |

---

## 8. Recommended Fix Order

1. **Studio-only checkout** – Allow checkout with studio items; pass `studioId`, `studioStartTime`, `studioEndTime` to `BookingService.create`.
2. **Availability API** – Use `studioStartTime`/`studioEndTime` (or fallback to `startDate`/`endDate`) for blocking.
3. **Package duration in cart** – Use `selectedPkg.hours` when a package is selected.
4. **CartStudioSync error feedback** – Add toast or inline error when add-studio fails.
5. **Cache invalidation** – Ensure packages, FAQs, add-ons, blackout APIs invalidate studio cache.
