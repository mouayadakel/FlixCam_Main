# CMS Studio – Design & Requirements

> **Purpose**: All studio page content must be manageable from a dedicated CMS in the admin panel. This document defines the data model, CMS structure, and frontend page layout.

---

## 1. Public Studio Page Structure (Frontend)

### 1.1 Header (بسيط)

| Field                                              | Source                                                  | CMS Control |
| -------------------------------------------------- | ------------------------------------------------------- | ----------- |
| Studio name                                        | `Studio.name`                                           | ✅          |
| Subtitle (2 lines): المساحة / النوع / أفضل استخدام | `Studio.areaSqm`, `Studio.studioType`, `Studio.bestUse` | ✅          |
| Badge: "متاح اليوم" / "يتطلب تأكيد"                | `Studio.availabilityConfidence`                         | ✅          |
| CTA: "اختر وقتك"                                   | Fixed                                                   | —           |

### 1.2 Gallery (8–15 images)

| Field                                                | Source                     | CMS Control             |
| ---------------------------------------------------- | -------------------------- | ----------------------- |
| Hero + Grid (8–15 images)                            | `Media` (studioId)         | ✅ Reorder, add, remove |
| Button: "شاهد كل الصور"                              | Fixed                      | —                       |
| Optional video (10–20 sec)                           | `Studio.videoUrl`          | ✅                      |
| Disclaimer: "الصور من جلسات حقيقية / أو صور تسويقية" | `Studio.galleryDisclaimer` | ✅                      |

### 1.3 Location

| Field                        | Source                                   | CMS Control |
| ---------------------------- | ---------------------------------------- | ----------- |
| Google Maps link             | `Studio.address`, `Studio.googleMapsUrl` | ✅          |
| Copy address button          | `Studio.address`                         | ✅          |
| Arrival time from وسط الرياض | `Studio.arrivalTimeFromCenter`           | ✅          |
| Parking/Entrance notes       | `Studio.parkingNotes`                    | ✅          |

### 1.4 Booking Panel (Sticky on desktop)

| Section        | Fields                             | CMS Control                                   |
| -------------- | ---------------------------------- | --------------------------------------------- |
| **Date**       | Calendar, unavailable days         | `StudioBlackoutDate` + availability API       |
| **Time**       | Slots (30/60 min)                  | `Studio.slotDurationMinutes`                  |
| **Buffer**     | "يتضمن 15 دقيقة تجهيز/تنظيف"       | `Studio.setupBuffer`, `Studio.cleaningBuffer` |
| **Duration**   | 1/2/3 / Half day / Full day        | `Studio.minHours`, `Studio.durationOptions`   |
| **Price**      | Hourly / Daily, line items         | `Studio.hourlyRate`, `Studio.dailyRate`       |
| **Packages**   | 3–6 packages                       | `StudioPackage` model                         |
| **Add-ons**    | Toggles                            | `StudioAddOn` (existing)                      |
| **CTA**        | "متابعة للدفع"                     | Fixed                                         |
| **Disclaimer** | "لن يتم تأكيد الحجز إلا بعد الدفع" | `Studio.bookingDisclaimer`                    |

### 1.5 Essential Info (What many forget)

| Section                           | Fields         | CMS Control                                                        |
| --------------------------------- | -------------- | ------------------------------------------------------------------ |
| What's included                   | Bullet list    | `Studio.whatsIncluded` (JSON array)                                |
| Not included                      | Bullet list    | `Studio.notIncluded` (JSON array)                                  |
| Electricity / AC / Changing rooms | Checkboxes     | `Studio.hasElectricity`, `Studio.hasAC`, `Studio.hasChangingRooms` |
| Rules & Requirements              | Text           | `Studio.rulesText`                                                 |
| Max persons                       | Number         | `Studio.capacity`                                                  |
| Smoking / Food                    | Text           | `Studio.smokingPolicy`, `Studio.foodPolicy`                        |
| Equipment care                    | Text           | `Studio.equipmentCarePolicy`                                       |
| Cancellation policy               | 2 lines + link | `Studio.cancellationPolicyShort`, `Studio.cancellationPolicyLink`  |

### 1.6 Trust & Contact

| Field                        | Source                                             | CMS Control |
| ---------------------------- | -------------------------------------------------- | ----------- |
| Reviews / Client logos       | `Studio.reviewsText`, `Studio.clientLogos` (Media) | ✅          |
| WhatsApp: "أسأل قبل الحجز"   | `Studio.whatsappNumber`                            | ✅          |
| Share (copy link + WhatsApp) | Derived                                            | —           |

### 1.7 FAQ (3 questions max)

| Field       | Source            | CMS Control       |
| ----------- | ----------------- | ----------------- |
| 3 FAQ items | `StudioFaq` model | ✅ Per-studio FAQ |

---

## 2. Database Schema Changes

### 2.1 Extend `Studio` Model

```prisma
model Studio {
  // === EXISTING ===
  id             String               @id @default(cuid())
  name           String
  slug           String               @unique
  description    String?
  capacity       Int?
  hourlyRate     Decimal              @db.Decimal(10, 2)
  setupBuffer    Int                  @default(30)
  cleaningBuffer Int                  @default(30)
  resetTime      Int                  @default(15)
  isActive       Boolean              @default(true)
  // ... relations, audit fields

  // === NEW FIELDS (CMS) ===

  // Header
  areaSqm              Int?              // المساحة بالمتر المربع
  studioType           String?           // النوع (مثلاً: تصوير، بودكاست، إلخ)
  bestUse              String?           // أفضل استخدام
  availabilityConfidence String?        // "available_now" | "requires_review"

  // Gallery
  videoUrl             String?           // Optional 10-20 sec video
  galleryDisclaimer    String?           // "الصور من جلسات حقيقية..."
  mediaOrder           String?           // JSON array of media IDs for ordering

  // Location
  address              String?
  googleMapsUrl         String?
  arrivalTimeFromCenter String?           // "15 دقيقة من وسط الرياض"
  parkingNotes         String?

  // Booking
  slotDurationMinutes  Int              @default(60)   // 30 or 60
  dailyRate            Decimal?         @db.Decimal(10, 2)
  minHours             Int              @default(1)
  durationOptions      String?          // JSON: [1,2,3,"half_day","full_day"]
  bookingDisclaimer    String?
  vatIncluded          Boolean          @default(false)

  // What's included / Not included
  whatsIncluded        String?          // JSON array of strings
  notIncluded         String?
  hasElectricity       Boolean          @default(true)
  hasAC                Boolean          @default(true)
  hasChangingRooms     Boolean          @default(false)

  // Rules
  rulesText            String?
  smokingPolicy         String?
  foodPolicy            String?
  equipmentCarePolicy   String?
  cancellationPolicyShort String?
  cancellationPolicyLink String?

  // Trust & Contact
  reviewsText          String?
  whatsappNumber       String?
  // clientLogos: use Media with type="studio_logo" or relation

  // Audit (existing)
  createdAt  DateTime  @default(now())
  createdBy  String?
  updatedAt  DateTime  @updatedAt
  updatedBy  String?
  deletedAt  DateTime?
  deletedBy  String?
}
```

### 2.2 New Model: `StudioPackage`

```prisma
model StudioPackage {
  id          String   @id @default(cuid())
  studioId    String
  name        String
  nameAr      String?
  description String?   // Short description
  includes    String?   // JSON array: ["نقطة 1", "نقطة 2", "نقطة 3"]
  price       Decimal   @db.Decimal(10, 2)
  hours       Int?      // Optional: package for X hours
  order       Int       @default(0)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  createdBy   String?
  updatedAt   DateTime  @updatedAt
  updatedBy   String?
  deletedAt   DateTime?
  deletedBy   String?
  studio      Studio    @relation(fields: [studioId], references: [id])

  @@index([studioId])
  @@index([order])
}
```

### 2.3 New Model: `StudioFaq`

```prisma
model StudioFaq {
  id        String   @id @default(cuid())
  studioId  String
  questionAr String
  questionEn String?
  answerAr   String
  answerEn   String?
  order     Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  createdBy String?
  updatedAt DateTime @updatedAt
  updatedBy String?
  deletedAt DateTime?
  deletedBy String?
  studio    Studio   @relation(fields: [studioId], references: [id])

  @@index([studioId])
  @@index([order])
}
```

### 2.4 Update `Studio` Relations

```prisma
model Studio {
  // ... fields
  packages   StudioPackage[]
  faqs       StudioFaq[]
}
```

### 2.5 Media Ordering

- `Media` already has `studioId`. Add `sortOrder Int?` to Media for studio gallery order, OR use `Studio.mediaOrder` (JSON) to store ordered IDs.
- **Recommendation**: Add `sortOrder Int?` to Media for studioId to keep ordering simple.

---

## 3. CMS Studio – Admin Structure

### 3.1 Navigation

Add under **إدارة المحتوى (CMS)**:

- **الاستوديوهات (Studios)** → `/admin/cms/studios`

### 3.2 CMS Studios List Page

**Route**: `/admin/cms/studios`

- List all studios (name, slug, status, last updated)
- Actions: Edit, View (public link), Toggle active
- Button: "إضافة استوديو" (Create studio – if needed)
- Each row links to `/admin/cms/studios/[id]` for full edit

### 3.3 CMS Studio Edit Page (Single Studio)

**Route**: `/admin/cms/studios/[id]`

**Layout**: Tabs or sections (similar to equipment edit)

| Tab/Section               | Content                                                           | Fields                                                                                                                             |
| ------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **أساسي (Basic)**         | Name, slug, description, area, type, best use, availability badge | name, slug, description, areaSqm, studioType, bestUse, availabilityConfidence                                                      |
| **المعرض (Gallery)**      | Upload/reorder 8–15 images, optional video, disclaimer            | media (with sort), videoUrl, galleryDisclaimer                                                                                     |
| **الموقع (Location)**     | Address, Google Maps, arrival time, parking                       | address, googleMapsUrl, arrivalTimeFromCenter, parkingNotes                                                                        |
| **الحجز (Booking)**       | Slots, buffers, duration, pricing, disclaimer                     | slotDurationMinutes, setupBuffer, cleaningBuffer, minHours, durationOptions, hourlyRate, dailyRate, bookingDisclaimer, vatIncluded |
| **الباكجات (Packages)**   | 3–6 packages CRUD                                                 | StudioPackage: name, includes (3 bullets), price, order                                                                            |
| **الإضافات (Add-ons)**    | Existing StudioAddOn                                              | Reuse current add-ons UI                                                                                                           |
| **المشمول / غير المشمول** | What's included, not included, amenities                          | whatsIncluded, notIncluded, hasElectricity, hasAC, hasChangingRooms                                                                |
| **القواعد (Rules)**       | Rules, policies, cancellation                                     | rulesText, smokingPolicy, foodPolicy, equipmentCarePolicy, cancellationPolicyShort, cancellationPolicyLink                         |
| **الثقة والاتصال**        | Reviews, WhatsApp, client logos                                   | reviewsText, whatsappNumber, client logos (Media)                                                                                  |
| **الأسئلة الشائعة**       | 3 FAQ items for this studio                                       | StudioFaq CRUD                                                                                                                     |
| **الأيام المعطلة**        | Blackout dates                                                    | StudioBlackoutDate (existing)                                                                                                      |

### 3.4 CMS Permissions

- Reuse `settings.update` or add `cms.studio.update` / `cms.studio.read`
- Follow existing CMS FAQ/Policies pattern

---

## 4. API Routes Required

| Method | Route                                     | Purpose                                           |
| ------ | ----------------------------------------- | ------------------------------------------------- |
| GET    | `/api/admin/studios`                      | List studios for CMS                              |
| GET    | `/api/admin/studios/[id]`                 | Full studio for edit (with packages, faqs, media) |
| PUT    | `/api/admin/studios/[id]`                 | Update studio                                     |
| POST   | `/api/admin/studios`                      | Create studio (optional)                          |
| GET    | `/api/admin/studios/[id]/media`           | List media with order                             |
| PUT    | `/api/admin/studios/[id]/media/reorder`   | Reorder gallery                                   |
| POST   | `/api/admin/studios/[id]/media`           | Upload/add media                                  |
| DELETE | `/api/admin/studios/[id]/media/[mediaId]` | Remove from gallery                               |
| CRUD   | `/api/admin/studios/[id]/packages`        | StudioPackage CRUD                                |
| CRUD   | `/api/admin/studios/[id]/faqs`            | StudioFaq CRUD                                    |

**Public** (existing or extend):

- `GET /api/public/studios` – List
- `GET /api/public/studios/[slug]` – Detail (include all new fields)
- `POST /api/public/studios/[slug]/availability` – Slots (existing)

---

## 5. Services & Validators

### 5.1 `StudioService` (extend or create)

- `getById(id)` – for admin
- `getBySlug(slug)` – for public (include packages, faqs, media)
- `update(id, data)` – admin update
- `create(data)` – optional
- Cache invalidation on update

### 5.2 `StudioPackageService`

- `listByStudio(studioId)`
- `create(studioId, data)`
- `update(id, data)`
- `delete(id)`
- `reorder(studioId, packageIds)`

### 5.3 `StudioFaqService`

- `listByStudio(studioId)`
- `create(studioId, data)`
- `update(id, data)`
- `delete(id)`
- `reorder(studioId, faqIds)`

### 5.4 Validators

- `studio.validator.ts`: `updateStudioSchema`, `createStudioSchema`
- `studio-package.validator.ts`
- `studio-faq.validator.ts`

---

## 6. Frontend Components (Public Studio Page)

### 6.1 Component Structure

```
src/components/features/studio/
├── studio-detail.tsx          # Main container (refactor)
├── studio-header.tsx          # Name, subtitle, badge, CTA
├── studio-gallery.tsx         # Hero + grid, "شاهد كل الصور", video, disclaimer
├── studio-location.tsx        # Maps, address, parking
├── studio-booking-panel.tsx   # Sticky card: date, time, duration, price, packages, add-ons, CTA
├── studio-whats-included.tsx  # Bullets + amenities
├── studio-rules.tsx           # Rules, cancellation
├── studio-trust.tsx            # Reviews, WhatsApp, share
├── studio-faq.tsx             # 3 questions
├── studio-slot-picker.tsx      # (existing)
└── studio-booking-form.tsx     # (existing, extend)
```

### 6.2 Sticky Booking Card

- Desktop: `position: sticky` on right column
- Mobile: Below gallery/location

### 6.3 Price Breakdown

- Base (hourly/daily)
- Package (if selected)
- Add-ons
- Discount (if package)
- Total
- "شامل/غير شامل ضريبة" based on `vatIncluded`

---

## 7. Implementation Order

### Phase 1: Schema & CMS Foundation

1. Prisma migration: extend Studio, add StudioPackage, StudioFaq
2. Add Media.sortOrder (or mediaOrder on Studio)
3. StudioService, validators
4. API: GET/PUT `/api/admin/studios/[id]`

### Phase 2: CMS UI

5. Add "الاستوديوهات" to CMS sidebar
6. CMS Studios list page
7. CMS Studio edit page (tabs: Basic, Gallery, Location, Booking, Packages, Add-ons, Included, Rules, Trust, FAQ)

### Phase 3: Public Page

8. Refactor `StudioDetail` into subcomponents
9. Implement all sections from spec
10. Sticky booking panel
11. Price breakdown

### Phase 4: Polish

12. Media upload/reorder in CMS
13. Package & FAQ CRUD in CMS
14. Cache invalidation
15. E2E tests for critical flows

---

## 8. Checklist Before Implementation

- [ ] Confirm `availabilityConfidence` values: `available_now` | `requires_review`
- [ ] Confirm slot duration options: 30 vs 60 minutes
- [ ] Confirm duration options: 1, 2, 3, half_day, full_day (or custom)
- [ ] Confirm VAT handling: included vs excluded
- [ ] Confirm Media: add sortOrder vs use JSON mediaOrder on Studio
- [ ] Permission: reuse `settings.update` or add `cms.studio.*`?

---

## 9. File Summary

| Area                  | New/Modified Files                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Schema**            | `prisma/schema.prisma`                                                                                                                               |
| **Migration**         | `prisma/migrations/YYYYMMDD_add_cms_studio/`                                                                                                         |
| **Services**          | `studio.service.ts`, `studio-package.service.ts`, `studio-faq.service.ts`                                                                            |
| **Validators**        | `studio.validator.ts`, `studio-package.validator.ts`, `studio-faq.validator.ts`                                                                      |
| **API**               | `api/admin/studios/`, `api/admin/studios/[id]/`, `api/admin/studios/[id]/packages/`, `api/admin/studios/[id]/faqs/`, `api/admin/studios/[id]/media/` |
| **CMS Pages**         | `admin/cms/studios/page.tsx`, `admin/cms/studios/[id]/page.tsx`                                                                                      |
| **CMS Components**    | `cms/studios/studio-form-tabs.tsx`, `studio-package-form.tsx`, `studio-faq-form.tsx`                                                                 |
| **Public Components** | `studio-detail.tsx`, `studio-header.tsx`, `studio-gallery.tsx`, `studio-location.tsx`, `studio-booking-panel.tsx`, etc.                              |
| **Sidebar**           | `admin-sidebar.tsx` – add Studios link                                                                                                               |
| **CMS Overview**      | `cms/page.tsx` – add Studios card                                                                                                                    |

---

**Last Updated**: February 20, 2026
