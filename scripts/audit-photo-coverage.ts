/**
 * @file audit-photo-coverage.ts
 * @description Photo-only catalog audit. Reports:
 * - Products with placeholder hero
 * - Products with fewer than 3 approved real images
 * - Products with more than 5 approved images
 * - Products whose hero is not approved
 * Run: npx ts-node scripts/audit-photo-coverage.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import {
  isPlaceholderUrl,
  getApprovedRealProductImages,
  isAiGeneratedSource,
} from '../src/lib/services/product-photo.service'

const prisma = new PrismaClient()

async function run() {
  console.log('📸 Photo Coverage Audit\n')

  const products = await prisma.product.findMany({
    where: { deletedAt: null, status: { not: 'ARCHIVED' } },
    include: {
      brand: true,
      category: true,
      translations: true,
      productImages: { where: { isDeleted: false } },
    },
  })

  const placeholderHero: Array<{ id: string; sku: string | null; name: string }> = []
  const fewerThan3: Array<{ id: string; sku: string | null; count: number }> = []
  const moreThan5: Array<{ id: string; sku: string | null; count: number }> = []
  const heroNotApproved: Array<{ id: string; sku: string | null }> = []

  for (const p of products) {
    const approvedReal = await getApprovedRealProductImages(p.id)
    const approvedCount = approvedReal.filter((img) => !isPlaceholderUrl(img.url)).length
    const heroUrl = p.featuredImage?.trim()
    const hasPlaceholderHero = isPlaceholderUrl(heroUrl)
    const heroIsApproved = heroUrl
      ? approvedReal.some((img) => img.url === heroUrl && !isAiGeneratedSource(img.imageSource))
      : false

    const enName = (p as { translations?: Array<{ locale: string; name: string }> }).translations?.find(
      (t) => t.locale === 'en'
    )?.name
    const name = enName ?? p.sku ?? p.id

    if (hasPlaceholderHero) {
      placeholderHero.push({ id: p.id, sku: p.sku, name })
    }
    if (approvedCount < 3) {
      fewerThan3.push({ id: p.id, sku: p.sku, count: approvedCount })
    }
    if (approvedCount > 5) {
      moreThan5.push({ id: p.id, sku: p.sku, count: approvedCount })
    }
    if (heroUrl && !hasPlaceholderHero && !heroIsApproved) {
      heroNotApproved.push({ id: p.id, sku: p.sku })
    }
  }

  console.log('═══════════════════════════════════════════════')
  console.log(`Total products: ${products.length}`)
  console.log('═══════════════════════════════════════════════\n')

  console.log(`🔴 Placeholder hero: ${placeholderHero.length}`)
  placeholderHero.slice(0, 10).forEach((x) => console.log(`   ${x.sku ?? x.id} - ${x.name}`))
  if (placeholderHero.length > 10) console.log(`   ... and ${placeholderHero.length - 10} more\n`)

  console.log(`🟠 Fewer than 3 approved real images: ${fewerThan3.length}`)
  fewerThan3.slice(0, 10).forEach((x) => console.log(`   ${x.sku ?? x.id} - ${x.count} images`))
  if (fewerThan3.length > 10) console.log(`   ... and ${fewerThan3.length - 10} more\n`)

  console.log(`🟡 More than 5 approved images: ${moreThan5.length}`)
  moreThan5.slice(0, 5).forEach((x) => console.log(`   ${x.sku ?? x.id} - ${x.count} images`))
  if (moreThan5.length > 5) console.log(`   ... and ${moreThan5.length - 5} more\n`)

  console.log(`🟠 Hero not in approved set: ${heroNotApproved.length}`)
  heroNotApproved.slice(0, 5).forEach((x) => console.log(`   ${x.sku ?? x.id}`))
  if (heroNotApproved.length > 5) console.log(`   ... and ${heroNotApproved.length - 5} more\n`)

  console.log('═══════════════════════════════════════════════')
  console.log('Audit complete.')
  console.log('═══════════════════════════════════════════════\n')
}

run().catch(console.error).finally(() => prisma.$disconnect())
