# Cursor Build Spec – Public Website (NO Admin Panel)

**Goal:** Build the complete public website + client portal for an equipment & studio rental business.

**Reference:** Aligned with `PUBLIC_WEBSITE_COMPLETE_SPECIFICATION.md` (product decisions, deferred registration, Equipment as catalog source, Arabic + English + Chinese).

---

## Rules

- ✅ Admin panel already exists. Do **NOT** rebuild admin.
- ✅ Public website must read/write through **existing backend APIs** connected to the admin panel.
- ✅ Site must cover the full user journey: discovery → booking → checkout → payment → post-payment → support.
- ❌ Do **NOT** scrape/copy UI, text, images, or data from reference websites.
- ✅ Use reference sites for **UX inspiration only** (flow, hierarchy, states).

---

## 1) Product Scope

### What to build (Frontend)

- Public marketing pages + listing pages
- Equipment catalog + product pages (source: **Inventory → Equipment**, isActive/featured)
- Studio listing + studio booking pages
- Packages page + package details
- Build Your Kit wizard
- Cart + checkout
- Payment result handling (success / fail / processing)
- **Account creation at checkout** (deferred registration: phone + OTP → create account + booking in one step)
- Client portal (bookings, invoices/docs, change/extend requests)
- Support contact + booking tracking

### What NOT to build

- Admin panel UI
- Admin permissions system
- Inventory management UI

---

## 2) UX Inspiration References (NO COPYING)

Use as inspiration for patterns only:

- **Airbnb:** pricing breakdown, post-payment reassurance
- **Peerspace:** studio time-slot booking patterns
- **ShareGrid:** equipment grid + date filtering patterns
- **Lensrentals:** product info clarity
- **BorrowLenses:** accessory suggestions
- **CVP:** kit logic & grouping
- **Finalrent / Filmrent / QSM Rent:** local expectations + tone

**Strict rule:** Do not copy layouts, wording, images, or brand elements.

---

## 3) Tech & Architecture

### Frontend stack

- Next.js (App Router)
- TypeScript
- TailwindCSS
- React Hook Form + Zod
- TanStack Query (data fetching + caching)
- **i18n: Arabic (RTL) + English + Chinese (LTR).** Default locale: Arabic. All three languages are required.

### Core requirements

- Mobile-first
- Fast (lazy images, pagination/infinite scroll)
- Accessible (keyboard navigation, aria labels)
- SEO: metadata, structured data, canonical URLs
- **RTL** for Arabic; **LTR** for English and Chinese; switch `dir` and `lang` on `<html>` per locale.

---

## 4) Data Contracts (API Integration)

Implement using **API clients only**. No direct DB access.

If backend endpoints differ from below, add a small **adapter layer** to match frontend types.

### Catalog source

- **Equipment** = source of truth for public catalog (operational logic, serial numbers, availability). **Products** = marketing layer only; do not use as primary catalog source.

### Required entities

- Category
- Equipment
- Studio
- Package
- Bundle
- Recommendation rules (or endpoint returning recommendations)
- Availability (equipment + studio)
- Cart (server-side) or order draft
- Booking / Order
- Payment session
- User / Client account
- Documents (invoice, receipt, contract)

### Required API operations (must exist or be implemented server-side)

**Auth**

- `POST /auth/register` (or equivalent for deferred flow: phone + OTP → create account + attach booking)
- `POST /auth/login` (e.g. phone + OTP; optional email/password)
- `POST /auth/logout`
- `POST /auth/verify-email` (token) – optional, for email verification
- `POST /auth/resend-verification`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

**Catalog**

- `GET /categories` (public or with public variant)
- `GET /equipment?filters…` (public catalog: isActive, optional featured)
- `GET /equipment/{id|slug}`
- `GET /studios`
- `GET /studios/{slug}`
- `GET /packages`
- `GET /packages/{slug}`

**Availability**

- `POST /availability/equipment` (date range + items)
- `POST /availability/studio` (date + time slot + duration)

**Recommendations**

- `GET /recommendations?context=item`

**Bundles / Offers**

- `GET /bundles?context=item`
- `GET /offers?cart=…`

**Cart**

- `POST /cart`
- `GET /cart`
- `PATCH /cart` (add/remove/update)
- `POST /cart/revalidate`

**Checkout & Payment**

- `POST /checkout/lock-price`
- `POST /payment/create-session`
- `GET /payment/status?session_id=…`

**Bookings**

- `GET /me/bookings`
- `GET /me/bookings/{id}`
- `POST /me/bookings/{id}/request-change`
- `POST /me/bookings/{id}/request-extension`
- `POST /me/bookings/{id}/cancel`

**Documents**

- `GET /me/bookings/{id}/documents`

**Support**

- `POST /support/ticket`
- `GET /booking/track?booking_id=&phone=`

---

## 5) Account & Deferred Registration (Critical)

**Decision:** Registration is **mandatory but deferred**. No account required until "Complete booking".

**Flow:**

1. User browses and fills cart **as guest** (no login).
2. User clicks **"Complete booking"** (or equivalent CTA).
3. Frontend asks for **phone number** → sends OTP (SMS/WhatsApp per backend).
4. User enters **OTP** → backend validates and:
   - Creates **account** (if not exists) linked to phone (and optionally email if collected).
   - Creates **booking/draft** and attaches to that account in one step.
5. User proceeds to **payment** → confirmation.

**Do not** require login or registration before the "Complete booking" step. Goal: higher conversion.

Optional: after account exists, support **email verification** and **email/password** login for returning users; primary login remains **phone + OTP**.

---

## 6) Site Map (Public Pages)

**Marketing**

- `/` – Home
- `/how-it-works`
- `/pricing` (optional) or pricing section
- `/policies` (returns, damages, late fees)
- `/contact` or `/support`

**Equipment**

- `/equipment`
- `/equipment/[category]`
- `/equipment/[slug]`

**Studio**

- `/studios`
- `/studio/[slug]`
- `/studio/[slug]/book`

**Packages / Kits**

- `/packages`
- `/packages/[slug]`
- `/build-your-kit`

**Purchase**

- `/cart`
- `/checkout`
- `/payment/redirect`
- `/payment/processing`
- `/booking/confirmation/[id]`

**Account**

- `/register` (optional; primary flow is deferred at checkout)
- `/verify-email`
- `/login`
- `/forgot-password`
- `/reset-password`

**Client Portal**

- `/me/bookings`
- `/me/bookings/[id]`

**Locale prefix (if using URL-based i18n):** e.g. `/ar/`, `/en/`, `/zh/` (or `zh-CN`).

---

## 7) Core UX Behavior

**Equipment catalog**

- Show all equipment by default (no date required).
- Date filter **optional**. If date chosen: show availability labels per item; toggle "Available only" filters results.
- Filters apply together (type, brand, price, mount, condition). Catalog source: **Equipment** (isActive, featured).

**Studio booking**

- Time-slot booking (hourly / half-day / full-day).
- Validate: business hours, buffer time, conflict detection.
- Show pricing in real time.

**Packages**

- Validate availability of all included items.
- If partial unavailable: show clear state + actions (replace item / change dates).

**Build Your Kit**

- Step wizard with compatibility enforcement.
- Price updates live.
- User can skip steps.

---

## 8) Checkout & Payment States (Critical)

**Price lock**

- Lock price at checkout start (TTL e.g. 10–15 minutes).
- If price changed since browsing: show "Price updated" and require user reconfirm.

**Discount priority (no double discount)**

1. Package price  
2. Bundle discount  
3. Offer  
4. Coupon  

**Payment callback delay**

- After redirect, show **Processing payment** screen.
- Poll payment status every X seconds.
- Prevent double-pay clicks and duplicate sessions.

**Post-payment**

- Confirmation page: booking summary, pickup/return rules, download invoice/receipt if available, **WhatsApp support button with booking ID** (context-aware).

---

## 9) Post-Payment Self-Service (Client Portal)

**Booking detail actions**

- Request change (dates/items) → quote difference → pay difference or refund.
- Request extension → availability check → pay difference.
- Cancel (policy-based).

**Booking timeline**

- Status badges: Draft / Payment Pending / Confirmed / Processing / Failed / Expired / Cancelled / Completed.

---

## 10) Support UX

**Context-aware WhatsApp**

- Key pages have WhatsApp CTA that pre-fills message with: page context, selected dates, product/studio name, booking ID (if exists).

**Support page**

- FAQ
- Booking tracking (booking id + phone)
- Ticket form

---

## 11) UI Components Library (Must Have)

- Header with mini-cart
- Language switcher (AR | EN | 中文)
- Filter sidebar (desktop) + drawer (mobile)
- Product cards
- Price breakdown component
- Availability badge component
- Toast notifications
- Skeleton loaders
- Empty-state component
- Error boundary + retry
- Payment processing component

---

## 12) Must-Have Features (Minimum)

1. Real-time availability (equipment by dates, studio by slot)
2. Optional date filtering (browse without dates)
3. Availability labels on cards
4. Smart recommendations (compatible gear)
5. Bundles with clear savings
6. Packages with one-click booking
7. Build Your Kit wizard
8. Cart revalidation before checkout
9. Price lock at checkout (TTL)
10. Payment processing state (callback delay)
11. Prevent double payment sessions
12. Clear price breakdown (items + discounts + fees)
13. **Deferred registration** (phone + OTP at "Complete booking" → account + booking in one step)
14. Client portal (bookings + docs)
15. Change request & extension flows (post-payment)
16. Partial availability resolution (replace/remove/change dates)
17. WhatsApp context support on key pages
18. SEO for categories and products
19. Performance (lazy images, pagination)
20. **RTL (Arabic) + LTR (English, Chinese)** – three locales

---

## 13) Implementation Plan (Phased)

**Phase 1 – Foundation**  
Routing + layout + design system + **i18n (ar, en, zh)** + API client + auth (including deferred registration flow).

**Phase 2 – Catalog**  
Equipment listing + filters + details. Studio listing + details.

**Phase 3 – Booking**  
Studio booking page. Cart + checkout.

**Phase 4 – Payments**  
Payment redirect + processing + confirmation.

**Phase 5 – Upsell**  
Recommendations, bundles, packages, build-your-kit.

**Phase 6 – Client Portal**  
Bookings list + details + change/extension requests.

**Phase 7 – QA**  
State & edge cases. Performance + accessibility.

---

## 14) Acceptance Criteria (Global)

- User can complete a full booking without contacting support.
- No silent price changes at payment.
- No duplicate payments.
- Partial availability handled with clear actions.
- Post-payment confirmation includes next steps + support.
- **Registration is required but only at "Complete booking"** (phone + OTP → account + booking in one step).
- **Catalog and availability are driven by Equipment** (not Products).
- **Site works in Arabic (RTL), English, and Chinese (LTR).**

---

## Final instruction to Cursor

Build the full public website according to this spec.

- Integrate with **existing backend/admin** through APIs only.
- Do **not** rebuild admin.
- Do **not** copy any UI from reference sites.
- Apply **deferred registration** (mandatory account at checkout via phone + OTP).
- Support **Arabic + English + Chinese** with RTL for Arabic.
- Use **Equipment** as the catalog source for the public site.
- Focus on clarity, states, and end-to-end reliability.
