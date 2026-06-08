/**
 * Repair catalog photos after mixed Excel import + admin uploads.
 *
 * - Pushes admin Equipment media → Product when Product still has placeholder/empty hero
 * - Seeds ProductImage from Product URLs and syncs → Equipment when Product has real URLs but no media
 * - Reorders primary image to prefer /uploads and flixcam.rent over stock/scraped URLs
 *
 * Run:
 *   npx tsx scripts/repair-catalog-photos.ts           # dry-run
 *   npx tsx scripts/repair-catalog-photos.ts --commit  # apply
 */

import { prisma } from '../src/lib/db/prisma'
import { syncEquipmentToProduct } from '../src/lib/services/product-equipment-sync.service'
import { syncProductToEquipment } from '../src/lib/services/product-equipment-sync.service'
import {
  isPlaceholderUrl,
  promoteApprovedPhotosToProduct,
  seedApprovedProductImagesFromLiveFields,
} from '../src/lib/services/product-photo.service'

const COMMIT = process.argv.includes('--commit')

const LOW_TRUST_HOSTS = [
  'images.unsplash.com',
  'images.pexels.com',
  'encrypted-tbn0.gstatic.com',
  'm.media-amazon.com',
]

function mediaTrustScore(url: string): number {
  if (url.includes('/uploads/') || url.includes('flixcam.rent')) return 100
  try {
    const host = new URL(url.startsWith('http') ? url : `https://flixcam.rent${url}`).hostname
    if (LOW_TRUST_HOSTS.some((h) => host.includes(h))) return 10
  } catch {
    return 0
  }
  return 50
}

async function repairEquipmentToProduct(): Promise<number> {
  const candidates = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      productId: { not: null },
      media: { some: { deletedAt: null, type: 'image' } },
    },
    select: {
      id: true,
      sku: true,
      productId: true,
      media: {
        where: { deletedAt: null, type: 'image' },
        select: { url: true },
        take: 1,
      },
      product: { select: { featuredImage: true } },
    },
  })

  let count = 0
  for (const eq of candidates) {
    const hero = eq.product?.featuredImage
    if (hero && !isPlaceholderUrl(hero)) continue
    const hasTrusted = eq.media.some((m) => mediaTrustScore(m.url) >= 50)
    if (!hasTrusted) continue

    console.log(`  [E→P] ${eq.sku}: copy admin media to Product`)
    if (COMMIT) {
      await syncEquipmentToProduct(eq.id)
    }
    count++
  }
  return count
}

async function repairProductToEquipment(): Promise<number> {
  const candidates = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      productId: { not: null },
      NOT: { media: { some: { deletedAt: null, type: 'image' } } },
    },
    select: { id: true, sku: true, productId: true, product: { select: { featuredImage: true } } },
  })

  let count = 0
  for (const eq of candidates) {
    const feat = eq.product?.featuredImage
    if (!feat || isPlaceholderUrl(feat)) continue

    console.log(`  [P→E] ${eq.sku}: sync Product image URLs to Equipment media`)
    if (COMMIT) {
      await seedApprovedProductImagesFromLiveFields(eq.productId!)
      await promoteApprovedPhotosToProduct(eq.productId!)
      await syncProductToEquipment(eq.productId!)
    }
    count++
  }
  return count
}

async function reorderPrimaryImages(): Promise<number> {
  const equipment = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      media: { some: { deletedAt: null, type: 'image' } },
    },
    select: {
      id: true,
      sku: true,
      media: {
        where: { deletedAt: null, type: 'image' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, url: true, sortOrder: true },
      },
    },
  })

  let count = 0
  for (const eq of equipment) {
    if (eq.media.length < 2) continue
    const sorted = [...eq.media].sort(
      (a, b) => mediaTrustScore(b.url) - mediaTrustScore(a.url)
    )
    const best = sorted[0]
    if (eq.media[0].id === best.id) continue
    if (mediaTrustScore(best.url) <= mediaTrustScore(eq.media[0].url)) continue

    console.log(`  [order] ${eq.sku}: primary → ${best.url.slice(0, 70)}`)
    if (COMMIT) {
      for (let i = 0; i < sorted.length; i++) {
        await prisma.media.update({
          where: { id: sorted[i].id },
          data: { sortOrder: i },
        })
      }
      if (eq.id) {
        try {
          await syncEquipmentToProduct(eq.id)
        } catch {
          /* product may lack brand — sortOrder fix still applied */
        }
      }
    }
    count++
  }
  return count
}

async function main() {
  console.log(COMMIT ? '=== Repair catalog photos (COMMIT) ===' : '=== Repair catalog photos (DRY RUN) ===')
  console.log('')

  const e2p = await repairEquipmentToProduct()
  const p2e = await repairProductToEquipment()
  const reorder = await reorderPrimaryImages()

  console.log('')
  console.log('Summary:')
  console.log(`  Equipment → Product (admin photos saved to catalog): ${e2p}`)
  console.log(`  Product → Equipment (restore media from Product URLs): ${p2e}`)
  console.log(`  Reorder primary to trusted uploads: ${reorder}`)

  if (!COMMIT) {
    console.log('')
    console.log('No changes written. Re-run with --commit to apply.')
  }

  const noImage = await prisma.equipment.count({
    where: {
      deletedAt: null,
      isActive: true,
      NOT: { media: { some: { deletedAt: null, type: 'image' } } },
    },
  })
  console.log('')
  console.log(`Active equipment still missing images: ${noImage}`)
  console.log(
    'Note: Master CSV has 0 featuredImageUrl values — add image URLs to Excel or upload photos in admin for those items.'
  )

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
