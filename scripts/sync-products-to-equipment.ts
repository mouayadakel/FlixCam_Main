/**
 * Sync all Products (that have no Equipment yet) to Equipment table.
 * Use when Products exist from import but Equipment page is empty.
 *
 * Run: npx tsx scripts/sync-products-to-equipment.ts
 */

import { prisma } from '../src/lib/db/prisma'
import { syncProductToEquipment } from '../src/lib/services/product-equipment-sync.service'

async function main() {
  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      OR: [
        { equipment: null },
        { equipment: { deletedAt: { not: null } } },
      ],
    },
    select: { id: true, sku: true },
    orderBy: { createdAt: 'asc' },
  })

  if (products.length === 0) {
    console.log('No Products found that need syncing to Equipment.')
    await prisma.$disconnect()
    return
  }

  console.log(`Found ${products.length} Product(s) without Equipment. Syncing...\n`)

  let ok = 0
  let err = 0

  for (const p of products) {
    try {
      await syncProductToEquipment(p.id)
      console.log(`  ✓ ${p.sku ?? p.id}`)
      ok++
    } catch (e) {
      console.error(`  ✗ ${p.sku ?? p.id}:`, e instanceof Error ? e.message : String(e))
      err++
    }
  }

  console.log(`\nDone. Synced: ${ok}, Failed: ${err}`)
  console.log('Refresh http://localhost:3000/admin/inventory/equipment to see the items.')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
