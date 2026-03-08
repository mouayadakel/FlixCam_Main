# FlixCam.rent — Audit Remediation Plan
## Post-Mega Audit Issue Resolution Roadmap

**Generated:** 2026-02-28
**Audit Score:** 72% Production Ready
**Verdict:** NOT READY — 8 Critical Blockers

---

## Table of Contents

1. [Sprint Overview](#sprint-overview)
2. [Sprint 0 — Critical Blockers (Days 1–3)](#sprint-0--critical-blockers-days-13)
3. [Sprint 1 — High Priority (Days 4–7)](#sprint-1--high-priority-days-47)
4. [Sprint 2 — Medium Priority (Days 8–14)](#sprint-2--medium-priority-days-814)
5. [Sprint 3 — Low Priority / Post-Launch (Days 15–30)](#sprint-3--low-priority--post-launch-days-1530)
6. [Execution Rules](#execution-rules)
7. [Testing Checklist Per Fix](#testing-checklist-per-fix)
8. [Risk Matrix](#risk-matrix)

---

## Sprint Overview

| Sprint | Priority | Issues | Timeline | Gate |
|--------|----------|--------|----------|------|
| Sprint 0 | Critical | 8 | Days 1–3 | **Must pass before any QA** |
| Sprint 1 | High | 16 | Days 4–7 | **Must pass before staging deploy** |
| Sprint 2 | Medium | 29 | Days 8–14 | **Must pass before production launch** |
| Sprint 3 | Low/Info | 34 | Days 15–30 | Post-launch improvements |

---

## Sprint 0 — Critical Blockers (Days 1–3)

> **Rule:** No other work begins until ALL 8 critical items are resolved and tested.

---

### FIX-001: Double VAT Calculation in Invoice Service

**Issue:** VAT is calculated per line item (line 112) AND again on the subtotal (line 125), effectively double-counting tax on every invoice.

**Files to modify:**
- `src/lib/services/invoice.service.ts`

**Steps:**
1. Read `invoice.service.ts` — locate `calculateTotals()` method (~line 98–128)
2. Remove the per-item VAT calculation at line 112
3. Keep ONLY the subtotal-level VAT calculation at lines 124–125
4. Ensure line items store `total` (without VAT) and the invoice stores aggregate `vatAmount`
5. Update `items` JSON structure — remove `vatRate` and `vatAmount` from individual items if present
6. Verify `taxableAmount = subtotal - discount` is correct
7. Verify `vatAmount = taxableAmount * taxRate` where `taxRate` comes from settings (not hardcoded 0.15)

**Validation:**
```
Given: 3 items × 100 SAR each, 0 discount, 15% VAT
Expected: subtotal=300, VAT=45, total=345
Bug result: subtotal=300, per-item VAT=45, subtotal VAT=45, total=390
```

**Tests to write:**
- Unit test: `calculateTotals()` with single item
- Unit test: `calculateTotals()` with multiple items
- Unit test: `calculateTotals()` with discount applied
- Integration test: Create invoice via API, verify totals

**Affected downstream:**
- Invoice PDF generation (`invoice-pdf.ts`)
- Invoice API routes
- Portal invoice view
- Report export calculations

---

### FIX-002: Weekly/Monthly Rate Optimization Not Applied

**Issue:** Cart, Invoice, and Quote services always use `dailyRate × days`. `PricingService` has `calculateOptimalRate()` but it's never called.

**Files to modify:**
- `src/lib/services/cart.service.ts`
- `src/lib/services/invoice.service.ts`
- `src/lib/services/quote.service.ts`
- `src/lib/services/pricing.service.ts` (reference only)

**Steps:**
1. Read `pricing.service.ts` — understand `calculateOptimalRate()` logic (~line 121–131)
2. In `cart.service.ts` (~line 170–180), replace:
   ```
   subtotal = dailyRate × quantity × days
   ```
   with a call to:
   ```
   subtotal = PricingService.calculateOptimalRate(dailyRate, weeklyRate, monthlyRate, days) × quantity
   ```
3. Apply the same change in `invoice.service.ts` (~line 111) and `quote.service.ts` (~line 139)
4. Ensure equipment data includes `weeklyPrice` and `monthlyPrice` when fetched for cart/invoice/quote
5. If weekly or monthly price is null/0, fall back to daily rate only

**Validation:**
```
Given: dailyRate=100, weeklyRate=600, monthlyRate=2000, days=30
Daily calc: 100×30 = 3,000 SAR
Optimal calc: 2,000 (1 month) = 2,000 SAR ← correct
```

**Tests to write:**
- Unit test: 1-day rental uses daily rate
- Unit test: 7-day rental uses weekly rate when cheaper
- Unit test: 30-day rental uses monthly rate when cheaper
- Unit test: 10-day rental uses 1 week + 3 days
- Unit test: Missing weekly/monthly rate falls back to daily

---

### FIX-003: Maintenance Dates Not Blocked in Availability

**Issue:** `EquipmentService.checkAvailability()` only checks `BookingEquipment` records. Equipment in maintenance status can still be booked.

**Files to modify:**
- `src/lib/services/equipment.service.ts`

**Steps:**
1. Read `checkAvailability()` method (~line 719–781)
2. Add a query to check `Maintenance` records for the equipment that overlap with the requested date range:
   ```typescript
   const maintenanceConflicts = await prisma.maintenance.count({
     where: {
       equipmentId: equipmentId,
       status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
       scheduledDate: { lte: endDate },
       OR: [
         { completedDate: null },
         { completedDate: { gte: startDate } }
       ],
       deletedAt: null
     }
   })
   ```
3. If `maintenanceConflicts > 0`, reduce available quantity or return `available: false`
4. Also check `equipment.condition === 'MAINTENANCE'` as a guard

**Tests to write:**
- Unit test: Equipment with scheduled maintenance returns unavailable
- Unit test: Equipment with completed maintenance returns available
- Unit test: Maintenance outside date range doesn't affect availability

---

### FIX-004: No Barcode/QR Scanning for Warehouse

**Issue:** No scanning functionality exists. Equipment has barcode field but no camera or USB scanner integration.

**Files to create:**
- `src/components/features/warehouse/barcode-scanner.tsx`
- `src/app/api/warehouse/scan/route.ts`
- `src/lib/services/barcode.service.ts`

**Steps:**
1. Install barcode scanning library:
   ```bash
   npm install @zxing/browser @zxing/library
   ```
2. Create `barcode-scanner.tsx` component:
   - Camera mode: Use `@zxing/browser` for camera-based scanning
   - USB mode: Listen for keyboard events (USB scanners send keystrokes)
   - Support Code128, QR Code, EAN-13 formats
3. Create `barcode.service.ts`:
   - `lookupByBarcode(code: string)` — find equipment by barcode/SKU
   - `generateBarcode(equipmentId: string)` — generate barcode image
   - `printBarcodeLabel(equipmentIds: string[])` — bulk label generation
4. Create scan API route:
   - `POST /api/warehouse/scan` — accepts barcode, returns equipment details + current booking status
5. Integrate scanner into warehouse check-in/check-out pages:
   - `src/app/admin/(routes)/ops/warehouse/check-out/page.tsx`
   - `src/app/admin/(routes)/ops/warehouse/check-in/page.tsx`
6. Add barcode label print button to equipment detail page

**Tests to write:**
- Unit test: Barcode lookup returns correct equipment
- Unit test: Invalid barcode returns appropriate error
- Integration test: Scan → lookup → display equipment flow

---

### FIX-005: No Guest Checkout

**Issue:** Cart requires authentication. Non-registered users cannot complete a booking.

**Files to modify:**
- `src/app/(public)/checkout/page.tsx`
- `src/app/api/checkout/create-session/route.ts`
- `src/lib/services/cart.service.ts`
- `src/lib/stores/checkout.store.ts`

**Steps:**
1. Cart already supports session-based carts (`sessionId` field on Cart model) — verify this works without auth
2. Add a guest checkout step before payment:
   - Collect: Name, Email, Phone (required)
   - Optional: Create account checkbox
3. In `create-session/route.ts`:
   - Allow unauthenticated requests
   - If no session, create a guest user record with `role: 'GUEST'` or associate booking with email
   - Validate guest email/phone fields
4. In checkout store, add `guestInfo` state:
   ```typescript
   guestInfo: { name: string; email: string; phone: string } | null
   ```
5. After successful payment, send email with account creation link
6. Merge guest cart when user later registers with same email

**Tests to write:**
- E2E: Guest can add to cart and checkout without login
- Unit test: Guest user created with correct role
- Unit test: Cart merges when guest registers

---

### FIX-006: No Deposit Refund/Return Flow

**Issue:** Deposit is collected at booking creation but there is no mechanism to return it when equipment is returned undamaged.

**Files to create:**
- `src/lib/services/deposit.service.ts`

**Files to modify:**
- `src/lib/services/booking.service.ts` (integrate deposit release on return)
- `src/app/api/bookings/[id]/deposit/route.ts` (new)

**Steps:**
1. Create `deposit.service.ts` with methods:
   ```typescript
   static async releaseDeposit(bookingId: string, userId: string): Promise<void>
   static async forfeitDeposit(bookingId: string, amount: number, reason: string, userId: string): Promise<void>
   static async partialForfeiture(bookingId: string, deductAmount: number, damageClaimId: string, userId: string): Promise<void>
   ```
2. Add `depositStatus` field to Booking model:
   ```prisma
   depositStatus  String  @default("HELD") // HELD, RELEASED, FORFEITED, PARTIALLY_FORFEITED
   depositReleasedAt  DateTime?
   depositReleasedBy  String?
   ```
3. In `BookingService.markAsReturned()`, trigger deposit evaluation:
   - No damage claims → auto-release deposit
   - Open damage claims → hold deposit until resolved
4. Create API routes:
   - `POST /api/bookings/[id]/deposit/release` — admin manually releases
   - `POST /api/bookings/[id]/deposit/forfeit` — admin forfeits with reason
5. Add deposit status to admin booking detail page
6. Emit `deposit.released` / `deposit.forfeited` events

**Migration required:** Yes — add `depositStatus`, `depositReleasedAt`, `depositReleasedBy` to Booking model.

---

### FIX-007: Cancellation Doesn't Trigger Refund

**Issue:** When a booking is cancelled, inventory is restored but the payment is not refunded.

**Files to modify:**
- `src/app/api/portal/bookings/[id]/cancel/route.ts`
- `src/lib/services/booking.service.ts`

**Steps:**
1. In the cancel route or `BookingService.cancel()`, after state transition:
   ```typescript
   const payments = await prisma.payment.findMany({
     where: { bookingId, status: 'SUCCESS', deletedAt: null }
   })
   
   for (const payment of payments) {
     await PaymentService.requestRefund(payment.id, userId, reason)
   }
   ```
2. Respect cancellation policy:
   - If cancelled > 48h before start → full refund
   - If cancelled < 48h before start → partial refund (configurable %)
   - If cancelled after start → no refund (or per policy)
3. Update booking record with refund status
4. Send cancellation + refund confirmation email to customer
5. Log refund in audit trail

**Tests to write:**
- Unit test: Cancellation > 48h triggers full refund
- Unit test: Cancellation < 48h triggers partial refund
- Unit test: Cancellation of unpaid booking skips refund
- Integration test: Full cancel → refund → email flow

---

### FIX-008: Contract Content XSS Vulnerability

**Issue:** `dangerouslySetInnerHTML` used without sanitization in contract pages.

**Files to modify:**
- `src/app/portal/contracts/[id]/sign/page.tsx`
- `src/app/portal/contracts/[id]/page.tsx`

**Steps:**
1. Import DOMPurify (already used elsewhere in the project):
   ```typescript
   import DOMPurify from 'dompurify'
   ```
2. Sanitize contract HTML before rendering:
   ```typescript
   const sanitizedContent = DOMPurify.sanitize(contract.content, {
     ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'br', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
     ALLOWED_ATTR: ['class', 'style']
   })
   ```
3. Replace:
   ```tsx
   <div dangerouslySetInnerHTML={{ __html: contract.content }} />
   ```
   with:
   ```tsx
   <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
   ```
4. Apply same fix to both files

**Tests to write:**
- Unit test: Script tags stripped from content
- Unit test: Allowed tags preserved
- Unit test: Event handlers (onclick, etc.) removed

---

## Sprint 1 — High Priority (Days 4–7)

> **Rule:** Each fix must include at least one test. No merge without passing lint + type check.

---

### FIX-009: Replace 200+ TypeScript `any` Types

**Approach:** Prioritize by risk. Fix service layer first, then events, then API routes.

**Batch 1 — Event Bus (Day 4):**
- File: `src/lib/events/event-bus.ts`
- Replace all `any` event payloads with typed interfaces
- Create `src/lib/events/event-types.ts` with proper Booking, Payment, etc. types

**Batch 2 — Core Services (Day 4–5):**
- `src/lib/services/invoice.service.ts` — 12 instances
- `src/lib/services/delivery.service.ts` — 9 instances
- `src/lib/services/client.service.ts` — 11 instances
- `src/lib/services/coupon.service.ts` — 10 instances
- Replace `as any` with proper Prisma-generated types or custom interfaces

**Batch 3 — API Routes (Day 5–6):**
- Replace `catch (error: any)` with `catch (error: unknown)` and type guards
- Replace `filters: any` with proper filter interfaces

**Batch 4 — Components (Day 6–7):**
- Fix `any[]` arrays in import page
- Fix `as any` casts in CMS components

---

### FIX-010: Remove 100+ Console Statements

**Approach:** Create a structured logger, then batch-replace.

**Steps:**
1. Create `src/lib/logger.ts`:
   ```typescript
   import pino from 'pino'
   
   export const logger = pino({
     level: process.env.LOG_LEVEL || 'info',
     transport: process.env.NODE_ENV === 'development' 
       ? { target: 'pino-pretty' } 
       : undefined
   })
   ```
2. Install: `npm install pino pino-pretty`
3. Search-and-replace across the codebase:
   - `console.error(` → `logger.error(`
   - `console.warn(` → `logger.warn(`
   - `console.log(` → `logger.info(` (or remove if debug-only)
4. Skip files in `scripts/` and `tests/` directories
5. Add ESLint rule to prevent future console statements:
   ```json
   "no-console": ["error", { "allow": ["warn"] }]
   ```

---

### FIX-011: Add `.catch()` to 100+ Promise Chains

**Approach:** Convert `.then()` chains to `async/await` where possible.

**Steps:**
1. Search for `.then(` patterns across `.tsx` and `.ts` files
2. For each instance:
   - If in a React component, wrap in try/catch with error state
   - If in a service, add `.catch()` with logger
   - If fire-and-forget (e.g., analytics), add `.catch(() => {})` with comment
3. Priority files:
   - `src/app/api/checkout/create-session/route.ts`
   - `src/app/admin/(routes)/settings/branches/page.tsx`
   - `src/components/features/build-your-kit/kit-wizard.tsx`

---

### FIX-012: Rate Limit Password Reset

**File:** `src/app/api/auth/forgot-password/route.ts`

**Steps:**
1. Add at the top of the POST handler:
   ```typescript
   const rateLimitResult = await checkRateLimitUpstash(request, 'auth')
   if (!rateLimitResult.success) {
     return Response.json({ error: 'Too many requests' }, { status: 429 })
   }
   ```

---

### FIX-013: Admin Email Notifications

**Files to modify:**
- `src/lib/services/email.service.ts`
- `src/lib/events/handlers/` (event handlers)

**Steps:**
1. Add `sendAdminNotification()` to email service
2. Create admin notification email template
3. Hook into events: `booking.created`, `booking.cancelled`, `payment.success`, `payment.refund_requested`
4. Fetch admin email(s) from company settings or `BusinessRecipient` model
5. Make admin notifications configurable (on/off per event type)

---

### FIX-014: Welcome Email on Registration

**File:** `src/lib/services/email.service.ts`

**Steps:**
1. Add `sendWelcomeEmail(user)` method
2. Call it after email verification is complete (not on registration, but on verification)
3. Template: Welcome message, getting started guide, support contact

---

### FIX-015: Auto-Generate Invoice on Booking Confirmation

**File:** `src/lib/services/booking.service.ts`

**Steps:**
1. In `transitionState()` method, when transitioning to `CONFIRMED`:
   ```typescript
   if (newStatus === 'CONFIRMED') {
     await InvoiceService.generateFromBooking(bookingId, userId)
   }
   ```
2. Ensure `generateFromBooking()` is idempotent (don't create duplicate invoices)

---

### FIX-016: Public AI Chatbot

**Files to modify:**
- `src/app/(public)/layout.tsx`
- `src/components/admin/ai-floating-widget.tsx` (refactor for public use)

**Steps:**
1. Create `src/components/public/public-chat-widget.tsx` (lighter version of admin widget)
2. Add to public layout
3. Give it access to equipment/studio listing APIs for real inventory answers
4. Style for public brand (not admin look)

---

### FIX-017: Customer Import via Excel

**Steps:**
1. Extend the existing import system to support a "Customer" import type
2. Reuse `ImportService`, `ImportWorker`, validation pipeline
3. Map columns: Name, Email, Phone, Company, Address
4. Handle duplicate emails (skip or update)

---

### FIX-018: 2FA for Admin Accounts

**Steps:**
1. Install: `npm install otplib qrcode`
2. Create `src/lib/auth/two-factor.ts` with TOTP setup/verify
3. Add setup flow in admin profile page
4. Add verification step in login flow when `user.twoFactorEnabled === true`
5. Add recovery codes generation

---

### FIX-019: DamageClaim Missing Audit Fields

**Migration:**
```prisma
model DamageClaim {
  // Add:
  createdBy  String?
  updatedBy  String?
  deletedAt  DateTime?
  deletedBy  String?
}
```

---

### FIX-020: Receiver Missing Audit Fields

**Migration:**
```prisma
model Receiver {
  // Add:
  createdBy  String?
  updatedBy  String?
  deletedBy  String?
}
```

---

### FIX-021: Kit Builder Hardcoded Strings

**Steps:**
1. Add `kit` namespace to `src/messages/ar.json`, `en.json`, `zh.json`, `fr.json`
2. Replace all 19+ hardcoded strings in `kit-wizard.tsx` with `t(locale, 'kit.xxx')`

---

### FIX-022: Company Logo in Invoice PDF

**File:** `src/lib/services/pdf/invoice-pdf.ts`

**Steps:**
1. Fetch company settings at start of PDF generation
2. If company logo URL exists, fetch image and add to PDF header
3. Position: Top-left, max 60×60px

---

### FIX-023: Deposit Display in Checkout Review

**File:** `src/components/features/checkout/checkout-step-review-pay.tsx`

**Steps:**
1. Add deposit line item between subtotal and total:
   ```
   Subtotal:  300 SAR
   Discount:  -50 SAR
   VAT (15%): 37.50 SAR
   Deposit:   500 SAR ← add this
   Total:     787.50 SAR
   ```
2. Add tooltip explaining deposit policy

---

### FIX-024: Dashboard Missing Operational Metrics

**File:** `src/app/admin/(routes)/dashboard/overview/page.tsx`

**Steps:**
1. Add widget: "Equipment Currently Out" — count bookings with status ACTIVE
2. Add widget: "Overdue Returns" — bookings where `endDate < now()` and status still ACTIVE
3. Add widget: "Low Stock" — equipment where `quantityAvailable <= 1`
4. Add time period selector (Today / This Week / This Month)

---

## Sprint 2 — Medium Priority (Days 8–14)

> **Rule:** Group related fixes into single PRs. Maximum 3 files per PR.

---

### FIX-025: PDF RTL Support for Arabic
- Research `pdf-lib` or `pdfmake` for RTL support
- If jsPDF cannot be fixed, migrate PDF generation to a library that supports RTL
- Alternative: Render HTML to PDF using Puppeteer/Playwright for perfect Arabic layout

### FIX-026: Standardize Date Formatting
- Audit all `toLocaleString()`, `toLocaleDateString()` calls
- Replace with `formatDate()` from `src/lib/i18n/formatting.ts`
- Add ESLint rule to flag direct `.toLocaleString()` usage

### FIX-027: Standardize Currency Formatting
- Same approach as date formatting
- Replace inline `formatSar()` functions with `formatCurrency()` from `formatting.ts`

### FIX-028: Centralize Status Labels
- Create `src/lib/constants/status.ts` with all status label maps
- Each map: `{ value, labelAr, labelEn, color, icon }`
- Replace per-file status definitions

### FIX-029: RTL Icon Mirroring Audit
- Search for chevron, arrow, and directional icons
- Add `rtl:rotate-180` class where needed
- Create utility: `cn('transform', isRtl && 'rotate-180')`

### FIX-030: Dynamic `dir` Attribute in Admin
- Replace hardcoded `dir="rtl"` with `dir={isRtl ? 'rtl' : 'ltr'}`
- Use `useLocale()` hook for dynamic direction

### FIX-031: Complete French Translations
- Identify missing keys by comparing `fr.json` against `ar.json`
- Translate missing ~200 keys
- Consider AI-assisted translation with human review

### FIX-032: Media Upload Validation
- File: `src/app/api/media/upload/route.ts`
- Add MIME type whitelist: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Add size limit: 10MB
- Block executable extensions

### FIX-033: Add Soft Delete to Critical Models
- Models: Cart, CartItem, StudioSchedule, DamageClaim, Branch, DeliveryZone
- Add `deletedAt DateTime?` field
- Update queries to filter `deletedAt: null`

### FIX-034: Add Audit Fields to Models Missing Them
- Add `createdBy`, `updatedBy` to 20+ models
- Group into a single migration
- Update service methods to pass userId

### FIX-035: Equipment Accessories Model
- Create `EquipmentAccessory` junction table or use `relatedEquipmentIds` consistently
- Ensure accessories appear in cart add-ons from database, not hardcoded

### FIX-036: Dynamic Add-ons from Database
- Replace hardcoded accessories in `checkout-step-addons.tsx`
- Fetch from equipment relations or a configurable add-ons table

### FIX-037: Visual Calendar Grid for Admin
- Integrate FullCalendar or similar library
- Replace list-based calendar view with visual grid
- Show equipment and studio bookings side by side

### FIX-038: Customer Credit Limits UI
- Add credit limit field to client profile page
- Add validation at checkout: block if outstanding > credit limit

### FIX-039: Server-Side Chatbot Logging
- Create `ChatConversation` model in Prisma
- Persist each message exchange to database
- Add admin conversation viewer page

### FIX-040: Human Handover in Chatbot
- Add "Talk to Human" button in chat
- Create support ticket or WhatsApp redirect
- Log handover request

### FIX-041: Chatbot Customization UI
- Add chatbot settings page in admin
- Configure: greeting message, knowledge base entries, response style

### FIX-042: Invoice PDF Email Attachment
- In `EmailService.sendInvoice()`, generate PDF buffer
- Attach as base64 encoded file to email

### FIX-043: Low Stock Alert
- Create scheduled job or trigger on booking confirmation
- Check `quantityAvailable <= threshold` (configurable per equipment)
- Send notification to admin

### FIX-044: New Customer Registration Alert
- Hook into registration event
- Notify admin via in-app notification and email (if enabled)

### FIX-045: Blacklist Management UI
- Create `/admin/(routes)/clients/blacklist/page.tsx`
- Show blacklisted users with reason and date
- Add blacklist button to client profile
- Guard booking creation against blacklisted users

### FIX-046: Waitlist System
- Create `Waitlist` model with: userId, equipmentId, desiredStartDate, desiredEndDate, status
- Add "Join Waitlist" button when equipment unavailable
- Notification trigger when equipment becomes available

### FIX-047: Automated Database Backups
- Create backup script using `pg_dump`
- Schedule via cron job or serverless function
- Store backups in S3/Supabase Storage
- Test restoration procedure

### FIX-048: GDPR Data Export/Deletion
- Create `/api/portal/data-export` — generates user data as JSON/ZIP
- Create `/api/portal/data-deletion` — anonymizes user data
- Add UI in portal profile page

### FIX-049: WebP Image Format Config
- In `next.config.js`, add:
  ```javascript
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  }
  ```

### FIX-050: Font Display Swap
- In font configurations, add `display: 'swap'` to prevent FOUT

### FIX-051: Add Favicon
- Create or obtain favicon files (favicon.ico, apple-touch-icon.png)
- Place in `public/` directory
- Add to `<head>` in root layout

### FIX-052: Privacy Policy & Terms Content
- Replace placeholder text with legal-approved content
- Must be reviewed by legal counsel before launch
- Include data processing, retention, and user rights sections

### FIX-053: Production Data Cleanup Script
- Create `scripts/cleanup-production.ts`
- Remove test users, test bookings, seed data
- Configurable via environment variable safety flag

### FIX-054: Add Missing Env Vars to .env.example
- Add: `REACTIONS_SALT`, `VIEWS_SALT`, `AUTH_SECRET`, `NEXT_PUBLIC_CONTACT_PHONE`, `NEXT_PUBLIC_CONTACT_EMAIL`
- Add test-only vars with comments: `PLAYWRIGHT_ADMIN_EMAIL`, `PLAYWRIGHT_ADMIN_PASSWORD`, `BASE_URL`

---

## Sprint 3 — Low Priority / Post-Launch (Days 15–30)

| # | Issue | Approach |
|---|-------|----------|
| FIX-055 | Silent error swallowing on homepage | Add error boundary with retry |
| FIX-056 | Resolve 4+ TODO/FIXME comments | Address each or open tickets |
| FIX-057 | 200+ hardcoded status strings | Extract to `src/lib/constants/` |
| FIX-058 | Default encryption key fallback | Add startup validation for production |
| FIX-059 | Invoice download in portal list cards | Add quick action buttons |
| FIX-060 | SMS confirmation opt-in | Add SMS toggle at checkout |
| FIX-061 | Payment method on invoice | Add field to Invoice model |
| FIX-062 | Deposit line on invoice | Add deposit calculation to invoice items |
| FIX-063 | Add-on count badge in studio list | UI enhancement |
| FIX-064 | Revenue time period selector | Add Today/Week/Month filter |
| FIX-065 | Late fee configuration UI | Add section to settings page |
| FIX-066 | Cloud Storage config in integrations | Add Cloudinary/S3 UI fields |
| FIX-067 | Calendar sync config | Add when feature is built |
| FIX-068 | Audit trail for API key changes | Surface in integrations page |
| FIX-069 | Equipment list CSV export | Add export button |
| FIX-070 | Dedicated payment receipt email | Create template |
| FIX-071 | Referral program | Full feature build |
| FIX-072 | Multi-currency support | Full feature build |
| FIX-073 | Google Calendar sync | Full feature build |
| FIX-074 | iCal export | Full feature build |
| FIX-075 | Maintenance mode UI | Add toggle page |
| FIX-076 | Error messages i18n consistency | Move all to translation files |
| FIX-077 | "Most rented" report | Add dedicated report tab |
| FIX-078 | "Outstanding payments" report | Add dedicated report tab |

---

## Execution Rules

### Before Starting Any Fix

1. **Read the file(s) first** — understand existing patterns before changing
2. **Check for dependencies** — will this fix break other features?
3. **Create a branch** — `fix/FIX-{number}-{short-description}`
4. **Follow existing patterns** — match code style, naming, and structure already in the codebase

### During Implementation

5. **One fix per commit** — never bundle unrelated changes
6. **Write tests** — at minimum: 1 happy path + 1 error case per fix
7. **No new `any` types** — use proper TypeScript types
8. **No new `console.log`** — use logger
9. **Run lint + type check** before committing

### After Completing a Fix

10. **Run full test suite** — ensure no regressions
11. **Update this document** — mark the fix as complete with date
12. **If migration required** — test both up and down
13. **Notify team** — what changed, what to run (npm install, migrate, seed)

---

## Testing Checklist Per Fix

For each fix, verify:

- [ ] TypeScript compiles with no errors (`npx tsc --noEmit`)
- [ ] ESLint passes (`npx eslint .`)
- [ ] Unit tests pass
- [ ] Integration tests pass (if applicable)
- [ ] Manual smoke test in browser
- [ ] No console errors in browser DevTools
- [ ] Arabic RTL layout not broken
- [ ] Mobile responsive check (375px, 768px, 1024px)

---

## Risk Matrix

| Fix | Risk Level | Rollback Complexity | Dependencies |
|-----|-----------|---------------------|--------------|
| FIX-001 (Double VAT) | HIGH | Easy (revert service) | Invoice PDF, Reports, Portal |
| FIX-002 (Rate optimization) | HIGH | Easy (revert service) | Cart, Invoice, Quote |
| FIX-003 (Maintenance block) | LOW | Easy (revert query) | Equipment availability only |
| FIX-004 (Barcode scanning) | LOW | Easy (new feature, no existing code touched) | None |
| FIX-005 (Guest checkout) | MEDIUM | Medium (touches auth flow) | Cart, Checkout, Auth |
| FIX-006 (Deposit refund) | MEDIUM | Medium (new model fields) | Booking, Payment |
| FIX-007 (Cancel refund) | MEDIUM | Easy (revert route) | Payment service |
| FIX-008 (XSS fix) | LOW | Easy (revert sanitization) | Contract pages only |

---

## Progress Tracker

| Fix # | Status | Date Started | Date Completed | PR # | Notes |
|-------|--------|-------------|----------------|------|-------|
| FIX-001 | ⬜ Pending | | | | |
| FIX-002 | ⬜ Pending | | | | |
| FIX-003 | ⬜ Pending | | | | |
| FIX-004 | ⬜ Pending | | | | |
| FIX-005 | ⬜ Pending | | | | |
| FIX-006 | ⬜ Pending | | | | |
| FIX-007 | ⬜ Pending | | | | |
| FIX-008 | ⬜ Pending | | | | |
| ... | | | | | |

---

*This remediation plan was generated from the Mega Production Audit conducted on 2026-02-28.*
*Update the Progress Tracker as fixes are completed.*
*Re-run the audit after Sprint 1 to verify critical issues are resolved.*
