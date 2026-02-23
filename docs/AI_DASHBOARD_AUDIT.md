# AI Content Health Dashboard — Full Architecture Audit

> **Auditor:** Principal Full-Stack Architect  
> **Date:** 2026-02-18  
> **Scope:** `/admin/ai-dashboard`, `/api/admin/ai/*`, `/api/ai/*`, related services, queues, types, Prisma models  
> **LOC in scope:** ~8,500+  
> **Files in scope:** 52

---

## TABLE OF CONTENTS

1. [Phase 1: Full Discovery](#phase-1-full-discovery)
2. [Phase 2: How It Works](#phase-2-how-it-works)
3. [Phase 3: Problems Identified](#phase-3-problems-identified)
4. [Phase 4: Development Roadmap](#phase-4-development-roadmap)

---

## PHASE 1: FULL DISCOVERY

### 1.1 Complete File Inventory

#### Dashboard Pages & Components (7 files, ~2,363 LOC)

| Path                                                                     | Type           | LOC | Description                                                                       |
| ------------------------------------------------------------------------ | -------------- | --- | --------------------------------------------------------------------------------- |
| `src/app/admin/(routes)/ai-dashboard/page.tsx`                           | page           | 54  | Shell with 4 tabs: Overview, Content Health, Image Review, Analytics              |
| `src/app/admin/(routes)/ai-dashboard/error.tsx`                          | error-boundary | 37  | Error UI with retry + navigate to admin                                           |
| `src/app/admin/(routes)/ai-dashboard/_components/overview-tab.tsx`       | component      | 755 | KPIs, pie/line charts, bottom-20 table, Fill All dialog                           |
| `src/app/admin/(routes)/ai-dashboard/_components/content-health-tab.tsx` | component      | 506 | Gap scanner, multi-select, fill scoped/all, pagination                            |
| `src/app/admin/(routes)/ai-dashboard/_components/image-review-tab.tsx`   | component      | 400 | Pending image grid, approve/reject, lightbox, keyboard shortcuts                  |
| `src/app/admin/(routes)/ai-dashboard/_components/analytics-tab.tsx`      | component      | 388 | Job history table, cost chart, CSV export, KPI cards                              |
| `src/app/admin/(routes)/ai-dashboard/_utils/ai-dashboard.utils.ts`       | util           | 223 | Shared utils (GAP_LABELS, polling, CSV export, localStorage) — **NEVER IMPORTED** |

#### Admin API Routes (15 files, ~1,276 LOC)

| Path                                                      | Type | LOC | Methods  | Description                                             |
| --------------------------------------------------------- | ---- | --- | -------- | ------------------------------------------------------- |
| `src/app/api/admin/ai/backfill/route.ts`                  | api  | 166 | POST/GET | Trigger batch backfill, poll job status                 |
| `src/app/api/admin/ai/backfill/trigger/route.ts`          | api  | 63  | POST     | Advanced backfill trigger (types/dryRun/forceReprocess) |
| `src/app/api/admin/ai/backfill/history/route.ts`          | api  | 65  | GET      | Backfill job history                                    |
| `src/app/api/admin/ai/backfill/[jobId]/progress/route.ts` | api  | 63  | GET      | Job progress by ID                                      |
| `src/app/api/admin/ai/content-health/route.ts`            | api  | 70  | GET      | Products with gaps (paginated, filterable)              |
| `src/app/api/admin/ai/jobs/route.ts`                      | api  | 59  | GET      | Job history for analytics tab                           |
| `src/app/api/admin/ai/pending-images/route.ts`            | api  | 76  | GET      | Pending images list                                     |
| `src/app/api/admin/ai/pending-images/[id]/route.ts`       | api  | 93  | PATCH    | Approve/reject single image                             |
| `src/app/api/admin/ai/pending-images/bulk/route.ts`       | api  | 92  | POST     | Bulk approve/reject images                              |
| `src/app/api/admin/ai/quality/products/route.ts`          | api  | 63  | GET      | Products sorted by quality score                        |
| `src/app/api/admin/ai/quality/summary/route.ts`           | api  | 79  | GET      | Quality summary KPIs                                    |
| `src/app/api/admin/ai/quality/trend/route.ts`             | api  | 38  | GET      | Quality trend over time                                 |
| `src/app/api/admin/ai/test-connection/route.ts`           | api  | 91  | POST     | Test OpenAI/Gemini connection                           |
| `src/app/api/admin/ai/spend-summary/route.ts`             | api  | 36  | GET      | AI spending breakdown                                   |
| `src/app/api/admin/ai/analytics/route.ts`                 | api  | 122 | GET      | Analytics metrics                                       |

#### Public AI Routes (8 files, ~338 LOC)

| Path                                           | Type | LOC | Description                           |
| ---------------------------------------------- | ---- | --- | ------------------------------------- |
| `src/app/api/ai/pricing/bulk-analyze/route.ts` | api  | 82  | Bulk pricing analysis (all equipment) |
| `src/app/api/ai/pricing/route.ts`              | api  | 35  | Single pricing suggestion             |
| `src/app/api/ai/recommendations/route.ts`      | api  | 35  | Equipment recommendations             |
| `src/app/api/ai/compatible-equipment/route.ts` | api  | 39  | Mount compatibility                   |
| `src/app/api/ai/kit-builder/route.ts`          | api  | 35  | Kit bundle builder                    |
| `src/app/api/ai/chatbot/route.ts`              | api  | 39  | Customer chatbot                      |
| `src/app/api/ai/demand-forecast/route.ts`      | api  | 38  | Demand forecasting                    |
| `src/app/api/ai/risk-assessment/route.ts`      | api  | 35  | Booking risk scoring                  |

#### Cron (1 file)

| Path                                 | Type | LOC | Description                                 |
| ------------------------------------ | ---- | --- | ------------------------------------------- |
| `src/app/api/cron/backfill/route.ts` | api  | 47  | Vercel Cron nightly scan (CRON_SECRET auth) |

#### Services (7 files, ~2,781 LOC)

| Path                                           | Type    | LOC   | Description                                                   |
| ---------------------------------------------- | ------- | ----- | ------------------------------------------------------------- |
| `src/lib/services/ai.service.ts`               | service | 1,492 | Core AI: risk, pricing, kits, demand, chat, specs, embeddings |
| `src/lib/services/ai-autofill.service.ts`      | service | 459   | Translation/SEO autofill orchestrator                         |
| `src/lib/services/content-health.service.ts`   | service | 281   | Gap detection (translations, SEO, photos, specs)              |
| `src/lib/services/quality-scorer.service.ts`   | service | 407   | Quality scoring 0-100, snapshots, Redis cache                 |
| `src/lib/services/image-processing.service.ts` | service | 248   | Download, Cloudinary upload, SSRF validation                  |
| `src/lib/services/ai-spec-parser.service.ts`   | service | 162   | LLM spec inference with confidence tiers                      |
| `src/lib/services/catalog-scanner.service.ts`  | service | 139   | Scan + queue orchestrator                                     |

#### Queue System (7 files, ~725 LOC)

| Path                                       | Type   | LOC | Description                                      |
| ------------------------------------------ | ------ | --- | ------------------------------------------------ |
| `src/lib/queue/backfill.worker.ts`         | worker | 380 | BullMQ worker: text/photo/spec backfill pipeline |
| `src/lib/queue/ai-processing.worker.ts`    | worker | 313 | AI processing worker (translations, SEO)         |
| `src/lib/queue/image-processing.worker.ts` | worker | 157 | Image processing worker                          |
| `src/lib/queue/backfill.queue.ts`          | queue  | 104 | Backfill queue producer + job creator            |
| `src/lib/queue/ai-processing.queue.ts`     | queue  | 58  | AI processing queue producer                     |
| `src/lib/queue/image-processing.queue.ts`  | queue  | 53  | Image processing queue producer                  |
| `src/lib/queue/dead-letter.queue.ts`       | queue  | 46  | Dead letter queue — **NEVER USED**               |

#### Type Definitions (2 files, ~385 LOC)

| Path                              | Type  | LOC | Description                                                     |
| --------------------------------- | ----- | --- | --------------------------------------------------------------- |
| `src/lib/types/backfill.types.ts` | types | 211 | Gap reports, job status, photo pipeline, spec inference, alerts |
| `src/lib/types/ai.types.ts`       | types | 174 | Risk assessment, kit building, pricing, demand, chatbot         |

#### Prisma Models (5 models)

| Model                    | Key Fields                                                                             | Purpose                            |
| ------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------- |
| `AiJob`                  | id, type (enum), status (enum), processed/total/succeeded/failed, costUsd, errorLog    | Job lifecycle tracking             |
| `AiJobItem`              | id, jobId, productId, itemType, status, costIncurred, provider                         | Per-product item in a job          |
| `AISettings`             | provider, apiKey, dailyBudgetUsd, monthlyBudgetUsd, currentDailySpend, backfillEnabled | AI provider configuration + budget |
| `ProductImage`           | url, imageSource (enum), pendingReview, qualityScore, reviewedBy                       | Image with review workflow         |
| `CatalogQualitySnapshot` | date (unique), avgScore, totalProducts, gapCounts (Json)                               | Daily quality trend data           |

### 1.2 Dependency Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  page.tsx (shell)                                                │
│    ├── overview-tab.tsx ──────────> /api/admin/ai/quality/*      │
│    │     ├── Recharts (Line, Pie)   /api/admin/ai/backfill      │
│    │     ├── polling (2s interval)  /api/admin/ai/jobs           │
│    │     └── localStorage           (target score)               │
│    ├── content-health-tab.tsx ───> /api/admin/ai/content-health  │
│    │     ├── debounced search       /api/admin/ai/backfill       │
│    │     ├── auto-refresh (30s)                                  │
│    │     └── polling (2s interval)                               │
│    ├── image-review-tab.tsx ────> /api/admin/ai/pending-images   │
│    │     ├── lightbox dialog        /api/admin/ai/pending-images/│
│    │     └── keyboard shortcuts     [id] + /bulk                 │
│    └── analytics-tab.tsx ───────> /api/admin/ai/jobs             │
│          ├── Recharts (Line)                                     │
│          └── CSV export                                          │
│                                                                  │
│  _utils/ai-dashboard.utils.ts ── NEVER IMPORTED (dead code)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API ROUTES                                 │
│  All routes check: auth() + hasPermission(AI_USE)               │
│  Zod validation on most (inconsistent on /jobs, /pending-images)│
│                                                                  │
│  /backfill POST ──> content-health.service (getProductIdsWithGaps)
│                 ──> backfill.queue (addBackfillJob)               │
│  /backfill GET  ──> prisma.aiJob.findUnique (poll status)       │
│  /quality/*     ──> quality-scorer.service (getCachedScan)      │
│  /content-health > content-health.service (findProductsWithGaps)│
│  /pending-images > prisma.productImage (direct queries)         │
│  /cron/backfill ──> catalog-scanner.service (scanAndQueue)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICES                                    │
│  quality-scorer.service ──> prisma (products, translations,     │
│    scoreProduct()            productImages, snapshots)           │
│    getCachedScan()    ──> Redis (5min TTL)                      │
│    captureQualitySnapshot()                                      │
│                                                                  │
│  content-health.service ──> prisma (products, translations)     │
│    findProductsWithGaps()                                        │
│    getProductIdsWithGaps() ── ALL products in memory!            │
│                                                                  │
│  catalog-scanner.service ──> quality-scorer + backfill.queue    │
│    scanAndQueue() ── DUPLICATE job creation with backfill.queue │
│                                                                  │
│  ai-autofill.service ──> OpenAI/Gemini (text generation)        │
│  ai-spec-parser.service ──> Gemini/OpenAI (spec inference)      │
│  image-processing.service ──> Cloudinary (upload/delete)        │
│  ai.service ──> OpenAI + Gemini (risk/pricing/kits/forecast)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     QUEUE SYSTEM (BullMQ + Redis)                │
│  backfill.queue ──> backfill.worker                             │
│    addBackfillJob() creates AiJob + AiJobItems + enqueues       │
│                                                                  │
│  backfill.worker processes:                                      │
│    1. Fetch product + translations                               │
│    2. Text backfill (autofill.service → OpenAI/Gemini)          │
│    3. Photo backfill (sourceImages → Cloudinary)                │
│    4. Spec backfill (ai-spec-parser → Gemini/OpenAI)            │
│    5. Update AiJob progress                                      │
│    6. captureQualitySnapshot on complete                         │
│                                                                  │
│  ai-processing.queue ──> ai-processing.worker                   │
│  image-processing.queue ──> image-processing.worker             │
│  dead-letter.queue ──> NO CONSUMER (never used)                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 RBAC Mapping

| Permission        | Constant                      | Used By                                                                          |
| ----------------- | ----------------------------- | -------------------------------------------------------------------------------- |
| `ai.use`          | `PERMISSIONS.AI_USE`          | ALL admin AI endpoints (backfill, quality, content-health, jobs, pending-images) |
| `settings.update` | `PERMISSIONS.SETTINGS_UPDATE` | `/test-connection` only                                                          |

**Missing granular permissions:** `ai.view`, `ai.run`, `ai.review`, `ai.configure` — currently a single `ai.use` gates everything from viewing dashboards to triggering expensive backfill jobs.

---

## PHASE 2: HOW IT WORKS

### 2.1 User Story — End-to-End Flow

```
SUPER_ADMIN logs in
    │
    ▼
/admin/ai-dashboard (page.tsx)
    │  State: activeTab = 'overview'
    │  Renders all 4 TabsContent children
    │
    ▼
Overview Tab mounts → fires fetchAll()
    │  GET /api/admin/ai/quality/summary     → SummaryData (KPIs)
    │  GET /api/admin/ai/quality/trend?days=84 → TrendPoint[] (chart)
    │  GET /api/admin/ai/quality/products?sort=score&order=asc&limit=20 → Bottom-20
    │
    ▼
UI renders:
    ├── Circular gauge (avg quality score)
    ├── Pie chart (excellent/good/fair/poor distribution)
    ├── Gap cards (missing translations, SEO, photos, specs)
    ├── 12-week trend line chart
    ├── Bottom-20 products table
    ├── Target score input (persisted to localStorage)
    └── "Products needed" estimator
    │
    ▼
Admin clicks "Fill All" button
    │  Opens confirmation dialog with:
    │  - Product count from bottom-20 or full gap list
    │  - Estimated cost (avg cost/product × count)
    │  - Warning about API spend
    │
    ▼
Admin confirms → handleFillAll()
    │  POST /api/admin/ai/backfill { fillAll: true }
    │    1. Auth check (session + ai.use permission)
    │    2. Concurrency guard: findFirst active AiJob → 409 if exists
    │    3. getProductIdsWithGaps() → all product IDs with any gap
    │    4. addBackfillJob(ids) → creates AiJob + AiJobItems + BullMQ job
    │    5. Returns { jobId, queued, estimatedMinutes }
    │
    ▼
Frontend starts polling (setInterval 2000ms)
    │  GET /api/admin/ai/backfill?jobId={id}
    │    → { status, progress, processed, total, succeeded, failed }
    │  Updates Progress bar + processed/total counter
    │
    ▼
BullMQ backfill.worker picks up job
    │  For each product (sequential, 500ms rate limit):
    │    1. Fetch product + translations
    │    2. Text: autofillMissingFields → OpenAI/Gemini → upsert translations
    │    3. Photo: sourceImages → download → Cloudinary → ProductImage records
    │    4. Spec: inferMissingSpecs → Gemini → merge into specifications JSON
    │    5. Update product.lastAiRunAt + aiRunCount
    │    6. Update AiJob.processed++
    │
    ▼
Job completes → worker sets AiJob.status = COMPLETED
    │  captureQualitySnapshot() → CatalogQualitySnapshot record
    │
    ▼
Frontend polling detects status === 'done'
    │  clearInterval()
    │  notifyJobComplete(processed) → Browser Notification
    │  fetchAll() → refresh all dashboard data
    │
    ▼
Admin switches to Image Review tab
    │  GET /api/admin/ai/pending-images → items with pendingReview: true
    │  Renders grid of images
    │
    ▼
Admin reviews images:
    │  Click image → lightbox dialog
    │  Press 'A' → approve (PATCH /pending-images/{id} { action: 'approve' })
    │  Press 'R' → reject (PATCH /pending-images/{id} { action: 'reject' })
    │  Or bulk select + approve/reject all
    │
    ▼
Admin switches to Analytics tab
    │  GET /api/admin/ai/jobs?limit=30&page=1 → job history
    │  Renders job table + cost chart + KPI cards
    │  Can export filtered data to CSV
```

### 2.2 Quality Scoring Formula

```
Score = translations (25) + SEO (20) + shortDesc (10) + longDesc (15) + photos (30)
        ─────────────────────────────────────────────────────────────────────
        Max: 100

Where:
  translations = 25 if ALL 3 locales (ar, en, zh) have name.length > 5
  SEO = 20 if ANY locale has filled seoTitle + seoDescription + seoKeywords
  shortDesc = 10 if ANY locale has shortDescription.length >= 20
  longDesc = 15 if ANY locale has longDescription.length >= 100
  photos = 30 if imageCount >= 4, else proportional (imageCount/4 × 30)
```

**Defined in:** `quality-scorer.service.ts:scoreProduct()` (lines 42-91)

### 2.3 Backend Job Processing Pipeline

The backfill worker processes products sequentially with a configurable rate limit:

```typescript
// From backfill.worker.ts — simplified
for (let i = 0; i < productIds.length; i++) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productIds[i] },
      include: { translations: true, category: true, brand: true },
    })

    // 1. TEXT BACKFILL
    if (types.includes('text')) {
      const result = await autofillMissingFields(product)
      // Upserts translations for en (SEO), ar, zh
    }

    // 2. PHOTO BACKFILL
    if (types.includes('photo')) {
      const result = await sourceImages(product)
      // Downloads, uploads to Cloudinary, creates ProductImage records
    }

    // 3. SPEC BACKFILL
    if (types.includes('spec')) {
      const result = await inferMissingSpecs(product)
      // Merges AI-inferred specs into product.specifications
    }

    // Update progress
    await prisma.aiJob.update({
      where: { id: jobId },
      data: { processed: i + 1, succeeded: succeeded + 1 },
    })

    // Rate limiting
    if (i % concurrency === 0) await sleep(rateLimitMs)
  } catch (error) {
    errorLog.push({ productId, error: error.message })
  }
}
```

### 2.4 Polling vs SSE

Currently: **All progress monitoring uses HTTP polling** (2-second intervals via `setInterval`).

No SSE or WebSocket infrastructure exists for real-time updates. The polling pattern is duplicated in:

- `overview-tab.tsx` (job progress polling)
- `content-health-tab.tsx` (job progress polling)
- `_utils/ai-dashboard.utils.ts` (reusable `pollJobProgress` — but never imported)

---

## PHASE 3: PROBLEMS IDENTIFIED

### 3.1 Critical (P0) — Must Fix

| #   | Category           | Issue                                                                                                                    | File(s)                             | Impact                                                             |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------ |
| C1  | **Security**       | SSRF protection bypassed — allowlist `ALLOWED_DOMAINS` has an `else return true` fallback that accepts ANY public domain | `image-processing.service.ts:87`    | Attackers could use the server as a proxy to access arbitrary URLs |
| C2  | **Security**       | Gemini API key passed in URL query string (`?key=...`) — logged by proxies, CDNs, access logs                            | `test-connection/route.ts:69`       | API key leakage                                                    |
| C3  | **Data Bug**       | Arabic/Chinese translations receive English SEO metadata — `seo!.metaTitle` (English) is written to ar/zh translations   | `backfill.worker.ts:189-219`        | Wrong language in multilingual SEO fields                          |
| C4  | **Race Condition** | Duplicate-job guard uses `findFirst` + non-atomic create — two concurrent POST requests can both pass the guard          | `backfill/route.ts:45-54`           | Duplicate jobs consuming double API budget                         |
| C5  | **Performance**    | Unbounded concurrent AI API calls — `Promise.allSettled` over ALL equipment with no concurrency limit                    | `bulk-analyze/route.ts:42-53`       | Rate limit exhaustion, massive latency, potential provider ban     |
| C6  | **Performance**    | `getProductIdsWithGaps()` loads ALL products into memory with no pagination                                              | `content-health.service.ts:239-281` | OOM on catalogs with 1000+ products                                |
| C7  | **Performance**    | `runFullScan()` loads ALL products, then calls `scoreProduct()` for EACH (N+1 queries)                                   | `quality-scorer.service.ts:265-296` | O(N) DB queries — hundreds of sequential queries                   |

### 3.2 High (P1) — Fix Soon

| #   | Category             | Issue                                                                                                                                                                 | File(s)                                       | Impact                                                |
| --- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| H1  | **Code Duplication** | `_utils/ai-dashboard.utils.ts` (223 LOC) is **never imported** — all 3 tabs duplicate GAP_LABELS, notifyJobComplete, getRelativeTime, polling logic, CSV export, etc. | All tab files + utils                         | Maintenance nightmare, inconsistent behavior          |
| H2  | **Architecture**     | Dead letter queue exists but is **never called** by any worker                                                                                                        | `dead-letter.queue.ts` + `backfill.worker.ts` | Permanently failed items are silently lost            |
| H3  | **Architecture**     | Duplicate job creation logic in `catalog-scanner.service.ts:queueBackfillJob` and `backfill.queue.ts:addBackfillJob`                                                  | Both files                                    | Confusion over which to use, inconsistent behavior    |
| H4  | **UX Bug**           | Analytics KPIs (total jobs, cost) are computed from **current page only** (30 items), not full dataset                                                                | `analytics-tab.tsx`                           | Misleading dashboard numbers                          |
| H5  | **UX Bug**           | Analytics filters are **client-side after pagination** — filtering "failed" shows only failed jobs from current page, not all failed jobs                             | `analytics-tab.tsx`                           | Incomplete filtered views                             |
| H6  | **RBAC**             | Single `ai.use` permission gates everything — viewing dashboards and triggering expensive backfill operations share the same permission                               | `permissions.ts`                              | No separation of concerns for different access levels |
| H7  | **Audit**            | No audit trail for AI operations — backfill triggers, image approvals, and budget-impacting actions have no audit log                                                 | All API routes                                | Compliance gap, no accountability                     |
| H8  | **API**              | `total` count from pending-images returns `list.length` (capped by `limit`), not a DB count                                                                           | `pending-images/route.ts:68`                  | Pagination impossible, total count incorrect          |
| H9  | **Data**             | Double-filtering in content-health route — `gapType` passed to service AND filtered again after                                                                       | `content-health/route.ts:48-53`               | `total` count doesn't match filtered results          |
| H10 | **Performance**      | `runFullScan` calls `scoreProduct` per-product, each of which does its own `prisma.product.findUnique` — the product was already fetched                              | `quality-scorer.service.ts:296`               | Redundant DB queries (fetches same product twice)     |
| H11 | **Security**         | No rate limiting on any AI API route                                                                                                                                  | All API routes                                | Abuse vector, budget drain                            |
| H12 | **Build**            | No `export const dynamic = 'force-dynamic'` on `bulk-analyze/route.ts`                                                                                                | `bulk-analyze/route.ts`                       | Could be statically cached by Next.js                 |

### 3.3 Medium (P2) — Fix in Sprint

| #   | Category         | Issue                                                                                                                                         | File(s)                                                | Impact                                       |
| --- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------- |
| M1  | **TypeScript**   | `type as AiJobType` unsafe cast in jobs route — user string passed raw                                                                        | `jobs/route.ts:42`                                     | Runtime Prisma error instead of 400          |
| M2  | **TypeScript**   | `parseInt` without NaN guard — `Math.min(50, NaN)` = NaN causing Prisma failure                                                               | `jobs/route.ts:37`                                     | 500 error on malformed query params          |
| M3  | **Code Quality** | 12+ silent `catch {}` blocks in `ai.service.ts` — LLM failures completely swallowed                                                           | `ai.service.ts`                                        | Impossible to debug LLM issues in production |
| M4  | **Code Quality** | `EventBus` and `AuditService` imported but never used in `ai.service.ts`                                                                      | `ai.service.ts:8`                                      | Dead imports, misleading code                |
| M5  | **Performance**  | In-memory sort/filter of entire product catalog in `/quality/products` route                                                                  | `quality/products/route.ts:34-49`                      | CPU + memory cost per request                |
| M6  | **UX**           | `handleScanAll` is identical to `handleRefresh` — misleading button that does the same thing                                                  | `overview-tab.tsx`                                     | User confusion                               |
| M7  | **UX**           | Stale closure in keyboard handler — `handleAction` not memoized, ESLint warning suppressed                                                    | `image-review-tab.tsx`                                 | Keyboard shortcut may use outdated state     |
| M8  | **UX**           | `productCounts` Map rebuilt on every render — not memoized                                                                                    | `image-review-tab.tsx`                                 | Unnecessary computation                      |
| M9  | **UX**           | Image filter dropdown options change after filtering (server-side) — filtering by Product A shows only Product A in dropdown                  | `image-review-tab.tsx`                                 | Can't switch back to "all" view intuitively  |
| M10 | **API**          | `errorLog` exposed in job status response — could leak internal stack traces                                                                  | `backfill/route.ts:158`                                | Information disclosure                       |
| M11 | **API**          | Mixed Arabic/English hardcoded error messages                                                                                                 | `backfill/route.ts`, `test-connection/route.ts`        | Should use i18n keys                         |
| M12 | **API**          | No timing-safe comparison for `CRON_SECRET`                                                                                                   | `cron/backfill/route.ts:22`                            | Timing attack vector                         |
| M13 | **API**          | Inconsistent `gapType` enum — `'description'` in content-health, `'descriptions'` in quality/products, `'shortDescription'` in backfill types | Multiple files                                         | Confusing API contract                       |
| M14 | **API**          | Silent validation fallbacks — bad input silently uses defaults instead of returning 400                                                       | `content-health/route.ts`, `quality/products/route.ts` | Client bugs masked                           |
| M15 | **Code Quality** | CSV export doesn't escape commas in field values                                                                                              | `analytics-tab.tsx` (also in utils)                    | Malformed CSV output                         |
| M16 | **Performance**  | N+1 queries in `forecastDemand` — separate `prisma.bookingEquipment.findMany` per equipment item (up to 50)                                   | `ai.service.ts:1122`                                   | Slow demand forecasting                      |

### 3.4 Low (P3) — Backlog

| #   | Category         | Issue                                                                                         | File(s)                                                    | Impact                                         |
| --- | ---------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| L1  | **Standards**    | `<img>` used instead of `next/image` in image review grid/lightbox                            | `image-review-tab.tsx`                                     | Unoptimized images, violates project standards |
| L2  | **Standards**    | `window.location.href` for navigation instead of `useRouter().push()`                         | `error.tsx`                                                | Full page reload instead of SPA navigation     |
| L3  | **Standards**    | `console.error` in error boundary instead of structured logging                               | `error.tsx`                                                | Insufficient for production monitoring         |
| L4  | **Code Quality** | Recharts Tooltip has both `formatter` and `content` props — `formatter` is dead code          | `analytics-tab.tsx`                                        | Dead code                                      |
| L5  | **Code Quality** | `error: any` type annotation in image-processing service                                      | `image-processing.service.ts:196`                          | Should be `unknown`                            |
| L6  | **Code Quality** | `BACKFILL_QUEUE_NAME` defined in both `backfill.queue.ts` and `backfill.worker.ts`            | Both files                                                 | Redundant constant                             |
| L7  | **UX**           | No Suspense boundaries around tab content for progressive loading                             | `page.tsx`                                                 | All-or-nothing loading                         |
| L8  | **UX**           | Hardcoded locale `'en'` for product names in pending-images response                          | `pending-images/route.ts:50`                               | Admin locale preference ignored                |
| L9  | **Infra**        | No graceful shutdown handling (SIGTERM/SIGINT) in backfill worker                             | `backfill.worker.ts`                                       | Potential data corruption on deploy            |
| L10 | **Infra**        | File buffer stored in Redis via import queue — large files bloat Redis memory                 | `import.queue.ts:44`                                       | Redis memory pressure                          |
| L11 | **Code Quality** | `maxDuration = 60` in cron route may be insufficient for large catalog scans                  | `cron/backfill/route.ts:10`                                | Job killed mid-execution                       |
| L12 | **Data**         | Empty specs object `{}` scores 100% on specs completeness                                     | `quality-scorer.service.ts:69` (content-health equivalent) | False positive quality score                   |
| L13 | **Code Quality** | `scoreAllProducts` processes all products sequentially with no batching                       | `quality-scorer.service.ts:108-109`                        | Slow for large catalogs                        |
| L14 | **Code Quality** | Duplicate quality scoring logic in `content-health.service.ts` vs `quality-scorer.service.ts` | Both services                                              | Two sources of truth                           |

### 3.5 Testing Gaps

| Area                          | Current State | Recommendation                                                                                   |
| ----------------------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| Unit tests for services       | **None**      | Vitest: `ai.service.test.ts`, `content-health.service.test.ts`, `quality-scorer.service.test.ts` |
| Unit tests for queue workers  | **None**      | Vitest with mocked Prisma/BullMQ: `backfill.worker.test.ts`                                      |
| API route integration tests   | **None**      | Vitest: each route file with mocked auth/prisma                                                  |
| E2E tests for dashboard flow  | **None**      | Playwright: login → dashboard → scan → fill → poll → review images → analytics                   |
| Visual regression tests       | **None**      | Playwright screenshot comparison for charts/tables                                               |
| Load tests for bulk endpoints | **None**      | k6: `/api/admin/ai/backfill` POST, `/api/ai/pricing/bulk-analyze` POST                           |

---

## PHASE 4: DEVELOPMENT ROADMAP

### Phase 1: Critical Fixes (1 Day)

**Goal:** Eliminate data corruption, security vulnerabilities, and race conditions.

| Task                                                                             | Issue Ref | Effort | Expected Impact               |
| -------------------------------------------------------------------------------- | --------- | ------ | ----------------------------- |
| Fix ar/zh SEO bug — pass locale-specific SEO to each translation upsert          | C3        | 1h     | Correct multilingual SEO data |
| Fix SSRF bypass — remove `else return true`, enforce allowlist strictly          | C1        | 1h     | Close security hole           |
| Move Gemini API key from URL query param to header                               | C2        | 30m    | Prevent key leakage           |
| Add atomic concurrency guard (Prisma `$transaction` with `findFirst` + `create`) | C4        | 1h     | Prevent duplicate jobs        |
| Add concurrency limiter (`p-limit`) to `bulk-analyze` route                      | C5        | 30m    | Prevent rate limit exhaustion |
| Paginate `getProductIdsWithGaps()` with cursor-based iteration                   | C6        | 1h     | Prevent OOM                   |
| Refactor `runFullScan` to compute score inline instead of per-product DB call    | C7, H10   | 2h     | Eliminate N+1 queries         |

**Metrics:** 0 critical bugs, 0 security vulnerabilities, scan time reduced by ~80%.

### Phase 2: DRY + Code Quality (1 Day)

**Goal:** Eliminate duplication, fix TypeScript issues, consistent APIs.

| Task                                                                            | Issue Ref | Effort | Expected Impact                          |
| ------------------------------------------------------------------------------- | --------- | ------ | ---------------------------------------- |
| Wire up `_utils/ai-dashboard.utils.ts` — replace all local duplicates in 3 tabs | H1        | 2h     | ~300 LOC removed, single source of truth |
| Consolidate `queueBackfillJob` and `addBackfillJob` into single function        | H3        | 1h     | One job creation path                    |
| Add Zod validation to `/jobs`, `/pending-images` routes                         | M1, M2    | 1h     | Consistent validation, proper 400 errors |
| Replace silent `catch {}` blocks with structured logging                        | M3        | 1h     | Debuggable LLM failures                  |
| Remove dead imports (EventBus, AuditService) in `ai.service.ts`                 | M4        | 10m    | Clean code                               |
| Normalize `gapType` enum across all files (`description` everywhere)            | M13       | 30m    | Consistent API contract                  |
| Fix CSV export to properly escape values                                        | M15       | 20m    | Valid CSV output                         |
| Wire dead letter queue into backfill worker for permanent failures              | H2        | 1h     | Failed items surfaced for review         |

**Metrics:** ~400 LOC removed, 0 TypeScript errors, 0 dead imports.

### Phase 3: UX & Performance (2 Days)

**Goal:** Real-time updates, correct dashboard metrics, responsive design.

| Task                                                                                          | Issue Ref | Effort | Expected Impact                                   |
| --------------------------------------------------------------------------------------------- | --------- | ------ | ------------------------------------------------- |
| Replace polling with SSE for job progress (new `/api/admin/ai/backfill/[jobId]/stream` route) | —         | 4h     | Real-time progress, eliminate 2s polling overhead |
| Fix analytics KPIs to use server-side totals (aggregate query)                                | H4        | 1h     | Accurate dashboard numbers                        |
| Move analytics filters to server-side (API query params)                                      | H5        | 2h     | Correct filtered pagination                       |
| Fix pending-images total count (parallel `count` query)                                       | H8        | 30m    | Accurate pagination                               |
| Add pagination to pending-images                                                              | —         | 1h     | Handle large image sets                           |
| Fix double-filtering in content-health route                                                  | H9        | 30m    | Consistent total count                            |
| Memoize `productCounts` with `useMemo`                                                        | M8        | 10m    | Reduced re-renders                                |
| Stabilize keyboard handler with `useCallback`                                                 | M7        | 20m    | Correct keyboard shortcuts                        |
| Separate product list from filter options in image review                                     | M9        | 1h     | Usable filter UX                                  |
| Make `handleScanAll` trigger actual scan API (or remove button)                               | M6        | 30m    | Honest UI                                         |
| Replace `<img>` with `next/image` in image review                                             | L1        | 30m    | Optimized images                                  |
| Add mobile-responsive breakpoints to all tabs                                                 | —         | 2h     | Mobile-usable dashboard                           |
| Add Suspense boundaries around tab content                                                    | L7        | 30m    | Progressive loading                               |

**Metrics:** Real-time updates, +50% perceived performance, mobile-ready.

### Phase 4: Enterprise Security & Compliance (2 Days)

**Goal:** Granular RBAC, full audit trail, budget enforcement UI.

| Task                                                                                             | Issue Ref | Effort | Expected Impact                |
| ------------------------------------------------------------------------------------------------ | --------- | ------ | ------------------------------ |
| Split `ai.use` into granular permissions: `ai.view`, `ai.run`, `ai.review`, `ai.configure`       | H6        | 3h     | Principle of least privilege   |
| Add audit logging to all AI operations (backfill trigger, image approve/reject, settings change) | H7        | 3h     | Full accountability            |
| Add rate limiting to AI API routes (Upstash rate limiter integration)                            | H11       | 2h     | Abuse prevention               |
| Add timing-safe CRON_SECRET comparison                                                           | M12       | 15m    | Prevent timing attacks         |
| Sanitize `errorLog` before exposing in API response                                              | M10       | 30m    | Prevent info disclosure        |
| Build budget management UI panel (daily/monthly spend, alerts, limits)                           | —         | 4h     | Admin visibility into AI costs |
| Add `canSpend` check before each product in worker (not just estimated upfront)                  | —         | 1h     | Real-time budget enforcement   |
| Add graceful shutdown to backfill worker                                                         | L9        | 1h     | Clean deploys                  |

**Metrics:** 4 granular permissions, 100% operations audited, budget-enforced.

### Phase 5: Testing & BI (3 Days)

**Goal:** Comprehensive test coverage, business intelligence features.

| Task                                                                            | Issue Ref | Effort | Expected Impact                |
| ------------------------------------------------------------------------------- | --------- | ------ | ------------------------------ |
| Unit tests: `quality-scorer.service.ts` (score formula, edge cases)             | —         | 2h     | Validated scoring logic        |
| Unit tests: `content-health.service.ts` (gap detection, pagination)             | —         | 2h     | Validated gap detection        |
| Unit tests: `backfill.worker.ts` (processing pipeline, error handling)          | —         | 3h     | Validated job processing       |
| API integration tests: all 15 admin AI routes                                   | —         | 4h     | Validated API contracts        |
| E2E test: full dashboard flow (Playwright)                                      | —         | 4h     | End-to-end confidence          |
| Revenue-weighted quality priority (products earning most revenue scored higher) | —         | 4h     | Business-driven prioritization |
| PDF export for quality reports                                                  | —         | 3h     | Offline reporting              |
| Scoped fill actions (fill only translations, or only photos, per product)       | —         | 2h     | Granular AI operations         |

**Metrics:** 80%+ test coverage on AI features, business-actionable analytics.

### Summary Timeline

```
Week 1:
  Day 1: Phase 1 (Critical Fixes) ──────────── Security + Data Integrity
  Day 2: Phase 2 (DRY + Code Quality) ─────── Clean Architecture
  Day 3-4: Phase 3 (UX & Performance) ──────── Real-time + Responsive

Week 2:
  Day 5-6: Phase 4 (Enterprise Security) ──── RBAC + Audit + Budget
  Day 7-9: Phase 5 (Testing & BI) ──────────── Coverage + Intelligence
```

### Expected Gains

| Metric                      | Current                       | After Roadmap                     |
| --------------------------- | ----------------------------- | --------------------------------- |
| Security vulnerabilities    | 3 critical                    | 0                                 |
| Code duplication            | ~600 LOC                      | ~0                                |
| Test coverage (AI features) | 0%                            | 80%+                              |
| Dashboard accuracy          | Misleading (page-scoped KPIs) | Accurate (server-side aggregates) |
| Progress monitoring         | 2s polling                    | Real-time SSE                     |
| RBAC granularity            | 1 permission                  | 4 permissions                     |
| Audit coverage              | 0% operations                 | 100% operations                   |
| Mobile responsiveness       | Not responsive                | Fully responsive                  |
| LLM failure visibility      | Silent (swallowed)            | Structured logging                |
| API validation consistency  | ~60% routes                   | 100% routes                       |

---

AI feature fully mapped. Ready for targeted fixes based on this analysis.
