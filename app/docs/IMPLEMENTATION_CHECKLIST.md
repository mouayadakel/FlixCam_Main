# Implementation Checklist — Spec vs Current Codebase

**Purpose:** Map `docs/IMPLEMENTATION_SPEC.md` to the FlixCam codebase. Use this to implement routes, sidebars, checkout steps, and feature toggles.

---

## 1) Route Map Alignment

### Public routes

| Spec Route              | Current Route                          | Action                                                                                                                 |
| ----------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `/`                     | `(public)/page.tsx`                    | ✅ Exists                                                                                                              |
| `/categories`           | —                                      | **Add** `(public)/categories/page.tsx` (or use existing equipment with category index)                                 |
| `/c/:categorySlug`      | `(public)/equipment` (no slug in path) | **Add** `(public)/c/[categorySlug]/page.tsx` or align equipment to use `/c/:slug` for category listing                 |
| `/search?q=`            | —                                      | **Add** `(public)/search/page.tsx` (or handle in equipment/categories)                                                 |
| `/p/:productSlug`       | `(public)/equipment/[slug]/page.tsx`   | **Rename/mirror:** Add `(public)/p/[productSlug]/page.tsx` that forwards to equipment detail, or migrate to `/p/:slug` |
| `/kits`                 | `(public)/packages/page.tsx`           | **Add** `(public)/kits/page.tsx` redirect or alias to packages                                                         |
| `/how-it-works`         | `(public)/how-it-works/page.tsx`       | ✅ Exists                                                                                                              |
| `/policies`             | `(public)/policies/page.tsx`           | ✅ Exists                                                                                                              |
| `/contact`              | `(public)/support/page.tsx`            | Align: add `/contact` or keep support                                                                                  |
| `/auth/login`           | `(auth)/login/page.tsx`                | **Add** `(public)/auth/login` → redirect to `/login` or move under `/auth`                                             |
| `/auth/register`        | `(auth)/register/page.tsx`             | **Add** `(public)/auth/register` or redirect                                                                           |
| `/auth/verify-email`    | —                                      | **Add** `(public)/auth/verify-email/page.tsx`                                                                          |
| `/auth/forgot-password` | —                                      | **Add** `(public)/auth/forgot-password/page.tsx`                                                                       |

**Suggestion:** Either (A) add new spec routes as redirects/aliases to existing pages, or (B) migrate public routes to spec paths and update links. Prefer (A) for minimal breakage.

### User (app) routes

| Spec Route           | Current Route                    | Action                                                                                    |
| -------------------- | -------------------------------- | ----------------------------------------------------------------------------------------- |
| `/app`               | `/portal` or `/portal/dashboard` | **Add** `(portal)/app/page.tsx` as dashboard or redirect `/app` → `/portal`               |
| `/app/browse`        | —                                | **Add** or map to portal browse (equipment)                                               |
| `/app/kits`          | —                                | **Add** or map to portal kits                                                             |
| `/app/cart`          | `(public)/cart/page.tsx`         | Move under `/app` or add `/app/cart` → redirect to `/cart`                                |
| `/app/checkout`      | `(public)/checkout/page.tsx`     | Move under app or add `/app/checkout` redirect                                            |
| `/app/bookings`      | `portal/bookings/page.tsx`       | **Add** `(portal)/app/bookings/page.tsx` or redirect `/app/bookings` → `/portal/bookings` |
| `/app/bookings/:id`  | `portal/bookings/[id]/page.tsx`  | Same                                                                                      |
| `/app/invoices`      | —                                | **Add** if not under portal                                                               |
| `/app/saved`         | —                                | **Add** Saved Gear page                                                                   |
| `/app/profile`       | —                                | **Add** or map to portal profile                                                          |
| `/app/notifications` | —                                | **Add** or map to notifications                                                           |
| `/app/support`       | —                                | **Add** (feature toggle)                                                                  |

**Suggestion:** Current user area is under `/portal`. Either rename route group to `app` and use `/app/*`, or keep `/portal` and add redirects from `/app/*` to `/portal/*` so spec URLs work.

### Admin routes

| Spec Route                    | Current Route                       | Action                                                              |
| ----------------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `/admin`                      | `/admin` → redirect dashboard       | ✅                                                                  |
| `/admin/monitor`              | `/admin/live-ops`                   | **Add** `/admin/monitor` or alias to live-ops                       |
| `/admin/bookings`             | `/admin/bookings`                   | ✅                                                                  |
| `/admin/bookings/calendar`    | `/admin/calendar`                   | **Add** `/admin/bookings/calendar` or redirect to `/admin/calendar` |
| `/admin/bookings/conflicts`   | —                                   | **Add** `/admin/bookings/conflicts/page.tsx`                        |
| `/admin/inventory/equipment`  | `/admin/inventory/equipment`        | ✅                                                                  |
| `/admin/inventory/categories` | `/admin/inventory/categories`       | ✅                                                                  |
| `/admin/inventory/brands`     | `/admin/inventory/brands`           | ✅                                                                  |
| `/admin/inventory/packages`   | `/admin/inventory/kits`             | **Add** `/admin/inventory/packages` redirect to kits or duplicate   |
| `/admin/holds`                | —                                   | **Add** `/admin/holds/page.tsx` (Availability & Holds)              |
| `/admin/users`                | `/admin/users` (and settings/roles) | ✅ Ensure Approvals / Credit in same area                           |
| `/admin/finance/invoices`     | `/admin/invoices`                   | **Add** `/admin/finance/invoices` redirect or move under finance    |
| `/admin/finance/payments`     | `/admin/payments`                   | Same                                                                |
| `/admin/finance/deposits`     | —                                   | **Add** or under finance                                            |
| `/admin/finance/refunds`      | Part of payments                    | Same                                                                |
| `/admin/pricing-rules`        | `/admin/dynamic-pricing`            | **Add** alias or redirect                                           |
| `/admin/discounts`            | —                                   | **Add** (feature toggle)                                            |
| `/admin/roles-permissions`    | `/admin/settings/roles`             | **Add** `/admin/roles-permissions` redirect                         |
| `/admin/feature-toggles`      | `/admin/settings/features`          | **Add** redirect                                                    |
| `/admin/audit-log`            | —                                   | **Add** `/admin/audit-log/page.tsx`                                 |
| `/admin/settings`             | `/admin/settings`                   | ✅ Add sub-routes: Branches, Zones, Taxes, Templates                |

---

## 2) Sidebar Alignment

### User sidebar

**Spec:** Main (Dashboard, Browse, Packages, Cart); Rentals (My Bookings, Invoices, Documents); Account (Saved, Profile, Notifications, Support).

**Current:** Portal likely has its own nav. **Action:** Add or update portal layout sidebar/nav to match spec structure (sections + items). Create `PortalSidebar` or update existing portal layout.

**Files:** `src/app/portal/layout.tsx`, `src/components/layouts/portal-sidebar.tsx` (create if missing).

### Admin sidebar

**Spec:** Operations (Dashboard, Monitor, Bookings); Inventory (Equipment, Categories, Brands, Packages, Holds); Customers (Users); Finance (Invoices, Payments, Deposits, Refunds); System (Pricing, Discounts, Roles, Toggles, Audit, Settings).

**Current:** `admin-sidebar.tsx` has 8 sections with different grouping. **Action:** Reorder or add items to match spec: ensure Booking Monitor, Bookings (List/Calendar/Conflicts), Availability & Holds, Finance subgroup (Invoices, Payments, Deposits, Refunds), Discounts (toggle), Audit Log, Settings (Branches, Zones, Tax, Templates).

**File:** `src/components/layouts/admin-sidebar.tsx`.

---

## 3) Data Models

**Spec types:** See `src/lib/types/implementation-spec.types.ts` (User, Equipment, Cart, Booking, PricingRule).

**Action:** Use these types for mock data and API request/response alignment. Map Prisma/DB models to these shapes where needed (e.g. booking status enum alignment: current has DRAFT, RISK_CHECK, PAYMENT_PENDING, CONFIRMED, ACTIVE, RETURNED, CLOSED, CANCELLED; spec adds pending_profile, pending_approval, hold, picked_up, return_pending_check). Consider adding DB migrations for new statuses if adopting spec status model fully.

---

## 4) Filters

**Spec:** Global + per-category filters (§4 in IMPLEMENTATION_SPEC.md).

**Current:** `equipment-catalog-client.tsx` and equipment API support category/brand. **Action:** Add FilterPanel component (sticky); implement global filters (date range, fulfillment, price slider, sort); add category-specific filter sets (Cameras, Lenses, Lighting, Grip, Motion Control, Audio, Monitors, Accessories) using equipment specs or tags.

**Files:** `src/components/features/equipment/equipment-filters.tsx` (or new `FilterPanel.tsx`), `src/app/(public)/equipment/equipment-catalog-client.tsx`, API `/api/public/equipment` (query params).

---

## 5) RBAC

**Spec roles:** super_admin, admin_ops, admin_finance, tech_staff, customer (approved/pending).

**Current:** Roles in Prisma (ADMIN, WAREHOUSE_MANAGER, etc.) and permission-based sidebar. **Action:** Map spec role names to existing roles or add new roles; enforce “customer pending cannot hold/checkout” in middleware and checkout API; ensure audit log on admin actions.

**Files:** `src/lib/auth/permissions.ts`, `src/middleware.ts`, `src/app/api/checkout/create-session/route.ts`, booking create APIs.

---

## 6) Checkout Wizard

**Spec:** Step 0 gate; Steps 1–5 (Dates+Fulfillment, Availability Lock, Add-ons, Deposit+Payment, Confirm).

**Current:** 3 steps (Contact, Details, Review). **Action:** Expand to 5 steps; add Step 0 (profile + approval + docs gate) with redirect to profile; add Step 2 (availability lock / hold) and Step 3 (add-ons); add Step 4 (deposit + payment method); keep Step 5 (confirm). Implement validations per spec (§6). Add Stepper component and OrderSummary (sticky).

**Files:** `src/app/(public)/checkout/page.tsx`, `src/components/features/checkout/checkout-steps.tsx`, new step components, `src/app/api/checkout/lock-price/route.ts` (hold), cart/booking APIs.

---

## 7) UI Components (Required)

| Component                | Current                       | Action                                                                |
| ------------------------ | ----------------------------- | --------------------------------------------------------------------- |
| AppShell                 | Public layout + header/footer | Name or extract AppShell (Header/Footer/Sidebar)                      |
| AdminShell               | Admin layout                  | Name or extract AdminShell (AdminSidebar + header)                    |
| FilterPanel              | —                             | **Create** sticky FilterPanel (multi-select, clear-all, price slider) |
| ProductCard              | equipment-card                | Ensure has AvailabilityBadge, price/day, add-to-cart                  |
| AvailabilityBadge        | —                             | **Create** (green/red/label by date range)                            |
| DateRangePicker          | —                             | **Create** or use existing date picker for pickup/return              |
| Tabs                     | UI tabs                       | ✅                                                                    |
| Stepper                  | checkout-steps                | Extend to 5 steps; reuse as Stepper                                   |
| CartDrawer/CartPage      | cart page                     | Add CartDrawer (optional) + keep CartPage                             |
| OrderSummary             | —                             | **Create** sticky OrderSummary for checkout desktop                   |
| Modal, Toast, EmptyState | UI components                 | ✅                                                                    |
| PermissionGuard          | ProtectedRoute                | Extend for action-level (e.g. disable button if no permission)        |

---

## 8) Feature Toggles

**Spec keys:** See `src/config/implementation-spec.feature-toggles.ts`.

**Current:** Feature flags in DB (FeatureFlagService, `/api/feature-flags`). **Action:** Ensure all spec keys exist as flags (create via seed or admin); use `FeatureFlagService.isEnabled('enable_discounts')` etc. in UI and API; admin settings/features page should list these and toggle them (already exists for generic flags).

**Files:** `prisma/seed.ts` or seed script, `src/app/admin/(routes)/settings/features/page.tsx`, any component that shows/hides discounts, support, WhatsApp, etc.

---

## 9) Quick Wins (Order of Implementation)

1. **Feature toggles config** — Done: `src/config/implementation-spec.feature-toggles.ts`.
2. **Spec types** — Done: `src/lib/types/implementation-spec.types.ts`.
3. **Audit log page** — Add `/admin/audit-log/page.tsx` (fetch from existing `/api/audit-logs`).
4. **Admin holds page** — Add `/admin/holds/page.tsx` (active holds + release).
5. **Checkout Step 0 gate** — In checkout layout or step 1: check approved + profile + docs; redirect to profile with banner.
6. **Checkout expand to 5 steps** — Add steps 2 (hold) and 3 (add-ons); rename/reorder so Steps 1–5 match spec.
7. **FilterPanel + availability date range** — Add sticky filter panel and date range (pickup–return) to equipment listing.
8. **Portal sidebar** — Create or update portal layout with spec sidebar structure.
9. **Route redirects** — Add redirects from spec URLs to current URLs (e.g. `/app` → `/portal`, `/admin/monitor` → `/admin/live-ops`) so links in spec docs work.
10. **AvailabilityBadge** — Add to ProductCard and equipment detail.

---

**End of checklist.** Reference `docs/IMPLEMENTATION_SPEC.md` for exact content; this checklist maps it to the codebase.
