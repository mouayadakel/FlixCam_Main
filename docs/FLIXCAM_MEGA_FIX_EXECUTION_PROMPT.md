# 🔴 FLIXCAM.RENT — MEGA FIX EXECUTION PROMPT
# Paste this into Cursor Agent Mode (full codebase access required)
# This prompt executes ALL fixes from the Production Audit Report
# Audit Score: 72% → Target: 100% | Verdict: NOT READY → READY

---

## 🤖 AGENT IDENTITY & MISSION

You are a **Senior Full-Stack Engineer** assigned to bring FlixCam.rent from 72% to 100% production readiness. You have the full audit report and remediation plan. Your job is to **execute every fix** — not explain, not plan, not ask unnecessary questions. **Write code. Fix files. Test. Move on.**

**Ground Rules:**
- Read every file before touching it — understand existing patterns first
- Follow the exact code style already in the codebase (naming, formatting, structure)
- Zero new `any` TypeScript types
- Zero new `console.log` statements — use the logger
- Every fix gets at least 1 unit test (happy path + error case)
- Run `npx tsc --noEmit` and `npx eslint .` after every sprint
- If a database migration is needed, create the Prisma migration file
- If a new dependency is needed, run `npm install` and explain why
- **Work sprint by sprint. Do not skip ahead. Do not mix sprint work.**

---

## ⚠️ SPRINT 0 — CRITICAL BLOCKERS (DO THESE FIRST — ALL 8 BEFORE ANYTHING ELSE)

---

### 🔴 FIX-001 — Double VAT Calculation

**File:** `src/lib/services/invoice.service.ts`

**The Bug:** VAT is being calculated twice — once per line item and once on the subtotal total. Every invoice is overcharging customers.

**Do this:**
1. Open `invoice.service.ts` and find `calculateTotals()` (~line 98–128)
2. Remove the per-item VAT calculation (the one at ~line 112 that adds `vatAmount` to each line item)
3. Keep ONLY the aggregate VAT calculation: `vatAmount = taxableAmount × taxRate`
4. Ensure `taxRate` is read from company settings — NOT hardcoded as `0.15`
5. Ensure `taxableAmount = subtotal - discountAmount` (before VAT, after discount)
6. Line items should store `{ quantity, unitPrice, total }` — no VAT on line items
7. Invoice totals structure must be:
   ```
   subtotal        = sum of all line item totals
   discountAmount  = applied discount
   taxableAmount   = subtotal - discountAmount
   vatAmount       = taxableAmount × taxRate
   depositAmount   = booking deposit (if applicable)
   grandTotal      = taxableAmount + vatAmount + depositAmount
   balanceDue      = grandTotal - amountPaid
   ```
8. Update `invoice-pdf.ts` to reflect the corrected structure
9. Update portal invoice view to match
10. Update any report calculations that used the old (incorrect) totals

**Verify with this math:**
```
Input:  3 items × 100 SAR, 0 discount, 15% VAT, 0 deposit, 0 paid
CORRECT result:   subtotal=300, VAT=45, grandTotal=345, balanceDue=345
WRONG result was: subtotal=300, VAT=90, grandTotal=390  ← this was the bug
```

**Write these tests:**
```typescript
describe('InvoiceService.calculateTotals', () => {
  it('calculates single item correctly with 15% VAT')
  it('calculates multiple items correctly')
  it('applies discount before VAT calculation')
  it('reads VAT rate from settings, not hardcode')
  it('balanceDue equals grandTotal when nothing paid')
  it('balanceDue equals grandTotal minus amountPaid')
})
```

---

### 🔴 FIX-002 — Weekly/Monthly Rate Optimization Never Applied

**Files:** `src/lib/services/cart.service.ts`, `src/lib/services/invoice.service.ts`, `src/lib/services/quote.service.ts`

**The Bug:** `PricingService.calculateOptimalRate()` exists but is NEVER called. All rentals always use `dailyRate × days`, even 30-day rentals that should use the monthly rate.

**Do this:**
1. Open `pricing.service.ts` and read `calculateOptimalRate()` fully
2. In `cart.service.ts` (~line 170–180), replace:
   ```typescript
   const subtotal = equipment.dailyPrice * quantity * rentalDays
   ```
   with:
   ```typescript
   const optimalRate = PricingService.calculateOptimalRate(
     equipment.dailyPrice,
     equipment.weeklyPrice,
     equipment.monthlyPrice,
     rentalDays
   )
   const subtotal = optimalRate * quantity
   ```
3. Apply the same replacement in `invoice.service.ts` and `quote.service.ts`
4. When fetching equipment for cart/invoice/quote, ensure `weeklyPrice` and `monthlyPrice` are included in the select query
5. If `weeklyPrice` or `monthlyPrice` is null or 0, `calculateOptimalRate()` must fall back to daily rate only
6. Store the `appliedRateType` ('daily'|'weekly'|'monthly') on the cart/invoice line item for display purposes

**Write these tests:**
```typescript
describe('PricingService.calculateOptimalRate', () => {
  it('uses daily rate for 1-6 day rentals')
  it('uses weekly rate for 7-day rental when cheaper than 7 × daily')
  it('uses monthly rate for 30-day rental when cheaper')
  it('uses combination: 1 month + 3 days correctly')
  it('falls back to daily when weekly/monthly rates are null')
  it('falls back to daily when weekly/monthly rates are 0')
  it('never returns a rate higher than daily × days')
})
```

---

### 🔴 FIX-003 — Maintenance Dates Not Blocked in Availability Check

**File:** `src/lib/services/equipment.service.ts`

**The Bug:** `checkAvailability()` only queries `BookingEquipment`. Equipment scheduled for maintenance can still be booked.

**Do this:**
1. Open `equipment.service.ts` and find `checkAvailability()` (~line 719–781)
2. After the existing booking conflict query, add a maintenance conflict check:
   ```typescript
   const maintenanceConflict = await prisma.maintenance.count({
     where: {
       equipmentId,
       status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
       scheduledDate: { lte: requestedEndDate },
       OR: [
         { completedDate: null },
         { completedDate: { gte: requestedStartDate } }
       ],
       deletedAt: null
     }
   })

   if (maintenanceConflict > 0) {
     return { available: false, reason: 'MAINTENANCE', availableQuantity: 0 }
   }
   ```
3. Also check `equipment.condition === 'MAINTENANCE'` or `equipment.status === 'MAINTENANCE'` as an additional guard
4. Return a structured response: `{ available: boolean, reason?: string, availableQuantity: number }`
5. Update all callers of `checkAvailability()` to handle the new response structure
6. In the frontend availability calendar, show maintenance blocks in a different color than booking blocks

**Write these tests:**
```typescript
describe('EquipmentService.checkAvailability', () => {
  it('returns unavailable when maintenance overlaps rental period')
  it('returns available when maintenance is completed before rental start')
  it('returns available when maintenance starts after rental end')
  it('returns unavailable when equipment.condition is MAINTENANCE')
  it('blocks correct quantity when some units are in maintenance')
})
```

---

### 🔴 FIX-004 — No Barcode/QR Scanning for Warehouse

**This is a new feature build. Create these files:**

**Step 1 — Install dependencies:**
```bash
npm install @zxing/browser @zxing/library
npm install jsbarcode
npm install @types/jsbarcode --save-dev
```

**Step 2 — Create `src/lib/services/barcode.service.ts`:**
```typescript
// Methods to implement:
// lookupByBarcode(code: string): Promise<Equipment | null>
//   → Search equipment by barcode field, SKU, or serial number
//   → Return equipment with current booking status and next booking
//
// generateBarcodeImage(code: string): string
//   → Returns SVG or base64 PNG of barcode using JsBarcode
//   → Support Code128 format
//
// generateQRCode(equipmentId: string): string
//   → Returns QR code pointing to /admin/ops/warehouse/scan?id={equipmentId}
//
// printBarcodeLabels(equipmentIds: string[]): void
//   → Opens print dialog with formatted labels
//   → Label includes: equipment name, barcode, SKU, serial number
```

**Step 3 — Create `src/app/api/warehouse/scan/route.ts`:**
```typescript
// POST /api/warehouse/scan
// Body: { barcode: string }
// Auth: Required (WAREHOUSE_MANAGER or ADMIN role)
// Returns: {
//   equipment: { id, name, sku, serialNumber, condition, status },
//   currentBooking: { id, customerName, startDate, endDate } | null,
//   nextBooking: { id, customerName, startDate, endDate } | null,
//   action: 'CHECK_OUT' | 'CHECK_IN' | 'IN_MAINTENANCE' | 'NOT_FOUND'
// }
```

**Step 4 — Create `src/components/features/warehouse/barcode-scanner.tsx`:**
```typescript
// Component features:
// - Toggle between CAMERA mode and MANUAL ENTRY mode
// - Camera mode: use @zxing/browser BrowserMultiFormatReader
//   → Request camera permission
//   → Show live video preview with scan overlay
//   → Auto-detect barcode in frame
// - Manual entry: input field for typing/pasting barcode
// - USB scanner mode: listen for rapid keystrokes ending in Enter (HID input)
// - On successful scan: call POST /api/warehouse/scan
// - Show scanned equipment card with:
//   - Equipment photo, name, SKU, serial number
//   - Current status badge (Available / Out / Maintenance)
//   - Current booking details if checked out
//   - Action buttons: [Mark as Checked Out] or [Mark as Returned]
// - Play success/error audio feedback on scan
// - Recent scans list (last 10)
```

**Step 5 — Integrate scanner into warehouse pages:**
- Add `<BarcodeScanner />` component to:
  - `src/app/admin/(routes)/ops/warehouse/check-out/page.tsx`
  - `src/app/admin/(routes)/ops/warehouse/check-in/page.tsx`

**Step 6 — Add barcode print button to equipment detail page:**
- Print single barcode label from equipment detail
- Bulk print barcodes from equipment list (checkbox selection → print selected)

**Step 7 — Add barcode to equipment that doesn't have one:**
- If `equipment.barcode` is null, auto-generate from SKU on first scan attempt

**Write these tests:**
```typescript
describe('BarcodeService', () => {
  it('finds equipment by barcode field')
  it('finds equipment by SKU as fallback')
  it('returns null for unknown barcode')
  it('generates valid Code128 barcode image')
  it('returns correct action based on equipment status')
})
```

---

### 🔴 FIX-005 — No Guest Checkout

**Files:** `src/app/(public)/checkout/page.tsx`, `src/app/api/checkout/create-session/route.ts`, `src/lib/stores/checkout.store.ts`

**Do this:**
1. Check `Cart` model in Prisma schema — confirm `sessionId` field exists for unauthenticated carts
2. In `create-session/route.ts`:
   - Remove the authentication requirement (make it optional, not mandatory)
   - If user is authenticated → use `userId`
   - If user is NOT authenticated:
     - Require `guestEmail`, `guestName`, `guestPhone` in request body
     - Validate these fields with Zod
     - Create a minimal guest record: `{ email, name, phone, role: 'GUEST', isGuest: true }`
     - Or link the booking to `sessionId` if guest records aren't appropriate for your schema
3. Add a "Guest Checkout" step in the checkout flow (before payment):
   - Field: Full Name (required)
   - Field: Email (required, validated)
   - Field: Phone (required)
   - Checkbox: "Create an account to track your order" (optional)
4. In checkout store, add:
   ```typescript
   isGuest: boolean
   guestInfo: { name: string; email: string; phone: string } | null
   ```
5. After successful guest payment:
   - Send confirmation email to guest email
   - If "create account" was checked: send account setup link
6. Ensure existing auth-based checkout flow is NOT broken

---

### 🔴 FIX-006 — No Deposit Refund/Return Flow

**Create:** `src/lib/services/deposit.service.ts`

**Add to Prisma schema (create migration):**
```prisma
model Booking {
  // Add these fields:
  depositStatus        String    @default("HELD")
  // Values: HELD | RELEASED | FORFEITED | PARTIALLY_FORFEITED | NOT_REQUIRED
  depositReleasedAt    DateTime?
  depositReleasedBy    String?
  depositNotes         String?
}
```

**Implement `deposit.service.ts`:**
```typescript
class DepositService {
  // Release deposit fully (equipment returned undamaged)
  static async releaseDeposit(
    bookingId: string,
    releasedByUserId: string,
    notes?: string
  ): Promise<void>

  // Forfeit deposit fully (major damage or no-show)
  static async forfeitDeposit(
    bookingId: string,
    reason: string,
    authorizedByUserId: string
  ): Promise<void>

  // Partial forfeiture (minor damage)
  static async partialForfeiture(
    bookingId: string,
    deductAmount: number,        // amount to keep
    damageClaimId: string,       // link to damage claim
    authorizedByUserId: string
  ): Promise<void>

  // Get deposit status with history
  static async getDepositStatus(bookingId: string): Promise<DepositStatus>
}
```

**Create API routes:**
- `POST /api/admin/bookings/[id]/deposit/release` — admin releases deposit
- `POST /api/admin/bookings/[id]/deposit/forfeit` — admin forfeits with reason
- `POST /api/admin/bookings/[id]/deposit/partial` — partial forfeiture

**In `booking.service.ts`, in `markAsReturned()`:**
- Check for open damage claims on this booking
- If no open damage claims → automatically call `DepositService.releaseDeposit()`
- If open damage claims exist → set `depositStatus: 'HELD'` and notify admin to review

**Add deposit status UI:**
- Admin booking detail: show deposit status badge + action buttons
- Customer portal: show deposit status on booking detail
- Emit events: `deposit.released`, `deposit.forfeited`

---

### 🔴 FIX-007 — Cancellation Doesn't Trigger Refund

**File:** `src/app/api/portal/bookings/[id]/cancel/route.ts`

**Do this:**
1. After the booking state transition to `CANCELLED`, add:
   ```typescript
   // Find all successful payments for this booking
   const payments = await prisma.payment.findMany({
     where: { bookingId, status: 'SUCCESS', deletedAt: null }
   })

   if (payments.length > 0) {
     // Determine refund amount based on cancellation policy
     const refundAmount = await CancellationPolicyService.calculateRefund(
       booking.startDate,
       booking.totalAmount,
       cancellationDate
     )

     for (const payment of payments) {
       const refundForThisPayment = Math.min(refundAmount, payment.amount)
       await PaymentService.requestRefund(payment.id, userId, {
         reason: cancellationReason,
         amount: refundForThisPayment
       })
     }
   }
   ```
2. Read the existing `CancellationPolicy` in the settings — use it, don't hardcode rules
3. If no policy exists, default to: full refund if >48h before start, 50% if <48h, no refund if already started
4. Update booking with `refundStatus`, `refundAmount`, `refundRequestedAt`
5. Send cancellation + refund details email to customer
6. Send cancellation notification to admin

**Write these tests:**
```typescript
describe('Cancellation Refund Logic', () => {
  it('triggers full refund when cancelled 72h before start')
  it('triggers partial refund when cancelled 24h before start')
  it('no refund when booking already started')
  it('skips refund for unpaid bookings')
  it('sends confirmation email with refund amount')
})
```

---

### 🔴 FIX-008 — XSS Vulnerability in Contract Pages

**Files:**
- `src/app/portal/contracts/[id]/sign/page.tsx`
- `src/app/portal/contracts/[id]/page.tsx`
- Any other component using `dangerouslySetInnerHTML` with user/database content

**Do this:**
1. Verify DOMPurify is already installed: `grep "dompurify" package.json`
2. If not: `npm install dompurify @types/dompurify`
3. In each affected file, replace ALL instances of:
   ```tsx
   <div dangerouslySetInnerHTML={{ __html: content }} />
   ```
   with:
   ```tsx
   import DOMPurify from 'dompurify'

   const sanitizedContent = typeof window !== 'undefined'
     ? DOMPurify.sanitize(content, {
         ALLOWED_TAGS: ['p','h1','h2','h3','h4','h5','h6','ul','ol','li',
                        'strong','em','u','br','table','thead','tbody',
                        'tr','td','th','span','div','blockquote'],
         ALLOWED_ATTR: ['class', 'style', 'align'],
         FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
       })
     : ''

   <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
   ```
4. Handle SSR: DOMPurify requires `window` — use the SSR guard shown above
5. Search the ENTIRE codebase for `dangerouslySetInnerHTML` and fix EVERY instance

**Write these tests:**
```typescript
describe('XSS Sanitization', () => {
  it('strips <script> tags from content')
  it('strips onclick and event handlers')
  it('preserves allowed formatting tags (p, h1, strong, em)')
  it('preserves allowed attributes (class, style)')
  it('handles null/undefined content gracefully')
})
```

---

## ✅ SPRINT 0 GATE — Before Moving to Sprint 1:

After completing all 8 fixes above, run:
```bash
npx tsc --noEmit          # Must pass with 0 errors
npx eslint . --max-warnings 0  # Must pass
npx prisma migrate dev    # Run any pending migrations
npm test                  # All tests must pass
```

Manually verify:
- [ ] Create an invoice with 3 items. Confirm VAT is calculated ONCE and correctly.
- [ ] Create a 30-day equipment booking. Confirm monthly rate is applied, not 30× daily rate.
- [ ] Schedule maintenance for an item. Confirm it cannot be booked during that period.
- [ ] Add to cart without logging in. Confirm checkout proceeds to guest info step.
- [ ] Mark a booking as returned. Confirm deposit status changes to RELEASED.
- [ ] Cancel a paid booking. Confirm refund is requested and email sent.
- [ ] Scan a barcode in the warehouse module. Confirm equipment details appear.
- [ ] Try to inject `<script>alert(1)</script>` into a contract. Confirm it's stripped.

**Only after ALL CHECKS PASS → proceed to Sprint 1.**

---

## 🟠 SPRINT 1 — HIGH PRIORITY (Days 4–7)

Work through these in order. Each fix must pass lint + type check before the next begins.

---

### FIX-009 — Replace TypeScript `any` Types

**Strategy:** Work in batches by priority.

**Batch 1 — Event Bus (highest risk):**
1. Create `src/lib/events/event-types.ts` — define typed interfaces for EVERY event payload used in the system:
   ```typescript
   export interface BookingCreatedEvent { bookingId: string; userId: string; totalAmount: number; ... }
   export interface PaymentSuccessEvent { paymentId: string; bookingId: string; amount: number; ... }
   export interface DepositReleasedEvent { bookingId: string; depositAmount: number; ... }
   // ... one interface per event type
   ```
2. Replace all `any` types in `src/lib/events/event-bus.ts` using these interfaces

**Batch 2 — Core Services:**
Fix `any` types in this order:
- `src/lib/services/invoice.service.ts`
- `src/lib/services/delivery.service.ts`
- `src/lib/services/client.service.ts`
- `src/lib/services/coupon.service.ts`

For `catch (error: any)` patterns → replace with:
```typescript
catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  logger.error({ error, message }, 'Service error')
  throw new ServiceError(message)
}
```

**Batch 3 — API Routes:**
- Replace all `catch (error: any)` in API routes
- Replace `filters: any` with proper filter interfaces
- Use Prisma-generated types for database query results

**Batch 4 — Components:**
- Fix `any[]` arrays in import/export pages
- Fix `as any` casts in CMS components

After all batches: `npx tsc --noEmit` must show 0 `any`-related warnings.

---

### FIX-010 — Remove Console Statements / Add Structured Logging

1. First, check if a logger already exists in the codebase. Search for `pino`, `winston`, `bunyan`.
2. If no logger exists, create `src/lib/logger.ts`:
   ```typescript
   import pino from 'pino'
   export const logger = pino({
     level: process.env.LOG_LEVEL ?? 'info',
     transport: process.env.NODE_ENV === 'development'
       ? { target: 'pino-pretty', options: { colorize: true } }
       : undefined
   })
   export default logger
   ```
   Install: `npm install pino pino-pretty`
3. Do a global search-and-replace:
   - `console.error(` → `logger.error(`
   - `console.warn(` → `logger.warn(`
   - `console.log(` → `logger.debug(` (for debug info) or **delete** (if it was temporary)
4. Skip: `scripts/` directory, `*.test.ts` files, `jest.setup.ts`
5. Add to `.eslintrc`:
   ```json
   "no-console": ["error", { "allow": ["warn", "error"] }]
   ```
   This ensures no future `console.log` is committed.

---

### FIX-011 — Handle Unhandled Promise Rejections

1. Search for `.then(` without corresponding `.catch(` in `.ts` and `.tsx` files
2. For each unhandled promise:
   - **In React components**: convert to `async/await` with try/catch + set error state
   - **In services**: add `.catch(error => { logger.error(error); throw error })`
   - **In fire-and-forget calls** (analytics, notifications): add `.catch(() => {})` with a comment explaining why it's intentionally swallowed
3. Priority files based on audit:
   - `src/app/api/checkout/create-session/route.ts`
   - `src/components/features/build-your-kit/kit-wizard.tsx`
   - All admin settings pages

---

### FIX-012 — Rate Limit Password Reset Endpoint

**File:** `src/app/api/auth/forgot-password/route.ts`

1. At the very start of the POST handler, before any logic:
   ```typescript
   const rateLimitResult = await checkRateLimitUpstash(request, 'auth')
   if (!rateLimitResult.success) {
     return Response.json(
       { error: 'Too many requests. Please try again later.' },
       { status: 429, headers: { 'Retry-After': '300' } }
     )
   }
   ```
2. Also add rate limiting to: login, registration, OTP resend, and email verification endpoints
3. Verify rate limit config: max 5 attempts per 5 minutes per IP for auth endpoints

---

### FIX-013 — Admin Email Notifications for Bookings

**File:** `src/lib/services/email.service.ts`

1. Add method:
   ```typescript
   static async sendAdminNotification(
     event: 'NEW_BOOKING' | 'CANCELLATION' | 'PAYMENT_RECEIVED' | 'REFUND_REQUESTED' | 'OVERDUE_RETURN',
     data: Record<string, unknown>
   ): Promise<void>
   ```
2. Create email template: `src/lib/email-templates/admin-notification.tsx`
   - Subject: "[FlixCam] New Booking #{id} — {customerName}"
   - Body: Booking summary table, quick action link to admin panel
3. Fetch admin notification recipients from company settings or a `AdminNotificationRecipient` config
4. Hook this into the event handlers:
   - `booking.created` → send admin NEW_BOOKING email
   - `booking.cancelled` → send admin CANCELLATION email
   - `payment.success` → send admin PAYMENT_RECEIVED email
5. Make notification types toggleable in admin settings (on/off per event)

---

### FIX-014 — Welcome Email on Registration

**File:** `src/lib/services/email.service.ts`

1. Add `sendWelcomeEmail(user: User): Promise<void>`
2. Create template: `src/lib/email-templates/welcome.tsx`
   - Personalized greeting
   - Getting started: "Browse Equipment", "Book a Studio", "View Your Dashboard"
   - Support contact
   - Social links
3. Call after email verification is confirmed (NOT at registration — wait for verified users)
4. Must respect user's locale (send in AR, EN, ZH based on preference)

---

### FIX-015 — Auto-Generate Invoice on Booking Confirmation

**File:** `src/lib/services/booking.service.ts`

1. Find `transitionState()` or wherever booking status changes to `CONFIRMED`
2. After the state transition, add:
   ```typescript
   if (newStatus === BookingStatus.CONFIRMED) {
     // Check if invoice already exists (idempotent)
     const existingInvoice = await prisma.invoice.findFirst({
       where: { bookingId, deletedAt: null }
     })
     if (!existingInvoice) {
       await InvoiceService.generateFromBooking(bookingId, userId)
     }
   }
   ```
3. Verify `generateFromBooking()` uses the corrected VAT logic from FIX-001
4. After invoice generation, emit `invoice.created` event
5. This event should trigger: invoice email to customer, notification to admin

---

### FIX-016 — Public-Facing AI Chatbot

**Files:**
- Create: `src/components/public/public-chat-widget.tsx`
- Modify: `src/app/(public)/layout.tsx`

1. Check existing admin chatbot: `src/components/admin/ai-floating-widget.tsx`
2. Create a public variant that is:
   - Lighter (smaller bundle)
   - Styled with public brand colors (not admin theme)
   - Has access to: equipment catalog (names, prices, availability), studio info, FAQ
   - Does NOT have access to: customer data, admin functions, booking management
3. Public chatbot system prompt should include:
   - Available equipment categories and general pricing ranges
   - Studio details and pricing
   - Booking process explanation
   - Contact info and support hours
4. Responds in the same language the user writes in (AR/EN/ZH/FR)
5. Add to `src/app/(public)/layout.tsx` at the bottom

---

### FIX-017 — Customer Import via Excel

1. Study existing equipment import flow to understand the pattern
2. Create customer import with same architecture:
   - `src/app/admin/(routes)/clients/import/page.tsx`
   - `src/app/api/admin/clients/import/route.ts`
   - Add customer schema to `ImportService`
3. Column mapping: Name, Email, Phone, Company, Address, City, Country, Notes
4. Duplicate handling: if email already exists → skip (don't update, don't crash)
5. Validation: email format, phone format, required fields
6. Preview before import: show table of what will be imported
7. Result summary: "X imported, Y skipped (duplicates), Z errors"
8. Provide downloadable sample template

---

### FIX-018 — Two-Factor Authentication (2FA) for Admin

1. Install: `npm install otplib qrcode @types/qrcode`
2. Create `src/lib/auth/two-factor.ts`:
   ```typescript
   // generateSecret(userId: string): { secret: string; otpauthUrl: string; qrCodeDataUrl: string }
   // verifyToken(secret: string, token: string): boolean
   // generateRecoveryCodes(count?: number): string[]
   // hashRecoveryCode(code: string): string
   // verifyRecoveryCode(code: string, hashedCodes: string[]): boolean
   ```
3. Add to admin profile page: 2FA setup flow
   - Step 1: Show QR code to scan with authenticator app
   - Step 2: Verify with first 6-digit code
   - Step 3: Show recovery codes (download/copy)
   - Step 4: 2FA enabled confirmation
4. In login flow: if `user.twoFactorEnabled === true`, after password verification:
   - Show TOTP input screen
   - Or show recovery code input option
5. Add `twoFactorVerified` to session so it expires properly
6. Restrict 2FA setup to admin/staff roles only initially

---

### FIX-019 & FIX-020 — Missing Audit Fields on Models

Create and run this Prisma migration:
```prisma
// Add to DamageClaim model:
createdBy  String?
updatedBy  String?
deletedAt  DateTime?
deletedBy  String?

// Add to Receiver model:
createdBy  String?
updatedBy  String?
deletedBy  String?
```

Run: `npx prisma migrate dev --name add_audit_fields_to_damage_receiver`

Update the services that create/update these models to populate `createdBy` and `updatedBy` from the authenticated user.

---

### FIX-021 — Kit Builder Hardcoded Strings

**File:** `src/components/features/build-your-kit/kit-wizard.tsx`

1. Identify all 19+ hardcoded English strings
2. Add `kit` namespace to ALL locale files:
   - `src/messages/ar.json` — Arabic translations
   - `src/messages/en.json` — English (source of truth)
   - `src/messages/zh.json` — Chinese translations
   - `src/messages/fr.json` — French translations
3. Replace each hardcoded string with `t('kit.key_name')`
4. Test kit builder in all 4 languages

---

### FIX-022 — Company Logo Missing from Invoice PDF

**File:** `src/lib/services/pdf/invoice-pdf.ts`

1. At the start of PDF generation, fetch company settings:
   ```typescript
   const company = await prisma.companySettings.findFirst()
   ```
2. If `company.logo` URL exists:
   - Fetch the image as buffer
   - Add to PDF header (top-left, max 120×60px, maintaining aspect ratio)
3. If no logo → use company name as text in the header
4. Also ensure these appear correctly in the PDF header:
   - Company name, address, phone, email, tax number (VAT registration number)
5. Test PDF generation with and without logo

---

### FIX-023 — Deposit Not Shown in Checkout Review

**File:** `src/components/features/checkout/checkout-step-review-pay.tsx`

1. Add deposit as an explicit line in the price summary:
   ```
   Subtotal:          300.00 SAR
   Discount:          -50.00 SAR
   VAT (15%):          37.50 SAR
   ─────────────────────────────
   Refundable Deposit: 500.00 SAR
   ═════════════════════════════
   Total Due:         787.50 SAR
   ```
2. Add an info tooltip/popover on the deposit line explaining:
   - Deposit is fully refundable upon undamaged return
   - Deposit is separate from the rental payment
3. Ensure deposit amount comes from the equipment/booking data, not hardcoded

---

### FIX-024 — Dashboard Missing Operational Metrics

**File:** `src/app/admin/(routes)/dashboard/overview/page.tsx`

Add these 4 new widgets:

1. **Equipment Currently Out** — count of bookings with `status: 'ACTIVE'`
   - Shows: quantity, link to booking list filtered by active
2. **Overdue Returns** — bookings where `endDate < now()` AND `status: 'ACTIVE'`
   - Shows: count with red badge if > 0, link to overdue list
   - This is a CRITICAL operational alert
3. **Low Stock Alert** — equipment where `availableQuantity <= 1`
   - Shows: equipment names, link to equipment list
4. **Pending Deposits** — bookings returned but deposit not yet processed
   - Shows: count, link to filtered bookings

Also add a time period selector (Today / This Week / This Month) to the revenue widget.

---

## 🟡 SPRINT 2 — MEDIUM PRIORITY (Days 8–14)

Work through these grouped by theme:

---

### PDF & DOCUMENT FIXES

**FIX-025 — Arabic RTL PDF Support:**
1. Evaluate current jsPDF implementation — does it support RTL?
2. If not, implement one of these solutions:
   - **Option A:** Switch to `pdfmake` with RTL plugin — install and migrate
   - **Option B:** Render invoice HTML to PDF using Puppeteer (server-side) — most reliable for RTL
   - **Option C:** Use `@react-pdf/renderer` which has better Unicode support
3. Test invoice PDF with Arabic customer names, Arabic item descriptions, and Arabic numbers
4. Verify Arabic text reads right-to-left correctly in the PDF
5. Verify numbers format correctly (Western vs Arabic-Indic based on locale setting)

**FIX-042 — Invoice PDF Email Attachment:**
1. In `EmailService.sendInvoiceEmail()`:
   - Generate invoice PDF as a Buffer (not a file path)
   - Attach to email as: `invoice-{invoiceNumber}.pdf`, content-type: `application/pdf`
2. Test: send invoice email → open email → download attachment → verify PDF is correct

---

### INTERNATIONALIZATION FIXES

**FIX-026 — Standardize Date Formatting:**
1. Search for all direct `toLocaleString()`, `toLocaleDateString()`, `toLocaleTimeString()` calls
2. Replace each with the centralized `formatDate()` from `src/lib/i18n/formatting.ts`
3. Ensure `formatDate()` accepts locale parameter and formats correctly for AR, EN, ZH

**FIX-027 — Standardize Currency Formatting:**
1. Same approach as FIX-026 for currency
2. All `formatSAR()` or manual currency formatting → `formatCurrency(amount, currency, locale)`

**FIX-029 — RTL Icon Mirroring:**
1. Search for chevron-right, arrow-right, back-arrow icons in components
2. In RTL mode, directional icons should mirror:
   ```tsx
   <ChevronRight className={cn('h-4 w-4', isRtl && 'rotate-180')} />
   ```
3. Create a `useDirection()` hook if not already present

**FIX-030 — Dynamic `dir` in Admin Pages:**
1. Find all hardcoded `dir="rtl"` in admin pages
2. Replace with `dir={locale === 'ar' ? 'rtl' : 'ltr'}`

**FIX-031 — Complete French Translations:**
1. Compare `fr.json` vs `ar.json` to find missing keys
2. Translate all ~200 missing keys
3. Ensure all keys that exist in AR and EN exist in FR and ZH

---

### SECURITY FIXES

**FIX-032 — File Upload Validation:**
**File:** `src/app/api/media/upload/route.ts`

Add server-side validation:
```typescript
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const file = formData.get('file') as File
if (!ALLOWED_MIME_TYPES.includes(file.type)) {
  return Response.json({ error: 'File type not allowed' }, { status: 400 })
}
if (file.size > MAX_FILE_SIZE) {
  return Response.json({ error: 'File too large (max 10MB)' }, { status: 400 })
}
```

---

### DATABASE FIXES

**FIX-033 — Add Soft Delete to Business-Critical Models:**

Create migration to add `deletedAt DateTime?` to:
- `Cart`
- `CartItem`
- `StudioSchedule`
- `Branch`
- `DeliveryZone`

Update all queries on these models to filter `where: { deletedAt: null }`

**FIX-034 — Add Audit Fields (createdBy/updatedBy) to 20+ Models:**
1. Create a single migration adding `createdBy String?` and `updatedBy String?` to all models that are missing them
2. Update service methods to populate these from the authenticated user context

---

### FEATURE ADDITIONS

**FIX-039 — Server-Side Chatbot Logging:**
1. Create `ChatConversation` model:
   ```prisma
   model ChatConversation {
     id        String   @id @default(cuid())
     userId    String?
     sessionId String?
     messages  Json     // Array of { role, content, timestamp }
     source    String   // 'public' | 'admin'
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   }
   ```
2. Save each conversation to the database on session end or after each exchange
3. Add admin page: `/admin/(routes)/support/conversations/` — view chat history

**FIX-040 — Human Handover in Chatbot:**
1. Add "Talk to a Human" button in the chat widget
2. Options (implement whichever is appropriate):
   - Create a support ticket and notify admin
   - Redirect to WhatsApp with pre-filled message
   - Show contact email/phone
3. Log all handover requests

**FIX-041 — Chatbot Configuration UI:**
1. Add `/admin/(routes)/settings/chatbot/` page
2. Settings: greeting message, company name in responses, response tone, FAQ entries
3. Save to database, chatbot reads settings on each conversation init

**FIX-043 — Low Stock Alert:**
1. Add `lowStockThreshold Int @default(1)` to Equipment model
2. After any booking confirmation, check if `availableQuantity <= lowStockThreshold`
3. If yes: send in-app notification to admin
4. Add equipment stock status indicator in equipment list

**FIX-044 — New Customer Registration Alert:**
1. In user registration event handler, emit `user.registered` event
2. Handler sends in-app notification + email to admin (if enabled in settings)

**FIX-045 — Blacklist Management UI:**
1. Create `/admin/(routes)/clients/blacklist/page.tsx`
2. List blacklisted customers: name, email, reason, blacklisted date, blacklisted by
3. Add "Add to Blacklist" button on customer profile page (requires reason)
4. Add "Remove from Blacklist" with required note
5. In booking creation flow: check blacklist status and block if `customer.isBlacklisted === true`
6. Emit `customer.blacklisted` / `customer.unblacklisted` events

**FIX-046 — Waitlist System:**
1. Create `Waitlist` model:
   ```prisma
   model Waitlist {
     id              String    @id @default(cuid())
     userId          String
     equipmentId     String?
     studioId        String?
     desiredStart    DateTime
     desiredEnd      DateTime
     status          String    @default("WAITING") // WAITING | NOTIFIED | BOOKED | CANCELLED
     notifiedAt      DateTime?
     createdAt       DateTime  @default(now())
     updatedAt       DateTime  @updatedAt
   }
   ```
2. Show "Join Waitlist" button on equipment detail when not available for selected dates
3. When equipment becomes available (booking cancelled, returned): check waitlist, notify first in queue
4. Notification: email + in-app with link to book

**FIX-047 — Automated Database Backups:**
1. Create `scripts/backup.ts` using `pg_dump`
2. Add to package.json: `"db:backup": "ts-node scripts/backup.ts"`
3. Store backup files with timestamp in filename
4. Optional: upload to S3/Supabase Storage if configured
5. Add documentation for manual restore procedure

**FIX-048 — GDPR Data Export/Deletion:**
1. Create `/api/portal/account/data-export` — returns all user data as JSON
2. Create `/api/portal/account/data-delete` — anonymizes: replaces name/email/phone with `[deleted]`, keeps booking records for financial audit trail
3. Add UI in customer portal profile settings page
4. Add 30-day cool-down period before deletion is permanent
5. Admin must be notified of deletion requests

---

### INFRASTRUCTURE FIXES

**FIX-049 — WebP Image Configuration:**
In `next.config.js`:
```javascript
images: {
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
}
```

**FIX-050 — Font Display Swap:**
Add `display: 'swap'` to all `next/font` configurations to prevent FOUT.

**FIX-051 — Add Favicon:**
1. Create or obtain: `favicon.ico`, `apple-touch-icon.png` (180×180), `favicon-32x32.png`, `favicon-16x16.png`
2. Place in `public/` directory
3. Add to root layout `<head>` metadata:
   ```typescript
   export const metadata: Metadata = {
     icons: {
       icon: '/favicon.ico',
       apple: '/apple-touch-icon.png',
     }
   }
   ```

**FIX-052 — Privacy Policy & Terms Content:**
1. Replace placeholder texts on Privacy Policy and Terms pages with proper legal structure
2. Sections needed in Privacy Policy: Data collected, How used, Third-party sharing, User rights, Contact
3. Sections needed in Terms: Service description, Booking policy, Cancellation policy, Liability, Governing law
4. Add a visible "Last updated: [date]" to both pages
5. ⚠️ Flag for human legal review before go-live

**FIX-053 — Production Data Cleanup Script:**
Create `scripts/cleanup-test-data.ts`:
```typescript
// Only runs when ALLOW_CLEANUP=true env var is set
// Removes: test users (test@*.com emails), test bookings, seed data
// Preserves: real customer data, real bookings, financial records
// Prints summary of what was deleted before deleting
// Has --dry-run flag to preview without deleting
```

**FIX-054 — Fix Missing .env.example Variables:**
Add ALL missing variables to `.env.example` with comments explaining each:
- `REACTIONS_SALT=` # Salt for hashing reaction/view tracking
- `VIEWS_SALT=` # Salt for hashing view tracking
- `AUTH_SECRET=` # NextAuth secret (min 32 chars in production)
- `NEXT_PUBLIC_CONTACT_PHONE=` # Public contact phone number
- `NEXT_PUBLIC_CONTACT_EMAIL=` # Public contact email address
- `PLAYWRIGHT_ADMIN_EMAIL=` # E2E test admin email (test env only)
- `PLAYWRIGHT_ADMIN_PASSWORD=` # E2E test admin password (test env only)
- `BASE_URL=` # Full base URL (e.g. https://flixcam.rent)

---

## 🟢 SPRINT 3 — LOW PRIORITY / POST-LAUNCH (Days 15–30)

Work through these as time allows. None are launch blockers.

| Fix | File/Area | Action |
|-----|-----------|--------|
| FIX-055 | Homepage error boundaries | Add error boundary with retry button |
| FIX-056 | TODO/FIXME comments | Address each or create GitHub issues |
| FIX-057 | Hardcoded status strings | Extract to `src/lib/constants/status.ts` |
| FIX-058 | Encryption key fallback | Throw on startup if `ENCRYPTION_KEY` not set in production |
| FIX-059 | Invoice download in portal list | Add quick download button to booking list cards |
| FIX-060 | SMS opt-in at checkout | Add SMS notification checkbox at checkout step |
| FIX-061 | Payment method on invoice | Add `paymentMethod String?` field to Invoice model |
| FIX-062 | Deposit on invoice | Show deposit as line item in invoice total section |
| FIX-063 | Add-on count badge in studio list | Show count of available add-ons on studio card |
| FIX-064 | Revenue time period selector | Add Today/Week/Month tabs to revenue dashboard widget |
| FIX-065 | Late fee config UI | Add late fee section to `/admin/settings/policies` |
| FIX-066 | Cloud storage config UI | Add Cloudinary/S3 config fields to integrations page |
| FIX-067 | Calendar sync config | Placeholder config for Google Calendar (when feature built) |
| FIX-068 | API key change audit trail | Log API config changes in audit log, surface in UI |
| FIX-069 | Equipment list CSV export | Add export button to equipment list page |
| FIX-070 | Payment receipt email | Create dedicated payment receipt email template |
| FIX-071 | Referral program | Full feature — referral codes, credit tracking, rewards |
| FIX-072 | Multi-currency | Full feature — currency switcher, exchange rate API |
| FIX-073 | Google Calendar sync | Full feature — OAuth, two-way sync |
| FIX-074 | iCal export | Add `.ics` download link to booking confirmations |
| FIX-075 | Maintenance mode toggle | Add toggle in admin settings → shows maintenance page to public |
| FIX-076 | Error message i18n | Move all hardcoded error strings to locale files |
| FIX-077 | "Most rented" report | Add dedicated report tab with chart |
| FIX-078 | "Outstanding payments" report | Add dedicated report tab with aging analysis |

---

## 📊 PROGRESS TRACKING

Update this table as you complete each fix:

| Fix # | Title | Sprint | Status | Completed Date |
|-------|-------|--------|--------|----------------|
| FIX-001 | Double VAT Calculation | S0 | ⬜ Pending | |
| FIX-002 | Rate Optimization | S0 | ⬜ Pending | |
| FIX-003 | Maintenance Blocking | S0 | ⬜ Pending | |
| FIX-004 | Barcode Scanning | S0 | ⬜ Pending | |
| FIX-005 | Guest Checkout | S0 | ⬜ Pending | |
| FIX-006 | Deposit Refund Flow | S0 | ⬜ Pending | |
| FIX-007 | Cancel → Refund | S0 | ⬜ Pending | |
| FIX-008 | XSS in Contracts | S0 | ⬜ Pending | |
| FIX-009 | TypeScript `any` Types | S1 | ⬜ Pending | |
| FIX-010 | Console → Logger | S1 | ⬜ Pending | |
| FIX-011 | Unhandled Promises | S1 | ⬜ Pending | |
| FIX-012 | Rate Limit Password Reset | S1 | ⬜ Pending | |
| FIX-013 | Admin Email Notifications | S1 | ⬜ Pending | |
| FIX-014 | Welcome Email | S1 | ⬜ Pending | |
| FIX-015 | Auto-Invoice on Confirm | S1 | ⬜ Pending | |
| FIX-016 | Public AI Chatbot | S1 | ⬜ Pending | |
| FIX-017 | Customer Excel Import | S1 | ⬜ Pending | |
| FIX-018 | 2FA for Admin | S1 | ⬜ Pending | |
| FIX-019 | DamageClaim Audit Fields | S1 | ⬜ Pending | |
| FIX-020 | Receiver Audit Fields | S1 | ⬜ Pending | |
| FIX-021 | Kit Builder Translations | S1 | ⬜ Pending | |
| FIX-022 | Logo in Invoice PDF | S1 | ⬜ Pending | |
| FIX-023 | Deposit in Checkout Review | S1 | ⬜ Pending | |
| FIX-024 | Dashboard Metrics | S1 | ⬜ Pending | |
| FIX-025 | Arabic RTL PDF | S2 | ⬜ Pending | |
| FIX-026 | Standardize Date Format | S2 | ⬜ Pending | |
| FIX-027 | Standardize Currency Format | S2 | ⬜ Pending | |
| FIX-028 | Status Label Constants | S2 | ⬜ Pending | |
| FIX-029 | RTL Icon Mirroring | S2 | ⬜ Pending | |
| FIX-030 | Dynamic `dir` Attribute | S2 | ⬜ Pending | |
| FIX-031 | French Translations | S2 | ⬜ Pending | |
| FIX-032 | File Upload Validation | S2 | ⬜ Pending | |
| FIX-033 | Soft Delete on Models | S2 | ⬜ Pending | |
| FIX-034 | Audit Fields on Models | S2 | ⬜ Pending | |
| FIX-035 | Equipment Accessories Model | S2 | ⬜ Pending | |
| FIX-036 | Dynamic Add-ons | S2 | ⬜ Pending | |
| FIX-037 | Visual Calendar Grid | S2 | ⬜ Pending | |
| FIX-038 | Customer Credit Limit UI | S2 | ⬜ Pending | |
| FIX-039 | Chatbot Logging | S2 | ⬜ Pending | |
| FIX-040 | Human Handover | S2 | ⬜ Pending | |
| FIX-041 | Chatbot Config UI | S2 | ⬜ Pending | |
| FIX-042 | Invoice PDF Email Attach | S2 | ⬜ Pending | |
| FIX-043 | Low Stock Alert | S2 | ⬜ Pending | |
| FIX-044 | Registration Alert | S2 | ⬜ Pending | |
| FIX-045 | Blacklist UI | S2 | ⬜ Pending | |
| FIX-046 | Waitlist System | S2 | ⬜ Pending | |
| FIX-047 | Automated Backups | S2 | ⬜ Pending | |
| FIX-048 | GDPR Export/Delete | S2 | ⬜ Pending | |
| FIX-049 | WebP Config | S2 | ⬜ Pending | |
| FIX-050 | Font Display Swap | S2 | ⬜ Pending | |
| FIX-051 | Favicon | S2 | ⬜ Pending | |
| FIX-052 | Privacy & Terms Content | S2 | ⬜ Pending | |
| FIX-053 | Cleanup Script | S2 | ⬜ Pending | |
| FIX-054 | .env.example Vars | S2 | ⬜ Pending | |
| FIX-055–078 | Low Priority Items | S3 | ⬜ Pending | |

---

## 🚀 FINAL LAUNCH GATE

Before calling the project production-ready, verify ALL of the following:

### Technical Gates
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npx eslint . --max-warnings 0` → 0 warnings
- [ ] `npx prisma validate` → schema valid
- [ ] `npm test` → all tests pass
- [ ] No `console.log` in production code (`git grep "console.log" src/`)
- [ ] No hardcoded API keys or secrets in code (`git grep "sk_live\|api_key\|password" src/`)

### Business Logic Gates
- [ ] Invoice math verified: create 5 test invoices with different scenarios → all calculations correct
- [ ] Booking double-booking: try to book same equipment/studio for overlapping dates → blocked
- [ ] Maintenance blocking: schedule maintenance, try to book during it → blocked
- [ ] Deposit flow: book → checkout → return → deposit released automatically
- [ ] Cancel flow: book → pay → cancel → refund triggered → email sent
- [ ] Rate optimization: 7-day booking uses weekly rate, 30-day uses monthly rate

### Security Gates
- [ ] Try XSS injection in all text input fields → blocked
- [ ] Try to access admin routes without admin role → 403/redirect
- [ ] Try to view another user's booking via API → 403
- [ ] Try to upload `.php` or `.exe` file → blocked
- [ ] Password reset rate limiting: request 6 times rapidly → 429 on 6th

### UX Gates
- [ ] Complete full booking flow as new customer (no account) → works end-to-end
- [ ] Complete full booking flow as logged-in customer → works end-to-end
- [ ] View booking in portal → all details correct
- [ ] Download invoice PDF → correct content, professional layout, Arabic text renders
- [ ] Switch to Arabic → full RTL layout, all strings translated
- [ ] Switch to Chinese → all strings translated
- [ ] Test on mobile (375px) → all pages fully usable

### Operational Gates
- [ ] Warehouse manager can scan a barcode → equipment details appear
- [ ] Admin receives email on new booking
- [ ] Customer receives confirmation email with invoice PDF
- [ ] AI chatbot responds in Arabic when asked in Arabic
- [ ] Import equipment via Excel → all items appear correctly
- [ ] سند الأمر generates and downloads as PDF with correct Arabic content
- [ ] Overdue returns show in dashboard with alert
- [ ] Low stock shows in dashboard

### Infrastructure Gates
- [ ] All `.env` variables are set for production
- [ ] Payment gateway is in LIVE mode (not sandbox)
- [ ] Database backup is configured and tested (run a restore)
- [ ] Error monitoring is active (Sentry or equivalent)
- [ ] Favicon appears in browser tab
- [ ] SSL certificate is valid

---

## 📈 TARGET STATE

| Module | Current | Target |
|--------|---------|--------|
| Equipment Rental | 89% | 100% |
| Studio Booking | 100% | 100% |
| Booking Flow | 85% | 100% |
| Invoice System | 75% | 100% |
| Control Panel | 90% | 100% |
| API Management | 85% | 100% |
| Multilingual (AR/EN/ZH/FR) | 75% | 95% |
| Warehouse + Barcode | 50% | 90% |
| AI Chatbot | 40% | 85% |
| Excel Import/Export | 80% | 100% |
| Notifications | 60% | 95% |
| Payment System | 90% | 100% |
| Security | 85% | 100% |
| Performance | 85% | 95% |
| **Overall** | **72%** | **98%** |

---

*Audit Date: 2026-02-28 | Platform: FlixCam.rent | Framework: Next.js + Prisma + TypeScript*
*Execute sprint by sprint. Verify each gate before advancing. Do not launch until the Final Launch Gate passes.*
