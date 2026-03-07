# Inventory Import – Requirements & Checklist

Used to verify the import flow at **Admin → Inventory → Import** (`/admin/inventory/import`) with files such as **Flix Stock inventory (1).xlsx**.

---

## 1. File requirements

- **Formats:** `.xlsx`, `.xls`, `.csv`, `.tsv`
- **Max size:** 50 MB
- **Max rows:** 5,000 (per file)
- **Sheets:** At least one sheet with data. Each sheet must be **mapped to a category** before import.

---

## 2. Column mapping (what the system expects)

### Required for each row

| Purpose          | Accepted column headers (any one)                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Product name** | `Name`, `name`, `Product Name`, `Product`, `اسم`                                                                                |
| **Category**     | Set in UI: map the sheet to a category (required).                                                                              |
| **Brand**        | `Brand`, `brand`, `Brand Name`, `brand_name`, `Manufacturer`, `الماركة`, `العلامة التجارية` — defaults to `Unknown` if missing. |

### Optional (pricing & inventory)

- **Daily price:** `Daily Price`, `Price Daily`, `daily_price`, `price_daily`, `السعر اليومي`
- **Weekly/Monthly:** `Weekly Price`, `Monthly Price`, or derived from daily × factors (defaults: 4 and 12).
- **Quantity/stock:** `Quantity`, `Qty`, `quantity`, `qty`, `Stock`, `stock`
- **Deposit:** `Deposit`, `deposit_amount`

### Optional (content & media)

- **Descriptions:** `Short Description`, `Long Description`, `short_description`, `long_description`, `وصف مختصر`, `وصف طويل`
- **SEO:** `SEO Title`, `SEO Description`, `SEO Keywords` (and `*_ar` / Arabic variants)
- **Translations:** `الاسم`, `Name (AR)`, `name_ar`, plus Arabic description/SEO columns
- **Media:** `Featured Image`, `featured_image`, `Gallery`, `gallery_images`, `Video`, `video_url`
- **Other:** `SKU`, `sku`, `Tags`, `Related Products`
- **Specifications:** `Specifications` (must be valid JSON if present)

---

## 3. Validation rules (from code)

- Rows **without a product name** (using the accepted name columns above) are **skipped** and listed as “Ignored rows (missing Name)”.
- Rows with a name are counted as valid; current validation does not add extra errors/warnings (summary only).
- **Category mapping:** Every selected sheet must have a category chosen. “Start import” is disabled until all selected sheets are mapped.

---

## 4. Flow checklist (manual test)

1. **Open:** `http://localhost:3002/admin/inventory/import`
2. **Upload:** Choose **Flix Stock inventory (1).xlsx** (or your file).
3. **Parse:** File is parsed; sheets and preview rows appear.
4. **Map categories:** For each sheet you want to import, select **Category** (and optional **Subcategory**).
5. **Row selection:** Optionally limit which rows to import (default: all rows with a name).
6. **AI Preview (optional):** Click **Preview** to get AI suggestions for SEO/translations (requires `GEMINI_API_KEY` or `OPENAI_API_KEY` in `.env` and optionally `AI_PROVIDER=gemini`).
7. **Import mode:** Choose “Preview + Edit (AI)”, “Import then fill”, or “Import + Auto-fill”.
8. **Start import:** Click **Start import**; job runs and products are created.

---

## 5. Known issues / things to verify

| Item                       | Status / note                                                                                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------- |
| **Subcategory disabled**   | Subcategory dropdown is enabled only after a **category** is selected and that category **has subcategories** in the system. Add subcategories under Inventory → Categories if needed. |
| **AI preview not filling** | Ensure `.env` has `GEMINI_API_KEY` (or `OPENAI_API_KEY`) and optionally `AI_PROVIDER=gemini`. SEO now falls back to env if Admin AI settings are not saved.                            |
| **500 on import page**     | If you see 500, ensure the app builds (e.g. no `??`/`                                                                                                                                  |     | `syntax error in`ai-autofill.service.ts`). Restart dev server after code/env changes. |
| **File not in repo**       | `docs/Flix Stock invintory (1).xlsx` was not found in the project. Place the file in `docs/` or anywhere and select it in the browser when uploading.                                  |

---

## 6. Is the system working 100%?

- **Code path:** Import flow (parse → map → validate → import) and AI preview (with env fallback for SEO) are implemented and wired.
- **To confirm 100%:** Run through the checklist above with **Flix Stock inventory (1).xlsx** (or a copy in `docs/`): upload, map categories, run AI preview if desired, then Start import. Check that products appear under Inventory → Equipment and that no 500 or client errors occur.
- **Browser test:** A browser was opened to `http://localhost:3002/admin/inventory/import`. Automated file upload was not run (the referenced Excel file was not in the repo). For a full end-to-end check, upload the file manually and follow the steps in §4.
