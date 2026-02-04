# 🚀 MASTER BOOKING SYSTEM – FULL SPECIFICATION (EQUIPMENT + STUDIO)

> **This document is the single source of truth**
>
> Covers **everything** from first site visit → post‑payment → support → edge cases
>
> Audience: Product, UX, Backend, QA, AI Agents (Cursor)

---

## 1) Scope & Philosophy

### Scope
- Equipment rental
- Studio booking
- Packages, bundles, offers
- Recommendations & Build‑Your‑Kit
- Guest checkout
- Payments, changes, refunds, extensions
- Support & post‑payment lifecycle

### Core Philosophy
- **Simple for client / strict for system**
- No silent changes after payment
- Every rule must be explainable in UI
- All money movements are auditable

---

## 2) User Types

| User | Description |
|-----|-------------|
| Guest Client | No account, can book & pay |
| Registered Client | Has portal, history, requests |
| Support/Admin | Manual override, approvals |
| System | Validation, pricing, locking |

---

## 3) Entry Points (Public)

- Home (/)
- Equipment Catalog (/equipment)
- Packages (/packages)
- Studios (/studios)
- Build Your Kit (/build-your-kit)

---

## 4) Unified Booking Journey (High Level)

```
[Landing]
   ↓
[Browse / Search]
   ↓
[Select Item(s)]
   ↓
[Apply Bundles / Offers / Recommendations]
   ↓
[Cart]
   ↓
[Checkout]
   ↓
[Payment]
   ↓
[Confirmation]
   ↓
[Post‑Payment Lifecycle]
```

---

## 5) User Stories (Master)

### US‑01 Browse & Discover
Client can browse equipment/studios without dates.

### US‑02 Availability Check
Client selects dates (equipment) or slot (studio).

### US‑03 Add to Cart
Client adds equipment, studio, packages, bundles.

### US‑04 Price Transparency
Client sees full breakdown before payment.

### US‑05 Payment
Client completes payment securely.

### US‑06 Confirmation
Client receives confirmation + documents.

### US‑07 Change Request
Client requests change after payment.

### US‑08 Extension
Client extends rental or session.

### US‑09 Refund
Client receives partial/full refund per policy.

### US‑10 Support Contact
Client contacts support with booking context.

---

## 6) Use Cases (Condensed)

### UC‑01 Equipment Booking
- Validate availability
- Lock inventory after payment

### UC‑02 Studio Booking
- Validate slot + buffer + hours

### UC‑03 Package Booking
- Validate all included items

### UC‑04 Bundle Application
- Apply discount rules

### UC‑05 Recommendation Discount
- Conditional discount logic

### UC‑06 Change After Payment
- Quote difference
- Collect/refund delta

### UC‑07 Extension
- Revalidate availability

### UC‑08 Partial Refund
- Item or duration removal

### UC‑09 Support Assisted Change
- Admin override with audit log

---

## 7) Pricing & Discount Rules

### Price Lock
- Price locked at **checkout start**
- If changed before pay → show diff & require reconfirm

### Discount Priority (Strict)
1. Package price
2. Bundle discount
3. Offer
4. Coupon

Only one layer per item.

---

## 8) Payment Handling

### States
- Draft
- Validated
- Payment Pending
- Processing Payment
- Confirmed
- Payment Failed
- Expired

### Callback Delay Handling
- Show “Processing Payment”
- Poll every X seconds
- Block duplicate attempts

---

## 9) State Machine (Unified)

```
[Draft]
   ↓ validate
[Validated]
   ↓ pay
[Payment Pending]
   ↓ callback
[Processing Payment]
   ↓ success / fail
[Confirmed]  [Payment Failed]
   ↓ cancel / extend
[Completed / Cancelled]

Payment Pending → Expired (TTL)
```

---

## 10) Change / Extension / Refund Flows

### Change Request
1. Request
2. Revalidate
3. Quote diff
4. Pay or refund
5. Apply change

### Extension
- Same items preferred
- Fallback to partial or alternative

### Partial Refund
- Remove item or reduce duration
- Calculate prorated amount
- Refund or credit

---

## 11) Edge Cases (Critical)

- Price change mid‑flow
- Partial availability
- Multi‑location inventory
- Mandatory add‑ons
- Identity verification hold
- Late return fees
- No‑show studio

---

## 12) Support & Communication

### Automated
- Confirmation
- Payment failure
- Change approved

### Manual Support
- Booking context auto‑attached
- One‑click WhatsApp message

---

## 13) Test Cases (Master Matrix)

### Happy Paths
- Equipment only
- Studio only
- Package booking

### Edge
- Callback delay
- Discount conflict
- Partial refund
- Extension conflict

### Abuse / Safety
- Double pay click
- Refresh during payment
- Reopen expired session

---

## 14) Admin / Audit Requirements

- All money movements logged
- All overrides logged
- Immutable booking history

---

## 15) AI / Cursor Execution Notes

- Never bypass validation
- Always explain errors
- Retry payment safely
- Prefer suggestion over blocking

---

## ✅ END – This document is the contract

