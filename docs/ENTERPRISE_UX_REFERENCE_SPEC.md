# Enterprise Cinema Rental Platform – UX & Reference Spec

**Version:** 1.0  
**Date:** February 2026  
**Purpose:** Build-ready product spec for public site, user portal, and admin ERP. Use with Cursor, partners, and frontend implementation. Aligned with: no booking without account, modular toggles, enterprise ERP backend, high-end cinema positioning.

---

## Table of Contents

1. [Reference Websites & What to Take](#1-reference-websites--what-to-take)
2. [Full UX Flow Diagram](#2-full-ux-flow-diagram)
3. [Page-by-Page Structure](#3-page-by-page-structure)
4. [Exact Sidebar Items](#4-exact-sidebar-items)
5. [Exact Filters Per Category Type](#5-exact-filters-per-category-type)
6. [Exact Permissions Matrix (Roles)](#6-exact-permissions-matrix-roles)
7. [Exact Checkout Validations & Edge Cases](#7-exact-checkout-validations--edge-cases)
8. [Cursor Prompt for Frontend UI](#8-cursor-prompt-for-frontend-ui)
9. [Implementation Alignment vs Current Codebase](#9-implementation-alignment-vs-current-codebase)

---

## 1. Reference Websites & What to Take

### Tier 1 – Primary References

| Site              | Why It Matters                                                                                          | Take From It                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Lensrentals**   | Clean category structure, strong filtering, clear availability, smart comparison, professional checkout | Filter UX structure, product page hierarchy, “Related gear”, technical spec formatting, simple strong UI |
| **ShareGrid**     | Marketplace rental, calendar availability, booking logic, insurance options                             | Availability calendar UX, insurance add-on logic, pricing breakdown, rental duration selector            |
| **CVP**           | Cinema gear categorization, spec formatting, comparison (retailer but B2B-ready)                        | Spec sheet presentation, advanced filtering, clean B2B product UI                                        |
| **BorrowLenses**  | Conversion-focused, clear booking steps, straightforward rental pricing                                 | Step-by-step checkout clarity, date picker + delivery logic, CTA positioning                             |
| **Procam Take 2** | True rental house vibe, enterprise feel, large inventory                                                | Industrial design language, B2B tone, clean gear listing                                                 |

### Tier 2 – Additional Enterprise References

| Site                   | Why It Matters                                                 | Take From It                                                     |
| ---------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- |
| **ARRI Rental**        | Enterprise positioning, high-end clients, package presentation | Premium tone, package-based structure, cinematic visual identity |
| **Panavision**         | Elite cinema branding, corporate simplicity                    | Minimalist luxury UI, trust-driven layout                        |
| **Keslow Camera**      | Modern rental house, clean filtering                           | Gear-first layout, category segmentation                         |
| **Cinelease**          | Rental + services hybrid, enterprise scale                     | Service + equipment combination structure                        |
| **AbelCine**           | Technical specs done right, educational + rental               | Spec formatting hierarchy, technical data presentation           |
| **Movietech**          | European enterprise feel                                       | Industrial layout inspiration                                    |
| **Cam-A-Lot**          | Cinema gear focus, rental house vibe                           | Category clarity, inventory density layout                       |
| **SLR Lounge Rentals** | Modern UX, clean booking flow                                  | Smooth rental step flow                                          |
| **Fat Llama**          | Strong UX, transparent pricing                                 | Booking clarity, rental duration UI                              |
| **Wex Rental**         | Retail + rental hybrid, clear availability                     | Date-based rental UI, structured listing                         |

### Strategic Blend for FlixCam

- **ARRI Rental** → Premium tone
- **Lensrentals** → UX clarity
- **ShareGrid** → Booking logic
- **AbelCine** → Spec structure
- **Panavision** → Authority simplicity

**Avoid:** Marketplace clutter. **Aim for:** Enterprise rental platform + high-end cinema house + modern SaaS backend.

---

## 2. Full UX Flow Diagram

```
[Landing / Home]
   ├─> [Browse Categories]
   │      ├─> [Category Listing + Filters]
   │      │      ├─> [Search Results]
   │      │      │      ├─> [Equipment Detail]
   │      │      │      │      ├─> (Check Availability)
   │      │      │      │      ├─> (Select Dates)
   │      │      │      │      └─> [Add to Cart]
   │      │      │      └─> [Compare Items] (optional)
   │      │      └─> [Package Builder] (optional toggle)
   │      └─> [Collections: Camera Kits / Lens Sets / Motion Control Kits]
   │
   ├─> [How It Works]
   ├─> [Pricing / Policies]
   ├─> [Contact / Support]
   └─> [Login / Register]
              ├─> [Register]
              │     ├─> (Email verification)
              │     ├─> [Complete Profile]
              │     └─> [Account Status: Approved / Review]
              └─> [Login]
                     └─> [User Dashboard]
                           ├─> [My Bookings]
                           │     ├─> [Booking Detail]
                           │     │     ├─> (Pay balance / Upload docs)
                           │     │     ├─> (Extend / Change dates request)
                           │     │     └─> (Cancel request)
                           │     └─> [Return / Close]
                           ├─> [Invoices]
                           ├─> [Saved Gear]
                           ├─> [Profile & Company]
                           └─> [Checkout]
                                 ├─> Step 1: Dates + Delivery/Pickup
                                 ├─> Step 2: Verify Availability Lock
                                 ├─> Step 3: Add-ons (insurance, tech, delivery)
                                 ├─> Step 4: Deposit / Payment method
                                 ├─> Step 5: Confirm + Invoice + Notifications
                                 └─> [Rental Active]
```

---

## 3. Page-by-Page Structure

### A) Public Website (No Login)

| Page                 | Content                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------ | --------------- |
| **Home**             | Hero + search + categories; featured kits / new arrivals; how it works (3–5 steps); trust blocks (clients/brands)                             |
| **Categories index** | Category listing (core)                                                                                                                       |
| **Category listing** | Filters sidebar; sorting; result cards (availability badge); search results                                                                   |
| **Equipment detail** | Gallery; price (per day + multi-day); date picker availability check; specs tabs (Overview / Specs / Included / Add-ons / Docs); related gear |
| **Packages / Kits**  | Prebuilt kits (e.g. Sony FX6 Kit, ARRI Alexa Mini Kit, Cinebot Max Kit)                                                                       |
| **How it works**     | Steps + policies summary                                                                                                                      |
| **Policies**         | Insurance, deposit, ID, late fees, damage                                                                                                     |
| **About**            | Company story                                                                                                                                 |
| **Contact**          | Form / support                                                                                                                                |
| **Auth**             | Login                                                                                                                                         | Register | Verify email | Forgot password |

**Rule:** Add to cart can be allowed; **checkout requires login + approved status.**

### B) Account Area (User Portal)

| Page                  | Content                                                               |
| --------------------- | --------------------------------------------------------------------- | ------- | ---------------- |
| **Dashboard**         | Summary of bookings, quick actions                                    |
| **My Bookings**       | Tabs: Upcoming / Active / Past                                        |
| **Booking Detail**    | Timeline + status; documents; payment status; extend / cancel request |
| **Cart**              | Line items, dates, totals                                             |
| **Checkout (wizard)** | Steps 1–5 (see [§7](#7-exact-checkout-validations--edge-cases))       |
| **Invoices**          | List + download PDF                                                   |
| **Saved Gear**        | Wishlist / favorites                                                  |
| **Profile**           | Personal                                                              | Company | Documents upload |
| **Notifications**     | Center / inbox                                                        |
| **Support / Tickets** | Optional (feature toggle)                                             |

### C) Admin / ERP (Role-Based)

| Area            | Pages                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Core**        | Admin Dashboard (KPIs, alerts); Booking Monitor (real-time)                                                                      |
| **Bookings**    | List; Calendar; Conflicts                                                                                                        |
| **Inventory**   | Equipment list; Item detail (serials, status, maintenance); Categories; Brands; Accessories relationships; Packages/Kits builder |
| **Pricing**     | Daily rates; weekend; long-term; client-tier; pricing rules                                                                      |
| **Customers**   | Users; Approval workflow; Company profiles; Credit terms                                                                         |
| **Finance**     | Invoices; Payments; Deposits; Refunds                                                                                            |
| **Operations**  | Delivery/pickup scheduler; Technicians roster (optional)                                                                         |
| **Maintenance** | Service logs; Damage reports                                                                                                     |
| **System**      | Roles & Permissions; Feature toggles; Audit log; Settings (branches, delivery zones, tax/VAT, notification templates)            |

---

## 4. Exact Sidebar Items

### A) Public (Top Nav / Mobile Menu)

- Home
- Categories
- Packages / Kits
- How it works
- Policies
- Contact
- Login
- Register

**Footer:** Terms, Privacy, Insurance, Deposit policy, Damage policy, Late fees, Delivery zones, FAQ

### B) User Portal (Logged-In Customer)

| #   | Item                         | Notes                                |
| --- | ---------------------------- | ------------------------------------ |
| 1   | Dashboard                    |                                      |
| 2   | Browse Equipment             |                                      |
| 3   | Packages / Kits              |                                      |
| 4   | Cart                         |                                      |
| 5   | My Bookings                  | Sub: Upcoming, Active, Past          |
| 6   | Invoices                     |                                      |
| 7   | Documents (Uploads + status) | Optional, recommended for enterprise |
| 8   | Saved Gear                   |                                      |
| 9   | Profile & Company            |                                      |
| 10  | Notifications                |                                      |
| 11  | Support / Tickets            | Feature toggle                       |

### C) Admin / ERP (Role-Based)

| #   | Section        | Items                                                                                                                                                                         |
| --- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Operations** | Admin Dashboard; Booking Monitor (live); Bookings (List, Calendar, Conflicts); Inventory (Equipment, Categories, Brands, Packages/Kits, Availability & Holds)                 |
| 2   | **Customers**  | Users/Customers; Approvals; Company profiles; Credit terms                                                                                                                    |
| 3   | **Finance**    | Invoices; Payments; Deposits; Refunds/Adjustments                                                                                                                             |
| 4   | **System**     | Pricing Rules; Discounts & Promo Codes (toggle); Roles & Permissions; Feature Toggles; Audit Log; Settings (Branches, Delivery zones & fees, Tax/VAT, Notification templates) |

---

## 5. Exact Filters Per Category Type

### Global Filters (Every Listing)

- **Search** – Name, model, tags
- **Sort** – Recommended | Price | New | Most rented | Availability soonest
- **Availability Date Range** – Pickup → Return (core)
- **Fulfillment** – Pickup / Delivery
- **Price per day** – Min/max slider
- **Condition/status** – Available | Limited | Coming soon (admin-controlled)

**UX:** Sticky filter sidebar; multi-select checkboxes; live result count; “Clear all”; sorting dropdown.

### A) Cameras

- Brand (ARRI, RED, Sony, Canon, Blackmagic…)
- Camera Type (Cinema / Mirrorless / Broadcast)
- Sensor Size (FF / S35 / MFT)
- Resolution (4K / 6K / 8K…)
- Lens Mount (PL / EF / RF / E / LPL)
- Codec/RAW (ProRes / BRAW / R3D / ARRIRAW…)
- Frame Rates (≥60 / ≥120 / ≥240)
- Media Type (CFexpress / CFast / REDMAG / SD…)
- Video Outputs (SDI / HDMI)
- Timecode (Yes/No)
- Power (V-Mount / Gold / Internal)
- Weight class (Light / Medium / Heavy)

### B) Lenses

- Brand; Mount (PL / EF / E / LPL / RF)
- Lens Type (Prime / Zoom / Anamorphic)
- Coverage (FF / S35)
- Focal length range
- T-stop / Max aperture
- Anamorphic squeeze (1.3x / 1.5x / 2x)
- Front diameter; Close focus (bucketed); IS/OSS (Yes/No)

### C) Lighting

- Light Type (LED / HMI / Tungsten / Tube / Panel)
- Output class (Low / Mid / High) or wattage buckets
- Color (Bi-color / RGB / Daylight)
- CRI/TLCI (≥95, ≥97)
- Power (AC / Battery / Both)
- Modifier mount (Bowens…)
- Control (DMX / CRMX / App)
- Weather rating (IP) if applicable

### D) Grip & Support

- Type (Tripod / Heads / Stands / C-stands / Rigs / Sliders)
- **Payload capacity (kg buckets)**
- Height range (buckets)
- Head type (Fluid / Geared / Remote)
- Bowl size (75/100/150)
- Compatibility tags (e.g. “fits Cinebot”, “fits Dana Dolly”)

### E) Motion Control (Key Category)

- Type (Robot arm / Track / Turntable / Head / Controller)
- System (MRMC / Bolt / Milo / Cinebot…)
- Track length support (2m / 4m / 8m…)
- **Payload (kg buckets)**
- Repeatability class; Speed class
- Required power (AC / DC / Both)
- Control protocol (Milo, Flair, custom, API)
- Use case tags (Orbit / Move+Pan / Product / Hyperlapse)

### F) Audio

- Type (Shotgun / Lav / Recorder / Wireless / Mixer)
- Wireless band; Channels (1/2/4/8…)
- Timecode (Yes/No)
- Power (AA / NP-F / USB-C)
- Connector type (XLR / 3.5…)

### G) Monitors / Video Village

- Size (5 / 7 / 17 / 24…)
- Inputs (SDI / HDMI)
- Brightness (nits buckets)
- LUT support (Yes/No)
- Wireless video compatibility (Teradek… tags)
- Power (V-mount / AC / NP-F)

### H) Accessories (Batteries, Media, Cables)

- Type (Battery / Media / Cable / Rig part / Filter)
- **Compatibility** (camera system / mount / voltage)
- Capacity (Wh / GB)
- Connector (D-Tap / USB-C PD…)

---

## 6. Exact Permissions Matrix (Roles)

Roles: **Super Admin (GM)** | **Admin Ops** | **Admin Finance** | **Tech Staff** | **Customer (Approved)** | **Customer (Pending)**

Legend: ✅ allowed | ❌ not allowed | ⚠️ limited

| Area                                     | Super Admin | Admin Ops      | Admin Finance          | Tech Staff     | Customer Approved       | Customer Pending            |
| ---------------------------------------- | ----------- | -------------- | ---------------------- | -------------- | ----------------------- | --------------------------- |
| View admin dashboard                     | ✅          | ✅             | ✅                     | ✅             | ❌                      | ❌                          |
| Booking monitor                          | ✅          | ✅             | ⚠️ read-only           | ⚠️ read-only   | ❌                      | ❌                          |
| Create/edit bookings                     | ✅          | ✅             | ⚠️ no dates/override   | ❌             | ⚠️ self only (checkout) | ❌                          |
| Override conflicts                       | ✅          | ⚠️ request+log | ❌                     | ❌             | ❌                      | ❌                          |
| Inventory CRUD                           | ✅          | ✅             | ❌                     | ❌             | ❌                      | ❌                          |
| Change item status (maintenance/damaged) | ✅          | ✅             | ❌                     | ✅             | ❌                      | ❌                          |
| Packages/Kits CRUD                       | ✅          | ✅             | ❌                     | ⚠️ view        | ❌                      | ❌                          |
| Pricing rules                            | ✅          | ⚠️ view        | ✅                     | ❌             | ❌                      | ❌                          |
| Customer approval                        | ✅          | ✅             | ⚠️ view financial docs | ❌             | ❌                      | ❌                          |
| Set credit terms / limits                | ✅          | ❌             | ✅                     | ❌             | ❌                      | ❌                          |
| Finance invoices CRUD                    | ✅          | ❌             | ✅                     | ❌             | ⚠️ view/download own    | ⚠️ view none until approved |
| Record payments/refunds                  | ✅          | ❌             | ✅                     | ❌             | ❌                      | ❌                          |
| Deposits management                      | ✅          | ❌             | ✅                     | ⚠️ status view | ⚠️ view own             | ❌                          |
| Feature toggles                          | ✅          | ❌             | ❌                     | ❌             | ❌                      | ❌                          |
| Roles/permissions                        | ✅          | ❌             | ❌                     | ❌             | ❌                      | ❌                          |
| Audit log                                | ✅          | ✅             | ✅                     | ⚠️ limited     | ❌                      | ❌                          |

**Hard rules:**

- **Pending customer:** Can browse + build cart + upload docs; **cannot** create hold/checkout.
- Only **Super Admin** can change feature toggles + roles.

---

## 7. Exact Checkout Validations & Edge Cases

### Checkout Steps (Enterprise Wizard)

| Step | Name                | Content                                                                                                                                   |
| ---- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Dates + Fulfillment | Pick-up vs Delivery; pickup location; date/time windows; rental duration auto-calculated                                                  |
| 2    | Availability Lock   | Check each item (qty, serials, maintenance, reservations); create time-limited hold or show conflicts + alternatives                      |
| 3    | Add-ons             | Insurance (tiered), technician, delivery fee, extra batteries/media, “Build kit” suggestions                                              |
| 4    | Deposit + Payment   | Deposit (card pre-auth / cash / company credit); payment (card / transfer / credit balance); taxes/VAT if company                         |
| 5    | Confirm             | Final breakdown (base, discounts, add-ons, delivery, insurance, tax, deposit); terms checkbox; submit → booking + invoice + notifications |

### Pre-Checkout Validations

- Must be **logged in**.
- Must be **Approved** (not pending/suspended).
- **Profile completeness:** phone + company name (configurable).
- **Required documents** uploaded (toggle).
- **Delivery eligibility:** zone supported, min order, lead time.

### Step 1 (Dates + Fulfillment)

- Pickup &lt; Return (date/time).
- Min/max rental duration.
- Branch open hours (pickup/return windows).
- Delivery: enforce lead time (e.g. 24–48h); outside zone → require pickup.  
  **Edge:** Return on closed day → force next business day; Ramadan/holiday calendar → block times.

### Step 2 (Availability Lock / Hold)

- Per line: quantity available ≥ requested; no overlap with confirmed bookings; item not in maintenance/damaged/retired.
- Create **HOLD** with expiry (e.g. 15 min); on expiry release.
- Rate limit holds per user/session.
- If user changes dates/items → revalidate and re-hold.  
  **Edge:** Two users, last unit → first confirmed wins; second gets conflict UI. Inventory changed by admin → revalidate on step transition + final confirm. **Partial availability:** offer alternatives (dates, similar item, reduce qty).

### Step 3 (Add-ons)

- Insurance availability by category (some items mandatory insurance).
- Technician availability vs booking dates.
- Delivery fee by zone + weight + distance.  
  **Edge:** Tech not available → block or request mode. Motion control/cinema cameras → require insurance plan (rule-driven).

### Step 4 (Deposit + Payment)

- Deposit required unless customer has credit terms.
- Card hold/preauth failure → block confirm.
- Bank transfer → status `pending_payment_confirmation` + timeout.
- **Credit limit:** outstanding + new total ≤ limit.  
  **Edge:** Split payments (deposit now, rental later). Refundable vs non-refundable shown clearly. VAT number format (optional).

### Step 5 (Final Confirm)

- Re-run **full availability** check (anti-race).
- **Recalc price** (avoid stale totals).
- User accepts terms checkbox.
- Generate: Booking ID, Invoice PDF, Email/WhatsApp (toggle).  
  **Edge:** Price rule changed → recalc + “price updated” banner. Promo expired → remove and recalc. **Discount stacking:** define precedence (e.g. Client tier → Long-term → Promo, max 1).

### Booking Status Model (Enterprise)

`draft` (cart) → `pending_profile` (not verified) → `pending_approval` (company review) → `hold` (availability locked) → `pending_payment` → `confirmed` → `picked_up` → `active` → `return_pending_check` → `closed` | `cancelled`

**Key rules:** No checkout without approved account. Hold expires (e.g. 15 min) → items released. Overbooking prevention: hard lock on confirm. Maintenance blocks availability. Deposits required unless credit terms. Admin override with audit log.

---

## 8. Cursor Prompt for Frontend UI

Copy-paste for Cursor when building frontend UI:

```
You are a senior frontend engineer + UX designer.

Goal: Build the frontend UI for an enterprise cinema equipment rental platform.
Tech: React + TypeScript + Tailwind. Component-driven. Mock data only for now.
Design: Enterprise, premium cinema rental (minimal, clean, technical). No marketplace clutter.

Hard rules:
- Users must be logged in + approved to complete checkout.
- Show availability clearly on cards and product page.
- Filtering UX must be best-in-class.
- Checkout is a 5-step wizard with progress indicator.
- Responsive (desktop-first, mobile works).
- Admin pages can be stubbed but use real layout and role-based sidebar.

Pages to implement (UI only):

PUBLIC: Home; Categories index; Category listing (filters sidebar + sort + search); Equipment detail (tabs: Overview / Specs / Included / Add-ons / Docs); Packages/Kits listing; How it Works; Policies; Contact; Auth (Login, Register, Verify Email, Forgot Password).

USER: Dashboard; My Bookings (Upcoming/Active/Past); Booking Detail; Cart; Checkout Wizard (Steps 1–5: Dates+Fulfillment, Availability Lock, Add-ons, Deposit+Payment, Confirm); Invoices; Saved Gear; Profile (Personal/Company/Documents Upload).

ADMIN (stubs, real layout): Admin Dashboard; Booking Monitor; Inventory (Equipment, Categories, Brands); Packages Builder; Pricing Rules; Users (Approval workflow); Finance (Invoices/Payments/Deposits); Roles & Permissions; Feature Toggles; Audit Log.

UX: Filter sidebar = multi-select, price slider, brand, mount, availability date, duration; "Clear all"; sticky. Cards = image, title, key specs, availability badge, price/day, add-to-cart. Product = date picker availability; recommended accessories; "build kit" CTA (toggleable). Checkout = sticky order summary (desktop). Components: AppShell, Header, Footer, Sidebar, FilterPanel, ProductCard, Tabs, Stepper, Modal, Toast, EmptyState. Mock data: Equipment, Category, Booking, User, PricingRule.

Deliverables: Clean folder structure; reusable components; navigable routes; no console errors.
```

---

## 9. Implementation Alignment vs Current Codebase

This section maps the spec above to the **current FlixCam** app so you know what exists and what to add.

### Public Site

| Spec Item                               | Current State                                                             | Action                                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Home (hero, featured, how it works)     | ✅ `(public)/page.tsx` – Hero, Featured Equipment, How It Works, FAQ, CTA | Align hero/search with “search + categories”; ensure featured uses filters style                               |
| Categories index / listing              | ✅ `equipment/page.tsx` + `equipment-catalog-client`; categories from API | Add **exact filters per category type** (§5); sticky sidebar; availability date range filter                   |
| Equipment detail (tabs, specs, related) | ✅ `equipment/[slug]/page.tsx`                                            | Add tabs: Overview / Specs / Included / Add-ons / Docs; **date picker availability check**; related gear block |
| Packages/Kits                           | ✅ `packages/page.tsx`, `packages/[slug]/page.tsx`                        | Align with “prebuilt kits” naming; ensure kit detail has same quality as equipment                             |
| How it works, Policies, Contact         | ✅ how-it-works, policies, support                                        | Ensure policies cover insurance, deposit, ID, late fees, damage as in spec                                     |
| Auth (Login, Register, Verify, Forgot)  | ✅ `(auth)/login`, `(auth)/register`; auth modal on public                | Add **Verify email** and **Forgot password** flows if missing                                                  |
| Build-your-kit                          | ✅ `build-your-kit/page.tsx`                                              | Treat as “Package Builder” toggle; match kit builder UX to spec                                                |

### User Portal

| Spec Item                                 | Current State                                                                | Action                                                                                                                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard                                 | ✅ `portal/` (or dashboard)                                                  | Ensure sections: My Bookings, Invoices, Saved Gear, Profile, Notifications                                                                                        |
| My Bookings (Upcoming/Active/Past)        | ✅ Portal bookings                                                           | Add explicit tabs Upcoming / Active / Past if not present                                                                                                         |
| Booking Detail (timeline, extend, cancel) | ✅ Portal booking detail + `booking-actions` (extend, cancel, report damage) | Add “Pay balance”, “Upload docs”; ensure contract PDF link                                                                                                        |
| Cart                                      | ✅ `cart/page.tsx`, cart store                                               | Align with “sticky order summary” on desktop when used in checkout                                                                                                |
| Checkout wizard (5 steps)                 | ⚠️ Current: **3 steps** (Contact, Details, Review)                           | **Expand to 5:** (1) Dates + Fulfillment, (2) Availability Lock + Review, (3) Add-ons, (4) Deposit + Payment, (5) Confirm. Add progress indicator; sticky summary |
| Invoices                                  | ✅ Portal or account area                                                    | Ensure list + PDF download                                                                                                                                        |
| Saved Gear                                | ⚠️ May be missing                                                            | Add if not present (wishlist/favorites)                                                                                                                           |
| Profile (Personal/Company/Documents)      | ✅ Profile; verification docs in API                                         | Add Company block; Documents upload + status in UI                                                                                                                |
| Notifications                             | ✅ `admin/notifications`; user notifications API                             | Ensure portal has Notifications center                                                                                                                            |

### Admin / ERP

| Spec Item                                               | Current State                                          | Action                                                                                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar (exact items)                                   | ✅ `admin-sidebar.tsx` – 8 sections, permission-driven | Map spec §4C into sections; add **Availability & Holds**; **Booking Monitor**; ensure **Approvals**, **Credit terms**, **Feature Toggles**, **Audit Log** exist and match labels |
| Booking Monitor (live)                                  | ⚠️ Live Ops exists                                     | Align with “real-time timeline” and conflict visibility                                                                                                                          |
| Bookings (List, Calendar, Conflicts)                    | ✅ List + Calendar + APIs                              | Add **Conflicts** view or section                                                                                                                                                |
| Inventory (Equipment, Categories, Brands, Kits, Holds)  | ✅ Equipment, Categories, Brands, Kits; warehouse      | Add **Availability & Holds** page (active holds + releases)                                                                                                                      |
| Pricing Rules                                           | ✅ Dynamic pricing page                                | Align with “daily, weekend, long-term, client-tier”                                                                                                                              |
| Users + Approvals + Credit terms                        | ✅ Users, Approvals; credit may be partial             | Add **Credit terms / limits** in customer management                                                                                                                             |
| Finance (Invoices, Payments, Deposits, Refunds)         | ✅ All present                                         | Ensure Refunds execute on approval (already fixed in codebase)                                                                                                                   |
| Roles & Permissions, Feature Toggles, Audit Log         | ✅ Settings: roles, features; audit API                | Add **Audit Log viewer** UI; align roles with §6 matrix                                                                                                                          |
| Settings (Branches, Delivery zones, Tax/VAT, Templates) | ✅ Settings pages                                      | Map to “Branches/Locations”, “Delivery zones & fees”, “Tax/VAT”, “Notification templates”                                                                                        |

### Filters

| Spec Item                                                    | Current State                                                      | Action                                                                                                                                                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global (search, sort, availability date, price, fulfillment) | ✅ Equipment filters (category, brand, etc.); public equipment API | Add **Availability Date Range** (pickup→return); **Fulfillment** (Pickup/Delivery); **Price per day** slider; **Condition/status**; sticky sidebar; “Clear all”; sort options per spec                        |
| Per-category filters (§5 A–H)                                | ⚠️ Generic category/brand; specs in DB                             | Add **category-specific filter sets** (Cameras: mount, sensor, resolution…; Lenses: mount, type, T-stop…; Motion Control: system, payload, track length…; etc.) using existing `specifications` or new fields |

### Checkout Logic

| Spec Item                                              | Current State                               | Action                                                                                                                             |
| ------------------------------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 5-step wizard                                          | ⚠️ 3 steps today                            | Implement Steps 1–5 as in §7; add Availability Lock step; Add-ons step; Deposit + Payment step                                     |
| Hold (15 min), revalidate on step                      | ✅ Soft lock 15 min in booking; release job | Expose “hold” in UI (e.g. “Your selection is held for 15 min”); revalidate on step transition                                      |
| Pre-checkout: approved account, profile complete, docs | ✅ Auth required; profile not enforced      | Add **profile completeness** gate (phone, company name); optional **documents required**; **approval status** check before payment |
| Discount stacking rules                                | ✅ Pricing rules engine                     | Document and enforce precedence (Client tier → Long-term → Promo, max 1)                                                           |

### Permissions Matrix

| Spec Item                                                          | Current State                      | Action                                                                                                                                                                     |
| ------------------------------------------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roles: Super Admin, Admin Ops, Admin Finance, Tech Staff, Customer | ✅ RBAC with roles and permissions | Align role names and **permission mapping** with §6 matrix (e.g. Admin Finance: invoices, payments, deposits, refunds, credit terms; Tech: status change only, no pricing) |
| Pending customer: browse + cart, no hold/checkout                  | ✅ Middleware + API                | Enforce “approved” or “verified” before creating hold/checkout; show message in UI                                                                                         |

---

## Document References

- **Product vision & rules:** `docs/PRD.md`
- **Booking engine:** `docs/BOOKING_ENGINE.md`
- **Roles & security:** `docs/ROLES_AND_SECURITY.md`
- **Rental standards & gaps:** `docs/RENTAL_COMPANY_STANDARDS_DEEP_DIVE.md`
- **Website & control panel deep dive:** `docs/WEBSITE_AND_CONTROL_PANEL_DEEP_DIVE.md`

---

**End of Enterprise UX & Reference Spec.** Use this as the single source for UX flows, sidebars, filters, permissions, and checkout rules when implementing or handing off to Cursor/partners.
