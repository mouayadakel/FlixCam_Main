# Flix Stock inventory (1).xlsx – Import mapping and fixes

This doc describes the **Flix Stock invintory (1).xlsx** file structure, how the import system maps it, and what was fixed so upload and auto-fill work.

---

## File structure (from `docs/Flix Stock invintory  (1).xlsx`)

### Sheet names (12 sheets)

| Sheet name (exact) | Rows | Purpose              |
| ------------------ | ---- | -------------------- |
| Camera             | 3    | Cameras              |
| Camera Acc         | 23   | Camera accessories   |
| Lenses             | 11   | Lenses               |
| Tripodgimbals      | 8    | Tripods/gimbals      |
| Boxes              | 10   | Cases/boxes          |
| Light              | 17   | Lighting             |
| Light Acc          | 16   | Lighting accessories |
| Grips              | 3    | Grips                |
| monitors           | 2    | Monitors             |
| Battery            | 2    | Batteries            |
| Sound              | 12   | Sound/audio          |
| Live and mixing    | 3    | Live/mixing          |

Some sheet names have **trailing spaces** in the file (e.g. `"Camera "`, `"Lenses "`). The importer normalizes names when matching to categories.

### Column headers (18 columns)

| Header (exact in file)         | Maps to           | Notes                                                        |
| ------------------------------ | ----------------- | ------------------------------------------------------------ |
| Name                           | name              | Product name; some sheets use **\*** or **name** (lowercase) |
| \*                             | name              | Used in "Light Acc" sheet instead of "Name"                  |
| name                           | name              | Used in "Grips" sheet (lowercase)                            |
| Barcode                        | barcode           | Not used as SKU; separate barcode field                      |
| Quantity (with space)          | quantity          | Header can be "Quantity "                                    |
| Quantity On Hand               | quantity          | Synonym in column mapper                                     |
| WITB                           | box_contents      | "What's in the box"                                          |
| Sales Price                    | daily_price       | Rental/daily price                                           |
| Currency                       | —                 | Not imported (e.g. SAR)                                      |
| Discription (typo)             | short_description | Column mapper has "discription"                              |
| Internal Reference             | sku               | Optional SKU                                                 |
| Image 128                      | featured_image    | Added as synonym                                             |
| Product Category               | —                 | Not used; category comes from **sheet → category** mapping   |
| Activity State, Favorite, etc. | —                 | Ignored                                                      |

- **No Brand column** → import uses brand **"Unknown"** (created if missing).
- **No Short/Long Description** in most rows → use **AI Preview** or **Import then Fill** to auto-fill.
- **Box contents** → "WITB" column maps to `box_contents`.

---

## What was fixed so this file imports

### 1. Name column variations

- **"\*" and "name"**
  - "Light Acc" uses **\*** for the product name; "Grips" uses **name** (lowercase).
  - **NAME_KEYS** on the import page now includes **\*** so those rows are not skipped and validation/import see the name.

### 2. Headers with trailing/leading spaces

- Excel headers like **"Quantity "** or **"Discription "** are stored with spaces; the column mapper stores **trimmed** headers (e.g. `"Quantity"`).
  - **resolveField** in the import worker was updated to resolve by **trimmed (and lowercased) header**: if the exact key is missing, it looks for a row key whose trimmed lowercase form matches the mapping’s `sourceHeader`.
  - So `row["Quantity "]` is found when the mapping says `"Quantity"` → `quantity`.

### 3. Barcode vs SKU

- **Barcode** is mapped to the **barcode** field (and to inventory item barcode), not to SKU.
  - Rows without Internal Reference get an **auto-generated SKU** so upload still works.

### 4. Image column

- **"Image 128"** was added as a synonym for **featured_image** in the column mapper so that column can auto-map when present.

### 5. Price and duplicate SKU

- **Max price** was raised so high values (e.g. 20M) are allowed.
  - **Duplicate SKU within file**: if a row fails with "SKU already exists", the worker **retries with an auto-generated unique SKU** so the row still imports.

---

## Why upload might have failed before

1. **Rows skipped as “no name”**
   - Sheets that use **\*** or **name** for the product name were not recognized; those rows were skipped.
   - **Fix:** `*` added to NAME_KEYS on the import page.

2. **“No data” / wrong columns**
   - Headers with spaces (e.g. **"Quantity "**) did not match the mapper’s trimmed headers, so values were not read.
   - **Fix:** resolveField now matches by trimmed (and lowercased) header.

3. **Category not selected**
   - Every **selected sheet** must have a **category** chosen. If not, the API returns 400 and the worker would fail with "Category mapping missing".
   - **Fix:** API validates that each selected sheet has a category; worker error message clarified.

4. **Auto-fill not running**
   - **AI Preview** and **Import then Fill** only run if you use them:
     - **Preview AI** before import to get suggestions and apply them.
     - **Import mode** “import_then_fill” or “import_autofill” to run AI fill after import.
   - Many rows have empty **Discription**; after import you can run **Fill All** from the AI Dashboard to generate descriptions/specs/SEO.

---

## How to import this file

1. **Upload**
   - Go to **Admin → Inventory → Import**, upload `Flix Stock invintory (1).xlsx`.

2. **Map sheets to categories**
   - For each sheet you want to import, select a **Category** (and optional **Subcategory**).
   - Sheet names are matched to your DB categories (e.g. "Camera " → "Camera", "Light Acc" → "Light").
   - If your DB has categories like **Camera**, **Lenses**, **Light**, **Sound**, **Battery**, **Boxes**, **Grips**, **monitors**, **Live and mixing**, etc., they can auto-match.

3. **Column mapping**
   - Columns are **auto-linked** from headers (Name, Barcode, Quantity, WITB, Sales Price, Discription, etc.).
   - Check the **Column Mapper** and adjust if needed.

4. **Validation**
   - Fix any **errors** (e.g. missing name, invalid price).
   - **Warnings** (e.g. duplicate SKU in file, 0 price) do not block import; duplicates get an auto-generated SKU.

5. **Start Import**
   - Choose **Import mode** (e.g. “Import then Fill” to run AI after import).
   - Click **Start Import** and wait for the job to finish.

6. **Auto-fill content**
   - Many rows have no description. After import:
     - Use **AI Dashboard → Fill All**, or
     - Use **Preview AI** before import and apply suggestions so they are sent as **approvedSuggestions** during import.

---

## Summary

- **Flix Stock invintory (1).xlsx** uses **Name** / **\*** / **name**, **Barcode**, **Quantity** / **Quantity On Hand**, **WITB**, **Sales Price**, **Discription**, and optional **Image 128** / **Internal Reference**.
- The system now recognizes **\*** and **name** as name columns, resolves columns with **trailing/leading spaces**, maps **WITB** and **Sales Price** and **Image 128**, and handles **duplicate SKU** and **high prices**.
- **Upload** works when every selected sheet has a category and validation errors are fixed.
- **Auto-fill** works when you use **Preview AI** and/or **Import then Fill** / **import_autofill**, and optionally **Fill All** from the AI Dashboard after import.
