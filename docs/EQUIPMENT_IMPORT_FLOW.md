# Equipment Import Flow

How equipment gets from Excel to the website.

---

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  1. ADMIN UPLOADS EXCEL                                                           │
│     /admin/inventory/import                                                       │
│     • Upload equipment-full-ai-filled_last_import.xlsx (or any .xlsx/.csv/.tsv)   │
│     • Select sheets to import (Camera, Lenses, Boxes, etc.)                      │
│     • Map each sheet to a category (required)                                     │
│     • Optionally select specific rows per sheet                                    │
│     • Submit                                                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  2. API CREATES IMPORT JOB                                                         │
│     POST /api/admin/imports                                                        │
│     • Parses Excel → extracts rows per sheet                                       │
│     • Creates ImportJob + ImportJobRow records (one row per Excel row)             │
│     • Adds job to BullMQ queue (or runs synchronously if queue unavailable)       │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  3. IMPORT WORKER PROCESSES ROWS                                                   │
│     processImportJob() in src/lib/services/import-worker.ts                       │
│     For each row:                                                                  │
│       • Resolves columns (name, sku, brand, price, etc.) via column mapper         │
│       • Ensures brand exists                                                       │
│       • Creates or updates Product (ProductCatalogService.create)                  │
│       • Creates InventoryItem with barcode (if new)                                │
│       • Calls syncProductToEquipment(productId)                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  4. PRODUCT → EQUIPMENT SYNC                                                      │
│     syncProductToEquipment() in src/lib/services/product-equipment-sync.service  │
│     • Creates or updates Equipment from Product data                               │
│     • Copies: sku, name, prices, category, brand, specs, etc.                      │
│     • Syncs ProductTranslation → Equipment display                                │
│     • Syncs Product images → Media records                                         │
│     • Equipment.id = Product.id (1:1 link)                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  5. WEBSITE SHOWS EQUIPMENT                                                        │
│     • Public equipment API reads from Equipment table (deletedAt: null)           │
│     • Admin equipment page reads from Equipment table                              │
│     • Equipment is the source of truth for what users see                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Files

| File | Role |
|------|------|
| `src/app/admin/(routes)/inventory/import/page.tsx` | Admin UI: upload Excel, select sheets, map categories |
| `src/app/api/admin/imports/route.ts` | API: accepts file, creates ImportJob, queues processing |
| `src/lib/queue/import.queue.ts` | BullMQ queue for async import |
| `src/lib/services/import-worker.ts` | `processImportJob()`: processes rows, creates Products |
| `src/lib/services/product-catalog.service.ts` | Creates/updates Product + ProductTranslation + InventoryItem |
| `src/lib/services/product-equipment-sync.service.ts` | `syncProductToEquipment()`: Product → Equipment |
| `src/lib/services/column-mapper.service.ts` | Maps Excel headers (name_en, sku, etc.) to system fields |

---

## Data Model

```
Excel Row
    │
    ├──► Product (catalog: name, price, SKU, category, brand)
    │         ├── ProductTranslation (name, description, SEO per locale)
    │         └── InventoryItem (barcode, serialNumber) — one per physical unit
    │
    └──► Equipment (rental: dailyPrice, slug, media)
              ├── Media (images from Product)
              └── Links to Product via productId (1:1)
```

- **Product** = catalog item (what you're renting)
- **Equipment** = rental-facing record (what appears on the website)
- **InventoryItem** = physical unit with barcode (for warehouse scanning)

---

## Why Some Excel Rows Don't Appear on the Website

1. **Sheet not selected** — If you didn't select "Boxes" (or another sheet) during import, those rows are never processed.
2. **No category mapped** — Each sheet must have a category. Rows fail with "Category mapping missing" if not.
3. **Row skipped** — Empty name, validation error, or "Barcode already exists" (InventoryItem conflict).
4. **Import failed** — Worker error, sync failure; row marked ERROR in ImportJobRow.
5. **syncProductToEquipment failed** — Product created but Equipment not; row may still show SUCCESS (known gap).

---

## Re-importing Missing Equipment

To add the 44 missing items (Boxes, Tripodgimbals, Sound, etc.):

1. Go to **Admin → Inventory → Import** (`/admin/inventory/import`)
2. Upload `equipment-full-ai-filled_last_import.xlsx`
3. Ensure **all sheets** are selected (including Boxes)
4. Map each sheet to a category (e.g. Boxes → "Cases & Bags")
5. Run the import

Rows that match existing Products by barcode will **update** rather than duplicate. New rows will create new Products and Equipment.
