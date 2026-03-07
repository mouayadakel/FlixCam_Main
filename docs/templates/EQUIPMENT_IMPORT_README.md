# Equipment Import Template – Data Entry Guide

Use the CSV file **`equipment-import-template.csv`** for bulk data entry. Fill one row per equipment item. Column names and allowed values are below.

---

## Basic fields

| Column | Required | Description | Example / Allowed values |
|--------|----------|-------------|---------------------------|
| **sku** | No (auto-generated if empty) | Unique stock code | `SONY-FX3-001` |
| **model** | **Yes** | Model name | `Sony FX3` |
| **category_slug** | **Yes** | Category slug (must exist in system) | `cameras`, `lighting`, `lenses` |
| **brand_slug** | No | Brand slug (must exist) | `sony`, `arri`, `canon` |
| **condition** | No (default GOOD) | `EXCELLENT`, `GOOD`, `FAIR`, `POOR`, `MAINTENANCE`, `DAMAGED` | `GOOD` |
| **quantityTotal** | No (default 1) | Total units | `1` |
| **quantityAvailable** | No (default 1) | Available to rent | `1` |
| **dailyPrice** | **Yes** | Price per day (SAR) | `500` |
| **weeklyPrice** | No | Price per week (SAR) | `2000` |
| **monthlyPrice** | No | Price per month (SAR) | `6000` |
| **purchasePrice** | No | Internal cost (سعر الشراء) | `45000` |
| **depositAmount** | No | Deposit (مبلغ التأمين) | `5000` |
| **requiresDeposit** | No | true/false | `false` |
| **featured** | No | Show on homepage | `true` or `false` |
| **isActive** | No | Visible in catalog | `true` or `false` |
| **requiresAssistant** | No | Needs operator | `true` or `false` |
| **budgetTier** | No | `ESSENTIAL`, `PROFESSIONAL`, `PREMIUM` or leave empty | `PROFESSIONAL` |
| **warehouseLocation** | No | Location code | `A-01-02` |
| **barcode** | No | Unique barcode | |
| **tags** | No | Comma-separated tags | |
| **boxContents** | No | What's in the box | |
| **bufferTime** | No | Buffer (number) | `0` |
| **bufferTimeUnit** | No | `hours` or `days` | `hours` |

---

## Media

| Column | Required | Description |
|--------|----------|-------------|
| **featuredImageUrl** | Recommended | Main image URL (https) |
| **galleryImageUrls** | No | Multiple URLs separated by semicolon `;` |
| **videoUrl** | No | Product video URL (YouTube, Vimeo, etc.) |

---

## Names (all languages)

| Column | Required | Description |
|--------|----------|-------------|
| **name_ar** | **Yes** (at least one language) | Arabic name |
| **name_en** | No | English name |
| **name_zh** | No | Chinese name |

---

## Descriptions (all languages)

| Column | Description |
|--------|-------------|
| **description_ar**, **description_en**, **description_zh** | Short description (one paragraph) |
| **shortDescription_ar**, **shortDescription_en**, **shortDescription_zh** | One-line summary |
| **longDescription_ar**, **longDescription_en**, **longDescription_zh** | Full description (can be long text) |

---

## SEO (all languages)

| Column | Description |
|--------|-------------|
| **seoTitle_ar**, **seoTitle_en**, **seoTitle_zh** | Meta title (e.g. for Google) |
| **seoDescription_ar**, **seoDescription_en**, **seoDescription_zh** | Meta description |
| **seoKeywords_ar**, **seoKeywords_en**, **seoKeywords_zh** | Meta keywords (comma-separated) |

---

## Specifications

| Column | Description |
|--------|-------------|
| **specifications_notes** | Free text for spec notes; structured specs (sensor size, resolution, etc.) are usually filled in the admin UI or by AI. You can list key specs here for reference. |

---

## Rules

1. **Encoding:** Save the CSV as **UTF-8** (with BOM if using Excel) so Arabic and Chinese display correctly.
2. **Categories/brands:** Use **slugs** that already exist in the system (e.g. from Admin → Inventory → Categories/Brands). If unsure, check existing equipment or ask an admin.
3. **Prices:** Use numbers only, no currency symbols. Decimals allowed (e.g. `499.99`).
4. **Booleans:** Use `true` or `false` (lowercase) for featured, isActive, requiresDeposit, requiresAssistant.
5. **Commas in text:** If a cell contains a comma, wrap the whole cell in double quotes, e.g. `"Description, with comma"`.
6. **Empty cells:** Leave optional fields empty; required fields are **model**, **category_slug**, **dailyPrice**, and at least one of **name_ar**, **name_en**, **name_zh**.

---

## After filling

- Use **Admin → Inventory → Equipment → Import** (or your project’s import flow) to upload the CSV.
- The importer will map these columns to the equipment schema and create/update records.
