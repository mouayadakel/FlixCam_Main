/**
 * Equipment Image Health Audit Script
 *
 * Finds equipment with missing or broken image data for admin review.
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/audit-equipment-images.ts
 *
 * Outputs:
 * - Equipment with no valid image media
 * - Equipment media audit (all media rows for active equipment)
 * - Optional: list of image URLs to verify (for HEAD/GET checks)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Equipment Image Health Audit ===\n')

  // A. Equipment with no valid image
  const noImage = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      NOT: {
        media: {
          some: {
            deletedAt: null,
            type: 'image',
          },
        },
      },
    },
    select: {
      id: true,
      sku: true,
      model: true,
      featured: true,
    },
    orderBy: [{ model: 'asc' }, { sku: 'asc' }],
  })

  console.log('A. Active equipment with NO valid image media:')
  console.log(`   Count: ${noImage.length}`)
  if (noImage.length > 0) {
    noImage.forEach((e) => {
      const featured = e.featured ? ' [FEATURED]' : ''
      console.log(`   - ${e.sku} | ${e.model ?? '—'}${featured} (id: ${e.id})`)
    })
  }
  console.log('')

  // B. Featured equipment missing images
  const featuredNoImage = noImage.filter((e) => e.featured)
  if (featuredNoImage.length > 0) {
    console.log('B. Featured equipment missing images (CRITICAL):')
    featuredNoImage.forEach((e) => {
      console.log(`   - ${e.sku} | ${e.model ?? '—'} (id: ${e.id})`)
    })
    console.log('')
  }

  // C. Equipment media audit (first 50 active equipment with their media)
  const mediaAudit = await prisma.equipment.findMany({
    where: { deletedAt: null, isActive: true },
    take: 50,
    select: {
      id: true,
      sku: true,
      model: true,
      featured: true,
      media: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          url: true,
          type: true,
          sortOrder: true,
        },
      },
    },
    orderBy: { model: 'asc' },
  })

  console.log('C. Sample media audit (first 50 active equipment):')
  for (const e of mediaAudit) {
    const imageCount = e.media.filter((m) => m.type === 'image').length
    const nonImageCount = e.media.filter((m) => m.type !== 'image').length
    const status =
      imageCount === 0
        ? 'NO IMAGES'
        : nonImageCount > 0
          ? `${imageCount} images, ${nonImageCount} non-image`
          : 'OK'
    console.log(`   ${e.sku} | ${e.model ?? '—'} | ${status}`)
    if (e.media.length > 0 && imageCount === 0) {
      console.log(`      First media: type=${e.media[0].type}, url=${e.media[0].url?.slice(0, 60)}...`)
    }
  }
  console.log('')

  // D. URLs to verify (for external HEAD check)
  const urlsToVerify = await prisma.media.findMany({
    where: {
      deletedAt: null,
      type: 'image',
      equipmentId: { not: null },
    },
    select: { id: true, url: true, equipmentId: true },
    take: 20,
  })

  console.log('D. Sample image URLs to verify (curl -I <url>):')
  urlsToVerify.forEach((m) => {
    console.log(`   ${m.id}: ${m.url}`)
  })
  console.log('')

  // E. Summary counts
  const totalActive = await prisma.equipment.count({
    where: { deletedAt: null, isActive: true },
  })
  const withImage = totalActive - noImage.length

  console.log('E. Summary counts:')
  console.log(`   Total active equipment: ${totalActive}`)
  console.log(`   With at least one image: ${withImage}`)
  console.log(`   With no image: ${noImage.length}`)
  console.log(`   Featured with no image: ${featuredNoImage.length}`)
  console.log('')

  // F. Export IDs for repair (JSON)
  const repairList = noImage.map((e) => ({
    id: e.id,
    sku: e.sku,
    model: e.model,
    featured: e.featured,
    action: 'Upload image or set isActive=false',
  }))
  console.log('F. Equipment needing repair (JSON):')
  console.log(JSON.stringify(repairList, null, 2))

  console.log('\n=== Audit complete ===')
  console.log('\nRecommended actions:')
  if (noImage.length > 0) {
    console.log(`1. Fix ${noImage.length} equipment with no images: upload images via admin or mark isActive=false`)
  }
  if (featuredNoImage.length > 0) {
    console.log(`2. URGENT: ${featuredNoImage.length} featured equipment have no images - fix or unfeature`)
  }
  console.log('3. Run: curl -I "<url>" to verify image URLs return 200 and Content-Type: image/*')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
