# 🧭 Frontend UX Map – Public Website (Equipment + Studio)

> **Purpose:** This document defines the full frontend UX map page-by-page
>
> **Scope:** Public website + minimal client portal
>
> **Based on:** MASTER Booking System Specification

---

## Global UX Rules (Applies to All Pages)

- One **primary CTA** per page
- One **secondary CTA** (WhatsApp / Support)
- Price is always visible **before payment**
- Every page supports states: Loading / Empty / Error
- Any action that may raise a question must include microcopy or tooltip
- WhatsApp messages are **context-aware** (page, item, dates, booking ID)

---

## 0) Home `/`

### Goal

Immediate understanding + routing user to the correct journey

### Components

- Hero section
- Quick paths:
  - Browse Equipment
  - Book Studio
  - Packages
  - Build Your Kit
- Most Rented Equipment
- Studio Teaser
- How It Works (3 steps)
- Mini FAQ
- Footer

### States

- Normal
- No inventory (empty state + support CTA)

---

## 1) Equipment Catalog `/equipment`

### Goal

Explore, filter, and navigate to equipment details

### Components

- Filters:
  - Date range (optional)
  - Toggle: Available only
  - Type / Brand / Mount / Price / Condition
- Sorting
- Equipment grid

### Equipment Card

- Image
- Name
- Price per day
- Availability label
- CTA: View

### States

- Loading
- Empty results (suggest filter change + WhatsApp)
- API error

---

## 2) Equipment Category `/equipment/{category}`

### Goal

SEO-focused browsing by category

### Components

- Category title + short description
- Category-specific filters
- Equipment grid

---

## 3) Equipment Details `/equipment/{slug}`

### Goal

Decision-making + add to cart

### Components

- Image gallery
- Price block + date picker + availability
- Primary CTA:
  - Select dates (no date selected)
  - Add to booking (date selected)
- Tabs:
  - Specifications
  - Included items
  - Policies
- Recommended items
- Bundles (if available)
- FAQ (5–8 items)

### States

- Out of stock
- Partial availability
- Price change warning

---

## 4) Packages `/packages`

### Goal

Provide ready-made solutions

### Components

- Package cards:
  - Name
  - Included items summary
  - Starting price
  - CTA: View / Book
- Optional filters

### States

- No packages available

---

## 5) Package Details `/packages/{slug}`

### Goal

Book a package with availability validation

### Components

- Package overview
- Included items list
- Date picker
- Availability status per item
- CTA: Add package to booking
- Optional add-ons

### States

- Some items unavailable (replace / change dates)

---

## 6) Build Your Kit `/build-your-kit`

### Goal

Guide user to build a custom kit

### Steps

1. Select use case
2. Choose camera
3. Choose lens (compatibility enforced)
4. Choose lighting
5. Choose audio
6. Review kit

### Components

- Step progress indicator
- Recommended + alternative options per step
- Live price updates
- CTA: Add kit to booking

### States

- Compatibility conflict
- No availability for selected dates

---

## 7) Cart `/cart`

### Goal

Review and finalize booking before checkout

### Components

- Items list (equipment / packages / kits)
- Editable dates (with revalidation)
- Quantity controls
- Remove item
- Discount breakdown
- CTA: Proceed to checkout

### States

- Partial availability detected
- Price recalculation notice

---

## 8) Checkout `/checkout`

### Goal

Collect customer details and lock price

### Components

- Customer info (name, phone, email)
- Delivery / pickup options (if enabled)
- Terms & conditions checkbox
- Price lock notice (timer)
- CTA: Pay now

### States

- Price change before lock
- Missing required info
- Identity verification required

---

## 9) Payment Redirect `/payment/*`

### Goal

Prevent duplicate payments

### Components

- Redirect notice
- Order reference
- Disabled navigation

---

## 10) Payment Processing `/payment/processing`

### Goal

Handle delayed payment callbacks

### Components

- Processing message
- Polling status indicator
- Support CTA with order reference

### States

- Timeout
- Callback pending

---

## 11) Booking Confirmation `/booking/confirmation/{id}`

### Goal

Reassure user and provide next steps

### Components

- Status: Confirmed
- Booking summary
- Download PDF
- Add to calendar (optional)
- WhatsApp contact
- Pickup / return instructions

### States

- Payment failed (retry)
- Verification hold

---

## 12) Support / Contact `/support`

### Goal

Reduce friction and support load

### Components

- WhatsApp primary CTA
- Contact form
- FAQ index
- Track booking by ID + phone

---

## 13) Client Portal – Login `/login`

### Goal

Fast access to bookings

### Components

- OTP login (phone/email)

---

## 14) Client Portal – My Bookings `/me/bookings`

### Goal

Booking overview

### Components

- List of bookings
- Status indicators

---

## 15) Client Portal – Booking Details `/me/bookings/{id}`

### Goal

Self-service actions

### Components

- Booking summary
- Documents
- Actions:
  - Request change
  - Request extension
  - Cancel (policy-based)

---

## UX State Library (Reusable)

- Loading skeleton
- Empty state with CTA
- Error state with retry
- Out-of-stock with alternatives
- Partial availability resolution
- Price change notice
- Price lock timer
- Payment processing state
- Verification hold state

---

## ✅ End of Frontend UX Map
