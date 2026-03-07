/**
 * Cleanup orphaned Product + InventoryItem records that have no matching Equipment.
 * This is useful when previous imports failed to sync products to equipment,
 * or when equipment was deleted but products remained.
 *
 * Run: npx tsx scripts/cleanup-orphaned-imports.ts
 * Dry run: npx tsx scripts/cleanup-orphaned-imports.ts --dry-run
 */

import { prisma } from '../src/lib/db/prisma'

async function main() {
  const isDryRun = process.argv.includes('--dry-run')

  console.log(`=== Cleanup Orphaned Import Records ${isDryRun ? '(DRY RUN)' : ''} ===\n`)

  const inventoryItems = await prisma.inventoryItem.findMany({
    include: {
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

  if (inventoryItems.length === 0) {
    console.log('No InventoryItems found. Database is clean.')
    await prisma.$disconnect()
    return
  }

  console.log(`Found ${inventoryItems.length} InventoryItem(s).\n`)

  let orphanedCount = 0
  const orphanedProductIds = new Set<string>()

  for (const item of inventoryItems) {
    const equipment = await prisma.equipment.findFirst({
      where: { productId: item.parentProductId },
      select: { id: true, deletedAt: true },
    })

    const hasActiveEquipment = equipment && !equipment.deletedAt
    const productName = item.product?.translations?.[0]?.name ?? item.product?.sku ?? '-'

    if (!hasActiveEquipment) {
      orphanedCount++
      orphanedProductIds.add(item.parentProductId)
      console.log(`  ORPHANED: Barcode=${item.barcode}, Product="${productName}"`)
      console.log(`    ProductId=${item.parentProductId}, Product.deletedAt=${item.product?.deletedAt ?? 'null'}`)
      console.log(`    Equipment=${equipment ? `id=${equipment.id}, deletedAt=${equipment.deletedAt}` : 'NOT FOUND'}`)
      console.log('')
    }
  }

  if (orphanedCount === 0) {
    console.log('No orphaned records found. Everything is in sync.')
    await prisma.$disconnect()
    return
  }

  console.log(`\nFound ${orphanedCount} orphaned InventoryItem(s) across ${orphanedProductIds.size} product(s).`)

  if (isDryRun) {
    console.log('\nDry run — no changes made. Remove --dry-run to delete these records.')
    await prisma.$disconnect()
    return
  }

  console.log('\nCleaning up...')

  for (const productId of orphanedProductIds) {
    await prisma.inventoryItem.deleteMany({ where: { parentProductId: productId } })
    await prisma.productTranslation.deleteMany({ where: { productId } })

    const media = await prisma.media.findMany({ where: { productId }, select: { id: true } })
    if (media.length > 0) {
      await prisma.media.deleteMany({ where: { productId } })
    }

    const equipment = await prisma.equipment.findFirst({ where: { productId }, select: { id: true } })
    if (equipment) {
      await prisma.equipment.delete({ where: { id: equipment.id } })
    }

    await prisma.product.delete({ where: { id: productId } })
    console.log(`  Deleted product ${productId} and all related records`)
  }

  console.log(`\nDone! Cleaned up ${orphanedProductIds.size} orphaned product(s).`)
  console.log('You can now re-import your Excel file.')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
