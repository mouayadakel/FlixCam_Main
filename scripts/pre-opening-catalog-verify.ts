/**
 * Pre-opening catalog readiness check.
 * Validates equipment has price, category, description, image, and inventory barcodes.
 *
 * Usage:
 *   npx tsx scripts/pre-opening-catalog-verify.ts
 *   npx tsx scripts/pre-opening-catalog-verify.ts --json
 */

import { prisma } from '../src/lib/db/prisma'

const JSON_OUT = process.argv.includes('--json')

function isMissingPhoto(url: string | null | undefined): boolean {
  if (!url?.trim()) return true
  const u = url.toLowerCase()
  return u.includes('placehold') || u.includes('placeholder')
}

async function main() {
  const equipment = await prisma.equipment.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      id: true,
      sku: true,
      model: true,
      dailyPrice: true,
      descriptionEn: true,
      barcode: true,
      categoryId: true,
      media: {
        where: { deletedAt: null, type: 'image' },
        select: { url: true },
        take: 1,
      },
      product: {
        select: {
          featuredImage: true,
          inventoryItems: {
            where: { deletedAt: null },
            select: { barcode: true },
          },
        },
      },
    },
  })

  const issues: Array<{ sku: string; problems: string[] }> = []

  for (const item of equipment) {
    const problems: string[] = []
    if (!item.dailyPrice || Number(item.dailyPrice) <= 0) problems.push('missing_daily_price')
    if (!item.categoryId) problems.push('missing_category')
    const desc = item.descriptionEn?.trim()
    if (!desc) problems.push('missing_description_en')
    const heroUrl = item.media[0]?.url ?? item.product?.featuredImage
    if (isMissingPhoto(heroUrl)) problems.push('missing_photo')
    const hasBarcode =
      Boolean(item.barcode?.trim()) ||
      (item.product?.inventoryItems?.length ?? 0) > 0
    if (!hasBarcode) problems.push('no_inventory_barcode')

    if (problems.length > 0) {
      issues.push({ sku: item.sku, problems })
    }
  }

  const summary = {
    totalActiveEquipment: equipment.length,
    readyCount: equipment.length - issues.length,
    issueCount: issues.length,
    missingPhoto: issues.filter((i) => i.problems.includes('missing_photo')).length,
    missingPrice: issues.filter((i) => i.problems.includes('missing_daily_price')).length,
    missingBarcode: issues.filter((i) => i.problems.includes('no_inventory_barcode')).length,
    sampleIssues: issues.slice(0, 15),
  }

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('\n=== Pre-Opening Catalog Verification ===')
    console.log(`Active equipment: ${summary.totalActiveEquipment}`)
    console.log(`Ready for launch: ${summary.readyCount}`)
    console.log(`Needs attention: ${summary.issueCount}`)
    console.log(`  - Missing photo: ${summary.missingPhoto}`)
    console.log(`  - Missing price: ${summary.missingPrice}`)
    console.log(`  - Missing inventory barcode: ${summary.missingBarcode}`)
    if (summary.sampleIssues.length > 0) {
      console.log('\nSample issues:')
      for (const row of summary.sampleIssues) {
        console.log(`  ${row.sku}: ${row.problems.join(', ')}`)
      }
    }
    console.log('')
  }

  await prisma.$disconnect()
  process.exit(summary.issueCount > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
