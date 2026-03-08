/**
 * @file import-pipeline.test.ts
 * @description Integration test for the full AI master fill pipeline.
 * Creates test products, runs AI fill, validates all fields, and reports results.
 * Run with: npx tsx src/lib/testing/import-pipeline.test.ts
 */

import { prisma } from '@/lib/db/prisma'
import { runMasterFill } from '@/lib/services/ai-master-fill.service'
import { validateAiFill, type ValidationReport } from '@/lib/services/ai-validation.service'

const TEST_ITEMS = [
  { name_en: 'Canon EOS R5', price_daily: 300, category: 'Cameras' },
  { name_en: 'Sony FE 85mm f/1.4 GM Lens', price_daily: 150, category: 'Lenses' },
  { name_en: 'Godox AD600 Pro Strobe', price_daily: 120, category: 'Lighting' },
  { name_en: 'Zhiyun Crane 4 Gimbal', price_daily: 80, category: 'Stabilizers' },
  { name_en: 'DJI Ronin 4D 6K Combo', price_daily: 800, category: 'Cinema' },
  { name_en: 'Nanlite Forza 500B II', price_daily: 200, category: 'Lighting' },
  { name_en: 'Professional Studio Flash Kit', price_daily: 250, category: 'Lighting' },
]

interface TestResult {
  item: string
  productId: string
  score: number
  issues: string[]
  photosFound: number
  hasArabic: boolean
  hasChinese: boolean
  hasSeo: boolean
  seoTitleLen: number
  seoDescLen: number
  specCount: number
  tagCount: number
}

async function findOrCreateCategory(name: string): Promise<string> {
  const existing = await prisma.category.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null },
  })
  if (existing) return existing.id

  const created = await prisma.category.create({
    data: {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    },
  })
  return created.id
}

async function findOrCreateBrand(name: string): Promise<string> {
  const existing = await prisma.brand.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null },
  })
  if (existing) return existing.id

  const created = await prisma.brand.create({
    data: {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    },
  })
  return created.id
}

async function createTestProduct(item: {
  name_en: string
  price_daily: number
  category: string
}): Promise<string> {
  const brandName = item.name_en.split(' ')[0]
  const brandId = await findOrCreateBrand(brandName)
  const categoryId = await findOrCreateCategory(item.category)

  const product = await prisma.product.create({
    data: {
      sku: `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      brandId,
      categoryId,
      priceDaily: item.price_daily,
      priceWeekly: item.price_daily * 4,
      priceMonthly: item.price_daily * 12,
      status: 'DRAFT',
      productType: 'RENTAL',
      featuredImage: '/images/placeholder.jpg',
      translations: {
        create: {
          locale: 'en',
          name: item.name_en,
          shortDescription: '',
          longDescription: '',
          seoTitle: '',
          seoDescription: '',
          seoKeywords: '',
        },
      },
    },
  })

  return product.id
}

async function cleanupTestProducts(productIds: string[]) {
  for (const id of productIds) {
    await prisma.productTranslation.deleteMany({ where: { productId: id } })
    await prisma.product.delete({ where: { id } }).catch(() => {})
  }
}

async function runFullPipelineTest() {
  console.log('========================================')
  console.log(' AI Master Fill Pipeline Integration Test')
  console.log('========================================\n')

  const results: TestResult[] = []
  const createdProductIds: string[] = []

  for (const item of TEST_ITEMS) {
    console.log(`\n--- Testing: ${item.name_en} ---`)

    let productId: string

    try {
      productId = await createTestProduct(item)
      createdProductIds.push(productId)
      console.log(`  Created test product: ${productId}`)
    } catch (err) {
      console.error(`  FAILED to create product: ${err}`)
      continue
    }

    try {
      const fillResult = await runMasterFill(productId)
      console.log(`  AI Fill: ${fillResult.fieldsGenerated} fields, ${fillResult.photosFound} photos`)
    } catch (err) {
      console.error(`  AI Fill FAILED: ${err}`)
    }

    let report: ValidationReport
    try {
      report = await validateAiFill(productId)
    } catch (err) {
      console.error(`  Validation FAILED: ${err}`)
      continue
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { translations: true },
    })

    const en = product?.translations.find((t) => t.locale === 'en')
    const ar = product?.translations.find((t) => t.locale === 'ar')
    const zh = product?.translations.find((t) => t.locale === 'zh')
    const specs = (en?.specifications as Record<string, unknown>) ?? {}

    const testResult: TestResult = {
      item: item.name_en,
      productId,
      score: report.score,
      issues: report.issues,
      photosFound:
        product?.featuredImage && product.featuredImage !== '/images/placeholder.jpg'
          ? 1 + (Array.isArray(product.galleryImages) ? product.galleryImages.length : 0)
          : 0,
      hasArabic: !!(ar?.longDescription && ar.longDescription.length > 10),
      hasChinese: !!(zh?.name && zh.name.length > 1),
      hasSeo: !!(en?.seoTitle && en.seoTitle.length > 10),
      seoTitleLen: en?.seoTitle?.length ?? 0,
      seoDescLen: en?.seoDescription?.length ?? 0,
      specCount: Object.keys(specs).length,
      tagCount: product?.tags ? product.tags.split(',').filter((t) => t.trim()).length : 0,
    }

    results.push(testResult)

    const check = (ok: boolean) => (ok ? 'PASS' : 'FAIL')
    const seoTitleOk = testResult.seoTitleLen >= 40 && testResult.seoTitleLen <= 65

    console.log(`  Score: ${testResult.score}%`)
    console.log(`  Photos: ${testResult.photosFound}/5`)
    console.log(`  Arabic: ${check(testResult.hasArabic)}`)
    console.log(`  Chinese: ${check(testResult.hasChinese)}`)
    console.log(
      `  SEO title: ${testResult.seoTitleLen} chars ${check(seoTitleOk)}`
    )
    console.log(
      `  SEO desc: ${testResult.seoDescLen} chars ${check(testResult.seoDescLen >= 100)}`
    )
    console.log(`  Specs: ${testResult.specCount} fields`)
    console.log(`  Tags: ${testResult.tagCount}`)
    if (testResult.issues.length > 0) {
      console.log(`  Issues: ${testResult.issues.join(', ')}`)
    }
  }

  console.log('\n========================================')
  console.log(' TEST SUMMARY')
  console.log('========================================')

  const avgScore =
    results.length > 0
      ? Math.round(results.reduce((a, b) => a + b.score, 0) / results.length)
      : 0
  const failures = results.filter((r) => r.score < 80)

  console.log(`Average score: ${avgScore}%`)
  console.log(`Items tested: ${results.length}`)
  console.log(`Items passing (>= 80%): ${results.length - failures.length}/${results.length}`)

  if (failures.length > 0) {
    console.log('\nFAILING ITEMS:')
    for (const f of failures) {
      console.log(`  ${f.item}: ${f.score}%`)
      for (const issue of f.issues) {
        console.log(`    - ${issue}`)
      }
    }
  }

  // Cleanup test products
  console.log(`\nCleaning up ${createdProductIds.length} test products...`)
  await cleanupTestProducts(createdProductIds)
  console.log('Cleanup complete.')

  if (avgScore >= 90) {
    console.log('\n  PIPELINE TEST PASSED — System is production ready')
  } else if (avgScore >= 70) {
    console.log(
      `\n  PIPELINE TEST PARTIALLY PASSED — Average ${avgScore}%, target 90%`
    )
  } else {
    console.log(`\n  PIPELINE TEST FAILED — Average ${avgScore}%, fix issues above`)
  }

  await prisma.$disconnect()
  process.exit(avgScore >= 70 ? 0 : 1)
}

runFullPipelineTest().catch((err) => {
  console.error('Test runner crashed:', err)
  process.exit(1)
})
