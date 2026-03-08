# Checkout Process – Step-by-Step, User Stories & Case Stories

> **Source:** Current FlixCam implementation (`(public)/checkout`, `checkout.store`, `create-session`, `lock-price`) + `docs/ENTERPRISE_UX_REFERENCE_SPEC.md`, `docs/PRD.md`, equipment & studio booking docs.

---

## 1. Correct Checkout Process (Step-by-Step)

### Pre-checkout gates (before step 1)

| Gate | Rule | What happens |
|------|------|----------------|
| **Auth** | User must be logged in. | Not logged in → show **Contact** step (login/register); after auth, continue. |
| **Profile completeness** | Name + phone required. | Incomplete → redirect to `/portal/profile?complete=true`; cannot proceed until complete. |
| **Cart not empty** | At least one item (equipment, kit, package, or studio). | Empty cart → redirect to `/cart` after short delay. |
| **Approved account** | (Spec) Pending customers cannot hold/checkout. | Enforced in API; UI can show message if not approved. |

---

### Path A: Equipment (and/or kits/packages) – 6 steps

| Step | Name | What happens |
|------|------|----------------|
| **1** | **Dates** | User selects rental start and end dates (and optionally fulfillment: pickup vs delivery). Dates stored in checkout store. |
| **2** | **Availability** | System validates availability for each cart item; calls `POST /api/checkout/lock-price` → **15-minute price/hold**. User sees “held for X min”. On success → advance. |
| **3** | **Add-ons** | Insurance tier, technician, delivery fee, etc. Optional; selections stored. |
| **4** | **Review** | Order summary: line items, subtotal, discount, VAT, deposit, total. User reviews and clicks “Advance to payment”. |
| **5** | **Payment** | User sees payment step; can click “Pay now” (or equivalent). This leads to step 6. |
| **6** | **Confirm** | Final “Pay now” CTA. On click → navigate to **`/payment`**. |

**On `/payment`:**

- Page calls **`POST /api/checkout/create-session`** with checkout details (name, email, phone).
- API: creates **booking** from cart, runs **risk check**, sends **confirmation email**.
- If risk check moves booking out of `PAYMENT_PENDING` → redirect to portal bookings with message.
- If TAP is configured: creates TAP charge, returns **`redirectUrl`** → user sent to TAP to pay.
- If TAP not used: returns **`redirectUrl`** = **`/booking/confirmation/{bookingId}`**.

**After payment:**

- User lands on **`/booking/confirmation/[id]`** (or portal bookings if redirected).

---

### Path B: Studio-only cart – 4 steps

Same gates (auth, profile, non-empty cart). Steps **1 (Dates)** and **2 (Availability)** are skipped; studio items already have dates from the studio book flow.

| Step | Name |
|------|------|
| **3** | Add-ons |
| **4** | Review |
| **5** | Payment |
| **6** | Confirm → `/payment` → create-session → TAP or confirmation page |

---

### Summary flow (equipment)

```
[Cart] → [Checkout]
  → Gate: Login → Gate: Profile (name, phone) → Gate: Cart not empty
  → Step 1: Dates
  → Step 2: Availability (lock price 15 min)
  → Step 3: Add-ons
  → Step 4: Review
  → Step 5: Payment (UI)
  → Step 6: Confirm → click "Pay now"
  → /payment → POST /api/checkout/create-session
  → Booking created, risk check, email sent
  → TAP redirect (if configured) OR /booking/confirmation/{id}
  → Confirmation page
```

---

## 2. User Stories

### US-CHK-01: Complete a booking from cart (equipment)

**As a** logged-in customer  
**I want** to go through checkout (dates → availability → add-ons → review → payment → confirm) and pay  
**So that** my equipment rental is confirmed and I receive a confirmation and invoice.

**Acceptance criteria:**

- Must be logged in; profile must have name and phone.
- I select dates (step 1), then availability is locked for 15 minutes (step 2).
- I can add add-ons (step 3), review order (step 4), then proceed to payment (steps 5–6).
- On “Pay now”, I am sent to payment; after success I see the booking confirmation page.

---

### US-CHK-02: Complete a studio-only booking

**As a** logged-in customer  
**I want** to checkout with only studio items in the cart (no date/availability steps)  
**So that** I confirm my studio slot quickly after adding it from the studio book page.

**Acceptance criteria:**

- With studio-only cart, I see only Add-ons → Review → Payment → Confirm.
- Payment and confirmation flow same as equipment.

---

### US-CHK-03: Profile required before checkout

**As a** logged-in customer with missing name or phone  
**I want** to be asked to complete my profile before continuing checkout  
**So that** the company has my contact details for the booking.

**Acceptance criteria:**

- If name or phone is missing, I am redirected to `/portal/profile?complete=true`.
- After completing profile, I can return to checkout and proceed.

---

### US-CHK-04: See order summary and hold time during checkout

**As a** customer on checkout  
**I want** to see a sticky order summary (desktop) and the “held for X minutes” message after availability lock  
**So that** I know the total and that my selection is temporarily reserved.

**Acceptance criteria:**

- Order summary shows line items, subtotal, discount, VAT, deposit, total.
- After step 2 (availability), a message shows the hold duration (e.g. 15 min).

---

### US-CHK-05: Pay via TAP and land on confirmation

**As a** customer who clicked “Pay now” on the confirm step  
**I want** to be sent to the payment provider (TAP) and then to the booking confirmation page  
**So that** I get a clear confirmation and can save or share the link.

**Acceptance criteria:**

- After create-session, I am redirected to TAP when configured, or to confirmation URL.
- Success URL is `/booking/confirmation/{bookingId}`.
- Confirmation page shows booking summary and next steps.

---

## 3. Case Stories (Use Cases / Scenarios)

### Case 1: Happy path – equipment only

1. User is logged in, profile complete, has equipment in cart.
2. Checkout: Step 1 – select dates → Step 2 – lock availability (15 min) → Step 3 – skip or add add-ons → Step 4 – review → Step 5–6 – Pay now.
3. `/payment` calls create-session; booking created, risk check keeps status `PAYMENT_PENDING`, confirmation email sent.
4. User redirected to TAP, pays.
5. TAP redirects to `/booking/confirmation/{id}`.
6. User sees confirmation page.

**Postconditions:** Booking confirmed (or as per risk flow); inventory affected; confirmation email sent.

---

### Case 2: Happy path – studio only

1. User has only studio item(s) in cart (with dates from studio book).
2. Checkout: Steps 1–2 skipped → Step 3 Add-ons → Step 4 Review → Step 5–6 Pay now.
3. Same create-session and payment flow; redirect to confirmation.

**Postconditions:** Studio booking confirmed; slot locked; confirmation sent.

---

### Case 3: Not logged in

1. User has items in cart, goes to `/checkout`.
2. Not authenticated → Checkout page shows **Contact** step (login/register).
3. After login, profile check runs; if complete, user sees step 1 (or 3 for studio-only).

---

### Case 4: Profile incomplete

1. User is logged in but name or phone missing.
2. Checkout page fetches `/api/me`; profile incomplete → redirect to `/portal/profile?complete=true`.
3. User completes profile, returns to checkout and continues.

---

### Case 5: Empty cart

1. User opens `/checkout` with empty cart.
2. After short delay, redirect to `/cart`.

---

### Case 6: Risk check blocks automatic payment

1. User completes payment step; create-session runs.
2. Booking is created; risk check moves status out of `PAYMENT_PENDING` (e.g. manual review).
3. API returns 200 with `redirectUrl` to `/portal/bookings` and message “الحجز قيد المراجعة. سنتواصل معك قريباً.”
4. User is not sent to TAP; user sees portal bookings and message.

---

### Case 7: TAP not configured

1. Create-session runs; no TAP API key or webhook secret.
2. API still creates booking and sends confirmation email.
3. API returns `redirectUrl: /booking/confirmation/{id}`.
4. User is redirected to confirmation page without going to TAP.

---

### Case 8: Hold expiry (spec / UX)

1. User completes step 2 (availability lock); 15-minute hold starts.
2. User leaves or is slow; hold expires (enforced when creating booking / at payment time).
3. If availability changed, create-session can fail or revalidate; user may need to restart checkout or adjust cart.

---

### Case 9: Mixed cart (equipment + studio)

1. Cart has both equipment and studio items.
2. Checkout uses **full 6-step flow** (dates from equipment or studio, then availability lock, add-ons, review, payment, confirm).
3. Create-session builds one booking with both equipment and studio; single payment and confirmation.

---

## 4. Reference: Implemented Steps and APIs

| Item | Location / API |
|------|----------------|
| Checkout page (steps 1–6) | `src/app/(public)/checkout/page.tsx` |
| Step 1 – Dates | `CheckoutStepDates` |
| Step 2 – Availability | `CheckoutStepAvailability` → `POST /api/checkout/lock-price` |
| Step 3 – Add-ons | `CheckoutStepAddons` |
| Step 4 – Review | `CheckoutStepReview` |
| Step 5–6 – Payment / Confirm | `CheckoutStepPayment`, `CheckoutStepConfirm` → navigate to `/payment` |
| Create booking + payment session | `POST /api/checkout/create-session` |
| Confirmation page | `src/app/(public)/booking/confirmation/[id]/page.tsx` |
| Checkout state (step, dates, hold, etc.) | `src/lib/stores/checkout.store.ts` |

---

## 5. Business Rules (from PRD / spec)

- **No guest checkout:** Registration (login) required.
- **Profile completeness:** Name and phone required before checkout (enforced by redirect to profile).
- **Price hold:** 15-minute lock after availability step (lock-price API); revalidation on confirm.
- **Single payment:** Full amount charged via TAP (or redirect to confirmation if TAP not configured).
- **Risk check:** After booking create, risk check can set status to non–payment-pending; user then redirected to portal with “under review” message.
- **Confirmation:** Email sent after booking create; success redirect to `/booking/confirmation/{id}`.

---

**Last updated:** From codebase and docs (Feb 2025). Use this as the single reference for checkout steps, user stories, and case stories.
