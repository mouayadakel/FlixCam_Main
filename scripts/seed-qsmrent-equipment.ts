/**
 * Seed QSM Rent test equipment (100 items) into the database.
 * Run after main seed: npm run db:seed && npm run db:seed:qsmrent
 * SKU prefix: QSM-001 … QSM-100 so they don't clash with existing inventory.
 */

import { PrismaClient, EquipmentCondition } from '@prisma/client'
import { QSMRENT_EQUIPMENT } from '../src/lib/test-data/qsmrent-equipment'

const prisma = new PrismaClient()

const SKU_PREFIX = 'QSM'

async function main() {
  const categories = await prisma.category.findMany({ where: { deletedAt: null }, select: { id: true, slug: true } })
  const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c.id]))

  const brands = await prisma.brand.findMany({ where: { deletedAt: null }, select: { id: true, slug: true } })
  const brandBySlug = Object.fromEntries(brands.map((b) => [b.slug, b.id]))

  let created = 0
  let skipped = 0

  for (let i = 0; i < QSMRENT_EQUIPMENT.length; i++) {
    const item = QSMRENT_EQUIPMENT[i]
    const sku = `${SKU_PREFIX}-${String(i + 1).padStart(3, '0')}`

    const categoryId = categoryBySlug[item.categorySlug]
    if (!categoryId) {
      console.warn(`⚠️ Category not found: ${item.categorySlug} for ${item.name}`)
      skipped++
      continue
    }

    const brandId = item.brandSlug ? brandBySlug[item.brandSlug] ?? null : null

    await prisma.equipment.upsert({
      where: { sku },
      update: {
        model: item.name,
        categoryId,
        brandId,
        dailyPrice: item.dailyPriceSar,
        weeklyPrice: Math.round(item.dailyPriceSar * 6),
        monthlyPrice: Math.round(item.dailyPriceSar * 26),
        quantityTotal: 1,
        quantityAvailable: 1,
        condition: EquipmentCondition.GOOD,
        featured: false,
        isActive: true,
        warehouseLocation: `QSM-${i + 1}`,
        barcode: `QSM${String(i + 1).padStart(4, '0')}`,
      },
      create: {
        sku,
        model: item.name,
        categoryId,
        brandId,
        dailyPrice: item.dailyPriceSar,
        weeklyPrice: Math.round(item.dailyPriceSar * 6),
        monthlyPrice: Math.round(item.dailyPriceSar * 26),
        quantityTotal: 1,
        quantityAvailable: 1,
        condition: EquipmentCondition.GOOD,
        featured: false,
        isActive: true,
        warehouseLocation: `QSM-${i + 1}`,
        barcode: `QSM${String(i + 1).padStart(4, '0')}`,
      },
    })
    created++
  }

  console.log(`✅ QSM Rent equipment seed: ${created} upserted, ${skipped} skipped (missing category)`)
  console.log(`   Use these SKUs (e.g. QSM-001 … QSM-100) for testing equipment catalog, Build Your Kit, and AI assist.`)
}

main()
  .catch((e) => {
    console.error('❌ seed-qsmrent-equipment error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
