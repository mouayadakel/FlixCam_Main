# Detailed 100% Completion Check – Phases 4–9

Use this document to verify every deliverable. Tick when verified.

---

## Phase 4.4 – Portal: Documents + Profile + 2FA

| Item                               | Status | Notes                                    |
| ---------------------------------- | ------ | ---------------------------------------- |
| `/portal/profile` page exists      | ☐      | Edit name/phone, email read-only         |
| `PortalProfileForm` component      | ☐      | Uses GET/PATCH /api/me                   |
| 2FA section (placeholder)          | ☐      | Text "قيد التطوير"                       |
| `/portal/documents` page           | ☐      | Contracts + invoices hub, links to lists |
| Nav links: المستندات، الملف الشخصي | ☐      | In portal layout                         |

---

## Phase 4.5 – Late Return (150%)

| Item                                                          | Status | Notes                                             |
| ------------------------------------------------------------- | ------ | ------------------------------------------------- |
| `Booking.actualReturnDate`, `Booking.lateFeeAmount` in schema | ☐      | Prisma                                            |
| `BookingService.markReturned()`                               | ☐      | ACTIVE→RETURNED, 150% late fee, restore equipment |
| `POST /api/bookings/[id]/mark-returned`                       | ☐      | Optional body.actualReturnDate                    |
| Portal booking detail shows actualReturnDate, lateFeeAmount   | ☐      | When present                                      |
| `computeLateFee()` util + unit tests                          | ☐      | src/lib/utils/late-fee.utils.ts                   |

---

## Phase 4.6 – Damage Handling

| Item                                             | Status | Notes                                                               |
| ------------------------------------------------ | ------ | ------------------------------------------------------------------- |
| `POST /api/portal/bookings/[id]/report-damage`   | ☐      | Body: equipmentId, damageType, severity, description, estimatedCost |
| BookingActions: "الإبلاغ عن ضرر" button + dialog | ☐      | Type, severity, description, cost, equipment dropdown               |
| Only ACTIVE/RETURNED; customer owns booking      | ☐      | Enforced in API                                                     |

---

## Phase 5.1 – Admin: Website Pages

| Item                                 | Status | Notes                                  |
| ------------------------------------ | ------ | -------------------------------------- |
| `GET /api/admin/website-pages`       | ☐      | Auth: SETTINGS_READ or SETTINGS_UPDATE |
| `/admin/settings/website-pages` page | ☐      | List pages, edit placeholder           |
| Settings card "Website Pages"        | ☐      | Links to above                         |

---

## Phase 5.2 – Feature Flags + Checkout Settings

| Item                                        | Status | Notes                                            |
| ------------------------------------------- | ------ | ------------------------------------------------ |
| Feature Flags at `/admin/settings/features` | ☐      | Existing                                         |
| `/admin/settings/checkout` page             | ☐      | Read-only: price lock 15min, cancel 48h, VAT 15% |
| Settings card "Checkout Settings"           | ☐      | Links to above                                   |

---

## Phase 5.3 – OTP + Payment

| Item                               | Status | Notes                           |
| ---------------------------------- | ------ | ------------------------------- |
| `/admin/settings/otp-payment` page | ☐      | OTP text + link to Integrations |
| Settings card "OTP & Payment"      | ☐      | Links to above                  |

---

## Phase 6.1 – Integrations

| Item                                    | Status | Notes                             |
| --------------------------------------- | ------ | --------------------------------- |
| `getWhatsAppUrl({ number?, message? })` | ☐      | src/lib/utils/whatsapp-context.ts |
| WhatsApp CTA uses pre-filled message    | ☐      | whatsapp-cta.tsx                  |
| Unit tests for getWhatsAppUrl           | ☐      | whatsapp-context.test.ts          |

---

## Phase 6.2 – SEO

| Item                                            | Status | Notes               |
| ----------------------------------------------- | ------ | ------------------- |
| Sitemap at /sitemap.xml                         | ☐      | src/app/sitemap.ts  |
| robots.txt                                      | ☐      | src/app/robots.ts   |
| Public layout metadata (title, description, OG) | ☐      | (public)/layout.tsx |

---

## Phase 7.1 – Performance

| Item                               | Status | Notes                               |
| ---------------------------------- | ------ | ----------------------------------- |
| KitWizard loaded with next/dynamic | ☐      | build-your-kit/page.tsx, ssr: false |

---

## Phase 7.2 – Mobile + RTL

| Item                               | Status | Notes      |
| ---------------------------------- | ------ | ---------- |
| Root dir="rtl", lang="ar"          | ☐      | layout.tsx |
| Tailwind mobile-first / responsive | ☐      | Existing   |

---

## Phase 8 – Testing

| Item                                                               | Status | Notes                                            |
| ------------------------------------------------------------------ | ------ | ------------------------------------------------ |
| Unit: booking validators (requestChange, requestExtension, cancel) | ☐      | validators/**tests**/booking.validator.test.ts   |
| Unit: late-fee.utils                                               | ☐      | utils/**tests**/late-fee.utils.test.ts           |
| Unit: whatsapp-context                                             | ☐      | utils/**tests**/whatsapp-context.test.ts         |
| Integration: portal booking API payload validation                 | ☐      | api/**tests**/portal-bookings.test.ts            |
| E2E: Playwright config + critical flows spec                       | ☐      | playwright.config.ts, e2e/critical-flows.spec.ts |
| Load: k6 script for public APIs                                    | ☐      | scripts/k6-load-public.js                        |
| Security checklist doc                                             | ☐      | docs/phase8/SECURITY_AUDIT_CHECKLIST.md          |
| Accessibility checklist doc                                        | ☐      | docs/phase8/ACCESSIBILITY_CHECKLIST.md           |
| QA final checklist doc                                             | ☐      | docs/phase8/QA_FINAL_CHECKLIST.md                |

---

## Phase 9 – Docs, Backup, Monitoring, Launch

| Item                                    | Status | Notes                                        |
| --------------------------------------- | ------ | -------------------------------------------- |
| API docs (portal + admin new endpoints) | ☐      | docs/phase9/API_DOCS_PORTAL_AND_ADMIN.md     |
| User guide (portal)                     | ☐      | docs/phase9/USER_GUIDE_PORTAL.md             |
| Backup & DR doc                         | ☐      | docs/phase9/BACKUP_AND_DR.md                 |
| Monitoring & alerting doc               | ☐      | docs/phase9/MONITORING_AND_ALERTING.md       |
| Launch checklist & rollback doc         | ☐      | docs/phase9/LAUNCH_CHECKLIST_AND_ROLLBACK.md |

---

## Database & Scripts

| Item                                          | Status | Notes                                                       |
| --------------------------------------------- | ------ | ----------------------------------------------------------- |
| Migration for BookingRequest (Phase 4.3)      | ☐      | Run when DB allows                                          |
| Migration for actualReturnDate, lateFeeAmount | ☐      | Same or separate migration                                  |
| npm run test (unit)                           | ☐      | Includes new validator/utils/api tests                      |
| npm run test:e2e (Playwright)                 | ☐      | Requires: npm i -D @playwright/test; npx playwright install |

---

## Summary

- **Code deliverables:** All implemented (pages, APIs, components, services, utils).
- **Tests:** Unit tests added and passing; E2E and k6 scripts added; checklists documented.
- **Docs:** Phase 9 docs added (API, user guide, backup, monitoring, launch).
- **Placeholders (acceptable):** 2FA (UI only), website page edit (list only), editable checkout settings (read-only).
- **To reach 100% in production:** Run migrations, install Playwright if running E2E, complete manual QA and security/a11y checklists, configure backup and alerts per Phase 9 docs.
