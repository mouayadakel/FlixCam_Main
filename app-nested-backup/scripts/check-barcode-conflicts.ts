/**
 * Check which barcodes exist in the DB (InventoryItem table).
 * The "Barcode already exists" error comes from here, NOT from Equipment.
 *
 * Run: npx tsx scripts/check-barcode-conflicts.ts
 * Optional: npx tsx scripts/check-barcode-conflicts.ts 10000001 10000002 10000003
 */

import { prisma } from '../src/lib/db/prisma'

async function main() {
  const args = process.argv.slice(2)
  const filterBarcodes = args.length > 0 ? args : null

  console.log('=== InventoryItem barcodes (source of "Barcode already exists") ===\n')

  const where = filterBarcodes
    ? { barcode: { in: filterBarcodes }, deletedAt: null }
    : { deletedAt: null }

  const items = await prisma.inventoryItem.findMany({
    where,
    select: {
      id: true,
      barcode: true,
      serialNumber: true,
      parentProductId: true,
      product: {
        select: {
          id: true,
          sku: true,
          deletedAt: true,
          translations: { where: { locale: 'en' }, take: 1, select: { name: true } },
        },
      },
    },
    orderBy: { barcode: 'asc' },
  })

  if (items.length === 0) {
    console.log('No InventoryItems found.')
    if (filterBarcodes) {
      console.log('So barcodes', filterBarcodes.join(', '), 'are free – import should create new products.')
    }
    await prisma.$disconnect()
    return
  }

  console.log(`Found ${items.length} InventoryItem(s):\n`)
  for (const item of items) {
    const name = item.product?.translations?.[0]?.name ?? item.product?.sku ?? '-'
    console.log(`  Barcode: ${item.barcode}`)
    console.log(`    Product ID: ${item.parentProductId}, SKU: ${item.product?.sku ?? '-'}, Name: ${name}`)
    console.log('')
  }

  console.log('These barcodes are in the Product/InventoryItem table (not Equipment).')
  console.log('Import will update these products when you re-import rows with the same barcode.')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
