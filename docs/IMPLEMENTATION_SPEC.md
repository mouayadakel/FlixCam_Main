# Cinema Equipment Rental Platform — Implementation Spec (Frontend + Logic)

**Version:** 1.0  
**Purpose:** Canonical spec for frontend routes, sidebars, data models, filters, RBAC, checkout wizard, UI components, and feature toggles. Use with Cursor and implementation checklist.

---

## 0) Product Principles

- Enterprise-grade UI (clean, minimal, technical).
- No booking/checkout without account + approval.
- Availability must be explicit everywhere (badges + date-based).
- Filters are a first-class feature (sticky, multi-select, clear-all).
- Checkout = 5-step wizard with hard validations and re-checks.
- Everything important is togglable via Feature Toggles (admin only).
- RBAC (roles + permissions) must be enforced on routes + actions.

---

## 1) Route Map (Pages)

### Public

- `/` (Home)
- `/categories`
- `/c/:categorySlug` (Category Listing + Filters + Sort + Search)
- `/search?q=`
- `/p/:productSlug` (Equipment Detail)
- `/kits` (Packages / Kits)
- `/how-it-works`
- `/policies`
- `/contact`
- `/auth/login`
- `/auth/register`
- `/auth/verify-email`
- `/auth/forgot-password`

### User (requires login)

- `/app` (Dashboard)
- `/app/browse` (Browse Equipment)
- `/app/kits`
- `/app/cart`
- `/app/checkout` (Wizard)
- `/app/bookings` (My Bookings: Upcoming/Active/Past)
- `/app/bookings/:id` (Booking Detail)
- `/app/invoices`
- `/app/saved`
- `/app/profile` (Personal / Company / Documents)
- `/app/notifications`
- `/app/support` (toggle)

### Admin (requires role)

- `/admin` (Admin Dashboard)
- `/admin/monitor` (Booking Monitor)
- `/admin/bookings` (List)
- `/admin/bookings/calendar`
- `/admin/bookings/conflicts`
- `/admin/inventory/equipment`
- `/admin/inventory/categories`
- `/admin/inventory/brands`
- `/admin/inventory/packages`
- `/admin/holds` (Availability & Holds)
- `/admin/users` (Approvals / Companies / Credit)
- `/admin/finance/invoices`
- `/admin/finance/payments`
- `/admin/finance/deposits`
- `/admin/finance/refunds`
- `/admin/pricing-rules`
- `/admin/discounts` (toggle)
- `/admin/roles-permissions`
- `/admin/feature-toggles`
- `/admin/audit-log`
- `/admin/settings` (Branches, Zones, Taxes, Templates)

---

## 2) Exact Sidebar Items

### User Sidebar

**Main:**

- Dashboard
- Browse Equipment
- Packages / Kits
- Cart

**Rentals:**

- My Bookings (Upcoming / Active / Past)
- Invoices
- Documents (optional)

**Account:**

- Saved Gear
- Profile & Company
- Notifications
- Support/Tickets (toggle)

### Admin Sidebar

**Operations:**

- Admin Dashboard
- Booking Monitor
- Bookings (List / Calendar / Conflicts)

**Inventory:**

- Equipment
- Categories
- Brands
- Packages / Kits
- Availability & Holds

**Customers:**

- Users / Customers (Approvals / Credit Terms)

**Finance:**

- Invoices
- Payments
- Deposits
- Refunds / Adjustments

**System:**

- Pricing Rules
- Discounts & Promo Codes (toggle)
- Roles & Permissions
- Feature Toggles
- Audit Log
- Settings (Branches/Locations, Delivery Zones/Fees, Tax/VAT, Notification Templates)

---

## 3) Data Models (Mock First)

### User

- id, name, email, phone
- role: `super_admin` | `admin_ops` | `admin_finance` | `tech_staff` | `customer`
- status: `approved` | `pending` | `suspended`
- company: { name, vatNumber?, address? }
- documents: { idFront?, idBack?, crDoc?, status: `missing` | `submitted` | `verified` }

### Equipment

- id, slug, name, brand, category
- tags: string[]
- pricePerDay
- specs: object (category-specific)
- compatibility: { mounts?, systems?, voltage? }
- availability: computed (based on date range)
- status: `active` | `maintenance` | `damaged` | `retired`
- inventoryMode: `quantity` | `serialized`
- quantityAvailable (if quantity)
- serials[] (if serialized)

### Cart

- items: [{ equipmentId, qty, startAt, endAt }]
- fulfillment: `pickup` | `delivery`
- branchId
- deliveryZoneId?

### Booking

- id
- customerId
- items (expanded)
- startAt, endAt
- fulfillment, branchId, deliveryZoneId
- addOns: insurancePlan?, technician?, deliveryFee?, extras[]
- pricing: breakdown
- status:
  - `draft`
  - `pending_profile`
  - `pending_approval`
  - `hold`
  - `pending_payment`
  - `confirmed`
  - `picked_up`
  - `active`
  - `return_pending_check`
  - `closed`
  - `cancelled`

### PricingRule

- id, type: `weekend` | `long_term` | `client_tier` | `manual_override`
- condition object
- effect object

---

## 4) Exact Filters per Category Type

### Global (all categories)

- Search
- Sort: Recommended | Price | New | Most rented | Availability soonest
- Date Range (Pickup → Return) (required for accurate availability)
- Fulfillment: Pickup | Delivery
- Price/day slider
- Visibility status: Available | Limited | Coming soon (admin-driven)

### Cameras

- Brand
- Camera Type: Cinema | Mirrorless | Broadcast
- Sensor Size: FF | S35 | MFT
- Resolution: 4K | 6K | 8K
- Mount: PL | EF | RF | E | LPL
- Codec/RAW: ProRes | BRAW | R3D | ARRIRAW
- Frame Rate buckets: ≥60 | ≥120 | ≥240
- Media Type: CFexpress | CFast | REDMAG | SD
- Outputs: SDI | HDMI
- Timecode: Yes/No
- Power: V-mount | Gold | Internal
- Weight class: Light | Medium | Heavy

### Lenses

- Brand, Mount
- Type: Prime | Zoom | Anamorphic
- Coverage: FF | S35
- Focal: prime list or zoom range buckets
- T-stop: T1.5 | T2.0 | T2.8 | T4+
- Anamorphic squeeze: 1.3x | 1.5x | 2x (if anamorphic)
- Front diameter: 95 | 114 | 134
- Close focus buckets

### Lighting

- Type: LED | HMI | Tungsten | Tube | Panel
- Output class buckets / wattage buckets
- Color: Bi-color | RGB | Daylight
- CRI/TLCI: ≥95 | ≥97
- Power: AC | Battery | Both
- Control: DMX | CRMX | App
- IP rating (if applicable)

### Grip & Support

- Type: Tripod | Head | Stand | C-stand | Rig | Slider
- Payload capacity buckets
- Height range buckets
- Head type: Fluid | Geared | Remote
- Bowl: 75 | 100 | 150
- Compatibility tags (internal)

### Motion Control

- Type: Robot arm | Track | Turntable | Head | Controller
- System: MRMC | Bolt | Milo | Cinebot
- Track length support buckets
- Payload buckets
- Repeatability class, Speed class
- Power: AC | DC | Both
- Control protocol tags
- Use case tags: Orbit | Product | Hyperlapse | Repeatable

### Audio

- Type: Shotgun | Lav | Recorder | Wireless | Mixer
- Channels: 1/2/4/8
- Timecode: Yes/No
- Power type
- Connector: XLR | 3.5mm

### Monitors / Video Village

- Size
- Inputs: SDI | HDMI
- Brightness buckets (nits)
- LUT support Yes/No
- Wireless compatibility tags
- Power options

### Accessories

- Type: Battery | Media | Cable | Rig part | Filter
- Compatibility tags (camera system/mount/voltage)
- Capacity: Wh / GB
- Connector types

---

## 5) RBAC — Exact Roles & Permissions Matrix

**Roles:**

- `super_admin` (GM)
- `admin_ops`
- `admin_finance`
- `tech_staff`
- `customer` (approved)
- `customer` (pending) = status gate (not true role)

**Matrix:**

- **super_admin:** full access, can edit feature toggles + roles
- **admin_ops:** bookings + inventory + approvals (no finance authority)
- **admin_finance:** invoices/payments/deposits/refunds + pricing rules (no inventory CRUD)
- **tech_staff:** maintenance + item status + prep/return checks (no pricing/finance)
- **customer approved:** browse + cart + checkout + manage own bookings/docs
- **customer pending:** browse + cart + upload docs, cannot hold/checkout

**Hard rules:**

- Pending customer cannot create HOLD or submit booking.
- All admin actions write Audit Log entries.

---

## 6) Checkout Wizard (Enterprise) — Steps & Validations

### Step 0 Gate

- Must be logged in
- Must be approved
- Must have required profile fields
- Must have required docs (toggle)

If fail → redirect to `/app/profile` with "Complete profile" banner.

### Step 1: Dates + Fulfillment

**Validations:**

- startAt < endAt
- minimum duration ≥ 1 day
- branch open hours windows
- delivery: enforce zone + lead time

**Edge cases:**

- closed day → push to next business day
- holiday calendar blocks slots

### Step 2: Availability Lock (HOLD)

**Validations:**

- quantity/serial availability across date range
- status not maintenance/damaged/retired
- conflict check against confirmed bookings + other holds

**Hold rules:**

- hold expires in 15 minutes
- rate limit holds per user/session
- change dates/items → re-hold required

**Edge cases:**

- last unit race condition → recheck on every step + final confirm
- inventory modified by admin mid-checkout → force recheck + show banner

### Step 3: Add-ons

**Validations:**

- insurance required for specific categories (rule-driven)
- technician availability by schedule (if selected)
- delivery fee computed by zone + weight class

**Edge cases:**

- tech unavailable → block or allow "request" mode (toggle)

### Step 4: Deposit + Payment

**Validations:**

- deposit required unless credit terms
- payment method allowed by customer tier
- credit limit check for credit clients

**Edge cases:**

- bank transfer → booking becomes `pending_payment_confirmation` with timeout
- preauth fail → cannot proceed

### Step 5: Confirm

**Validations:**

- re-run availability check (anti race condition)
- recalc pricing (avoid stale totals)
- accept terms checkbox

**Outputs:**

- booking id
- invoice pdf
- notifications (email/whatsapp toggles)

**Edge cases:**

- pricing rule changed mid-checkout → recalc + show "updated" diff
- promo expired → remove + recalc
- discount stacking precedence must be deterministic

---

## 7) UI Components (Required)

- AppShell (Header / Footer / Sidebar)
- AdminShell (AdminSidebar + header)
- FilterPanel (sticky)
- ProductCard
- AvailabilityBadge
- DateRangePicker
- Tabs
- Stepper
- CartDrawer / CartPage
- OrderSummary (sticky on desktop)
- Modal
- Toast
- EmptyState
- PermissionGuard (route-level + action-level)

---

## 8) Feature Toggles (Admin Only)

- `enable_discounts`
- `enable_reviews`
- `enable_insurance_plans`
- `enable_deposits`
- `enable_dynamic_pricing`
- `enable_build_kit`
- `enable_support_tickets`
- `enable_whatsapp_notifications`
- `enable_bank_transfer_payments`
- `enable_credit_terms`
- `enable_public_api` (future)

All toggles must be switchable and reflected in UI instantly.

---

**End of Implementation Spec.**  
See `docs/IMPLEMENTATION_CHECKLIST.md` for mapping to current codebase and tasks.
