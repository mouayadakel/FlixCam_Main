# Equipment Image Fix – Engineer Handoff

**Date:** 2025-03-10  
**Status:** Implemented (code + validation + audit script)

---

## Root Cause

Public pages depended on `equipment.media[0]` without guaranteeing:

- The media row is a real image (`type: 'image'`)
- The row is not soft-deleted
- The first row is the intended primary image
- The URL is still valid

When the chosen URL failed, the UI degraded to an empty block instead of a visible fallback. The previous placeholder asset was effectively invisible.

**Affected areas:**

- Homepage featured equipment
- Homepage new arrivals
- Public equipment catalog
- Equipment detail gallery
- Future equipment added without images

---

## Fix Strategy (4 Layers)

### 1. Query Fix ✅

All public equipment queries now only read valid image media.

**Pattern for card/grid usage:**

```ts
media: {
  where: { deletedAt: null, type: 'image' },
  orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  take: 1,
  select: { id: true, url: true, type: true },
}
```

**Pattern for full gallery:**

```ts
media: {
  where: { deletedAt: null, type: 'image' },
  orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  select: { id: true, url: true, type: true },
}
```

**Files updated:**

- `src/app/(public)/page.tsx` – featured + new arrivals
- `src/app/api/public/equipment/route.ts` – catalog API
- `src/app/(public)/equipment/[slug]/page.tsx` – detail + recommendations
- `src/lib/services/product-equipment-sync.service.ts` – syncEquipmentToProduct

---

### 2. Frontend Fallback Fix ✅

Failed images now fall back to a visible placeholder instead of an empty block.

**Placeholder:** `/images/equipment-placeholder.svg` (branded, visible)

**Pattern:**

```tsx
const EQUIPMENT_PLACEHOLDER_IMAGE = '/images/equipment-placeholder.svg'
const [imageSrc, setImageSrc] = useState(realUrl || EQUIPMENT_PLACEHOLDER_IMAGE)

const handleImageError = () => {
  setImageSrc((current) =>
    current === EQUIPMENT_PLACEHOLDER_IMAGE ? current : EQUIPMENT_PLACEHOLDER_IMAGE
  )
}

<Image
  src={imageSrc}
  alt={displayName}
  fill
  onError={handleImageError}
  unoptimized={imageSrc.startsWith('http')}
/>
```

**Files updated:**

- `src/components/features/home/home-featured-equipment.tsx`
- `src/components/features/home/home-new-arrivals.tsx`
- `src/components/features/equipment/equipment-card.tsx` – also shows icon + "No image" when placeholder fails
- `src/components/features/equipment/equipment-gallery.tsx`

---

### 3. Data Fix (Production Audit)

Run the audit script to find equipment needing images:

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/audit-equipment-images.ts
```

**SQL for manual checks:**

```sql
-- Equipment with no valid image
SELECT e.id, e.model, e.sku
FROM "Equipment" e
WHERE e."deletedAt" IS NULL
  AND e."isActive" = true
  AND NOT EXISTS (
    SELECT 1 FROM "Media" m
    WHERE m."equipmentId" = e.id
      AND m."deletedAt" IS NULL
      AND m."type" = 'image'
  )
ORDER BY e.model NULLS LAST, e.sku;

-- Media audit
SELECT e.id, e.model, m.id AS media_id, m.url, m.type, m."sortOrder"
FROM "Equipment" e
LEFT JOIN "Media" m ON m."equipmentId" = e.id AND m."deletedAt" IS NULL
WHERE e."deletedAt" IS NULL AND e."isActive" = true
ORDER BY e.id, m."sortOrder" ASC NULLS LAST, m."createdAt" ASC NULLS LAST;
```

**Fix bad records:**

- Mark wrong media as ignored: `UPDATE "Media" SET "deletedAt" = NOW() WHERE id IN (...);`
- Fix wrong type: `UPDATE "Media" SET type = 'image' WHERE id IN (...);`
- Set primary order: `UPDATE "Media" SET "sortOrder" = 0 WHERE id = 'correct_primary_image_id';`

**URL verification:** `curl -I "IMAGE_URL"` – expect `200` and `Content-Type: image/*`

---

### 4. Future Prevention ✅

#### A. Publish/Readiness Rules

- **Create:** Active or featured equipment must have at least one image (validator + service).
- **Update:** Setting `isActive` or `featured` to true requires at least one image (service check).
- **Import sync:** Product→Equipment sets `isActive: false` when product has no images.

#### B. Files Changed for Prevention

- `src/lib/validators/equipment.validator.ts` – create schema refine for image requirement
- `src/lib/services/equipment.service.ts` – update validation before publish
- `src/lib/services/product-equipment-sync.service.ts` – `isActive: hasValidImage` for Product→Equipment sync

#### C. Import Pipeline

- `syncProductToEquipment`: equipment is only set `isActive: true` when `imageUrls.length > 0`.
- Products without `featuredImage` or `galleryImages` produce inactive equipment until images are added.

---

## Deploy Checklist

```bash
cd /home/flixcam.rent
npm ci
npx prisma generate
npm run build
pm2 restart flixcam-rent
curl http://127.0.0.1:3000/api/health
```

---

## Post-Deploy Verification

- [ ] Homepage featured equipment shows real photos or visible placeholder
- [ ] Homepage new arrivals shows real photos or visible placeholder
- [ ] `/equipment` catalog cards never show blank image boxes
- [ ] Equipment detail gallery only loads image media
- [ ] Broken image URLs show placeholder, not empty space
- [ ] Run `scripts/audit-equipment-images.ts` – fix any equipment with no images
- [ ] Try creating equipment with `isActive: true` and no image – should fail validation
- [ ] Import product without images – equipment should be `isActive: false`

---

## Acceptance Criteria

The fix is complete when:

1. Homepage cards never render blank image space
2. Catalog cards never render blank image space
3. Detail gallery only uses image media rows
4. Broken image URLs show visible placeholder
5. Active equipment without images is visible in audit
6. Featured/homepage items cannot be published without valid image
7. New imported equipment cannot enter public catalog with missing/bad image

---

## Control Panel Fixes (Admin/Backend)

### API Routes
- **POST/PATCH** – No longer strip `featured` from body; full payload passed to validator and service.
- Validation now correctly enforces image requirement when `isActive` or `featured` is true.

### Admin Media Queries
All admin and internal equipment queries now use:
- `where: { deletedAt: null, type: 'image' }`
- `orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]`

**Files:** `equipment.service.ts` (getEquipmentList, getEquipmentById), `vendor/equipment/page.tsx`, `cart.service.ts`, `warehouse/scan/route.ts`

### Media Creation with sortOrder
- **Create:** Primary image = `sortOrder: 0`, gallery = `1, 2, 3...`
- **Update:** New featured image gets `sortOrder: 0`; new gallery images get `maxSortOrder + 1`
- **Upload API:** New uploads get `sortOrder: maxSortOrder + 1` (0 when first image)

### Validator
- Create schema: `isActive !== false` or `featured === true` requires at least one image (featuredImageUrl or galleryImageUrls).

---

## Related Files

| File | Change |
| `src/app/(public)/page.tsx` | Image-only media in featured + new arrivals |
| `src/app/api/public/equipment/route.ts` | Image-only media in catalog |
| `src/app/(public)/equipment/[slug]/page.tsx` | Image-only media in detail + recommendations |
| `src/components/features/home/home-featured-equipment.tsx` | Placeholder fallback |
| `src/components/features/home/home-new-arrivals.tsx` | Placeholder fallback |
| `src/components/features/equipment/equipment-card.tsx` | Placeholder + icon fallback |
| `src/components/features/equipment/equipment-gallery.tsx` | Placeholder fallback |
| `src/lib/services/product-equipment-sync.service.ts` | Image-only media, isActive=hasValidImage |
| `src/lib/services/equipment.service.ts` | Validation for isActive/featured |
| `src/lib/validators/equipment.validator.ts` | Create schema image requirement |
| `public/images/equipment-placeholder.svg` | Visible branded placeholder |
| `scripts/audit-equipment-images.ts` | Data audit script |
