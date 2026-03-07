# Website & Control Panel – Deep Dive Research

**Date:** February 13, 2026  
**Scope:** Full website (public + portal + admin), control panel architecture, security, APIs, and implementation status.

---

## 1. Executive Summary

| Area               | Status          | Notes                                                                                             |
| ------------------ | --------------- | ------------------------------------------------------------------------------------------------- |
| **Public website** | Live            | Home, equipment, studios, packages, cart, checkout, auth modal, RTL/Arabic-first                  |
| **Control panel**  | Live            | 8 sections, 40+ routes, permission-driven sidebar, RTL UI                                         |
| **Permissions**    | **Fail-closed** | Empty/error → no access; super-admin bypass; sidebar shows loading/error states                   |
| **Admin profile**  | **Implemented** | `/admin/profile` exists (info + password), uses `/api/me` and `/api/user/profile/password`        |
| **Mock data**      | Partial         | Wallet, Users list, Technicians, Kit Builder kits, AI Recommendations still use mock/sample data  |
| **Security**       | Layered         | Middleware (session + role), API auth, route-level permission checks, no admin bypass in policies |

---

## 2. Website Overview

### 2.1 Product Identity

- **FlixCam.rent** – Cinematic equipment & studio rental platform (AI-first “operating system” for film production).
- **Tech stack:** Next.js 14 (App Router), React, TypeScript, Tailwind, Shadcn UI, Prisma, PostgreSQL, NextAuth.js v5.

### 2.2 Route Groups

| Group      | Path             | Purpose                                                                              |
| ---------- | ---------------- | ------------------------------------------------------------------------------------ |
| **Public** | `(public)` / `/` | Home, equipment, studios, packages, cart, checkout – unauthenticated + auth modal    |
| **Auth**   | `(auth)`         | `/login`, `/register` – standalone auth pages                                        |
| **Admin**  | `/admin`         | Control panel – sidebar, header, breadcrumbs, permission-based access                |
| **Portal** | `/portal`        | Client-facing dashboard (bookings, profile) – authenticated users with role `client` |

### 2.3 Public Website (Landing & Catalog)

- **Layout:** `src/app/(public)/layout.tsx` – metadata, skip-to-main, `PublicLayoutClient` (header, footer, WhatsApp CTA).
- **Home:** `src/app/(public)/page.tsx` – Hero, Featured Equipment (from DB), Top Brands, How It Works, Testimonials, FAQ, CTA. Uses `unstable_cache` for featured equipment (revalidate 300s).
- **i18n:** `src/messages/` – `ar.json`, `en.json`, `zh.json` for public and auth UI.
- **Auth on public:** Modal-based (auth modal provider) for login/register without leaving the page.

### 2.4 Middleware (Global Protection)

- **File:** `src/middleware.ts`
- **Behavior:**
  - **Public:** `/`, `/login`, `/register`, `/equipment`, `/studios`, `/cart`, `/checkout`, etc. → no auth required.
  - **API:** Public APIs (`/api/auth`, `/api/health`, `/api/cart`, `/api/public`) → next; all other API routes require session (401 if missing).
  - **Admin:** `/admin` requires session; unauthenticated → redirect to `/login?callbackUrl=...`. Role check: only `super_admin`, `admin`, `staff`, `warehouse`, `driver`, `technician` allowed; `client` → redirect to `/portal/dashboard`; others → `/403`.
  - **Settings:** `/admin/settings` requires `super_admin` or `admin`.
  - **Super:** `/admin/super` requires `super_admin`.
  - **Portal:** `/portal` requires session (any role).
  - **Read-only mode:** API write operations can be blocked via `enforceReadOnly` (read-only middleware).

---

## 3. Control Panel Architecture

### 3.1 Layout Structure

```
src/app/admin/
├── layout.tsx          # Admin layout: sidebar + header + breadcrumbs + ProtectedRoute
├── page.tsx            # Redirects to /admin/dashboard
├── loading.tsx
├── error.tsx
├── dashboard/          # Main dashboard (and sub-pages)
└── (routes)/           # All other admin routes (profile, bookings, settings, etc.)
```

- **Layout:** RTL (`dir="rtl"`), full-height flex, sidebar on the right (RTL), main content with header and breadcrumbs. All page content wrapped in `<ProtectedRoute>`.

### 3.2 Sidebar (`admin-sidebar.tsx`)

- **Sections:** 8 (Command Center, Booking Engine, Smart Sales Tools, Inventory & Assets, Field Operations, Finance & Legal, CRM & Marketing, Settings).
- **Items:** Each item has `label` (ar/en), `href`, and optional `permission` (e.g. `booking.read`, `equipment.read`).
- **Filtering:** `filteredItems = section.items.filter((item) => hasPermission(item.permission))`. No hidden backdoors; visibility is entirely permission-driven.
- **States:**
  - **Loading:** Spinner + “جاري التحميل...” (no menu items).
  - **Error:** Red alert “فشل تحميل الصلاحيات” (no menu items).
  - **Loaded:** Sections and items filtered by `hasPermission`.
- **UX:** Collapsible sidebar, expandable sections, active route highlighting, language toggle (ar/en) in footer.

### 3.3 Header (`admin-header.tsx`)

- Search placeholder, notifications (link to `/admin/notifications`), user menu with link to **الملف الشخصي** → `/admin/profile` (page exists).

### 3.4 Breadcrumbs (`admin-breadcrumbs.tsx`)

- Route-based breadcrumb trail for admin pages.

### 3.5 Route Protection (`protected-route.tsx`)

- **Map:** `ROUTE_PERMISSIONS`: path prefix → required permission (e.g. `/admin/bookings` → `booking.read`, `/admin/profile` → `dashboard.read`).
- **Logic:** `getRequiredPermission(pathname)`; if no match, defaults to `dashboard.read`. Renders children only if `hasPermission(required)`; otherwise 403-style message + link back to dashboard.
- **Loading:** Skeleton pulse while permissions are loading.

---

## 4. Permissions & Security

### 4.1 Permission Hook (`use-permissions.ts`)

- **Source:** `GET /api/user/permissions` on mount.
- **Response:** `{ permissions: string[], isSuperAdmin: boolean }`.
- **Behavior (fail-closed):**
  - No `required` → allow.
  - `loading` → deny.
  - `error` → deny.
  - `isSuperAdmin` → allow.
  - `permissions.length === 0` → deny.
  - Else → allow if `permissions.some(p => matchesPermission(p, required))` (wildcard in `matches-permission.ts`).

### 4.2 Permissions API (`/api/user/permissions`)

- Uses `auth()` (NextAuth). No session → returns `{ permissions: [], isSuperAdmin: false }` with **200** (so client sees “no access”, not 401 for this endpoint).
- On success: `getUserPermissions(session.user.id)` and `isSuperAdmin = permissions.includes('*')`.
- On catch: returns `{ permissions: [], isSuperAdmin: false }` with 200 (fail-closed for UI).

### 4.3 Permission Constants (`lib/auth/permissions.ts`)

- Resource.action naming: `booking.read`, `equipment.create`, `payment.refund`, etc. Used across app and RBAC/seed.

### 4.4 Policy Doctrine (from ROLES_AND_SECURITY.md)

- No admin bypass: all actions go through policies.
- Financial operations require approval workflow.
- Soft delete only; hard delete only with approval + audit.
- Critical actions emit events (event bus).

---

## 5. Admin Routes – Implementation Status

### 5.1 Fully Wired (Live Data / APIs)

- Dashboard, Action Center (partial – some hardcoded system actions), Approvals, Live Ops, Quotes (list/new/[id]), Bookings (list/new/[id]), Recurring Bookings, Calendar, AI Features, Dynamic Pricing, Equipment, Kits & Bundles (inventory), Categories, Brands, Studios, Import, Warehouse (check-in/check-out/inventory), Delivery, Maintenance, Damage Claims, Invoices, Payments, Contracts, Finance/Reports, Analytics, Clients, Reviews, Customer Segments, Coupons, Marketing, Settings (general, notification templates, integrations, features, roles, AI control), Notifications, **Profile** (info + password).

### 5.2 Still Using Mock / Sample Data

| Page                   | Data                                                                      | Real API Available                            |
| ---------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| **Wallet**             | `mockWalletTx` hardcoded                                                  | `/api/wallet` (existence confirmed in docs)   |
| **Users**              | `mockUsers` from `@/lib/utils/mock-data`                                  | `/api/admin/users` and user/roles APIs        |
| **Technicians**        | Local `mockTechnicians` array                                             | `GET /api/technicians`                        |
| **Kit Builder**        | `sampleKits` in code (comment: “in production would come from /api/kits”) | `GET/POST/DELETE /api/kits`, `/api/kits/[id]` |
| **AI Recommendations** | Sample recommendations in code                                            | `/api/ai/recommendations`                     |

### 5.3 Placeholder / Skeleton Content

- Dashboard sub-pages: `/admin/dashboard/overview`, `revenue`, `activity`, `recent-bookings`, `quick-actions` – placeholder or `PlaceholderCard`.
- Action Center: mix of real (e.g. bookings in RISK_CHECK, payments PENDING) and hardcoded “system” actions; dismiss is local state only.

### 5.4 Missing or List-Only

- **Orders:** Only list (`/admin/orders`); no `/admin/orders/new` or `/admin/orders/[id]`.
- **Delivery schedule:** Referenced in delivery area but no dedicated `/admin/ops/delivery/schedule` page (API exists: `/api/delivery/schedule`).
- **Audit log UI:** `GET /api/audit-logs` exists; no admin page to browse/filter/export audit logs.

---

## 6. API Surface (Summary)

- **Auth:** `/api/auth/[...nextauth]`, signin, register, signout, OTP send/verify.
- **User:** `/api/me`, `/api/user/permissions`, `/api/user/profile/password`, `/api/user/menu`.
- **Admin:** users, roles, permissions, permissions/categories, website-pages, imports (validate, sheets, preview-ai, analyze, [id]/retry|progress|errors.csv), products, bookings/force-transition, jobs/rerun, locks/release, health, read-only, settings/ai, ai/analytics.
- **Booking engine:** bookings (CRUD, transition, mark-returned, damage-claims), quotes (CRUD, status, pdf, convert), recurring-series, calendar, approvals (pending, [id]/approve|reject), checkout (lock-price, create-session), cart (sync, coupon, [itemId]), portal/bookings (request-extension, request-change, report-damage, cancel).
- **Inventory:** equipment, categories, brands, kits, studios, warehouse (check-in, check-out, inventory, queue), delivery (schedule, pending, [bookingId]), maintenance, damage-claims, media (upload, [id]).
- **Finance:** payments ([id], [id]/refund), invoices (generate, [id], pdf, payment), contracts ([id], sign, pdf).
- **CRM & marketing:** clients ([id], verification, verification/documents), reviews ([id], respond), customer-segments, coupons (validate), marketing/campaigns.
- **AI:** risk-assessment, recommendations, pricing, kit-builder, demand-forecast, config, chatbot.
- **Other:** notifications, notification-templates, feature-flags, integrations, reports (dashboard, [type], export), analytics (utilization, trends, executive), pricing-rules, public (equipment, categories, brands, studios, packages, recommendations), webhooks/tap, audit-logs, translations, verification-documents.

---

## 7. Database (Prisma) – Highlights

- **Enums:** UserRole, BookingStatus, EquipmentCondition, PaymentStatus, FeatureFlagScope, NotificationChannel/Trigger, ReviewStatus, VerificationStatus, EventStatus, ProductStatus/Type, TranslationLocale, InventoryItemStatus, ImportJobStatus, etc.
- **Core models:** User, Role, Permission (RBAC), Equipment, Category, Brand, Booking, Quote, Contract, Invoice, Payment, Studio, Kit, Maintenance, DamageClaim, AuditLog, Event (event bus), Notification, etc.
- **Patterns:** Audit fields (createdAt, updatedAt, deletedAt, createdBy, etc.), soft delete, indexes on FKs and status/date fields.

---

## 8. Public vs Control Panel – Quick Reference

| Concern            | Public website                              | Control panel                                                                           |
| ------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Entry**          | `/`                                         | `/admin` → redirect to `/admin/dashboard`                                               |
| **Auth**           | Optional (modal or login/register pages)    | Required (middleware); role must be staff-side                                          |
| **Layout**         | Public header/footer, RTL                   | Admin sidebar + header + breadcrumbs, RTL                                               |
| **Access control** | None for catalog; session for cart/checkout | Permission per route + per sidebar item                                                 |
| **i18n**           | ar / en / zh messages                       | Arabic-first UI, sidebar ar/en labels                                                   |
| **Data**           | DB (featured equipment, etc.) + public APIs | Mix of live APIs and mock (wallet, users, technicians, kit builder, AI recommendations) |

---

## 9. Recommendations (Prioritized)

### Already Addressed (since previous audit)

- **Fail-open permissions:** Fixed – `use-permissions` is fail-closed; sidebar shows loading/error.
- **Admin profile 404:** Fixed – `/admin/profile` implemented with personal info and password change.

### High priority

1. **Wire mock data to APIs:** Wallet → `/api/wallet`; Users → `/api/admin/users` (and role assignment); Technicians → `/api/technicians`; Kit Builder → `/api/kits`; AI Recommendations → `/api/ai/recommendations`.
2. **Permissions API on error:** Consider returning 500 (or 401 if no session) instead of 200 with empty permissions, so client can distinguish “no permission” from “API error” if needed for UX/monitoring.

### Medium priority

3. **Audit log viewer:** Add `/admin/settings/audit-log` (or under Super) with filters and export.
4. **Booking create:** Availability check and cost preview before submit; deposit calculator.
5. **Orders:** Add `/admin/orders/[id]` and `/admin/orders/new` if orders are first-class; otherwise align with bookings and relabel/hide.
6. **Delivery schedule:** Add page for `/api/delivery/schedule` if ops need it.
7. **Payment detail:** Ensure refund (and collect/mark paid) are clear and use approval flow per security doctrine.
8. **Contract from booking:** One-click “View/Generate contract PDF” from booking detail.

### Lower priority

9. **Dashboard sub-pages:** Replace placeholders with real overview/revenue/activity widgets.
10. **Action Center:** Replace hardcoded system actions with real notifications/tasks API; persist dismiss.
11. **RBAC:** Role conflict checks when assigning roles (e.g. Finance vs Data Entry).

---

## 10. Document References

- **PRD:** `docs/PRD.md`
- **Architecture:** `docs/ARCHITECTURE.md`
- **Roles & security:** `docs/ROLES_AND_SECURITY.md`
- **Booking engine:** `docs/BOOKING_ENGINE.md`
- **Control panel analysis:** `CONTROL_PANEL_DEEP_ANALYSIS.md`
- **Control panel implementation plan:** `docs/public-website/control-panel-implementation-plan.md`
- **Action checklist:** `docs/public-website/action-checklist-summary.md`

---

**End of deep dive.**  
For implementation steps, use the control panel implementation plan and action checklist; for security and business rules, use PRD and ROLES_AND_SECURITY.
