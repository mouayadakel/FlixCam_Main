# FlixCam RBAC System - Complete Implementation Plan

> **Purpose**: Implementation specification for Cursor. No coding required from product owner—every table, field, API endpoint, UI component, permission, and business rule is defined here.

---

## Part 1: Core Requirements

### 1.1 System Principles

- **Role-based only**: Permissions assigned to roles; users get permissions through role assignment only. **NO** per-user permission overrides.
- **Database-driven**: All roles and permissions stored in PostgreSQL.
- **Super Admin bypass**: Super Admin role bypasses all permission checks (or only RBAC management—see Decision Point below).
- **Deny by default**: Users cannot access anything unless explicitly granted through their role.
- **Multi-role support**: Users can have multiple roles simultaneously.
- **Audit everything**: Log all permission changes, role assignments, and access attempts.
- **Performance**: Permission checks must complete in under 50ms using Redis caching.

### 1.2 Data Entry Role (Restricted)

**Purpose**: Enter and maintain equipment metadata, SEO, categories, and brands—no booking creation or financial access.

**Key Permissions**:

- Equipment: create, read, update (metadata only: name, description, SKU, serial number, specifications, images)
- Category: create, view, update, delete
- Brand: create, view, update, delete
- SEO: edit meta titles, meta descriptions, alt text, slugs, schema markup
- Studio: view, update (basic info only)

**Field-Level Restrictions**:

- Cannot edit pricing, rental rates, or availability
- Cannot access booking creation/editing
- Cannot access client data
- Cannot access financial fields (cost, depreciation)

**UI Impact**: Data Entry users see only "Equipment Library," "Categories," "Brands," and "SEO Settings" in sidebar.

### 1.3 Pure Role-Based Permissions (No User Overrides)

**Remove**:

- `UserPermission` table
- User permission override APIs (POST/DELETE user permissions)
- "Add Permission Override" UI in user management

**Permission resolution**: `User Roles → Role Permissions` (no user override layer).

---

## Part 2: Database Schema

### 2.1 Tables to Create

#### PermissionCategory

- id, name (unique), nameAr, description, sortOrder, createdAt, updatedAt

#### Permission (extend existing)

- Add: categoryId, nameAr, descriptionAr, isSystem, sortOrder
- Keep: id, name, description, createdAt, updatedAt, deletedAt

#### Role

- id, name (unique), displayName, displayNameAr, description, descriptionAr, isSystem, isDefault, priority, color, createdAt, createdBy, updatedAt, updatedBy, deletedAt, deletedBy

#### RolePermission

- id, roleId, permissionId, createdAt, createdBy
- Unique: [roleId, permissionId]

#### UserRole (multi-role)

- id, userId, roleId, isPrimary, assignedAt, assignedBy, expiresAt
- Unique: [userId, roleId]

#### RoleConflict

- id, roleAId, roleBId, reason, createdAt
- Unique: [roleAId, roleBId]

#### MenuItem

- id, parentId, name, label, labelAr, icon, href, categoryId, sortOrder, isActive, requiresAllPermissions, createdAt, updatedAt

#### MenuItemPermission

- id, menuItemId, permissionId
- Unique: [menuItemId, permissionId]

### 2.2 Tables to Remove

- **UserPermission** (after migration and code removal)

### 2.3 AuditLog Extension

Add or support: beforeState, afterState, entityType, entityId for RBAC audit events.

---

## Part 3: Required Roles (7 System Roles)

| Role              | Purpose                   | Key Focus                                  |
| ----------------- | ------------------------- | ------------------------------------------ |
| Super Admin       | Full system control       | Everything                                 |
| Admin             | Day-to-day operations     | Bookings, clients, equipment               |
| Finance           | Financial operations      | Invoices, payments, reports                |
| Data Entry        | Metadata and SEO          | Equipment details, categories, brands, SEO |
| Warehouse Manager | Inventory and maintenance | Equipment tracking, warehouse, maintenance |
| Delivery          | Pickup and delivery       | Delivery tasks, equipment check-out        |
| Technicians       | Equipment maintenance     | Maintenance tickets, equipment condition   |

### 3.1 Role Conflicts (Segregation of Duties)

- Finance + Data Entry
- Warehouse Manager + Finance
- Data Entry + Admin

---

## Part 4: Permission Categories & Definitions

Use pattern: `category.action` (e.g., `booking.create`, `equipment.edit_metadata`).

**Categories**: Booking, Equipment, Payment, Client, Invoice, Contract, Quote, Maintenance, Reports, Marketing, Coupon, Settings, User, Studio, Category, Brand, Delivery, Warehouse, Approval, Audit, Dashboard, SEO, System.

**Data Entry permissions**: equipment.create, equipment.read, equipment.edit*metadata; category.*; brand.\_; seo.edit_meta_titles, seo.edit_meta_descriptions, seo.edit_slugs, seo.edit_alt_text; studio.view, studio.update.

**Explicitly NOT for Data Entry**: booking._, payment._, invoice.\*, equipment.edit_pricing.

---

## Part 5: Field-Level Access Control

Create `src/lib/auth/field-permission-service.ts` with `EQUIPMENT_FIELD_PERMISSIONS` and `canEditField(userRoles, fieldName)`.

**Metadata (Data Entry can edit)**: name, description, specifications, images, sku, serialNumber.
**Restricted (Data Entry cannot edit)**: dailyRate, weeklyRate, replacementCost, isAvailable, currentLocation.

Map Product catalog fields similarly where relevant.

---

## Part 6: Backend APIs

### Role Management

- GET/POST /api/admin/roles
- GET/PATCH/DELETE /api/admin/roles/[id]
- POST /api/admin/roles/[id]/permissions
- POST /api/admin/roles/[id]/clone

### Permission Management

- GET /api/admin/permissions
- GET /api/admin/permissions/categories

### User Role Assignment

- GET/POST /api/admin/users/[id]/roles
- DELETE /api/admin/users/[id]/roles/[roleId]
- GET /api/admin/users/[id]/effective-permissions

### Menu

- GET /api/admin/menu
- PATCH /api/admin/menu/[id]
- GET /api/user/menu (filtered by user permissions)

### Removed

- POST/DELETE /api/admin/users/[id]/permissions

---

## Part 7: Frontend Requirements

- Role management UI: /admin/settings/roles (list, create, edit, clone)
- Permission matrix component (grouped by category, checkboxes)
- User management: Roles section with assign/remove role, conflict detection
- PermissionSidebar: fetch /api/user/menu, render only permitted items
- ProtectedRoute, PermissionGate, usePermission() hook

---

## Part 8: Migration Strategy

1. **Phase 1**: Create new tables, seed roles and permissions.
2. **Phase 2**: Implement PermissionService, MenuService, APIs; Redis caching.
3. **Phase 3**: Migrate User.role → UserRole; handle retired roles.
4. **Phase 4**: Build role UI, dynamic sidebar, permission gates.
5. **Phase 5**: Feature flag cutover, rollback plan.
6. **Phase 6**: Remove UserPermission, old role enum, legacy code.

---

## Part 9: Current FlixCam Gaps & Adjustments

### Role Set Mapping

- Add: Super Admin, Delivery
- Map: Admin→ADMIN, Finance→ACCOUNTANT, Data Entry→DATA_ENTRY, Warehouse Mgr→WAREHOUSE_MANAGER, Technicians→TECHNICIAN
- Retire or map: SALES_MANAGER, CUSTOMER_SERVICE, MARKETING_MANAGER, RISK_MANAGER, APPROVAL_AGENT, AUDITOR, AI_OPERATOR

### Product vs Equipment

- FlixCam has Product (catalog) and Equipment (physical units)
- Map Data Entry permissions to both Product and Equipment metadata/SEO
- Apply field-level restrictions to Product pricing fields

### Super Admin vs "No Admin Bypass"

- ROLES_AND_SECURITY.md forbids admin bypass
- Option A: Super Admin bypass only for RBAC management
- Option B: Document Super Admin as explicit exception

### Redis

- Use existing ioredis (getRedisClient) for role/menu caching

### Permission Naming

- Use consistent pattern: client.view, seo.view_reports (not client.read, seo.view_seo_reports)

---

## Part 10: Success Criteria

- Super Admin can manage roles and permissions
- Data Entry sees only Equipment, Categories, Brands, SEO
- Data Entry cannot access booking or financial pages
- Toxic role combinations are blocked with clear errors
- Permission checks < 50ms (95th percentile)
- All permission changes logged
- Zero user lockouts after migration
- No hardcoded permissions remain

---

## Part 11: Files Structure

```
prisma/
├── schema.prisma (updated)
└── seed-rbac.ts

src/lib/auth/
├── permission-service.ts
├── field-permission-service.ts
├── menu-service.ts
└── role-service.ts

src/app/api/admin/
├── roles/
├── permissions/
├── users/[id]/roles/
└── menu/

src/app/api/user/
└── menu/route.ts

src/components/
├── layouts/permission-sidebar.tsx
├── auth/ProtectedRoute.tsx
├── auth/PermissionGate.tsx
└── admin/roles/ (role-list, role-form, permission-matrix, role-badge)
```

---

**Document Version**: 1.0  
**Last Updated**: February 7, 2026
