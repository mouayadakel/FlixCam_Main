# Admin API 500 Error Audit

Track and harden API routes used by admin pages so uncaught exceptions return a proper 500 JSON response instead of crashing the request.

## Summary of changes (this pass)

| Route | Change |
|-------|--------|
| `GET /api/equipment` | Already had try/catch; added `q` as alias for `search`. Public header search now uses `/api/public/equipment` (no 500 for guests). |
| `GET/POST /api/technicians` | Wrapped in try/catch; errors return `handleApiError(error)` (401/403/500). |
| `GET /api/technicians/[id]` | Wrapped in try/catch; errors return `handleApiError(error)`. |
| `GET/POST /api/wallet` | Wrapped in try/catch; GET uses optional chaining on `p.booking` to avoid null ref. |
| `GET /api/users` | Wrapped in try/catch; optional chaining on mock user fields. |

## Admin pages → API calls (reference)

Admin UI calls these APIs. Routes marked ✅ have try/catch and return structured errors; others may already use `handleApiError` or inline catch.

| Admin area | API endpoints | Status |
|------------|---------------|--------|
| **Technicians** | `/api/technicians`, `/api/technicians/[id]` | ✅ Hardened |
| **Wallet** | `/api/wallet` | ✅ Hardened |
| **Equipment / Inventory** | `/api/equipment`, `/api/equipment/[id]`, `/api/categories`, `/api/brands` | equipment + categories have try/catch |
| **Calendar** | `/api/calendar`, `/api/studios`, `/api/equipment` | calendar has try/catch |
| **Maintenance** | `/api/maintenance`, `/api/equipment`, `/api/users` | maintenance routes have catch |
| **Warehouse** | `/api/warehouse/queue/check-in`, `check-out`, `/api/equipment`, `/api/categories` | queue routes have try/catch |
| **Delivery** | `/api/delivery/pending`, `/api/delivery/[id]/status` | has try/catch |
| **Finance** | `/api/invoices`, `/api/payments`, `/api/finance/deposits`, `/api/finance/refunds` | various |
| **Reports** | `/api/admin/reports`, `/api/reports/[type]`, `/api/reports/[type]/export` | has catch |
| **Quotes** | `/api/quotes`, `/api/quotes/[id]`, `/api/equipment`, `/api/clients` | has catch |
| **Bookings** | `/api/bookings`, `/api/equipment` | has catch |
| **Integrations** | `/api/integrations`, `/api/integrations/[type]`, `/api/integrations/[type]/test` | GET has try/catch |
| **Notifications** | `/api/notifications` | has catch |
| **Reviews** | `/api/reviews`, `/api/reviews/[id]` | has catch |
| **Analytics** | `/api/analytics/executive`, `trends`, `utilization`, `bookings`, `customers` | some have catch |
| **Marketing** | `/api/marketing/campaigns` | has catch |
| **CMS / Footer** | `/api/admin/cms/footer/*`, `/api/categories` | has catch |
| **Blog** | `/api/admin/blog/*` | has catch |
| **Settings** | `/api/admin/settings/*`, `/api/admin/messaging/*` | has catch |
| **Super** | `/api/admin/read-only`, `/api/admin/health`, `/api/admin/jobs/rerun`, etc. | varies |

## Pattern for new or unhandled routes

Use the shared helper so 401/403/500 and Zod errors are consistent:

```ts
import { handleApiError } from '@/lib/utils/api-helpers'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // ... permission check, prisma, etc.
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error)
  }
}
```

## Routes still without try/catch (candidates for next pass)

These API route files had no `catch` block when audited; consider adding try/catch if they are hit by admin or critical flows:

- `api/bookings/cost-preview/route.ts`
- `api/bookings/[id]/invoice-pdf/route.ts`
- `api/checkout/deposit/route.ts`, `lock-price`, `upload-document`, `serve-photo`
- `api/admin/imports/excel/route.ts`
- `api/admin/ai/drafts/route.ts`
- Public read-only routes (e.g. `api/public/equipment/route.ts`, `api/public/categories/route.ts`) – lower risk but can still throw on DB/cache errors

Run again to find more:

```bash
cd src/app/api && for f in $(find . -name 'route.ts'); do grep -q 'catch' "$f" || echo "$f"; done
```

## How to track 500s in production

1. **PM2 logs**: `pm2 logs flixcam-production --err --lines 200` – Next.js often logs uncaught errors to stderr.
2. **Response body**: 500 responses should return `{ "error": "..." }` when using `handleApiError`; avoid leaking stack traces in production (handleApiError hides details when `NODE_ENV=production`).
3. **APM/monitoring**: If you add error tracking (e.g. Sentry), tag events with route path and status code to see which admin APIs 500 most.
