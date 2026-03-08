# Equipment Import — Reference from Gemini Conversation

This doc captures the **canonical answers** from the Gemini conversation (exported as `Gemini-Spreadsheet Overview and Categories.md`). Use it as the source of truth for structure, categories, and content rules.

---

## 1. Single sheet, no per-category tabs

> **From Gemini:**  
> The new sheet is an "equipment-import-template." If you upload it into rental software or a website, **do not create separate tabs for each category.** Import systems usually only read the **first main tab**. Put **all** items on the **single main sheet** and use the **`category_slug`** column to label them (e.g. Camera, Lenses, Lighting).

- **Rule:** One data sheet; categorize with `category_slug`, not with multiple tabs.

---

## 2. Canonical categories (display → category_slug)

From the Gemini conversation, the inventory is grouped as:

| Display name (Gemini) | Use as `category_slug` |
|----------------------|------------------------|
| Camera | `cameras` |
| Camera Accessories | `accessories` or `camera-accessories` |
| Lenses | `lenses` |
| Tripods & Gimbals | `tripods-gimbals` |
| Lighting | `lighting` |
| Lighting Accessories | `accessories` or `lighting-accessories` |
| Monitors | `monitors` |
| Batteries & Sound | `audio` and/or `power` / `batteries` (split if your system has both) |
| Live & Mixing | `live-production` or `mixing` |

**Gemini prompt explicitly lists:** `cameras`, `lenses`, `lighting`, `monitors`, `tripods-gimbals`, `audio`.

---

## 3. Columns that must be filled (from Gemini “empty columns” list)

### 1) Language & translation
- **Names:** `name_ar`, `name_zh` (and `name_en`).
- **Descriptions:** `description_ar`, `description_en`, `description_zh`.
- **Short:** `shortDescription_ar`, `shortDescription_en`, `shortDescription_zh`.
- **Long:** `longDescription_ar`, `longDescription_en`, `longDescription_zh`.

### 2) SEO
- **Titles:** `seoTitle_ar`, `seoTitle_en`, `seoTitle_zh`.
- **Descriptions:** `seoDescription_ar`, `seoDescription_en`, `seoDescription_zh`.
- **Keywords:** `seoKeywords_ar`, `seoKeywords_en`, `seoKeywords_zh`.

### 3) Specs, tags, brand
- **Brand:** `brand_slug`.
- **Categorization:** `category_slug`, `tags`.
- **Technical:** `specifications_notes`.

### 4) Other (operational)
- **Media:** `featuredImageUrl`, `galleryImageUrls`, `videoUrl` (fill when you have URLs).
- **Pricing & logistics:** `dailyPrice`, `weeklyPrice`, `monthlyPrice`, `condition`, `warehouseLocation`, etc.

---

## 4. Content rules (from the same conversation)

- **Descriptions:** Unique, thoughtful, creative, suitable for e‑commerce/rental; make the customer want to rent. Not always mentioning Riyadh.
- **SEO:** “A lot” of words; good for search; Arabic, English, Chinese; include Riyadh, KSA, rental, equipment name, categories.
- **Specs:** Full specs from official sites, B&H, Grab Grip, etc. Use the 3-block format (SHORT SPECS, FULL SPECS, TECHNICIAN SPECS). See `SPEC_SOURCES_AI_SEARCH.md` and `SPEC_EXAMPLE_CHATGPT_PROMPT.md`.

---

## 5. Master prompt for an LLM

The Gemini conversation includes a **master prompt** that produces one full row (names, descriptions, SEO, brand_slug, category_slug, tags, specifications_notes) in three languages. It is in the exported .md around the section titled *"Copy and paste everything below this line into your LLM"*:

- **Role:** Cinema equipment specialist + copywriter for a film gear rental house + SEO strategist.
- **Output:** One Markdown table row with columns in a fixed order (name_ar/en/zh, descriptions, short/long, seo titles/descriptions/keywords, brand_slug, category_slug, tags, specifications_notes).
- **Specs:** Three blocks (SHORT SPECS, FULL SPECS, TECHNICIAN SPECS); research from manufacturer, B&H, CVP, CineD.

For the exact prompt text, use the file:  
**`Gemini-Spreadsheet Overview and Categories.md`** (in your Downloads or wherever you keep the export).

---

## 6. Spec sources (from the same conversation)

The conversation embeds the full “Resources AI Should Search for Equipment Specs” list (manufacturers, B&H, CVP, CineD, etc.). A project version lives in:

- `docs/templates/SPEC_SOURCES_AI_SEARCH.md`
- `docs/templates/SPEC_EXAMPLE_CHATGPT_PROMPT.md`

---

## 7. Where the “better answers” live

- **Structure:** Single sheet + `category_slug` (this doc + Gemini .md).
- **Which columns to fill:** Section 3 above; also `EQUIPMENT_FIELDS_TO_FILL.md`.
- **Exact prompt and examples:** In `Gemini-Spreadsheet Overview and Categories.md` (long-form conversation with examples for Sony FX3, Zoom F6, etc.).

When in doubt, prefer the Gemini .md for prompt wording, spec format examples, and SEO/description tone.
