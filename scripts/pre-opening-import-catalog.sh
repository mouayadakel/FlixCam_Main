#!/usr/bin/env bash
# Pre-opening catalog pipeline: import → repair → photos → verify
set -euo pipefail
cd "$(dirname "$0")/.."

XLSX="${1:-Flixcam_invetory.all-equipment.full-data.xlsx}"
COMMIT="${COMMIT:-}"

echo "=== Step 1: Import (dry-run) from $XLSX ==="
npx tsx scripts/import-flix-stock-from-xlsx.ts --file="$XLSX"

if [[ "$COMMIT" == "1" ]]; then
  echo "=== Step 2: Import (commit) ==="
  npx tsx scripts/import-flix-stock-from-xlsx.ts --file="$XLSX" --commit
fi

echo "=== Step 3: Repair catalog gaps (dry-run) ==="
npx tsx scripts/pre-opening-repair-catalog.ts --file="$XLSX"

if [[ "$COMMIT" == "1" ]]; then
  echo "=== Step 4: Repair catalog gaps (commit) ==="
  npx tsx scripts/pre-opening-repair-catalog.ts --file="$XLSX" --commit
  npx tsx scripts/backfill-inventory-barcodes.ts --commit
  npx tsx scripts/repair-catalog-photos.ts --commit
fi

echo "=== Step 5: Verify catalog readiness ==="
npx tsx scripts/pre-opening-catalog-verify.ts

echo "Done. To apply writes: COMMIT=1 ./scripts/pre-opening-import-catalog.sh"
