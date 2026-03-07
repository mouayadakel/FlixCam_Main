/**
 * Soft-deletes all equipment (and their media + synced products) for a clean slate.
 * Use when you want to manually add equipment for testing.
 *
 * Run: npx tsx scripts/clear-equipment-for-testing.ts
 * Requires: DATABASE_URL in .env
 */

import { PrismaClient } from '@prisma/client'

const SCRIPT_USER = 'clear-equipment-script'

async function main() {
  const prisma = new PrismaClient()
  const now = new Date()

  const equipment = await prisma.equipment.findMany({
    where: { deletedAt: null },
    select: { id: true },
  })
  const equipmentIds = equipment.map((e) => e.id)

  if (equipmentIds.length === 0) {
    console.log('No equipment to clear. Database is already empty for equipment.')
    await prisma.$disconnect()
    return
  }

  console.log(`Found ${equipmentIds.length} equipment record(s). Soft-deleting...`)

  const mediaResult = await prisma.media.updateMany({
    where: { equipmentId: { in: equipmentIds }, deletedAt: null },
    data: { deletedAt: now, deletedBy: SCRIPT_USER },
  })
  console.log(`  Media: ${mediaResult.count} soft-deleted`)

  const productResult = await prisma.product.updateMany({
    where: { id: { in: equipmentIds }, deletedAt: null },
    data: { deletedAt: now, deletedBy: SCRIPT_USER },
  })
  console.log(`  Products (synced from equipment): ${productResult.count} soft-deleted`)

  const equipmentResult = await prisma.equipment.updateMany({
    where: { id: { in: equipmentIds } },
    data: { deletedAt: now, deletedBy: SCRIPT_USER },
  })
  console.log(`  Equipment: ${equipmentResult.count} soft-deleted`)

  console.log('Done. You can now manually add equipment for testing.')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
