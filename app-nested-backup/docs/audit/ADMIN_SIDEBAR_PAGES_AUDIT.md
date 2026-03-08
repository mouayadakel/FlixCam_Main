# Admin Sidebar vs Pages Audit

**Date:** 2026-03-03  
**Scope:** All admin routes under `/admin` vs items in the control panel sidebar (`admin-sidebar.tsx`).

## Summary

- **Control panel sidebar:** `src/components/layouts/admin-sidebar.tsx` (used in `admin/layout.tsx`).
- **Context sidebar:** `src/components/layouts/context-sidebar.tsx` is **not** used in the admin layout; only the main admin sidebar is.

All admin pages are now covered by the main sidebar (either as a direct link or under an `activePaths` parent), except the two intentionally excluded below.

---

## Pages that were missing and are now covered

These routes existed but were not included in any sidebar `href` or `activePaths`. They are now wired into the sidebar so the correct section stays active and they are reachable from the same section:

| Route | Now under sidebar section |
|-------|----------------------------|
| `/admin/orders` | Booking Engine → Bookings (`activePaths`) |
| `/admin/notifications` | Command Center → Action Center (`activePaths`) |
| `/admin/ai` | Sales Tools → AI Dashboard (`activePaths`) |
| `/admin/inventory` | Inventory → Equipment (`activePaths`) |
| `/admin/wallet` | Finance & Legal → Payments (`activePaths`) |
| `/admin/finance` | Finance & Legal → Reports & Analytics (`activePaths`) |
| `/admin/reports` | Finance & Legal → Reports & Analytics (`activePaths`) |
| `/admin/discounts` | CRM & Marketing → Coupons & Discounts (`activePaths`) |
| `/admin/vendors/payouts` | Vendors → Vendors (`activePaths`) |
| `/admin/ops/warehouse/check-in` | Field Operations → Warehouse (`activePaths`) |
| `/admin/ops/warehouse/check-out` | Field Operations → Warehouse (`activePaths`) |
| `/admin/ops/warehouse/inventory` | Field Operations → Warehouse (`activePaths`) |
| `/admin/ops/delivery/schedule` | Field Operations → Delivery (`activePaths`) |
| `/admin/settings/payment-gateways` | Settings → Payment & Delivery (`activePaths`) |
| `/admin/settings/policies` | Settings → General (`activePaths`) |
| `/admin/settings/ai-control` | Settings → Integrations & AI (`activePaths`) |
| `/admin/translations` | Settings → General (`activePaths`) |
| `/admin/ai-translations` | Settings → General (`activePaths`) |

No new sidebar *items* were added; existing sections were extended so these URLs are part of the correct parent and stay highlighted when visited.

---

## Intentionally not in the sidebar

| Route | Reason |
|-------|--------|
| `/admin/profile` | User profile; expected to be reached from the header user menu, not sidebar. |
| `/admin/super` | Super-admin only; intentionally not linked in the main sidebar. |

---

## Redirect-only route

| Route | Behavior |
|-------|----------|
| `/admin/settings/faq` | Redirects to `/admin/cms/faq`. No need to add to sidebar; CMS → FAQ is already there. |

---

## How to re-check

1. List all admin routes: under `src/app/admin` (including `(routes)/` and root `page.tsx`, `dashboard/page.tsx`, `translations/page.tsx`, `ai-translations/page.tsx`).
2. For each route, ensure either:
   - It is the `href` of a sidebar item, or
   - It is under an `activePaths` entry of an item (path equals or starts with that entry).
3. Detail/dynamic routes (e.g. `[id]`, `new`, `edit`) are considered covered if their parent list/section is in the sidebar.

---

## File changed

- **`src/components/layouts/admin-sidebar.tsx`**  
  Extended `activePaths` for the relevant items so every non-super, non-profile admin page is under a sidebar section.
