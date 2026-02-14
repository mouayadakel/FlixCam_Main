# Rental Company Standards – Deep Dive & Gap Analysis

**Date:** February 13, 2026  
**Purpose:** Define what a professional cinematic equipment & studio rental company needs, and audit the FlixCam.rent website and control panel against those standards. This document answers: **everything the platform needs to meet rental company standards.**

---

## Part 1: Rental Company Standards (What You Need)

A rental business must reliably:

1. **Acquire and retain customers** – Registration, verification, trust, legal clarity  
2. **Sell availability** – Catalog, search, filters, real-time availability, clear pricing  
3. **Convert to paid bookings** – No confirmation without payment; deposits; VAT; contracts  
4. **Fulfill orders** – Warehouse check-in/out, delivery/return, damage handling  
5. **Manage money safely** – Payments, refunds with approval, invoices, tax compliance  
6. **Operate legally** – Terms, privacy, e-signatures, audit trail  
7. **Run operations** – Roles, approvals, reporting, audit log

Below we go domain-by-domain: **standard → current state → gaps → what’s needed.**

---

## Part 2: Domain-by-Domain Audit

### 2.1 Customer & Registration

| Standard | Current State | Gap / Need |
|----------|---------------|-------------|
| No guest checkout (registration required) | Checkout and create-session require auth; booking create uses `session.user.id` | ✅ Met. Cart can be used with session; create-session returns 401 if not logged in. |
| Profile completion before booking | No enforced “profile complete” gate before checkout | ⚠️ **Add:** Require name + phone (and optionally verification) before allowing payment. |
| Customer verification (documents) | `User.verificationStatus`, `VerificationDocument`, API GET/PATCH `/api/clients/[id]/verification` and documents | ✅ Backend exists. **Need:** Clear admin UI to review/approve/reject documents; optional block on booking until verified for high-value. |
| Blacklist / risk | Risk score in booking (cancellations, etc.); no explicit “blacklist” flag or block | ⚠️ **Add:** Client blacklist (e.g. `User.blacklisted` or role) and block booking creation for blacklisted users. |

---

### 2.2 Catalog & Discovery (Public Website)

| Standard | Current State | Gap / Need |
|----------|---------------|-------------|
| Equipment catalog with search/filters | Public equipment page, filters (category, brand), `/api/public/equipment`, featured | ✅ Implemented. |
| Studio catalog & availability | Studios list, slug pages, `/api/public/studios/[slug]/availability` (slots by date) | ✅ Implemented. |
| Packages/bundles | Packages page, `/api/public/packages`, slug detail | ✅ Implemented. |
| Build-your-kit | `build-your-kit` page | ✅ Present. |
| Clear pricing (daily/weekly/monthly) | Equipment has `dailyPrice`, `weeklyPrice`, `monthlyPrice` in schema; pricing engine uses them | ⚠️ **Verify** public catalog and cart show weekly/monthly when relevant. |
| Availability visible before add-to-cart | Equipment availability is checked in booking create; no public “check availability” for date range on product page | ⚠️ **Add:** On equipment/studio detail, “Check availability” for chosen dates (call `/api/equipment/[id]/availability` or public equivalent) so customers see availability before cart. |

---

### 2.3 Cart & Checkout (Public)

| Standard | Current State | Gap / Need |
|----------|---------------|-------------|
| Cart with equipment/kits, dates, quantities | Cart store, CartService, sync with backend, add from catalog | ✅ Implemented. |
| Checkout steps (contact → details → review) | Checkout page with steps; contact step; login required for payment | ✅ Implemented. |
| Price lock (soft lock) | `lock-price` API (15 min TTL), `PriceLockNotice` component | ✅ Implemented. |
| Registration required to pay | create-session returns 401 if no session | ✅ Met. |
| Availability re-check at checkout | create-session builds equipment from cart and calls `BookingService.create`, which checks availability | ✅ Met. |
| Deposit shown before payment | PricingService.calculateDeposit (30%, min 1k, max 50k SAR); used in quote/invoice flows | ⚠️ **Add:** Show deposit amount on checkout review step and in booking confirmation. |
| VAT 15% shown | 15% in create-session (`vatAmount = totalAmount * 0.15`), invoice service, pricing engine | ✅ Implemented. **Verify** checkout UI shows subtotal + VAT + deposit clearly. |
| Payment (Tap) then redirect | Tap charge creation, redirect to success URL | ✅ Implemented. |

---

### 2.4 Booking Lifecycle (State Machine & Rules)

| Standard | Current State | Gap / Need |
|----------|---------------|-------------|
| State machine (DRAFT → … → CLOSED / CANCELLED) | Booking status enum, state-machine.ts, BookingService transitions | ✅ Implemented. |
| No confirmation without payment | CONFIRMED only after payment; create-session creates booking then runs risk check; if not PAYMENT_PENDING, message says “under review” | ✅ Met. |
| Risk check (auto vs manual) | performRiskCheck; risk score; can transition to PAYMENT_PENDING or leave in RISK_CHECK | ✅ Implemented. |
| Soft inventory lock (10–15 min) | 15 min in booking create (softLockExpiresAt); release-expired job; release API | ✅ Implemented. |
| Availability check on create | BookingService.create checks equipment (and studio) availability | ✅ Implemented. |
| Contract generation on confirm | State machine lists generate_contract on PAYMENT_PENDING→CONFIRMED; ContractService.create by bookingId | ✅ Backend. **Need:** Ensure contract is auto-created (or one-click) when booking confirms; booking detail has “View contract” / “Generate contract” and PDF link. |
| E-signature & contract PDF | Contract sign API, contract PDF generator (EN/AR) | ✅ Implemented. **Need:** Prominent “Sign contract” and “Download PDF” from portal and admin booking detail. |

---

### 2.5 Payments & Refunds

| Standard | Current State | Gap / Need |
|----------|---------------|-------------|
| Tap Payments integration | Tap client, createCharge, webhook | ✅ Implemented. |
| Refund requires approval | PaymentService.requestRefund creates ApprovalService.request; policy canRefund | ✅ Implemented. |
| Approving refund actually processes refund | Approval API only updates approval status; **does NOT** call PaymentService.processRefund | ❌ **Critical:** When approval is approved for `payment.refund`, call PaymentService.processRefund(approval.resourceId, approval.id, approvedBy). Add this in `/api/approvals/[id]/approve` (or in an approval.approved handler). |
| Refund UI in admin | Payment detail page has refund section; POST `/api/payments/[id]/refund` | ✅ Implemented. |
| Partial refund | requestRefund accepts amount; processRefund supports partial | ✅ Backend. **Verify** admin UI allows partial amount and reason. |
| Mark paid (manual) | PaymentService.markPaid, permission payment.mark_paid | ✅ Backend. **Verify** admin payment detail has “Mark paid” for manual/cash. |

---

### 2.6 Invoices & Tax Compliance

| Standard | Current State | Gap / Need |
|----------|---------------|-------------|
| Invoice generation (booking, manual) | InvoiceService, generate from booking, PDF with VAT | ✅ Implemented. |
| 15% VAT on items | Invoice items have vatRate 15%, vatAmount | ✅ Implemented. |
| ZATCA (e-invoicing) | ZATCA integration (XML, QR, optional submit), invoice PDF option includeZatcaQr | ✅ Implemented. **Need:** Ensure production env has ZATCA config; optionally “Submit to ZATCA” from invoice detail. |
| Invoice PDF download | `/api/invoices/[id]/pdf` | ✅ Implemented. |

---

### 2.7 Cancellation & Policies

| Standard | Current State | Gap / Need |
|----------|---------------|-------------|
| Cancellation window (e.g. 48h before start) | Portal cancel: CONFIRMED only if start > 48h away; else 400 with message | ✅ Implemented. |
| Cancellation fee / refund rules | State machine mentions calculate_cancellation_fee; no explicit fee calculation or config | ⚠️ **Add:** Define cancellation fee (e.g. % or fixed) per policy (e.g. &lt;48h = no refund; &gt;7 days = full refund). Implement in transition to CANCELLED and in refund flow. |
| Admin can cancel any (with reason) | BookingService.transitionState to CANCELLED with permissions | ✅ Implemented. |

---

### 2.8 Delivery & Return (Operations)

| Standard | Current State | Gap / Need |
|----------|---------------|-------------|
| Delivery scheduling | Delivery APIs (schedule, pending, by booking); delivery events | ✅ Backend. **Need:** Admin delivery schedule page (e.g. `/admin/ops/delivery/schedule`) to view/manage by day. |
| Warehouse check-in / check-out | WarehouseService, check-in/check-out APIs and queues | ✅ Implemented. |
| Return inspection & condition | Check-in can record condition; damage claims | ✅ Implemented. |

---

### 2.9 Damage & Deposit

| Standard | Current State | Gap / Need |
|----------|---------------|-------------|
| Deposit calculation | PricingService.calculateDeposit (30%, min 1k, max 50k SAR); AIService.suggestDeposit for risk-based | ✅ Implemented. **Need:** Show deposit on quote, booking create, and checkout. |
| Damage claims | DamageClaim model, create/resolve APIs, admin damage-claims pages | ✅ Implemented. |
| Deduct from deposit / charge difference | State machine: approve_with_charges → generate_damage_invoice, deduct_from_deposit, charge_difference | ⚠️ **Verify** damage resolution flow actually creates invoice and updates payment/deposit; document or implement if missing. |
| Deposit release on close | State machine: release_deposit on RETURNED→CLOSED | ⚠️ **Verify** closing booking triggers deposit release (refund or credit) and is visible in payments. |

---

### 2.10 Legal & Trust

| Standard | Current State | Gap / Need |
|----------|---------------|-------------|
| Terms of Service | `/terms` – placeholder text only | ❌ **Critical:** Replace with real, lawyer-approved terms (rental, liability, cancellation, payment, disputes). |
| Privacy Policy (PDPL) | `/privacy` – placeholder; mentions PDPL | ❌ **Critical:** Replace with real privacy policy (collection, use, retention, rights, contact). |
| Contract terms versioning | ContractService.getCurrentTermsVersion() returns '1.0.0' hardcoded; no DB table for terms | ⚠️ **Add:** Terms version stored in DB or config; contract references version; changelog for legal. |
| E-signature stored | Contract has signedAt, signedBy, signatureData | ✅ Implemented. |

---

### 2.11 Admin Control Panel (Operations)

| Standard | Current State | Gap / Need |
|----------|---------------|-------------|
| Permission-driven sidebar & routes | usePermissions (fail-closed), ROUTE_PERMISSIONS, ProtectedRoute | ✅ Implemented. |
| Admin profile (info + password) | `/admin/profile` with /api/me and /api/user/profile/password | ✅ Implemented. |
| Booking create with client, dates, equipment | New booking page; POST /api/bookings | ✅ Implemented. |
| Availability check on booking create | BookingService.create checks availability | ✅ Backend. **Need:** In admin booking create UI, show “Check availability” and warning if unavailable before submit. |
| Cost/deposit preview on booking create | Pricing engine and deposit service exist | ⚠️ **Add:** Before submit on admin booking create, show estimated total + deposit (and VAT) so staff can confirm. |
| Contract from booking | Contract by bookingId; PDF API | ⚠️ **Add:** On booking detail, “View/Generate contract” button and link to contract PDF. |
| Refund from payment detail | Refund dialog, request refund API | ✅ Implemented. **Need:** Ensure approval triggers processRefund (see 2.5). |
| Audit log viewer | GET /api/audit-logs exists | ❌ **Add:** Admin page (e.g. `/admin/settings/audit-log`) with filters (user, action, resource, date) and export. |
| Replace mock data | Wallet, Users, Technicians, Kit Builder kits, AI Recommendations use mock/sample | ❌ **Add:** Wire Wallet, Users, Technicians to real APIs; Kit Builder to GET/POST/DELETE /api/kits; AI Recommendations to /api/ai/recommendations. |
| Orders (if used) | Only list; no detail/new | ⚠️ **Add:** If “orders” are first-class, add `/admin/orders/[id]` and `/admin/orders/new`; otherwise align with bookings and relabel. |
| Delivery schedule page | Delivery APIs exist | ⚠️ **Add:** `/admin/ops/delivery/schedule` (or equivalent) for day view. |

---

### 2.12 Add-Ons (PRD: Assistant, Technician, Delivery, Insurance)

| Standard | Current State | Gap / Need |
|----------|---------------|-------------|
| Studio add-ons | Schema: StudioAddOn, studio.addOns | ✅ Model exists. **Verify** studio booking flow and pricing include add-ons. |
| Delivery as add-on | Delivery module exists; fee or add-on not clearly in booking line items | ⚠️ **Add:** Delivery as bookable add-on (e.g. per booking) with price and optional scheduling. |
| Assistant / technician as add-on | PRD mentions; no explicit add-on type in booking | ⚠️ **Add:** Optional “assistant” or “technician” add-on per booking with rate. |
| Insurance levels | PRD mentions; schema has insuranceClaim on damage; no “insurance level” on booking | ⚠️ **Add:** Insurance tier (e.g. basic/premium) as optional add-on with pricing. |

---

### 2.13 Reporting & Compliance

| Standard | Current State | Gap / Need |
|----------|---------------|-------------|
| Financial reports | ReportsService.generateFinancialReport, revenue, VAT, by period | ✅ Implemented. **Verify** admin finance/reports page uses it and shows VAT breakdown. |
| Utilization / analytics | Analytics APIs (utilization, trends, executive) | ✅ Implemented. |
| Export (CSV/Excel) | Reports have export routes | ✅ Present. **Verify** audit log export when audit viewer is added. |

---

### 2.14 Security & RBAC

| Standard | Current State | Gap / Need |
|----------|---------------|-------------|
| No admin bypass | Policies used; no role === 'admin' bypass in code | ✅ Met. |
| Financial actions require approval | Refund, etc. go through ApprovalService | ✅ Met (execution of refund after approve is the gap; see 2.5). |
| Soft delete only | deletedAt pattern; no hard delete without approval | ✅ Met. |
| Critical actions emit events | EventBus.emit for booking, payment, contract, etc. | ✅ Implemented. |
| 2FA for admin | ROLES_AND_SECURITY says “Required for: Admin accounts” | ⚠️ **Verify:** If not implemented, add 2FA (TOTP) for admin/super_admin. |
| Rate limiting | rateLimitAPI, read-only mode for API | ✅ Implemented. |

---

## Part 3: Single Checklist – Everything Needed to Meet Standards

Use this as the master “to meet rental company standards” list.

### Critical (Must Have)

- [ ] **Refund execution on approval** – When an approval of type `payment.refund` is approved, call `PaymentService.processRefund(paymentId, approvalId, approvedBy)` (in approve API or approval.approved handler).
- [ ] **Real Terms of Service** – Replace `/terms` placeholder with legal terms (rental, liability, cancellation, payment).
- [ ] **Real Privacy Policy** – Replace `/privacy` placeholder with PDPL-compliant policy.
- [ ] **Contract + PDF from booking** – Booking detail (admin + portal): one-click “View contract” / “Generate contract” and open PDF.
- [ ] **Deposit visible** – Show deposit amount on checkout review, quote, and admin booking create (and confirmation).
- [ ] **Availability in admin booking create** – Before submit, “Check availability” for selected dates/equipment and block or warn if unavailable.
- [ ] **Cost + deposit preview in admin booking create** – Show estimated total, VAT, and deposit before submit.

### High (Should Have)

- [ ] **Audit log viewer** – Admin page to browse/filter/export audit logs (user, action, resource, date).
- [ ] **Wire mock data** – Wallet → `/api/wallet`; Users → `/api/admin/users`; Technicians → `/api/technicians`; Kit Builder → `/api/kits`; AI Recommendations → `/api/ai/recommendations`.
- [ ] **Cancellation fee policy** – Define rules (e.g. &lt;48h no refund; &gt;7 days full) and implement in cancel transition + refund.
- [ ] **Customer verification UI** – Admin: review/approve/reject verification documents; optional “verified only” for high-value.
- [ ] **Profile completion gate** – Require name + phone (and optionally verification) before allowing payment.
- [ ] **Client blacklist** – Block booking creation for blacklisted clients.
- [ ] **Terms version in DB** – Store terms versions (e.g. TermsVersion table or config); contract references version.

### Medium (Nice to Have)

- [ ] **Delivery schedule page** – `/admin/ops/delivery/schedule` (or equivalent).
- [ ] **Public availability on product page** – “Check availability” for date range on equipment/studio detail.
- [ ] **Orders detail/new** – If orders are first-class, add detail and new pages; else relabel/hide.
- [ ] **Damage flow** – Ensure damage resolution creates invoice and deducts from deposit / charges difference; deposit release on close.
- [ ] **Add-ons in booking** – Delivery, assistant, technician, insurance as bookable add-ons with pricing.
- [ ] **2FA for admin** – TOTP for admin/super_admin accounts.
- [ ] **ZATCA production** – Env config and optional “Submit to ZATCA” from invoice.

### Lower (Polish)

- [ ] **Dashboard sub-pages** – Real content for overview, revenue, activity.
- [ ] **Action Center** – Real tasks/notifications API; persist dismiss.
- [ ] **Role conflict checks** – Warn or block when assigning conflicting roles (e.g. Finance + Data Entry).
- [ ] **Weekly/monthly pricing** – Ensure catalog and cart show weekly/monthly where applicable.

---

## Part 4: Prioritized Action List (Order of Implementation)

1. **Refund on approve** – Implement in `/api/approvals/[id]/approve`: if `approval.resourceType === 'payment'` and `approval.action === 'payment.refund'`, after `ApprovalService.approve`, call `PaymentService.processRefund(approval.resourceId, approval.id, session.user.id)`.
2. **Terms & Privacy** – Replace placeholders with legal content (engage legal for final wording).
3. **Contract from booking** – Add “View contract” / “Generate contract” and PDF link on booking detail (admin + portal).
4. **Deposit on checkout & admin create** – Show deposit in checkout review, confirmation, and admin booking create; add cost + deposit preview on admin create.
5. **Availability in admin create** – Call availability API for selected equipment/dates and show result before submit.
6. **Audit log viewer** – New admin page with filters and export.
7. **Wire mock data** – Wallet, Users, Technicians, Kit Builder, AI Recommendations.
8. **Cancellation fee** – Define policy and implement in cancel + refund.
9. **Verification UI & blacklist** – Admin verification review; blacklist flag and check in booking create.
10. **Rest** – Follow checklist in order of business priority.

---

## Part 5: Summary Table (Rental Standards vs Status)

| Area | Status | Critical Gaps |
|------|--------|----------------|
| Customer & registration | Good | Profile gate, blacklist, verification UI |
| Catalog & discovery | Good | Availability on product page |
| Cart & checkout | Good | Deposit visible on review |
| Booking lifecycle | Good | Contract link from booking, deposit visibility |
| Payments & refunds | **Gap** | **Execute refund when approval approved** |
| Invoices & VAT | Good | ZATCA production config |
| Cancellation | Good | Cancellation fee rules |
| Delivery & return | Good | Delivery schedule page |
| Damage & deposit | Good | Verify deduct/release flow |
| Legal | **Gap** | **Real Terms & Privacy** |
| Admin panel | Good | Audit viewer, mock data, availability/cost preview, contract link |
| Add-ons | Partial | Delivery/assistant/tech/insurance in booking |
| Reporting | Good | — |
| Security | Good | 2FA for admin optional |

---

**End of document.**  
For implementation details, refer to the codebase and `docs/PRD.md`, `docs/BOOKING_ENGINE.md`, `docs/ROLES_AND_SECURITY.md`, and `docs/WEBSITE_AND_CONTROL_PANEL_DEEP_DIVE.md`.
