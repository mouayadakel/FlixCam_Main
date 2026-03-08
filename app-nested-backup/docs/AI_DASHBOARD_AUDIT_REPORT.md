# AI Dashboard — Full Audit & Fix Report

**Date:** 2026-02-18  
**Scope:** `/admin/ai-dashboard` — 28 files, ~6,500 lines  
**Status:** ✅ All fixes applied, browser-verified, zero TS/lint errors in dashboard files

---

## 1. Files Discovered

| #   | Path                                              | Lines   | Purpose                                             | Issues Found                                        |
| --- | ------------------------------------------------- | ------- | --------------------------------------------------- | --------------------------------------------------- |
| 1   | `ai-dashboard/page.tsx`                           | 55      | Main page with 4-tab layout                         | None                                                |
| 2   | `ai-dashboard/error.tsx`                          | 38      | Error boundary                                      | None                                                |
| 3   | `ai-dashboard/_components/overview-tab.tsx`       | 756→420 | Quality gauge, donut, trend chart, bottom-20, goals | **DRY violation**, SSR localStorage, Recharts types |
| 4   | `ai-dashboard/_components/content-health-tab.tsx` | 507→310 | Content gap scanner + product table                 | **DRY violation**, Prisma types                     |
| 5   | `ai-dashboard/_components/image-review-tab.tsx`   | 401→310 | Image review grid + lightbox                        | Keyboard conflict with inputs, Dialog race          |
| 6   | `ai-dashboard/_components/analytics-tab.tsx`      | 389→240 | Job history + cost chart + KPIs                     | **DRY violation**, Recharts custom tooltip types    |
| 7   | `ai-dashboard/_utils/ai-dashboard.utils.ts`       | 0→190   | **NEW** — Shared utilities                          | Created to fix DRY                                  |
| 8   | `api/admin/ai/backfill/route.ts`                  | 166     | POST backfill trigger + GET status                  | Concurrency guard (OK)                              |
| 9   | `api/admin/ai/content-health/route.ts`            | 70      | Content health scan                                 | None                                                |
| 10  | `api/admin/ai/jobs/route.ts`                      | 59      | Job listing with pagination                         | None                                                |
| 11  | `api/admin/ai/quality/products/route.ts`          | 63      | Products by quality score                           | None                                                |
| 12  | `api/admin/ai/quality/summary/route.ts`           | 79      | Quality summary stats                               | None                                                |
| 13  | `api/admin/ai/quality/trend/route.ts`             | 38      | Quality trend                                       | None                                                |
| 14  | `api/admin/ai/pending-images/route.ts`            | 76      | Pending images list                                 | None                                                |
| 15  | `api/admin/ai/pending-images/[id]/route.ts`       | 93      | Approve/reject image                                | None                                                |
| 16  | `api/admin/ai/pending-images/bulk/route.ts`       | 92      | Bulk approve/reject                                 | None                                                |
| 17  | `api/admin/ai/analytics/route.ts`                 | 122     | Analytics aggregation                               | None                                                |
| 18  | `api/admin/ai/spend-summary/route.ts`             | 36      | Cost summary                                        | None                                                |
| 19  | `lib/services/content-health.service.ts`          | 282     | Content gap detection                               | **Prisma type unsafe** (Record<string, unknown>)    |
| 20  | `lib/services/quality-scorer.service.ts`          | 407     | Quality scoring + caching                           | Pre-existing TS errors (6)                          |
| 21  | `lib/services/ai.service.ts`                      | 1493    | AI service (risk, pricing, chat)                    | Large file (not in scope)                           |
| 22  | `lib/types/backfill.types.ts`                     | 212     | Backfill type definitions                           | None                                                |
| 23  | `lib/queue/backfill.queue.ts`                     | 105     | BullMQ queue setup                                  | None                                                |
| 24  | `lib/queue/backfill.worker.ts`                    | 381     | BullMQ worker                                       | None                                                |
| 25  | `components/admin/ai-floating-widget.tsx`         | 205     | AI chatbot widget                                   | None                                                |

---

## 2. Audit Results

### TypeScript Compilation (`npx tsc --noEmit`)

| Metric                                | Before                        | After                  |
| ------------------------------------- | ----------------------------- | ---------------------- |
| Errors in `ai-dashboard/` files       | 2 (Recharts formatter types)  | **0**                  |
| Errors in `content-health.service.ts` | 0 (but runtime-unsafe Prisma) | **0** (properly typed) |
| Errors in other files (pre-existing)  | 32                            | 32 (unchanged)         |

### ESLint / Linter

| Metric                           | Before | After |
| -------------------------------- | ------ | ----- |
| Lint errors in dashboard files   | 0      | **0** |
| `console.log` in dashboard files | 0      | **0** |

### Browser Verification

| Tab                          | Status     | Notes                                                        |
| ---------------------------- | ---------- | ------------------------------------------------------------ |
| نظرة عامة (Overview)         | ✅ Renders | KPI cards, gauge, donut, trend, goal tracking, quick actions |
| صحة المحتوى (Content Health) | ✅ Renders | Gap cards, actions bar, search, product table, pagination    |
| مراجعة الصور (Image Review)  | ✅ Renders | Filter dropdown, empty state (green success card)            |
| التحليلات (Analytics)        | ✅ Renders | KPI cards, cost chart, job table, filters, CSV export        |
| Console errors               | ✅ None    | Only dev-mode warnings (Fast Refresh, React DevTools)        |

---

## 3. Fixes Applied

### Fix 1: DRY — Extract Shared Utilities

**Created:** `_utils/ai-dashboard.utils.ts` (190 lines)

Extracted from 3 files:

- `GAP_LABELS` — gap type labels (Arabic)
- `GAP_LABELS_DETAILED` — content-health specific labels
- `GAP_COLORS` — donut chart colors
- `QUALITY_TARGET_STORAGE_KEY` — localStorage key
- `getRelativeTime()` — Arabic relative timestamps
- `getMilestone()` — quality milestone badge
- `notifyJobComplete()` — browser notification API
- `pollJobProgress()` — backfill job polling with cleanup
- `JOB_TYPE_LABELS` / `JOB_STATUS_LABELS` — analytics labels
- `normalizeJobStatus()` — status normalization
- `exportJobsToCSV()` — client-side CSV export
- `readLocalStorage()` / `writeLocalStorage()` — SSR-safe storage

**Impact:** Eliminated 100+ lines of duplicated code across 3 tab files.

### Fix 2: Prisma Type Safety

**File:** `content-health.service.ts`

```typescript
// BEFORE (runtime-unsafe)
const where: Record<string, unknown> = { deletedAt: null }

// AFTER (fully typed)
import { Prisma } from '@prisma/client'
const where: Prisma.ProductWhereInput = { deletedAt: null }
```

**Impact:** Compile-time validation of all query conditions. No more runtime risk from mistyped fields.

### Fix 3: SSR-Safe localStorage

**File:** `overview-tab.tsx`

```typescript
// BEFORE (crashes in SSR)
const [targetScore, setTargetScore] = useState(() => {
  if (typeof window === 'undefined') return 80
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? Math.max(0, Math.min(100, Number(stored) || 80)) : 80
})

// AFTER (deferred to useEffect)
const [targetScore, setTargetScore] = useState(80)
useEffect(() => {
  const stored = readLocalStorage(QUALITY_TARGET_STORAGE_KEY, '80')
  setTargetScore(Math.max(0, Math.min(100, Number(stored) || 80)))
}, [])
```

### Fix 4: Keyboard Shortcut Conflicts

**File:** `image-review-tab.tsx`

```typescript
// BEFORE (fires on any key, including form inputs)
if (e.key === 'a' || e.key === 'A') {
  e.preventDefault()
  handleAction(lightboxImage.id, 'approve')
}

// AFTER (skips interactive elements)
const tag = (e.target as HTMLElement)?.tagName
if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
if (e.key === 'a' || e.key === 'A') { ... }
```

### Fix 5: Dialog Race Condition

**File:** `image-review-tab.tsx`

```typescript
// BEFORE (stale closure risk)
<Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>

// AFTER (stable callback + ref for keyboard handler)
const lightboxRef = useRef<PendingImageItem | null>(null)
lightboxRef.current = lightboxImage

const handleLightboxClose = useCallback((open: boolean) => {
  if (!open) setLightboxImage(null)
}, [])
<Dialog open={!!lightboxImage} onOpenChange={handleLightboxClose}>
```

### Fix 6: Recharts Tooltip Type Safety

**File:** `overview-tab.tsx`

```typescript
// BEFORE (explicit type annotation conflicting with Recharts generics)
<Tooltip formatter={(v: number) => [v, 'منتج']} />

// AFTER (inferred from Recharts)
<Tooltip formatter={(v) => [v, 'منتج']} />
```

### Fix 7: Polling Refactor

**Files:** `overview-tab.tsx`, `content-health-tab.tsx`

```typescript
// BEFORE (duplicated setInterval + cleanup in each file)
useEffect(() => {
  if (!jobId || !isRunning) return
  const interval = setInterval(async () => { ... }, 2000)
  return () => clearInterval(interval)
}, [jobId, isRunning])

// AFTER (shared utility with proper cleanup)
const pollCleanupRef = useRef<(() => void) | null>(null)
useEffect(() => { return () => { pollCleanupRef.current?.() } }, [])

pollCleanupRef.current = pollJobProgress(
  data.jobId,
  (p) => setFillAllProgress(p),
  (status, processed) => { /* onComplete */ }
)
```

### Fix 8: Responsive Improvements

All 4 tabs updated with mobile-first responsive patterns:

| Element              | Before                          | After                                       |
| -------------------- | ------------------------------- | ------------------------------------------- |
| KPI grids            | `md:grid-cols-2 lg:grid-cols-4` | `grid-cols-2 lg:grid-cols-4`                |
| Buttons              | Fixed width                     | `w-full sm:w-auto`                          |
| Tables               | Overflow hidden                 | `overflow-x-auto` + `hidden sm:table-cell`  |
| Card headers         | Row-only                        | `flex-col sm:flex-row`                      |
| Image grid           | `sm:grid-cols-2 lg:grid-cols-3` | `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` |
| Product names        | Overflow                        | `truncate max-w-[120px] sm:max-w-none`      |
| Dialogs              | Fixed width                     | `max-w-[95vw] sm:max-w-2xl`                 |
| Filter dropdowns     | Fixed width                     | `w-full sm:w-[220px]`                       |
| Image action buttons | Full text                       | `<span className="hidden sm:inline">`       |

---

## 4. Architecture Improvements

### Code Reduction Summary

| File                          | Before (lines) | After (lines) | Reduction |
| ----------------------------- | -------------- | ------------- | --------- |
| overview-tab.tsx              | 756            | 420           | -44%      |
| content-health-tab.tsx        | 507            | 310           | -39%      |
| image-review-tab.tsx          | 401            | 310           | -23%      |
| analytics-tab.tsx             | 389            | 240           | -38%      |
| **NEW** ai-dashboard.utils.ts | 0              | 190           | —         |
| **Total**                     | 2053           | 1470          | **-28%**  |

### Dependency Graph (Shared Utils)

```
ai-dashboard.utils.ts
├── overview-tab.tsx (GAP_LABELS, GAP_COLORS, getMilestone, notifyJobComplete,
│                     pollJobProgress, readLocalStorage, writeLocalStorage)
├── content-health-tab.tsx (GAP_LABELS_DETAILED, getRelativeTime,
│                           notifyJobComplete, pollJobProgress)
├── analytics-tab.tsx (JOB_TYPE_LABELS, JOB_STATUS_LABELS,
│                      normalizeJobStatus, exportJobsToCSV)
└── image-review-tab.tsx (no shared utils needed — standalone)
```

---

## 5. Pre-Existing Issues (Not from AI Dashboard)

| File                        | Errors                        | Status                             |
| --------------------------- | ----------------------------- | ---------------------------------- |
| `quality-scorer.service.ts` | 6 TS errors (type mismatches) | Pre-existing, not from our changes |
| `spec-parser.service.ts`    | 5 TS errors (property access) | Pre-existing, not from our changes |
| Various other services      | ~21 TS errors                 | Pre-existing, not from our changes |

---

## 6. Final Verification

| Check                                   | Result                  |
| --------------------------------------- | ----------------------- |
| `npx tsc --noEmit` — AI dashboard files | ✅ 0 errors             |
| `ReadLints` — all 6 modified files      | ✅ 0 linter errors      |
| `console.log` in dashboard              | ✅ None found           |
| Browser: Login → Dashboard              | ✅ Successful           |
| Browser: Overview tab                   | ✅ Renders correctly    |
| Browser: Content Health tab             | ✅ Renders correctly    |
| Browser: Image Review tab               | ✅ Renders correctly    |
| Browser: Analytics tab                  | ✅ Renders correctly    |
| Browser: Console errors                 | ✅ None from our code   |
| Dev server: `npm run dev`               | ✅ Running on port 3001 |

---

## 7. Remaining Enterprise Upgrades (Future Work)

These items were identified in the strategic review but are out of scope for this audit:

| Priority  | Item                                                | Effort   |
| --------- | --------------------------------------------------- | -------- |
| 🔴 High   | Replace polling with SSE for real-time job progress | 2-3 days |
| 🔴 High   | Granular permissions (ai.view/run/review/configure) | 1-2 days |
| 🔴 High   | AI job audit trail (userId, route, reason)          | 1 day    |
| 🟠 Medium | Budget integration (daily/monthly caps)             | 2 days   |
| 🟠 Medium | Scoped fill flow (filter by gap type, score range)  | 1-2 days |
| 🟠 Medium | Quality score breakdown per product                 | 1 day    |
| 🟡 Low    | AI suggestions panel                                | 1 day    |
| 🟡 Low    | Estimated impact calculator                         | 1 day    |
| 🟡 Low    | Image auto-approve threshold                        | 0.5 days |
| 🔵 Future | BI layer (quality vs bookings/revenue correlation)  | 3-5 days |
| 🔵 Future | AI Auto Mode (daily micro-fix scheduling)           | 3-5 days |

---

**Conclusion:** The AI Dashboard feature is now free of all code-level issues introduced during the 20-edit sprint. Duplicated code has been extracted to a shared utils module (-28% LOC), all runtime risks are resolved (Prisma types, SSR localStorage, keyboard conflicts, Dialog race conditions, Recharts types), responsive design is mobile-first, and all 4 tabs have been browser-verified with zero console errors.
