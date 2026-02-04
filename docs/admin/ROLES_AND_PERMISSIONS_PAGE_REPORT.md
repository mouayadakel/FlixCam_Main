# Admin Roles & Permissions Page — Technical Report

**Route:** `/admin/settings/roles`  
**Generated:** February 3, 2025  
**Purpose:** Handoff report for software engineer — current implementation, gaps, and recommendations.

---

## 1. Executive Summary

The admin Roles & Permissions page (`/admin/settings/roles`) provides read-only listing of predefined system roles with user counts. View and Edit links exist, but the detail page is a placeholder with hardcoded data. Custom role creation is not supported. Security controls (auth, permission checks, rate limiting) are in place; audit logging and event emissions are missing per project standards.

---

## 2. Page Structure & File Map

| File | Type | Purpose |
|------|------|---------|
| `src/app/admin/(routes)/settings/roles/page.tsx` | Client Component | Roles list UI, stats, table, actions |
| `src/app/admin/(routes)/settings/roles/[id]/page.tsx` | Server Component | Role detail — **placeholder, not functional** |
| `src/app/api/admin/roles/route.ts` | API | GET list, POST create (create returns 400) |
| `src/app/api/admin/roles/[id]/route.ts` | API | GET role detail with permissions and users |
| `src/lib/auth/permissions.ts` | Shared | Permission constants, `hasPermission`, role mappings |

---

## 3. Implemented Features

### 3.1 Roles List Page

- **Stats cards:** Total roles, system roles, custom roles
- **Table columns:** Role (badge), Description, Permissions (up to 3 chips + overflow), Users count, Type (نظام/مخصص), Actions
- **Actions:** View (Eye) → `/admin/settings/roles/[id]`; Edit (Edit) → `/admin/settings/roles/[id]/edit` — Edit is hidden for system roles
- **Refresh:** Button reloads data from `/api/admin/roles`
- **New Role:** Button present but has no `onClick` or navigation
- **RTL:** `dir="rtl"` and Arabic labels
- **Loading:** Skeleton loaders during fetch
- **Empty state:** Message when no roles returned
- **Error handling:** Toast on fetch failure

### 3.2 Role Detail API (GET `/api/admin/roles/[id]`)

- Returns role metadata (id, name, description)
- Returns permissions array from `ROLE_DETAILS`
- Returns up to 100 users with that role
- 404 if role ID not in predefined list

### 3.3 Security (API Layer)

- **Auth:** `auth()` — 401 if no session
- **Permission:** `hasPermission(userId, PERMISSIONS.SETTINGS_MANAGE_ROLES)` — 403 if denied
- **Rate limiting:** `rateLimitAPI(request)` — 429 if exceeded
- **Validation:** POST uses Zod `createRoleSchema` (name, description, permissions optional)

---

## 4. Predefined Roles (12)

| Role ID | Name | Description |
|---------|------|-------------|
| ADMIN | Admin | Full operational access |
| SALES_MANAGER | Sales Manager | Manage sales, bookings, quotes, clients |
| ACCOUNTANT | Accountant | Financial operations and reporting |
| WAREHOUSE_MANAGER | Warehouse Manager | Equipment and inventory management |
| TECHNICIAN | Technician | Equipment maintenance and inspection |
| CUSTOMER_SERVICE | Customer Service | Customer support and basic operations |
| MARKETING_MANAGER | Marketing Manager | Marketing campaigns and analytics |
| RISK_MANAGER | Risk Manager | Risk assessment and approvals |
| APPROVAL_AGENT | Approval Agent | Process approval requests |
| AUDITOR | Auditor | Read-only access for auditing |
| AI_OPERATOR | AI Operator | AI features and automation |
| DATA_ENTRY | Data Entry | Basic data entry access |

Permission sets per role are defined in `ROLE_DETAILS` in `src/app/api/admin/roles/[id]/route.ts`.

---

## 5. Known Gaps & Issues

### 5.1 Critical

| Issue | Location | Description |
|-------|----------|-------------|
| Detail page placeholder | `roles/[id]/page.tsx` | Uses hardcoded role name, description, and 5 permissions. Does not fetch from API or use `params.id`. Save buttons do nothing. |
| Edit route missing | N/A | Links to `/admin/settings/roles/[id]/edit` but route does not exist. |
| Custom roles disabled | `roles/route.ts` POST | Always returns 400: "Custom roles not yet supported". |
| Permissions empty in list | `roles/page.tsx` | `permissions: []` in transformed data; list shows empty permission chips. |
| ROLE_LABELS mismatch | `roles/page.tsx` | Uses ADMIN, MANAGER, WAREHOUSE, SALES, ACCOUNTANT, TECHNICIAN, CUSTOMER. API returns SALES_MANAGER, CUSTOMER_SERVICE, etc. Some roles will show raw ID. |

### 5.2 Architecture / Standards

| Issue | Description |
|-------|-------------|
| No audit logging | `AuditService` imported in API but never used. No audit trail for role view/management. |
| No event emissions | No `EventBus.emit()` for role-related actions. |
| No service layer | Business logic in API routes instead of `lib/services/role.service.ts`. |
| No policy layer | No `lib/policies/role.policy.ts`. |
| No validator module | Zod schema inline in API route; no `lib/validators/role.validator.ts`. |
| Detail page no auth | `[id]/page.tsx` is Server Component with no session/permission check. |

### 5.3 Minor

| Issue | Description |
|-------|-------------|
| New Role button | No handler; should either implement flow or hide/disable until custom roles are supported. |
| Search/filter | Not implemented. |
| Pagination | Not needed for 12 roles; could be required if custom roles added. |
| User count in detail | Uses `users.length` (capped at 100) instead of true DB count. |

---

## 6. Permission System Overview

### 6.1 Access Control

- **Required permission:** `settings.manage_roles` (`PERMISSIONS.SETTINGS_MANAGE_ROLES`)
- **Check flow:** `hasPermission(userId, permission)` → 1) DB `UserPermission`, 2) fallback to role-based matrix
- **Role mapping:** Prisma `UserRole` enum mapped to internal names (e.g. ADMIN→admin, WAREHOUSE_MANAGER→warehouse) in `permissions.ts`

### 6.2 Permission Sources

1. **Explicit:** `UserPermission` records in DB
2. **Role-based:** `ROLE_PERMISSIONS` in `permissions.ts` and `ROLE_DETAILS` in `api/admin/roles/[id]/route.ts`

---

## 7. Recommendations

### 7.1 Immediate

1. **Wire detail page to API**  
   Fetch `GET /api/admin/roles/[id]` in `[id]/page.tsx`, display real role name, description, permissions, and users.

2. **Align ROLE_LABELS with API**  
   Extend `ROLE_LABELS` in `roles/page.tsx` to cover all 12 roles (SALES_MANAGER, CUSTOMER_SERVICE, WAREHOUSE_MANAGER, etc.).

3. **Show permissions in list**  
   Either load permissions in list API or fetch per role; populate `permissions` in transformed data so the table displays them.

4. **Add auth to detail page**  
   Check session and `settings.manage_roles` before rendering; redirect or show 403 if unauthorized.

5. **Handle New Role button**  
   Disable or hide until custom roles are implemented, or add a tooltip explaining they are not yet supported.

### 7.2 Short-term

1. **Introduce service layer**  
   Create `lib/services/role.service.ts` and move role logic out of API routes.

2. **Add audit logging**  
   Log role views and any future management actions via `AuditService.log()`.

3. **Add policy layer**  
   Create `lib/policies/role.policy.ts` for business rules around role operations.

4. **Extract validator**  
   Move Zod schema to `lib/validators/role.validator.ts` and reuse in API.

### 7.3 Longer-term (Custom Roles)

1. **Schema change**  
   Add `Role` model (or similar) if custom roles are required; current design uses enum only.

2. **Create role flow**  
   Implement POST handler, form, validation, and permission assignment.

3. **Edit role flow**  
   Implement `[id]/edit` route and update permissions for custom roles.

---

## 8. API Contract Reference

### GET `/api/admin/roles`

**Auth:** Required  
**Permission:** `settings.manage_roles`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ADMIN",
      "name": "Admin",
      "description": "Full operational access",
      "userCount": 2
    }
  ]
}
```

### GET `/api/admin/roles/[id]`

**Auth:** Required  
**Permission:** `settings.manage_roles`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "ADMIN",
    "name": "Admin",
    "description": "Full operational access",
    "permissions": ["booking.create", "booking.read", ...],
    "userCount": 2,
    "users": [
      { "id": "...", "email": "...", "name": "...", "createdAt": "..." }
    ]
  }
}
```

**Response 404:** `{ "error": "Role not found" }`

### POST `/api/admin/roles`

**Auth:** Required  
**Permission:** `settings.manage_roles`  
**Status:** Returns 400 — custom roles not supported.

---

## 9. Contact / Notes

- All relevant code lives under `src/app/admin/(routes)/settings/roles` and `src/app/api/admin/roles`.
- Permission definitions and helpers: `src/lib/auth/permissions.ts`.
- Project rules: `.cursorrules` — security, audit, events, service/policy layers.

---

*End of report*
