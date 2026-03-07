# Control Panel – Deep Analysis Report

**Date:** February 7, 2026  
**Scope:** Admin panel (`/admin`), sidebar, header, permissions, and feature completeness vs PRD/docs.

---

## 1) Executive Summary

- **Hidden / permission-gated features:** Sidebar items are filtered by `usePermissions()`. No “hidden” backdoors were found; what you see is driven by role permissions.
- **Security concern:** When the permissions API returns an empty array (or fails), `hasPermission()` returns **true** for any check, so the UI shows **all** menu items (fail-open). This should be reviewed.
- **Missing or broken:** `/admin/profile` is linked from the header but **no page exists** (404). Several list-only areas lack detail/create pages (e.g. Orders).
- **Placeholder / mock data:** Action Center (partial), Kit Builder (kits not from API), AI Recommendations (sample only), Wallet, Users list, Technicians, and some dashboard sub-pages.
- **Features you may want:** Audit log viewer, booking availability check on create, deposit calculator, contract PDF from booking, refund/collect from payment detail, and a proper admin profile page.

---

## 2) Permission & “Hidden” Behavior

### 2.1 How the sidebar is built

- **File:** `src/components/layouts/admin-sidebar.tsx`
- **Logic:** Each item has an optional `permission` (e.g. `dashboard.read`, `booking.read`). The sidebar filters with:
  ```ts
  const filteredItems = section.items.filter((item) => hasPermission(item.permission))
  ```
- So items are **hidden** only when the user **lacks** that permission. There are no extra “hidden” sections or phony links; visibility is permission-driven.

### 2.2 Permission hook (potential issue)

- **File:** `src/hooks/use-permissions.ts`
- **Behavior:**
  - Loads permissions from `GET /api/user/permissions`.
  - `hasPermission(required)`:
    - If `!required` → **true**
    - If **loading** → **true**
    - If **permissions.length === 0** → **true**
    - Otherwise → match against `permissions` (with wildcards in `matches-permission.ts`).

So when:

- The permissions API fails, or
- The user has no roles/permissions (empty array),

**every** `hasPermission(...)` check is **true**, and the user sees the full sidebar. That is **fail-open**: no permissions → full access in the UI. Recommendation: treat “empty permissions” as “no access” (fail-closed) unless the user is explicitly a super-admin, and consider showing a minimal or “no access” state while loading.

---

## 3) Broken or Missing Routes

### 3.1 Admin profile (broken link)

- **Header:** User menu has “الملف الشخصي” → `Link href="/admin/profile"`.
- **Reality:** There is **no** `src/app/admin/(routes)/profile/` (or similar). The route does not exist → **404**.
- **Recommendation:** Add `/admin/profile` (e.g. view/edit name, email, password, language) or change the link to an existing page (e.g. `/admin/settings` or a portal profile if applicable).

### 3.2 Other missing pages (from audit + codebase)

These are either linked from the UI or expected from CRUD flows but have no page:

| Route                      | Status      | Note                          |
| -------------------------- | ----------- | ----------------------------- |
| `/admin/profile`           | **Missing** | Header link → 404             |
| `/admin/orders/new`        | Missing     | Only list exists              |
| `/admin/orders/[id]`       | Missing     | Only list exists              |
| `/admin/delivery/schedule` | Missing     | Referenced from delivery area |

All other previously “missing” items in the old audit (e.g. approvals, action-center, live-ops, kit-builder, dynamic-pricing, ai-recommendations, invoices/new, invoices/[id], payments/[id], contracts/[id], clients/new, clients/[id], coupons, maintenance, warehouse check-in/out/inventory, etc.) **have** corresponding page files. So the main **broken** link is `/admin/profile`; the rest are mostly “list without detail/create” gaps.

---

## 4) Placeholder / Mock / Partially Wired Features

### 4.1 Action Center (`/admin/action-center`)

- **Data:** Combines real data (bookings in `RISK_CHECK`, payments `PENDING`) with **hardcoded** “system” actions (e.g. “معدات تحتاج صيانة عاجلة”, “حجوزات تبدأ اليوم”).
- **Gap:** No real notifications/tasks API; “dismiss” only removes from local state.

### 4.2 Kit Builder (`/admin/kit-builder`)

- **Data:** Equipment list from `GET /api/equipment`. Kits list is **sample data** in code; comments say “in production would come from /api/kits”.
- **APIs:** `GET/POST/DELETE /api/kits` and `/api/kits/[id]` **exist**.
- **Gap:** Page does **not** call `/api/kits`; create/delete are not wired. Kit Builder UI should be connected to the existing Kits API.

### 4.3 AI Recommendations (`/admin/ai-recommendations`)

- **Data:** Uses **sample recommendations** in code; comment says “would call /api/ai/recommendations”.
- **API:** `/api/ai/recommendations` exists (and public recommendations by equipment exist).
- **Gap:** Page does not fetch from the AI recommendations API; it’s demo-only.

### 4.4 Dynamic Pricing (`/admin/dynamic-pricing`)

- **Data:** Uses `GET/POST/PATCH/DELETE /api/pricing-rules` and `/api/pricing-rules/[id]`.
- **Status:** **Fully wired** to real API (no mock).

### 4.5 Wallet (`/admin/wallet`)

- **Data:** Renders `mockWalletTx` (hardcoded array).
- **API:** `/api/wallet` exists.
- **Gap:** Page should load from `/api/wallet` instead of mock.

### 4.6 Users list (`/admin/users`)

- **Data:** Uses `mockUsers` from `@/lib/utils/mock-data`.
- **API:** `/api/users` and admin user/roles APIs exist.
- **Gap:** List should use real user API and role assignment.

### 4.7 Technicians (`/admin/technicians`)

- **Data:** Local `mockTechnicians` array.
- **API:** `GET /api/technicians` exists.
- **Gap:** Page should use `/api/technicians`.

### 4.8 Dashboard sub-pages (placeholder content)

- `/admin/dashboard/overview` – Text placeholder only.
- `/admin/dashboard/revenue` – Placeholder.
- `/admin/dashboard/activity` – Uses `PlaceholderCard`.
- `/admin/dashboard/recent-bookings` – Uses `PlaceholderCard`.
- `/admin/dashboard/quick-actions` – Uses `PlaceholderCard`.

Main dashboard (`/admin/dashboard`) uses real DB/APIs; these sub-routes do not add real content yet.

### 4.9 Notifications (`/admin/notifications`)

- **Data:** Fetches from `/api/notifications` (read, mark read, etc.).
- **Status:** **Wired** to API. Header bell links here and is correct.

---

## 5) Features That Exist But You May Want to Add

Based on PRD, BOOKING_ENGINE, and ROLES_AND_SECURITY:

### 5.1 Audit log viewer

- **Docs:** “Everything is audited”; RBAC plan requires logging permission changes and access.
- **Current:** `GET /api/audit-logs` exists; there is **no** admin UI to browse/filter audit logs.
- **Suggestion:** Add `/admin/settings/audit-log` (or under Super) with filters (user, action, date, resource type) and export.

### 5.2 Booking creation – availability & cost

- **Current:** `/admin/bookings/new` lets you pick client, dates, and equipment but does **not**:
  - Check availability for the selected range.
  - Show estimated cost before submit.
- **Suggestion:** Before submit: call availability (e.g. equipment/availability or booking API) and show a cost estimate (e.g. daily rate × days + deposit if applicable).

### 5.3 Deposit calculator

- **PRD:** Deposit is based on equipment value (formula TBD).
- **Suggestion:** In booking create/detail and in quote flow, show a calculated deposit (and optionally make it editable with approval trail).

### 5.4 Contract PDF from booking

- **Current:** Contracts have `/api/contracts/[id]/pdf` and signing flow; from booking detail it’s not always obvious how to “generate / view contract PDF” in one click.
- **Suggestion:** In booking detail, add explicit “View contract” / “Generate contract PDF” that deep-links to contract by booking and opens PDF.

### 5.5 Payment detail – refund / collect

- **Current:** `/admin/payments/[id]` exists; refund may be possible via API (`/api/payments/[id]/refund`).
- **Suggestion:** Ensure payment detail page has clear “Refund” (with reason and approval flow per your security rules) and, if applicable, “Collect” or “Mark paid” for manual payments.

### 5.6 Admin profile page

- **Current:** Header links to `/admin/profile` which does not exist.
- **Suggestion:** Add `/admin/profile` for name, email, password change, and maybe language/notification preferences so the link is valid and useful.

### 5.7 Orders – detail and create

- **Current:** Only `/admin/orders` (list). No `/admin/orders/[id]` or `/admin/orders/new`.
- **Suggestion:** If “orders” are first-class (e.g. e‑commerce or internal orders), add detail and create pages; otherwise clarify relationship to bookings and hide or relabel.

### 5.8 Delivery schedule page

- **Current:** Delivery is managed from `/admin/ops/delivery`; a “schedule” sub-route is referenced but missing.
- **Suggestion:** Add `/admin/ops/delivery/schedule` (or equivalent) for day/view scheduling if needed.

### 5.9 Finance dashboard (single entry)

- **Current:** `/admin/finance` has tabs and uses real invoices/payments APIs; “Financial Reports” in sidebar goes to `/admin/finance/reports`.
- **Suggestion:** Ensure one clear “Finance” entry in the sidebar (e.g. “Finance” → overview, with links to Invoices, Payments, Reports) so users don’t have to remember both “Finance” and “Financial Reports”.

### 5.10 Role conflicts (RBAC)

- **RBAC plan:** Defines conflicting role pairs (e.g. Finance + Data Entry).
- **Suggestion:** In role assignment UI, when assigning a role, check conflicts and show a warning or block.

---

## 6) Summary Tables

### 6.1 Sidebar vs implementation

| Sidebar item                                            | Route                             | Data source                 | Status               |
| ------------------------------------------------------- | --------------------------------- | --------------------------- | -------------------- |
| Dashboard                                               | /admin/dashboard                  | DB/API                      | Live                 |
| Action Center                                           | /admin/action-center              | API + mock actions          | Partial              |
| Approvals                                               | /admin/approvals                  | API                         | Live                 |
| Live Operations                                         | /admin/live-ops                   | API                         | Live                 |
| Quotes                                                  | /admin/quotes                     | API                         | Live                 |
| Bookings                                                | /admin/bookings                   | API                         | Live                 |
| Recurring Bookings                                      | /admin/recurring-bookings         | API                         | Live                 |
| Calendar                                                | /admin/calendar                   | API                         | Live                 |
| AI Features                                             | /admin/ai                         | API                         | Live                 |
| Kit Builder                                             | /admin/kit-builder                | Equipment API + sample kits | Kits not from API    |
| Dynamic Pricing                                         | /admin/dynamic-pricing            | API                         | Live                 |
| AI Recommendations                                      | /admin/ai-recommendations         | Sample data                 | Not using API        |
| Equipment                                               | /admin/inventory/equipment        | API                         | Live                 |
| Kits & Bundles                                          | /admin/inventory/kits             | API                         | Live                 |
| Categories                                              | /admin/inventory/categories       | API                         | Live                 |
| Brands                                                  | /admin/inventory/brands           | API                         | Live                 |
| Studios                                                 | /admin/studios                    | API                         | Live                 |
| Import                                                  | /admin/inventory/import           | API                         | Live                 |
| Warehouse                                               | /admin/ops/warehouse              | API                         | Live                 |
| Delivery                                                | /admin/ops/delivery               | API                         | Live                 |
| Technicians                                             | /admin/technicians                | Mock                        | Not using API        |
| Maintenance                                             | /admin/maintenance                | API                         | Live                 |
| Damage Claims                                           | /admin/damage-claims              | API                         | Live                 |
| Invoices                                                | /admin/invoices                   | API                         | Live                 |
| Payments                                                | /admin/payments                   | API                         | Live                 |
| Contracts                                               | /admin/contracts                  | API                         | Live                 |
| Financial Reports                                       | /admin/finance/reports            | API                         | Live                 |
| Analytics                                               | /admin/analytics                  | API                         | Live                 |
| Clients                                                 | /admin/clients                    | API                         | Live                 |
| Reviews                                                 | /admin/reviews                    | API                         | Live                 |
| Customer Segments                                       | /admin/settings/customer-segments | API                         | Live                 |
| Coupons                                                 | /admin/coupons                    | API                         | Live                 |
| Marketing                                               | /admin/marketing                  | API                         | Live                 |
| Settings / Integrations / Features / Roles / AI Control | various                           | API                         | Live (roles use API) |
| Notifications                                           | /admin/notifications              | API                         | Live                 |

### 6.2 Intentionally “hidden” features

- **None.** What’s hidden is only what the user’s permissions hide (sidebar filtered by `hasPermission(item.permission)`). No backdoors or secret pages were found.

### 6.3 Fix list (priority)

1. **High:** Add `/admin/profile` or remove/change the header link (avoid 404).
2. **High:** Fix permission behavior when `permissions.length === 0` (fail-closed or explicit super-admin).
3. **Medium:** Wire Kit Builder to `GET/POST/DELETE /api/kits` and `/api/kits/[id]`.
4. **Medium:** Wire AI Recommendations to `/api/ai/recommendations` (or equivalent).
5. **Medium:** Replace mock data on Wallet, Users, Technicians with real APIs.
6. **Lower:** Add audit log viewer UI; add availability + cost preview on booking create; add deposit calculator; clarify contract PDF from booking; ensure payment detail has refund/collect actions; add Orders detail/new if needed; add delivery schedule page if needed; role conflict checks in RBAC UI.

---

**End of report.**  
If you want, next step can be: (1) implement `/admin/profile`, (2) change `usePermissions` to fail-closed when permissions are empty, or (3) wire Kit Builder / AI Recommendations / Wallet / Users / Technicians to their APIs.
