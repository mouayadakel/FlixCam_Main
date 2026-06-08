/**
 * Apply master CSV as source of truth for price, name, and category fixes.
 * Run: npx tsx scripts/apply-csv-data-fixes.ts
 */

import 'dotenv/config'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { prisma } from '../src/lib/db/prisma'
import { syncProductToEquipment } from '../src/lib/services/product-equipment-sync.service'

const CSV_MASTER = path.join(process.cwd(), 'docs', 'templates', 'equipment-full-ai-filled.csv')

type CsvRow = Record<string, string>

function loadMasterCsv(): Map<string, CsvRow> {
  const json = execSync(
    `python3 -c "import csv,json; rows=list(csv.DictReader(open('${CSV_MASTER}',encoding='utf-8'))); print(json.dumps(rows))"`,
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
  )
  const rows = JSON.parse(json) as CsvRow[]
  const map = new Map<string, CsvRow>()
  for (const row of rows) {
    const sku = row.sku?.trim()
    if (sku) map.set(sku, row)
  }
  return map
}

const CATEGORY_ALIASES: Record<string, string> = {
  'lighting-accessories': 'light-accessories',
  accessories: 'camera-accessories',
  'tripod-gimbals': 'tripods-gimbals',
  'tripodgimbals': 'tripods-gimbals',
  boxes: 'cases-bags',
  sound: 'audio',
}

function resolveCategoryId(slug: string, catBySlug: Map<string, string>): string | null {
  const key = slug.trim().toLowerCase()
  return catBySlug.get(CATEGORY_ALIASES[key] ?? key) ?? null
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

async function main() {
  const master = loadMasterCsv()
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    select: { id: true, slug: true, name: true },
  })
  const catBySlug = new Map(categories.map((c) => [c.slug.toLowerCase(), c.id]))

  const equipment = await prisma.equipment.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, sku: true, productId: true, dailyPrice: true, categoryId: true, nameEn: true },
  })

  let priceFixed = 0
  let nameFixed = 0
  let categoryFixed = 0
  let categorySkipped = 0
  const changedProductIds = new Set<string>()

  for (const eq of equipment) {
    const row = master.get(eq.sku)
    if (!row) continue

    const updates: Record<string, unknown> = {}
    const productUpdates: Record<string, unknown> = {}

    const csvPrice = num(row.dailyPrice)
    const dbPrice = eq.dailyPrice ? Number(eq.dailyPrice) : 0
    if (csvPrice != null && csvPrice > 0 && Math.abs(csvPrice - dbPrice) > 0.01) {
      updates.dailyPrice = csvPrice
      productUpdates.priceDaily = csvPrice
      const weekly = num(row.weeklyPrice)
      const monthly = num(row.monthlyPrice)
      if (weekly != null) {
        updates.weeklyPrice = weekly
        productUpdates.priceWeekly = weekly
      }
      if (monthly != null) {
        updates.monthlyPrice = monthly
        productUpdates.priceMonthly = monthly
      }
      priceFixed++
    }

    const csvName = (row.name_en || row.model || '').trim()
    if (csvName && eq.nameEn && csvName.toLowerCase() !== eq.nameEn.toLowerCase()) {
      updates.nameEn = csvName
      updates.model = row.model?.trim() || csvName
      nameFixed++
    }

    const csvCatSlug = row.category_slug?.trim()
    if (csvCatSlug) {
      const catId = resolveCategoryId(csvCatSlug, catBySlug)
      if (catId && catId !== eq.categoryId) {
        updates.categoryId = catId
        productUpdates.categoryId = catId
        categoryFixed++
      } else if (!catId) {
        categorySkipped++
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.equipment.update({ where: { id: eq.id }, data: updates })
    }

    if (eq.productId && Object.keys(productUpdates).length > 0) {
      await prisma.product.update({ where: { id: eq.productId }, data: productUpdates })
    }

    if (eq.productId && csvName) {
      const seoTitle = row.seoTitle_en || `${csvName} | FlixCam Rental`
      const seoDesc = row.seoDescription_en || row.shortDescription_en || ''
      const seoKeywords = row.seoKeywords_en || row.tags || ''
      await prisma.productTranslation.upsert({
        where: { productId_locale: { productId: eq.productId, locale: 'en' } },
        create: {
          productId: eq.productId,
          locale: 'en',
          name: csvName,
          shortDescription: row.shortDescription_en || row.description_en || '',
          longDescription: row.longDescription_en || row.description_en || '',
          seoTitle,
          seoDescription: seoDesc,
          seoKeywords,
        },
        update: { name: csvName },
      })
      if (csvName.toLowerCase() !== (eq.nameEn ?? '').toLowerCase()) {
        changedProductIds.add(eq.productId)
      }
    }

    if (
      eq.productId &&
      (Object.keys(updates).length > 0 || Object.keys(productUpdates).length > 0)
    ) {
      changedProductIds.add(eq.productId)
    }
  }

  console.log(`Syncing ${changedProductIds.size} changed products...`)
  for (const productId of changedProductIds) {
    await syncProductToEquipment(productId)
  }

  console.log('CSV data fixes applied:')
  console.log(`  Prices: ${priceFixed}`)
  console.log(`  Names: ${nameFixed}`)
  console.log(`  Categories: ${categoryFixed}`)
  console.log(`  Category slug not found in DB: ${categorySkipped}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
