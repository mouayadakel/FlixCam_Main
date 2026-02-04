# Next Phase & Step

**Last completed:** Roles & Permissions first step (detail wired to API, list labels + permissions, New Role disabled)  
**Updated:** February 3, 2025

---

## Current position

- **Admin:** Recurring series + Kits (API + UI), table skeletons, empty states, dashboard placeholders, Orders/Studios/Contracts/Payments/Marketing list UX improved. **Roles & Permissions:** list and detail use real API; permissions in list; New Role disabled with tooltip.
- **Remaining gaps:** Audit log (P0), Roles short-term (service/audit/policy/validator), edit role route, many MISSING detail/create pages, public website build-out.

---

## Next phase: **Roles & Permissions completion**

Align with `docs/admin/ROLES_AND_PERMISSIONS_PAGE_REPORT.md`: fix critical gaps on `/admin/settings/roles` and role detail so the page is production-ready and consistent with project standards.

**Goals:**

1. Role **detail page** uses real API data (no hardcoded placeholder).
2. **List page** shows correct role names and permissions (fix ROLE_LABELS + permissions in list).
3. **Auth** on detail page; **New Role** button handled (disable or tooltip until custom roles exist).
4. (Optional short-term) Service layer, audit logging, policy, validator extraction.

---

## First step (do this next)

**Wire role detail page to API and fix list labels/permissions.**

1. **Detail page** (`src/app/admin/(routes)/settings/roles/[id]/page.tsx`)
   - Convert to client component (or keep server and fetch in a client child).
   - Fetch `GET /api/admin/roles/[id]` using `params.id`.
   - Render: role name, description, permissions list, users table (from API).
   - Add session/permission check: require `settings.manage_roles`; redirect or 403 if unauthorized.
   - Remove hardcoded data and non-functional Save buttons (or hide until edit is implemented).

2. **List page** (`src/app/admin/(routes)/settings/roles/page.tsx`)
   - Extend `ROLE_LABELS` to all 12 API roles: `ADMIN`, `SALES_MANAGER`, `ACCOUNTANT`, `WAREHOUSE_MANAGER`, `TECHNICIAN`, `CUSTOMER_SERVICE`, `MARKETING_MANAGER`, `RISK_MANAGER`, `APPROVAL_AGENT`, `AUDITOR`, `AI_OPERATOR`, `DATA_ENTRY`.
   - Fix transformation: use `role.name` from API when present (so list shows “Sales Manager” not “SALES_MANAGER”).
   - Show permissions in the list: either include permissions in list API response, or fetch each role’s permissions (e.g. from detail API) and set `permissions` in transformed data so the table chips are populated.

3. **New Role button**
   - Disable and add tooltip: “Custom roles are not supported yet” (or hide until POST is implemented).

After this first step, the Roles & Permissions page will be functionally correct and ready for the short-term improvements (service layer, audit, policy, validator) when you choose to do them.

---

## After Roles & Permissions (optional order)

### Recommended next

1. **Audit log page** (P0 in production doc)  
   - Add `/admin/settings/audit-log`: list audit entries (action, user, resource, timestamp) with filters and search.  
   - Depends on `AuditService` / audit table already in use; wire UI to existing API or add `GET /api/audit` if missing.

2. **Roles short-term (standards)**  
   - Add `lib/services/role.service.ts`, `lib/policies/role.policy.ts`, `lib/validators/role.validator.ts`; use in role APIs.  
   - Call `AuditService.log()` when role detail is viewed or (later) when roles are changed.  
   - Optional: add `/admin/settings/roles/[id]/edit` (read-only for system roles; edit when custom roles exist).

### Later

- **Custom roles:** DB schema for custom roles, POST create, edit flow.  
- **Public website / booking flow:** `docs/public-website/`, `COMPLETE_PRODUCTION_READY_PLAN.md`.  
- **Other admin gaps:** Missing detail/create pages (invoices, payments, clients, coupons, etc.) per `ADMIN_PANEL_PRODUCTION_READY_COMPLETE_DETAILED.md`.

---

## Reference

- Roles report: `docs/admin/ROLES_AND_PERMISSIONS_PAGE_REPORT.md`
- API: `GET /api/admin/roles`, `GET /api/admin/roles/[id]`
- Permissions: `src/lib/auth/permissions.ts`
- Project rules: `.cursorrules` (security, audit, events, service/policy layers)
