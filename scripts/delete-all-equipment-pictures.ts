/**
 * Deletes all pictures of all equipment.
 * - Deletes Media records linked to equipment
 * - Sets Product featuredImage and galleryImages to placeholder for products with equipment
 *
 * Usage:
 *   npx tsx scripts/delete-all-equipment-pictures.ts        # Dry run
 *   npx tsx scripts/delete-all-equipment-pictures.ts --commit
 */

import { prisma } from '../src/lib/db/prisma'

const PLACEHOLDER = '/images/placeholder.jpg'

async function main() {
  const args = new Set(process.argv.slice(2))
  const commit = args.has('--commit')

  const mediaCount = await prisma.media.count({
    where: { equipmentId: { not: null } },
  })

  const productIds = await prisma.equipment.findMany({
    where: { productId: { not: null }, deletedAt: null },
    select: { productId: true },
  })
  const ids = [...new Set(productIds.map((e) => e.productId!))]

  console.log(`Media records to delete: ${mediaCount}`)
  console.log(`Products to clear images: ${ids.length}`)

  if (!commit) {
    console.log('\n[DRY RUN] No changes made. To apply, run with --commit:')
    console.log('  npx tsx scripts/delete-all-equipment-pictures.ts --commit')
    return
  }

  const mediaResult = await prisma.media.deleteMany({
    where: { equipmentId: { not: null } },
  })

  const productResult = await prisma.product.updateMany({
    where: { id: { in: ids } },
    data: {
      featuredImage: PLACEHOLDER,
      galleryImages: [],
    },
  })

  console.log(`\n✅ Deleted ${mediaResult.count} Media records`)
  console.log(`✅ Cleared images on ${productResult.count} Products`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
