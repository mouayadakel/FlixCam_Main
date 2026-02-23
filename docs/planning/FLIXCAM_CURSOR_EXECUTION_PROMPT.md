# 🎬 FlixCam.rent — Elite Platform Execution Prompt

# Version 2.0 — Schema-Corrected & Path-Verified

# Save this file as FLIXCAM_CURSOR_EXECUTION_PROMPT.md in the repo root

---

## ⚠️ VERIFIED SCHEMA FACTS (Read Before Touching Any File)

Before implementing anything, internalize these confirmed facts about the
real codebase schema. These correct errors in earlier audit drafts:

| Fact                                     | Detail                                                                                                                                                                                                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Equipment` has NO `branchId`            | Branch and Equipment are not directly related. Pickup location must come from `SiteConfig` or a separate join table. Do NOT add `equipment.branchId`.                                                                                                     |
| `Booking.customerId` is REQUIRED         | The current schema requires a user. Guest checkout needs EITHER: (a) make `customerId` nullable + add `guestEmail/guestName/guestPhone`, OR (b) create a shadow "guest" User record on checkout. Confirm the existing schema constraint before migrating. |
| `[slug]` route actually receives an `id` | `src/app/(public)/equipment/[slug]/page.tsx` currently queries by `id`, not a real slug. Adding a slug field requires a migration + backward-compat redirect.                                                                                             |
| Review links to `bookingId` only         | Review model has no `equipmentId`. To show reviews on equipment detail, either add `equipmentId` to Review or JOIN through Booking → BookingItem → Equipment.                                                                                             |
| Auth is NextAuth, not Supabase           | Supabase is DB-only. `src/lib/auth/auth-helpers.ts` Supabase auth functions are dead code.                                                                                                                                                                |

---

You are a senior full-stack engineer, product designer, and UX strategist
working on **FlixCam.rent** — a cinematic equipment rental platform built
with Next.js App Router, Prisma, NextAuth, Supabase (DB only), Tailwind CSS,
shadcn/ui, and a Tap payment gateway.

A complete platform audit has been conducted and schema facts have been
verified (see above). Your job is to execute every improvement below, one
by one, in priority order.

**Rules:**

- Before touching any file, open and read it fully first
- Verify the real schema in `prisma/schema.prisma` before any migration
- After each item, write: ✅ **[#] Fixed** — [file(s) changed + why it matters]
- If a path does not match what you find, correct it and note the real path
- Do not skip items. Do not batch silently. Show your work.

---

## 🔴 SPRINT 1 — WEEK 1: QUICK WINS

---

### 1. Fix Hero Image Alt Text & All Missing Alt Attributes

**Files:**

- `src/components/public/home/home-hero.tsx` (~line 99)
- `src/components/public/home/home-featured-equipment.tsx`
- `src/components/public/home/home-top-brands.tsx`
- `src/components/public/home/home-category-cards.tsx`
- `src/components/public/equipment/equipment-card.tsx`

**Note:** Actual paths may be `src/components/features/home/` and `src/components/features/equipment/` — verify first.

**Problem:** `alt=""` on hero image fails WCAG and hurts SEO image indexing.

**Fix:**

- In `home-hero.tsx`: replace `alt=""` with `alt={t('hero.imageAlt')}` or
  the static string `"FlixCam — تأجير المعدات السينمائية"`
- In all other files above: audit every `<Image>` and `<img>`. Add
  descriptive `alt` text to meaningful images. Use `alt=""` ONLY for purely
  decorative images (icons that already have adjacent visible text labels).
- Run a grep to find all instances:
  `grep -r 'alt=""' src/components/`

---

### 2. Add `generateMetadata` to All Public Pages

**Problem:** All public pages are missing dynamic metadata, hurting SEO.

Add a `metadata` export (static) or `generateMetadata` function (dynamic)
to every file below. Use the existing `SiteConfig` values for the site name.

| File                                         | Type    | Key Tags                                         |
| -------------------------------------------- | ------- | ------------------------------------------------ |
| `src/app/(public)/equipment/page.tsx`        | Static  | title, description, keywords                     |
| `src/app/(public)/equipment/[slug]/page.tsx` | Dynamic | equipment name, og:image, JSON-LD Product schema |
| `src/app/(public)/faq/page.tsx`              | Static  | FAQ keywords                                     |
| `src/app/(public)/policies/page.tsx`         | Static  | policies keywords                                |
| `src/app/(public)/how-it-works/page.tsx`     | Static  | how to rent keywords                             |
| `src/app/(public)/support/page.tsx`          | Static  | support, contact keywords                        |
| `src/app/(public)/studios/page.tsx`          | Static  | studios keywords                                 |
| `src/app/(public)/packages/page.tsx`         | Static  | packages, bundles keywords                       |
| `src/app/(public)/terms/page.tsx`            | Static  | terms of service                                 |
| `src/app/(public)/privacy/page.tsx`          | Static  | privacy policy                                   |

**For `equipment/[slug]/page.tsx` specifically — also add JSON-LD:**

```typescript
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: equipment.model,
  image: equipment.images?.[0],
  description: equipment.shortDescription ?? equipment.model,
  brand: { '@type': 'Brand', name: equipment.brand },
  offers: {
    '@type': 'Offer',
    priceCurrency: 'SAR',
    price: equipment.dailyRate,
    availability: equipment.isActive
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
  },
}
// Inject via: <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
```

---

### 3. Add Missing Routes to Sitemap

**File:** `src/app/sitemap.ts`

**Add these static routes** (currently missing):
`/faq`, `/terms`, `/privacy`, `/about`, `/contact`, `/studios`, `/packages`

**Add dynamic equipment pages:**

```typescript
const equipmentItems = await prisma.equipment.findMany({
  where: { isActive: true },
  select: { id: true, slug: true, updatedAt: true },
})
// Map to: { url: `/equipment/${item.slug ?? item.id}`, lastModified: item.updatedAt }
```

Set `changeFrequency: 'weekly'` for equipment pages,
`changeFrequency: 'monthly'` for static pages.

---

### 4. Redesign the 404 Page

**File:** `src/app/not-found.tsx`

**Problem:** Plain text "404" with no CTAs. Users bounce immediately.

**Reference:** Read `src/app/403/page.tsx` first and match its design language.

**Build:**

- RTL-compatible layout matching the 403 page style exactly
- Large camera or film reel icon (Lucide or inline SVG — no external URLs)
- Arabic headline: `"عذراً، الصفحة غير موجودة"` + sub: `"404 — Page Not Found"`
- Three action buttons:
  - Primary: `"العودة للرئيسية"` → `/`
  - Secondary: `"تصفح المعدات"` → `/equipment`
  - Ghost: `"تواصل معنا"` → `/contact`
- A search input: `"أو ابحث عن معدة..."` that submits to `/equipment?q=`

---

### 5. Create the About Page

**Create:** `src/app/(public)/about/page.tsx`
**Create:** `src/components/public/about/` (component folder)

**Purpose:** Trust signal for customers and investors. Currently 100% missing.

**Page sections (in order):**

**Section 1 — Hero:**

- Headline: `"من نحن"` with a short brand statement
- Match homepage hero style (gradient or dark overlay)

**Section 2 — Our Story:**

- 2–3 paragraphs about FlixCam's founding and mission
- Wrap placeholder content in `{/* TODO: replace with CMS content */}` comment
- Split layout: text on one side, image placeholder on the other

**Section 3 — Why FlixCam? (4 value prop cards with Lucide icons):**

1. 🎥 "معدات احترافية مختارة بعناية"
2. 🚀 "حجز سريع وتسليم موثوق"
3. 🛡️ "ضمان الجودة في كل إيجار"
4. 🤝 "دعم عملاء على مدار الساعة"

**Section 4 — Stats Bar:**

- Reuse the stats pattern from `HomeTrustSignals`
- Pull from `/api/dashboard/kpis` OR static `SiteConfig` values
- Show: عدد المعدات | الإيجارات المكتملة | سنوات الخبرة

**Section 5 — Location / Contact Info:**

- Pull branch name, address, phone, email from `SiteConfig`
- ⚠️ Equipment has no `branchId` — use `SiteConfig` for global pickup info
- Add Google Maps link: `https://maps.google.com/?q=${encodeURIComponent(address)}`

**Section 6 — CTA:** `"ابدأ الحجز الآن"` → `/equipment`

**Add** `generateMetadata` with title `"من نحن | FlixCam"`.

---

### 6. Create the Contact Page with Working Form

**Create:** `src/app/(public)/contact/page.tsx`
**Create:** `src/components/public/contact/contact-form.tsx`
**Create:** `src/app/api/public/contact/route.ts`

**Problem:** `/support` has static info only. No form. Customers give up.

**Left column — Contact Form fields:**

- الاسم الكامل (required, text)
- البريد الإلكتروني (required, email)
- رقم الجوال (optional, tel)
- الموضوع (required, select):
  `"استفسار عن حجز" | "مشكلة في الدفع" | "تلف أو ضياع" | "شراكة تجارية" | "أخرى"`
- الرسالة (required, textarea, min 20 chars)
- Submit: `"إرسال الرسالة"`

**Validation:** Use `react-hook-form` + `zod` (already used in project).
Show inline field errors. Disable submit while pending.

**On submit:** POST to `/api/public/contact`

- Validate with Zod server-side
- Send email to admin via existing `NotificationService`
- Send WhatsApp message to admin number from `SiteConfig`
  (use the same pattern as booking notifications)
- Return `{ success: true }` on success
- Success state: checkmark + `"شكراً! سنرد عليك خلال 24 ساعة"`
- Error state: `"حدث خطأ، يرجى المحاولة مرة أخرى أو التواصل عبر واتساب"`

**Right column — Contact Info Panel:**

- Pull ALL values from `SiteConfig` — do NOT hardcode phone/email/address
- Show: 📞 رقم الهاتف | 💬 واتساب (button) | 📧 البريد الإلكتروني | ⏰ ساعات العمل
- WhatsApp button: `https://wa.me/{phone}?text=مرحباً، أريد الاستفسار عن...`

**Add** `generateMetadata` with title `"تواصل معنا | FlixCam"`.

---

### 7. Upgrade the Support Page

**File:** `src/app/(public)/support/page.tsx`

**Problem:** Hardcodes FAQ content duplicating `/faq`. No form. Dead end page.

**Fix:**

- Remove hardcoded FAQ accordion entirely
- Add `"الأسئلة الشائعة"` card linking to `/faq`
- Add `"لم تجد إجابتك؟"` section linking to the new `/contact` page
- Add `"تواصل عبر واتساب"` button (pull number from `SiteConfig`)
- Keep phone and email but pull from `SiteConfig`, not hardcoded strings
- Add `generateMetadata`

---

## 🟠 SPRINT 2 — WEEK 2: CONVERSION

---

### 8. Add Equipment Slug for SEO-Friendly URLs

**Problem:** URLs are `/equipment/clxyz123` — not shareable or indexable.
**⚠️ The `[slug]` route currently queries by `id`. Follow this order exactly.**

**Step A — Verify schema:** Open `prisma/schema.prisma`. Check if `slug`
already exists on Equipment. If not, add:

```prisma
slug String? @unique
```

Run: `prisma migrate dev --name add-equipment-slug`

**Step B — Backfill slugs for existing records:**
Create `src/scripts/backfill-slugs.ts`:

- For each equipment: generate slug from `${brand}-${model}` lowercased,
  spaces → hyphens, special chars stripped
- Handle duplicates by appending `-2`, `-3`, etc.
- Run once: `npx tsx src/scripts/backfill-slugs.ts`

**Step C — Auto-generate slug on create:**
In `src/lib/services/equipment.service.ts`, auto-generate slug if not
provided. Use a `slugify` utility (add if not present).

**Step D — Update the detail page lookup:**
In `src/app/(public)/equipment/[slug]/page.tsx`:

```typescript
// Try slug first, fall back to id for backward compatibility
const equipment = await prisma.equipment.findFirst({
  where: { OR: [{ slug: params.slug }, { id: params.slug }] },
})
```

**Step E — Add permanent redirects:**
In `next.config.js` or middleware, add 301 redirects from
`/equipment/[id]` to `/equipment/[slug]` for all existing equipment.

**Step F — Update sitemap** to use slug instead of id (see item 3).

---

### 9. Add Availability Calendar to Equipment Detail Page

**File:** `src/app/(public)/equipment/[slug]/equipment-detail.tsx`
(verify the exact component file path — likely `src/components/features/equipment/equipment-detail.tsx`)

**API already exists:** `GET /api/public/equipment/[id]/availability`

**Create:** `src/components/features/equipment/equipment-availability-calendar.tsx`

- Monthly calendar view (check what date picker checkout already uses — reuse it)
- Fetch on mount: `GET /api/public/equipment/{id}/availability`
- Show loading skeleton while fetching
- Blocked/booked dates: red/gray, non-clickable
- Available dates: green or default, selectable
- On range selection: update URL params `?from=YYYY-MM-DD&to=YYYY-MM-DD`
  so checkout pre-fills those dates
- Mobile: single-month view with prev/next navigation
- Fallback if fetch fails: `"تواصل معنا للتحقق من التوفر"`

Place the calendar below the price/booking block on the detail page.

---

### 10. Add Reviews & Ratings to Equipment Detail

**⚠️ Schema note:** Review has `bookingId` only, NOT `equipmentId`.
Must be fixed at schema level before building the UI.

**Step A — Update Review model:**
Open `prisma/schema.prisma`. Add to Review:

```prisma
equipmentId  String?
equipment    Equipment? @relation(fields: [equipmentId], references: [id])
images       String[]
verified     Boolean    @default(false)
helpfulCount Int        @default(0)
```

Run: `prisma migrate dev --name review-equipment-fields`

Write a backfill script: for existing reviews, set `equipmentId` from
the booking's first BookingItem's equipmentId.

**Step B — Update review submission:**
In `POST /api/reviews`: auto-populate `equipmentId` from the booking's
items when a review is submitted.

**Step C — Build Reviews component:**
Create `src/components/features/equipment/equipment-reviews.tsx`:

- Fetch: `GET /api/reviews?equipmentId={id}&limit=5&page=1`
  (extend the reviews API to accept `equipmentId` filter)
- Show: average star rating, total count, 5-star distribution bars
- List: first name only (privacy), date, star rating, comment
- `"عرض المزيد"` pagination button
- `"اكتب تقييماً"` button: only for users with a COMPLETED booking
  for this equipment
- Review form: star selector (1–5), comment textarea, submit

**Step D — Show rating on equipment cards:**
In `equipment-card.tsx`, show star badge if `avgRating` is returned.
Extend the equipment list API to include `_avg { rating }` from Review.

---

### 11. Add "Frequently Rented Together" Section

**Create:** `src/app/api/public/equipment/[id]/frequently-rented-together/route.ts`

**Logic:**

```typescript
// 1. Find BookingItems where equipmentId = params.id → collect bookingIds
// 2. Find all BookingItems in those bookings where equipmentId != params.id
// 3. Group by equipmentId, count occurrences, sort DESC, take top 3
// 4. Fetch full equipment data for those 3 IDs
// Cache with unstable_cache, revalidate: 86400 (24 hours)
```

**UI in `equipment-detail.tsx`:**

- Section title: `"كثيراً ما يُحجز معاً"`
- Horizontal card row (3 cards max) using the existing `EquipmentCard`
- `"أضف للسلة"` on each card
- If no co-occurrence data: hide the section entirely (no empty state)

---

### 12. Add PDF Invoice Link to Booking Confirmation

**File:** `src/app/(public)/booking/confirmation/[id]/page.tsx`

**API already exists:** `GET /api/invoices/[id]/pdf`

**Fix:**

- Fetch invoice linked to this booking on page load
- Show `"تحميل الفاتورة PDF"` button only when booking is CONFIRMED or later
- Add `"إضافة للتقويم"` button:
  - Google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text={title}&dates={start}/{end}`
  - Format dates as `YYYYMMDDTHHmmssZ`
- Add `"احجز نفس المعدات مرة أخرى"` button:
  - POST each booking item to `/api/cart` then redirect to `/cart`

---

### 13. Add Equipment Description & Content Fields

**Step A — Verify schema first:**
Open `prisma/schema.prisma`. Check if `shortDescription`, `longDescription`,
`metaTitle`, `metaDescription`, `specSheetUrl`, `rentCount` already exist.
Only add the genuinely missing ones:

```prisma
shortDescription String?
longDescription  String?
metaTitle        String?
metaDescription  String?
specSheetUrl     String?
rentCount        Int     @default(0)
```

Run: `prisma migrate dev --name equipment-content-fields`

**Step B — Admin edit form:**
Find the equipment edit form admin route (check the actual path).
Add textarea for `shortDescription` (max 160 chars), rich textarea for
`longDescription`, text input for `specSheetUrl`, and an SEO collapsible
section for `metaTitle` and `metaDescription`.

**Step C — Equipment detail page:**

- Show `shortDescription` in the price block sub-heading
- Add a `"تفاصيل المعدة"` tab showing `longDescription` (rendered as HTML/Markdown)
- Show `specSheetUrl` as `"تحميل المواصفات (PDF) ↓"` link (new tab)
- Show `rentCount` as `"تم تأجيرها {n} مرة ✓"` badge if `rentCount > 0`

**Step D — Increment rentCount:**
In `booking.service.ts`, when a booking transitions to COMPLETED:
increment `rentCount` on each Equipment in that booking's items.

---

## 🟡 SPRINT 3 — WEEK 3: CART & CHECKOUT

---

### 14. Add "You Might Also Need" Upsell to Cart

**File:** `src/app/(public)/cart/page.tsx`
**Create:** `src/components/features/cart/cart-upsell.tsx`

**Logic:**

- Get category IDs of all items in the cart
- Fetch: `GET /api/public/equipment?categories={ids}&limit=4`
- Exclude equipment IDs already in the cart from results
- Show skeleton while loading; render nothing if no results returned

**UI:**

- Title: `"قد تحتاج أيضاً"`
- Horizontal scrollable row of up to 4 `EquipmentCard` components
- Place below cart items list, above order summary

---

### 15. Add Insurance Add-on to Cart Items

**File:** `src/components/features/cart/cart-item-row.tsx`

**Fix:**

- Below each cart item, add a checkbox:
  `"✅ أضف تأمين الحماية (+{amount} ر.س / يوم)"`
- Insurance cost = `dailyRate × insuranceRate` where `insuranceRate` comes
  from `SiteConfig` or a settings API (default: 10% if not configured)
- Store `insuranceSelected: boolean, insuranceAmount: number` in cart item state
- Update `CartSummary` to show insurance as a line item in the total

---

### 16. Add Guest Checkout Flow

**File:** `src/app/(public)/checkout/page.tsx`

**⚠️ Critical schema constraint — do this DB step FIRST:**

**Step A — Schema migration:**
Open `prisma/schema.prisma`. Confirm `Booking.customerId` is required.
Make it nullable and add guest fields:

```prisma
customerId   String?   // was required, now nullable
guestEmail   String?
guestName    String?
guestPhone   String?
```

Run: `prisma migrate dev --name booking-guest-checkout`

After migration: search all Prisma queries that assume `customerId` is
non-null (e.g., `booking.customerId!`) and add null guards.

**Step B — Checkout UI:**

- Remove hard redirect to `/login` for unauthenticated users
- Add a pre-step gate before the stepper:
  ```
  [متابعة كزائر]     [تسجيل الدخول / إنشاء حساب]
  ```
- Guest path collects: `guestName`, `guestEmail`, `guestPhone`
- Store guest info in React state + session cookie (not localStorage)
- Pass guest info through the existing checkout stepper
- In `CheckoutStepConfirm`: create booking via `/api/bookings` with guest fields

**Step C — Post-checkout upsell (on confirmation page):**
If guest checkout: show `"أنشئ حسابك لتتبع طلباتك"`
with link to `/register?email={guestEmail}&redirect=/portal/bookings`

---

### 17. Add "Save Cart for Later"

**File:** `src/app/(public)/cart/page.tsx`

**Fix:**

- Add `"حفظ السلة لوقت لاحق"` secondary button in the cart header
- Logged-in users: cart is already persisted — show toast:
  `"تم حفظ سلتك — ستجدها هنا عند عودتك"`
- Guest users: serialize cart state to localStorage key `flixcam_saved_cart`
  with an expiry timestamp (7 days from now)
- On cart page load: if saved cart exists and current cart is empty, show:
  `"لديك سلة محفوظة — هل تريد استعادتها؟"` with `[استعادة]` and `[تجاهل]`
- Add `"مسح السلة"` (clear cart) button with a confirmation dialog

---

### 18. Add Abandoned Cart Recovery Cron Job

**Create:** `src/app/api/cron/abandoned-cart/route.ts`

**Step A — Schema** (verify Cart model exists first, add if missing):

```prisma
abandonedEmail1hSentAt  DateTime?
abandonedEmail24hSentAt DateTime?
updatedAt               DateTime @updatedAt
```

Run: `prisma migrate dev --name cart-abandonment-tracking`

**Step B — Cron logic:**

```typescript
// Guard: check Authorization header against CRON_SECRET
// 1-hour carts: items exist, no completed booking, updatedAt < now-1hr, 1h email not sent
// 24-hour carts: same but updatedAt < now-24hr
// For each: send email via NotificationService with cart items + deep-link to /cart
// Update sentAt timestamp after sending
```

**Step C — Register in `vercel.json`:**

```json
{
  "crons": [{ "path": "/api/cron/abandoned-cart", "schedule": "0 * * * *" }]
}
```

---

## 🟢 SPRINT 4 — WEEK 4: ADMIN & PORTAL POLISH

---

### 19. Upgrade Admin Dashboard Overview

**File:** `src/app/admin/(routes)/dashboard/overview/page.tsx`
(verify exact path — may differ)

**Step A — Multi-period Revenue KPIs:**
Extend `GET /api/dashboard/kpis` to accept `?period=today|week|month|year`.
Return: `{ revenue, bookingCount, newCustomers, vsLastPeriod }` for each.
`vsLastPeriod` = % change vs equivalent previous period.
UI: 4 KPI cards in a row with `↑12%` / `↓3%` change badges.

**Step B — Recent Bookings Widget:**
Add `"آخر الحجوزات"` table directly on the overview page:

- Fetch last 5 bookings (sorted by `createdAt DESC`)
- Columns: اسم العميل | المعدة | تاريخ البداية | الحالة | المبلغ
- Status as colored badge (reuse existing badge component)
- `"عرض جميع الحجوزات →"` link at the bottom

**Step C — Alerts Widget:**
Add `"تنبيهات تحتاج انتباهك"` section:

- Equipment in MAINTENANCE status
- Bookings where `actualReturnDate` is past and booking not closed
- Pending approval bookings count
- Equipment with 0 bookings in last 30 days
  Create `GET /api/admin/dashboard/alerts` or compute from existing data.

---

### 20. Add "Rent Again" to Customer Portal

**File:** `src/app/portal/bookings/[id]/page.tsx`
(verify exact path — portal is NOT under `(public)`)

**Fix:**

- On COMPLETED bookings only, show `"احجز نفس المعدات مرة أخرى"` button
- On click:
  1. For each equipment in `booking.items`, POST to `/api/cart`
  2. Pre-fill dates: start = tomorrow, end = start + original booking duration
  3. Show loading spinner during cart operations
  4. Redirect to `/cart` with toast: `"تمت إضافة المعدات إلى سلتك"`
- If an item is no longer available: skip it and show which were skipped

---

### 21. Add "Notify When Available" Feature

**Step A — Schema:**

```prisma
model EquipmentWaitlist {
  id          String    @id @default(cuid())
  equipmentId String
  email       String
  userId      String?
  notified    Boolean   @default(false)
  createdAt   DateTime  @default(now())
  equipment   Equipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
  @@unique([equipmentId, email])
}
```

Run: `prisma migrate dev --name equipment-waitlist`

**Step B — API:**
Create `src/app/api/public/equipment/[id]/notify/route.ts`:

- POST `{ email: string }` → validate, upsert into EquipmentWaitlist
- Return `{ success: true }`

**Step C — UI:**
In the availability badge component (find where "غير متاح" is shown):

- Show `"🔔 أبلغني عند التوفر"` button when equipment is unavailable
- Click opens a popover with email input (pre-filled if logged in)
- Submit → POST to `/api/public/equipment/[id]/notify`
- Success: `"سنبلغك فور توفر المعدة"`

**Step D — Trigger:**
In `booking.service.ts`, when a booking completes/returns:

- Query `EquipmentWaitlist` where `equipmentId` matches and `notified = false`
- Send notification email via `NotificationService`
- Batch update: set `notified = true`

---

### 22. Add Share Buttons to Equipment Detail

**File:** `src/components/features/equipment/equipment-detail.tsx`

**Add a ShareBar component** next to the Save button:

- **WhatsApp:** `https://wa.me/?text=شاهد هذه المعدة: ${encodeURIComponent(pageUrl)}`
- **X (Twitter):** `https://x.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(name)}`
- **Copy link:** `navigator.clipboard.writeText(pageUrl)` → `"تم النسخ ✓"` toast for 2s
- Use `window.location.href` for `pageUrl` (must be a client component)
- Icons: Lucide or inline SVG only — no external image dependencies
- Style: small ghost icon buttons grouped in a row

---

### 23. Add Newsletter Signup to Homepage

**Create:** `src/components/features/home/home-newsletter.tsx`
**Create:** `src/app/api/public/newsletter/route.ts`
**Add to schema:**

```prisma
model NewsletterSubscriber {
  id           String   @id @default(cuid())
  email        String   @unique
  subscribedAt DateTime @default(now())
  active       Boolean  @default(true)
  source       String?  // e.g. "homepage", "checkout", "popup"
}
```

Run: `prisma migrate dev --name newsletter-subscribers`

**UI** (add between Testimonials and FAQ on homepage):

- Title: `"اشترك في نشرتنا — احصل على عروض حصرية"`
- Email input + `"اشترك"` button
- Checkbox: `"أوافق على استقبال العروض والتحديثات"` (required)
- Validate email before submit
- POST to `/api/public/newsletter` → upsert subscriber, send welcome email
- Success inline: `"شكراً! 🎉 سنرسل لك أحدث العروض"`
- Already subscribed: `"أنت مشترك بالفعل"`

---

### 24. Add Customer Blacklist Feature

**Step A — Schema** (verify User model first):

```prisma
blacklisted       Boolean   @default(false)
blacklistReason   String?
blacklistedAt     DateTime?
```

Run: `prisma migrate dev --name user-blacklist`

**Step B — Admin UI:**
In the customer profile page:

- Add `"حظر العميل"` danger button (only if not already blacklisted)
- Opens dialog: reason input (required) + `"تأكيد الحظر"`
- Call `POST /api/admin/clients/[id]/blacklist`
- Show `"رفع الحظر"` if already blacklisted
- Show red `"محظور"` badge on profile and in client list

**Step C — Create API:**
`src/app/api/admin/clients/[id]/blacklist/route.ts`

- POST: set `blacklisted = true`, `blacklistReason`, `blacklistedAt`
- DELETE: set `blacklisted = false`, clear reason and date

**Step D — Guard booking creation:**
In `src/lib/services/booking.service.ts`, at the top of create:

```typescript
const user = await prisma.user.findUnique({ where: { id: customerId } })
if (user?.blacklisted) {
  throw new Error(`BLACKLISTED: ${user.blacklistReason ?? 'Account suspended'}`)
}
```

---

### 25. Add Pickup Location to Equipment Detail

**⚠️ Confirmed: Equipment has NO `branchId`. Use `SiteConfig` only.**

**File:** `src/components/features/equipment/equipment-detail.tsx`

**Fix:**

- Read `SiteConfig` (already likely fetched in layout or page — don't re-fetch)
- **Find the correct field names** by reading the `SiteConfig` model in
  `prisma/schema.prisma` and the admin settings page **before writing a single line of code**
- Show a `"📍 موقع الاستلام"` section with: name, address, working hours
- Add `"فتح في خرائط Google"` link:
  `https://maps.google.com/?q=${encodeURIComponent(address)}`
- Do NOT create a fake Equipment → Branch relation that doesn't exist in schema

---

## 🔵 DATA MODEL — VERIFIED MIGRATIONS CHECKLIST

Run these in order. Before each, verify the field doesn't already exist.

| #   | Migration Name              | What's Added                                                                           | Model     |
| --- | --------------------------- | -------------------------------------------------------------------------------------- | --------- |
| M1  | `add-equipment-slug`        | `slug String? @unique`                                                                 | Equipment |
| M2  | `equipment-content-fields`  | shortDescription, longDescription, metaTitle, metaDescription, specSheetUrl, rentCount | Equipment |
| M3  | `booking-guest-checkout`    | customerId nullable, guestEmail, guestName, guestPhone                                 | Booking   |
| M4  | `review-equipment-fields`   | equipmentId, images[], verified, helpfulCount                                          | Review    |
| M5  | `user-blacklist`            | blacklisted, blacklistReason, blacklistedAt                                            | User      |
| M6  | `user-loyalty`              | loyaltyPoints, referralCode, referredBy, totalSpent, preferredLanguage                 | User      |
| M7  | `equipment-waitlist`        | New `EquipmentWaitlist` model                                                          | —         |
| M8  | `newsletter-subscribers`    | New `NewsletterSubscriber` model                                                       | —         |
| M9  | `cart-abandonment-tracking` | abandonedEmail1hSentAt, abandonedEmail24hSentAt                                        | Cart      |

**⚠️ Rule:** Before each migration, open `prisma/schema.prisma` and confirm
the field is genuinely absent. Never create duplicate fields.

---

## 🟣 ACCESSIBILITY & UX SWEEP

### 26. Global Accessibility Pass

**Baseline:** Run `grep -r 'aria-' src/components/ | wc -l`

**Fix in this priority order:**

**1. Icon-only buttons** — Any button with only an icon and no visible text
must have `aria-label`. Search: `grep -rn '<button' src/components/`
Priority: cart button, wishlist/save button, close buttons, menu toggle,
share buttons, quantity +/− buttons in cart

**2. Form inputs** — Every `<input>`, `<textarea>`, `<select>` must have
an associated `<label htmlFor>` or `aria-label`. Check: checkout form,
contact form, search bar, coupon field, newsletter form

**3. Modals and dialogs** — Must have `role="dialog"`, `aria-labelledby`,
`aria-modal="true"`. Focus must move INTO the dialog on open and BACK to
the trigger button on close. Check all shadcn/ui `Dialog` usages.

**4. Error messages** — Add `role="alert"` to all inline form errors
so screen readers announce them immediately without waiting for focus.

**5. Images** — Run `grep -rn 'alt=""' src/` and fix all non-decorative empties.

**6. Skip link** — Verify `src/app/(public)/layout.tsx` has a skip-to-main
link as the FIRST focusable element. If missing, add:

```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:p-4">
  تخطى للمحتوى الرئيسي
</a>
```

---

### 27. Add Loading Skeletons to Admin Pages

**Create these `loading.tsx` files** (Next.js App Router — auto-shown):

- `src/app/admin/(routes)/dashboard/overview/loading.tsx`
- `src/app/admin/(routes)/bookings/loading.tsx`
- `src/app/admin/(routes)/clients/loading.tsx`
- `src/app/admin/(routes)/inventory/equipment/loading.tsx`
- `src/app/admin/(routes)/finance/reports/loading.tsx`

Each should render a skeleton matching the real page layout using the
`<Skeleton>` component from shadcn/ui. Example for dashboard:
4 KPI card skeletons + chart area skeleton + table skeleton rows.

---

### 28. Add Error Boundaries

**Create:**

- `src/app/admin/error.tsx`
- `src/app/portal/error.tsx`
- `src/app/(public)/error.tsx`

Next.js App Router `error.tsx` convention:

```typescript
'use client'
import { useEffect } from 'react'
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])
  return (
    // Arabic-friendly layout matching design system
    // Icon + error headline + "حاول مجدداً" reset() button + "الرئيسية" link
  )
}
```

---

## ⚙️ API IMPROVEMENTS

### 29. Standardize API Error & Success Responses

**Create:** `src/lib/api/response.ts`

```typescript
export function apiError(message: string, status: number, code?: string) {
  return Response.json({ error: message, code, status }, { status })
}
export function apiSuccess<T>(data: T, status = 200) {
  return Response.json({ data, status }, { status })
}
```

**Grep for inconsistent patterns:**

```bash
grep -rn "NextResponse.json" src/app/api/
grep -rn "return Response.json" src/app/api/
```

Replace error responses in these priority files:

- `src/app/api/bookings/route.ts`
- `src/app/api/cart/route.ts`
- `src/app/api/public/equipment/route.ts`
- All routes under `src/app/api/admin/`

---

### 30. Add Frequently Rented Together API

**Create:** `src/app/api/public/equipment/[id]/frequently-rented-together/route.ts`

```typescript
import { unstable_cache } from 'next/cache'
// Query:
// 1. BookingItems where equipmentId = params.id → get bookingIds
// 2. BookingItems in those bookings where equipmentId != params.id
// 3. Group by equipmentId, count occurrences, sort DESC, take 3
// 4. Fetch full Equipment records for the top 3
// Cache for 24 hours (revalidate: 86400)
```

---

### 31. Extend Dashboard KPIs for Time Periods

**File:** `src/app/api/dashboard/kpis/route.ts`

Add `?period=today|week|month|year` query param support.
Response shape:

```typescript
{
  revenue: number,
  bookingCount: number,
  newCustomers: number,
  vsLastPeriod: number // percentage change vs equivalent previous period
}
```

---

## 🏠 HOMEPAGE ENHANCEMENTS

### 32. Add "Trending / Most Rented" Section

**Create:** `src/app/api/public/equipment/trending/route.ts`

```typescript
// Query: Equipment sorted by rentCount DESC, isActive = true, limit 8
// Cache with unstable_cache, revalidate: 3600
```

**Create:** `src/components/features/home/home-trending.tsx`

- Title: `"🔥 الأكثر طلباً"`
- Horizontal scrollable row of up to 8 `EquipmentCard` components
- Flame badge overlay on each card
- Skeleton while loading

Add to homepage between Featured Equipment and Categories.

---

### 33. Upgrade Hero Search Bar

**File:** `src/components/features/home/home-hero.tsx`
(Find where `PublicSearch` is rendered — read it first)

**Upgrade to include 3 inputs in one search bar:**

1. Equipment text input with autocomplete
   (debounced fetch to `/api/public/equipment?q=` for suggestions)
2. Category dropdown (fetch from `/api/public/categories`)
3. Date picker for start date (reuse the existing date picker from checkout)
4. `"بحث"` submit button → `/equipment?q=&category=&from=`

**Mobile:** Collapse to single tap-to-expand search bar.
**Style:** Match existing hero design — pill-shaped card over hero background.

---

## ✅ FINAL COMPLETION CHECKLIST

After all 33 items, verify each:

### Public Pages

- [ ] Every `<Image>` has meaningful `alt` (not empty on meaningful images)
- [ ] Every public page has `metadata` or `generateMetadata`
- [ ] `/about` exists and is linked in the footer
- [ ] `/contact` exists with a working form (email + WhatsApp to admin)
- [ ] `/faq`, `/terms`, `/privacy`, `/about`, `/contact` all in sitemap
- [ ] `/not-found` has illustration, 3 CTAs, and a search bar
- [ ] Equipment detail: availability calendar functional
- [ ] Equipment detail: reviews section with submit for eligible users
- [ ] Equipment detail: "frequently rented together" shows when data exists
- [ ] Equipment detail: share buttons (WhatsApp, X, copy link)
- [ ] Equipment detail: pickup location from `SiteConfig` (NOT from a fake branchId)
- [ ] Equipment detail: shortDescription, longDescription, specSheetUrl shown
- [ ] Equipment detail: rentCount shown as social proof if > 0
- [ ] Equipment URLs use slug, old ID URLs redirect with 301
- [ ] Cart: insurance add-on toggle per item
- [ ] Cart: "you might also need" upsell section
- [ ] Cart: save for later works for guests and logged-in users
- [ ] Checkout: guest flow works, no forced login redirect
- [ ] Booking confirmation: PDF invoice download button
- [ ] Booking confirmation: "Rent Again" button
- [ ] Booking confirmation: Add to Calendar link

### Admin Panel

- [ ] Dashboard: 4 time-period KPI cards with % change vs prior period
- [ ] Dashboard: Recent bookings widget (last 5)
- [ ] Dashboard: Alerts widget (maintenance, overdue, pending)
- [ ] Equipment edit: description, specSheet, SEO fields present
- [ ] Customer profile: blacklist button + "محظور" badge
- [ ] Customer profile: total spent shown

### Customer Portal

- [ ] "Rent Again" on completed booking detail
- [ ] "Notify when available" on unavailable equipment

### Data Model

- [ ] All migrations ran with no errors
- [ ] Slug backfill script ran — all existing equipment have slugs
- [ ] `Booking.customerId` nullable — all queries updated with null guards
- [ ] `Review.equipmentId` backfilled for existing reviews

### APIs

- [ ] `apiError()` / `apiSuccess()` used consistently
- [ ] `/api/public/equipment/[id]/frequently-rented-together` works
- [ ] `/api/public/newsletter` saves + sends welcome email
- [ ] `/api/public/equipment/[id]/notify` saves to waitlist
- [ ] `/api/public/contact` sends email + WhatsApp to admin
- [ ] `/api/dashboard/kpis?period=today` returns correct data
- [ ] Abandoned cart cron protected by `CRON_SECRET`, registered in `vercel.json`

### Accessibility

- [ ] All icon-only buttons have `aria-label`
- [ ] All form inputs have associated labels
- [ ] All modals have `role="dialog"` and proper focus management
- [ ] All error messages have `role="alert"`
- [ ] Skip-to-content link is first focusable element in public layout
- [ ] All admin list pages have `loading.tsx` skeleton
- [ ] Error boundaries exist for admin, portal, and public layouts

---

**Start with item #1. Work through every item in order.**
**Before each item: open and read the relevant file(s) fully.**
**After each item write:** ✅ **[#] Fixed** — [file(s) changed + business impact]
**If a path is wrong, correct it inline and continue — do not stop.**
