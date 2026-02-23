# FlixCam.rent — Full Codebase Audit Report

---

## 1. Executive Summary

The FlixCam.rent codebase is a mature, feature-rich cinematic equipment rental platform with solid architecture (services, policies, events, RBAC). The main issues are: **security** (hardcoded external logging URL in auth, missing CRON_SECRET in .env.example), **inconsistent auth** (Supabase vs NextAuth), **test coverage gaps**, **duplicate components**, and **configuration mismatches** (Playwright port, WhatsApp env vars). The project is production-capable but needs targeted fixes before deployment.

---

## 2. Critical Issues (Fix Immediately)

| # | Issue | Location | Description |
|---|-------|----------|-------------|
| 1 | Hardcoded external logging URL in auth | `src/lib/auth/config.ts` lines 21–31 | `fetch('http://127.0.0.1:7247/ingest/d745db1b-a338-48e7-a9b9-281bdcdffd3a', ...)` sends auth data to an external endpoint. Remove or gate behind env flag. |
| 2 | CRON_SECRET missing from .env.example | `.env.example` | `src/app/api/cron/backfill/route.ts` uses `CRON_SECRET`; it is not documented. Add `CRON_SECRET="generate-with-openssl-rand-base64-32"` to .env.example. |
| 3 | Playwright port mismatch | `playwright.config.ts` line 16, 24 | Base URL and webServer use `localhost:3001` while `npm run dev` uses 3000. E2E tests will fail. Use `http://localhost:3000` or `PORT=3001 npm run dev`. |
| 4 | Dead Supabase auth code | `src/lib/auth/auth-helpers.ts` | `signIn`, `signOut`, `getCurrentUser`, `getUserRole` use Supabase auth while the app uses NextAuth. These functions are misleading and can cause confusion. Remove or clearly mark as legacy. |
| 5 | via.placeholder.com in production code | `src/lib/services/image-processing.service.ts` line 40 | `PLACEHOLDER_IMAGE = 'https://via.placeholder.com/800x600?text=Product+Image'` is used for fallbacks. Replace with a local or controlled asset. |

---

## 3. Missing Pieces

### Files & Modules

| Item | Details |
|------|---------|
| Public health check | `/api/health` is referenced in middleware but no public route exists. Only `/api/admin/health` exists (requires auth). Add a public `/api/health` for load balancers (e.g. DB ping). |
| Dockerfile | No Dockerfile or docker-compose. Add `Dockerfile` and `docker-compose.yml` for local dev and deployment. |
| 403 page | Middleware redirects to `/403` but no `app/403/page.tsx` or `app/(auth)/403/page.tsx` exists. |
| `images/icons/` | Directory contains only `.gitkeep`; no actual icons. |
| VENDOR in role mapping | `src/lib/auth/permissions.ts` roleMapping: `VENDOR` is not mapped; `user.role.toLowerCase()` yields `"vendor"` but `ROLE_PERMISSIONS` may not define vendor permissions. |

### Environment & Config

| Item | Details |
|------|---------|
| WHATSAPP_API_KEY vs WHATSAPP_ACCESS_TOKEN | `.env.example` uses `WHATSAPP_ACCESS_TOKEN`; `integration-config.service.ts` uses `WHATSAPP_API_KEY`. Align naming. |
| GOOGLE_GENERATIVE_AI_API_KEY | Used in AI services as fallback for `GEMINI_API_KEY` but not in .env.example. |

### Test Coverage

| Gap | Details |
|-----|---------|
| Unit tests | Only 8 test files in `__tests__/`. No tests for: `booking.service`, `payment.service`, `equipment.service`, `cart.service`, `auth`, `event-bus`, etc. |
| E2E tests | Single `e2e/critical-flows.spec.ts` with 4 tests. No checkout, booking, or admin flows. |
| API route tests | No integration tests for API routes beyond `portal-bookings.test.ts`. |

### Documentation

| Item | Details |
|------|---------|
| CONTRIBUTING.md | Missing. |
| CHANGELOG.md | Missing. |
| Deployment guide | README mentions deployment but no step-by-step guide. |
| API docs | No OpenAPI/Swagger or similar. |

---

## 4. Weaknesses

### Architecture & Structure

- **Duplicate policy/FAQ forms**: `settings/policies/_components/policy-form-dialog.tsx` vs `cms/policies/_components/policy-form-dialog.tsx`; same for FAQ. Consolidate or share via a shared component.
- **Mixed auth**: Supabase client/server setup in `lib/supabase/` while NextAuth is used. Supabase auth helpers are effectively dead.
- **Middleware role vs Prisma**: `ROLE_HIERARCHY` uses `super_admin`, `admin`, `staff`; Prisma has `ADMIN` etc. No `super_admin` in `UserRole`; `super_admin` is only in ROLE_PERMISSIONS. Clarify role model.

### Logic & Functionality

- **ai.service.ts** line 1097: `seasonality: 1.0, // Placeholder` — hardcoded placeholder.
- **image-processing.service.ts**: Uses `via.placeholder.com` for fallbacks.
- **Silent catch blocks**: Many `.catch(() => {})` — silent failures in `lib/auth/config.ts`, `lib/live-admin.ts`, `lib/translation.service.ts`, `kit-wizard.tsx`, etc. Add logging or error handling.
- **dynamic-pricing/page.tsx** line 767: `if (!res.ok) throw new Error()` — no error message.

### Error Handling

- Generic `throw new Error()` in many places.
- No shared error boundary for admin/portal.
- No consistent API error format (e.g. `{ error: string, code?: string }`).

### Data & Database

- No `deletedAt` filter in some queries; some Prisma models may have `deletedAt` but not all queries filter it.
- **IntegrationConfig** table: `integration-config.service.ts` line 170 throws if table is missing; migration may be incomplete.

### Security & Auth

- No rate limiting on auth endpoints (middleware only checks session).
- **AUTH_SECRET** vs **NEXTAUTH_SECRET**: both used; `.env.example` should document both.
- **integration-config.service.ts** uses `WHATSAPP_API_KEY`; `.env.example` uses `WHATSAPP_ACCESS_TOKEN`; `notification.service.ts` uses `WHATSAPP_API_KEY`. Align naming and usage.

### UI & UX

- Missing loading states: many admin pages fetch without skeletons.
- **home-featured-equipment.tsx** uses `/images/placeholder.jpg`; ensure it exists.
- Limited accessibility: many components lack `aria-label`, `alt`, `role`; only ~60 components have any a11y attributes.
- **comingSoon** in `en.json` line 71.

### API & Integrations

- **api/health** — middleware treats it as public but no route exists.
- CI uses Supabase placeholders: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` set to `placeholder`. Build may fail if Supabase is required.

### Configuration

- CI PostgreSQL: `DATABASE_URL` points to `localhost:5432`; no PostgreSQL service in CI. Tests may fail.
- Playwright: CI sets `webServer: undefined`; CI must start the app separately.

---

## 5. Quick Wins

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | Remove or gate behind env the auth logging fetch in `auth/config.ts` | 5 min | High |
| 2 | Add CRON_SECRET to .env.example | 2 min | Medium |
| 3 | Fix Playwright port to 3000 or align dev server | 2 min | Medium |
| 4 | Replace `via.placeholder.com` with local asset | 5 min | Medium |
| 5 | Add `throw new Error()` message in `dynamic-pricing/page.tsx` line 767 | 1 min | Low |
| 6 | Add VENDOR to roleMapping in permissions.ts | 5 min | Medium |
| 7 | Create `/403` page | 10 min | Medium |
| 8 | Add `GOOGLE_GENERATIVE_AI_API_KEY` to .env.example | 2 min | Low |
| 9 | Replace `seasonality: 1.0` placeholder in ai.service.ts with a comment or config | 2 min | Low |
| 10 | Add `CONTRIBUTING.md` with basic PR guidelines | 15 min | Low |

---

## 6. Full Prioritized Roadmap

| Priority | Item | One-line description |
|----------|------|----------------------|
| 1 | Remove auth logging fetch | Remove or gate external auth logging in `auth/config.ts` |
| 2 | Add CRON_SECRET to .env.example | Document CRON_SECRET for cron backfill |
| 3 | Fix Playwright port | Use port 3000 or align dev server with Playwright |
| 4 | Replace via.placeholder.com | Use local asset or Cloudinary for placeholder images |
| 5 | Add public /api/health | Add unauthenticated health check for load balancers |
| 6 | Create 403 page | Add `app/403/page.tsx` or equivalent |
| 7 | Clean up auth-helpers | Remove Supabase signIn/signOut/getCurrentUser or mark as legacy |
| 8 | Add VENDOR to roleMapping | Map VENDOR in permissions.ts roleMapping |
| 9 | Align WhatsApp env vars | Align WHATSAPP_API_KEY vs WHATSAPP_ACCESS_TOKEN |
| 10 | Add Dockerfile | Add Dockerfile for local dev and deployment |
| 11 | Consolidate duplicate policy/FAQ forms | Remove duplication between settings and cms |
| 12 | Add error handling for silent catches | Replace `.catch(() => {})` with logging or error handling |
| 13 | Add API error format | Standardize API error responses (e.g. `{ error, code }`) |
| 14 | Add unit tests for critical services | Add tests for booking, payment, equipment, cart services |
| 15 | Add E2E tests for checkout | Add Playwright tests for checkout flow |
| 16 | Add CI PostgreSQL service | Add PostgreSQL service to GitHub Actions |
| 17 | Add loading states | Add skeletons for admin pages |
| 18 | Improve accessibility | Add aria-labels, alt text, roles across components |
| 19 | Add CONTRIBUTING.md | Document contribution process |
| 20 | Add CHANGELOG.md | Track changes |
| 21 | Add deployment guide | Document deployment steps |
| 22 | Add API documentation | Add OpenAPI or similar |
| 23 | Add error boundaries | Add error boundaries for admin and portal |
| 24 | Add rate limiting on auth | Add rate limiting for login and signup |
| 25 | Add N+1 query checks | Add indexes and review queries |
| 26 | Add pagination for large lists | Add pagination where missing |
| 27 | Add missing meta/SEO | Add metadata for pages |
| 28 | Add docker-compose | Add docker-compose for local dev |
| 29 | Add health check script | Add health check script for deployment |
| 30 | Add Storybook stories | Add Storybook for critical components |

---

**Report generated from full codebase analysis.**
