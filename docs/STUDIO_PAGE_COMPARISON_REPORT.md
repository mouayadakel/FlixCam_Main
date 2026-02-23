# Studio Page Comparison Report

**Source:** `/Users/mohammedalakel/Desktop/WEBSITE/test rental 3` (Laravel)  
**Target:** FlixCam (Next.js)  
**Date:** February 20, 2026

---

## 1. Main Page (Homepage) – Studio Presence

### Test Rental 3 (Laravel)

| Element        | Location                          | Details                                                                                        |
| -------------- | --------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Hero CTA**   | `welcome.blade.php` lines 119–122 | Two primary buttons: "Browse Equipment" + **"الاستوديوهات" (Studios)** – both equal prominence |
| **CMS-driven** | `hero_button_studios`             | Button label editable via CMS (`getGlobalContent`)                                             |
| **Link**       | `/studios`                        | Direct link to studios listing page                                                            |
| **Icon**       | `bi-camera-reels`                 | Distinct icon for studios vs equipment (`bi-camera`)                                           |

**Main page sections:**

- Hero (equipment + studios CTAs)
- Equipment section (6 items)
- Features section
- Trust signals
- **No dedicated studios preview section** on the main page

### FlixCam (Next.js)

| Element          | Location           | Details                                                |
| ---------------- | ------------------ | ------------------------------------------------------ |
| **HomeStudios**  | `home-studios.tsx` | Full section with top 3 studios, image, rate, capacity |
| **Hero**         | `home-hero.tsx`    | Single primary CTA (equipment-focused); no studios CTA |
| **Feature flag** | `enable_studios`   | Studios section only shows when flag is enabled        |

**Summary:** FlixCam has a dedicated studios section on the homepage; test rental 3 has a hero studios CTA but no studios preview section.

---

## 2. Studios Listing Page – Feature Comparison

### Test Rental 3 – Studios Page (`studios.blade.php`)

| Feature                 | Implementation                                                         | Notes                                 |
| ----------------------- | ---------------------------------------------------------------------- | ------------------------------------- |
| **Search**              | Text input, name + location                                            | Client-side filter on `allStudios`    |
| **Price filters**       | Min/max hourly price                                                   | Numeric inputs, client-side filter    |
| **Results count**       | "تم العثور على X استوديو"                                              | Dynamic count                         |
| **Studio cards**        | Name, description, location, capacity, size (m²), hourly + daily price | Rich metadata                         |
| **Add to cart**         | Modal with date picker + quantity                                      | Start/end date, quantity 1–10         |
| **Price summary**       | Live calculation in modal                                              | Days × daily price × quantity         |
| **Wishlist**            | Toggle per studio                                                      | Add/remove from wishlist              |
| **Details link**        | `/api/v1/studios/{id}`                                                 | API JSON response (not a detail page) |
| **Toast notifications** | Bootstrap Toast                                                        | Success/error feedback                |
| **Loading state**       | Spinner + timeout fallback                                             | 30s timeout with retry                |
| **RTL/Arabic**          | Full RTL, Arabic labels                                                | Consistent with site                  |

### FlixCam – Studios Page (`studios-list-client.tsx`)

| Feature           | Implementation              | Notes                   |
| ----------------- | --------------------------- | ----------------------- |
| **Search**        | ❌ None                     | No search or filters    |
| **Price filters** | ❌ None                     | No price range filter   |
| **Results count** | ❌ None                     | No count display        |
| **Studio cards**  | Name, capacity, hourly rate | Minimal info            |
| **Add to cart**   | ❌ None                     | Link to detail only     |
| **Wishlist**      | ❌ None                     | Not implemented         |
| **Details**       | `/studios/{slug}`           | Proper detail page      |
| **Loading**       | Server-rendered             | No client loading state |

---

## 3. Studio Data Model Comparison

### Test Rental 3 – Studio Model

```php
// Fields
slug, image, hourly_price, daily_price, location, latitude, longitude,
capacity, size, amenities (JSON array), is_active

// Relations
translations (StudioTranslation)
wishlists (MorphMany)
```

**Translations:** `name`, `description` per language (ar/en).

### FlixCam – Studio Model (Prisma)

```prisma
// From schema – inferred from StudioCard usage
id, name, slug, description, capacity, hourlyRate, media, deletedAt, isActive
```

**Missing in FlixCam:** `location`, `latitude`, `longitude`, `size`, `amenities`, `daily_price`, `translations`.

---

## 4. Pros & Features to Adopt from Test Rental 3

### High Priority

| Feature                    | Benefit                                  | Notes                                    |
| -------------------------- | ---------------------------------------- | ---------------------------------------- |
| **Hero CTA for Studios**   | Studios get equal visibility on homepage | Add second hero button next to equipment |
| **Search + price filters** | Better discovery and conversion          | Search by name, filter by min/max hourly |
| **Add to cart from list**  | Direct path to checkout                  | Modal with date + quantity               |
| **Live price summary**     | Clear expectations                       | Days × daily price × quantity            |
| **Results count**          | "X studios found"                        | Improves UX and trust                    |

### Medium Priority

| Feature                  | Benefit                      | Notes                              |
| ------------------------ | ---------------------------- | ---------------------------------- |
| **Location on cards**    | Location-based selection     | Add `location` to schema           |
| **Size (m²)**            | Capacity and space info      | Add `size` field                   |
| **Amenities**            | WiFi, AC, green screen, etc. | Add `amenities` JSON array         |
| **Wishlist for studios** | Engagement and retention     | Same pattern as equipment wishlist |
| **Toast notifications**  | Clear feedback               | Add to cart/remove success         |

### Lower Priority

| Feature                     | Benefit                     | Notes                         |
| --------------------------- | --------------------------- | ----------------------------- |
| **Daily price**             | Alternative pricing display | Hourly vs daily toggle        |
| **Quantity control**        | Multiple studio bookings    | 1–10 days/quantity            |
| **Loading timeout + retry** | Resilience                  | 30s timeout with retry button |

---

## 5. Gaps to Avoid (Test Rental 3 Issues)

| Issue                          | Location                        | Recommendation                                                         |
| ------------------------------ | ------------------------------- | ---------------------------------------------------------------------- |
| **Details link to API**        | `studios.blade.php` line 339    | Use `/studios/{slug}` detail page, not `/api/v1/studios/{id}`          |
| **Duplicate navbar**           | `studios.blade.php` lines 19–51 | Page uses inline nav instead of shared header                          |
| **Broken `checkAvailability`** | Logs show method missing        | Route exists but controller method was missing (now fixed in codebase) |
| **Size data type**             | Seeder `"50 sqm"` vs decimal    | Store `size` as numeric (e.g. 50), unit in UI                          |

---

## 6. Recommended Implementation Order for FlixCam

1. **Hero CTA** – Add studios button to hero (like equipment).
2. **Schema** – Add `location`, `size`, `amenities`, `dailyPrice` to Studio model.
3. **Search + filters** – Client-side search and price range on studios list.
4. **Add to cart** – Modal with date + quantity, add to cart.
5. **Price summary** – Live calculation in add-to-cart modal.
6. **Studio card enhancements** – Location, size, amenities.
7. **Wishlist** – Reuse equipment wishlist pattern for studios.
8. **Results count** – "X studios found" on list page.

---

## 7. Summary

| Aspect                | Test Rental 3             | FlixCam                   |
| --------------------- | ------------------------- | ------------------------- |
| **Main page studios** | Hero CTA only             | Dedicated studios section |
| **Hero studios CTA**  | ✅ Yes                    | ❌ No                     |
| **List filters**      | Search + price            | ✅ None                   |
| **Add to cart**       | ✅ Modal                  | ❌                        |
| **Wishlist**          | ✅ Yes                    | ❌                        |
| **Studio metadata**   | Location, size, amenities | Basic                     |
| **Detail page**       | API JSON                  | ✅ Proper page            |

**Main takeaway:** Test rental 3 has stronger discovery and conversion UX (search, filters, add to cart, wishlist) and richer studio metadata. FlixCam can adopt these patterns while keeping its existing architecture (e.g. detail pages, proper routing).
