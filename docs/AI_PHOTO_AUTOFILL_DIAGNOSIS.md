# AI Photo Auto-Fill Diagnosis & Fixes

## Executive Summary

The AI photo auto-fill pipeline has **several critical bugs** that explain why:
1. **Not all equipment have photos** — Some products get `photoStatus: 'not_found'` or never get images
2. **Wrong/irrelevant content** — Unsplash and Pexels are auto-approved without Gemini validation; generic stock photos can slip through
3. **Equipment shows no photos** — The `run-image-sourcing.ts` script updates Product but **never syncs to Equipment**, so the public catalog shows stale/empty images

---

## Root Causes Identified

### 1. **run-image-sourcing.ts does NOT sync Product → Equipment** (Critical)

**Location:** `scripts/run-image-sourcing.ts`

**Problem:** After updating `Product.featuredImage` and `Product.galleryImages`, the script never calls `syncProductToEquipment(productId)`. The public equipment API reads from `Equipment.media`, which is populated by `syncProductToEquipment`. So Product gets new images, but Equipment (what users see) does not.

**Fix:** Call `syncProductToEquipment(product.id)` after each successful Product update.

---

### 2. **ALLOWED_DOMAINS blocks Google CSE and DALL-E** (Critical)

**Location:** `src/lib/services/image-processing.service.ts` — `ALLOWED_DOMAINS` and `isValidImageUrl()`

**Problem:** `processImageFromUrl()` rejects any URL whose domain is not in the allowlist:
- `images.unsplash.com` ✅
- `images.pexels.com` ✅
- **Google CSE** returns links from manufacturer sites, Amazon, B&H, etc. — **all rejected**
- **DALL-E** returns URLs from `oaidalleapiprodscus.blob.core.windows.net` — **rejected**

So the pipeline effectively only uses: Brand assets, Unsplash, Pexels. Google CSE and DALL-E contribute **zero** images.

**Fix:** Add a "pipeline mode" that bypasses domain allowlist for URLs coming from trusted APIs (Google CSE, DALL-E), while still enforcing SSRF checks (no private IPs, localhost, etc.).

---

### 3. **needsPhotos check is too narrow** (High)

**Location:** `src/lib/queue/ai-processing.worker.ts` line 351–352

**Problem:**
```ts
const needsPhotos = !product.featuredImage || product.featuredImage === '/images/placeholder.jpg'
```

This only triggers re-sourcing when:
- `featuredImage` is empty, OR
- `featuredImage` is exactly `/images/placeholder.jpg`

It does **not** trigger for:
- `placehold.co` URLs
- Other placeholder patterns
- Wrong/irrelevant images that should be replaced

**Fix:** Use a broader placeholder check (e.g. regex or helper) that includes `placehold.co`, `placeholder`, etc.

---

### 4. **Unsplash and Pexels are NOT validated by Gemini** (Medium)

**Location:** `src/lib/services/image-sourcing.service.ts` — `sourceImages()`

**Problem:** 
- Brand assets → auto-approved
- Unsplash → auto-approved (no validation)
- Pexels → auto-approved (no validation)
- Google CSE → Gemini validation (score ≥ 0.5)
- DALL-E → Gemini validation (score ≥ 0.5)

Unsplash and Pexels can return generic stock photos (e.g. "camera" → random camera) that don't match the specific product. These are never checked by Gemini Vision.

**Recommendation:** Consider adding optional Gemini validation for Unsplash/Pexels when `GEMINI_API_KEY` is set, with a lower threshold (e.g. 0.4) to avoid over-rejection.

---

### 5. **Missing API keys** (Configuration)

**Required for photo auto-fill:**
- At least one of: `UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY`, or `GOOGLE_CUSTOM_SEARCH_API_KEY` + `GOOGLE_SEARCH_ENGINE_ID`
- `CLOUDINARY_*` for uploading sourced images
- `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` for validating Google/DALL-E images
- `OPENAI_API_KEY` for DALL-E fallback

If no image API keys are set, `sourceImages()` returns `[]` and products get `photoStatus: 'not_found'`.

---

## Data Flow

```
Product (featuredImage, galleryImages)
    ↓ syncProductToEquipment()
Equipment.media (Media records)
    ↓ public API
GET /api/public/equipment → media[0].url
```

If `syncProductToEquipment` is not called after Product image update, Equipment.media stays stale.

---

## Files Changed (Fixes)

| File | Change |
|------|--------|
| `scripts/run-image-sourcing.ts` | Add `syncProductToEquipment` after Product update |
| `src/lib/services/image-processing.service.ts` | Add pipeline mode for external API URLs |
| `src/lib/services/image-sourcing.service.ts` | Pass pipeline flag when calling processImageFromUrl |
| `src/lib/queue/ai-processing.worker.ts` | Broaden needsPhotos check |

---

## Verification Checklist

After applying fixes:

1. [ ] Run `npx ts-node scripts/run-image-sourcing.ts` — verify Equipment gets updated images (check Media table)
2. [ ] Confirm `.env` has at least one image API key (Pexels, Unsplash, or Google CSE)
3. [ ] Confirm `CLOUDINARY_*` is set
4. [ ] For products with `photoStatus: 'not_found'`, re-run AI processing or image sourcing script
