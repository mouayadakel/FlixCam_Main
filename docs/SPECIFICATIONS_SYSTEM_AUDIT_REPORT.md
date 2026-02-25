# Specifications System — Full Audit Report

**Date:** February 25, 2026  
**Scope:** End-to-end audit of the specifications system. No code changes made.

---

## STEP 1 — Files Read

| File | Status |
|------|--------|
| `src/lib/types/specifications.types.ts` | ✅ Read |
| `src/lib/utils/specifications.utils.ts` | ✅ Read |
| `src/lib/ai/spec-templates.ts` | ✅ Read |
| `src/lib/services/ai-spec-parser.service.ts` | ✅ Read |
| `src/lib/services/spec-parser.service.ts` | Removed (was legacy; all callers use ai-spec-parser) |
| `src/app/api/admin/equipment/ai-suggest/route.ts` | ✅ Read |
| `src/app/api/admin/equipment/fetch-specs/route.ts` | ✅ Read |
| `src/app/api/admin/equipment/migrate-specs/route.ts` | ✅ Exists |
| `src/components/features/equipment/specifications-display.tsx` | ✅ Read |
| `src/components/forms/specifications-editor.tsx` | ✅ Exists |
| `src/lib/services/content-health.service.ts` | ✅ Read (getSpecsCompleteness) |
| `src/lib/services/product-equipment-sync.service.ts` | ✅ Exists |
| `prisma/schema.prisma` | ✅ Read (Equipment, Product, ProductTranslation) |

---

## STEP 2 — Answers

### A. Data Flow

#### 1. Where does a specification value start its life?

| Source | Entry Point | Format |
|--------|-------------|--------|
| **Excel import** | `src/lib/services/import-worker.ts` — `normalizeSpecs()`, column mapping | Flat `Record<string, unknown>` |
| **Manual entry** | `SpecificationsEditor` → form submit → `EquipmentService.update` | Structured or Flat |
| **AI Suggest** | `POST /api/admin/equipment/ai-suggest` → `inferMissingSpecs()` | Flat (AI keys) → merged → `convertFlatToStructured` |
| **URL extraction** | `POST /api/admin/equipment/fetch-specs` → `AIService.extractSpecificationsFromProductPage` | Structured (groups, highlights, quickSpecs) |

#### 2. What exact format is it stored in the database?

**Equipment.specifications** (Json?) and **ProductTranslation.specifications** (Json?) accept both:

**Flat example:**
```json
{
  "sensor_size": "Super 35mm (25.1 × 13.1 mm)",
  "weight_kg": "1.84 kg (body only)",
  "mount_type": "Sony E-mount",
  "max_video_resolution": "6144 × 3456 (6K DCI)"
}
```

**Structured example:**
```json
{
  "highlights": [
    { "icon": "star", "label": "Sensor Size", "value": "Super 35mm", "sublabel": "25.1 × 13.1 mm" }
  ],
  "quickSpecs": [
    { "icon": "star", "label": "Sensor Size", "value": "Super 35mm" }
  ],
  "groups": [
    {
      "label": "Key Specs",
      "labelAr": "المواصفات الرئيسية",
      "icon": "star",
      "priority": 1,
      "specs": [
        { "key": "sensor", "label": "Sensor", "value": "Super 35mm", "highlight": true }
      ]
    }
  ]
}
```

#### 3. Exact path from database → API → component → screen

**Public equipment detail:**
```
DB: Equipment.specifications (Json)
  → src/app/(public)/equipment/[slug]/page.tsx (getEquipment) — line 70: specifications: e.specifications
  → EquipmentDetail component — equipment.specifications
  → SpecificationsDisplay (line 329) — specifications prop
  → isStructuredSpecifications? → SpecHeroCard + GroupedSpecsDesktop/Mobile OR FlatSpecsTable
```

**Admin equipment view:**
```
DB: Equipment.specifications
  → src/app/admin/(routes)/inventory/equipment/[id]/page.tsx — fetch equipment
  → SpecificationsDisplay (line 669) — equipment.specifications
  → Same render logic
```

---

### B. AI Inference

#### 4. What exact keys does the AI generate for Cameras category?

From `src/lib/ai/spec-templates.ts` lines 8–95, **ALL** Cameras keys:

```
sensor_size, sensor_type, effective_pixels, resolution, max_photo_resolution, aspect_ratio,
bit_depth, color_sampling, dynamic_range_stops, dual_native_iso, base_iso, max_iso, color_science,
max_video_resolution, max_framerate, max_framerate_4k, max_framerate_1080p, slow_motion, codec,
internal_codec, external_codec, raw_recording, log_gamma, hdr_mode, rolling_shutter,
autofocus, af_type, af_points, face_eye_tracking, ibis, ibis_stops,
mount_type, built_in_nd, nd_stops, flange_distance,
sdi_output, hdmi_output, hdmi_version, timecode_io, genlock, audio_inputs, audio_input_type,
headphone_jack, speaker, usb_type, ethernet, wifi, bluetooth, wireless_video, remote_control,
media_type, card_slots, max_card_speed, internal_storage,
lcd_size, lcd_resolution, lcd_type, lcd_touchscreen, lcd_articulating, evf_resolution, evf_magnification,
battery_type, battery_life_minutes, usb_charging, power_draw_watts, dc_input, v_mount_plate,
weight_kg, weight_body_only, dimensions_cm, body_material, weather_sealed, operating_temp, humidity_range,
tally_light, control_protocol, multi_cam_sync
```

**Total: 95 keys.**

#### 5. What prompt is sent to the LLM?

From `src/lib/services/ai-spec-parser.service.ts` lines 66–152:

```
You are a world-class cinema equipment specifications expert for FlixCam...

Product name: ${name}
Brand: ${product.brand?.name ?? 'Unknown'}
Category: ${categoryName}
Description: ${desc}
Existing specs (partial): ${JSON.stringify(existingSpecs)}
Missing keys to infer: ${missingKeys.join(', ')}

MANDATORY RULE: FILL EVERY SINGLE SPEC — NO EXCEPTIONS
[... 14 Creative Measurement Rules ...]

Return a JSON array. Each object: { "key": "spec_name", "value": "detailed value...", "confidence": 0-100 }
Output ONLY the JSON array, no markdown, no explanation.
```

#### 6. How does the AI decide what is "missing"?

**Function:** `inferMissingSpecs` in `src/lib/services/ai-spec-parser.service.ts`  
**Logic (lines 43–50):**

```typescript
const expected = getExpectedSpecs(categoryName)  // from spec-templates.ts
const existingSpecs = (firstTranslation?.specifications as Record<string, unknown>) ?? {}
const missingKeys = expected.filter((k) => {
  const v = existingSpecs[k]
  return v == null || (typeof v === 'string' && (v as string).trim() === '')
})
```

- Uses `getExpectedSpecs(categoryName)` from `spec-templates.ts`.
- Compares with `existingSpecs` (flat keys).
- **Issue:** If `existingSpecs` is Structured, it is not flattened first — `existingSpecs['sensor_size']` would be undefined because Structured stores specs inside `groups[].specs`, not at top level.

#### 7. What happens after inferMissingSpecs returns?

From `src/app/api/admin/equipment/ai-suggest/route.ts`:

1. **Lines 116–119:** If `existingSpecs` is Structured, flatten with `flattenStructuredSpecs`.
2. **Lines 123–138:** Filter specs (no unknown/N/A), merge into `mergedSpecs` (flat).
3. **Lines 183–186:** `convertFlatToStructured(mergedSpecs, categoryTemplateName)` → `structuredSpecs`.
4. **Lines 189–230:** Build `highlights` and `quickSpecs` from `topHighlightKeys` and first 6 keys.
5. **Lines 232–273:** Return `specs` (flat), `structuredSpecs`, and other fields. **No DB write** — suggest-only.

---

### C. Display

#### 8. What keys does categoryTemplates expect for Cameras?

From `src/lib/utils/specifications.utils.ts` lines 201–270, **cameras** template keys:

**Key Specs (priority 1):** `sensor`, `video`, `iso`, `autofocus`, `stabilization`  
**Body & Display (priority 2):** `weight`, `dimensions`, `display`, `evf`, `weather`  
**Storage & Power (priority 3):** `recording`, `battery`, `usbCharging`  
**Connectivity (priority 4):** `wifi`, `bluetooth`, `hdmi`, `mount`

**Total: 18 keys.** All use camelCase or short names (e.g. `sensor`, `video`, `weight`, `mount`).

#### 9. How does convertFlatToStructured() work exactly?

From `src/lib/utils/specifications.utils.ts` lines 81–134:

**Step 1:** Filter out `RESERVED_KEYS` (mode, html, highlights, quickSpecs, groups).  
**Step 2:** Get template: `categoryTemplates[categoryHint.toLowerCase()]`.  
**Step 3:** For each template group, for each template spec:
- `entries.find(([k]) => k === s.key || k.toLowerCase() === s.key.toLowerCase())`
- If match: use `pair[1]` as value.
- If no match: keep template's empty `s.value`.  
**Step 4:** Build `usedKeys` from all template spec keys.  
**Step 5:** `remaining = entries.filter(([k]) => !usedKeys.has(k.toLowerCase()))`.  
**Step 6:** Push all `remaining` into `groups[0].specs` with `key.replace(/([A-Z])/g, ' ')` as label.  
**Step 7:** Return `{ groups }` (no highlights/quickSpecs from this function).

**Cameras example:** AI returns `sensor_size`, `weight_kg`, `mount_type`. Template expects `sensor`, `weight`, `mount`. No match → template slots stay empty, AI keys go to `remaining` → all land in `groups[0]` ("Key Specs") as extra specs with raw key names as labels.

#### 10. What happens to a key that doesn't match any group?

It goes into `remaining` (line 106) and is appended to `groups[0].specs` (lines 108–116). So unmatched keys end up in the first group with:
- `key`: original key (e.g. `sensor_size`)
- `label`: key with spaces (e.g. `sensor size`)
- `value`: the value
- `type`: `'text'`

---

### D. Gaps & Real Issues

#### 11. Key mismatch: spec-templates vs categoryTemplates (Cameras)

| aiKey (spec-templates) | expectedKey (categoryTemplates) | match |
|------------------------|---------------------------------|-------|
| sensor_size | sensor | false |
| sensor_type | — | false (no template key) |
| effective_pixels | — | false |
| resolution | — | false |
| max_photo_resolution | — | false |
| aspect_ratio | — | false |
| bit_depth | — | false |
| color_sampling | — | false |
| dynamic_range_stops | — | false |
| dual_native_iso | — | false |
| base_iso | iso | false (different key) |
| max_iso | iso | false |
| color_science | — | false |
| max_video_resolution | video | false |
| max_framerate | — | false |
| codec | — | false |
| mount_type | mount | false |
| weight_kg | weight | false |
| weight_body_only | weight | false |
| dimensions_cm | dimensions | false |
| wifi | wifi | true |
| bluetooth | bluetooth | true |
| hdmi_output | hdmi | false |
| ... | ... | ... |

**Only `wifi` and `bluetooth` match.** All other AI keys either have no template slot or use different names.

#### 12. Is getSpecsCompleteness() correct for Structured specs?

**No.** From `src/lib/services/content-health.service.ts` lines 65–72:

```typescript
function getSpecsCompleteness(specifications: unknown): number {
  if (specifications == null || typeof specifications !== 'object') return 0
  const obj = specifications as Record<string, unknown>
  const keys = Object.keys(obj)
  if (keys.length === 0) return 1
  const filled = keys.filter((k) => isFilled(obj[k]))
  return filled.length / keys.length
}
```

**Example for Structured:**
```json
{ "highlights": [...], "quickSpecs": [...], "groups": [{ "specs": [{ "key": "sensor", "value": "Super 35" }] }] }
```

- `keys` = `['highlights', 'quickSpecs', 'groups']`
- `filled` = keys where `obj[k]` is filled (arrays/objects with content)
- Result: completeness is based on top-level keys, not actual spec values. A Structured object with many filled specs can get a low score if `highlights` or `quickSpecs` are empty.

#### 13. dangerouslySetInnerHTML without sanitization?

| File | Line | Content | Sanitized? |
|------|------|---------|------------|
| `src/app/admin/(routes)/inventory/equipment/[id]/page.tsx` | 640 | `trans.longDescription` / `trans.description` | Yes — `sanitizeHtml()` |
| `src/app/admin/(routes)/inventory/equipment/[id]/page.tsx` | 894 | `equipment.boxContents` | Yes — `sanitizeHtml()` |
| `src/app/portal/contracts/[id]/page.tsx` | 125 | contract content | Unknown (not specs) |
| `src/app/portal/contracts/[id]/sign/page.tsx` | 143 | contract content | Unknown |
| `src/app/layout.tsx` | 52 | LOCALE_INIT_SCRIPT | Static, not user content |
| `src/app/(public)/studios/[slug]/page.tsx` | 191 | JSON.stringify(jsonLd) | JSON, not HTML |
| `src/app/(public)/equipment/[slug]/page.tsx` | 211 | JSON.stringify(jsonLd) | JSON, not HTML |

**Specifications:** Rendered by `SpecificationsDisplay` as text in `<span>` elements — React escapes, no `dangerouslySetInnerHTML`.  
**boxContents:** Uses `sanitizeHtml` (DOMPurify).  
**Note:** There is no `equipment.specifications.html` field in the schema. The audit doc’s mention of it appears to be incorrect.

#### 14. Are specBlacklist, specConfidence, specLastInferredAt, specSource actually READ?

| Field | Written | Read |
|-------|---------|------|
| **specSource** | Yes — `product-equipment-sync.service.ts` lines 124, 153 (`'import'`) | No — never read in codebase |
| **specConfidence** | No — never written | No |
| **specLastInferredAt** | No — never written | No |
| **specBlacklist** | No — never written | No |

`specConfidences` in `ai-suggest/route.ts` (lines 150–154) is computed and returned in the API response only; it is not persisted to `Equipment.specConfidence`.

---

### E. Current State

| Part | Status | Notes |
|------|--------|-------|
| AI key generation | ✅ Working | Uses spec-templates, returns flat keys with values |
| Key → group mapping | ❌ Broken | AI keys (sensor_size, weight_kg) don't match template keys (sensor, weight) |
| Structured display | ⚠️ Partial | Works when data is already Structured; AI-suggested specs end up in one group |
| Flat display | ✅ Working | FlatSpecsTable shows all key-value pairs |
| Completeness score | ❌ Broken | getSpecsCompleteness wrong for Structured |
| XSS protection | ✅ Working | boxContents/description use sanitizeHtml; specs rendered as text |
| specConfidence usage | ❌ Not used | Never stored or read |
| specBlacklist usage | ❌ Not used | Never stored or read |
| Product ↔ Equipment sync | ⚠️ Partial | Product→Equipment syncs specs; Equipment→Product uses equipment.specifications for new ProductTranslations |
| URL spec extraction | ✅ Working | Returns Structured directly |

---

## STEP 3 — Summary Table

| Component | Status | Main Issue |
|-----------|--------|------------|
| AI key generation | ✅ Working | — |
| Key → group mapping | ❌ Broken | AI keys (sensor_size, weight_kg) ≠ categoryTemplate keys (sensor, weight) |
| Structured display | ⚠️ Partial | AI-suggested specs not grouped correctly |
| Flat display | ✅ Working | — |
| Completeness score | ❌ Broken | getSpecsCompleteness treats Structured as top-level keys only |
| XSS protection | ✅ Working | boxContents/description sanitized; specs are text |
| specConfidence usage | ❌ Not used | Schema field never written or read |
| specBlacklist usage | ❌ Not used | Schema field never written or read |
| Product ↔ Equipment sync | ⚠️ Partial | One-way sync; Equipment edits don't update Product |
| URL spec extraction | ✅ Working | — |

---

## Top 5 Recommended Fixes (Priority Order)

### 1. Fix Key Mismatch (P0)

**File:** `src/lib/utils/specifications.utils.ts`  
**Function:** `convertFlatToStructured`  
**Change:** Add `KEY_ALIASES` mapping (e.g. `sensor_size`→`sensor`, `weight_kg`→`weight`, `mount_type`→`mount`, `max_video_resolution`→`video`, `dimensions_cm`→`dimensions`) and resolve AI keys to template keys before matching.

**Alternative:** Align `categoryTemplates` in `specifications.utils.ts` with `CATEGORY_SPEC_TEMPLATES` keys in `spec-templates.ts` for Cameras (and other categories).

---

### 2. Fix getSpecsCompleteness for Structured (P0)

**File:** `src/lib/services/content-health.service.ts`  
**Function:** `getSpecsCompleteness` (lines 65–72)  
**Change:** If `isStructuredSpecifications(specs)`, use `flattenStructuredSpecs` and compute completeness from the flattened key-value map. Otherwise keep current logic for Flat.

---

### 3. Flatten existingSpecs Before inferMissingSpecs (P1)

**File:** `src/app/api/admin/equipment/ai-suggest/route.ts`  
**Change:** Before building `productLike`, if `existingSpecs` is Structured, call `flattenStructuredSpecs(existingSpecs)` so `inferMissingSpecs` receives flat keys and can correctly detect missing specs.

---

### 4. Add categoryTemplates for Grip and Accessories (P1)

**File:** `src/lib/utils/specifications.utils.ts`  
**Change:** Add `grip` (or map Grip→tripods) and `accessories` to `categoryTemplates` so `convertFlatToStructured` has templates for these categories.

---

### 5. Use specConfidence / specLastInferredAt (P2)

**File:** `src/app/api/admin/equipment/ai-suggest/route.ts` (or equipment update API)  
**Change:** When applying AI-suggested specs, persist `specConfidence` (e.g. average or min) and `specLastInferredAt` on Equipment. Optionally use `specBlacklist` to skip suggesting certain keys. Read these in the UI to show confidence and last inference time.

---

## Unexpected Findings

1. **spec-parser.service.ts has been removed;** all callers use `ai-spec-parser.service.ts` (ai-suggest, backfill.worker, ai-processing.worker, import-worker).
2. **migrate-specs uses category slug/name:** `categoryHint = eq.category?.slug ?? eq.category?.name` — `categoryTemplates` keys are lowercase names (cameras, lenses). Slug may differ (e.g. `cinema-cameras` vs `cameras`). May need `resolveTemplateName`.
3. **SpecificationsEditor onAiInfer merge:** When merging AI-inferred flat into editor (lines 409–421), it only merges `inferred.groups[0]?.specs` into `firstGroup`. If `convertFlatToStructured` put everything in group 0 due to key mismatch, this still works, but grouping remains wrong.

---

**End of Audit Report**
