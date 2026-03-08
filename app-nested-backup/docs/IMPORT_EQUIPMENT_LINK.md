# Link Between Import, Products, and Equipment

## Why `/admin/inventory/equipment` Can Be Empty

The **admin equipment page** (`http://localhost:3000/admin/inventory/equipment`) reads from the **Equipment** table in the database. It is **not** reading from the Import or from the Product table directly.

## The Flow (How Data Gets to Equipment)

```
Excel Import
    ↓
Creates/updates  Product  (+ InventoryItem with barcode)
    ↓
syncProductToEquipment(productId)  ← runs after each successful row
    ↓
Creates/updates  Equipment  (so it appears on the equipment page)
```

So:

- If **import fails** (e.g. all rows show "Barcode already exists" and you had no fix): **no Products** are created/updated → **no sync** → **Equipment table stays empty** → equipment page is empty.
- If **import succeeds**: each successful row creates/updates a **Product**, then **syncProductToEquipment** runs for that product and creates/updates **Equipment** → items appear on the equipment page.

There **is** a link: **Product** is the source; **Equipment** is synced from it. The equipment page shows only **Equipment** records.

## Where "Barcode already exists" Comes From

That error is from the **InventoryItem** table (under Product), not from Equipment:

- **Product** = catalog item (name, price, translations, etc.).
- **InventoryItem** = one row per physical unit, with a **barcode** (unique in the whole DB).

So even with **zero Equipment**, you can have **Products** that have **InventoryItems** with barcodes like 10000001. Those were likely created by a **previous successful import** (or another process). The equipment page stays empty if no **Equipment** records were ever created (e.g. because the last import run failed before sync).

## How to Find Products / InventoryItems (the Data That Causes the Error)

1. **Script (recommended)**  
   From project root:
   ```bash
   npx tsx scripts/check-barcode-conflicts.ts
   ```
   Or for specific barcodes:
   ```bash
   npx tsx scripts/check-barcode-conflicts.ts 10000001 10000002 10000003
   ```
   This lists **InventoryItem** rows (and their parent **Product**). Those are the records that “own” the barcodes and can cause "Barcode already exists".

2. **Prisma Studio**  
   ```bash
   npx prisma studio
   ```
   Open **InventoryItem** and **Product** to see barcodes and which product each item belongs to.

3. **AI Dashboard / Content Review**  
   Some admin pages (e.g. Content Review) list **Products** by quality; you can open a product by ID. They do not list by barcode, so the script or Prisma Studio is better for finding conflicts.

## After the Fix (Update by Barcode)

When you **re-run the import** (new file or Retry):

- If a row has a barcode that **already exists** in **InventoryItem**: the worker **updates the existing Product** (no duplicate barcode), then that product’s ID is included in the batch that gets synced.
- **syncProductToEquipment** runs for all successful products (including those updated by barcode).
- So **Equipment** is created/updated and the **equipment page** should show the items.

If the page is still empty after a run that shows success:

- Check the worker logs for errors in **syncProductToEquipment** (e.g. "Sync to equipment failed for product …").
- Run the script above to confirm that **Product** and **InventoryItem** exist for the barcodes you imported.
