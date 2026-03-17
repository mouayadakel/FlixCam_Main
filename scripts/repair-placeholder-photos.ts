/**
 * @file repair-placeholder-photos.ts
 * @description Mark placeholder-bearing items as photo-incomplete and queue for photo backfill.
 * Does NOT invent images. Run: npx ts-node scripts/repair-placeholder-photos.ts [--dry-run]
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { isPlaceholderUrl } from '../src/lib/services/product-photo.service'

const prisma = new PrismaClient()

async function run() {
  const dryRun = process.argv.includes('--dry-run')
  if (dryRun) console.log('🔍 Dry run — no changes will be made\n')

  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      status: { not: 'ARCHIVED' },
      equipment: {
        is: {
          deletedAt: null,
          quantityAvailable: { gt: 0 },
        },
      },
    },
    select: { id: true, sku: true, featuredImage: true, galleryImages: true, photoStatus: true },
  })

  let updated = 0
  for (const p of products) {
    const gallery = Array.isArray(p.galleryImages) ? (p.galleryImages as string[]) : []
    const allUrls = [p.featuredImage, ...gallery].filter(Boolean)
    const hasPlaceholder = allUrls.some((url) => isPlaceholderUrl(url))

    if (!hasPlaceholder) continue

    if (!dryRun) {
      await prisma.product.update({
        where: { id: p.id },
        data: {
          photoStatus: 'incomplete',
          needsAiReview: true,
          aiReviewReason: 'Placeholder image detected — needs photo backfill',
        },
      })
    }
    updated++
    console.log(`   ${p.sku ?? p.id} — marked photo-incomplete`)
  }

  console.log(`\n${dryRun ? 'Would update' : 'Updated'}: ${updated} products`)
}

run().catch(console.error).finally(() => prisma.$disconnect())
