# 📦 Equipment Rental – User Stories, Use Cases & Diagrams

> **Scope:** Equipment rental only (no studio)
>
> **Coverage:** From first site entry → post‑payment
>
> **Scenarios:**
>
> 1. Equipment only
> 2. Equipment + Recommended items (discount)
> 3. Equipment + Packages & Offers
> 4. Packages & Offers only

---

## 🧩 Common Assumptions (All Scenarios)

- Public website, guest checkout allowed
- Availability is date‑based
- Prices visible before checkout
- Single shared Cart, Checkout, Payment, and Confirmation flows
- Inventory is locked only after successful payment

---

# 1️⃣ Scenario 1 — Equipment Only

## 🎯 User Story (US‑EO‑01)

**As a** new client
**I want** to browse equipment, select dates, add items, pay, and receive confirmation
**So that** I can secure the equipment without contacting support

### Step‑by‑Step Journey

1. Enter **Home** → click **Browse Equipment**
2. Land on **/equipment** catalog
3. (Optional) Set rental dates
4. Browse all equipment, filter by type/brand/price
5. Open equipment details **/equipment/{slug}**
6. Add equipment to cart
7. Review cart
8. Proceed to checkout
9. Pay
10. Receive confirmation + summary

---

## ⚙️ Use Case (UC‑EO‑01)

**Actor:** Client

### Preconditions

- Equipment exists and is published
- Payment gateway is active

### Main Flow

1. Client browses catalog
2. Client selects dates
3. Client adds equipment to cart
4. System validates availability
5. Client completes checkout
6. Payment succeeds
7. Booking confirmed

### Alternate Flows

- **A1:** No date selected → system requires date before checkout
- **A2:** Equipment becomes unavailable → system blocks checkout and asks to modify dates
- **A3:** Payment fails → booking saved as _Payment Failed_ with retry option

### Postconditions

- Booking status = Confirmed
- Equipment locked for selected period

---

## 🔁 Diagram (Equipment Only)

```
[Home]
  ↓
[Equipment Catalog]
  ↓
[Equipment Details]
  ↓ Add to Cart
[Cart]
  ↓
[Checkout]
  ↓ Pay
[Payment Gateway]
  ↓
[Confirmation + Summary]
```

---

# 2️⃣ Scenario 2 — Equipment + Recommended Items (with Discount)

## 🎯 User Story (US‑REC‑01)

**As a** client
**I want** the system to suggest compatible equipment with a discount
**So that** I don’t forget essentials and save money

### Step‑by‑Step Journey

1. Enter **/equipment**
2. Select dates
3. Add main equipment (e.g., camera)
4. System shows **recommended items** (lens, battery, tripod)
5. Client adds recommendations
6. Discount auto‑applied
7. Checkout → payment → confirmation

---

## ⚙️ Use Case (UC‑REC‑01)

**Actor:** Client

### Preconditions

- Recommendation rules exist
- Discount rules are active

### Main Flow

1. Client adds primary equipment
2. System analyzes compatibility
3. System shows recommendations
4. Client adds recommended items
5. System applies discount
6. Checkout and payment
7. Confirmation with discount breakdown

### Alternate Flows

- **B1:** Client skips recommendations → no discount applied
- **B2:** Recommended item unavailable → system suggests alternative
- **B3:** Client removes recommended item → discount removed

### Postconditions

- Booking confirmed
- Discount recorded in order

---

## 🔁 Diagram (Recommendations + Discount)

```
[Catalog]
   ↓
[Equipment Details]
   ↓ Add Main Item
[Recommendations Panel]
   ↓ Add / Skip
[Discount Applied]
   ↓
[Cart]
   ↓
[Checkout]
   ↓
[Payment]
   ↓
[Confirmation]
```

---

# 3️⃣ Scenario 3 — Equipment + Packages & Offers

## 🎯 User Story (US‑PKG‑MIX‑01)

**As a** client
**I want** to add equipment individually and apply packages or offers
**So that** I get better value without rebuilding my cart

### Step‑by‑Step Journey

1. Browse equipment
2. Add individual items
3. Open cart
4. System suggests **package or offer**
5. Client applies offer or converts to package
6. Cart updates with savings preview
7. Checkout → payment → confirmation

---

## ⚙️ Use Case (UC‑PKG‑MIX‑01)

**Actor:** Client

### Preconditions

- Packages and offers are published
- Conversion rules are defined

### Main Flow

1. Client builds cart manually
2. System detects eligible offers/packages
3. Client applies offer
4. System updates cart and totals
5. Checkout and payment
6. Confirmation shows savings

### Alternate Flows

- **C1:** Offer conditions not met → system explains requirement
- **C2:** Package item unavailable → system blocks conversion
- **C3:** Client cancels offer → cart reverts

### Postconditions

- Booking confirmed
- Offer usage logged

---

## 🔁 Diagram (Equipment + Offers)

```
[Add Items]
   ↓
[Cart]
   ↓
[Offer / Package Suggested]
   ↓ Apply / Skip
[Updated Cart + Savings]
   ↓
[Checkout]
   ↓
[Payment]
   ↓
[Confirmation]
```

---

# 4️⃣ Scenario 4 — Packages & Offers Only

## 🎯 User Story (US‑PKG‑ONLY‑01)

**As a** client
**I want** to select a ready package or offer and book it quickly
**So that** I don’t need technical knowledge about equipment

### Step‑by‑Step Journey

1. Enter **/packages**
2. Browse available packages
3. Open package details
4. Select rental dates
5. System checks availability
6. Add package to cart
7. Checkout → payment → confirmation

---

## ⚙️ Use Case (UC‑PKG‑ONLY‑01)

**Actor:** Client

### Preconditions

- Packages exist and are active
- All package items are linked to inventory

### Main Flow

1. Client browses packages
2. Client selects package
3. Client selects dates
4. System validates availability
5. Checkout and payment
6. Confirmation generated

### Alternate Flows

- **D1:** Item unavailable → system suggests equivalent or date change
- **D2:** Minimum duration not met → system enforces rule
- **D3:** Payment failure → retry option shown

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

## ✅ Final Notes

- All scenarios converge into **one Cart + Checkout + Payment pipeline**
- Differences exist only in how the cart is built
- This file can be used directly for:
  - UX design
  - Backend implementation
  - QA test cases
  - Cursor / AI instructions
