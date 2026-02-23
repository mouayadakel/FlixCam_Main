# FlixCam.rent — Complete Improvement Blueprint

**Audit Date:** February 18, 2026  
**Scope:** Full platform audit — public website, admin panel, customer portal, API, data model  
**Methodology:** Product designer + senior full-stack engineer + UX strategist lens

---

## Executive Summary

FlixCam.rent is a mature cinematic equipment rental platform with solid architecture (services, policies, events, RBAC), a functional public catalog, cart/checkout flow, and a comprehensive admin panel. The platform is production-capable but has significant gaps in public-facing pages (no About, no Contact form, no blog), equipment detail depth (no reviews, no availability calendar), checkout friction (forced login before cart), and admin polish (missing revenue charts, CMS flexibility). This blueprint provides a prioritized roadmap to make the platform elite.

---

# PART 1 — PUBLIC WEBSITE PAGES AUDIT

## Page-by-Page Report

### Homepage `/`

| Aspect | Status | Notes |
|--------|--------|-------|
| **UI/Visual** | ✅ Good | Hero, categories, featured, new arrivals, trust signals, testimonials, FAQ, CTA. Unified design system. Skip-to-content link present. |
| **Responsive** | ✅ Good | Mobile-first layout. PublicContainer handles max-width. |
| **Accessibility** | ⚠️ Partial | Hero image has `alt=""` (empty) — `home-hero.tsx` line 99. Add descriptive alt. |
| **Performance** | ✅ Good | `unstable_cache` for categories, new arrivals, stats. Skeleton fallback on equipment catalog. |
| **Content** | ✅ Good | i18n keys. No lorem ipsum. |
| **SEO** | ✅ Good | Metadata in layout. Arabic-first. |
| **Missing** | Search bar in hero (PublicSearch exists but is basic). No real-time availability on featured cards. No "Build a Kit" CTA in hero. |

---

### Equipment Listing `/equipment`

| Aspect | Status | Notes |
|--------|--------|-------|
| **UI/Visual** | ✅ Good | Grid, filters, skeleton. `EquipmentCatalogClient` + `FilterPanel`. |
| **Responsive** | ✅ Good | Grid collapses. Sidebar hidden on mobile (filters in sheet/drawer). |
| **Accessibility** | ⚠️ Check | Filter panel labels, card links. |
| **Performance** | ✅ Good | Skeleton, `api/public/equipment` cached. Pagination/skip-take. |
| **Content** | ✅ Good | Category, brand, price filters. Sort: recommended, price_asc, price_desc, newest. |
| **SEO** | ⚠️ Partial | Page exists. Add `generateMetadata` with dynamic title/description. |
| **Missing** | No map view. No "Notify when available." No saved searches. No availability date filter in URL. |

**File:** `src/app/(public)/equipment/page.tsx`, `equipment-catalog-client.tsx`

---

### Equipment Detail `/equipment/[slug]`

**Note:** Route uses `[slug]` but actually receives equipment `id` (cuid). URLs are not human-readable (e.g. `/equipment/clxyz123`). Consider adding `slug` field to Equipment model.

| Aspect | Status | Notes |
|--------|--------|-------|
| **UI/Visual** | ✅ Good | Gallery, price block, specs, recommendations. Breadcrumb. Save button. |
| **Responsive** | ✅ Good | Grid layout. Sticky sidebar on desktop. |
| **Accessibility** | ✅ Good | Breadcrumb `aria-label`. |
| **Performance** | ✅ Good | Server-rendered. Recommendations from same category. |
| **Content** | ⚠️ Partial | No reviews. No availability calendar. No "Frequently rented together." No insurance upsell. |
| **SEO** | ⚠️ Partial | No `generateMetadata` with equipment name, description. |
| **Missing** | Video, spec sheet PDF, rent count, Q&A, related bundles, share buttons. |

**File:** `src/app/(public)/equipment/[slug]/page.tsx`, `equipment-detail.tsx`

---

### Cart `/cart`

| Aspect | Status | Notes |
|--------|--------|-------|
| **UI/Visual** | ✅ Good | CartList, CartItemRow, CartSummary, CouponField. |
| **Responsive** | ✅ Good | Grid layout. |
| **Accessibility** | ⚠️ Check | Form labels for coupon. |
| **Performance** | ✅ Good | Cart store with fetch. |
| **Content** | ✅ Good | Edit quantity, remove, coupon. |
| **SEO** | N/A | Cart is low-priority for SEO. |
| **Missing** | No "You might also need" upsell. No save-for-later. No insurance add-on per item. |

**File:** `src/app/(public)/cart/page.tsx`, `cart-list.tsx`

---

### Checkout `/checkout`

| Aspect | Status | Notes |
|--------|--------|-------|
| **UI/Visual** | ✅ Good | 5-step stepper: Dates, Availability, Add-ons, Payment, Confirm. Order summary sticky. |
| **Responsive** | ✅ Good | Grid layout. |
| **Accessibility** | ⚠️ Check | Stepper, form labels. |
| **Performance** | ✅ Good | Profile check, deposit fetch. |
| **Content** | ⚠️ Friction | **Forced login** before full checkout. Guest checkout not available. Profile completeness gate. |
| **SEO** | N/A | |
| **Missing** | Guest checkout. Express checkout (Apple Pay, Google Pay). Abandoned cart recovery. |

**File:** `src/app/(public)/checkout/page.tsx`

---

### Booking Confirmation `/booking/confirmation/[id]`

| Aspect | Status | Notes |
|--------|--------|-------|
| **UI/Visual** | ✅ Good | CheckCircle, summary, calendar, WhatsApp. |
| **Responsive** | ✅ Good | |
| **Accessibility** | ✅ Good | |
| **Content** | ⚠️ Partial | No PDF receipt download. No email confirmation mention. Mixed Arabic/English. |
| **Missing** | Invoice PDF. "Rent Again" for same equipment. |

**File:** `src/app/(public)/booking/confirmation/[id]/page.tsx`

---

### About Page `/about`

| Status | ❌ **MISSING** |
|--------|----------------|
| **Recommendation** | Create `src/app/(public)/about/page.tsx`. Include: company story, team, mission, location, photos. |

---

### Contact Page `/contact`

| Status | ❌ **MISSING** |
|--------|----------------|
| **Recommendation** | Create `src/app/(public)/contact/page.tsx`. Form (name, email, subject, message) + WhatsApp/phone/email. Support page has contact info but no form. |

---

### FAQ `/faq`

| Aspect | Status | Notes |
|--------|--------|-------|
| **UI/Visual** | ✅ Good | Accordion from CMS. `FaqPageClient` fetches `/api/public/faq`. |
| **Content** | ✅ Good | Managed via admin. |
| **SEO** | ⚠️ Add | `generateMetadata` for FAQ page. |

**File:** `src/app/(public)/faq/page.tsx`

---

### Policies `/policies`

| Aspect | Status | Notes |
|--------|--------|-------|
| **UI/Visual** | ✅ Good | `PoliciesPageClient` fetches `/api/public/policies`. |
| **Content** | ✅ Good | Managed via admin. |
| **SEO** | ⚠️ Add | `generateMetadata`. |

**File:** `src/app/(public)/policies/page.tsx`

---

### How It Works `/how-it-works`

| Aspect | Status | Notes |
|--------|--------|-------|
| **UI/Visual** | ✅ Good | 5 steps with icons. Clear copy. |
| **Content** | ✅ Good | Choose, Book, Pay, Receive, Return. |
| **Missing** | Video. Visual timeline. |

**File:** `src/app/(public)/how-it-works/page.tsx`

---

### Support `/support`

| Aspect | Status | Notes |
|--------|--------|-------|
| **UI/Visual** | ✅ Good | Phone/WhatsApp, email. Hardcoded FAQ (duplicate of /faq). |
| **Content** | ⚠️ Partial | No contact form. Link to /faq and /how-it-works. |
| **Missing** | Contact form. Live chat widget. |

**File:** `src/app/(public)/support/page.tsx`

---

### Studios `/studios`, Packages `/packages`, Build Your Kit `/build-your-kit`

| Page | Status | Notes |
|------|--------|-------|
| Studios | ✅ Exists | `studios/page.tsx`, `studios-list-client.tsx` |
| Packages | ✅ Exists | `packages/page.tsx`, `packages/[slug]/page.tsx` |
| Build Your Kit | ✅ Exists | `build-your-kit/page.tsx`, feature-flagged |

---

### 404 Page `/not-found`

| Aspect | Status | Notes |
|--------|--------|-------|
| **UI** | ⚠️ Minimal | Plain "404" + "Page not found". No CTA, no search, no links. |
| **Recommendation** | Add: illustration, "Back to Home", "Browse Equipment", search bar. |

**File:** `src/app/not-found.tsx`

---

### 403 Page `/403`

| Aspect | Status | Notes |
|--------|--------|-------|
| **UI** | ✅ Good | ShieldX icon, Arabic copy, Home + Login buttons. RTL. |

**File:** `src/app/403/page.tsx`

---

### Terms `/terms`, Privacy `/privacy`

| Status | ✅ Exist |
|---------|----------|
| **File** | `src/app/terms/page.tsx`, `src/app/privacy/page.tsx` |
| **Note** | Verify content is from CMS or static. Add `generateMetadata`. |

---

### Sitemap & Robots

| File | Status | Notes |
|------|--------|-------|
| `sitemap.ts` | ✅ | Home, equipment, studios, packages, build-your-kit, how-it-works, support, policies. Missing: faq, categories, cart, checkout. |
| `robots.ts` | ✅ | Disallow admin, api, portal, login, register. Sitemap URL. |

---

### Blog / Resources

| Status | ❌ **MISSING** |
|--------|----------------|
| **Recommendation** | Add `/blog` or `/resources` for SEO and trust. |

---

# PART 2 — HOMEPAGE DEEP AUDIT

## Must-Have Sections

| Section | Present? | Quality | Recommendation |
|---------|----------|---------|----------------|
| Hero with headline + CTA | ✅ | Good | Add date picker to search. Add "Build a Kit" CTA. |
| Search bar (equipment, date, category) | ⚠️ | Partial | PublicSearch exists, submits to `/equipment?q=`. No date/category in hero search. |
| Featured / Popular Equipment | ✅ | Good | 4–12 items, configurable. Shuffled. |
| How It Works (3-step) | ⚠️ | 5 steps | HomeTrustSignals has stats. How It Works is separate page. Add 3-step teaser on homepage. |
| Category Browsing | ✅ | Good | HomeCategoryCards with equipment count. |
| Testimonials / Social Proof | ✅ | Good | HomeTestimonials. |
| Trust Badges | ✅ | Good | HomeTrustSignals (equipment count, rentals, year). |
| Stats | ✅ | Good | equipmentCount, rentalsCount, yearFounded. |
| Featured Brands / Partners | ✅ | Good | HomeTopBrands. |
| Newsletter / Lead Capture | ❌ | Missing | Add email capture section. |
| FAQs teaser | ✅ | Good | HomeFaq. |
| Sticky header with cart + login | ✅ | Good | PublicLayoutClient, MiniCart, nav. |
| Footer with links, legal, social | ✅ | Good | PublicFooter. |

## Recommended Homepage Enhancements

- Real-time availability indicator on featured equipment
- Location-based equipment suggestions (if Branch/location data exists)
- "Trending / Most Rented" section
- Video background or product demo in hero (HeroBanner supports videoUrl)
- Live chat / WhatsApp CTA (exists in layout)
- Recently viewed equipment (localStorage)
- "Build a Kit" wizard CTA
- Urgency: "Book before weekend — X items left"

---

# PART 3 — EQUIPMENT LISTING PAGE AUDIT

## Filters & Search

| Feature | Status | Notes |
|---------|--------|-------|
| Search bar with autocomplete | ⚠️ | Basic query param. No autocomplete. |
| Filters: category, brand, price, availability date, location, condition, rating | ⚠️ | Category, brand, price. No availability date, location, condition, rating. |
| Sort: price, popularity, newest, rating | ✅ | price_asc, price_desc, newest, recommended. No rating. |
| Map view | ❌ | Missing |
| Filter updates without full reload | ✅ | Client-side router push. |
| Active filters as chips | ⚠️ | Check FilterPanel. |
| Clear All Filters | ⚠️ | Check FilterPanel. |

## Equipment Cards

| Feature | Status | Notes |
|---------|--------|-------|
| Image, name, price/day, rating, availability badge | ✅ | Image, name, price. AvailabilityBadge. No rating. |
| Quick-add to cart / wishlist | ✅ | Add to cart on detail. SaveEquipmentButton on detail. |
| Compare | ❌ | Missing |
| Lazy load / infinite scroll / pagination | ✅ | Pagination via skip/take. |
| Responsive grid | ✅ | Yes |

## Missing Features

- Saved searches / filter presets
- "Notify me when available"
- "Frequently rented together"
- Equipment availability calendar preview on hover

---

# PART 4 — EQUIPMENT DETAIL PAGE AUDIT

## Required Data Fields

| Field | Present? | Notes |
|-------|----------|-------|
| Equipment name and slug | ⚠️ | model/sku. No slug — URL uses id. |
| High-quality image gallery (5+ images, zoom) | ⚠️ | EquipmentGallery. Zoom? Check. |
| Short + long description | ❌ | Equipment has no description. Product has translations. |
| Technical specs | ✅ | specifications, customFields. SpecificationsDisplay. |
| Brand and model | ✅ | Yes |
| Rental price day/week/month | ✅ | EquipmentPriceBlock. |
| Security deposit | ⚠️ | Not on Equipment. Product has depositAmount. |
| Availability calendar | ❌ | Missing. API exists: `/api/equipment/[id]/availability` (auth required). Public: `/api/public/equipment/[id]/availability`. |
| Condition | ✅ | Equipment.condition |
| Included accessories | ❌ | boxContents on Product, not Equipment. |
| Compatibility notes | ❌ | Missing |
| Shipping / pickup location | ❌ | Branch exists. Not shown on detail. |
| Reviews and ratings | ❌ | Review model exists. Not on equipment detail. |
| Q&A section | ❌ | Missing |
| Related / similar equipment | ✅ | Same category. |
| "Frequently rented together" | ❌ | Missing |
| Breadcrumb | ✅ | Yes |
| Share buttons | ❌ | Missing |
| Wishlist / Save | ✅ | SaveEquipmentButton |
| Insurance upsell | ❌ | Missing |

## Recommended Additions

- 360° or video (Product has videoUrl; Equipment does not)
- Download spec sheet PDF
- Comparison table with similar equipment
- Real-time availability indicator
- Rental history ("Rented X times")
- Expert tips

---

# PART 5 — CART & CHECKOUT AUDIT

## Cart Page

| Feature | Present? | Notes |
|---------|----------|-------|
| Equipment image, name, dates, quantity, price | ✅ | CartItemRow. |
| Edit dates inline | ⚠️ | updateItem supports quantity. Dates? Check CartItem structure. |
| Remove item | ✅ | Yes |
| Insurance add-on per item | ❌ | Missing |
| Coupon / promo code | ✅ | CouponField. |
| Order summary with tax | ✅ | CartSummary. |
| Estimated total | ✅ | Yes |
| "You might also need" upsell | ❌ | Missing |
| Save cart for later | ❌ | Missing |
| Clear cart | ❌ | Missing |

## Checkout Flow

| Feature | Present? | Notes |
|---------|----------|-------|
| Guest checkout | ❌ | Forced login. |
| Progress indicator | ✅ | Stepper. |
| Contact info step | ✅ | CheckoutStepContact (for non-logged-in). |
| Delivery / pickup selection | ⚠️ | CheckoutStepAddons. |
| Payment step | ✅ | CheckoutStepPayment. Tap integration. |
| Order review | ✅ | CheckoutStepConfirm. |
| Loading state on submit | ✅ | Yes |
| Error handling | ✅ | Yes |
| Booking confirmation email | ⚠️ | NotificationService. Check trigger. |
| WhatsApp confirmation | ⚠️ | IntegrationConfig. Check. |
| Redirect to confirmation | ✅ | `/booking/confirmation/[id]` |

## Missing / Recommended

- Abandoned cart recovery email
- Save payment method for returning users
- Express checkout (Apple Pay, Google Pay)
- Real-time price recalculation on date change

---

# PART 6 — ADMIN CONTROL PANEL AUDIT

## Dashboard / Overview

| Feature | Present? | Notes |
|---------|----------|-------|
| Total revenue (today, week, month, year) | ⚠️ | KPIs: revenue this month. No today/week/year breakdown. |
| Active bookings count | ✅ | bookingCount. |
| Pending approvals | ⚠️ | Separate Approvals page. |
| New customers today | ⚠️ | clientCount this month. |
| Equipment utilization rate | ✅ | utilization %. |
| Revenue chart | ✅ | RevenueChart, last 7 days. |
| Recent bookings table | ⚠️ | Dashboard overview doesn't show. Separate recent-bookings page. |
| Low stock / maintenance alerts | ❌ | Missing on overview. |
| Quick action buttons | ⚠️ | Separate quick-actions page. |
| Notification center | ⚠️ | Notifications page exists. |

**File:** `src/app/admin/(routes)/dashboard/overview/page.tsx`

## Equipment Management

| Feature | Present? | Notes |
|---------|----------|-------|
| Add / Edit / Delete | ✅ | equipment/new, [id], [id]/edit. |
| Bulk import CSV | ✅ | inventory/import. |
| Image upload (multiple) | ✅ | Media. |
| Pricing tiers | ✅ | daily, weekly, monthly. |
| Availability / block dates | ⚠️ | Holds, calendar. Per-booking. |
| Equipment status | ✅ | isActive, condition. |
| Categories and tags | ✅ | categories, brands. |
| Bundle / Kit creation | ✅ | kits. |
| Condition tracking | ✅ | Equipment.condition. |
| Maintenance log | ✅ | Maintenance model. maintenance/[id]. |

## Booking Management

| Feature | Present? | Notes |
|---------|----------|-------|
| View all, filters | ✅ | bookings page. |
| Approve / Reject | ✅ | State machine, transition. |
| Calendar view | ✅ | calendar page. |
| Edit dates / items | ✅ | bookings/[id]. |
| Issue refunds | ✅ | finance/refunds, payments/[id]/refund. |
| Internal notes | ⚠️ | Booking.notes. Admin notes? |
| Print / export | ⚠️ | Quote PDF. Booking PDF? |
| Conflict detection | ✅ | bookings/conflicts. |
| Late return tracking | ✅ | actualReturnDate, lateFeeAmount. |
| Damage report | ✅ | damage-claims. |

## Customer Management

| Feature | Present? | Notes |
|---------|----------|-------|
| Customer list, search, filter | ✅ | clients. |
| Customer profile | ✅ | clients/[id]. |
| KYC / ID verification | ✅ | VerificationDocument, verificationStatus. |
| Blacklist / flag | ❌ | No blacklisted field. |
| Send direct message | ❌ | No in-app messaging. |
| Segmentation | ✅ | CustomerSegment. |
| CLV | ❌ | Missing |
| Export | ⚠️ | Check. |

## Financial Management

| Feature | Present? | Notes |
|---------|----------|-------|
| Revenue reports | ✅ | finance/reports, analytics. |
| Invoice generation | ✅ | invoices, generate. |
| Payment status | ✅ | payments. |
| Refund management | ✅ | finance/refunds. |
| Security deposit tracking | ✅ | finance/deposits. |
| Tax report | ✅ | settings/tax. |
| Export CSV/PDF | ✅ | reports export. |
| Accounting integration | ❌ | No Xero/QuickBooks. |

## Content Management (CMS)

| Feature | Present? | Notes |
|---------|----------|-------|
| Homepage sections | ⚠️ | Hero banners, featured. CMS page exists. |
| Blog editor | ❌ | Missing |
| FAQ management | ✅ | cms/faq, settings/faq. |
| Policy editor | ✅ | cms/policies. |
| SEO metadata per page | ⚠️ | ProductTranslation has seoTitle, seoDescription. |
| Promotional banners | ✅ | HeroBanner. |
| Email template editor | ✅ | notification-templates. |

## Notification & Communication

| Feature | Present? | Notes |
|---------|----------|-------|
| View sent notifications | ✅ | notifications. |
| Configure triggers/templates | ✅ | notification-templates. |
| Broadcast to segment | ✅ | marketing/campaigns. |
| WhatsApp integration | ✅ | IntegrationConfig. |
| Auto-response rules | ⚠️ | Check. |

## Settings

| Feature | Present? | Notes |
|---------|----------|-------|
| Business info | ✅ | site.config, branches. |
| Payment gateway | ✅ | settings/checkout, integrations. |
| Rental policies | ✅ | policies. |
| Tax config | ✅ | settings/tax. |
| Working hours | ✅ | Branch.workingHours. |
| Staff accounts | ✅ | users. |
| Roles and permissions | ✅ | roles. |
| API keys | ⚠️ | Check. |
| Webhooks | ⚠️ | Tap webhook exists. |
| System health / logs | ✅ | audit-log. admin/health. |

---

# PART 7 — CUSTOMER PORTAL AUDIT

## Required Sections

| Section | Present? | Notes |
|---------|----------|-------|
| Dashboard with upcoming bookings | ✅ | portal/dashboard. |
| My Bookings | ✅ | portal/bookings. |
| Booking detail + receipt | ✅ | portal/bookings/[id]. Receipt? |
| Wishlist / Saved equipment | ✅ | portal/saved. |
| Profile management | ✅ | portal/profile. |
| ID / KYC upload | ✅ | portal/documents. |
| Payment methods | ⚠️ | Check. |
| Notification preferences | ⚠️ | Check. |
| Review / rate past rentals | ⚠️ | Review model. Portal UI? |
| Support ticket | ❌ | Link to /support. No ticket system. |
| Referral program | ❌ | Missing |
| Loyalty points | ❌ | Missing |

## Missing Features

- Rebooking: "Rent Again" on past bookings
- Track delivery status
- Digital rental agreement signing (Contract exists, sign flow exists)
- In-app messaging with admin
- Push notifications (PWA)

---

# PART 8 — API & BACKEND AUDIT

## API Completeness

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/health` | GET | Public health check | ✅ Exists |
| `/api/public/equipment` | GET | Search with filters | ✅ Exists |
| `/api/public/equipment/[id]` | GET | Single equipment | ✅ Exists |
| `/api/public/equipment/[id]/availability` | GET | Availability calendar | ✅ Exists |
| `/api/equipment/[id]/availability` | GET | Auth required | ✅ Exists |
| `/api/bookings/conflicts` | POST | Conflict check | ✅ Exists |
| `/api/reviews` | GET/POST | Reviews | ✅ Exists |
| `/api/user/saved-gear` | GET/POST/DELETE | Wishlist | ✅ Exists |
| `/api/notifications` | GET | Notifications | ✅ Exists |
| `/api/dashboard/kpis` | GET | KPIs | ✅ Exists |
| `/api/analytics/utilization` | GET | Utilization | ✅ Exists |
| `/api/coupons/validate` | POST | Validate promo | ✅ Exists |
| `/api/invoices/[id]/pdf` | GET | Invoice PDF | ✅ Exists |
| `/api/clients/[id]` | GET | Customer profile | ✅ Exists |
| `/api/webhooks/tap` | POST | Payment callback | ✅ Exists |
| `/api/cart` | GET/POST | Cart | ✅ Exists |
| `/api/cart/[itemId]` | PATCH/DELETE | Cart item | ✅ Exists |
| `/api/cart/coupon` | POST/DELETE | Coupon | ✅ Exists |

## API Improvements

- **Consistent error format:** `{ error, code, status }` — partial. Some routes return `{ error }` only.
- **Zod validation:** Used in many routes. Ensure all POST/PUT.
- **Rate limiting:** Cart, public equipment have rate limiting. Extend to auth.
- **API versioning:** No `/api/v1/`.
- **Response caching:** Equipment list cached. Good.
- **Cursor pagination:** Most use skip/take. Consider cursor for large lists.
- **OpenAPI/Swagger:** Missing.

---

# PART 9 — DATA MODEL & FIELDS AUDIT

## Equipment Model — Missing Fields

| Field | Purpose |
|-------|---------|
| `slug` | SEO-friendly URLs (`/equipment/sony-fx3`) |
| `shortDescription` | For cards and meta |
| `longDescription` | Rich content |
| `rentCount` | Social proof ("Rented 47 times") |
| `insuranceValue` | Deposit calculation |
| `compatibleWith` | Array of equipment IDs |
| `bundleIds` | Part of which kits |
| `specSheetUrl` | PDF download |
| `metaTitle`, `metaDescription` | Per-equipment SEO |

**Note:** Product model has many of these. Equipment is separate (legacy?). Consider alignment.

## Booking Model — Missing Fields

| Field | Purpose |
|-------|---------|
| `deliveryAddress` | If delivery |
| `deliveryStatus` | pending, dispatched, delivered, returned |
| `damageReport` | Text + images |
| `insuranceSelected` | Boolean + amount |
| `signedAgreementUrl` | Contract URL |
| `adminNotes` | Internal |
| `cancellationReason` | If cancelled |

**Note:** Delivery model exists. DamageClaim exists. Contract exists. Some overlap.

## User Model — Missing Fields

| Field | Purpose |
|-------|---------|
| `idVerified` | KYC status (VerificationStatus exists) |
| `loyaltyPoints` | If loyalty program |
| `referralCode` | Unique code |
| `referredBy` | Referrer |
| `blacklisted` | Boolean + reason |
| `totalSpent` | Denormalized |
| `preferredLanguage` | i18n |

## Review Model — Exists

- equipmentId: ❌ (Review links to bookingId only, not equipment directly)
- rating, title, body: ✅ (rating, comment)
- images: ❌
- adminReply: ✅ (adminResponse)
- verified: ❌
- helpful count: ❌

---

# PART 10 — RECOMMENDED FEATURES ROADMAP

## Tier 1 — High Impact, Build Now

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 1 | Smart Availability Calendar on equipment detail | Medium | High |
| 2 | Review & Rating on equipment detail | Medium | High |
| 3 | Guest checkout | Medium | High |
| 4 | Equipment slug for SEO URLs | Low | High |
| 5 | Invoice PDF on booking confirmation | Low | Medium |
| 6 | About page | Low | Medium |
| 7 | Contact form page | Low | Medium |
| 8 | 404 page redesign | Low | Low |
| 9 | generateMetadata on all public pages | Low | Medium |
| 10 | Hero image alt text | Trivial | Low |

## Tier 2 — Medium Impact, Build Next

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 11 | "Notify when available" | Medium | Medium |
| 12 | "Frequently rented together" | Medium | Medium |
| 13 | Abandoned cart recovery email | Medium | Medium |
| 14 | Availability date filter on equipment listing | Low | Medium |
| 15 | Equipment comparison tool | High | Medium |
| 16 | Delivery tracking status | Medium | Medium |
| 17 | Newsletter signup on homepage | Low | Medium |
| 18 | Admin revenue dashboard (today/week/year) | Low | Medium |
| 19 | "Rent Again" on past bookings | Low | Medium |
| 20 | Share buttons on equipment detail | Low | Low |

## Tier 3 — Future / Growth

| # | Feature |
|---|---------|
| 21 | Vendor portal enhancements |
| 22 | AI recommendations ("customers like you also rented") |
| 23 | Subscription plans |
| 24 | Live chat / support bot |
| 25 | PWA + push notifications |
| 26 | Multi-language (Arabic + English toggle) |
| 27 | Blog / resources |
| 28 | AR equipment preview |
| 29 | Loyalty / referral program |
| 30 | Marketplace mode |

---

# TOP 10 UX IMPROVEMENTS (Ranked by User Impact)

1. **Guest checkout** — Reduce friction. Allow checkout without account, create account after.
2. **Availability calendar on equipment detail** — Show which dates are free before add-to-cart.
3. **Equipment slug URLs** — `/equipment/sony-fx3` instead of `/equipment/clxyz123`.
4. **Reviews on equipment** — Social proof increases conversion.
5. **Contact form** — Dedicated page with form, not just WhatsApp/email.
6. **404 page redesign** — Helpful links, search, illustration.
7. **"Rent Again" on past bookings** — One-click rebook.
8. **"Notify when available"** — Capture demand for out-of-stock.
9. **Hero search with date picker** — Search by date from homepage.
10. **Save cart for later** — Reduce abandonment.

---

# TOP 10 REVENUE-DRIVING FEATURES (Ranked by Business Impact)

1. **Guest checkout** — Capture more conversions.
2. **Abandoned cart recovery** — Recover 10–15% of abandoned carts.
3. **Reviews on equipment** — Increase trust and conversion.
4. **"Frequently rented together"** — Upsell.
5. **"Notify when available"** — Convert when stock returns.
6. **Insurance upsell at checkout** — Additional revenue.
7. **Promo code visibility** — Increase usage.
8. **Admin revenue dashboard** — Better decisions.
9. **"Rent Again"** — Repeat bookings.
10. **Newsletter + remarketing** — Nurture leads.

---

# COMPLETE DATA MODEL GAPS

## Equipment
- slug, shortDescription, longDescription, rentCount, insuranceValue, compatibleWith, specSheetUrl, metaTitle, metaDescription

## Booking
- deliveryAddress, deliveryStatus (in Delivery), damageReport (in DamageClaim), insuranceSelected, adminNotes, cancellationReason

## User
- loyaltyPoints, referralCode, referredBy, blacklisted, totalSpent, preferredLanguage

## Review
- equipmentId (or link via booking), images, verified, helpfulCount

---

# API COMPLETENESS SCORE

| Category | Score | Notes |
|----------|-------|-------|
| Public catalog | 95% | Search, filters, availability. Missing: conflict check for public. |
| Cart / Checkout | 90% | Full flow. Missing: guest cart merge. |
| Bookings | 95% | CRUD, conflicts, transitions. |
| Reviews | 80% | GET/POST. Missing: equipment-scoped, images. |
| Wishlist | 100% | GET/POST/DELETE. |
| Analytics | 85% | KPIs, utilization, revenue. |
| Invoices | 90% | Generate, PDF. |
| Health | 100% | Public /api/health. |

**Overall API completeness: ~92%**

---

# 30-DAY SPRINT PLAN

## Week 1 — Quick Wins
- [ ] Add `generateMetadata` to equipment, cart, checkout, FAQ, policies, how-it-works, support
- [ ] Fix hero image alt text
- [ ] Redesign 404 page
- [ ] Create About page
- [ ] Create Contact page with form

## Week 2 — Conversion
- [ ] Add availability calendar to equipment detail (use existing API)
- [ ] Add reviews section to equipment detail
- [ ] Add equipment slug (migration + redirect)
- [ ] Invoice PDF link on booking confirmation

## Week 3 — Checkout & Cart
- [ ] Guest checkout flow
- [ ] "You might also need" upsell on cart
- [ ] Save cart for later
- [ ] Abandoned cart email (1hr, 24hr)

## Week 4 — Polish & Admin
- [ ] Admin revenue dashboard (today/week/year)
- [ ] "Rent Again" on portal booking detail
- [ ] "Notify when available" button
- [ ] Share buttons on equipment detail

---

# FIXES TO APPLY (Prioritized)

After this audit, start fixing issues one by one. For each fix:

**✅ Fixed — [what was done and why it matters]**

*(To be filled as fixes are implemented.)*

---

**End of FlixCam.rent Improvement Blueprint.**
