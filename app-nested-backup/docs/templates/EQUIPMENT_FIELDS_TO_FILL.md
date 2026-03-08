# Equipment Import — Every Field: What to Fill

This document lists **every single column** in `equipment-import-from-flix-stock.xlsx` / `equipment-import-template.csv` and whether you should fill it, plus any extra fields beyond the ones you already specified.

**Canonical reference:** The Gemini conversation (exported as `Gemini-Spreadsheet Overview and Categories.md`) has the master prompt, spec format examples, and category list. See **`GEMINI_CONVERSATION_REFERENCE.md`** in this folder for a short summary and single-sheet rule.

---

## Single sheet rule (from Gemini)

Import systems usually read only the **first main tab**. Put **all** items on **one sheet** and use **`category_slug`** to distinguish categories (e.g. `cameras`, `lenses`, `lighting`). Do not split equipment into separate tabs per category.

---

## Summary of your rules (already agreed)

- **SEO**: Correct, meaningful, helpful for search; **as many words as possible** (long-tail, not short). Include location (Riyadh, KSA), rental, equipment name, categories; Arabic, English, Chinese.
- **Descriptions**: Professional, creative, unique, seller-focused (e-commerce/rental, make customers want to rent). **Not always** mentioning Riyadh.
- **Specs**: Full 3-block format — **SHORT SPECS**, **FULL SPECS**, **TECHNICIAN SPECS** — with snake_case keys, exact dimensions (mm/cm), resolution with pixel counts, codecs, power, weight, etc. No "unknown"/"N/A"; use [verify] if unsure.
- **Fill**: `boxContents` (if empty), `requiresAssistant` (TRUE for high-end/risky gear), `featured` (hero products), `budgetTier` (Elite / Professional / Essential), `sku` (universal).
- **Do not fill (for now)**: `videoUrl`, `galleryImageUrls`, `warehouseLocation`, `bufferTime`, `bufferTimeUnit`.

---

## Column-by-column: fill or not

| Column | Fill? | Notes |
|--------|-------|--------|
| **source_sheet** | Auto | Set by export (sheet name). Do not manually fill. |
| **sku** | **Yes** | Universal SKU format (e.g. `ARRI-ALEXA35-GOLD`, `SONY-A7SIII-BODY`). Required for tracking. |
| **model** | **Yes** | Display model name. Required by system. |
| **category_slug** | **Yes** | One sheet for all; use slug per row. From Gemini: `cameras`, `lenses`, `lighting`, `monitors`, `tripods-gimbals`, `audio`; plus `accessories` (or `camera-accessories` / `lighting-accessories`) and `live-production` / `mixing` if needed. |
| **brand_slug** | **Yes** | Must exist: `sony`, `arri`, `red`, `tilta`, `teradek`, etc. |
| **condition** | **Yes** | Use: `Cinema Grade`, `Professional Grade`, `Good`, etc. |
| **quantityTotal** | **Yes** | Number of units (usually 1). |
| **quantityAvailable** | **Yes** | Available to rent (usually same as total). |
| **dailyPrice** | **Yes** | Price per day (SAR). Required. |
| **weeklyPrice** | Fill if used | Price per week (SAR). |
| **monthlyPrice** | Fill if used | Price per month (SAR). |
| **purchasePrice** | Optional | Internal cost (سعر الشراء). |
| **depositAmount** | Optional | Deposit (مبلغ التأمين). |
| **requiresDeposit** | **Yes** | `true` or `false`. |
| **featured** | **Yes** | `true` for hero products (e.g. RED Komodo, Teradek Bolt 6), `false` otherwise. |
| **isActive** | **Yes** | `true` = visible in catalog, `false` = hidden. |
| **requiresAssistant** | **Yes** | `true` for high-end/risky gear (e.g. ARRI Alexa 35, Tilta Hydra Arm), `false` otherwise. |
| **budgetTier** | **Yes** | `Elite` / `Professional` / `Essential` (or system values PREMIUM/PROFESSIONAL/ESSENTIAL). |
| **warehouseLocation** | **Do not fill** | Per your request; leave empty for now. |
| **barcode** | Fill if you have it | Unique barcode from Flix Stock. |
| **tags** | **Yes** | Comma-separated; 6–10 relevant tags (e.g. `cinema-camera, 6k, global-shutter, redcode-raw`). |
| **boxContents** | **Yes (if empty)** | Exact list of what’s in the case/kit (e.g. "1x Body, 2x Batteries, 1x Charger, 1x Case"). |
| **bufferTime** | **Do not fill** | Per your request. |
| **bufferTimeUnit** | **Do not fill** | Per your request. |
| **featuredImageUrl** | Fill when you have URL | Main product image. |
| **galleryImageUrls** | **Do not fill** | Per your request (or fill when you have 5+ image URLs). |
| **videoUrl** | **Do not fill** | Per your request. |
| **name_ar** | **Yes** | Arabic name. |
| **name_en** | **Yes** | English name. |
| **name_zh** | **Yes** | Chinese name. |
| **description_ar** | **Yes** | Creative, unique, seller-focused; one paragraph. |
| **description_en** | **Yes** | Same as above, English. |
| **description_zh** | **Yes** | Same as above, Chinese. |
| **shortDescription_ar** | **Yes** | One-line summary, creative. |
| **shortDescription_en** | **Yes** | One-line summary, English. |
| **shortDescription_zh** | **Yes** | One-line summary, Chinese. |
| **longDescription_ar** | **Yes** | Full description, creative and unique. |
| **longDescription_en** | **Yes** | Full description, English. |
| **longDescription_zh** | **Yes** | Full description, Chinese. |
| **seoTitle_ar** | **Yes** | Long, keyword-rich; include rental, location, equipment name. |
| **seoTitle_en** | **Yes** | Same, English. |
| **seoTitle_zh** | **Yes** | Same, Chinese. |
| **seoDescription_ar** | **Yes** | **Lots of words**; long-tail SEO; rental, Riyadh/KSA, categories. |
| **seoDescription_en** | **Yes** | Same, English. |
| **seoDescription_zh** | **Yes** | Same, Chinese. |
| **seoKeywords_ar** | **Yes** | Many keywords; rental, location, equipment, categories. |
| **seoKeywords_en** | **Yes** | Same, English. |
| **seoKeywords_zh** | **Yes** | Same, Chinese. |
| **specifications_notes** | **Yes** | **Full 3-block**: SHORT SPECS (bullets), FULL SPECS (key: value), TECHNICIAN SPECS (precise). Snake_case keys; exact mm/cm, codecs, power, weight; no "N/A". |

---

## Fields to fill *beside* the ones you already told us

These are the **additional** fields (beyond SEO, descriptions, specs, boxContents, requiresAssistant, featured, budgetTier, sku) that you should fill:

1. **model** — Required; display name of the product.
2. **category_slug** — Required; must match system categories.
3. **brand_slug** — Required for filtering and display.
4. **condition** — e.g. Cinema Grade, Professional Grade.
5. **quantityTotal** / **quantityAvailable** — Usually 1; needed for availability.
6. **dailyPrice** (and **weeklyPrice** / **monthlyPrice** if you use them) — Required for rental.
7. **requiresDeposit** — true/false.
8. **isActive** — true = visible in catalog.
9. **tags** — Comma-separated; important for search and filters.
10. **shortDescription_ar / _en / _zh** — One-line summaries; often missed but needed for cards and previews.
11. **longDescription_ar / _en / _zh** — Full editorial; creative and unique.
12. **featuredImageUrl** — When you have the main image URL (single field you may have meant beside the ones you listed).
13. **barcode** — If you have it from Flix Stock, fill for inventory sync.

**Do not fill (as requested):** `videoUrl`, `galleryImageUrls`, `warehouseLocation`, `bufferTime`, `bufferTimeUnit`.

---

## Spec format reminder (SHORT / FULL / TECHNICIAN)

- **SHORT SPECS**: 3–5 bullet points; rental highlights, key features, typical use; one line each; no units unless essential.
- **FULL SPECS**: Complete customer-facing list; dimensions in mm/cm, resolution with pixel counts, codecs with ratios, ranges (e.g. ISO 80–102,400), weight with condition, power (V/W/Wh); snake_case keys, one per line.
- **TECHNICIAN SPECS**: Same keys as full; values precise for crew: standards (Rec. 709, DCI-P3), tolerances, flange distance (mm), exact connectors (HDMI 2.1, SDI 12G), frame rates per resolution, calibration/compatibility notes. No "unknown"/"N/A" — use best professional estimate or [verify].

Use manufacturer / B&H / CineD etc. for accuracy (see `SPEC_SOURCES_AI_SEARCH.md` and `SPEC_EXAMPLE_CHATGPT_PROMPT.md`).
