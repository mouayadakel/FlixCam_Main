# Investigation Report: GET /api/equipment 500 on Production

**Date:** 2025-03-07  
**Symptom:** `GET https://flixcam.rent/api/equipment?` and `GET .../api/equipment?take=100` return **500 Internal Server Error**. Related: `/api/categories` and `/api/brands` sometimes **ERR_TIMED_OUT**.  
**Scope:** Codebase and request-path analysis only (no server logs or env inspected). **No fixes applied.**

---

## 1. Request path (GET /api/equipment)

| Step | Location | What happens |
|------|----------|----------------|
| 1 | `src/app/api/equipment/route.ts` (GET) | Entry handler |
| 2 | `auth()` | NextAuth session from JWT cookie |
| 3 | No session → 401 | Returned before any DB/cache |
| 4 | `hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_READ)` | RBAC check (DB and optionally cache) |
| 5 | No permission → 403 | Returned before service call |
| 6 | `EquipmentService.getEquipmentList(filters)` | Prisma query with relations |
| 7 | Any uncaught throw in steps 2–6 | Caught by route `catch` → **500** and `console.error('Error fetching equipment:', error)` |

So a **500** means an **exception** was thrown somewhere in that chain; 401/403 are returned explicitly and would not be 500.

---

## 2. Likely causes of the 500 (in order of likelihood)

### 2.1 Auth secret missing (high)

- **Where:** `auth()` in `src/lib/auth/config.ts` uses  
  `secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET`.
- **If both are missing in production:** NextAuth can throw when verifying/signing the JWT (e.g. when reading the session cookie). That would throw inside `auth()` and be caught by the route’s `catch` → 500.
- **Check on server:** Ensure `AUTH_SECRET` or `NEXTAUTH_SECRET` is set in `/home/flixcam/public_html/app/.env` (or the env actually loaded by the process). Template: `app/.env.production.template`.

### 2.2 Database / Prisma (high)

- **Where:** `EquipmentService.getEquipmentList()` in `src/lib/services/equipment.service.ts` runs:
  - `prisma.equipment.findMany({ where, include: { vendor, category, brand, media, maintenance }, orderBy, skip, take })`
  - `prisma.equipment.count({ where })`
- **Possible causes:**
  - **DATABASE_URL** wrong or not set on server → connection error → throw → 500.
  - **Schema drift:** Table or column missing or different from `prisma/schema.prisma` (e.g. after a migration that wasn’t applied or failed on production) → Prisma runtime error → 500.
  - **Data/constraint:** e.g. equipment row with `categoryId` or `brandId` pointing to a deleted or invalid row; or relation/constraint violation during the query → 500.
- **Migrations:** You confirmed **no pending migrations** and **prisma generate** was run. So the most likely DB issues are connection (env) or data/constraint, unless there is schema drift not reflected in migrations.

### 2.3 RBAC / permissions (medium, only if USE_NEW_RBAC=true)

- **Where:** `hasPermission()` in `src/lib/auth/permissions.ts` (legacy) or `permission-service.ts` (when `USE_NEW_RBAC=true`).
- **Legacy path:** Uses Prisma only; errors are caught and result in `return false` (403), not 500.
- **New RBAC path:** Uses `cacheGet` then DB. `cacheGet` (in `src/lib/cache.ts`) catches Redis errors and returns `null`; it does not throw. So Redis misconfiguration would not by itself cause 500 here.
- **Conclusion:** Permission layer is unlikely to be the direct cause of 500 unless there is an uncaught throw in the new RBAC DB path (e.g. missing table for roles/permissions). If in doubt, check server logs when the request hits.

### 2.4 Timeouts (ERR_TIMED_OUT) on /api/categories and /api/brands

- These are **timeouts**, not 500. They suggest the server is slow or not responding in time (e.g. DB slow, connection pool exhausted, or process blocked). Same root causes as above (DB or auth blocking the event loop) can contribute.

---

## 3. What does not cause this 500

- **Pending migrations:** Ruled out (you ran `prisma migrate deploy` and there were no pending migrations).
- **Prisma client not generated:** Ruled out after running `prisma generate` and restarting PM2.
- **Frontend calling wrong URL:** The request is to `GET /api/equipment?...`, which is the correct route and is used from admin UI (e.g. `featured-equipment-table.tsx`).

---

## 4. Error visibility

- The route logs the exception: `console.error('Error fetching equipment:', error)`.
- In production, that goes to **stderr**. With PM2, that is typically in:
  - **error log:** e.g. `/home/flixcam/logs/production/error.log`
  - Or: `pm2 logs flixcam-production --err --lines 100`
- The **out.log** you shared only showed `next start`; the actual error message will be in the **error** stream. To confirm the root cause, the next step is to reproduce the 500 and immediately inspect the error log or `pm2 logs --err`.

---

## 5. Recommended next steps (verification only)

1. **Confirm env on server:** In the same environment as the running app (e.g. `cd /home/flixcam/public_html/app` and `node -e "require('dotenv').config(); console.log('NEXTAUTH_SECRET set:', !!process.env.NEXTAUTH_SECRET); console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);"`) — or inspect the `.env` file (no secrets printed).
2. **Capture the real error:** Trigger `GET /api/equipment?take=10` (while logged in), then run `pm2 logs flixcam-production --err --lines 80` or `tail -80 /home/flixcam/logs/production/error.log` and note the line(s) after `Error fetching equipment:`.
3. **If the log shows a Prisma/DB error:** Check `DATABASE_URL`, DB connectivity, and that the database schema matches the Prisma schema (and that no manual DB changes broke a relation).
4. **If the log shows a NextAuth/JWT/secret error:** Set `NEXTAUTH_SECRET` (or `AUTH_SECRET`) in production and restart PM2.

---

## 6. Summary

| Hypothesis | Likelihood | How to confirm |
|-----------|------------|----------------|
| **AUTH_SECRET / NEXTAUTH_SECRET missing** | High | Env check; error log mentioning JWT/secret/signature |
| **DATABASE_URL or DB connection / schema / data** | High | Error log (Prisma/Postgres message); DB connectivity and schema check |
| **RBAC/Prisma (e.g. missing role tables)** | Medium | Only if USE_NEW_RBAC=true and error log points to permission/role query |
| **Migration / Prisma generate** | Ruled out | Already verified on server |

**Conclusion:** The 500 is from an uncaught exception in the GET /api/equipment path (auth, permissions, or equipment list). The most probable causes are a missing auth secret in production or a database connection/schema/data issue. Checking the **PM2 error log** (or stderr) for the exact message after `Error fetching equipment:` is the single most important step to confirm and then fix the issue.
