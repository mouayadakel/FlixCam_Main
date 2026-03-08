# TypeScript (.ts) Files Inventory

**Generated:** March 2026  
**Total .ts files:** 804 (excluding node_modules, .next, dist, coverage, .history)

This document lists all TypeScript files in use in the FlixCam project, organized by directory and purpose.

---

## Root / Config

| File | Purpose |
|------|---------|
| `instrumentation.ts` | Next.js instrumentation (Sentry, etc.) |
| `next-env.d.ts` | Next.js TypeScript declarations |
| `playwright.config.ts` | E2E test configuration |
| `sentry.client.config.ts` | Sentry client-side config |
| `sentry.edge.config.ts` | Sentry edge config |
| `sentry.server.config.ts` | Sentry server config |
| `tailwind.config.ts` | Tailwind CSS configuration |

---

## Prisma

| File | Purpose |
|------|---------|
| `prisma/seed.ts` | Main database seed |
| `prisma/seed-blog.ts` | Blog seed data |
| `prisma/seed-checkout-form.ts` | Checkout form seed |
| `prisma/seed-footer.ts` | Footer seed |
| `prisma/seed-rbac.ts` | RBAC seed |
| `prisma/scripts/migrate-temporary-data.ts` | Migration script |

---

## Scripts

| File | Purpose |
|------|---------|
| `scripts/analyze-ai-feedback.ts` | AI feedback analysis |
| `scripts/audit-zh-translations.ts` | Chinese translation audit |
| `scripts/check-barcode-conflicts.ts` | Barcode conflict check |
| `scripts/check-import-status.ts` | Import status check |
| `scripts/cleanup-id-photos.ts` | ID photo cleanup |
| `scripts/cleanup-orphaned-imports.ts` | Orphaned import cleanup |
| `scripts/clear-equipment-for-testing.ts` | Test data cleanup |
| `scripts/complete-french-translations-ai.ts` | French AI translations |
| `scripts/complete-zh-translations.ts` | Chinese translations |
| `scripts/create-test-user.ts` | Test user creation |
| `scripts/data/terms-policy-body.ts` | Terms/policy body data |
| `scripts/enable-equipment-catalog.ts` | Enable equipment catalog |
| `scripts/final-zh-translations.ts` | Final Chinese translations |
| `scripts/generate-french-translations.ts` | French translation gen |
| `scripts/generate-zh-translations.ts` | Chinese translation gen |
| `scripts/import-flix-stock-from-xlsx.ts` | Excel import |
| `scripts/migrate-equipment-specs-to-structured.ts` | Specs migration |
| `scripts/process-pending-imports.ts` | Process imports |
| `scripts/seed-lighting-subcategories.ts` | Lighting subcategories seed |
| `scripts/seed-policies.ts` | Policies seed |
| `scripts/start-import-worker.ts` | Start import worker |
| `scripts/start-workers.ts` | Start all workers |
| `scripts/sync-products-to-equipment.ts` | Product-equipment sync |
| `scripts/test-import-direct.ts` | Direct import test |
| `scripts/test-phase3.ts` | Phase 3 test |
| `scripts/test-phase6.ts` | Phase 6 test |
| `scripts/test-specifications.ts` | Specifications test |
| `scripts/test-studio-features.ts` | Studio features test |
| `scripts/verify-all-phases.ts` | Phase verification |
| `scripts/verify-products.ts` | Product verification |

---

## E2E Tests

| File | Purpose |
|------|---------|
| `e2e/admin-authors.spec.ts` | Admin authors E2E |
| `e2e/admin-categories.spec.ts` | Admin categories E2E |
| `e2e/admin-flow.spec.ts` | Admin flow E2E |
| `e2e/ai-dashboard.spec.ts` | AI dashboard E2E |
| `e2e/blog-search.spec.ts` | Blog search E2E |
| `e2e/blog-share.spec.ts` | Blog share E2E |
| `e2e/blog-subscribe.spec.ts` | Blog subscribe E2E |
| `e2e/blog-view-post.spec.ts` | Blog view post E2E |
| `e2e/checkout-flow.spec.ts` | Checkout flow E2E |
| `e2e/cms-studios.spec.ts` | CMS studios E2E |
| `e2e/critical-flows.spec.ts` | Critical flows E2E |

---

## Docs (Reference / Examples)

| File | Purpose |
|------|---------|
| `docs/public-website/ui/specs/audit-specifications-route.ts` | Specs audit example |
| `docs/public-website/ui/specs/convert-specifications-route.ts` | Specs convert example |
| `docs/public-website/ui/specs/specifications-utils.ts` | Specs utils example |
| `docs/public-website/ui/specs/test-data.ts` | Test data example |
| `docs/public-website/ui/specs/test-specifications.ts` | Specs test example |
| `docs/public-website/ui/specs/types.ts` | Types example |

---

## src/app — API Routes & App

### Public Routes
- `src/app/(public)/blog/rss.xml/route.ts`
- `src/app/(public)/blog/sitemap.xml/route.ts`

### Admin Utils
- `src/app/admin/(routes)/ai-dashboard/_utils/ai-dashboard.utils.ts`
- `src/app/admin/(routes)/inventory/import/import-mode.utils.ts`

### API Routes (by domain)

**Admin API** — ~120 route files under `src/app/api/admin/`:
- 2FA, AI (backfill, drafts, jobs, quality, etc.), blog, bookings, bundles, CMS, equipment, FAQ, hero-banners, imports, messaging, permissions, policies, products, promissory-notes, reports, roles, settings, shoot-types, studios, users, vendors, website-pages

**AI API** — `src/app/api/ai/`:
- blog (alt-text, auto-tags, extract-equipment, faq, generate-draft, headline-optimizer, etc.), chatbot, compatible-equipment, demand-forecast, kit-builder, pricing, recommendations, risk-assessment

**Auth API** — `src/app/api/auth/`:
- [...nextauth], forgot-password, otp, register, reset-password, signin, signout, verify-email

**Other API** — analytics, approvals, audit-logs, blog, bookings, branches, brands, bundles, cart, categories, checkout, clients, contracts, coupons, cron, customer-segments, damage-claims, dashboard, delivery, delivery-zones, discount-codes, equipment, feature-flags, finance, footer, health, holds, integrations, invoices, kits, maintenance, marketing, media, newsletter, notification-templates, notifications, orders, payments, portal, pricing-rules, profile, promissory-notes, public, quotes, receivers, recurring-series, reports, revalidate-blog, reviews, studios, technicians, test, translations, user, users, vendor, verification-documents, waitlist, wallet, warehouse, webhooks

### App-Level
- `src/app/robots.ts`
- `src/app/sitemap.ts`

---

## src/config

| File | Purpose |
|------|---------|
| `src/config/feature-flag-groups.ts` | Feature flag groups |
| `src/config/implementation-spec.checkout.ts` | Checkout config |
| `src/config/implementation-spec.feature-toggles.ts` | Feature toggles |
| `src/config/site.config.ts` | Site config |
| `src/config/theme.ts` | Theme config |

---

## src/hooks

| File | Purpose |
|------|---------|
| `src/hooks/use-debounce.ts` | Debounce hook |
| `src/hooks/use-job-stream.ts` | Job stream hook |
| `src/hooks/use-locale.ts` | Locale hook |
| `src/hooks/use-permissions.ts` | Permissions hook |
| `src/hooks/use-toast.ts` | Toast hook |

---

## src/lib — Core Library

### Root
- `src/lib/utils.ts`
- `src/lib/analytics.ts`
- `src/lib/cache.ts`
- `src/lib/cart-session.ts`
- `src/lib/config.ts`
- `src/lib/errors.ts`
- `src/lib/logger.ts`
- `src/lib/live-admin.ts`
- `src/lib/pricing-engine.ts`

### src/lib/ai
- `blog-prompts.ts`
- `prompt-templates.ts`
- `spec-templates.ts`
- `validation-pipeline.ts`

### src/lib/analytics
- `multi-language-analytics.ts`

### src/lib/api
- `error-response.ts`

### src/lib/auth
- `auth-helpers.ts`
- `config.ts`
- `field-permission-service.ts`
- `index.ts`
- `matches-permission.ts`
- `menu-service.ts`
- `permission-service.ts`
- `permissions.ts`
- `role-details.ts`
- `role-service.ts`
- `session.ts`

### src/lib/booking
- `state-machine.ts`

### src/lib/constants
- `messaging.ts`

### src/lib/db
- `prisma.ts`

### src/lib/events
- `event-bus.ts`

### src/lib/queue
- `ai-processing.queue.ts`
- `ai-processing.worker.ts`
- `backfill.queue.ts`
- `backfill.worker.ts`
- `dead-letter.queue.ts`
- `image-processing.queue.ts`
- `image-processing.worker.ts`
- `import.queue.ts`
- `import.worker.ts`
- `redis.client.ts`

### src/lib/prompts
- `master-fill.ts`

### src/lib/seo
- `blog-json-ld.ts`
- `hreflang.ts`

### src/lib/constants
- `messaging.ts`

### src/lib/jobs
- `reminder-scheduler.ts`

### src/lib/middleware
- `read-only-edge.ts`
- `read-only.middleware.ts`

### src/lib/settings
- `company-settings.ts`
- `promissory-note-settings.ts`

### src/lib/constants
- `messaging.ts`

### src/lib/supabase
- `client.ts`
- `server.ts`

### src/lib/templates
- `rental-agreement.ts`

### src/lib/test-data
- `index.ts`
- `qsmrent-equipment.ts`

---

## src/lib — Policies

| File | Purpose |
|------|---------|
| `ai.policy.ts` | AI policy |
| `base.policy.ts` | Base policy |
| `booking.policy.ts` | Booking policy |
| `client.policy.ts` | Client policy |
| `contract.policy.ts` | Contract policy |
| `coupon.policy.ts` | Coupon policy |
| `delivery.policy.ts` | Delivery policy |
| `equipment.policy.ts` | Equipment policy |
| `invoice.policy.ts` | Invoice policy |
| `maintenance.policy.ts` | Maintenance policy |
| `marketing.policy.ts` | Marketing policy |
| `payment.policy.ts` | Payment policy |
| `quote.policy.ts` | Quote policy |
| `reports.policy.ts` | Reports policy |
| `warehouse.policy.ts` | Warehouse policy |

---

## src/lib — Services

| File | Purpose |
|------|---------|
| `ai-analytics.service.ts` | AI analytics |
| `ai-audit.service.ts` | AI audit |
| `ai-autofill.service.ts` | AI autofill |
| `ai-confidence.service.ts` | AI confidence |
| `ai-content-generation.service.ts` | AI content gen |
| `ai-master-fill.service.ts` | AI master fill |
| `ai-spec-parser.service.ts` | AI spec parser |
| `ai-validation.service.ts` | AI validation |
| `ai.service.ts` | Core AI service |
| `approval.service.ts` | Approvals |
| `audit.service.ts` | Audit |
| `blog-ai.service.ts` | Blog AI |
| `blog.service.ts` | Blog |
| `booking.service.ts` | Bookings |
| `bundle-recommendations.service.ts` | Bundle recommendations |
| `cart-merge.service.ts` | Cart merge |
| `cart.service.ts` | Cart |
| `catalog-scanner.service.ts` | Catalog scanner |
| `client.service.ts` | Clients |
| `column-mapper.service.ts` | Column mapper |
| `content-health.service.ts` | Content health |
| `contract.service.ts` | Contracts |
| `coupon.service.ts` | Coupons |
| `dashboard.service.ts` | Dashboard |
| `delivery.service.ts` | Delivery |
| `email.service.ts` | Email |
| `equipment.service.ts` | Equipment |
| `faq.service.ts` | FAQ |
| `feature-flag.service.ts` | Feature flags |
| `hero-banner.service.ts` | Hero banners |
| `image-processing.service.ts` | Image processing |
| `image-sourcing.service.ts` | Image sourcing |
| `import-recommendations.service.ts` | Import recommendations |
| `import-validation.service.ts` | Import validation |
| `import-worker.ts` | Import worker |
| `import.service.ts` | Import |
| `inspection.service.ts` | Inspection |
| `integration-config.service.ts` | Integration config |
| `integration.service.ts` | Integrations |
| `invoice-pdf.service.ts` | Invoice PDF |
| `invoice.service.ts` | Invoices |
| `maintenance.service.ts` | Maintenance |
| `marketing.service.ts` | Marketing |
| `media.service.ts` | Media |
| `messaging-automation.service.ts` | Messaging automation |
| `notification-queue.service.ts` | Notification queue |
| `notification.service.ts` | Notifications |
| `payment.service.ts` | Payments |
| `payout.service.ts` | Payouts |
| `pdf.service.ts` | PDF |
| `policy.service.ts` | Policies |
| `pricing.service.ts` | Pricing |
| `product-catalog.service.ts` | Product catalog |
| `product-equipment-sync.service.ts` | Product-equipment sync |
| `product-similarity.service.ts` | Product similarity |
| `promissory-note.service.ts` | Promissory notes |
| `quality-scorer.service.ts` | Quality scorer |
| `quote.service.ts` | Quotes |
| `reports.service.ts` | Reports |
| `seo-generation.service.ts` | SEO generation |
| `shoot-type.service.ts` | Shoot types |
| `sms.service.ts` | SMS |
| `specs-db.service.ts` | Specs DB |
| `studio-faq.service.ts` | Studio FAQ |
| `studio-package.service.ts` | Studio packages |
| `studio-schedule.service.ts` | Studio schedule |
| `studio-testimonial.service.ts` | Studio testimonials |
| `studio.service.ts` | Studios |
| `template-renderer.service.ts` | Template renderer |
| `translation.service.ts` | Translations |
| `vendor.service.ts` | Vendors |
| `warehouse.service.ts` | Warehouse |
| `web-researcher.service.ts` | Web researcher |
| `whatsapp.service.ts` | WhatsApp |

### src/lib/services/pdf
- `contract-pdf.ts`
- `invoice-pdf.ts`
- `promissory-note-pdf.ts`
- `quote-pdf.ts`
- `report-export.ts`

---

## src/lib — Integrations

| File | Purpose |
|------|---------|
| `tap/client.ts` | Tap payment client |
| `whatsapp/client.ts` | WhatsApp client |
| `zatca/invoice-generator.ts` | ZATCA invoice generator |

---

## src/lib — Utils

| File | Purpose |
|------|---------|
| `api-helpers.ts` | API helpers |
| `barcode.ts` | Barcode utils |
| `blog-preview.ts` | Blog preview |
| `check-translations.ts` | Translation check |
| `circuit-breaker.ts` | Circuit breaker |
| `cost-tracker.ts` | Cost tracker |
| `encryption.ts` | Encryption |
| `equipment-fuzzy-matcher.ts` | Fuzzy matcher |
| `excel-parser.ts` | Excel parser |
| `export.utils.ts` | Export utils |
| `fetch-page-text.ts` | Fetch page text |
| `format.utils.ts` | Format utils |
| `image.utils.ts` | Image utils |
| `late-fee.utils.ts` | Late fee utils |
| `letter-template.utils.ts` | Letter template |
| `mock-data.ts` | Mock data |
| `public-feature-flags.ts` | Public feature flags |
| `rate-limit-upstash.ts` | Rate limit (Upstash) |
| `rate-limit.ts` | Rate limit |
| `sanitize.ts` | Sanitization |
| `sku-generator.ts` | SKU generator |
| `specifications.utils.ts` | Specifications utils |
| `whatsapp-context.ts` | WhatsApp context |

---

## src/lib — Validators

| File | Purpose |
|------|---------|
| `ai.validator.ts` | AI validation |
| `auth.validator.ts` | Auth validation |
| `automation-rule.validator.ts` | Automation rules |
| `blog-ai.validator.ts` | Blog AI |
| `blog.validator.ts` | Blog |
| `booking.validator.ts` | Booking |
| `brand.validator.ts` | Brand |
| `business-recipient.validator.ts` | Business recipient |
| `category.validator.ts` | Category |
| `checkout-form.validator.ts` | Checkout form |
| `checkout.validator.ts` | Checkout |
| `client.validator.ts` | Client |
| `contract.validator.ts` | Contract |
| `coupon.validator.ts` | Coupon |
| `customer-segment.validator.ts` | Customer segment |
| `damage-claim.validator.ts` | Damage claim |
| `delivery.validator.ts` | Delivery |
| `equipment.validator.ts` | Equipment |
| `faq.validator.ts` | FAQ |
| `footer.validator.ts` | Footer |
| `hero-banner.validator.ts` | Hero banner |
| `invoice.validator.ts` | Invoice |
| `kit.validator.ts` | Kit |
| `maintenance.validator.ts` | Maintenance |
| `marketing.validator.ts` | Marketing |
| `notification-template.validator.ts` | Notification template |
| `payment.validator.ts` | Payment |
| `policy.validator.ts` | Policy |
| `pricing-rule.validator.ts` | Pricing rule |
| `promissory-note.validator.ts` | Promissory note |
| `quote.validator.ts` | Quote |
| `receiver.validator.ts` | Receiver |
| `recurring.validator.ts` | Recurring |
| `reports.validator.ts` | Reports |
| `review.validator.ts` | Review |
| `shoot-type.validator.ts` | Shoot type |
| `studio-faq.validator.ts` | Studio FAQ |
| `studio-package.validator.ts` | Studio package |
| `studio-testimonial.validator.ts` | Studio testimonial |
| `studio.validator.ts` | Studio |
| `verification.validator.ts` | Verification |
| `warehouse.validator.ts` | Warehouse |

---

## src/lib — Types

| File | Purpose |
|------|---------|
| `ai.types.ts` | AI types |
| `api.types.ts` | API types |
| `backfill.types.ts` | Backfill types |
| `blog.types.ts` | Blog types |
| `booking.types.ts` | Booking types |
| `client.types.ts` | Client types |
| `contract.types.ts` | Contract types |
| `coupon.types.ts` | Coupon types |
| `database.types.ts` | Database types |
| `implementation-spec.types.ts` | Implementation spec |
| `invoice.types.ts` | Invoice types |
| `maintenance.types.ts` | Maintenance types |
| `marketing.types.ts` | Marketing types |
| `payment.types.ts` | Payment types |
| `quote.types.ts` | Quote types |
| `reports.types.ts` | Reports types |
| `specifications.types.ts` | Specifications types |
| `studio.types.ts` | Studio types |

---

## src/lib — Stores

| File | Purpose |
|------|---------|
| `cart.store.ts` | Cart store |
| `checkout.store.ts` | Checkout store |
| `compare-store.ts` | Compare store |
| `kit-wizard.store.ts` | Kit wizard store |
| `locale.store.ts` | Locale store |

---

## src/lib — Hooks

| File | Purpose |
|------|---------|
| `use-admin-feature-flags.ts` | Admin feature flags |
| `use-admin-live.ts` | Admin live |
| `use-kit-queries.ts` | Kit queries |

---

## src/lib — i18n

| File | Purpose |
|------|---------|
| `content-helper.ts` | Content helper |
| `cookie.ts` | i18n cookie |
| `formatting.ts` | Formatting |
| `index.ts` | i18n index |
| `lazy-loader.ts` | Lazy loader |
| `locales.ts` | Locales |
| `translate.ts` | Translate |
| `translation-memory.ts` | Translation memory |

---

## src — Root

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Next.js middleware |
| `src/types/next-auth.d.ts` | NextAuth type declarations |

---

## Test Files

| Location | Count | Purpose |
|----------|-------|---------|
| `src/app/api/__tests__/` | 2 | API route tests |
| `src/app/admin/.../__tests__/` | 1 | Admin utils tests |
| `src/app/portal/__tests__/` | 1 | Portal tests |
| `src/lib/__tests__/` | 1 | Lib tests |
| `src/lib/auth/__tests__/` | 1 | Auth tests |
| `src/lib/integrations/__tests__/` | 3 | Integration tests |
| `src/lib/policies/__tests__/` | 1 | Policy tests |
| `src/lib/queue/__tests__/` | 1 | Queue tests |
| `src/lib/services/__tests__/` | 44 | Service tests |
| `src/lib/utils/__tests__/` | 7 | Utils tests |
| `src/lib/validators/__tests__/` | 5 | Validator tests |
| `src/lib/testing/` | 1 | Testing utils |
| `tests/` | 1 | Multi-language QA |
| **Total test files** | **~68** | |

---

## Summary by Category

| Category | Count |
|----------|-------|
| API routes | ~320 |
| Services | ~60 |
| Validators | ~40 |
| Utils | ~25 |
| Policies | ~20 |
| Types | ~20 |
| Config | ~10 |
| Integrations | ~5 |
| Tests | ~68 |
| Scripts | ~30 |
| E2E | 11 |
| Other (lib, config, hooks, etc.) | ~195 |

---

*This inventory is generated from the project structure. Excludes: node_modules, .next, dist, coverage, .history.*
