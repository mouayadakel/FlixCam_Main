# 🎥 Studio Booking – User Stories, Use Cases, State Machine & Test Cases

> **Scope:** Studio booking only (public website + optional add-ons/equipment)
>
> **Goal:** Cover *all realistic scenarios* a client might face from first visit → post-payment
>
> **Includes:**
> - User Stories (detailed)
> - Use Cases (main + alternate/error flows)
> - State Machine (booking lifecycle)
> - Test Cases (happy paths + edge cases)

---

## 0) Definitions & Concepts

### Booking Types (Duration Models)
- **Hourly**: e.g., 2h, 3h, 4h
- **Half-day**: e.g., 4h or 5h (config)
- **Full-day**: e.g., 8h or 10h (config)

### Buffers
- **Auto Buffer** between bookings (e.g., 30 min cleaning/setup) — configurable

### Add-ons vs Packages vs Presets
- **Add-ons:** single optional extras (technician, extra lights, deep cleaning, props)
- **Studio Package / Preset:** curated bundle of add-ons and/or fixed setup (Podcast, Product, Interview)
- **Cross-sell Equipment:** equipment added from catalog to complement the studio session

### Key Pages (Public)
- **/studios** (studio landing/list)
- **/studio/{slug}** (studio details)
- **/studio/{slug}/book** (booking)
- **/cart** (shared cart)
- **/checkout** (payment)
- **/booking/confirmation/{id}**

---

# 1) Scenario A — Studio Only (Hourly / Half-Day / Full-Day)

## 🧑‍💻 User Story (US-ST-A01)
**As a** client
**I want** to book a studio for a chosen date/time and duration (hourly/half-day/full-day)
**So that** I can reserve the space without contacting support

### Step-by-Step Journey (Entry → Post-Payment)
1. Client enters **Home** and clicks **Studios** (or direct `/studios`)
2. Client opens a studio **/studio/{slug}**
3. Client clicks **Check availability / Book now** → `/studio/{slug}/book`
4. Client selects:
   - date
   - start time
   - duration (hourly / half-day / full-day)
5. System shows **real-time price breakdown**
6. System validates:
   - slot availability
   - buffer rules
   - opening hours
7. Client adds booking to cart
8. Client proceeds to checkout
9. Client pays
10. System confirms booking and sends confirmation message + summary

---

## ⚙️ Use Case (UC-ST-A01)
**Actor:** Client

### Preconditions
- Studio is published and active
- Business hours configured
- Buffer rules configured
- Payment gateway active

### Main Success Flow
1. Client selects date/time + duration
2. System checks conflicts (including buffer)
3. System computes price (hourly/half/full)
4. Client confirms and pays
5. Booking becomes **Confirmed**

### Alternate / Error Flows
- **A1:** Selected time overlaps with existing booking → show conflict + suggest nearest available times
- **A2:** Selected start time violates buffer window → system blocks and suggests valid times
- **A3:** Selected time outside opening hours → system blocks and shows available hours
- **A4:** Client changes duration after selecting time → system re-validates availability + recomputes price
- **A5:** Payment fails → keep booking as *Payment Failed* with retry link

### Postconditions
- Booking status = Confirmed
- Calendar slot locked
- Confirmation sent (WhatsApp/SMS/Email based on toggles)

---

## 🔁 Diagram (Studio Only)
```
[Studios List]
   ↓
[Studio Details]
   ↓
[Book]
   ↓ Select Date/Time/Duration
[Validation: conflicts + buffer + hours]
   ↓ OK / Not OK
[Add to Cart]   [Suggest alternative slots]
   ↓
[Checkout]
   ↓
[Payment]
   ↓
[Confirmation + Message]
```

---

# 2) Scenario B — Studio + Studio Package (Podcast / Product / Flash Setup …)

## 🧑‍💻 User Story (US-ST-B01)
**As a** client
**I want** to book the studio using a ready package (e.g., Podcast / Product / Flash)
**So that** the session is prepared and priced clearly with one click

### Step-by-Step Journey
1. Client opens `/studio/{slug}/book`
2. Client selects a **package card**:
   - Podcast Session
   - Product Shoot Setup
   - Flash Portrait Setup
3. Package auto-fills:
   - default duration
   - included add-ons (lights, mics, backdrops)
4. Client selects date/time
5. System validates slot + buffer
6. Client can edit add-ons (optional)
7. Checkout → pay → confirmation

---

## ⚙️ Use Case (UC-ST-B01)
**Actor:** Client

### Preconditions
- Packages are configured and enabled
- Package includes defined add-ons and pricing rules

### Main Success Flow
1. Client chooses package
2. System sets defaults (duration + included add-ons)
3. Client selects time slot
4. System validates and computes total
5. Payment and confirmation

### Alternate / Error Flows
- **B1:** Package requires minimum duration → system enforces
- **B2:** Add-on not available (e.g., technician busy) → show “unavailable” and offer alternatives
- **B3:** Client removes included add-on → allow or disallow based on package rules

### Postconditions
- Booking confirmed
- Package + add-ons recorded

---

## 🔁 Diagram (Studio + Package)
```
[Book Studio]
   ↓
[Choose Package]
   ↓
[Auto-fill Duration + Add-ons]
   ↓
[Select Date/Time]
   ↓
[Validate + Price]
   ↓
[Checkout → Payment]
   ↓
[Confirmed + Package Summary]
```

---

# 3) Scenario C — Studio + Equipment added from Equipment Catalog

## 🧑‍💻 User Story (US-ST-C01)
**As a** client
**I want** to add equipment from the catalog to my studio booking
**So that** I can shoot with the gear I need in the same reservation

### Step-by-Step Journey
1. Client books studio (Scenario A or B)
2. System offers **Add equipment** link
3. Client opens equipment selection (modal or `/equipment?mode=studio&dates=...`)
4. Client filters by date (same as studio slot)
5. Client adds available equipment
6. Cart shows studio + equipment together
7. Checkout → payment → confirmation includes both

---

## ⚙️ Use Case (UC-ST-C01)
**Actor:** Client

### Preconditions
- Equipment rental is enabled
- Equipment availability check supports same date/time window

### Main Success Flow
1. Client selects studio slot
2. Client adds equipment
3. System validates equipment availability for that time window
4. Combined checkout
5. Payment
6. Confirmed

### Alternate / Error Flows
- **C1:** Equipment unavailable for chosen slot → show alternatives
- **C2:** Client changes studio time after adding equipment → system re-checks equipment availability
- **C3:** Partial availability → allow removing unavailable items or changing time

### Postconditions
- Studio slot locked
- Equipment locked

---

## 🔁 Diagram (Studio + Equipment)
```
[Select Studio Slot]
   ↓
[Add Equipment]
   ↓
[Validate Equipment Availability]
   ↓ OK / Not OK
[Cart: Studio + Gear]  [Suggest alternative gear]
   ↓
[Checkout → Payment]
   ↓
[Confirmation: Studio + Gear]
```

---

# 4) Scenario D — Studio with Add-ons (No package)

## 🧑‍💻 User Story (US-ST-D01)
**As a** client
**I want** to book a studio and optionally add add-ons (technician, extra lighting, deep cleaning)
**So that** I can tailor the session to my needs

## ⚙️ Use Case (UC-ST-D01)
- Same as Scenario A but with add-on selection before cart

### Alternate / Error Flows
- **D1:** Add-on requires staff availability → if staff not available, block selection and show next available

---

# 5) Studio Booking State Machine (Lifecycle)

## 🧠 State Machine (High-Level)
**Core states:**
- **Draft**: booking being built (dates/time not finalized)
- **Validated**: slot valid and price computed
- **Payment Pending**: user sent to payment gateway
- **Confirmed**: payment success, booking locked
- **Active**: session started (optional, operational)
- **Completed**: session ended
- **Cancelled**: cancelled by user/admin according to policy
- **Payment Failed**: payment attempt failed
- **Expired**: payment not completed within TTL

### Transitions
- Draft → Validated (when slot passes validation)
- Validated → Payment Pending (when user clicks Pay)
- Payment Pending → Confirmed (payment success callback)
- Payment Pending → Payment Failed (payment failure callback)
- Payment Pending → Expired (TTL)
- Confirmed → Cancelled (policy allows)
- Confirmed → Active (start time)
- Active → Completed (end time)

## 🔁 Diagram (State Machine)
```
           ┌────────────┐
           │   Draft    │
           └─────┬──────┘
                 │ validate slot + price
                 ▼
           ┌────────────┐
           │ Validated  │
           └─────┬──────┘
                 │ pay
                 ▼
        ┌─────────────────┐
        │ Payment Pending │
        └───┬─────────┬───┘
            │success   │fail
            ▼          ▼
      ┌──────────┐  ┌──────────────┐
      │ Confirmed │  │ Payment Failed│
      └────┬─────┘  └──────┬───────┘
           │ start time     │ retry
           ▼                ▼
      ┌──────────┐     ┌────────────┐
      │  Active  │     │ Validated  │
      └────┬─────┘     └────────────┘
           │ end time
           ▼
      ┌──────────┐
      │ Completed │
      └──────────┘

  Payment Pending → Expired (TTL)
  Confirmed → Cancelled (policy)
```

---

# 6) Test Cases (Comprehensive)

> Format: **TC-ID | Scenario | Steps | Expected Result**

## A) Studio Only
- **TC-ST-A-01 | Hourly booking success**
  - Steps: select date/time, duration=2h, pay
  - Expected: booking Confirmed + message sent + slot locked

- **TC-ST-A-02 | Half-day booking success**
  - Steps: duration=Half-day, pay
  - Expected: correct pricing rule applied + confirmation

- **TC-ST-A-03 | Full-day booking success**
  - Steps: duration=Full-day, pay
  - Expected: full-day pricing + confirmation

- **TC-ST-A-04 | Overlap conflict**
  - Steps: choose time overlapping existing booking
  - Expected: block selection + show nearest available slots

- **TC-ST-A-05 | Buffer violation**
  - Steps: choose start time within buffer gap
  - Expected: block + suggest valid start times

- **TC-ST-A-06 | Outside business hours**
  - Steps: select time outside opening hours
  - Expected: block + show allowed hours

- **TC-ST-A-07 | Payment failure**
  - Steps: proceed to pay, fail payment
  - Expected: status=Payment Failed + retry available

- **TC-ST-A-08 | Payment timeout/expired**
  - Steps: start payment, do not complete within TTL
  - Expected: status=Expired + slot released

---

## B) Studio + Package
- **TC-ST-B-01 | Podcast package success**
  - Steps: select Podcast package, choose slot, pay
  - Expected: default duration + included add-ons + confirmed

- **TC-ST-B-02 | Package minimum duration enforced**
  - Steps: select package, attempt shorter duration
  - Expected: block + explain min duration

- **TC-ST-B-03 | Included add-on locked**
  - Steps: try removing required included add-on
  - Expected: disallow + explain rule

- **TC-ST-B-04 | Technician unavailable**
  - Steps: package includes technician, but technician unavailable
  - Expected: show unavailable + offer next available/alternative

---

## C) Studio + Equipment
- **TC-ST-C-01 | Add equipment success**
  - Steps: book studio slot, add camera available, pay
  - Expected: both studio + equipment confirmed

- **TC-ST-C-02 | Equipment unavailable**
  - Steps: add equipment not available for the slot
  - Expected: block add + suggest alternative equipment

- **TC-ST-C-03 | Change studio time after adding gear**
  - Steps: add gear, change studio slot
  - Expected: re-check gear availability; if fail, prompt to adjust/remove

- **TC-ST-C-04 | Partial availability**
  - Steps: add multiple items, one becomes unavailable
  - Expected: checkout blocks with clear actions: remove item / change time

---

## D) Studio + Add-ons (no package)
- **TC-ST-D-01 | Add-on pricing applied**
  - Steps: choose add-ons (extra lights, deep cleaning)
  - Expected: totals updated instantly

- **TC-ST-D-02 | Staff-dependent add-on unavailable**
  - Steps: select technician add-on with no staff availability
  - Expected: selection disabled + next available suggestion

---

## E) General / Edge
- **TC-ST-E-01 | Guest checkout**
  - Steps: complete booking without account
  - Expected: allowed + confirmation via phone/email

- **TC-ST-E-02 | Cart persistence**
  - Steps: add studio booking, refresh browser
  - Expected: cart preserved

- **TC-ST-E-03 | Double-click pay**
  - Steps: click Pay twice quickly
  - Expected: only one Payment Pending session created

- **TC-ST-E-04 | Price integrity**
  - Steps: change duration/time repeatedly
  - Expected: no stale totals; always recomputed and validated

- **TC-ST-E-05 | Post-payment receipt**
  - Steps: successful payment
  - Expected: receipt/summary accessible + message sent

---

## 7) Implementation Notes (Optional)
- Always validate slot + buffer **server-side** before creating Payment Pending
- Maintain a payment session TTL to prevent dead locks
- For add-ons requiring staff, model availability similarly to studio slots
- For studio+equipment, align equipment availability to the exact studio window

---

✅ End of document

