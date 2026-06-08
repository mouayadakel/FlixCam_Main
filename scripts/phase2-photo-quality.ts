/**
 * Phase 2: Photo quality — prefer real uploads, approve/reject pending backlog.
 *
 * Run: npx tsx scripts/phase2-photo-quality.ts
 *      npx tsx scripts/phase2-photo-quality.ts --commit
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { prisma } from '../src/lib/db/prisma'
import { syncEquipmentToProduct } from '../src/lib/services/product-equipment-sync.service'
import { syncProductToEquipment } from '../src/lib/services/product-equipment-sync.service'
import {
  promoteApprovedPhotosToProduct,
  isPlaceholderUrl,
} from '../src/lib/services/product-photo.service'

const COMMIT = process.argv.includes('--commit')

const LOW_TRUST = ['pexels.com', 'unsplash.com', 'gstatic.com', 'media-amazon.com']

function trustScore(url: string): number {
  if (url.includes('/uploads/')) return 100
  if (url.includes('flixcam.rent')) return 90
  try {
    const host = new URL(url.startsWith('http') ? url : `https://flixcam.rent${url}`).hostname
    if (LOW_TRUST.some((d) => host.includes(d))) return 10
  } catch {
    return 0
  }
  return 55
}

function isLowTrustUrl(url: string): boolean {
  return trustScore(url) <= 10
}

async function reorderToBestUpload(): Promise<number> {
  const equipment = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      media: { some: { deletedAt: null, type: 'image' } },
    },
    select: {
      id: true,
      sku: true,
      productId: true,
      media: {
        where: { deletedAt: null, type: 'image' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, url: true, sortOrder: true },
      },
    },
  })

  let fixed = 0
  for (const eq of equipment) {
    if (eq.media.length < 1) continue
    const primary = eq.media[0]
    if (!isLowTrustUrl(primary.url)) continue

    const best = [...eq.media].sort((a, b) => trustScore(b.url) - trustScore(a.url))[0]
    if (best.id === primary.id || trustScore(best.url) <= trustScore(primary.url)) continue

    if (COMMIT) {
      const sorted = [...eq.media].sort((a, b) => trustScore(b.url) - trustScore(a.url))
      for (let i = 0; i < sorted.length; i++) {
        await prisma.media.update({ where: { id: sorted[i].id }, data: { sortOrder: i } })
      }
      if (eq.productId) {
        await syncEquipmentToProduct(eq.id)
      }
    }
    console.log(`  [reorder] ${eq.sku}: ${primary.url.slice(0, 50)} → ${best.url.slice(0, 50)}`)
    fixed++
  }
  return fixed
}

async function processPendingBacklog(): Promise<{
  approved: number
  rejected: number
  affectedProductIds: string[]
}> {
  const pending = await prisma.productImage.findMany({
    where: { isDeleted: false, pendingReview: true },
    select: {
      id: true,
      productId: true,
      url: true,
      imageSource: true,
      matchScore: true,
      scoreBreakdown: true,
    },
    orderBy: [{ matchScore: 'desc' }],
  })

  const byProduct = new Map<string, typeof pending>()
  for (const img of pending) {
    const list = byProduct.get(img.productId) ?? []
    list.push(img)
    byProduct.set(img.productId, list)
  }

  let approved = 0
  let rejected = 0
  const affected = new Set<string>()

  for (const [productId, images] of byProduct) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        featuredImage: true,
        equipment: {
          select: {
            media: {
              where: { deletedAt: null, type: 'image' },
              orderBy: [{ sortOrder: 'asc' }],
              take: 1,
              select: { url: true },
            },
          },
        },
      },
    })
    const primaryUrl = product?.equipment?.media?.[0]?.url
    const hasTrustedPrimary = primaryUrl != null && trustScore(primaryUrl) >= 90

    const toApprove: string[] = []
    const toReject: string[] = []

    for (const img of images) {
      const breakdown = img.scoreBreakdown as Record<string, unknown> | null
      const exact =
        breakdown?.exactSkuQuery === true || breakdown?.exactModelQuery === true
      const score = img.matchScore != null ? Number(img.matchScore) : 0
      const lowStock =
        img.url.includes('unsplash') ||
        img.url.includes('pexels') ||
        img.imageSource === 'STOCK_PHOTO'

      if (exact && score >= 0.75) {
        toApprove.push(img.id)
        continue
      }
      if (lowStock && score < 0.5 && !exact) {
        toReject.push(img.id)
      }
    }

    // Promote up to 3 best pending per product if hero still low-trust
    const hero = product?.featuredImage
    const heroLow = !hero || isPlaceholderUrl(hero) || isLowTrustUrl(hero)
    if (heroLow && !hasTrustedPrimary && toApprove.length === 0) {
      const best = images
        .filter((i) => !toReject.includes(i.id))
        .filter((i) => trustScore(i.url) >= 50 || Number(i.matchScore ?? 0) >= 0.55)
        .slice(0, 3)
      for (const b of best) toApprove.push(b.id)
    }

    if (toApprove.length || toReject.length) affected.add(productId)

    if (!COMMIT) {
      approved += toApprove.length
      rejected += toReject.length
      continue
    }

    for (let i = 0; i < toApprove.length; i++) {
      await prisma.productImage.update({
        where: { id: toApprove[i] },
        data: {
          pendingReview: false,
          isPrimary: i === 0,
          sortOrder: i,
          reviewedAt: new Date(),
          reviewedBy: 'phase2-auto',
        },
      })
      approved++
    }
    for (const id of toReject) {
      await prisma.productImage.update({
        where: { id },
        data: {
          pendingReview: false,
          isDeleted: true,
          rejectionReason: 'phase2_low_match_stock',
          reviewedAt: new Date(),
          reviewedBy: 'phase2-auto',
        },
      })
      rejected++
    }
  }

  return { approved, rejected, affectedProductIds: [...affected] }
}

async function syncAffectedProducts(productIds: string[]): Promise<void> {
  for (const productId of productIds) {
    await promoteApprovedPhotosToProduct(productId)
    await syncProductToEquipment(productId)
  }
}

async function main() {
  console.log(COMMIT ? '=== Phase 2: Photo quality (COMMIT) ===' : '=== Phase 2: Photo quality (DRY RUN) ===\n')

  const reordered = await reorderToBestUpload()
  const backlog = await processPendingBacklog()

  if (COMMIT && backlog.affectedProductIds.length > 0) {
    console.log(`\nSyncing ${backlog.affectedProductIds.length} products...`)
    await syncAffectedProducts(backlog.affectedProductIds)
  }

  const stockPrimary = await prisma.equipment.count({
    where: {
      deletedAt: null,
      isActive: true,
      media: {
        some: {
          deletedAt: null,
          type: 'image',
          sortOrder: 0,
          OR: [
            { url: { contains: 'pexels' } },
            { url: { contains: 'unsplash' } },
            { url: { contains: 'gstatic' } },
          ],
        },
      },
    },
  })
  const pendingImg = await prisma.productImage.count({
    where: { isDeleted: false, pendingReview: true },
  })
  const uploadPrimary = await prisma.equipment.count({
    where: {
      deletedAt: null,
      isActive: true,
      media: { some: { deletedAt: null, type: 'image', sortOrder: 0, url: { contains: '/uploads/' } } },
    },
  })

  const stillStock = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      media: {
        some: {
          deletedAt: null,
          type: 'image',
          sortOrder: 0,
          OR: [
            { url: { contains: 'pexels' } },
            { url: { contains: 'unsplash' } },
          ],
        },
      },
      NOT: {
        media: { some: { deletedAt: null, type: 'image', url: { contains: '/uploads/' } } },
      },
    },
    select: { sku: true, model: true },
    orderBy: { sku: 'asc' },
  })

  const reportPath = path.join(process.cwd(), 'docs', 'PHASE2_PHOTO_QUALITY_REPORT.md')
  const lines = [
    '# Phase 2: Photo quality report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${COMMIT ? 'COMMIT' : 'DRY RUN'}`,
    '',
    '## Actions',
    `- Reordered primary to trusted upload: **${reordered}**`,
    `- Pending approved: **${backlog.approved}**, rejected: **${backlog.rejected}**`,
    '',
    '## Current metrics',
    `- Primary is /uploads/: **${uploadPrimary}**`,
    `- Primary is stock/scraped (pexels/unsplash/gstatic): **${stockPrimary}**`,
    `- Pending images remaining: **${pendingImg}**`,
    '',
    '## Items needing manual real photo (stock primary, no upload on file)',
    '',
    ...stillStock.map((e) => `- ${e.sku} — ${e.model ?? '—'}`),
    '',
    '## Phase 3 (next)',
    '- Upload real photos for items listed above',
    '- Enable Google Custom Search API for better auto-sourcing',
    '- Fill `featuredImageUrl` in Excel before next import',
    '- Data accuracy: audit specs/descriptions vs your source sheet',
  ]
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8')

  console.log('\nSummary:')
  console.log(`  Reordered to uploads: ${reordered}`)
  console.log(`  Pending approved/rejected: ${backlog.approved}/${backlog.rejected}`)
  console.log(`  Upload primaries: ${uploadPrimary} | Stock primaries: ${stockPrimary} | Pending left: ${pendingImg}`)
  console.log(`  Need manual photo: ${stillStock.length} SKUs`)
  console.log(`  Report: ${reportPath}`)
  if (!COMMIT) console.log('\nRe-run with --commit to apply.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
