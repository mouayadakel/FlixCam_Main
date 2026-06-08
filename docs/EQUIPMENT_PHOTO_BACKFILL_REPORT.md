# Equipment photo backfill report

**Final status:** 0 active equipment missing images (was 45).

## What was run

1. **Repair catalog** — synced 67 admin uploads to Product; reordered 15 primaries to `/uploads/` files.
2. **Sync guard** — Product→Equipment sync no longer deletes admin-uploaded media when Product has no URLs.
3. **AI backfill** — sourced and auto-approved images for 19 items (Google-sourced where validation passed).
4. **Emergency Pexels** — 24 items with no API results got a stock hero image so the catalog is not empty.

## Important

- **24 items** use **generic Pexels stock** photos (not your exact SKU). Replace them in Admin → Equipment → Media when you have real photos.
- **Google Custom Search** is disabled on your API project (`403 PERMISSION_DENIED`). Enable it in Google Cloud for better auto-sourcing later.
- **Unsplash** is rate-limited; Pexels was used as fallback.
- Master Excel still has **empty `featuredImageUrl`** column — add direct image URLs before the next bulk import.

## Scripts (re-run anytime)

```bash
npx tsx scripts/repair-catalog-photos.ts --commit
npx tsx scripts/backfill-missing-equipment-photos.ts
npx tsx scripts/emergency-pexels-backfill.ts
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/audit-equipment-images.ts
```

Generated: 2026-06-04
