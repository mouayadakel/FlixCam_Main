# Roles & Permissions Audit Report

**Generated:** 2026-03-17  
**Scope:** UserRole enum, legacy ROLE_PERMISSIONS, admin sidebar, API routes, RBAC seed

---

## 1. Role Mapping (UserRole → Permission Group)

| UserRole | Maps To | Dashboard |
|----------|---------|-----------|
| ADMIN | admin | /admin/dashboard |
| VENDOR | vendor | /vendor/dashboard |
| CUSTOMER | client | /portal/dashboard |
| DATA_ENTRY | client | /portal/dashboard |
| WAREHOUSE_MANAGER | warehouse | /admin/dashboard |
| TECHNICIAN | technician | /admin/dashboard |
| SALES_MANAGER | staff | /admin/dashboard |
| ACCOUNTANT | staff | /admin/dashboard |
| CUSTOMER_SERVICE | staff | /admin/dashboard |
| MARKETING_MANAGER | staff | /admin/dashboard |
| RISK_MANAGER | staff | /admin/dashboard |
| APPROVAL_AGENT | staff | /admin/dashboard |
| AUDITOR | staff | /admin/dashboard |
| AI_OPERATOR | staff | /admin/dashboard |

---

## 2. Permission Groups vs Admin Sidebar Requirements

### Admin Sidebar Items & Required Permissions

| Sidebar Item | Route | Required Permission |
|--------------|-------|---------------------|
| Dashboard | /admin/dashboard | dashboard.read |
| Action Center | /admin/action-center | dashboard.read |
| Live Operations | /admin/live-ops | dashboard.read |
| Bookings | /admin/bookings | booking.read |
| Quotes | /admin/quotes | quote.read |
| Recurring Bookings | /admin/recurring-bookings | booking.read |
| Calendar | /admin/calendar | booking.read |
| AI Dashboard | /admin/ai-dashboard | ai.use |
| Kit Builder | /admin/kit-builder | kit.read |
| Dynamic Pricing | /admin/dynamic-pricing | pricing.read |
| Shoot Types | /admin/shoot-types | equipment.read |
| Equipment | /admin/inventory/equipment | equipment.read |
| Kits & Bundles | /admin/inventory/kits | kit.read |
| Studios | /admin/studios | studio.read |
| Import | /admin/inventory/import | import.read |
| AI Status | /admin/inventory/ai-status | equipment.read |
| Warehouse | /admin/ops/warehouse | warehouse.read |
| Delivery | /admin/ops/delivery | delivery.read |
| Technicians | /admin/technicians | user.read |
| Maintenance & Damage | /admin/maintenance | maintenance.read |
| Invoices | /admin/invoices | invoice.read |
| Payments | /admin/payments | payment.read |
| Contracts | /admin/contracts | contract.read |
| Promissory Notes | /admin/promissory-notes | settings.read |
| Reports & Analytics | /admin/finance/reports | reports.read_financial |
| Vendors | /admin/vendors | vendor.read |
| Clients | /admin/clients | client.read |
| Coupons & Discounts | /admin/coupons | coupon.read |
| Marketing | /admin/marketing | marketing.read |
| CMS | /admin/cms | settings.update |
| Footer | /admin/cms/footer | settings.update |
| Studios CMS | /admin/cms/studios | cms.studio.read |
| Messaging Center | /admin/cms/messaging-center | settings.read |
| Hero Banners | /admin/settings/hero-banners | settings.update |
| Blog Posts | /admin/blog | settings.read |
| Blog Categories | /admin/blog/categories | settings.read |
| Blog Authors | /admin/blog/authors | settings.read |
| Blog Calendar | /admin/blog/calendar | settings.read |
| Blog Analytics | /admin/blog/analytics | settings.read |
| General Settings | /admin/settings | settings.read |
| Users & Roles | /admin/users | user.read |
| Payment & Delivery | /admin/settings/checkout | settings.read |
| Website | /admin/settings/website-pages | settings.read |
| Integrations & AI | /admin/settings/integrations | settings.read |

---

## 3. Role Permission Coverage Matrix

### admin (ADMIN)
- **Status:** ✅ Full coverage
- **Permissions:** All except system.read_only_mode, system.clear_cache, system.view_logs, user.delete
- **Gaps:** None

### staff (SALES_MANAGER, ACCOUNTANT, CUSTOMER_SERVICE, MARKETING_MANAGER, RISK_MANAGER, APPROVAL_AGENT, AUDITOR, AI_OPERATOR)
- **Status:** ⚠️ Partial coverage – multiple gaps

| Permission | Has? | Needed For |
|------------|------|------------|
| dashboard.read | ✅ | Dashboard, Action Center, Live Ops |
| booking.read | ✅ | Bookings, Recurring, Calendar |
| booking.create | ✅ | Create bookings |
| booking.update | ✅ | Update bookings |
| quote.read | ✅ | Quotes |
| quote.create | ✅ | Create quotes |
| quote.update | ✅ | Update quotes |
| equipment.read | ✅ | Equipment, Shoot Types, AI Status |
| payment.read | ✅ | Payments |
| invoice.read | ✅ | Invoices |
| contract.read | ✅ | Contracts |
| client.read | ✅ | Clients |
| client.create | ✅ | Create clients |
| client.update | ✅ | Update clients |
| maintenance.read | ✅ | Maintenance |
| maintenance.update | ✅ | Maintenance |
| reports.read | ✅ | General reports |
| ai.use | ✅ | AI Dashboard |
| kit.read | ❌ | Kit Builder, Kits & Bundles |
| pricing.read | ❌ | Dynamic Pricing |
| studio.read | ❌ | Studios |
| warehouse.read | ❌ | Warehouse |
| delivery.read | ❌ | Delivery |
| user.read | ❌ | Technicians, Users & Roles |
| settings.read | ❌ | Promissory Notes, Messaging, Blog, General Settings, Payment & Delivery, Website, Integrations |
| settings.update | ❌ | CMS, Footer, Hero Banners |
| reports.read_financial | ❌ | Reports & Analytics |
| vendor.read | ❌ | Vendors |
| coupon.read | ❌ | Coupons |
| marketing.read | ❌ | Marketing |
| import.read | ❌ | Import |
| cms.studio.read | ❌ | Studios CMS |

**Recommendation:** Staff roles need additional permissions based on their function:
- **SALES_MANAGER:** Add kit.read, pricing.read, studio.read, quote.convert, quote.delete
- **ACCOUNTANT:** Add reports.read_financial, settings.read (for promissory notes)
- **CUSTOMER_SERVICE:** Add quote.create (has it), client.create (has it) – consider settings.read for limited support tools
- **MARKETING_MANAGER:** Add coupon.read, marketing.read (staff has neither!)
- **AUDITOR:** Add settings.read, audit.read, reports.read_financial
- **AI_OPERATOR:** Add kit.read, pricing.read (has ai.* but not kit/pricing)

### warehouse (WAREHOUSE_MANAGER)
- **Status:** ⚠️ Partial – missing some sidebar items

| Permission | Has? | Needed For |
|------------|------|------------|
| warehouse.read | ✅ | Warehouse |
| warehouse.check_in | ✅ | Check-in |
| warehouse.check_out | ✅ | Check-out |
| warehouse.inventory | ✅ | Inventory |
| equipment.read | ✅ | Equipment |
| equipment.checkout | ✅ | - |
| equipment.checkin | ✅ | - |
| booking.read | ✅ | Bookings |
| booking.update | ✅ | - |
| dashboard.read | ✅ | Dashboard |
| delivery.read | ❌ | Delivery |
| maintenance.read | ❌ | Maintenance |
| user.read | ❌ | Technicians |

**Recommendation:** Add delivery.read, maintenance.read. Technicians page (user.read) may be intentional to restrict.

### technician (TECHNICIAN)
- **Status:** ⚠️ Minimal – no settings, no user management

| Permission | Has? | Needed For |
|------------|------|------------|
| equipment.read | ✅ | Equipment |
| equipment.update | ✅ | - |
| maintenance.* | ✅ | Maintenance |
| warehouse.read | ✅ | Warehouse |
| dashboard.read | ✅ | Dashboard |
| booking.read | ✅ | Bookings |

**Recommendation:** Appropriate for field technicians. No access to admin settings or user management.

### driver (Delivery – RBAC only, no UserRole)
- **Status:** ✅ Appropriate for delivery drivers
- **Permissions:** delivery.read, delivery.update_status, delivery.complete, booking.read, dashboard.read

### client (CUSTOMER, DATA_ENTRY)
- **Status:** ✅ Appropriate for portal/customers
- **Permissions:** booking.create, booking.read, booking.cancel, payment.read, invoice.read, contract.read, contract.sign, dashboard.read, quote.read, equipment.read
- **Note:** DATA_ENTRY in role-details.ts has different permissions (equipment/category/SEO) – that is for staff data entry, not customer. The permissions.ts mapping correctly treats both CUSTOMER and DATA_ENTRY as client for portal users.

### vendor (VENDOR)
- **Status:** ✅ Appropriate for vendor dashboard
- **Permissions:** vendor.read, vendor.update, equipment.read/create/update, booking.read, payment.read, dashboard.read

---

## 4. API Permission Inconsistencies

### settings.write vs settings.update
- **Issue:** Several API routes check `settings.write` (e.g. delivery-zones, branches, payment-gateways, checkout, tax, featured-display-count) but `PERMISSIONS` only defines `settings.read` and `settings.update`.
- **Impact:** Users with `settings.update` may fail `settings.write` checks (no wildcard match).
- **Recommendation:** Either add `settings.write` to PERMISSIONS and grant it where settings.update is granted, or replace all `settings.write` checks with `settings.update`.

### role-details.ts vs permissions.ts
- **Issue:** `role-details.ts` defines ROLE_DETAILS for UserRole enum keys (ADMIN, SALES_MANAGER, etc.) but this is **not** used by `hasPermission()`. The actual permission check uses `permissions.ts` roleMapping → ROLE_PERMISSIONS.
- **Impact:** role-details.ts is effectively dead for permission checks. It may be used for UI display only.
- **Recommendation:** Align role-details.ts with permissions.ts or remove if unused.

---

## 5. Middleware Route Protection

| Route Prefix | Required | Client/Customer Redirect |
|--------------|----------|--------------------------|
| /admin | super_admin, admin, staff, warehouse, driver, technician | data_entry, customer → /portal/dashboard |
| /admin/settings | super_admin, admin | Others → /admin/dashboard |
| /admin/super | super_admin | Others → /admin/dashboard |
| /portal | Any authenticated | - |
| /vendor | Any authenticated | - |

**Note:** Middleware uses `session.user.role` (lowercased). UserRole CUSTOMER → "customer", DATA_ENTRY → "data_entry". Both redirect to portal correctly.

---

## 6. RBAC Seed (USE_NEW_RBAC=true)

When `USE_NEW_RBAC=true`, permissions come from `AssignedUserRole` + `RolePermission` in DB. Seed defines:

| Role Name | Permissions |
|-----------|-------------|
| super_admin | * |
| admin | booking.*, equipment.*, client.*, invoice.*, payment.*, contract.*, quote.*, reports.*, vendor.*, user.read/create/update, settings.read/update, warehouse.read, maintenance.read, delivery.read, approval.read, dashboard.read |
| finance | invoice.*, payment.*, reports.read_financial, booking.read, client.read, dashboard.read |
| data_entry | equipment.create/read/update_metadata, category.*, brand.*, seo.*, studio.read |
| warehouse_manager | equipment.*, warehouse.*, maintenance.*, delivery.read/assign, booking.read/update, reports.read_warehouse |
| delivery | delivery.read/update_status/complete, booking.read, equipment.read, client.read, warehouse.check_out |
| technician | equipment.read, maintenance.*, warehouse.read, booking.read |
| sales_manager | quote.*, booking.*, client.read/update, invoice.read, dashboard.read |
| customer_service | booking.read/update, client.read/update, quote.read, invoice.read |
| marketing_manager | marketing.*, coupon.*, client.read, reports.read, dashboard.read |
| risk_manager | approval.*, client.read, booking.read, payment.read, ai.risk_assessment |
| approval_agent | approval.read/approve/reject, booking.read, client.read |
| auditor | audit.read/export, reports.read, booking.read, invoice.read, payment.read |
| ai_operator | ai.*, equipment.read, category.read, dashboard.read |

**Gap:** RBAC seed has no `client` or `customer` role for public sign-ups. Legacy User.role (CUSTOMER/DATA_ENTRY) fallback is used when no AssignedUserRole.

---

## 7. Recommendations Summary

| Priority | Item |
|----------|------|
| High | Fix `settings.write` usage – use `settings.update` or add `settings.write` to PERMISSIONS |
| High | Add missing permissions to **staff** for common admin pages: kit.read, pricing.read, studio.read, warehouse.read, delivery.read, user.read, settings.read, vendor.read, coupon.read, marketing.read, import.read, reports.read_financial |
| Medium | Consider splitting staff into sub-roles (e.g. sales_staff vs finance_staff) with different permission sets |
| Medium | Add CUSTOMER to role-details.ts for consistency (or document that role-details is display-only) |
| Low | Add `client` role to RBAC seed for USE_NEW_RBAC mode when assigning customer users |

---

## 8. Files Reference

| File | Purpose |
|------|---------|
| `src/lib/auth/permissions.ts` | ROLE_PERMISSIONS, roleMapping, hasPermission |
| `src/lib/auth/role-details.ts` | ROLE_DETAILS (display/metadata, not used for hasPermission) |
| `src/lib/auth/matches-permission.ts` | Wildcard matching |
| `src/middleware.ts` | Route protection, role-based redirect |
| `src/components/layouts/admin-sidebar.tsx` | Sidebar items + permission requirements |
| `prisma/seed-rbac.ts` | RBAC Role + RolePermission (when USE_NEW_RBAC=true) |
