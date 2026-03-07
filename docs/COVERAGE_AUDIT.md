# Coverage Audit — 0% and Low-Coverage Files

**Purpose:** List every file at 0% (or low) coverage, grouped by priority for systematic test addition.  
**Target:** 80%+ statements, branches, functions, lines; 100% per file where possible.

---

## Current baseline (before this audit)

| Metric     | Value   |
|-----------|---------|
| Statements| 3.03%   |
| Branches  | 15.12%  |
| Functions | 4.32%   |
| Lines     | 3.03%   |
| Tests     | 212     |

---

## PRIORITY 1 — Core Services (test first)

**Location:** `src/lib/services/`  
**Count:** 56+ service files without a corresponding test file (9 have tests).

### Services with existing tests
- booking.service.test.ts, cart.service.test.ts, equipment.service.test.ts  
- invoice.service.test.ts, payment.service.test.ts, pricing.service.test.ts  
- content-health.service.test.ts, quality-scorer.service.test.ts, product-equipment-sync.service.test.ts  

### Services at 0% (no test file)
- ai-analytics.service.ts, ai-audit.service.ts, ai-autofill.service.ts  
- ai-confidence.service.ts, ai-content-generation.service.ts, ai-master-fill.service.ts  
- ai.service.ts, ai-spec-parser.service.ts, ai-validation.service.ts  
- approval.service.ts, **audit.service.ts**, **blog.service.ts**  
- client.service.ts, **column-mapper.service.ts**, **contract.service.ts**  
- **coupon.service.ts**, dashboard.service.ts, delivery.service.ts  
- feature-flag.service.ts, hero-banner.service.ts, image-processing.service.ts  
- image-sourcing.service.ts, import-recommendations.service.ts, import-validation.service.ts  
- integration-config.service.ts, integration.service.ts, maintenance.service.ts  
- marketing.service.ts, media.service.ts, messaging-automation.service.ts  
- notification.service.ts, payout.service.ts, policy.service.ts  
- **product-catalog.service.ts**, **product-similarity.service.ts**, **reports.service.ts**  
- **seo-generation.service.ts**, **shoot-type.service.ts**, **specs-db.service.ts**  
- **studio.service.ts**, studio-faq.service.ts, studio-package.service.ts, studio-schedule.service.ts  
- template-renderer.service.ts, translation.service.ts, vendor.service.ts  
- warehouse.service.ts, web-researcher.service.ts, whatsapp.service.ts, sms.service.ts  

---

## PRIORITY 2 — Middleware

**Location:** `src/middleware.ts`  
**Count:** 1 file, 0% coverage.

- middleware.ts (1–230) — auth, validation, error handling, rate limiting.

---

## PRIORITY 3 — App Routes / Controllers

**Location:** `src/app/`  
**Count:** 200+ route/page files at 0%.

- App layout/error: error.tsx, global-error.tsx, layout.tsx, loading.tsx, not-found.tsx, providers.tsx, robots.ts, sitemap.ts  
- Auth: (auth)/forgot-password, login, register, reset-password, verify-email  
- Public: (public)/layout, page, about, blog/*, booking/confirmation, bookings/guest, build-your-kit, cart, categories, checkout/*, compare, contact, equipment/*, faq, how-it-works, etc.  
- API: app/api/** — hundreds of route handlers (only a few have __tests__).

---

## PRIORITY 4 — Stores

**Location:** `src/lib/stores/`  
**Count:** All store files at 0%.

- All state management files and store actions/selectors.

---

## PRIORITY 5 — Utils and Validators (remaining)

**Utils at 0% or low:**  
- encryption.ts, sanitize.ts, sku-generator.ts  
- equipment-fuzzy-matcher.ts, fetch-page-text.ts, letter-template.utils.ts  
- export.utils.ts, blog-preview.ts, public-feature-flags.ts  
- category-icons.tsx, specifications.utils.ts, excel-parser.ts  
- rate-limit.ts, rate-limit-upstash.ts, image.utils.ts  
- circuit-breaker.ts, cost-tracker.ts  

**Validators:** Most validators (other than booking and blog) have no tests.

---

## Partially covered (fix gaps first)

| File | Current | Target | Gaps |
|------|---------|--------|------|
| booking.validator.ts | lines 50–54 uncovered | 100% | updateBookingSchema refine (both dates, end &lt;= start) — **fixed** |
| quality-scorer.service.ts | ~61% stmts | 100% | persist path, getImageCount isDeleted, scoreAllProducts, getProductsWithGaps, getCachedScan cache hit, getQualityTrend, captureQualitySnapshot — **extended** |
| product-equipment-sync.service.ts | ~46% | 100% | syncProductToEquipment, more syncEquipmentToProduct branches |
| src/lib/utils (folder) | ~39% | 100% | Many utils still 0% |

---

## Execution order (this session)

1. Run coverage → list 0% files (this doc).  
2. Fix partially covered: booking.validator, quality-scorer, product-equipment-sync.  
3. Add tests for Priority 1 services (start with audit.service, then coupon, client).  
4. Add tests for Priority 2 middleware.  
5. Add tests for Priority 4 stores and Priority 5 utils.  
6. Run final coverage and report.

---

## Counts (scope)

- **Untested service files:** 56+  
- **Untested route/page files:** 200+  
- **Untested utils/validators:** 30+  
- **Middleware:** 1  
- **Stores:** multiple files  

Total untested files: **300+**. Reaching 80% overall will require adding tests across all priorities; this audit is the roadmap.
