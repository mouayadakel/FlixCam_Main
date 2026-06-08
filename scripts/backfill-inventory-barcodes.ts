/**
 * Backfill InventoryItem rows for equipment that has a barcode but no inventory record.
 *
 * Usage:
 *   npx tsx scripts/backfill-inventory-barcodes.ts           # dry-run
 *   npx tsx scripts/backfill-inventory-barcodes.ts --commit   # apply
 */

import { prisma } from '../src/lib/db/prisma'
import { InventoryItemStatus } from '@prisma/client'

const COMMIT = process.argv.includes('--commit')

async function main() {
  const equipment = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      barcode: { not: null },
      productId: { not: null },
    },
    select: {
      id: true,
      sku: true,
      barcode: true,
      productId: true,
      product: {
        select: {
          inventoryItems: {
            where: { deletedAt: null },
            select: { id: true },
          },
        },
      },
    },
  })

  let wouldCreate = 0
  let created = 0

  for (const item of equipment) {
    if (!item.barcode?.trim() || !item.productId) continue
    if ((item.product?.inventoryItems.length ?? 0) > 0) continue

    wouldCreate++
    if (!COMMIT) continue

    const serial = item.barcode.trim()
    await prisma.inventoryItem.create({
      data: {
        parentProductId: item.productId,
        serialNumber: serial,
        barcode: serial,
        itemStatus: InventoryItemStatus.AVAILABLE,
        createdBy: 'backfill-inventory-barcodes',
      },
    })
    created++
  }

  console.log(`Mode: ${COMMIT ? 'COMMIT' : 'DRY RUN'}`)
  console.log(`Equipment with barcode, no inventory: ${wouldCreate}`)
  if (COMMIT) console.log(`Created inventory items: ${created}`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
