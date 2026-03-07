# Excel Import & AI Content Filling Pipeline — Complete Technical Audit

**Document Version:** 1.0  
**Audit Date:** 2026-02-28  
**Scope:** Entire Excel import pipeline, AI content filling system, and equipment browsing post-import

---

═══════════════════════════════════════════════════════════════
📁 PHASE 1: FULL CODEBASE DISCOVERY
═══════════════════════════════════════════════════════════════

## 1.1 EXCEL IMPORT — File Upload Components

| File Path | Purpose | Key Functions/Exports | Reads From | Writes To |
|-----------|---------|----------------------|------------|-----------|
| `src/components/features/import/drop-zone.tsx` | Drag-and-drop file upload UI | `DropZone`, `ACCEPTED_TYPES`, `ACCEPTED_EXTENSIONS`, `validateFile`, `handleFile`, `handleDrop`, `handleInputChange` | User file selection | Calls `onFileSelect(file)` |
| `src/app/admin/(routes)/inventory/import/page.tsx` | Main import page orchestrating upload, mapping, validation | `handleFileChange`, `handleSubmit`, `handleAIPreview`, `matchSheetToCategory` | `/api/admin/imports/sheets`, `/api/admin/products/lookups` | Sets `file`, `sheetsMetadata`, `mapping`, `jobId`, `approvedSuggestions` |
| `src/app/api/admin/imports/sheets/route.ts` | Parse uploaded file, return sheet metadata | `POST` handler | FormData `file` | Returns `{ filename, fileSize, mimeType, totalSheets, totalRows, sheets: [{ name, rowCount, columns, previewRows, exceedsMaxRows }] }` |
| `src/app/api/admin/imports/route.ts` | Main import API — accepts file, creates job, queues processing | `POST` handler | FormData: `file`, `mapping`, `rows`, `selectedSheets`, `selectedRows`, `approvedSuggestions` | Creates `ImportJob`, `ImportJobRow`; calls `addImportJob` or `processImportJob` sync |

**Known Issues:**
- DropZone uses `maxSizeMB = 50` by default; sheets API enforces `MAX_FILE_SIZE = 50 * 1024 * 1024` — consistent.
- No explicit file type validation in DropZone beyond extension/MIME; API re-validates.
- Import page uses hidden `<input type="file">` via DropZone; no separate upload button for non-drag users.

---

## 1.2 EXCEL IMPORT — File Parsing

| File Path | Purpose | Key Functions/Exports | Reads From | Writes To |
|-----------|---------|----------------------|------------|-----------|
| `src/lib/utils/excel-parser.ts` | Core Excel/CSV parser using ExcelJS | `parseSpreadsheetBuffer`, `parseExcelBuffer`, `parseCsvBuffer`, `parseCsvLine` | Buffer (file content) | Returns `{ sheetNames, getSheetData, sheets }` |
| `src/app/api/admin/imports/sheets/route.ts:66-68` | API wrapper | Calls `parseSpreadsheetBuffer(buffer, file.name)` | File buffer | Sheet metadata |
| `src/app/api/admin/imports/route.ts:111-114` | Import API | Calls `parseSpreadsheetBuffer(buffer, file.name)` | File buffer | Row data for ImportJobRow |
| `src/app/api/admin/imports/preview/route.ts` | Preview API | Uses `parseSpreadsheetBuffer` | File buffer | Preview rows |
| `scripts/import-flix-stock-from-xlsx.ts` | Standalone import script | Uses `parseSpreadsheetBuffer` | File path | Products directly |
| `scripts/test-import-direct.ts` | Test import script | Uses `parseSpreadsheetBuffer` | File path | ImportJob + processImportJob |

**Parsing Logic (excel-parser.ts):**
- Row 1 = headers; rows 2+ = data.
- Headers: `String(v ?? '').trim() || \`Column${i+1}\``; duplicate headers get `_1`, `_2` suffix.
- Each data row: `obj[header] = rowData[i] ?? null`.
- `.xls` throws "Legacy .xls format not supported".
- CSV/TSV: single sheet "Sheet1", delimiter `,` or `\t`.

---

## 1.3 EXCEL IMPORT — Column Mapping

| File Path | Purpose | Key Functions/Exports | Reads From | Writes To |
|-----------|---------|----------------------|------------|-----------|
| `src/lib/services/column-mapper.service.ts` | Smart column mapping: synonyms, fuzzy match, history | `mapColumns`, `saveMappingHistory`, `getFieldInfo`, `SYNONYM_MAP` | Headers array, `ColumnMappingHistory` table | `ColumnMappingHistory` (upsert) |
| `src/components/features/import/column-mapper.tsx` | UI for manual column mapping | `ColumnMapper`, `MappedColumn` type | Sheet headers, initial mappings | Updates parent state via `onMappingChange` |
| `src/lib/services/import-worker.ts:166-169` | Builds mappings per sheet | `mapColumns(headers, { useHistory: true })` | First row of each sheet (`payload.row` keys) | `columnMappingsBySheet` Map |
| `src/lib/services/import-worker.ts:113-136` | Resolves field from row | `resolveField(row, fieldName, columnMappings)` | `row`, `columnMappings` | Field value or `undefined` |
| `prisma/schema.prisma:3297-3308` | ColumnMappingHistory model | — | — | `sourceHeader`, `mappedField`, `frequency`, `lastUsedAt` |

**System Fields (column-mapper.service.ts):** name, brand, model, sku, barcode, daily_price, weekly_price, monthly_price, deposit, quantity, condition, warehouse_location, featured, is_active, sub_category, short_description, long_description, seo_title, seo_description, seo_keywords, featured_image, gallery, video, specifications, box_contents, tags, related_products, buffer_time, buffer_time_unit, name_ar, short_desc_ar, long_desc_ar, seo_title_ar, seo_desc_ar, seo_keywords_ar, name_zh, short_desc_zh, long_desc_zh, seo_title_zh, seo_desc_zh, seo_keywords_zh.

**Synonyms include:** "sales price" → daily_price, "product category" (not in SystemField — category comes from sheet mapping), "barcode", "upc", "ean", "gtin" → barcode.

---

## 1.4 EXCEL IMPORT — Row Validation

| File Path | Purpose | Key Functions/Exports | Reads From | Writes To |
|-----------|---------|----------------------|------------|-----------|
| `src/lib/services/import-validation.service.ts` | Validates rows before import | Validation logic | Row data, column mappings | `ValidationResult` (errors, warnings) |
| `src/components/features/import/validation-report.tsx` | Displays validation results | `ValidationReport` | Validation results | UI |
| `src/app/api/admin/imports/validate/route.ts` | Validates rows before import | `POST` handler, `validateImportRows` | Request body `{ rows }` | `ValidationResult` |
| `src/app/api/admin/imports/preview/route.ts` | Preview rows with column mapping | `POST` handler | File or rows + mapping | Preview data |
| `src/app/api/admin/imports/analyze/route.ts` | Analyze file structure | `POST` handler | File | Analysis result |
| `src/app/api/admin/imports/map-columns/route.ts` | Get column mapping suggestions | `POST` handler | Headers array | Suggested mappings |
| `src/app/api/admin/imports/[id]/route.ts` | Get ImportJob by ID | `GET` handler | ImportJob table | Job JSON |
| `src/app/admin/(routes)/inventory/import/page.tsx` | Triggers validation | Calls `/api/admin/imports/validate` | Validation API | `validationResults`, `validationSummary` |

---

## 1.5 EXCEL IMPORT — Job Creation & Queue

| File Path | Purpose | Key Functions/Exports | Reads From | Writes To |
|-----------|---------|----------------------|------------|-----------|
| `src/lib/services/import.service.ts` | ImportJob CRUD | `createJob`, `getJob`, `appendRows`, `markRow`, `markProcessing`, `bumpProgress`, `markComplete`, `markFailed` | Prisma | `ImportJob`, `ImportJobRow` |
| `src/lib/queue/import.queue.ts` | BullMQ queue | `addImportJob`, `getImportJobStatus`, `cancelImportJob` | Redis | BullMQ queue `product-import` |
| `src/lib/queue/import.worker.ts` | BullMQ worker | `createImportWorker`, `getImportWorker` | BullMQ queue | Calls `processImportJob(jobId, { approvedSuggestions })` |
| `instrumentation.ts` | Server startup | `register()` | — | Starts `getImportWorker()`, `getBackfillWorker()` |
| `src/app/api/admin/imports/route.ts:218-242` | Fallback | If queue fails, calls `processImportJob` synchronously | — | Processes import in request |

---

## 1.6 EXCEL IMPORT — Status Tracking & Error Handling

| File Path | Purpose | Key Functions/Exports | Reads From | Writes To |
|-----------|---------|----------------------|------------|-----------|
| `src/app/api/admin/imports/[id]/progress/route.ts` | Progress polling | `GET` handler | `ImportJob`, `ImportJobRow` | `{ jobId, status, progress: { products, ai, images }, timestamps }` |
| `src/app/api/admin/imports/[id]/errors.csv/route.ts` | Error report download | `GET` handler | `ImportJobRow` where status=ERROR | CSV file |
| `src/app/api/admin/imports/[id]/retry/route.ts` | Retry failed rows | `POST` handler | Original ImportJob | New ImportJob with failed rows only |
| `src/components/features/import/progress-tracker.tsx` | Progress UI | `ProgressTracker` | `/api/admin/imports/[id]/progress` | Polling UI |
| `src/components/features/import/import-summary.tsx` | Completion summary | `ImportSummary` | Import results | Summary UI |

---

## 1.7 AI CONTENT FILLING

| File Path | Purpose | Key Functions/Exports | Reads From | Writes To |
|-----------|---------|----------------------|------------|-----------|
| `src/lib/services/ai-content-generation.service.ts` | LLM calls for content | `generateWithLLM`, `generateMasterFill` | OpenAI/Gemini API, `AISettings` | Raw text or parsed JSON |
| `src/lib/services/ai-autofill.service.ts` | Autofill orchestration | `autofillProduct`, `generateDescription` | `translateBatch`, `generateSEOBatch` | `AutofillResult` |
| `src/app/api/admin/imports/preview-ai/route.ts` | AI preview for import rows | `POST` handler | Request body `{ rows, provider }` | `generateMasterFill` → suggestions |
| `src/components/features/import/ai-preview-dialog.tsx` | AI preview dialog | `AIPreviewDialog` | Preview API response | Shows suggestions, collects approvals |
| `src/lib/prompts/master-fill.ts` | Prompt templates | `buildMasterFillPrompt`, `parseMasterFillOutput` | Input data | Prompt string |
| `src/lib/queue/backfill.queue.ts` | Backfill queue | `addBackfillJob` | Product IDs | BullMQ backfill queue |
| `src/lib/queue/backfill.worker.ts` | Backfill worker | Processes AI fill jobs | Backfill queue | Product translations, SEO |
| `src/lib/services/catalog-scanner.service.ts` | Scans catalog for gaps | `scanAndQueue` | Products table | Queues AI fill jobs |
| `src/app/api/admin/ai/backfill/route.ts` | Trigger backfill | `POST` handler | Product filters | Triggers backfill |
| `src/app/api/admin/equipment/ai-suggest/route.ts` | Per-equipment AI suggest | `POST` handler | Equipment ID | AI suggestions for single item |

**AI Provider Selection:** `AI_PROVIDER` env (openai | gemini); API keys from `AISettings` (DB) or env (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`).

---

## 1.8 EQUIPMENT BROWSING (Post-Import)

| File Path | Purpose | Key Functions/Exports | Reads From | Writes To |
|-----------|---------|----------------------|------------|-----------|
| `src/app/api/public/equipment/route.ts` | Public equipment list API | `GET` handler | `Equipment` where `deletedAt: null`, `isActive: true` | Cached JSON |
| `src/app/(public)/equipment/page.tsx` | Public equipment catalog page | Server component | Feature flags | Renders catalog |
| `src/components/features/equipment/equipment-catalog.tsx` | Catalog component | `EquipmentCatalog` | `/api/public/equipment` | Grid display |
| `src/lib/services/product-equipment-sync.service.ts` | Product → Equipment sync | `syncProductToEquipment` | Product, ProductTranslation, InventoryItem | Equipment, Media, EquipmentTranslation |
| `src/app/admin/(routes)/inventory/equipment/page.tsx` | Admin equipment list | — | Equipment table | Admin list |
| `src/app/admin/(routes)/inventory/equipment/[id]/page.tsx` | Admin equipment detail | — | Equipment by ID | Detail view |

**Visibility:** Equipment visible when `deletedAt: null`, `isActive: true`. No `publishedAt` field.

---

═══════════════════════════════════════════════════════════════
📊 PHASE 2: STATUS DIAGRAMS
═══════════════════════════════════════════════════════════════

## 2.1 DIAGRAM A: Import Job Status Flow

```
[PENDING]
   │ triggered by: ImportService.createJob() — status defaults to PENDING
   │ DB: ImportJob.status = 'PENDING'
   │ UI: Job created, user sees "Processing..." or progress
   │ can get stuck if: Queue add fails AND sync fallback fails
   ▼
[PROCESSING]
   │ triggered by: ImportService.markProcessing(jobId) in import-worker.ts:156
   │ DB: ImportJob.status = 'PROCESSING'
   │ Worker: processImportJob() running
   │ can get stuck if: Worker crashes mid-batch, Redis down (job never picked up)
   │ User: Can poll /api/admin/imports/[id]/progress
   ▼
[COMPLETED] or [FAILED]
   │ COMPLETED: ImportService.markComplete(jobId) — import-worker.ts after all batches
   │ FAILED: ImportService.markFailed(jobId, errorMessage) — when worker throws
   │ DB: status = 'COMPLETED' | 'FAILED'
   │ UI: ImportSummary shows results; errors.csv available for ERROR rows
   │ User: Can retry failed rows via POST /api/admin/imports/[id]/retry
```

**ImportJobStatus enum (schema.prisma:3084-3089):** PENDING, PROCESSING, COMPLETED, FAILED.

**No CANCELLED status.** `cancelImportJob` removes job from BullMQ queue but does NOT update ImportJob.status in DB.

---

## 2.2 DIAGRAM B: ImportJobRow Status Flow

```
[PENDING]
   │ Default when ImportJobRow created (status not explicitly set; schema default PENDING)
   │ DB: ImportJobRow.status = 'PENDING'
   ▼
[SUCCESS] or [ERROR]
   │ SUCCESS: ImportService.markRow(jobId, rowNumber, SUCCESS, { productId })
   │ ERROR: ImportService.markRow(jobId, rowNumber, ERROR, { error })
   │ No PROCESSING state for rows — worker processes in batches, marks each when done
   │ DB: status, error, productId
   │ UI: Progress shows success/error counts; errors.csv lists ERROR rows with payload
```

**ImportRowStatus enum (schema.prisma:3091-3095):** PENDING, SUCCESS, ERROR.

**No SKIPPED status.** Rows with empty name are not inserted (skipped at API level).

---

## 2.3 DIAGRAM C: AI Job / AI Processing Status Flow

```
AI PREVIEW (pre-import):
   User clicks "Preview AI" → POST /api/admin/imports/preview-ai
   → generateMasterFill() for each row (max 10)
   → Returns suggestions; NOT stored in DB
   → User approves in AIPreviewDialog → approvedSuggestions state
   → Passed to import API → applied during processImportJob

AI BACKFILL (post-import):
   Triggered by: import_autofill mode OR manual backfill API OR cron
   → addBackfillJob(productIds)
   → Backfill worker picks up
   → AIProcessingJob created (status: string, not enum)
   → Updates ProductTranslation, Product fields
   → AIProcessingJob.status updated (e.g. "completed", "failed")
```

**AIProcessingJob (schema.prisma:171-189):** status (String), provider, totalItems, processedItems, failedItems, cost. Linked to ImportJob.

**AiJob (schema.prisma:231-249):** type (AiJobType), status (JobStatus: PENDING, RUNNING, COMPLETED, FAILED, CANCELLED). Separate from ImportJob.

**AiContentDraft (schema.prisma:290-305):** productId, type, suggestedData, status (pending | approved | rejected). Used for per-product AI suggestions review.

---

## 2.4 DIAGRAM D: Equipment Visibility Status Flow

```
[IMPORTED - Product created]
   │ Import worker creates Product → syncProductToEquipment() creates/updates Equipment
   │ Equipment: deletedAt=null, isActive=true (default)
   │ DB: Equipment.isActive = true, deletedAt = null
   ▼
[VISIBLE in catalog]
   │ Public API: WHERE deletedAt=null AND isActive=true
   │ Admin list: typically filters deletedAt=null
   │ No explicit "published" state — isActive is the toggle
   ▼
[ARCHIVED / HIDDEN]
   │ Admin deletes equipment → EquipmentService.deleteEquipment() sets deletedAt, isActive=false
   │ Soft delete only; Product and InventoryItem remain
   │ DB: Equipment.deletedAt = now(), deletedBy = userId
```

**Visibility fields:** `deletedAt`, `isActive`. No `publishedAt`, `draft`, or `pending_review` on Equipment.

**Product.status:** DRAFT | ACTIVE (affects Product, not directly Equipment visibility in public catalog — public catalog reads Equipment).

---

## 2.5 DIAGRAM E: Full End-to-End Pipeline Status

```
FILE UPLOAD (DropZone / handleFileChange)
   │ Can fail: file too large, wrong type, parse error
   │ Error handling: toast, setError in DropZone
   ▼
SHEET PARSING (POST /api/admin/imports/sheets)
   │ Can fail: corrupted file, .xls format, empty sheets
   │ Error handling: 400/500 response, toast
   ▼
COLUMN MAPPING (mapColumns per sheet)
   │ Can fail: mapColumns throws (caught, logged)
   │ Fallback: columnMappingsBySheet may be empty → resolveField returns undefined
   ▼
ROW VALIDATION (optional, client-side or validation API)
   │ Can fail: missing required fields, invalid data
   │ Error handling: validation report shown
   ▼
IMPORT JOB CREATION (POST /api/admin/imports)
   │ Can fail: no rows, missing category mapping, queue + sync both fail
   │ Error handling: 400/500, toast; sync fallback if queue fails
   ▼
QUEUE → WORKER PROCESSING
   │ Can fail: Redis down (sync fallback), worker crash (job stuck PROCESSING)
   │ Retry: BullMQ attempts: 3, backoff exponential
   ▼
PRODUCT CREATION (per row)
   │ Can fail: ValidationError (barcode exists, SKU exists), DB overflow, name.replace not a function
   │ Error handling: markRow(ERROR), continue to next row
   ▼
SYNC TO EQUIPMENT (syncProductToEquipment)
   │ Can fail: slug collision, transaction error
   │ Error handling: console.warn, row still marked SUCCESS
   ▼
AI JOB TRIGGERED (if import_autofill mode)
   │ Can fail: No API key, rate limit, provider error
   │ Error handling: Backfill worker logs; no user notification
   ▼
EQUIPMENT VISIBLE IN CATALOG
   │ Cache: equipmentList cache key
   │ Revalidation: cacheSet on response
```

---

═══════════════════════════════════════════════════════════════
👤 PHASE 3: USER STORIES
═══════════════════════════════════════════════════════════════

## Story 1: Admin uploads a valid .xlsx file with correct columns
**Actor:** Admin  
**Preconditions:** Logged in, import.create permission  
**Goal:** Import equipment from Excel  

**Steps:**
1. User selects .xlsx file via DropZone or file input  
   → System: POST /api/admin/imports/sheets with file  
   → DB: None  
   → UI: sheetsMetadata populated, columns displayed  
2. User selects category per sheet (or auto-match)  
   → System: mapping state updated  
   → UI: Category dropdowns filled  
3. User clicks "Start Import"  
   → System: POST /api/admin/imports with file, mapping  
   → DB: ImportJob, ImportJobRow created  
   → UI: jobId set, ProgressTracker shows polling  

**Success Criteria:** All rows imported, equipment visible in admin.  
**Failure Scenarios:** File parse error, missing category, queue unavailable.  
**Current Implementation Status:** ✅ Working  

---

## Story 2: Admin uploads a .xlsx with missing required columns
**Actor:** Admin  
**Preconditions:** Logged in  
**Goal:** Import despite missing columns  

**Steps:**
1. User uploads file with no "Name" column (or unmapped)  
   → System: Rows with empty name skipped at API level (getRowNameValue returns '')  
   → DB: Those rows not inserted into ImportJobRow  
   → UI: Skipped rows count in response  

**Success Criteria:** Rows with name import; others skipped.  
**Failure Scenarios:** All rows have empty name → "No rows found in file" 400.  
**Current Implementation Status:** ✅ Working (skip), ⚠️ No explicit "required columns" validation before import  

---

## Story 3: Admin uploads a .csv file
**Actor:** Admin  
**Preconditions:** Logged in  
**Goal:** Import from CSV  

**Steps:**
1. User selects .csv file  
   → System: parseSpreadsheetBuffer detects .csv, uses parseCsvBuffer with delimiter ','  
   → Returns single sheet "Sheet1"  
   → UI: Same flow as xlsx  

**Success Criteria:** CSV imports successfully.  
**Current Implementation Status:** ✅ Working  

---

## Story 4: Admin uploads a file > 50MB
**Actor:** Admin  
**Preconditions:** Logged in  
**Goal:** Upload large file  

**Steps:**
1. User selects file > 50MB  
   → DropZone: validateFile returns error "الملف كبير جداً"  
   → Sheets API: if bypassed, returns 413 "File size exceeds 50MB limit"  

**Success Criteria:** User sees error, file not processed.  
**Current Implementation Status:** ✅ Working  

---

## Story 5: Admin uploads a file with multiple sheets
**Actor:** Admin  
**Preconditions:** Logged in  
**Goal:** Import from multiple sheets  

**Steps:**
1. User uploads xlsx with sheets "Camera", "Lenses", "Lighting"  
   → System: sheetsMetadata has 3 entries  
   → User maps category per sheet  
   → selectedSheets filters which to import (optional)  
   → API iterates wb.sheetNames, gets data per sheet  

**Success Criteria:** All selected sheets imported.  
**Current Implementation Status:** ✅ Working  

---

## Story 6: Admin maps sheet columns to equipment fields
**Actor:** Admin  
**Preconditions:** File uploaded, sheets metadata loaded  
**Goal:** Map Excel columns to system fields  

**Steps:**
1. ColumnMapper component shows source headers vs target fields  
   → User selects mapping per column  
   → columnMappings state updated  
   → Passed to import API as part of mapping (or derived from columnMappings)  

**Note:** Mapping is built in worker from headers via mapColumns; columnMappings from UI may be passed differently — need to verify how UI mapping reaches worker. Worker builds its own mapping from first row headers.  

**Current Implementation Status:** ⚠️ Partial — Worker builds mapping from row headers; UI ColumnMapper may not be passed to API.  

---

## Story 7: Admin selects which sheets to import (multi-sheet)
**Actor:** Admin  
**Preconditions:** File with multiple sheets  
**Goal:** Import only selected sheets  

**Steps:**
1. User checks/unchecks sheets  
   → selectedSheets state  
   → API: if selectedSheets provided, filters wb.sheetNames  

**Success Criteria:** Only selected sheets processed.  
**Current Implementation Status:** ✅ Working  

---

## Story 8: Admin selects specific rows to import (row-level selection)
**Actor:** Admin  
**Preconditions:** Sheet with many rows  
**Goal:** Import only selected rows  

**Steps:**
1. User selects row numbers per sheet  
   → selectedRows: Record<sheetName, number[]>  
   → API: hasRowSelection ? sheetSelectedRows.includes(excelRowNumber)  

**Success Criteria:** Only selected rows imported.  
**Current Implementation Status:** ✅ Working  

---

## Story 9: Admin starts import and watches progress
**Actor:** Admin  
**Preconditions:** Job created  
**Goal:** See real-time progress  

**Steps:**
1. ProgressTracker polls GET /api/admin/imports/[id]/progress  
   → Returns processedRows, successRows, errorRows, percentage  
   → UI updates  

**Success Criteria:** Progress reflects worker updates.  
**Current Implementation Status:** ✅ Working (polling; no SSE/WebSocket)  

---

## Story 10: Import fails midway — admin retries
**Actor:** Admin  
**Preconditions:** Import completed with some ERROR rows  
**Goal:** Retry failed rows only  

**Steps:**
1. User clicks "Retry failed" (or similar)  
   → POST /api/admin/imports/[id]/retry  
   → Creates new ImportJob with failed rows only  
   → Queues new job  

**Success Criteria:** Failed rows reprocessed.  
**Current Implementation Status:** ✅ Working (retry creates new job)  

---

## Story 11: Import completes with partial failures (some rows bad)
**Actor:** Admin  
**Preconditions:** Import finished  
**Goal:** See which rows failed and why  

**Steps:**
1. ImportSummary shows success/error counts  
   → User can download errors.csv  
   → GET /api/admin/imports/[id]/errors.csv  

**Success Criteria:** CSV with Row Number, Error Message, Payload.  
**Current Implementation Status:** ✅ Working  

---

## Story 12: Admin views import history
**Actor:** Admin  
**Preconditions:** Past imports  
**Goal:** See list of past imports  

**Steps:**
1. Navigate to import history (if exists)  
   → No dedicated "import history" page found in discovery  
   → Job is created per import; no list view of past jobs  

**Current Implementation Status:** ❌ Missing — No import history UI  

---

## Story 13: Admin downloads error report for failed rows
**Actor:** Admin  
**Preconditions:** Import with errors  
**Goal:** Get CSV of errors  

**Steps:**
1. GET /api/admin/imports/[id]/errors.csv  
   → Returns CSV attachment  

**Current Implementation Status:** ✅ Working  

---

## Story 14: Admin cancels an in-progress import
**Actor:** Admin  
**Preconditions:** Import PROCESSING  
**Goal:** Stop import  

**Steps:**
1. cancelImportJob(jobId) removes job from BullMQ queue  
   → Worker stops when job removed  
   → ImportJob.status in DB NOT updated to CANCELLED (no such status)  

**Current Implementation Status:** ⚠️ Partial — Queue job removed; DB status not updated; worker may have already processed some rows  

---

## Stories 15–26: AI Filling (abbreviated)

| # | Story | Status |
|---|-------|--------|
| 15 | Admin triggers AI preview before import | ✅ Working |
| 16 | AI generates title/description | ✅ Working |
| 17 | AI generates SEO meta | ✅ Working |
| 18 | AI generates technical specs | ✅ Working (specs-db, ai-spec-parser) |
| 19 | AI generates category suggestions | ⚠️ Partial (sheet-level category, not row-level AI) |
| 20 | AI generates tags | ✅ Working |
| 21 | Admin approves all AI suggestions | ✅ Working |
| 22 | Admin rejects/edits some | ✅ Working |
| 23 | AI preview fails (no API key) | ✅ Error returned |
| 24 | AI preview fails (rate limit) | ⚠️ Error may not be user-friendly |
| 25 | Admin triggers AI backfill on existing equipment | ✅ Working |
| 26 | AI auto-applied vs manual approval | ⚠️ preview_edit = manual; import_autofill = backfill after |

---

## Stories 27–33: Browse/Catalog (abbreviated)

| # | Story | Status |
|---|-------|--------|
| 27 | Admin publishes imported equipment | ⚠️ No explicit "publish" — isActive true by default |
| 28 | Imported equipment appears on browse | ✅ Working (syncProductToEquipment) |
| 29 | Equipment without images | ✅ Placeholder /images/placeholder.jpg |
| 30 | Equipment without AI fill | ✅ Works (basic data from import) |
| 31 | Customer searches newly imported equipment | ✅ Working |
| 32 | Customer filters by category | ✅ Working |
| 33 | Customer views detail page | ✅ Working |

---

═══════════════════════════════════════════════════════════════
🔄 PHASE 4: COMPLETE WORKFLOW DOCUMENTATION
═══════════════════════════════════════════════════════════════

## WORKFLOW 1: File Upload & Sheet Detection

**Trace:** User selects file → Sheet names + column headers displayed

1. **Component:** `src/app/admin/(routes)/inventory/import/page.tsx` — `handleFileChange` (line ~232)  
2. **File selection:** `<input type="file">` inside `DropZone` or via `handleFileChange` from parent  
3. **Send to server:** FormData with `file` key, POST to `/api/admin/imports/sheets`  
4. **API route:** `src/app/api/admin/imports/sheets/route.ts` — POST  
5. **Parser:** `parseSpreadsheetBuffer(buffer, file.name)` from `@/lib/utils/excel-parser`  
6. **Library:** ExcelJS (`workbook.xlsx.load(buffer)`)  
7. **Sheets:** `worksheet.eachRow` — row 1 = headers, row 2+ = data  
8. **Columns:** `Object.keys(data[0])` for first data row (actually headers from row 1)  
9. **Response:** `{ filename, fileSize, mimeType, totalSheets, totalRows, sheets: [{ name, rowCount, columns, previewRows, exceedsMaxRows }] }`  
10. **Frontend:** `setSheetsMetadata`, `setMapping` (with auto-match), renders Accordion per sheet  
11. **Corrupted/wrong format:** 400/500 response, toast  

---

## WORKFLOW 2: Column Mapping

**Trace:** Sheet columns displayed → Mapping ready for import

1. **Target fields:** All SystemField values in column-mapper.service.ts  
2. **Required:** `name` (rows without name skipped); `categoryId` per sheet (from mapping, not row)  
3. **Auto-mapping:** `mapColumns(headers, { useHistory: true })` — synonym match, fuzzy, history  
4. **Storage:** `ColumnMappingHistory` table; worker builds mapping from first row of each sheet  
5. **Passed to import:** mapping (sheet → categoryId); worker builds columnMappings from row keys  
6. **Validation:** If categoryId missing for sheet → 400 "Each sheet must have a category selected"  

---

## WORKFLOW 3: Import Job Processing

**Trace:** User clicks "Start Import" → All rows processed, equipment created

1. **Frontend POST:** FormData with file, mapping, selectedSheets, selectedRows, approvedSuggestions → `/api/admin/imports`  
2. **API:** Parse file, create ImportJob, appendRows (ImportJobRow), addImportJob to queue (or processImportJob sync)  
3. **File re-parsed:** Yes — API parses again; sheets API parse is separate  
4. **Row iteration:** wb.sheetNames.forEach → data.forEach  
5. **ImportJobRow creation:** payload = { sheetName, categoryId, subCategoryId, excelRowNumber, row }  
6. **Queue payload:** { jobId, mapping, selectedSheets, selectedRows, approvedSuggestions }  
7. **Worker:** `import.worker.ts` → `processImportJob(jobId, { approvedSuggestions })`  
8. **Per-row:** resolveField for each field, ensureBrand, ProductCatalogService.create or update (if barcode exists), syncProductToEquipment  
9. **Equipment creation:** syncProductToEquipment creates Equipment from Product  
10. **Images:** featuredImage defaults to /images/placeholder.jpg; galleryImages from row  
11. **Success/failure:** ImportService.markRow(SUCCESS|ERROR)  
12. **Job completion:** ImportService.markComplete(jobId)  

---

## WORKFLOW 4: AI Content Generation

**Trace:** AI triggered → Content stored / returned

1. **Trigger:** "Preview AI" button (pre-import) OR import_autofill mode (post-import backfill)  
2. **Preview:** POST /api/admin/imports/preview-ai with rows (max 10)  
3. **Provider:** bodyProvider ?? AI_PROVIDER ?? 'gemini'  
4. **Prompt:** `buildMasterFillPrompt` from master-fill.ts  
5. **Generated fields:** short_desc_en, long_desc_en, seo_*, name_ar, name_zh, box_contents, tags  
6. **Response parsing:** `parseMasterFillOutput`; JSON regex fallback  
7. **Storage (preview):** None — returned to client, stored in approvedSuggestions state  
8. **Storage (backfill):** ProductTranslation, Product fields updated by backfill worker  
9. **Confidence:** scoreConfidence in preview-ai route  
10. **Display:** AIPreviewDialog  

---

## WORKFLOW 5: AI Content Approval & Application

**Trace:** Admin sees suggestions → Equipment updated

1. **Display:** AIPreviewDialog shows suggestions per row  
2. **Edit before approve:** User can edit in dialog (implementation varies)  
3. **Approve:** approvedSuggestions state updated, passed to import API  
4. **Reject:** Row not added to approvedSuggestions  
5. **Partial approve:** Per-row approval  
6. **Application:** import-worker applies suggestion when payload.excelRowNumber matches suggestionByRow  
7. **Audit:** No explicit approval audit log for import flow  

---

## WORKFLOW 6: Equipment Published to Browse Page

**Trace:** Equipment in DB → Visible to customers

1. **Visibility fields:** `deletedAt: null`, `isActive: true`  
2. **Set by:** syncProductToEquipment sets isActive default true; admin can toggle  
3. **Browse query:** `prisma.equipment.findMany({ where: { deletedAt: null, isActive: true } })`  
4. **Search:** No separate search index; Prisma contains/mode: insensitive  
5. **Cache:** cacheGet/cacheSet for equipmentList  
6. **Incomplete data:** Renders with placeholder image, basic fields  

---

═══════════════════════════════════════════════════════════════
🐛 PHASE 5: BUG & GAP ANALYSIS
═══════════════════════════════════════════════════════════════

## WHAT IS WORKING ✅

- File upload (DropZone, 50MB limit, .xlsx/.csv/.tsv)
- Sheet parsing (ExcelJS, multi-sheet)
- Column mapping (synonyms, history, resolveField)
- Import job creation, row storage
- Queue + worker (BullMQ, Redis)
- Sync fallback when queue unavailable
- Per-row processing, barcode update flow
- Product creation, ProductCatalogService
- syncProductToEquipment (Product → Equipment)
- AI preview (preview-ai API)
- AI backfill (queue, worker)
- Progress polling
- Error CSV download
- Retry failed rows
- Equipment visibility (deletedAt, isActive)

## WHAT IS BROKEN 🐛

| # | File:Line | Bug | Impact | Severity |
|---|-----------|-----|--------|----------|
| 1 | import-worker.ts | `name.replace is not a function` when name is number/object | Row fails with ERROR | 🟠 HIGH |
| 2 | import-worker.ts | `boxContents.trim is not a function` when boxContents is array | Row fails | 🟠 HIGH |
| 3 | product-catalog.service / DB | Decimal overflow when price > 99,999,999.99 | Product create fails | 🟠 HIGH |
| 4 | errors.csv route:54 | Payload uses `payload.row` — may be undefined if payload structure differs | CSV may have empty Payload column | 🟡 MEDIUM |

## WHAT IS PARTIALLY IMPLEMENTED ⚠️

- **Column mapping from UI:** Worker builds its own mapping from row headers; UI ColumnMapper state may not be passed to API. Risk: User mapping ignored.
- **Cancel import:** Removes from queue but does not update ImportJob.status.
- **Import history:** No list of past ImportJobs.
- **AI cost tracking:** totalCost in preview-ai returns 0.
- **Image processing status:** imageProgress.processed = 0 (no tracking).

## WHAT IS COMPLETELY MISSING ❌

- Import history page
- Cancel button that updates DB status
- Row-level SKIPPED status
- User notification when backfill fails
- WebSocket/SSE for real-time progress

## SILENT FAILURE POINTS 💀

| Location | Issue |
|----------|-------|
| import.worker.ts:36-38 | catch throws error — job fails, but ImportJob may stay PROCESSING if markFailed not called |
| import-worker.ts | syncProductToEquipment failure: console.warn only, row marked SUCCESS |
| backfill.worker | AI failure: logged, no user notification |
| instrumentation.ts:30-35 | Worker start failure: console.warn, no alert |
| preview-ai route | generateMasterFill failure: 500, but no retry |

---

═══════════════════════════════════════════════════════════════
📋 PHASE 6: DATA SCHEMA AUDIT
═══════════════════════════════════════════════════════════════

## ImportJob (schema.prisma:134-154)

```
id, filename, mimeType, status, totalRows, processedRows, successRows, errorRows, errorMessage,
createdAt, createdBy, updatedAt, updatedBy, aiProcessingStatus, imageProcessingStatus,
selectedRows, selectedSheets, aiProcessingJobs[], rows[]
```

**Populated during import:** All fields except aiProcessingStatus, imageProcessingStatus (optional).  
**Populated by AI:** aiProcessingStatus when backfill runs.  
**Required for visibility:** N/A (admin-only).  

## ImportJobRow (schema.prisma:156-170)

```
id, jobId, rowNumber, status, error, productId, payload, createdAt, updatedAt
```

**Populated during import:** All. payload = { sheetName, categoryId, subCategoryId, excelRowNumber, row }.  
**Populated by AI:** N/A.  

## Product (schema.prisma:10-59)

**Populated during import:** status, brandId, categoryId, subCategoryId, priceDaily, priceWeekly, priceMonthly, depositAmount, quantity, bufferTime, boxContents, featuredImage, galleryImages, tags, translations (ProductTranslation), inventoryItems.  
**Populated by AI:** translations (if approvedSuggestions), lastAiRunAt, aiRunCount, needsAiReview.  
**Required for equipment sync:** categoryId, brandId, sku, priceDaily, featuredImage.  

## Equipment (schema.prisma:745-815)

**Populated during import:** Via syncProductToEquipment: sku, slug, productId, model, categoryId, brandId, dailyPrice, weeklyPrice, monthlyPrice, specifications, customFields (boxContents, tags, bufferTime), barcode.  
**Populated by AI:** specifications (if from AI), specSource.  
**Required for visibility:** deletedAt=null, isActive=true.  

## AiContentDraft (schema.prisma:290-305)

**Populated by AI:** suggestedData, status.  
**Used for:** Per-product AI suggestion review (preview workflow).  

## AIProcessingJob (schema.prisma:171-189)

**Populated by AI backfill:** status, provider, totalItems, processedItems, failedItems, cost.  
**Linked to:** ImportJob.  

## ColumnMappingHistory (schema.prisma:3297-3308)

**Populated by:** saveMappingHistory in import-worker when mapColumns succeeds.  

---

═══════════════════════════════════════════════════════════════
📊 PHASE 7: FINAL AUDIT REPORT — MASTER SUMMARY
═══════════════════════════════════════════════════════════════

## 1. PIPELINE HEALTH SCORECARD

| Stage | Score | Notes |
|-------|-------|------|
| File Upload & Validation | 8/10 | 50MB limit, type check; no chunked upload |
| Sheet Parsing & Column Detection | 8/10 | ExcelJS solid; .xls rejected |
| Column Mapping UX | 6/10 | Auto-mapping works; UI mapping may not reach worker |
| Import Job Processing | 7/10 | Queue + sync fallback; some row failures |
| AI Content Generation | 7/10 | Preview + backfill; cost tracking weak |
| AI Review & Approval UX | 7/10 | Dialog works; no audit log |
| Equipment Publish Flow | 6/10 | No explicit publish; isActive default |
| Browse Page Integration | 8/10 | Works; cache in place |
| Error Handling & Recovery | 6/10 | Retry exists; silent failures |
| Admin Visibility & Monitoring | 5/10 | No import history; progress polling only |

**OVERALL PIPELINE SCORE: 6.8/10**

## 2. CRITICAL PATH ANALYSIS

| Step | Status |
|------|--------|
| 1. Upload file | ✅ |
| 2. Parse sheets | ✅ |
| 3. Map columns (worker) | ✅ |
| 4. Create ImportJob + Rows | ✅ |
| 5. Queue or sync process | ✅ |
| 6. Create Product per row | ⚠️ (some rows fail: name/boxContents/price) |
| 7. Sync Product → Equipment | ✅ |
| 8. Equipment visible | ✅ |

## 3. TOP 10 ISSUES BY IMPACT

1. **name.replace / boxContents.trim type errors** — Rows fail when Excel has non-string values. Effort: S.  
2. **Decimal overflow** — Price/deposit > 99,999,999 causes DB error. Effort: S.  
3. **No import history** — Admin cannot see past imports. Effort: M.  
4. **Cancel does not update DB** — Job stays PROCESSING. Effort: S.  
5. **syncProductToEquipment failure silent** — Row marked SUCCESS but Equipment not created. Effort: M.  
6. **Column mapping UI vs worker** — User mapping may not apply. Effort: M.  
7. **Backfill failure no notification** — User unaware. Effort: M.  
8. **errors.csv payload structure** — payload.row assumption. Effort: S.  
9. **No row-level SKIPPED status** — Skipped rows not tracked. Effort: S.  
10. **AI cost not tracked in preview** — totalCost = 0. Effort: S.  

## 4. MISSING FEATURES THAT USERS EXPECT

- Import history list
- Cancel in-progress import (with DB update)
- Real-time progress (SSE/WebSocket)
- Bulk publish/draft toggle for imported equipment
- AI rate limit user feedback

## 5. RECOMMENDED FIX ORDER

1. Fix name/boxContents type coercion (import-worker)
2. Cap prices at safe max (safePrice already used; verify deposit)
3. Add cancel → update ImportJob.status
4. Add import history page
5. Ensure sync failure marks row ERROR or retries

## 6. ENVIRONMENT & CONFIGURATION GAPS

| Env Var | Documented | In .env.example |
|---------|------------|-----------------|
| DATABASE_URL | ✅ | ✅ |
| REDIS_URL | ✅ | ✅ |
| OPENAI_API_KEY | ✅ | ✅ |
| GEMINI_API_KEY | ✅ | ✅ |
| AI_PROVIDER | ✅ | ✅ |
| PRICING_WEEKLY_FACTOR | ⚠️ | ✅ (commented) |
| PRICING_MONTHLY_FACTOR | ⚠️ | ✅ (commented) |
| BACKFILL_CONCURRENCY | ✅ | ✅ |
| ENCRYPTION_KEY (for AISettings) | ⚠️ | ✅ |

---

*End of Audit Document*
