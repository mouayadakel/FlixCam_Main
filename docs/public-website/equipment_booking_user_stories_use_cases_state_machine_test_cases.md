# 📦 Equipment Booking – User Stories, Use Cases, State Machine & Test Cases

> **Scope:** Equipment rental only (no studio)
>
> **Goal:** Cover *all realistic scenarios* a client might face from first visit → post-payment
>
> **Includes:**
> - User Stories (very detailed)
> - Use Cases (main + alternate/error flows)
> - State Machine (booking lifecycle)
> - Test Cases (happy paths + edge cases)

---

## 0) Definitions & Concepts

### Rental Models
- **Daily** (default)
- **Weekly** (auto discount)
- **Monthly** (auto discount)

### Availability Logic
- Availability is **date-based** (From → To)
- Quantity-based items supported (multi-units)
- Availability always revalidated before payment

### Selling Layers
- **Equipment only** (single or multiple items)
- **Recommended equipment** (contextual cross-sell)
- **Bundles** (discounted grouped items)
- **Packages / Offers** (predefined deals)

### Key Public Pages
- **/equipment** (catalog)
- **/equipment/{slug}** (details)
- **/cart**
- **/checkout**
- **/booking/confirmation/{id}**

---

# 1) Scenario A — Equipment Only (Single / Multiple Items)

## 🧑‍💻 User Story (US-EQ-A01)
**As a** client
**I want** to browse equipment, select rental dates, add items, pay, and receive confirmation
**So that** I can secure equipment without manual communication

### Step-by-Step Journey (Entry → Post-Payment)
1. Client enters **Home** → clicks **Browse Equipment**
2. Lands on **/equipment**
3. Browses all equipment (no date required)
4. Selects rental dates (From / To)
5. Filters by type / brand / price / availability
6. Opens **/equipment/{slug}**
7. Adds equipment to cart
8. Reviews cart
9. Proceeds to checkout
10. Pays
11. Receives confirmation + summary

---

## ⚙️ Use Case (UC-EQ-A01)
**Actor:** Client

### Preconditions
- Equipment is published
- Payment gateway active

### Main Success Flow
1. Browse catalog
2. Select rental dates
3. Add equipment to cart
4. System validates availability
5. Checkout
6. Payment success
7. Booking confirmed

### Alternate / Error Flows
- **A1:** No dates selected → system requires dates before checkout
- **A2:** Equipment unavailable → system blocks checkout and suggests alternatives
- **A3:** Quantity exceeds available units → system limits quantity
- **A4:** Payment failure → booking saved as *Payment Failed* with retry

### Postconditions
- Booking = Confirmed
- Inventory locked for rental period

---

## 🔁 Diagram (Equipment Only)
```
[Home]
  ↓
[Equipment Catalog]
  ↓ Select Dates
[Equipment Details]
  ↓ Add to Cart
[Cart]
  ↓
[Checkout]
  ↓ Pay
[Payment Gateway]
  ↓
[Confirmation]
```

---

# 2) Scenario B — Equipment + Recommended Items (Discount)

## 🧑‍💻 User Story (US-EQ-B01)
**As a** client
**I want** the system to recommend compatible equipment with a discount
**So that** I don’t forget essentials and save money

### Step-by-Step Journey
1. Client adds primary equipment (e.g., camera)
2. System shows recommended items (lenses, batteries, tripod)
3. Client adds recommended items
4. Discount applied automatically
5. Checkout → payment → confirmation

---

## ⚙️ Use Case (UC-EQ-B01)
**Actor:** Client

### Preconditions
- Compatibility rules configured
- Recommendation discounts enabled

### Main Flow
1. Add main equipment
2. System generates recommendations
3. Client adds recommendations
4. Discount applied
5. Payment success

### Alternate / Error Flows
- **B1:** Client skips recommendations → no discount
- **B2:** Recommended item unavailable → suggest alternative
- **B3:** Recommended item removed → discount removed

### Postconditions
- Booking confirmed
- Discount recorded

---

## 🔁 Diagram (Recommendations)
```
[Add Main Equipment]
        ↓
[Show Recommendations]
        ↓ Add / Skip
[Discount Applied]
        ↓
[Checkout]
        ↓
[Payment]
        ↓
[Confirmation]
```

---

# 3) Scenario C — Equipment + Bundles

## 🧑‍💻 User Story (US-EQ-C01)
**As a** client
**I want** to select a discounted bundle related to my equipment
**So that** I save time and cost

### Step-by-Step Journey
1. Client opens equipment page
2. System displays relevant bundles
3. Client selects bundle
4. Bundle items added to cart
5. Discount applied
6. Checkout → payment → confirmation

---

## ⚙️ Use Case (UC-EQ-C01)
**Actor:** Client

### Preconditions
- Bundles configured and active
- Bundle availability rules defined

### Main Flow
1. View equipment
2. Select bundle
3. System validates availability of all bundle items
4. Add bundle to cart
5. Payment

### Alternate / Error Flows
- **C1:** Bundle item unavailable → block bundle + suggest alternative
- **C2:** Client removes bundle → revert cart

### Postconditions
- Booking confirmed
- Bundle logged in order

---

## 🔁 Diagram (Bundles)
```
[Equipment Page]
     ↓
[Select Bundle]
     ↓
[Validate Bundle Items]
     ↓ OK / Not OK
[Cart Updated]   [Suggest Alternative]
     ↓
[Checkout]
     ↓
[Payment]
     ↓
[Confirmation]
```

---

# 4) Scenario D — Packages & Offers Only

## 🧑‍💻 User Story (US-EQ-D01)
**As a** client
**I want** to select a ready equipment package or offer
**So that** I can book quickly without technical knowledge

### Step-by-Step Journey
1. Client opens **/packages**
2. Browses equipment packages
3. Opens package details
4. Selects rental dates
5. System validates availability
6. Adds package to cart
7. Checkout → payment → confirmation

---

## ⚙️ Use Case (UC-EQ-D01)
**Actor:** Client

### Preconditions
- Packages published
- All items linked to inventory

### Main Flow
1. Browse packages
2. Select package
3. Select dates
4. Availability check
5. Payment

### Alternate / Error Flows
- **D1:** Item in package unavailable → suggest equivalent or date change
- **D2:** Minimum rental duration not met → enforce rule
- **D3:** Payment failure → retry

### Postconditions
- Booking confirmed
- Package items locked

---

## 🔁 Diagram (Packages Only)
```
[Packages Page]
     ↓
[Package Details]
     ↓ Select Dates
[Availability Check]
     ↓ OK / Not OK
[Checkout]   [Suggest Alternative]
     ↓
[Payment]
     ↓
[Confirmation]
```

---

# 5) Equipment Booking State Machine

## 🧠 States
- **Draft** (building cart)
- **Validated** (dates + availability OK)
- **Payment Pending**
- **Confirmed**
- **Cancelled** (policy)
- **Payment Failed**
- **Expired** (payment timeout)

### Transitions
- Draft → Validated (dates selected + availability OK)
- Validated → Payment Pending (pay click)
- Payment Pending → Confirmed (success)
- Payment Pending → Payment Failed (failure)
- Payment Pending → Expired (TTL)
- Confirmed → Cancelled (policy)

## 🔁 Diagram (State Machine)
```
[Draft]
   ↓ validate
[Validated]
   ↓ pay
[Payment Pending]
   ↓ success / fail
[Confirmed]  [Payment Failed]
      ↓ cancel policy
   [Cancelled]

Payment Pending → Expired (TTL)
```

---

# 6) Test Cases (Comprehensive)

## A) Equipment Only
- **TC-EQ-A-01 | Single item success**
- **TC-EQ-A-02 | Multiple items success**
- **TC-EQ-A-03 | Quantity exceeds availability**
- **TC-EQ-A-04 | Date conflict**
- **TC-EQ-A-05 | Payment failure**
- **TC-EQ-A-06 | Payment timeout**

## B) Recommendations
- **TC-EQ-B-01 | Add recommended items**
- **TC-EQ-B-02 | Discount applied correctly**
- **TC-EQ-B-03 | Remove recommended item removes discount**

## C) Bundles
- **TC-EQ-C-01 | Bundle success**
- **TC-EQ-C-02 | Bundle item unavailable**
- **TC-EQ-C-03 | Remove bundle from cart**

## D) Packages / Offers
- **TC-EQ-D-01 | Package booking success**
- **TC-EQ-D-02 | Package minimum duration enforced**
- **TC-EQ-D-03 | Payment failure retry**

## E) General / Edge
- **TC-EQ-E-01 | Guest checkout**
- **TC-EQ-E-02 | Cart persistence on refresh**
- **TC-EQ-E-03 | Double payment click**
- **TC-EQ-E-04 | Price recalculation integrity**

---

## 7) Implementation Notes
- Always re-check availability server-side before Payment Pending
- Lock inventory only after successful payment
- Use TTL to auto-expire unpaid carts
- Discounts must be deterministic and auditable

---

✅ End of document

