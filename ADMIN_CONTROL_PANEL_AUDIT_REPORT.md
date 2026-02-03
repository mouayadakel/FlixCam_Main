# Admin Control Panel – Comprehensive Audit & Optimization Report

**Date:** February 3, 2026  
**Scope:** Admin routes, API routes, services, auth, RBAC, and UI components under `/admin` and `/api/admin` (and related APIs).  
**Reference:** Existing audits (`CONTROL_PANEL_FULL_AUDIT_DETAILED.md`, `EMPTY_PAGES_AUDIT.md`) were used and extended.

---

## 1. Executive Summary

The admin control panel is broadly functional with **live data** on dashboard, bookings, equipment, quotes, invoices, payments, contracts, clients, coupons, maintenance, marketing, and imports. Gaps are concentrated in: **permission constants vs usage**, **approve/reject not calling real APIs**, **XSS risk on HTML fields**, **default encryption key**, **read-only mode persistence**, **duplicate breadcrumbs**, **permission string mismatch** (`booking.view` vs `booking.read`), and **several placeholder or half-implemented pages** (dashboard sub-pages, calendar, studios, technicians, users, wallet, settings/roles).

**Summary by priority:**

| Priority | Count | Focus |
|----------|--------|--------|
| **P0 – Critical** | 3 | Security (encryption default, XSS), data (approvals not persisted) |
| **P1 – High** | 8 | RBAC/permissions, API wiring, layout, read-only persistence |
| **P2 – Medium** | 10 | Placeholders, validation, UX, links |
| **P3 – Low** | 6 | Code quality, duplication, types |

**Recommendation:** Address P0 and P1 first (security and core flows), then fill P2 gaps (placeholders and UX), and finally P3 refactors.

---

## 2. Detailed Issue List

### P0 – Critical

#### P0-1. Default encryption key in production (Security)

| Field | Value |
|-------|--------|
| **Location** | `src/lib/services/integration-config.service.ts` lines 12–13 |
| **Severity** | Critical |
| **Category** | Security |
| **Description** | `ENCRYPTION_KEY` falls back to `'default-key-change-in-production'` when `process.env.ENCRYPTION_KEY` is unset. In production this allows decryption of stored integration secrets by anyone who knows the default. |
| **Impact** | Payment/email/WhatsApp/analytics configs stored in DB could be decrypted; compliance and breach risk. |
| **Reproduction** | Deploy without `ENCRYPTION_KEY`; inspect code or env. |
| **Recommended fix** | Do not default in production; require `ENCRYPTION_KEY` and fail fast if missing. |
| **Code example** | |

```ts
// Before
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production'

// After
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
if (!ENCRYPTION_KEY || (process.env.NODE_ENV === 'production' && ENCRYPTION_KEY.length < 32)) {
  throw new Error('ENCRYPTION_KEY must be set and at least 32 characters in production')
}
```

---

#### P0-2. XSS via `dangerouslySetInnerHTML` on equipment HTML (Security)

| Field | Value |
|-------|--------|
| **Location** | `src/app/admin/(routes)/inventory/equipment/[id]/page.tsx` lines 460, 500, 562 |
| **Severity** | Critical |
| **Category** | Security (XSS) |
| **Description** | `trans.description`, `equipment.specifications.html`, and `equipment.boxContents` are rendered with `dangerouslySetInnerHTML` without sanitization. If any of this HTML is user-controlled or import-controlled, it can execute script. |
| **Impact** | Stored XSS for any admin viewing the equipment detail page. |
| **Reproduction** | Create or import equipment with description/specs/boxContents containing `<script>...</script>` or event handlers; open equipment detail. |
| **Recommended fix** | Sanitize HTML before render (e.g. DOMPurify) or render as plain text. |
| **Code example** | |

```ts
// Add: npm install dompurify && npm install -D @types/dompurify
import DOMPurify from 'dompurify'

// Before
<div className="prose ..." dangerouslySetInnerHTML={{ __html: trans.description }} />

// After
<div
  className="prose ..."
  dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(trans.description ?? '', { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'] }),
  }}
/>
```

Apply the same pattern for `equipment.specifications.html` and `equipment.boxContents`.

---

#### P0-3. Approvals page: approve/reject not persisted (Data / Functionality)

| Field | Value |
|-------|--------|
| **Location** | `src/app/admin/(routes)/approvals/page.tsx` lines 191–224 |
| **Severity** | Critical |
| **Category** | Data / Functionality |
| **Description** | `handleAction` uses `await new Promise(resolve => setTimeout(resolve, 1000))` and only updates local state. It does not call `POST /api/approvals/[id]/approve` or `POST /api/approvals/[id]/reject`. |
| **Impact** | Approve/reject has no effect on the backend; approvals are not really resolved; workflow is broken. |
| **Reproduction** | Open Approvals, click Approve or Reject; refresh page – state is unchanged on server. |
| **Recommended fix** | Call the real approval APIs and refresh list (or update from response). |
| **Code example** | |

```ts
// In handleAction, replace the simulated delay with:
const endpoint =
  actionType === 'approve'
    ? `/api/approvals/${selectedApproval.id}/approve`
    : `/api/approvals/${selectedApproval.id}/reject`
const res = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ notes }),
})
if (!res.ok) {
  const err = await res.json().catch(() => ({}))
  throw new Error(err.error || res.statusText)
}
const data = await res.json()
// Then update local state from data or refetch loadApprovals()
```

Handle approval IDs that match the API (e.g. feature-flag approvals use different ID shape; booking approvals may need a dedicated approval record).

---

### P1 – High

#### P1-1. PERMISSIONS.USER_VIEW / USER_CREATE missing from PERMISSIONS object (Functionality / RBAC)

| Field | Value |
|-------|--------|
| **Location** | `src/lib/auth/permissions.ts` (PERMISSIONS object ends at line 105); `src/app/api/admin/users/route.ts` lines 63, 156 |
| **Severity** | High |
| **Category** | Functionality / RBAC |
| **Description** | Admin users API uses `PERMISSIONS.USER_VIEW` and `PERMISSIONS.USER_CREATE`, but the `PERMISSIONS` object in `permissions.ts` does not define `USER_VIEW` or `USER_CREATE`. If the project compiles, they may exist in another build or branch; in the current file they are missing. |
| **Impact** | TypeScript error or runtime 403 for user list/create if permission check fails. |
| **Reproduction** | Open Users page or create user as admin; check console/network for 403 or compile. |
| **Recommended fix** | Add to `PERMISSIONS` and include in admin (and optionally super_admin) role. |
| **Code example** | |

In `src/lib/auth/permissions.ts` inside the `PERMISSIONS` object (before `} as const`):

```ts
  // User management (admin/super_admin)
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
} as const
```

In `ROLE_PERMISSIONS.admin` array add:

```ts
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_CREATE,
```

---

#### P1-2. Permission string mismatch: `booking.view` vs `booking.read` (Logic)

| Field | Value |
|-------|--------|
| **Location** | `src/lib/services/booking.service.ts` lines 549, 615; `src/lib/auth/permissions.ts` line 15 |
| **Severity** | High |
| **Category** | Logic |
| **Description** | `BookingService.list` and related logic use `hasPermission(userId, 'booking.view' as any)`. `PERMISSIONS` defines `BOOKING_READ: 'booking.read'`. Roles are granted `booking.read`, not `booking.view`. |
| **Impact** | Permission check can always fail, blocking list/cancel for non-super_admin users. |
| **Reproduction** | Log in as staff/admin, open Bookings list or trigger cancel; may get 403 or empty list. |
| **Recommended fix** | Use `PERMISSIONS.BOOKING_READ` (or add `BOOKING_VIEW: 'booking.view'` and align roles) so that the same string is used in both permission constants and `hasPermission`. |
| **Code example** | |

```ts
// In booking.service.ts
import { PERMISSIONS } from '@/lib/auth/permissions'

// Replace
const canView = await hasPermission(userId, 'booking.view' as any)
// With
const canView = await hasPermission(userId, PERMISSIONS.BOOKING_READ)
```

Do the same for the second occurrence (around line 615). Update `context-sidebar.tsx` and `ai.policy.ts` to use `PERMISSIONS.BOOKING_READ` (or the chosen canonical permission) for consistency.

---

#### P1-3. Read-only mode not persisted (Data / Operations)

| Field | Value |
|-------|--------|
| **Location** | `src/lib/middleware/read-only.middleware.ts` lines 11–19 |
| **Severity** | High |
| **Category** | Data / Operations |
| **Description** | `readOnlyMode` is an in-memory variable. Restart or scale-out resets it; there is no persistence (DB/Redis) or admin UI to see/toggle it across instances. |
| **Impact** | Read-only mode cannot be relied on for maintenance or recovery across restarts or multiple instances. |
| **Reproduction** | Enable read-only via `POST /api/admin/read-only`, restart server; read-only is off. |
| **Recommended fix** | Persist in DB (e.g. `SystemSetting`) or Redis; have middleware and `GET/POST /api/admin/read-only` read/write from that store. |
| **Code example** | Conceptual: add a `SystemSetting` key `read_only_mode` and in middleware call a small helper that reads from DB/Redis; in read-only API, update that store instead of a global variable. |

---

#### P1-4. Duplicate breadcrumbs in admin layout (UX)

| Field | Value |
|-------|--------|
| **Location** | `src/app/admin/layout.tsx` lines 32–37 |
| **Severity** | High (UX) |
| **Category** | UX |
| **Description** | `AdminBreadcrumbs` is rendered once in the layout; many admin pages also render `AdminBreadcrumbs` again inside their content (e.g. clients/[id], approvals, action-center). Layout already wraps `children` in a container that includes breadcrumbs, so page-level breadcrumbs duplicate them. |
| **Impact** | Double breadcrumb trail on many pages; cluttered and inconsistent. |
| **Reproduction** | Open any admin page that imports and renders `AdminBreadcrumbs` (e.g. `/admin/clients`, `/admin/approvals`). |
| **Recommended fix** | Keep breadcrumbs only in the admin layout; remove `AdminBreadcrumbs` from individual admin pages so layout is the single source. |
| **Code example** | In `src/app/admin/layout.tsx` keep the existing breadcrumbs block. In each admin page that renders `<AdminBreadcrumbs />`, remove that component. |

---

#### P1-5. Approvals page: wrong link for “view” (Functionality)

| Field | Value |
|-------|--------|
| **Location** | `src/app/admin/(routes)/approvals/page.tsx` line 361 |
| **Severity** | High |
| **Category** | Functionality |
| **Description** | Link is built as `/admin/${approval.relatedType}s/${approval.relatedId}`. For `relatedType: 'booking'` this becomes `/admin/bookings/xxx` (correct). For `relatedType: 'quote'` this becomes `/admin/quotes/xxx` (correct). If `relatedType` is ever singular or different, the path can be wrong (e.g. `bookingss`). |
| **Impact** | 404 or wrong resource if `relatedType` does not match route naming. |
| **Reproduction** | Click “view” on an approval that has `relatedType` not matching the admin route segment (e.g. typo or new type). |
| **Recommended fix** | Map `relatedType` to route prefix explicitly (e.g. `{ booking: 'bookings', quote: 'quotes' }[approval.relatedType]`) and handle unknown types (hide link or open in new tab to a generic view). |

---

#### P1-6. Bookings API response shape vs Action Center / Approvals (Functionality)

| Field | Value |
|-------|--------|
| **Location** | `src/lib/services/booking.service.ts` return at lines 692–697; `src/app/admin/(routes)/action-center/page.tsx` lines 119–122; `src/app/admin/(routes)/approvals/page.tsx` lines 112–114 |
| **Severity** | High |
| **Category** | Functionality |
| **Description** | `BookingService.list` returns `{ data, total, limit, offset }`. The bookings API returns this object directly. Action Center and Approvals use `bookingsData.data` and assume a `data` array. If the API ever returns a different shape (e.g. pagination wrapper), these pages can break. |
| **Impact** | Empty or broken lists on Action Center and Approvals if response shape changes. |
| **Reproduction** | Change API to return `{ result: [...] }`; Action Center and Approvals show no items. |
| **Recommended fix** | Keep a single contract: e.g. always `{ data: T[], total?, limit?, offset? }` for list endpoints. Document it and add a type (e.g. `ListResponse<T>`). In pages, use optional chaining: `const bookings = bookingsData?.data ?? []`. |

---

#### P1-7. Admin read-only API: only ADMIN role (RBAC)

| Field | Value |
|-------|--------|
| **Location** | `src/app/api/admin/read-only/route.ts` lines 37, 73 |
| **Severity** | High |
| **Category** | RBAC |
| **Description** | GET/POST require `session.user.role === UserRole.ADMIN`. Prisma `UserRole` has no `SUPER_ADMIN`; if super_admin is represented as ADMIN with a flag or different table, they are allowed. If super_admin is a separate role, it is not allowed here. |
| **Impact** | Super-admin might be unable to toggle read-only if that role is distinct from ADMIN. |
| **Reproduction** | Log in as super_admin (if different from ADMIN); call GET/POST read-only; may get 403. |
| **Recommended fix** | If super_admin exists as a role, allow both ADMIN and SUPER_ADMIN for read-only; otherwise document that only ADMIN can toggle and ensure super_admin is mapped to ADMIN in auth. |

---

#### P1-8. Integration config raw SQL uses parameterized queries (Security – low risk, verify)

| Field | Value |
|-------|--------|
| **Location** | `src/lib/services/integration-config.service.ts` lines 45–47, 132–155 |
| **Severity** | High (verify only) |
| **Category** | Security |
| **Description** | `$queryRawUnsafe` / `$executeRawUnsafe` are used with `$1`, `$2` placeholders and values passed as subsequent arguments. Prisma binds these as parameters, so SQL injection risk is low. |
| **Impact** | If any concatenation or non-parameterized usage is introduced later, risk increases. |
| **Reproduction** | N/A (review only). |
| **Recommended fix** | Prefer Prisma typed client for `IntegrationConfig` (e.g. `findFirst`/`upsert`) when the model exists; if raw SQL is kept, keep strict parameterization and add a short comment that parameters must never be concatenated. |

---

### P2 – Medium

#### P2-1. Dashboard sub-pages are placeholders

| **Location** | `src/app/admin/(routes)/dashboard/overview/page.tsx`, `revenue/page.tsx`, `activity/page.tsx`, `recent-bookings/page.tsx`, `quick-actions/page.tsx` |
| **Description** | Pages only show title/breadcrumbs/placeholder text; no widgets or real data. |
| **Fix** | Either implement with real KPIs and links to lists, or redirect to main dashboard and remove from sidebar to avoid dead-ends. |

#### P2-2. Calendar page uses mock data

| **Location** | `src/app/admin/(routes)/calendar/page.tsx` |
| **Description** | Uses `mockBookings` (or similar) instead of `/api/bookings` or a calendar API. |
| **Fix** | Fetch bookings in date range from API and render calendar (e.g. month/week view) with real data. |

#### P2-3. Users, Studios, Technicians, Wallet pages use mock/placeholder data

| **Location** | `src/app/admin/(routes)/users/page.tsx`, `studios/page.tsx`, `technicians/page.tsx`, `wallet/page.tsx` |
| **Description** | Not wired to real APIs (e.g. users list should use `/api/admin/users`). |
| **Fix** | Wire to existing APIs (`/api/admin/users`, `/api/studios`, `/api/technicians`, `/api/wallet`) and replace mock data. |

#### P2-4. Settings roles page: mock permissions

| **Location** | `src/app/admin/(routes)/settings/roles/page.tsx`, `settings/roles/[id]/page.tsx` |
| **Description** | Roles and permissions are static; not from DB or `/api/admin/roles`. |
| **Fix** | Use `GET /api/admin/roles` and role detail API; show real permissions and allow edit if product requires. |

#### P2-5. Inventory categories and brands

| **Location** | `src/app/admin/(routes)/inventory/categories/page.tsx`, `inventory/brands/page.tsx` |
| **Description** | Categories use mock; brands page may be minimal or mock. |
| **Fix** | Use `/api/categories` and `/api/brands` (or create brands CRUD API) and implement list/create/edit. |

#### P2-6. Warehouse sub-routes (check-in, check-out, inventory) exist but behavior

| **Location** | `src/app/admin/(routes)/ops/warehouse/check-in/page.tsx`, `check-out/page.tsx`, `inventory/page.tsx` |
| **Description** | Pages exist; verify they call `/api/warehouse/check-in`, etc., and handle errors. |
| **Fix** | Confirm API wiring and loading/error states; add any missing API endpoints. |

#### P2-7. Payments API: response shape for list

| **Location** | `src/app/admin/(routes)/action-center/page.tsx` uses `paymentsData.data` |
| **Description** | Same as P1-6: ensure payments list API returns `{ data: [] }` and pages use it consistently. |
| **Fix** | Standardize list responses and use optional chaining. |

#### P2-8. Invoices new/detail and Orders detail

| **Location** | Links to `/admin/invoices/new`, `/admin/invoices/[id]`, `/admin/orders/[id]`; some routes may be missing or minimal. |
| **Description** | Per existing audit, some links point to missing or placeholder pages. |
| **Fix** | Add or complete these routes and ensure they call the correct APIs. |

#### P2-9. Clients new/detail and Coupons new/detail

| **Location** | `src/app/admin/(routes)/clients/new/page.tsx`, `clients/[id]/page.tsx`, `coupons/new/page.tsx`, `coupons/[id]/page.tsx` |
| **Description** | Pages exist; verify they use `/api/clients`, `/api/coupons` and show validation/loading/errors. |
| **Fix** | Confirm CRUD and error handling; add confirmation dialogs for delete. |

#### P2-10. Quotes new

| **Location** | Sidebar/links to `/admin/quotes/new` |
| **Description** | May be missing or placeholder. |
| **Fix** | Implement quote creation page and wire to `POST /api/quotes`. |

---

### P3 – Low

#### P3-1. Error responses expose `error.message` in production

| **Location** | Multiple API routes, e.g. `src/app/api/admin/users/route.ts` line 126 |
| **Description** | `return NextResponse.json({ error: '...', details: error.message }, { status: 500 })` can leak stack or internal details. |
| **Fix** | In production, return a generic message and log `error` server-side; avoid sending `error.message` to client. |

#### P3-2. `any` in API handlers

| **Location** | Various catch blocks: `catch (error: any)` |
| **Description** | TypeScript best practice is to avoid `any`; use `unknown` and type narrowing. |
| **Fix** | Use `catch (error: unknown)` and `error instanceof Error ? error.message : 'Unknown error'`. |

#### P3-3. ZodError check in bookings route

| **Location** | `src/app/api/bookings/route.ts` line 106 |
| **Description** | Uses `error.name === 'ZodError'`; better to use `error instanceof z.ZodError`. |
| **Fix** | `if (error instanceof z.ZodError)` and return validation payload. |

#### P3-4. Duplicate or repeated permission checks

| **Location** | Several API routes that both use middleware and then `hasPermission` |
| **Description** | Redundant if middleware already enforces role; can centralize in a small helper or middleware. |
| **Fix** | Document which routes require fine-grained permission and which only role; avoid double checks where not needed. |

#### P3-5. Sidebar link to Kit Builder / Dynamic Pricing / AI Recommendations

| **Location** | `src/components/layouts/admin-sidebar.tsx` |
| **Description** | Links to `/admin/kit-builder`, `/admin/dynamic-pricing`, `/admin/ai-recommendations`; these may redirect or be placeholder. |
| **Fix** | Either implement pages or point sidebar items to the AI page tabs (e.g. `/admin/ai`) and remove duplicate entries. |

#### P3-6. Loading states and skeletons

| **Location** | Various admin pages |
| **Description** | Some pages have no loading skeleton or show content before data is ready. |
| **Fix** | Use Suspense + skeleton or local loading state for all data-dependent views. |

---

## 3. Refactoring Opportunities

1. **List API contract**  
   Standardize all list endpoints on `{ data: T[], total?, limit?, offset?, totalPages? }` and a shared `ListResponse<T>` type. Use it in dashboard, bookings, equipment, clients, etc.

2. **Permission constants and role matrix**  
   - Add missing user-management permissions to `PERMISSIONS` and align all `hasPermission` calls (e.g. `BOOKING_READ` instead of `'booking.view'`).  
   - Consider a single source of truth for “which role can do what” (e.g. generated from a matrix or config).

3. **Admin layout and breadcrumbs**  
   Remove duplicate `AdminBreadcrumbs` from all admin pages; rely on layout only. Optionally make breadcrumb segments derive from route path + page meta.

4. **Approval workflow**  
   - Unify approval resource types (booking, refund, feature-flag, etc.) and IDs.  
   - Ensure Approvals page calls approve/reject APIs and refetches or updates from response.  
   - Add a simple “pending approvals” count in header/sidebar from `/api/approvals/pending`.

5. **Read-only mode**  
   Move from in-memory flag to DB or Redis; expose toggle only to super_admin/admin and show status in admin header or settings.

6. **Sanitization helper**  
   Centralize HTML sanitization (e.g. one helper using DOMPurify with a shared config) and use it for equipment description, specifications.html, boxContents, and any other rich-text from DB.

7. **API error handler**  
   One helper that maps thrown errors (e.g. `ValidationError`, `NotFoundError`, `ForbiddenError`) to HTTP status and body, and in production hides internal messages.

---

## 4. Best Practices Recommendations

- **Auth:** Keep using `auth()` and role in middleware; add fine-grained `hasPermission` only where needed (e.g. user management, read-only toggle).
- **Validation:** Use Zod (or existing validators) for all POST/PATCH bodies and query params on admin APIs; return 400 with structured validation errors.
- **Audit:** Continue using `AuditService.log` for sensitive actions (user create, read-only toggle, approval, etc.).
- **Rate limiting:** Keep `rateLimitAPI` on admin and public APIs; consider stricter limits for admin write operations.
- **CSRF:** Next.js App Router and same-site cookies mitigate many CSRF cases; for state-changing operations from non-GET requests, ensure origin/referer or use CSRF tokens if you add non-cookie auth.
- **Accessibility:** Add `aria-label` to icon-only buttons (e.g. sidebar toggle, table actions); ensure focus order and RTL support for Arabic.
- **i18n:** Centralize strings (Arabic/English) for admin UI so labels and errors are consistent and easy to maintain.

---

## 5. Implementation Roadmap (Prioritized)

| Phase | Focus | Items |
|-------|--------|--------|
| **1** | P0 security & data | P0-1 (ENCRYPTION_KEY), P0-2 (XSS sanitization), P0-3 (approvals API wiring) |
| **2** | P1 RBAC & layout | P1-1 (USER_VIEW/USER_CREATE), P1-2 (booking.read), P1-4 (breadcrumbs), P1-5 (approval link map) |
| **3** | P1 operations | P1-3 (read-only persistence), P1-6 (response shape), P1-7 (read-only role) |
| **4** | P2 placeholders | Dashboard sub-pages, calendar, users/studios/technicians/wallet, settings/roles, categories/brands |
| **5** | P2 CRUD & links | Invoices/orders/clients/coupons/quotes new and detail pages; warehouse sub-pages |
| **6** | P3 quality | Error message sanitization, TypeScript (`unknown`), Zod checks, loading states, sidebar cleanup |

---

## 6. Quick Reference – Files Touched by Priority

| Priority | Files |
|---------|--------|
| P0 | `integration-config.service.ts`, `inventory/equipment/[id]/page.tsx`, `approvals/page.tsx` |
| P1 | `permissions.ts`, `booking.service.ts`, `read-only.middleware.ts`, `admin/layout.tsx`, `approvals/page.tsx`, `read-only/route.ts` |
| P2 | Dashboard sub-pages, calendar, users, studios, technicians, wallet, settings/roles, inventory categories/brands, warehouse pages, invoices/orders/clients/coupons/quotes |
| P3 | Multiple API route catch blocks, sidebar, loading components |

This report can be used as a single reference for triage and implementation; refer to the existing Arabic audit for page-by-page notes and sidebar coverage.
