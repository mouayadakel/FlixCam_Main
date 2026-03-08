# Admin AI Dashboard — Full Report

**Route:** `http://localhost:3000/admin/ai-dashboard`  
**Permission:** `ai.use` (required; enforced in sidebar and all AI API routes)  
**Layout:** RTL (Arabic), inside admin layout with sidebar, header, breadcrumbs.

---

## 1. Overview

The **AI Dashboard** is the admin command center for content quality, AI-backed scanning, auto-fill (backfill), and job history. It is a client-rendered page (`'use client'`) with four tabs:

| Tab (AR)     | Tab (EN)       | Purpose                                                                                             |
| ------------ | -------------- | --------------------------------------------------------------------------------------------------- |
| نظرة عامة    | Overview       | Quality score KPIs, gauge, gap donut, trend chart, bottom-20 products, goal tracking, quick actions |
| صحة المحتوى  | Content Health | Gap-type cards, scan/fill actions, paginated products table with selection                          |
| مراجعة الصور | Image Review   | Grid of AI-generated images pending approval/reject (single + bulk)                                 |
| التحليلات    | Analytics      | Job history table + cost-by-day chart                                                               |

---

## 2. User Stories

### US1 — Content steward

**As a** content steward (admin with `ai.use`),  
**I want** to see an overview of catalog quality (scores, gaps, trend) and the worst 20 products,  
**So that** I can decide what to improve and trigger AI fill for specific items.

### US2 — Bulk quality operator

**As an** admin with `ai.use`,  
**I want** to run a content-health scan, see products by gap type (translations, SEO, description, photos, specs), and run “fill all” or “fill selected” with AI,  
**So that** I can fix content gaps at scale and track job progress.

### US3 — Image moderator

**As an** admin with `ai.use`,  
**I want** to review AI-generated images (approve/reject) per product or in bulk,  
**So that** only approved images go live and quality is controlled.

### US4 — Cost and ops viewer

**As an** admin with `ai.use`,  
**I want** to see AI job history (type, status, processed count, errors, cost) and cost-by-day,  
**So that** I can monitor usage and cost.

---

## 3. Use Cases

| ID   | Use case                          | Actor          | Precondition                            | Flow summary                                                                                                                                              |
| ---- | --------------------------------- | -------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UC1  | View quality overview             | Admin (ai.use) | Logged in, on AI Dashboard              | Open dashboard → Overview tab loads → Calls summary, trend, bottom-20 APIs → Renders cards, gauge, donut, line chart, table, goal tracker, quick actions. |
| UC2  | Fill single product (Overview)    | Admin (ai.use) | Overview loaded, bottom-20 list visible | Click “ملء الآن” on a row → POST backfill with `productIds: [id]` → Toast + row removed from list.                                                        |
| UC3  | Set quality goal                  | Admin (ai.use) | Overview loaded                         | Change target % (0–100) → “منتج تحتاج تحسين” count updates (derived from distribution vs target).                                                         |
| UC4  | Content health scan               | Admin (ai.use) | Content Health tab                      | “فحص الكل” → GET content-health (current page) → Table and gap cards refresh.                                                                             |
| UC5  | Fill all (Content Health)         | Admin (ai.use) | Content Health tab                      | “ملء الكل بالذكاء الاصطناعي” → POST backfill `fillAll: true` → Job ID returned, polling starts → Progress bar, then refresh.                              |
| UC6  | Fill selected products            | Admin (ai.use) | Products selected in table              | Select rows (or “select all”) → “ملء المحدد (n)” → POST backfill `productIds: [...]` → Job polling, then refresh.                                         |
| UC7  | Fill one product (Content Health) | Admin (ai.use) | Content Health table                    | “ملء الآن” on row → POST backfill for that id → Toast; if jobId returned, polling for that job.                                                           |
| UC8  | Review single image               | Admin (ai.use) | Image Review tab, list loaded           | Approve or Reject on one image → PATCH pending-images/:id with `action` → Item removed, toast.                                                            |
| UC9  | Bulk approve/reject images        | Admin (ai.use) | Images selected                         | Select images (or “select all”) → “موافقة على المحدد” or “رفض المحدد” → POST pending-images/bulk → List and selection clear, toast.                       |
| UC10 | Filter images by product          | Admin (ai.use) | Image Review tab                        | Choose product from dropdown → GET pending-images?productId=… → Grid updates.                                                                             |
| UC11 | View job history and cost         | Admin (ai.use) | Analytics tab                           | Tab loads → GET jobs?limit=30 → Table + cost-by-day chart (from job costUsd).                                                                             |

---

## 4. Path Map (Route & API)

### Page route

```
GET /admin/ai-dashboard
  → Layout: admin (sidebar, header, breadcrumbs)
  → Protection: permission ai.use (via /admin/ai prefix in ROUTE_PERMISSIONS)
  → Page: src/app/admin/(routes)/ai-dashboard/page.tsx
  → Tabs: Overview | Content Health | Image Review | Analytics
```

### Navigation entry

- **Sidebar:** “لوحة الذكاء الاصطناعي” / “AI Dashboard” → `/admin/ai-dashboard`, permission `ai.use`.
- **Redirect:** `/admin/ai` → redirects to `/admin/ai-dashboard`.

### API routes used by the dashboard

| Method | Path                                                           | Used by                  | Purpose                                                                                                                                                                |
| ------ | -------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/admin/ai/quality/summary`                                | Overview                 | Total products, avg score, distribution (excellent/good/fair/poor), gaps (missingTranslations, missingSeo, missingDescription, missingPhotos, missingSpecs), scannedAt |
| GET    | `/api/admin/ai/quality/trend?days=84`                          | Overview                 | Time series: date, avgScore, totalProducts (12 weeks)                                                                                                                  |
| GET    | `/api/admin/ai/quality/products?sort=score&order=asc&limit=20` | Overview                 | Bottom 20 products by quality score (id, name, score)                                                                                                                  |
| POST   | `/api/admin/ai/backfill`                                       | Overview, Content Health | Start backfill: body `{ productIds?: string[], fillAll?: boolean }` → `{ jobId?, queued?, message? }`                                                                  |
| GET    | `/api/admin/ai/backfill?jobId=...`                             | Content Health           | Job progress: status, progress, processed, total, errors (polling every 2s)                                                                                            |
| GET    | `/api/admin/ai/content-health?page=&limit=20`                  | Content Health           | total, byGapType, products (id, name, qualityScore, missingFields[])                                                                                                   |
| GET    | `/api/admin/ai/pending-images?productId=...`                   | Image Review             | items[] (id, url, imageSource, qualityScore, productId, productName, createdAt)                                                                                        |
| PATCH  | `/api/admin/ai/pending-images/:id`                             | Image Review             | body `{ action: 'approve' \| 'reject' }`                                                                                                                               |
| POST   | `/api/admin/ai/pending-images/bulk`                            | Image Review             | body `{ action, ids[] }`                                                                                                                                               |
| GET    | `/api/admin/ai/jobs?limit=30`                                  | Analytics                | jobs[] (id, type, status, total, processed, errors, costUsd, startedAt, completedAt)                                                                                   |

All above API routes enforce `ai.use` (403 if missing).

---

## 5. Step-by-Step Analysis

### 5.1 Entry and layout

1. User is logged in and has role/permission granting `ai.use`.
2. User opens sidebar → “لوحة الذكاء الاصطناعي” / “AI Dashboard” (or navigates to `/admin/ai-dashboard`).
3. Admin layout renders: sidebar (RTL), header, breadcrumbs, then page content wrapped in `ProtectedRoute`.
4. `getRequiredPermission('/admin/ai-dashboard')` matches `/admin/ai` → requires `ai.use`. If user lacks it, 403 UI (غير مصرح) is shown; otherwise the AI Dashboard page renders.

### 5.2 Page shell and tabs

5. Page component (`page.tsx`) renders:
   - Title: “لوحة الذكاء الاصطناعي”
   - Subtitle: “نظرة عامة على صحة المحتوى، والمسح، والملء التلقائي، وسجل المهام”
   - TabsList with four TabsTriggers: نظرة عامة | صحة المحتوى | مراجعة الصور | التحليلات
   - TabsContent for each; default tab is “overview”.

6. No initial data fetch at page level; each tab fetches its own data when mounted/visible.

---

### 5.3 Tab: Overview (نظرة عامة)

7. **Mount:** `OverviewTab` runs `fetchAll()` in `useEffect`:
   - `GET /api/admin/ai/quality/summary` → summary state (totalProducts, avgQualityScore, distribution, gaps, scannedAt).
   - `GET /api/admin/ai/quality/trend?days=84` → trend state (date, avgScore, totalProducts).
   - `GET /api/admin/ai/quality/products?sort=score&order=asc&limit=20` → bottomProducts state.

8. **Loading:** Skeleton grid (4 cards) + 2 skeleton blocks.

9. **Render when data ready:**
   - **Top row (4 cards):** Total products, “منتجات بمحتوى كامل (80+)” (excellent), “منتجات تحتاج تحسين” (good+fair+poor), “متوسط نقاط الجودة” (CircularProgress + %).
   - **Second row:** Left: big “مقياس الجودة الإجمالي” gauge (avg score). Right: “توزيع الفجوات” donut (gaps: ترجمات، SEO، وصف، صور، مواصفات).
   - **If trend data:** Line chart “اتجاه الجودة (آخر 12 أسبوعاً)” (date vs avgScore, 0–100).
   - **Goal card:** “تتبع الهدف” — number input (targetScore 0–100); text shows how many products need improvement to reach target (derived from distribution).
   - **Table:** “أقل 20 منتجاً من حيث الجودة” — columns: المنتج, النقاط, إجراء; each row has “ملء الآن” button.

10. **Action “ملء الآن” (single product):**
    - `handleFillNow(productId)`: POST `/api/admin/ai/backfill` with `{ productIds: [productId] }`.
    - On success: toast, remove product from local bottomProducts.
    - On error: toast destructive.

11. **Quick actions (links to same page):**
    - “تحديث البيانات” → `fetchAll()`.
    - “فحص الكل” / “ملء الكل بالذكاء الاصطناعي” / “عرض سجل المهام” → currently only link to `/admin/ai-dashboard` (no distinct handlers; “تحديث البيانات” is the only one that refetches).

---

### 5.4 Tab: Content Health (صحة المحتوى)

12. **Mount:** `ContentHealthTab` runs `fetchScan()` in `useEffect` (depends on `page`):
    - `GET /api/admin/ai/content-health?page={page}&limit=20` → scanData (total, byGapType, products).

13. **Render:**
    - **Gap cards:** One card per gap type (translations, seo, description, photos, specs) with count from `byGapType`.
    - **Actions:** “فحص الكل”, “ملء الكل بالذكاء الاصطناعي”, “ملء المحدد (n)” (disabled if no selection or job running).
    - **Job progress:** If job running, card with progress bar and “processed / total (progress%)”; polling every 2s via GET `/api/admin/ai/backfill?jobId=...` until status done/failed, then `fetchScan()` and toast.
    - **Table:** Checkbox (per row + “select all”), نقاط الجودة (color by band), اسم المنتج, الحقول الناقصة (badges), إجراء “ملء الآن”.
    - **Pagination:** إذا total > limit — السابق / صفحة n من m / التالي.

14. **Actions:**
    - **فحص الكل:** `fetchScan()` + toast.
    - **ملء الكل:** POST backfill `fillAll: true` → set jobId, start polling; toast with queued count or message.
    - **ملء المحدد:** POST backfill `productIds: selectedIds` → same polling; clear selection.
    - **ملء الآن (row):** POST backfill `productIds: [id]`; if jobId returned, set job and polling.

---

### 5.5 Tab: Image Review (مراجعة الصور)

15. **Mount:** `ImageReviewTab` runs `fetchList()` in `useEffect` (depends on `filterProductId`):
    - `GET /api/admin/ai/pending-images` (optional `?productId=...`) → items state.

16. **Render:**
    - Header text: count or “لا توجد صور في انتظار المراجعة”.
    - **Filter:** Select “المنتج” (all or specific product from current items).
    - **If items exist:** “تحديد الكل” checkbox, “موافقة على المحدد (n)”, “رفض المحدد (n)”.
    - **Grid:** Cards with checkbox, image, product name, optional quality %, and “موافقة” / “رفض” buttons.

17. **Actions:**
    - **Single:** PATCH `/api/admin/ai/pending-images/:id` with `{ action: 'approve' | 'reject' }` → remove from list, toast.
    - **Bulk:** POST `/api/admin/ai/pending-images/bulk` with `{ action, ids }` → remove selected from list, clear selection, toast.

---

### 5.6 Tab: Analytics (التحليلات)

18. **Mount:** `AnalyticsTab` runs load in `useEffect`:
    - `GET /api/admin/ai/jobs?limit=30` → jobs state.

19. **Render:**
    - **If any job has costUsd:** Line chart “التكلفة حسب اليوم” (date vs summed cost per day).
    - **Table “سجل المهام”:** الوقت, النوع (ملء محتوى/صور/مواصفات/دردشة), الحالة (منتهية/فشل/جارية/قيد الانتظار), المُعالَج (processed/total), الأخطاء, التكلفة (USD or —).

---

## 6. Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│  /admin/ai-dashboard (ai.use)                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  [نظرة عامة]     [صحة المحتوى]   [مراجعة الصور]   [التحليلات]            │
└───┬─────────────┬──────────────┬────────────────┬──────────────────────┘
    │             │              │                │
    ▼             ▼              ▼                ▼
 quality/        content-health  pending-images   jobs
 summary         + backfill      + PATCH/bulk
 trend
 products
 + backfill POST
```

- **Overview:** Read-only quality metrics + single-product backfill.
- **Content Health:** Scan (content-health) + backfill (all / selected / one) with job polling.
- **Image Review:** List pending images, filter by product, approve/reject single or bulk.
- **Analytics:** Read-only job list and cost aggregation by day.

---

## 7. Security & Permissions

- **Route:** Admin layout + `ProtectedRoute`; permission inferred from path: `/admin/ai-dashboard` matches `/admin/ai` → `ai.use`.
- **Sidebar:** Link to AI Dashboard is shown only if user has `ai.use`.
- **APIs:** All listed AI endpoints check `ai.use` and return 403 when missing.

---

## 8. Gaps / Notes (for product or UX)

1. **Overview quick actions:** “فحص الكل”, “ملء الكل بالذكاء الاصطناعي”, “عرض سجل المهام” are links to the same page and do not trigger scan, fill-all, or navigation to Analytics; only “تحديث البيانات” refetches.
2. **Content Health “آخر فحص”:** Shows static “منذ قليل”; no real last-scan timestamp from API.
3. **ROUTE_PERMISSIONS:** There is no explicit `/admin/ai-dashboard` entry; access is granted via `/admin/ai` prefix. Adding `/admin/ai-dashboard` with `ai.use` would make intent explicit.
4. **Error handling:** Tabs show toasts on API errors; no global error boundary specific to the dashboard.

---

## 9. File Reference

| File                                                                     | Role                                                                        |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `src/app/admin/(routes)/ai-dashboard/page.tsx`                           | Dashboard page, tab shell                                                   |
| `src/app/admin/(routes)/ai-dashboard/_components/overview-tab.tsx`       | Overview tab                                                                |
| `src/app/admin/(routes)/ai-dashboard/_components/content-health-tab.tsx` | Content Health tab                                                          |
| `src/app/admin/(routes)/ai-dashboard/_components/image-review-tab.tsx`   | Image Review tab                                                            |
| `src/app/admin/(routes)/ai-dashboard/_components/analytics-tab.tsx`      | Analytics tab                                                               |
| `src/components/layouts/admin-sidebar.tsx`                               | Sidebar entry (ai-dashboard, ai.use)                                        |
| `src/components/auth/protected-route.tsx`                                | Route → permission (e.g. /admin/ai → ai.use)                                |
| `src/app/api/admin/ai/*`                                                 | All AI API routes (quality, backfill, content-health, pending-images, jobs) |

This report can be used for onboarding, QA test cases, and product/UX improvements (e.g. wiring quick actions, last-scan time, explicit route permission).
