# Import Inventory: Gaps Fixed and Testing (Flix Stock inventory)

This doc summarizes **gaps** that were fixed for the admin import page (`/admin/inventory/import`) and how to test with an Excel file such as **Flix Stock inventory (1).xlsx**.

---

## Gaps Addressed

### 1. **Categories linking**

- **Issue:** Categories come from `/api/admin/products/lookups` (all categories with `parentId` for subcategories). If no categories exist in the DB, the dropdown is empty and users cannot map sheets.
- **Fix:** No code change needed for the API; ensure you have categories in the database (run seed or create categories in admin). Root categories have `parentId: null`; subcategories have `parentId` set to the parent’s id.
- **UI:** Each selected sheet **must** have a category chosen. “Map all selected sheets to categories” blocks Start Import until every selected sheet has a category.

### 2. **AI Preview showing no real data**

- **Issue:** AI Preview only used hardcoded keys (`Name`, `Short Description`, etc.). If your Excel uses different headers (e.g. “Product Name”, “وصف مختصر”, or custom names), the preview rows had empty names/descriptions.
- **Fix:**
  - **Name:** Uses `getRowNameValue(row)` so any of `Name`, `name`, `Product Name`, `Product`, `اسم` are accepted.
  - **Descriptions / brand:** Added fallbacks for `Description`, `وصف مختصر`, `وصف طويل`, `Manufacturer`, `الماركة`.
  - Rows without a name are skipped for preview; toast explains: “Select a category for the sheet and ensure rows have a name (Name / Product Name / اسم).”

### 3. **Excel import “not working” (file type / no rows)**

- **Issue:** Some browsers send `file.type` as empty for `.xlsx`. The API only checked MIME type and rejected the file.
- **Fix:** Both **sheets** and **import** APIs now accept files by **extension** when type is missing or not in the list: `.xlsx`, `.xls`, `.csv`, `.tsv`. So uploads like `Flix Stock invintory (1).xlsx` work even if `file.type` is `""`.

### 4. **No real data in imported products**

- **Issue:** Column mapping was built once from the **first row of the job**. When multiple sheets had different column headers, only the first sheet’s headers were used, so other sheets resolved to wrong or empty fields.
- **Fix:** The import worker now builds **per-sheet column mappings**. For each sheet name it sees, it runs the column mapper on that sheet’s headers and uses the correct mapping when resolving fields for each row. So each sheet’s columns (e.g. different languages or layouts) map correctly to name, brand, price, descriptions, etc.

### 5. **Nullish coalescing / logical operator lint in import-worker**

- **Issue:** Mixing `||` and `??` without parentheses caused build/lint errors in `import-worker.ts`.
- **Fix:** All such expressions were wrapped in parentheses so the right-hand side of `||` that contains `??` is explicitly grouped (e.g. `a || (b ?? c)`).

---

## How to Test with “Flix Stock inventory (1).xlsx”

1. **Put the file where the app can read it (optional for manual testing):**
   - For **automated or scripted** tests you can place a copy under `docs/`, e.g. `docs/Flix Stock invintory (1).xlsx`.
   - For **manual testing in the browser**, you only need to select the file from your machine when the import page asks for it.

2. **Open the import page:**
   - Go to `http://localhost:3001/admin/inventory/import` (log in as admin if required).

3. **Upload:**
   - Use “رفع الملف” (Upload file) and select `Flix Stock invintory (1).xlsx` (or the file from `docs/` if you copied it there and pick it from the file chooser).
   - If the file is valid, you should see sheet(s) and preview rows. If you see “Unsupported file type”, check that the file extension is `.xlsx` (and that the latest API changes are deployed).

4. **Category linking:**
   - For each sheet you want to import, select a **category** (and optionally subcategory). Ensure at least one sheet is selected and has a category so “Start Import” is enabled.

5. **AI Preview:**
   - Click “Preview AI” (or the AI preview button). You should see a few rows with names and, if your sheet has them, descriptions. If you see “No rows to preview”, ensure:
     - The sheet has a category selected.
     - Rows have a value in a name-like column (Name, Product Name, اسم, etc.).

6. **Start Import:**
   - Click “Start Import”. Progress should appear; when the job finishes, check the import summary. If the worker isn’t running, the API falls back to processing the job synchronously so the import can still complete.

7. **Check logs:**
   - **Browser:** DevTools → Console for client errors; Network tab for failed requests (e.g. 400/500 on `/api/admin/imports/sheets` or `/api/admin/imports`).
   - **Server:** Terminal where `npm run dev` (and optionally `npm run worker:import`) is running. Look for `[Import]` messages and any stack traces.

---

## Expected Excel layout (for best results)

- **First row** of each sheet = headers. These are used for column mapping and display (e.g. in Column Mapper and validation).
- **Name column:** One of: `Name`, `name`, `Product Name`, `Product`, `اسم`. Otherwise the row is skipped (no product name).
- **Category:** Not a column in the file; it’s chosen per sheet in the UI.
- Other columns (Brand, Price, Short/Long Description, etc.) are matched by the column mapper (synonyms and history). If your headers differ, you can rely on the mapper’s synonyms or add more in `column-mapper.service.ts` if needed.

---

## Log files

- The app does not write to a dedicated “log file” by default. Use:
  - **Server stdout/stderr** (e.g. `npm run dev` and worker output).
  - **Browser console** and **Network** tab for client-side and API errors.

If you add a logging library later, you can point it at a file and then check that file for import-related messages.
