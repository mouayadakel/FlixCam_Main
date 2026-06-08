/**
 * Promote all Equipment.media images to Product + ProductImage (equipment is master).
 *
 * Run: npx tsx scripts/equipment-media-as-master.ts
 */

import 'dotenv/config'
import { prisma } from '../src/lib/db/prisma'
import { promoteEquipmentMediaToProduct } from '../src/lib/services/product-photo.service'
import { cacheDelete } from '../src/lib/cache'

async function main() {
  console.log('=== Equipment media → Product (master sync) ===\n')

  const equipment = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      media: { some: { deletedAt: null, type: 'image' } },
    },
    select: { id: true, sku: true, isActive: true },
    orderBy: { sku: 'asc' },
  })

  let synced = 0
  let urlsTotal = 0
  let skipped = 0

  const BATCH = 25
  for (let i = 0; i < equipment.length; i += BATCH) {
    const batch = equipment.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async (eq) => {
        try {
          const count = await promoteEquipmentMediaToProduct(eq.id)
          if (count > 0) {
            synced++
            urlsTotal += count
          } else {
            skipped++
          }
        } catch (err) {
          console.error(
            `  ✗ ${eq.sku}:`,
            err instanceof Error ? err.message : String(err)
          )
        }
      })
    )
    console.log(`  ... ${Math.min(i + BATCH, equipment.length)}/${equipment.length}`)
  }

  await cacheDelete('equipmentList', 'featured')

  const activeWithMedia = await prisma.equipment.count({
    where: {
      deletedAt: null,
      isActive: true,
      media: { some: { deletedAt: null, type: 'image' } },
    },
  })
  const productsWithHero = await prisma.product.count({
    where: {
      deletedAt: null,
      featuredImage: { not: '' },
      NOT: { featuredImage: { contains: 'placeholder' } },
    },
  })

  console.log('\nSummary:')
  console.log(`  Equipment with media processed: ${equipment.length}`)
  console.log(`  Products updated from equipment: ${synced}`)
  console.log(`  Total image URLs promoted: ${urlsTotal}`)
  console.log(`  Skipped (no valid URLs / no product): ${skipped}`)
  console.log(`  Active equipment with media: ${activeWithMedia}`)
  console.log(`  Products with real hero image: ${productsWithHero}`)
  console.log('\nEquipment.media is now master — Product→Equipment sync will not overwrite existing equipment images.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
